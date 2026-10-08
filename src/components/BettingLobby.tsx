import { useEffect, useMemo, useRef, useState, type ReactNode } from 'react'
import {
  HOME_GAMES,
  type GameDefinition,
  type LobbyProvider,
} from '../games/catalog'
import { useShopProviders } from '../hooks/useShopProviders'
import { loadTerminal } from '../lib/storage'
import { useMachine } from '../services/sessionStore'

type LobbyTab =
  | 'all'
  | 'spribe'
  | 'endorphina'
  | 'kagaming'
  | 'evoplay'
  | 'slots'
  | 'crash'
  | 'table'
  | 'providers'
  | string

type Props = {
  disabled: boolean
  onSelect: (game: GameDefinition) => void
  waitingForCoins?: boolean
  cashOutPending?: boolean
  offline?: boolean
  playSlot?: ReactNode
  onLeaveGame?: () => void
  onCashOut?: () => void
}

function getCardTheme(game: GameDefinition): 'red' | 'purple' | 'green' | 'cyan' | 'blue' | 'gold' | 'dark' {
  const id = (game.id || '').toLowerCase()
  const name = (game.name || '').toLowerCase()
  
  if (id.includes('keno') || name.includes('keno') || id.includes('balloon') || name.includes('balloon')) return 'red'
  if (id.includes('dice') || name.includes('dice') || id.includes('hotline') || name.includes('hotline')) return 'purple'
  if (id.includes('goal') || name.includes('goal') || id.includes('soccer') || id.includes('roulette') || name.includes('roulette')) return 'green'
  if (id.includes('plinko') || name.includes('plinko')) return 'cyan'
  if (id.includes('mine') || name.includes('mine')) return 'blue'
  if (id.includes('hi_lo') || name.includes('hi-lo') || id.includes('coin') || id.includes('jackpot')) return 'gold'
  if (id.includes('aviator') || id.includes('sports') || id.includes('chicken') || id.includes('trader')) return 'dark'
  
  const hash = (id + name).split('').reduce((acc, char) => acc + char.charCodeAt(0), 0)
  const themes: ('red' | 'purple' | 'green' | 'cyan' | 'blue' | 'gold')[] = ['red', 'purple', 'green', 'cyan', 'blue', 'gold']
  return themes[hash % themes.length]
}

function getProviderIcon(name: string): string {
  const lower = name.toLowerCase()
  if (lower.includes('spribe') || lower.includes('aviator')) return 'fa-solid fa-plane'
  if (lower.includes('endorphina')) return 'fa-solid fa-gem'
  if (lower.includes('ka') || lower.includes('king') || lower.includes('royal')) return 'fa-solid fa-crown'
  if (lower.includes('evoplay') || lower.includes('fire')) return 'fa-solid fa-fire'
  if (lower.includes('turbo') || lower.includes('sport')) return 'fa-solid fa-futbol'
  if (lower.includes('reel') || lower.includes('slot')) return 'fa-solid fa-clover'
  if (lower.includes('pragmatic') || lower.includes('instant')) return 'fa-solid fa-bolt'
  if (lower.includes('habanero')) return 'fa-solid fa-pepper-hot'
  if (lower.includes('dice') || lower.includes('table')) return 'fa-solid fa-dice'
  if (lower.includes('poker') || lower.includes('card')) return 'fa-solid fa-diamond'
  return 'fa-solid fa-gamepad'
}

function getGameActionLabel(game: GameDefinition): string {
  const id = (game.id || '').toLowerCase()
  const name = (game.name || '').toLowerCase()
  if (id.includes('plinko') || name.includes('plinko') || id.includes('drop')) return 'DROP NOW ›'
  if (id.includes('roulette') || name.includes('roulette') || id.includes('wheel') || id.includes('spin') || id.includes('slot')) return 'SPIN NOW ›'
  if (id.includes('soccer') || id.includes('penalty') || id.includes('kick') || name.includes('goal')) return 'KICK NOW ›'
  if (id.includes('crash') || id.includes('aviator') || id.includes('plane') || id.includes('balloon') || name.includes('fly')) return 'FLY NOW ›'
  if (id.includes('mine') || name.includes('mine')) return 'MINE NOW ›'
  if (id.includes('card') || name.includes('card') || id.includes('hi_lo') || id.includes('poker')) return 'DEAL NOW ›'
  return 'PLAY NOW ›'
}

function ProviderLogoItem({
  logo,
  name,
  iconClass,
}: {
  logo?: string | null
  name: string
  iconClass: string
}) {
  const [failed, setFailed] = useState(!logo)

  if (!failed && logo) {
    return (
      <div className="provider-logo-center">
        <img
          className="provider-card-logo"
          src={logo}
          alt={name}
          loading="lazy"
          onError={() => setFailed(true)}
        />
      </div>
    )
  }

  return (
    <div className="chamfer-poster-vector">
      <span className="chamfer-monogram">{name.slice(0, 2).toUpperCase()}</span>
      <div className="chamfer-vector-icon">
        <i className={iconClass} style={{ fontSize: '2.5rem', color: '#f5b300' }} />
      </div>
    </div>
  )
}

const GAME_FALLBACK_IMAGE = '/assets/img/placeholder.png'
const GAME_REMOTE_FALLBACK_IMAGE = 'https://staging.winbet.syscorp.in/assets/img/placeholder.png'

