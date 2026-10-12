import { useEffect, useRef, useState } from 'react'
import { createPortal } from 'react-dom'
import { formatCurrency, launchProviderGame } from '../api/client'
import type { GameDefinition } from '../games/catalog'
import { loadTerminal } from '../lib/storage'

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

const FALLBACK_PLACEHOLDER = '/assets/img/placeholder.png'

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
  const [iframeLoaded, setIframeLoaded] = useState(false)
  const [launchError, setLaunchError] = useState<string | null>(null)
  const [currentTime, setCurrentTime] = useState<string>('')
  const [isFullscreen, setIsFullscreen] = useState(false)
  const [iframeKey, setIframeKey] = useState(0)

  const onBackRef = useRef(onBack)
  const onErrorRef = useRef(onError)
  const onClosedRef = useRef(onClosed)
  const getHardwareIdRef = useRef(getHardwareId)

  const stored = loadTerminal()
  const terminalName = stored?.pcName || stored?.hostname || machineId || 'CABIN-01'

  onBackRef.current = onBack
  onErrorRef.current = onError
  onClosedRef.current = onClosed
  getHardwareIdRef.current = getHardwareId

  // Body active game lifecycle to hide home header
  useEffect(() => {
    document.body.classList.add('is-game-active')
    return () => {
      document.body.classList.remove('is-game-active')
    }
  }, [])

  // Live real-time clock
  useEffect(() => {
    const updateTime = () => {
      const now = new Date()
      setCurrentTime(
        now.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', second: '2-digit', hour12: false })
      )
    }
    updateTime()
    const timer = setInterval(updateTime, 1000)
    return () => clearInterval(timer)
  }, [])

  useEffect(() => {
    let cancelled = false

    async function launch() {
      setLoading(true)
      setIframeLoaded(false)
      setLaunchError(null)
      setGameUrl(null)
      try {
        if (disabled) {
          throw new Error('Terminal balance is zero. Please insert cash or scan a ticket first.')
        }
        const hardwareId = await getHardwareIdRef.current()
        const result = await launchProviderGame(machineId, hardwareId, game.id)
        if (cancelled) return
        setGameUrl(result.game_url)
      } catch (err) {
        if (cancelled) return
        const msg = err instanceof Error ? err.message : 'Game launch failed'
        setLaunchError(msg)
        onErrorRef.current(msg)
        onClosedRef.current()
        onBackRef.current()
      } finally {
        if (!cancelled) setLoading(false)
      }
    }

    void launch()
    return () => {
      cancelled = true
    }
  }, [game.id, machineId, disabled, iframeKey])

  // Fallback timer: ensure the loader clears even if iframe onload event is delayed by external CDN
  useEffect(() => {
    if (!gameUrl) return
    const timer = setTimeout(() => {
      setIframeLoaded(true)
    }, 8000)
    return () => clearTimeout(timer)
  }, [gameUrl, iframeKey])

  function handleExit() {
    onClosed()
    onBack()
  }

  function toggleFullscreen() {
    if (!document.fullscreenElement) {
      document.documentElement.requestFullscreen?.().then(() => setIsFullscreen(true)).catch(() => {})
    } else {
      document.exitFullscreen?.().then(() => setIsFullscreen(false)).catch(() => {})
    }
  }

  function handleReload() {
    setLaunchError(null)
    setIframeLoaded(false)
    setLoading(true)
    setIframeKey((prev) => prev + 1)
  }

  function handleIframeLoaded() {
    // Give the remote game engine/canvas a short moment (600ms) to paint its dark canvas
    // before fading out the black loading shield, completely preventing white flashes.
    window.setTimeout(() => {
      setIframeLoaded(true)
      setLoading(false)
    }, 600)
  }

  const providerName = (game.provider || (game.id.includes('SPRIBE') ? 'SPRIBE' : 'CASINO LIVE')).toUpperCase()

  return createPortal(
    <div className="game-launch-screen" style={{ backgroundColor: '#000000', colorScheme: 'dark' }}>
      {/* Top Game Launch Header (Rich Casino Theme) */}
      <header className="game-launch-header">
        {/* Left: Exit button, Game thumbnail, Title and Live Tag */}
        <div className="game-launch-header-left">
          <button type="button" className="game-launch-exit-btn" onClick={handleExit} title="Exit back to lobby">
            <i className="fa-solid fa-arrow-left" aria-hidden="true"></i>
            <span>EXIT GAME</span>
          </button>

          <div className="game-launch-divider" />

          <div className="game-launch-thumb-box">
            <img
              src={game.image || FALLBACK_PLACEHOLDER}
              alt={game.name}
              className="game-launch-thumb-img"
              onError={(e) => {
                const target = e.currentTarget
                if (target.src !== FALLBACK_PLACEHOLDER) {
                  target.src = FALLBACK_PLACEHOLDER
                }
              }}
            />
          </div>

          <div className="game-launch-title-wrap">
            <div className="game-launch-title-row">
              <h2 className="game-launch-name">{game.name}</h2>
              <span className="game-launch-provider-badge">{providerName}</span>
            </div>
            <div className="game-launch-meta-row">
              <span className="game-launch-live-tag">
                <span className="game-launch-pulse-dot" /> LIVE STREAM
              </span>
              <span className="game-launch-kind-tag">{(game.category || game.kind || 'LIVE').toUpperCase()}</span>
            </div>
          </div>
        </div>

        {/* Center: WINBET Casino branding & Terminal status capsule */}
        <div className="game-launch-header-center">
          <div className="game-launch-brand">
            <span className="brand-win">WIN</span>
            <span className="brand-bet">BET</span>
            <span className="brand-kiosk-tag">CASINO</span>
          </div>

          <div className="game-launch-station-capsule">
            <span className="game-launch-station-item">
              <i className="fa-solid fa-desktop text-cyan"></i>
              <span className="station-label">{terminalName}</span>
            </span>
            <span className="game-launch-station-sep">•</span>
            <span className="game-launch-station-item">
              <i className="fa-regular fa-clock text-gold"></i>
              <span className="station-clock">{currentTime || '00:00:00'}</span>
            </span>
            <span className="game-launch-station-sep">•</span>
            <span className="game-launch-station-status">
              <span className="status-dot online"></span>
              <span>ACTIVE</span>
            </span>
          </div>
        </div>

        {/* Right: Quick action controls & Chamfered Balance Pill */}
        <div className="game-launch-header-right">
          <div className="game-launch-controls">
            <button
              type="button"
              className="game-launch-icon-btn"
              onClick={handleReload}
              title="Reload Game Stream"
              aria-label="Reload Game Stream"
            >
              <i className="fa-solid fa-rotate-right"></i>
            </button>
            <button
              type="button"
              className="game-launch-icon-btn"
              onClick={toggleFullscreen}
              title="Toggle Fullscreen"
              aria-label="Toggle Fullscreen"
            >
              <i className={`fa-solid ${isFullscreen ? 'fa-compress' : 'fa-expand'}`}></i>
            </button>
          </div>

          <div className="game-launch-balance-pill">
            <div className="game-launch-balance-content">
              <span className="balance-label">BAL</span>
              <span className="balance-amount">{formatCurrency(balance)}</span>
            </div>
          </div>
        </div>
      </header>

      {/* Main Game Launch Body */}
      <div className="game-launch-body" style={{ background: '#000000', backgroundColor: '#000000', position: 'relative' }}>
        {launchError ? (
          <div className="game-launch-connecting" style={{ maxWidth: 440, margin: '0 auto', textAlign: 'center', padding: 24, zIndex: 20 }}>
            <i className="fa-solid fa-triangle-exclamation text-warning" style={{ fontSize: '2.5rem', marginBottom: 16 }} />
            <div className="game-launch-status-text" style={{ color: '#fff', fontSize: '1.2rem', fontWeight: 800, marginBottom: 8 }}>
              Game Stream Unavailable
            </div>
            <p style={{ color: '#cbd5e1', fontSize: '0.9rem', marginBottom: 20 }}>{launchError}</p>
            <div style={{ display: 'flex', gap: 12, justifyContent: 'center' }}>
              <button
                type="button"
                className="btn-winbet-modal-primary"
                onClick={handleReload}
                style={{ padding: '10px 20px', fontSize: '0.9rem' }}
              >
                <i className="fa-solid fa-rotate-right me-1.5" /> Retry Launch
              </button>
              <button
                type="button"
                className="btn-winbet-modal-secondary"
                onClick={handleExit}
                style={{ padding: '10px 20px', fontSize: '0.9rem' }}
              >
                Exit to Lobby
              </button>
            </div>
          </div>
        ) : (
          <>
            {/* Dark loading state overlay - covers the screen seamlessly until the remote game canvas has rendered */}
            <div
              className="game-launch-connecting"
              style={{
                position: 'absolute',
                inset: 0,
                display: 'flex',
                flexDirection: 'column',
                alignItems: 'center',
                justifyContent: 'center',
                background: '#000000',
                backgroundColor: '#000000',
                zIndex: 10,
                gap: 16,
                opacity: (!iframeLoaded || loading) ? 1 : 0,
                pointerEvents: (!iframeLoaded || loading) ? 'auto' : 'none',
                transition: 'opacity 0.4s ease-out',
              }}
            >
              <div className="game-launch-spinner" aria-hidden="true" />
              <div className="game-launch-status-text">
                {loading ? 'Connecting to Live Game Server...' : 'Loading Game Assets...'}
              </div>
              <div style={{ color: '#94a3b8', fontSize: '0.9rem', marginTop: -4 }}>
                {game.name} · {providerName}
              </div>
            </div>

            {gameUrl && (
              <iframe
                key={iframeKey}
                className="game-launch-iframe"
                title={game.name}
                src={gameUrl}
                allow="autoplay; fullscreen; payment; clipboard-read; clipboard-write; camera; microphone; geolocation"
                allowFullScreen
                // @ts-ignore
                allowtransparency="true"
                onLoad={handleIframeLoaded}
                style={{
                  width: '100%',
                  height: '100%',
                  border: 'none',
                  backgroundColor: '#000000',
                  background: '#000000',
                  colorScheme: 'dark',
                  opacity: iframeLoaded ? 1 : 0,
                  transition: 'opacity 0.4s ease-in-out',
                  display: 'block',
                }}
              />
            )}
          </>
        )}
      </div>
    </div>,
    document.body
  )
}
