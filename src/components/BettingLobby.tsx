import { useEffect, useRef, useState, type CSSProperties, type ReactNode } from 'react'
import {
  HOME_GAMES,
  getGameById,
  type GameDefinition,
} from '../games/catalog'
import { useShopProviders } from '../hooks/useShopProviders'

type LobbyTab = 'home' | 'all' | 'providers' | 'soccer'

type Props = {
  disabled: boolean
  onSelect: (game: GameDefinition) => void
  waitingForCoins?: boolean
  cashOutPending?: boolean
  offline?: boolean
  playSlot?: ReactNode
  onLeaveGame?: () => void
}

const TABS: { id: LobbyTab; label: string }[] = [
  { id: 'home', label: 'Home' },
  { id: 'all', label: 'All Games' },
  { id: 'providers', label: 'Provider' },
  { id: 'soccer', label: 'Soccer' },
]

function GameTile({
  game,
  disabled,
  onSelect,
}: {
  game: GameDefinition
  disabled: boolean
  onSelect: (game: GameDefinition) => void
}) {
  return (
    <button
      type="button"
      className={`game-card game-card-touch${game.kind === 'provider' ? ' game-card-provider' : ''}`}
      disabled={disabled}
      style={
        {
          '--game-accent': game.accent,
          '--art-from': game.artFrom,
          '--art-to': game.artTo,
        } as CSSProperties
      }
      onClick={() => onSelect(game)}
    >
      <span className="game-card-art" aria-hidden="true">
        {game.image ? (
          <img className="game-card-cover" src={game.image} alt="" />
        ) : (
          <>
            <span className="game-card-glow" />
            <span className="game-card-icon">{game.icon}</span>
          </>
        )}
        <span className="game-card-play-orb">▶</span>
        <span className="game-card-ribbon">{game.payout_label}</span>
      </span>
      <span className="game-card-body">
        <span className="game-card-category">{game.provider ?? game.category}</span>
        <strong className="game-card-name">{game.name}</strong>
      </span>
    </button>
  )
}

function GameGrid({
  games,
  disabled,
  onSelect,
  scrollRoot,
  hasMore,
  loadingMore,
  onLoadMore,
}: {
  games: GameDefinition[]
  disabled: boolean
  onSelect: (game: GameDefinition) => void
  scrollRoot: HTMLElement | null
  hasMore: boolean
  loadingMore: boolean
  onLoadMore: () => void
}) {
  const sentinelRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    const node = sentinelRef.current
    if (!node || !hasMore) return

    const observer = new IntersectionObserver(
      (entries) => {
        if (entries[0]?.isIntersecting) onLoadMore()
      },
      { root: scrollRoot, rootMargin: '240px', threshold: 0 },
    )
    observer.observe(node)
    return () => observer.disconnect()
  }, [hasMore, onLoadMore, scrollRoot, games.length])

  return (
    <>
      <div className="game-grid game-grid-assigned">
        {games.map((game) => (
          <GameTile key={game.id} game={game} disabled={disabled} onSelect={onSelect} />
        ))}
      </div>
      <div ref={sentinelRef} className="lobby-scroll-sentinel" aria-hidden="true" />
      {loadingMore ? <p className="lobby-empty">Loading more games…</p> : null}
    </>
  )
}

