import { useEffect, useState, type FormEvent } from 'react'
import { invoke } from '@tauri-apps/api/core'
import { isTauriApp } from '../lib/storage'

/**
 * Ctrl+Shift+K → staff password → leave fullscreen kiosk mode.
 * Password comes from config.json AdminPassword (default admin123).
 */
export function StaffExitGate() {
  const [open, setOpen] = useState(false)
  const [password, setPassword] = useState('')
  const [error, setError] = useState<string | null>(null)
  const [busy, setBusy] = useState(false)

  useEffect(() => {
    if (!isTauriApp()) return

    void invoke('enter_kiosk_mode').catch(() => undefined)

    function onKeyDown(e: KeyboardEvent) {
      if (e.ctrlKey && e.shiftKey && (e.key === 'K' || e.key === 'k')) {
        e.preventDefault()
        e.stopPropagation()
        setOpen(true)
        setPassword('')
        setError(null)
      }
    }

    window.addEventListener('keydown', onKeyDown, true)
    return () => window.removeEventListener('keydown', onKeyDown, true)
  }, [])

  async function submit(e: FormEvent) {
    e.preventDefault()
    if (!password.trim() || busy) return
    setBusy(true)
    setError(null)
    try {
      await invoke('exit_kiosk_mode', { password })
      setOpen(false)
      setPassword('')
    } catch (err) {
      setError(err instanceof Error ? err.message : String(err))
    } finally {
      setBusy(false)
    }
  }

  if (!open) return null

  return (
    <div className="pending-overlay" style={{ zIndex: 100 }}>
      <form className="pending-card" onSubmit={(e) => void submit(e)}>
        <h2>Staff exit</h2>
        <p className="cashout-hint">Enter admin password to leave fullscreen kiosk mode.</p>
        <input
          type="password"
          value={password}
          onChange={(e) => setPassword(e.target.value)}
          placeholder="Admin password"
          autoFocus
          autoComplete="current-password"
          style={{
            width: '100%',
            marginTop: 16,
            padding: '0.75rem 1rem',
            borderRadius: 10,
            border: '1px solid rgba(148,163,184,0.35)',
            background: 'rgba(15,23,42,0.8)',
            color: '#f8fafc',
            fontSize: '1.05rem',
          }}
        />
        {error ? (
          <p className="error-text" style={{ marginTop: 10 }}>
            {error}
          </p>
        ) : null}
        <div className="kx-cta-row" style={{ marginTop: 20, display: 'flex', gap: 10, justifyContent: 'center' }}>
          <button type="button" className="kx-btn kx-btn-ghost" onClick={() => setOpen(false)} disabled={busy}>
            Cancel
          </button>
          <button type="submit" className="kx-btn kx-btn-primary" disabled={busy || !password.trim()}>
            {busy ? 'Checking…' : 'Exit kiosk'}
          </button>
        </div>
      </form>
    </div>
  )
}
