import { useEffect, useRef, useState } from 'react'
import { formatCurrency, launchProviderGame } from '../api/client'

type Props = {
  gameId: string
  gameName: string
  machineId: string
  balance: number
  onBack: () => void
  onError: (message: string) => void
  onClosed: () => void
  getHardwareId: () => Promise<string>
}

export function ProviderGamePanel({
  gameId,
  gameName,
  machineId,
  balance,
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
        const hardwareId = await getHardwareIdRef.current()
        const result = await launchProviderGame(machineId, hardwareId, gameId)
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
  }, [gameId, machineId])

  function handleExit() {
    onClosed()
    onBack()
  }

  return (
    <div className="provider-game-panel">
      <div className="provider-game-toolbar">
        <button type="button" className="kx-btn kx-btn-ghost kx-btn-sm" onClick={handleExit}>
          ← Exit game
        </button>
        <div className="provider-game-title">
          <strong>{gameName}</strong>
          <span>Live</span>
        </div>
        <div className="provider-game-balance">Bal {formatCurrency(balance)}</div>
      </div>

      {loading ? (
        <div className="provider-game-loading">
          <div className="provider-spinner" aria-hidden />
          <p>Launching {gameName}…</p>
        </div>
      ) : gameUrl ? (
        <iframe
          className="provider-game-frame"
          title={gameName}
          src={gameUrl}
          allow="autoplay; fullscreen; payment"
          referrerPolicy="no-referrer-when-downgrade"
        />
      ) : null}
    </div>
  )
}
