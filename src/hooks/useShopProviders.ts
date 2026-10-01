import { useCallback, useEffect, useRef, useState } from 'react'
import { fetchGames, fetchProviders } from '../api/client'
import {
  hydrateCatalogGame,
  lobbyProviderFromApi,
  type GameDefinition,
  type LobbyProvider,
} from '../games/catalog'

const PAGE_SIZE = 50

function mapAssigned(items: { kind?: 'local' | 'provider' }[]) {
  return items
    .filter((game) => game.kind !== 'local')
    .map((game) => hydrateCatalogGame(game as Parameters<typeof hydrateCatalogGame>[0]))
}

export function useShopProviders() {
  const [providers, setProviders] = useState<LobbyProvider[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [gamesByProvider, setGamesByProvider] = useState<Record<string, GameDefinition[]>>({})
  const [providerPage, setProviderPage] = useState<Record<string, { page: number; lastPage: number }>>({})
  const [gamesLoading, setGamesLoading] = useState(false)
  const [gamesLoadingMore, setGamesLoadingMore] = useState(false)
  const [gamesError, setGamesError] = useState<string | null>(null)
  const [allGames, setAllGames] = useState<GameDefinition[]>([])
  const [allPage, setAllPage] = useState(0)
  const [allLastPage, setAllLastPage] = useState(1)
  const [allLoading, setAllLoading] = useState(false)
  const [allLoadingMore, setAllLoadingMore] = useState(false)
  const [allError, setAllError] = useState<string | null>(null)
  const allInflight = useRef(false)
  const providerInflight = useRef(false)

  useEffect(() => {
    let cancelled = false

    fetchProviders()
      .then((items) => {
        if (cancelled) return
        setProviders(items.map(lobbyProviderFromApi))
        setError(null)
      })
      .catch((err) => {
        if (cancelled) return
        setProviders([])
        setError(err instanceof Error ? err.message : 'Unable to load providers')
      })
      .finally(() => {
        if (!cancelled) setLoading(false)
      })

    return () => {
      cancelled = true
    }
  }, [])

  const loadProviderGames = useCallback(async (providerName: string, page = 1) => {
    if (providerInflight.current) return
    providerInflight.current = true
    if (page === 1) {
      setGamesLoading(true)
    } else {
      setGamesLoadingMore(true)
    }
    setGamesError(null)
    try {
      const result = await fetchGames({ provider: providerName, page, limit: PAGE_SIZE })
      const mapped = mapAssigned(result.items)
      setGamesByProvider((current) => ({
        ...current,
        [providerName]: page === 1 ? mapped : [...(current[providerName] ?? []), ...mapped],
      }))
      setProviderPage((current) => ({
        ...current,
        [providerName]: {
          page: result.pagination.current_page,
          lastPage: result.pagination.last_page,
        },
      }))
    } catch (err) {
      setGamesError(err instanceof Error ? err.message : 'Unable to load games')
    } finally {
      providerInflight.current = false
      setGamesLoading(false)
      setGamesLoadingMore(false)
    }
  }, [])

  const loadMoreProviderGames = useCallback(
    (providerName: string) => {
      const meta = providerPage[providerName]
      if (!meta || gamesLoading || gamesLoadingMore || meta.page >= meta.lastPage) return
      void loadProviderGames(providerName, meta.page + 1)
    },
    [gamesLoading, gamesLoadingMore, loadProviderGames, providerPage],
  )

  const loadAllGames = useCallback(async (page = 1) => {
    if (allInflight.current) return
    allInflight.current = true
    if (page === 1) {
      setAllLoading(true)
    } else {
      setAllLoadingMore(true)
    }
    setAllError(null)
    try {
      const result = await fetchGames({ page, limit: PAGE_SIZE })
      const mapped = mapAssigned(result.items)
      setAllGames((current) => (page === 1 ? mapped : [...current, ...mapped]))
      setAllPage(result.pagination.current_page)
      setAllLastPage(result.pagination.last_page)
    } catch (err) {
      setAllError(err instanceof Error ? err.message : 'Unable to load games')
    } finally {
      allInflight.current = false
      setAllLoading(false)
      setAllLoadingMore(false)
    }
  }, [])

  const loadMoreAllGames = useCallback(() => {
    if (allLoading || allLoadingMore || allPage === 0 || allPage >= allLastPage) return
    void loadAllGames(allPage + 1)
  }, [allLastPage, allLoading, allLoadingMore, allPage, loadAllGames])

  return {
    providers,
    loading,
    error,
    gamesByProvider,
    gamesLoading,
    gamesLoadingMore,
    gamesError,
    loadProviderGames,
    loadMoreProviderGames,
    providerHasMore: (providerName: string) => {
      const meta = providerPage[providerName]
      return !!meta && meta.page < meta.lastPage
    },
    allGames,
    allPage,
    allLoading,
    allLoadingMore,
    allError,
    allHasMore: allPage > 0 && allPage < allLastPage,
    loadAllGames,
    loadMoreAllGames,
  }
}
