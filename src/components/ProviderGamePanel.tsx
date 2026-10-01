import { useEffect, useRef, useState } from 'react'
import { formatCurrency, launchProviderGame } from '../api/client'
import type { GameDefinition } from '../games/catalog'

type Props = {
  game: GameDefinition
  machineId: string
  balance: number
  disabled: boolean
  onBack: () => void
  onError: (message: string) => void
  onClosed: () => void
  getHardwareId: () => Promise<string>
}

export function ProviderGamePanel({
  game,
  machineId,
  balance,
  disabled,
  onBack,
  onError,
  onClosed,
  getHardwareId,
}: Props) {
  const [gameUrl, setGameUrl] = useState<string | null>(null)
  const [loading, setLoading] = useState(true)
  const onBackRef = useRef(onBack)
  const onErrorRef = useRef(onError)
  const getHardwareIdRef = useRef(getHardwareId)

  onBackRef.current = onBack
  onErrorRef.current = onError
  getHardwareIdRef.current = getHardwareId

  useEffect(() => {
    let cancelled = false

    async function launch() {
      setLoading(true)
      setGameUrl(null)
      try {
        if (disabled) {
          throw new Error('Terminal is offline or cash-out is pending.')
        }
        const hardwareId = await getHardwareIdRef.current()
        const result = await launchProviderGame(machineId, hardwareId, game.id)
        if (cancelled) return
        setGameUrl(result.game_url)
      } catch (err) {
        if (cancelled) return
        onErrorRef.current(err instanceof Error ? err.message : 'Game launch failed')
        onBackRef.current()
      } finally {
        if (!cancelled) setLoading(false)
      }
    }

    void launch()
    return () => {
      cancelled = true
    }
  }, [game.id, machineId, disabled])

  function handleExit() {
    onClosed()
    onBack()
  }

  return (
    <div className="provider-game-panel">
      <div className="provider-game-toolbar">
        <button type="button" className="exit-game-btn" onClick={handleExit}>
          ← Exit game
        </button>
        <div className="provider-game-title">
          <strong>{game.name}</strong>
          <span>Live</span>
        </div>
        <div className="provider-game-balance">Bal {formatCurrency(balance)}</div>
      </div>

      {loading ? (
        <div className="provider-game-loading">
          <div className="provider-spinner" aria-hidden="true" />
          <p>Launching {game.name}…</p>
        </div>
      ) : gameUrl ? (
        <iframe
          className="provider-game-frame"
          title={game.name}
          src={gameUrl}
          allow="autoplay; fullscreen; payment; clipboard-read; clipboard-write"
          allowFullScreen
        />
      ) : null}
    </div>
  )
}