export function BettingLobby({
  disabled,
  onSelect,
  waitingForCoins = false,
  cashOutPending = false,
  offline = false,
  playSlot,
  onLeaveGame,
}: Props) {
  const [tab, setTab] = useState<LobbyTab>('home')
  const [providerKey, setProviderKey] = useState<string | null>(null)
  const paneRef = useRef<HTMLDivElement>(null)
  const [scrollRoot, setScrollRoot] = useState<HTMLElement | null>(null)
  const {
    providers,
    loading: providersLoading,
    error: providersError,
    gamesByProvider,
    gamesLoading,
    gamesLoadingMore,
    gamesError,
    loadProviderGames,
    loadMoreProviderGames,
    providerHasMore,
    allGames,
    allPage,
    allLoading,
    allLoadingMore,
    allError,
    allHasMore,
    loadAllGames,
    loadMoreAllGames,
  } = useShopProviders()
  const provider = providers.find((item) => item.key === providerKey) ?? null
  const providerGames = provider ? (gamesByProvider[provider.name] ?? []) : []

  const sports = getGameById('sports')
  const statusMessage = cashOutPending
    ? 'Cash-out pending — collect at the cashier. Games are locked.'
    : offline
      ? 'Connection lost — waiting to reconnect…'
      : waitingForCoins
        ? 'Waiting for cash-in — insert a note or scan a credit ticket.'
        : null

  useEffect(() => {
    setScrollRoot(paneRef.current)
  }, [tab, providerKey, playSlot])

  useEffect(() => {
    if (tab === 'all' && allPage === 0 && !allLoading && !allError) {
      void loadAllGames(1)
    }
  }, [tab, allPage, allLoading, allError, loadAllGames])

  const openTab = (next: LobbyTab) => {
    setTab(next)
    setProviderKey(null)
    onLeaveGame?.()
  }

  return (
    <div className={`game-lobby game-lobby-light${disabled ? ' game-lobby-disabled' : ''}`}>
      <nav className="lobby-tabs" aria-label="Lobby sections">
        {TABS.map((item) => (
          <button
            key={item.id}
            type="button"
            className={`lobby-tab${tab === item.id ? ' is-active' : ''}`}
            aria-current={tab === item.id ? 'page' : undefined}
            onClick={() => openTab(item.id)}
          >
            {item.label}
          </button>
        ))}
      </nav>

      {statusMessage ? (
        <div
          className={`lobby-status-banner${cashOutPending ? ' is-cashout' : ''}${offline ? ' is-offline' : ''}${waitingForCoins ? ' is-waiting' : ''}`}
          role="status"
        >
          {statusMessage}
        </div>
      ) : null}

      {playSlot ? <div className="lobby-pane lobby-pane-play">{playSlot}</div> : null}

      {!playSlot && tab === 'home' ? (
        <div className="lobby-pane" ref={paneRef}>
          <div className="lobby-header">
            <h3>Home</h3>
          </div>
          <div className="game-grid game-grid-assigned">
            {HOME_GAMES.map((game) => (
              <GameTile key={game.id} game={game} disabled={disabled} onSelect={onSelect} />
            ))}
          </div>
        </div>
      ) : null}

      {!playSlot && tab === 'all' ? (
        <div className="lobby-pane" ref={paneRef}>
          <div className="lobby-header">
            <h3>All Games</h3>
          </div>
          {allLoading && allGames.length === 0 ? (
            <p className="lobby-empty">Loading games…</p>
          ) : allError && allGames.length === 0 ? (
            <p className="lobby-empty">{allError}</p>
          ) : allGames.length === 0 ? (
            <p className="lobby-empty">No assigned games found.</p>
          ) : (
            <GameGrid
              games={allGames}
              disabled={disabled}
              onSelect={onSelect}
              scrollRoot={scrollRoot}
              hasMore={allHasMore}
              loadingMore={allLoadingMore}
              onLoadMore={loadMoreAllGames}
            />
          )}
        </div>
      ) : null}

      {!playSlot && tab === 'providers' ? (
        <div className="lobby-pane" ref={paneRef}>
          {provider ? (
            <>
              <div className="lobby-header lobby-header-row">
                <button type="button" className="lobby-back" onClick={() => setProviderKey(null)}>
                  ← Providers
                </button>
                <h3>{provider.name}</h3>
              </div>
              {gamesLoading && providerGames.length === 0 ? (
                <p className="lobby-empty">Loading games…</p>
              ) : gamesError && providerGames.length === 0 ? (
                <p className="lobby-empty">{gamesError}</p>
              ) : providerGames.length === 0 ? (
                <p className="lobby-empty">No games found for this provider.</p>
              ) : (
                <GameGrid
                  games={providerGames}
                  disabled={disabled}
                  onSelect={onSelect}
                  scrollRoot={scrollRoot}
                  hasMore={providerHasMore(provider.name)}
                  loadingMore={gamesLoadingMore}
                  onLoadMore={() => loadMoreProviderGames(provider.name)}
                />
              )}
            </>
          ) : (
            <>
              <div className="lobby-header">
                <h3>Providers</h3>
              </div>
              {providersLoading ? (
                <p className="lobby-empty">Loading assigned providers…</p>
              ) : providersError ? (
                <p className="lobby-empty">{providersError}</p>
              ) : providers.length === 0 ? (
                <p className="lobby-empty">No providers assigned to Betting Shop.</p>
              ) : (
                <div className="game-grid game-grid-assigned">
                  {providers.map((item) => (
                    <button
                      key={item.key}
                      type="button"
                      className={`game-card game-card-touch provider-card provider-card-${item.tone}`}
                      onClick={() => {
                        setProviderKey(item.key)
                        if (!(gamesByProvider[item.name]?.length)) {
                          void loadProviderGames(item.name, 1)
                        }
                      }}
                    >
                      <span className="game-card-art" aria-hidden="true">
                        <span className="provider-card-logo-wrap">
                          <img className="provider-card-logo" src={item.logo} alt="" />
                        </span>
                      </span>
                      <span className="game-card-body">
                        <strong className="game-card-name">{item.name}</strong>
                      </span>
                    </button>
                  ))}
                </div>
              )}
            </>
          )}
        </div>
      ) : null}

      {!playSlot && tab === 'soccer' ? (
        <div className="lobby-pane" ref={paneRef}>
          <div className="lobby-header">
            <h3>Soccer</h3>
          </div>
          {sports ? (
            <div className="game-grid game-grid-assigned">
              <GameTile game={sports} disabled={disabled} onSelect={onSelect} />
            </div>
          ) : null}
        </div>
      ) : null}
    </div>
  )
}