function GameTile({
  game,
  disabled,
  onSelect,
}: {
  game: GameDefinition
  disabled: boolean
  onSelect: (game: GameDefinition) => void
}) {
  const validInitial = (game.image && typeof game.image === 'string' && game.image.trim() !== '' && game.image !== 'null' && game.image !== 'undefined')
    ? game.image.trim()
    : GAME_FALLBACK_IMAGE

  const [imgSrc, setImgSrc] = useState<string>(validInitial)

  useEffect(() => {
    const next = (game.image && typeof game.image === 'string' && game.image.trim() !== '' && game.image !== 'null' && game.image !== 'undefined')
      ? game.image.trim()
      : GAME_FALLBACK_IMAGE
    setImgSrc(next)
  }, [game.image])

  const theme = getCardTheme(game)
  const actionLabel = getGameActionLabel(game)

  return (
    <div
      className="chamfer-card-wrapper"
      onClick={() => !disabled && onSelect(game)}
    >
      <div className={`chamfer-casino-card theme-${theme}${disabled ? ' is-disabled' : ''}`}>
        <div className="chamfer-border-wrap">
          <div className="chamfer-inner-deck">
            <div className="card-top-neon-stripe" />
            <div className="card-top-badge-row">
              <span className="chamfer-badge badge-live">
                {game.payout_label || 'LIVE'}
              </span>
            </div>

            <div className="chamfer-artwork-frame">
              <img
                className="chamfer-poster-img"
                src={imgSrc || GAME_FALLBACK_IMAGE}
                alt={game.name}
                loading="lazy"
                onError={(e) => {
                  const target = e.currentTarget
                  if (!target.src.includes(GAME_FALLBACK_IMAGE)) {
                    target.src = GAME_FALLBACK_IMAGE
                    setImgSrc(GAME_FALLBACK_IMAGE)
                  } else if (target.src !== GAME_REMOTE_FALLBACK_IMAGE) {
                    target.src = GAME_REMOTE_FALLBACK_IMAGE
                  }
                }}
              />
            </div>

            <div className="chamfer-bottom-vignette" />

            <div className="chamfer-content-deck">
              <div className="chamfer-game-title" title={game.name}>{game.name}</div>
              <div className="chamfer-game-subtitle">
                LIVE PROVIDER GAME.
              </div>
              <button
                type="button"
                className="btn-card-action"
                onClick={(e) => {
                  e.stopPropagation()
                  if (!disabled) onSelect(game)
                }}
              >
                {actionLabel}
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}

const RECENT_WINNERS_DATA = [
  { id: 'w1', player: 'Player #6464', mult: '19.88x', amount: 2982.00, time: 'Just now', game: 'Aviator', icon: '✈️', image: '/lobby/aviator.svg', color: '#ef4444' },
  { id: 'w2', player: 'Player #2121', mult: '22.23x', amount: 3334.50, time: 'Just now', game: 'Mines', icon: '💣', image: '', color: '#3b82f6' },
  { id: 'w3', player: 'Player #7043', mult: '35.18x', amount: 5274.00, time: 'Just now', game: 'Plinko', icon: '🎯', image: '', color: '#06b6d4' },
  { id: 'w4', player: 'Player #3284', mult: '11.29x', amount: 564.50, time: 'Just now', game: 'Hi-Lo', icon: '🃏', image: '', color: '#f59e0b' },
  { id: 'w5', player: 'Player #8382', mult: '48.20x', amount: 14460.00, time: '12s ago', game: 'Lucky 6', icon: '🎱', image: '/lobby/lucky6.svg', color: '#f97316' },
  { id: 'w6', player: 'Player #4102', mult: '12.50x', amount: 3750.00, time: '28s ago', game: 'Goal', icon: '⚽', image: '', color: '#22c55e' },
  { id: 'w7', player: 'Player #1884', mult: '29.00x', amount: 5800.00, time: '45s ago', game: 'Mini Roulette', icon: '🎡', image: '', color: '#a855f7' },
  { id: 'w8', player: 'Player #7731', mult: '15.30x', amount: 4587.50, time: '1m ago', game: 'Balloon', icon: '🎈', image: '', color: '#ef4444' },
  { id: 'w9', player: 'Player #9024', mult: '52.10x', amount: 10420.00, time: '2m ago', game: 'Dice', icon: '🎲', image: '', color: '#c084fc' },
]

function LiveRecentWinnersFeed() {
  const scrollRef = useRef<HTMLDivElement>(null)

  const scroll = (direction: 'left' | 'right') => {
    if (scrollRef.current) {
      const scrollAmount = 260
      scrollRef.current.scrollBy({
        left: direction === 'left' ? -scrollAmount : scrollAmount,
        behavior: 'smooth',
      })
    }
  }

  return (
    <div className="winners-feed-master-card mb-3">
      <div className="winners-feed-header-bar">
        <div className="winners-feed-title-wrap">
          <span className="live-feed-dot" />
          <i className="fa-solid fa-bolt lightning-bolt-icon" />
          <span className="live-feed-title">LIVE RECENT WINNERS FEED</span>
          <span className="realtime-badge-pill">REAL TIME</span>
        </div>

        <div className="winners-feed-controls-wrap">
          <div className="updating-live-chip">
            <i className="fa-solid fa-clock-rotate-left me-1.5" />
            <span>Updating live</span>
          </div>
          <div className="feed-nav-arrows">
            <button
              type="button"
              className="btn-feed-nav"
              onClick={() => scroll('left')}
              title="Previous winners"
            >
              <i className="fa-solid fa-chevron-left" />
            </button>
            <button
              type="button"
              className="btn-feed-nav"
              onClick={() => scroll('right')}
              title="Next winners"
            >
              <i className="fa-solid fa-chevron-right" />
            </button>
          </div>
        </div>
      </div>

      <div className="winners-chips-track" ref={scrollRef}>
        {RECENT_WINNERS_DATA.map((w) => (
          <div key={w.id} className="winner-feed-chip">
            <div className="winner-chip-avatar" style={{ borderColor: w.color }}>
              {w.image ? (
                <img
                  src={w.image}
                  alt={w.game}
                  className="winner-avatar-img"
                  onError={(e) => {
                    e.currentTarget.style.display = 'none'
                    if (e.currentTarget.parentElement) {
                      e.currentTarget.parentElement.innerHTML = `<span class="winner-avatar-icon">${w.icon}</span>`
                    }
                  }}
                />
              ) : (
                <span className="winner-avatar-icon">{w.icon}</span>
              )}
            </div>

            <div className="winner-chip-body">
              <div className="winner-chip-row-top">
                <span className="winner-player-code">{w.player}</span>
                <span className="winner-mult-tag">{w.mult}</span>
              </div>
              <div className="winner-chip-row-bot">
                <span className="winner-cash-amount">
                  N$ {w.amount.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                </span>
                <span className="winner-time-label">{w.time}</span>
              </div>
            </div>
          </div>
        ))}
      </div>
    </div>
  )
}

type SpribePickItem = {
  id: string
  name: string
  image: string
  actionText: string
  theme?: string
}

const SPRIBE_FEATURED_PICKS: SpribePickItem[] = [
  { id: 'aviator', name: 'Aviator', image: '/assets/games/SPRIBE/AVIATOR.png', actionText: 'PLAY NOW ›', theme: 'theme-spribe-dark' },
  { id: 'dice', name: 'Dice', image: '/assets/games/SPRIBE/DICE.png', actionText: 'PLAY NOW ›', theme: 'theme-spribe-purple' },
  { id: 'goal', name: 'Goal', image: '/assets/games/SPRIBE/SOCCER.png', actionText: 'KICK NOW ›', theme: 'theme-spribe-green' },
  { id: 'plinko', name: 'Plinko', image: '/assets/games/SPRIBE/PLINKO.png', actionText: 'DROP NOW ›', theme: 'theme-spribe-cyan' },
  { id: 'mines', name: 'Mines', image: '/assets/games/SPRIBE/MINES.png', actionText: 'MINE NOW ›', theme: 'theme-spribe-blue' },
  { id: 'hilo', name: 'Hilo', image: '/assets/games/SPRIBE/HILO.png', actionText: 'PLAY NOW ›', theme: 'theme-spribe-gold' },
  { id: 'keno', name: 'Keno', image: '/assets/games/SPRIBE/KENO.png', actionText: 'PLAY NOW ›', theme: 'theme-spribe-emerald' },
  { id: 'miniroulette', name: 'Mini Roulette', image: '/assets/games/SPRIBE/MINIROULETTE.png', actionText: 'SPIN NOW ›', theme: 'theme-spribe-green' },
  { id: 'hotline', name: 'Hotline', image: '/assets/games/SPRIBE/HOTLINE.png', actionText: 'PLAY NOW ›', theme: 'theme-spribe-indigo' },
  { id: 'balloon', name: 'Balloon', image: '/assets/games/SPRIBE/BALLON.png', actionText: 'FLY NOW ›', theme: 'theme-spribe-purple' },
  { id: 'keno80', name: 'Multi Keno', image: '/assets/games/SPRIBE/KENO80.png', actionText: 'PLAY NOW ›', theme: 'theme-spribe-indigo' },
  { id: 'pilot', name: 'Pilot Chicken', image: '/assets/games/SPRIBE/PILOT.png', actionText: 'PLAY NOW ›', theme: 'theme-spribe-gold' },
  { id: 'trader', name: 'Trader', image: '/assets/games/SPRIBE/trader.png', actionText: 'PLAY NOW ›', theme: 'theme-spribe-dark' },
]

function SpribeFeaturedSlider({
  disabled,
  catalogGames,
  onSelect,
  onViewInCatalog,
}: {
  disabled: boolean
  catalogGames: GameDefinition[]
  onSelect: (game: GameDefinition) => void
  onViewInCatalog: () => void
}) {
  const sliderRef = useRef<HTMLDivElement>(null)
  const [isHovered, setIsHovered] = useState(false)

  // Auto-move mechanism: smoothly scrolls forward every 2600ms, loops when reaching the end
  useEffect(() => {
    if (isHovered || disabled) return

    const interval = setInterval(() => {
      const el = sliderRef.current
      if (!el) return

      const cardWidth = 166 // 154px card + 12px gap
      const maxScroll = el.scrollWidth - el.clientWidth
      if (el.scrollLeft >= maxScroll - 6) {
        el.scrollTo({ left: 0, behavior: 'smooth' })
      } else {
        el.scrollBy({ left: cardWidth, behavior: 'smooth' })
      }
    }, 2600)

    return () => clearInterval(interval)
  }, [isHovered, disabled])

  const scrollLeft = () => {
    if (sliderRef.current) {
      sliderRef.current.scrollBy({ left: -166, behavior: 'smooth' })
    }
  }

  const scrollRight = () => {
    if (sliderRef.current) {
      const el = sliderRef.current
      if (el.scrollLeft >= el.scrollWidth - el.clientWidth - 6) {
        el.scrollTo({ left: 0, behavior: 'smooth' })
      } else {
        el.scrollBy({ left: 166, behavior: 'smooth' })
      }
    }
  }

  const resolveGame = (pick: SpribePickItem): GameDefinition => {
    const qName = pick.name.toLowerCase()
    const qId = pick.id.toLowerCase()
    const match = catalogGames.find(
      (g) =>
        g.id.toLowerCase() === qId ||
        g.name.toLowerCase() === qName ||
        (g.provider?.toLowerCase().includes('spribe') && g.name.toLowerCase().includes(qName)),
    )
    if (match) {
      return {
        ...match,
        image: pick.image || match.image,
      }
    }

    return {
      id: pick.id,
      name: pick.name,
      category: 'Crash & Instant',
      description: `Spribe ${pick.name} — live provider game.`,
      payout_label: 'LIVE',
      choices: [],
      icon: '🎮',
      accent: '#ef4444',
      artFrom: '#180838',
      artTo: '#0b041a',
      tagline: 'Spribe',
      kind: 'provider',
      provider: 'Spribe',
      providerKey: 'spribe',
      is_live: true,
      image: pick.image || GAME_FALLBACK_IMAGE,
    }
  }

  return (
    <div
      className="spribe-featured-slider-master mb-3"
      onMouseEnter={() => setIsHovered(true)}
      onMouseLeave={() => setIsHovered(false)}
      onTouchStart={() => setIsHovered(true)}
      onTouchEnd={() => setIsHovered(false)}
    >
      <div className="spribe-slider-header">
        <div className="spribe-slider-title-wrap">
          <i className="fa-solid fa-crown spribe-slider-crown" />
          <span className="spribe-slider-title">FEATURED LIVE PROVIDER PICKS</span>
        </div>

        <div className="spribe-slider-actions">
          <button
            type="button"
            className="btn-view-in-catalog"
            onClick={onViewInCatalog}
            title="View Spribe in catalog"
          >
            <i className="fa-solid fa-layer-group me-1.5" />
            <span>View In Catalog</span>
          </button>

          <div className="spribe-nav-buttons">
            <button
              type="button"
              className="btn-spribe-nav"
              onClick={scrollLeft}
              title="Previous pick"
            >
              <i className="fa-solid fa-chevron-left" />
            </button>
            <button
              type="button"
              className="btn-spribe-nav"
              onClick={scrollRight}
              title="Next pick"
            >
              <i className="fa-solid fa-chevron-right" />
            </button>
          </div>
        </div>
      </div>

      <div className="spribe-slider-track" ref={sliderRef}>
        {SPRIBE_FEATURED_PICKS.map((pick) => {
          const game = resolveGame(pick)

          return (
            <div
              key={pick.id}
              className={`spribe-slider-card ${pick.theme || 'theme-spribe-purple'}${disabled ? ' is-disabled' : ''}`}
              onClick={() => !disabled && onSelect(game)}
            >
              <div className="spribe-card-top-neon" />
              <div className="spribe-card-badge-row">
                <span className="spribe-live-badge">LIVE</span>
              </div>

              <div className="spribe-card-art-area">
                <img
                  src={pick.image}
                  alt={pick.name}
                  className="spribe-card-poster-img"
                  loading="lazy"
                  onError={(e) => {
                    if (e.currentTarget.src !== GAME_FALLBACK_IMAGE) {
                      e.currentTarget.src = GAME_FALLBACK_IMAGE
                    }
                  }}
                />
              </div>

              <div className="spribe-card-bottom-deck">
                <div className="spribe-card-title">{pick.name}</div>
                <div className="spribe-card-subtitle">LIVE PROVIDER GAME.</div>
                <button
                  type="button"
                  className="btn-spribe-card-action"
                  onClick={(e) => {
                    e.stopPropagation()
                    if (!disabled) onSelect(game)
                  }}
                >
                  {pick.actionText}
                </button>
              </div>
            </div>
          )
        })}
      </div>
    </div>
  )
}

function GameGrid({
  games,
  disabled,
  onSelect,
  hasMore,
  loadingMore,
  onLoadMore,
}: {
  games: GameDefinition[]
  disabled: boolean
  onSelect: (game: GameDefinition) => void
  scrollRoot?: HTMLElement | null
  hasMore: boolean
  loadingMore: boolean
  onLoadMore: () => void
}) {
  return (
    <>
      <div className="winbet-games-grid">
        {games.map((game) => (
          <GameTile key={game.id} game={game} disabled={disabled} onSelect={onSelect} />
        ))}
      </div>
      
      {/* Catalog Bottom Pagination Bar */}
      <div className="catalog-pagination-bar">
        <div className="pagination-count-box">
          <span className="pagination-badge-indicator">
            <i className="fa-solid fa-gamepad me-1.5" />
            Showing <strong className="highlight-gold">{games.length}</strong> Games
          </span>
          {hasMore ? (
            <span className="pagination-sub-tip">
              (First 50 loaded • Click below to load next 50)
            </span>
          ) : null}
        </div>

        <div className="pagination-action-wrap">
          {hasMore ? (
            <button
              type="button"
              className="btn-view-more-games btn-gold-chamfer"
              disabled={loadingMore}
              onClick={onLoadMore}
            >
              {loadingMore ? (
                <>
                  <i className="fa-solid fa-spinner fa-spin me-2" />
                  <span>Loading next 50 games…</span>
                </>
              ) : (
                <>
                  <i className="fa-solid fa-layer-group me-2" />
                  <span className="btn-main-label">VIEW NEXT 50 GAMES (+50)</span>
                </>
              )}
            </button>
          ) : games.length > 0 ? (
            <div className="all-loaded-pill">
              <i className="fa-solid fa-circle-check text-success me-2" />
              <span>
                All <strong className="text-warning mx-1">{games.length}</strong> Live Games Loaded
              </span>
            </div>
          ) : null}
        </div>
      </div>
    </>
  )
}

function LiveCasinoGameModal({
  game,
  disabled,
  onClose,
  onLaunch,
}: {
  game: GameDefinition
  disabled: boolean
  onClose: () => void
  onLaunch: (game: GameDefinition) => void
}) {
  const [imgSrc, setImgSrc] = useState<string>(game.image || GAME_FALLBACK_IMAGE)

  useEffect(() => {
    setImgSrc(game.image || GAME_FALLBACK_IMAGE)
  }, [game.image])

  return (
    <div className="kx-alert-backdrop winbet-modal-backdrop" onClick={onClose}>
      <div
        className="live-casino-game-modal-card animate-pop-in"
        onClick={(e) => e.stopPropagation()}
      >
        <button type="button" className="btn-modal-close-x" onClick={onClose} title="Close">
          <i className="fa-solid fa-xmark" />
        </button>

        <div className="modal-game-poster-section">
          <img
            src={imgSrc}
            alt={game.name}
            className="modal-game-poster-img"
            onError={() => {
              if (imgSrc !== GAME_FALLBACK_IMAGE) {
                setImgSrc(GAME_FALLBACK_IMAGE)
              }
            }}
          />
          <div className="modal-poster-overlay-badge">
            <span className="chamfer-badge badge-live">
              {game.payout_label || 'LIVE'}
            </span>
          </div>
        </div>

        <div className="modal-game-details-section">
          <div className="modal-game-header">
            <h2 className="modal-game-title">{game.name}</h2>
            <div className="modal-game-subtitle">LIVE PROVIDER GAME.</div>
          </div>

          <div className="modal-game-info-chips">
            <div className="game-info-chip">
              <span className="chip-label">PROVIDER</span>
              <span className="chip-value highlight-purple">{game.provider || 'SPRIBE'}</span>
            </div>
            <div className="game-info-chip">
              <span className="chip-label">CATEGORY</span>
              <span className="chip-value">{game.category || 'LIVE CASINO'}</span>
            </div>
            <div className="game-info-chip">
              <span className="chip-label">STATUS</span>
              <span className="chip-value highlight-green">● ONLINE</span>
            </div>
          </div>

          <div className="modal-game-actions">
            <button
              type="button"
              className="btn-modal-launch-primary"
              disabled={disabled}
              onClick={() => {
                onClose()
                onLaunch(game)
              }}
            >
              <i className="fa-solid fa-play me-2" />
              <span>PLAY NOW ›</span>
            </button>
            <button
              type="button"
              className="btn-modal-cancel-secondary"
              onClick={onClose}
            >
              <span>BACK TO LOBBY</span>
            </button>
          </div>
        </div>
      </div>
    </div>
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
  onCashOut,
}: Props) {
  const [activeTab, setActiveTab] = useState<LobbyTab>('all')
  const [selectedProviderKey, setSelectedProviderKey] = useState<string | null>(null)
  const [searchQuery, setSearchQuery] = useState('')
  const [previewGame, setPreviewGame] = useState<GameDefinition | null>(null)
  const paneRef = useRef<HTMLDivElement>(null)
  const [scrollRoot, setScrollRoot] = useState<HTMLElement | null>(null)

  const { config } = useMachine()
  const stored = loadTerminal()
  const pcName = stored?.pcName || config?.PC_Name || config?.Terminal_ID || 'DEVCITY-PC-002'
  const siteName = stored?.siteName || config?.Site_Name || 'dev'

  const {
    providers,
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

  useEffect(() => {
    setScrollRoot(paneRef.current)
  }, [activeTab, selectedProviderKey, playSlot])

  // Initial load for all games
  useEffect(() => {
    if (allPage === 0 && !allLoading && !allError) {
      void loadAllGames(1)
    }
  }, [allPage, allLoading, allError, loadAllGames])

  const selectedProvider: LobbyProvider | null = useMemo(() => {
    if (!selectedProviderKey) return null
    return providers.find((item) => item.key === selectedProviderKey) ?? null
  }, [providers, selectedProviderKey])

  // Handle switching tabs
  const handleTabChange = (tab: LobbyTab) => {
    setActiveTab(tab)
    if (tab === 'all') {
      setSelectedProviderKey(null)
    } else if (tab === 'providers') {
      setSelectedProviderKey(null)
    } else if (tab === 'spribe' || tab === 'endorphina' || tab === 'kagaming' || tab === 'evoplay') {
      const directProv = providers.find((p) => {
        const pName = p.name.toLowerCase()
        const pKey = p.key.toLowerCase()
        if (tab === 'spribe') return pName.includes('spribe') || pKey.includes('spribe')
        if (tab === 'endorphina') return pName.includes('endorphina') || pKey.includes('endorphina')
        if (tab === 'kagaming') return pName.includes('ka') || pKey.includes('ka') || pName.includes('king')
        if (tab === 'evoplay') return pName.includes('evoplay') || pKey.includes('evoplay')
        return false
      })
      if (directProv) {
        setSelectedProviderKey(directProv.key)
        if (!(gamesByProvider[directProv.name]?.length)) {
          void loadProviderGames(directProv.name, 1)
        }
      } else {
        setSelectedProviderKey(null)
      }
    } else {
      setSelectedProviderKey(null)
    }
    onLeaveGame?.()
  }

  const resetFilters = () => {
    setActiveTab('all')
    setSelectedProviderKey(null)
    setSearchQuery('')
    onLeaveGame?.()
  }

  // Base games list
  const baseGamesList = useMemo(() => {
    if (selectedProvider) {
      return gamesByProvider[selectedProvider.name] ?? []
    }
    if (allGames.length > 0) {
      return allGames
    }
    return HOME_GAMES
  }, [selectedProvider, gamesByProvider, allGames])

  // Filter games based on category tab & search HUD
  const filteredGames = useMemo(() => {
    let list = baseGamesList

    if (!selectedProvider) {
      if (activeTab === 'spribe') {
        list = list.filter((g) => {
          const prov = (g.provider || '').toLowerCase()
          const tag = (g.tagline || '').toLowerCase()
          const id = (g.id || '').toLowerCase()
          const name = (g.name || '').toLowerCase()
          return (
            prov.includes('spribe') ||
            tag.includes('spribe') ||
            id.includes('spribe') ||
            name.includes('aviator') ||
            name.includes('plinko') ||
            name.includes('mines') ||
            name.includes('goal') ||
            name.includes('hilo') ||
            name.includes('hotline')
          )
        })
      } else if (activeTab === 'endorphina') {
        list = list.filter((g) => (g.provider || '').toLowerCase().includes('endorphina') || (g.tagline || '').toLowerCase().includes('endorphina'))
      } else if (activeTab === 'kagaming') {
        list = list.filter((g) => (g.provider || '').toLowerCase().includes('ka') || (g.tagline || '').toLowerCase().includes('ka') || (g.provider || '').toLowerCase().includes('king'))
      } else if (activeTab === 'evoplay') {
        list = list.filter((g) => (g.provider || '').toLowerCase().includes('evoplay') || (g.tagline || '').toLowerCase().includes('evoplay'))
      } else if (activeTab === 'slots') {
        list = list.filter((g) => (g.category || '').toLowerCase().includes('slot') || (g.name || '').toLowerCase().includes('spin') || (g.name || '').toLowerCase().includes('reel'))
      } else if (activeTab === 'crash') {
        list = list.filter((g) => (g.category || '').toLowerCase().includes('crash') || (g.category || '').toLowerCase().includes('instant') || (g.name || '').toLowerCase().includes('aviator') || (g.name || '').toLowerCase().includes('rocket') || (g.name || '').toLowerCase().includes('balloon'))
      } else if (activeTab === 'table') {
        list = list.filter((g) => (g.category || '').toLowerCase().includes('table') || (g.category || '').toLowerCase().includes('card') || (g.category || '').toLowerCase().includes('dice') || (g.name || '').toLowerCase().includes('dice') || (g.name || '').toLowerCase().includes('roulette') || (g.name || '').toLowerCase().includes('poker'))
      } else if (activeTab === 'live') {
        list = list.filter((g) => g.is_live || (g.category || '').toLowerCase().includes('live') || (g.provider || '').toLowerCase().includes('live'))
      } else if (activeTab === 'sports') {
        list = list.filter((g) => (g.category || '').toLowerCase().includes('sport') || (g.name || '').toLowerCase().includes('goal') || (g.name || '').toLowerCase().includes('soccer') || (g.name || '').toLowerCase().includes('sports'))
      }
    }

    if (searchQuery.trim()) {
      const q = searchQuery.toLowerCase().trim()
      list = list.filter(
        (g) =>
          (g.name || '').toLowerCase().includes(q) ||
          (g.provider || '').toLowerCase().includes(q) ||
          (g.category || '').toLowerCase().includes(q),
      )
    }

    return list
  }, [baseGamesList, selectedProvider, activeTab, searchQuery])

  const totalCatalogCount = Math.max(24, allGames.length || 24)

  const statusMessage = cashOutPending
    ? 'Cash-out pending — collect at the cashier. Games are locked.'
    : offline
      ? 'Connection lost — waiting to reconnect…'
      : waitingForCoins
        ? 'Waiting for cash-in — insert a note or scan a credit ticket.'
        : null

  const isCurrentProviderLoading = selectedProvider
    ? gamesLoading && (gamesByProvider[selectedProvider.name]?.length ?? 0) === 0
    : allLoading && allGames.length === 0

  const isCurrentProviderLoadingMore = selectedProvider ? gamesLoadingMore : allLoadingMore

  const currentHasMore = selectedProvider
    ? providerHasMore(selectedProvider.name) && !searchQuery.trim()
    : allHasMore && !searchQuery.trim()

  const handleLoadMore = () => {
    if (selectedProvider) {
      loadMoreProviderGames(selectedProvider.name)
    } else {
      loadMoreAllGames()
    }
  }

  return (
    <div className={`winbet-casino-catalog-wrapper container-fluid px-2 px-md-3 py-2${disabled ? ' game-lobby-disabled' : ''}`}>
      {!playSlot ? <LiveRecentWinnersFeed /> : null}

      {/* FEATURED LIVE PROVIDER PICKS (SPRIBE ONLY AUTO-MOVING SWIPER SLIDER) */}
      {!playSlot ? (
        <SpribeFeaturedSlider
          disabled={disabled}
          catalogGames={allGames.length > 0 ? allGames : HOME_GAMES}
          onSelect={onSelect}
          onViewInCatalog={() => {
            handleTabChange('spribe')
            const el = document.getElementById('categoryTabs')
            el?.scrollIntoView({ behavior: 'smooth' })
          }}
        />
      ) : null}

      <div className="catalog-master-card">
        {/* Top Banner (Live Casino Catalog Header) */}
        <div className="catalog-top-banner">
          <div className="catalog-banner-title">
            <span className="catalog-icon">
              <i className="fa-solid fa-layer-group"></i>
            </span>
            <span>LIVE CASINO CATALOG</span>
          </div>

          <div className="catalog-banner-actions">
            <span className="all-games-badge">
              All Games ({totalCatalogCount})
            </span>
            <button
              type="button"
              className="btn-catalog-reset"
              onClick={resetFilters}
            >
              <i className="fa-solid fa-rotate-right me-1"></i> Reset
            </button>
          </div>
        </div>

        {/* Category Nav Bar with All Categories & Integrated Search HUD (Exact Match to Screenshot) */}
        <div className="category-nav-bar">
          <div className="category-scroll-container" id="categoryTabs">
            {/* 1. ALL GAMES */}
            <div
              className={`cat-pill${activeTab === 'all' && !selectedProviderKey ? ' active' : ''}`}
              onClick={() => handleTabChange('all')}
            >
              <i className="fa-solid fa-table-cells-large"></i>
              <span>ALL GAMES</span>
            </div>

            {/* 2. PROVIDERS */}
            <div
              className={`cat-pill${activeTab === 'providers' ? ' active' : ''}`}
              onClick={() => handleTabChange('providers')}
            >
              <i className="fa-solid fa-layer-group"></i>
              <span>PROVIDERS</span>
            </div>

            {/* 3. SLOTS */}
            <div
              className={`cat-pill${activeTab === 'slots' ? ' active' : ''}`}
              onClick={() => handleTabChange('slots')}
            >
              <i className="fa-solid fa-clover"></i>
              <span>SLOTS</span>
            </div>

            {/* 4. CRASH & INSTANT */}
            <div
              className={`cat-pill${activeTab === 'crash' ? ' active' : ''}`}
              onClick={() => handleTabChange('crash')}
            >
              <i className="fa-solid fa-bolt"></i>
              <span>CRASH &amp; INSTANT</span>
            </div>

            {/* 5. TABLE GAMES */}
            <div
              className={`cat-pill${activeTab === 'table' ? ' active' : ''}`}
              onClick={() => handleTabChange('table')}
            >
              <i className="fa-solid fa-dice"></i>
              <span>TABLE GAMES</span>
            </div>

            {/* 6. LIVE CASINO */}
            <div
              className={`cat-pill${activeTab === 'live' ? ' active' : ''}`}
              onClick={() => handleTabChange('live')}
            >
              <i className="fa-solid fa-tower-broadcast"></i>
              <span>LIVE CASINO</span>
            </div>
          </div>

          {/* Integrated Search Bar & Game Count HUD */}
          <div className="d-flex align-items-center gap-3 ms-auto mt-2 mt-md-0">
            <div className="search-box-station">
              <i className="fa-solid fa-magnifying-glass search-icon"></i>
              <input
                type="text"
                id="gameSearchInput"
                placeholder="Search live games..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
              />
              {searchQuery && (
                <button
                  type="button"
                  className="clear-search-btn"
                  onClick={() => setSearchQuery('')}
                  title="Clear search"
                >
                  <i className="fa-solid fa-xmark"></i>
                </button>
              )}
            </div>
          </div>
        </div>

        {statusMessage ? (
          <div
            className={`lobby-status-banner${cashOutPending ? ' is-cashout' : ''}${offline ? ' is-offline' : ''}${waitingForCoins ? ' is-waiting' : ''}`}
            role="status"
          >
            {statusMessage}
          </div>
        ) : null}

        {/* Active Play Overlay Slot */}
        {playSlot ? <div className="lobby-pane lobby-pane-play">{playSlot}</div> : null}

        {/* Main View Pane */}
        {!playSlot ? (
          <div className="lobby-pane" ref={paneRef}>
          {/* PROVIDERS GALLERY VIEW */}
          {activeTab === 'providers' && !selectedProviderKey ? (
            <div className="winbet-games-grid">
              {providers.map((prov) => {
                const iconClass = getProviderIcon(prov.name)
                return (
                  <div
                    key={prov.key}
                    className="chamfer-card-wrapper"
                    onClick={() => {
                      setSelectedProviderKey(prov.key)
                      if (!(gamesByProvider[prov.name]?.length)) {
                        void loadProviderGames(prov.name, 1)
                      }
                    }}
                  >
                    <div className="chamfer-casino-card theme-purple">
                      <div className="chamfer-border-wrap">
                        <div className="chamfer-inner-deck">
                          <div className="card-top-neon-stripe" />
                          <div className="card-top-badge-row">
                            <span className="chamfer-badge badge-hot">PROVIDER</span>
                          </div>

                          <div className="chamfer-artwork-frame">
                            <ProviderLogoItem logo={prov.logo} name={prov.name} iconClass={iconClass} />
                          </div>

                          <div className="chamfer-bottom-vignette" />

                          <div className="chamfer-content-deck">
                            <div className="chamfer-game-title">{prov.name}</div>
                            <div className="chamfer-game-subtitle">OFFICIAL PROVIDER</div>
                            <button
                              type="button"
                              className="btn-chamfer-neon-pill"
                              onClick={(e) => {
                                e.stopPropagation()
                                setSelectedProviderKey(prov.key)
                                if (!(gamesByProvider[prov.name]?.length)) {
                                  void loadProviderGames(prov.name, 1)
                                }
                              }}
                            >
                              VIEW GAMES ›
                            </button>
                          </div>
                        </div>
                      </div>
                    </div>
                  </div>
                )
              })}
            </div>
          ) : (
            /* GAMES VIEW (ALL, SELECTED PROVIDER, OR CATEGORY) */
            <>
              {activeTab === 'providers' && selectedProvider ? (
                <div className="lobby-header-row">
                  <button
                    type="button"
                    className="btn-catalog-reset"
                    onClick={() => setSelectedProviderKey(null)}
                  >
                    <i className="fa-solid fa-arrow-left me-1"></i> Back to Providers
                  </button>
                  <h3 className="provider-active-title">
                    <span>{selectedProvider.name}</span>
                    <span className="provider-game-count-tag">
                      {filteredGames.length} Games
                    </span>
                  </h3>
                </div>
              ) : null}

              {isCurrentProviderLoading ? (
                <p className="lobby-empty">
                  Loading {selectedProvider ? `${selectedProvider.name} games…` : 'games…'}
                </p>
              ) : (selectedProvider ? gamesError : allError) && filteredGames.length === 0 ? (
                <p className="lobby-empty">
                  {selectedProvider ? gamesError : allError}
                </p>
              ) : filteredGames.length === 0 ? (
                <div className="no-live-games-card">
                  <div className="no-live-games-icon-wrap">
                    <i className="fa-solid fa-gamepad"></i>
                  </div>
                  <h2 className="no-live-games-title">No Live Games Found</h2>
                  <p className="no-live-games-subtitle">
                    {searchQuery.trim()
                      ? `No live games matching "${searchQuery}". Try another keyword or filter.`
                      : selectedProvider
                        ? `No live games found for ${selectedProvider.name}. Try another category or filter.`
                        : 'No live games matching this filter. Try another keyword or filter.'}
                  </p>
                  <button
                    type="button"
                    className="btn-show-all-live-games"
                    onClick={resetFilters}
                  >
                    Show All Games
                  </button>
                </div>
              ) : (
                <GameGrid
                  games={filteredGames}
                  disabled={disabled}
                  onSelect={onSelect}
                  scrollRoot={scrollRoot}
                  hasMore={currentHasMore}
                  loadingMore={isCurrentProviderLoadingMore}
                  onLoadMore={handleLoadMore}
                />
              )}
            </>
          )}
        </div>
      ) : null}
      </div>

      {!playSlot ? (
        <>
          {/* ==========================================================================
              2. TERMINAL VIP CLUB & CASHIER PERKS (Separate Section Card)
              ========================================================================== */}
          <div className="vip-perks-section mt-4">
            <div className="vip-perks-header">
              <div className="vip-perks-title">
                <span className="vip-badge-icon">🏅</span>
                <span>TERMINAL VIP CLUB & CASHIER PERKS</span>
              </div>
              <div className="vip-membership-badge">
                <span className="star-icon">★</span>
                <span>MEMBERSHIP ACTIVE</span>
              </div>
            </div>

            <div className="vip-perks-grid">
              {/* Card 1 */}
              <div className="vip-perk-card">
                <div className="perk-card-top">
                  <div className="perk-icon-wrap icon-gold">
                    <i className="fa-solid fa-gift"></i>
                  </div>
                  <span className="perk-tag tag-gold">DAILY BONUS</span>
                </div>
                <div className="perk-card-title">100% Reload Bonus</div>
                <div className="perk-card-desc">
                  Top up your session with the cashier and double your initial credits up to N$ 1,000!
                </div>
                <button type="button" className="btn-perk-action btn-perk-blue">
                  CLAIM AT CASHIER
                </button>
              </div>

              {/* Card 2 */}
              <div className="vip-perk-card">
                <div className="perk-card-top">
                  <div className="perk-icon-wrap icon-green">
                    <i className="fa-solid fa-shield-halved"></i>
                  </div>
                  <span className="perk-tag tag-green">VIP SHIELD</span>
                </div>
                <div className="perk-card-title">15% Weekly Rebate</div>
                <div className="perk-card-desc">
                  Automatic cash protection. Get 15% cashback returned directly to your terminal balance every Monday.
                </div>
                <button type="button" className="btn-perk-action btn-perk-green">
                  VIP ACTIVATED
                </button>
              </div>

              {/* Card 3 */}
              <div className="vip-perk-card">
                <div className="perk-card-top">
                  <div className="perk-icon-wrap icon-purple">
                    <i className="fa-solid fa-money-bill-wave"></i>
                  </div>
                  <span className="perk-tag tag-purple">FAST PAYOUT</span>
                </div>
                <div className="perk-card-title">Instant Desk Cashout</div>
                <div className="perk-card-desc">
                  Click Cash Out at any time. Your session balance is locked and instantly paid in cash at the counter.
                </div>
                <button type="button" className="btn-perk-action btn-perk-gold">
                  REQUEST CASHOUT
                </button>
              </div>

              {/* Card 4 */}
              <div className="vip-perk-card">
                <div className="perk-card-top">
                  <div className="perk-icon-wrap icon-cyan">
                    <i className="fa-solid fa-gem"></i>
                  </div>
                  <span className="perk-tag tag-cyan">HIGH ROLLER</span>
                </div>
                <div className="perk-card-title">Exclusive High Stakes Club</div>
                <div className="perk-card-desc">
                  Unlocked higher spin limits up to N$ 500 per spin with dedicated VIP shop assistance.
                </div>
                <button type="button" className="btn-perk-action btn-perk-blue">
                  VIEW PRIVILEGES
                </button>
              </div>
            </div>
          </div>

          {/* ==========================================================================
              3. NEED HELP / CASH BALANCE TOP-UP BANNER (Separate Card)
              ========================================================================== */}
          <div className="kiosk-help-banner mt-4">
            <div className="help-icon-wrap">
              <i className="fa-solid fa-headset"></i>
            </div>
            <div className="help-content">
              <div className="help-title">Need Help or Cash Balance Top-Up?</div>
              <div className="help-desc">
                Approach the {siteName} Cashier Counter with your Terminal Station Number (<strong className="text-warning">{pcName}</strong>) for instant deposit, session top-up, or cashout assistance.
              </div>
            </div>
            <div className="help-badges-row">
              <span className="help-pill">
                CERTIFIED FAIR RNG
              </span>
              <span className="help-pill pill-gold">
                <i className="fa-solid fa-bolt me-1"></i> INSTANT PAYOUTS
              </span>
              <span className="help-pill pill-cyan">
                <i className="fa-solid fa-lock me-1"></i> STATION ENCRYPTED
              </span>
            </div>
          </div>

          {/* ==========================================================================
              4. WINBET FOOTER SECTION WITH ACTION BAR (Exact Match to Concept)
              ========================================================================== */}
          <div className="kiosk-footer-container mt-4 mb-3">
            {/* Top Action Bar with Shop Pill and Gold Cash Out Button */}
            <div className="kiosk-footer-action-bar">
              <div className="footer-shop-pill">
                <span className="footer-shop-icon">
                  <i className="fa-solid fa-store"></i>
                </span>
                <span className="footer-shop-name">{siteName}</span>
              </div>

              <button
                type="button"
                className="btn-footer-cashout"
                onClick={() => {
                  if (onCashOut) {
                    onCashOut()
                  } else {
                    window.dispatchEvent(
                      new CustomEvent('kiosk:cashout')
                    )
                  }
                }}
              >
                <i className="fa-solid fa-circle-check me-1.5"></i> Cash Out
              </button>
            </div>

            {/* 3-Column Footer Information (Evenly Distributed) */}
            <div className="kiosk-footer-section">
              <div className="kiosk-footer-grid">
                <div className="footer-col-card">
                  <div className="footer-brand-row">
                    <span className="footer-brand-title">
                      <i className="fa-solid fa-crown text-warning me-1.5"></i> WINBET
                    </span>
                    <span className="footer-brand-badge">
                      <i className="fa-solid fa-shield-halved me-1"></i> OFFICIAL STATION
                    </span>
                  </div>
                  <p className="footer-brand-desc">
                    Authorized Gaming Terminal and Smart PC system. Powered by WinBet Gaming Central.
                  </p>
                  <div className="footer-badges-row">
                    <span className="footer-encryption-badge">
                      <i className="fa-solid fa-lock me-1.5"></i> 256-BIT ENCRYPTION
                    </span>
                    <span className="footer-age-badge">
                      18+
                    </span>
                  </div>
                </div>

                <div className="footer-col-card">
                  <div className="footer-col-heading">
                    <i className="fa-solid fa-circle-info text-cyan me-1.5"></i> QUICK INFORMATION
                  </div>
                  <ul className="footer-info-list">
                    <li>
                      <i className="fa-solid fa-store text-warning me-2"></i>
                      <span className="text-muted">Shop:</span> <strong>{siteName}</strong>
                    </li>
                    <li>
                      <i className="fa-solid fa-desktop text-cyan me-2"></i>
                      <span className="text-muted">Station:</span> <strong>{pcName}</strong>
                    </li>
                    <li>
                      <i className="fa-solid fa-cash-register text-purple me-2"></i>
                      <span className="text-muted">Mode:</span> <strong>Terminal (Cashier)</strong>
                    </li>
                  </ul>
                </div>

                <div className="footer-col-card">
                  <div className="footer-col-heading">
                    <i className="fa-solid fa-headset text-warning me-1.5"></i> PLAYER ASSISTANCE
                  </div>
                  <ul className="footer-info-list">
                    <li>
                      <i className="fa-solid fa-user-tie text-warning me-2"></i>
                      Ask shop cashier for assistance
                    </li>
                    <li>
                      <i className="fa-solid fa-ticket text-cyan me-2"></i>
                      Always keep your cashout vouchers safe
                    </li>
                    <li>
                      <i className="fa-solid fa-shield-heart text-success me-2"></i>
                      Play responsibly (18+ only)
                    </li>
                  </ul>
                </div>
              </div>
            </div>
          </div>
        </>
      ) : null}

      {previewGame ? (
        <LiveCasinoGameModal
          game={previewGame}
          disabled={disabled}
          onClose={() => setPreviewGame(null)}
          onLaunch={(g) => {
            setPreviewGame(null)
            onSelect(g)
          }}
        />
      ) : null}
    </div>
  )
}
