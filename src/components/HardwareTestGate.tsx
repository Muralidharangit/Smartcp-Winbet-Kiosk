import { useEffect, useState, type FormEvent } from 'react'
import {
  diagnoseHardware,
  fetchHwConfig,
  onNoteAccepted,
  printTestTicket,
  type DiagnoseReport,
} from '../lib/hardware'
import { createBarcodeListener } from '../hardware/barcodeBridge'
import { isTauriApp } from '../lib/storage'
import { useMachine } from '../services/sessionStore'

const STAFF_PASSWORD_FALLBACK = 'admin123'

/**
 * Ctrl+Shift+D → staff password → hardware install checklist.
 * Does not require VITE_HW_SIMULATOR. Live bill/ticket credit is paused while open.
 */
export function HardwareTestGate() {
  const setInstallTestActive = useMachine((s) => s.setInstallTestActive)
  const [gateOpen, setGateOpen] = useState(false)
  const [unlocked, setUnlocked] = useState(false)
  const [password, setPassword] = useState('')
  const [gateError, setGateError] = useState<string | null>(null)
  const [expectedPassword, setExpectedPassword] = useState(STAFF_PASSWORD_FALLBACK)
  const [report, setReport] = useState<DiagnoseReport | null>(null)
  const [busy, setBusy] = useState(false)
  const [action, setAction] = useState<string | null>(null)
  const [listenHint, setListenHint] = useState<string | null>(null)

  useEffect(() => {
    if (!isTauriApp()) return
    void fetchHwConfig().then((cfg) => {
      if (cfg?.AdminPassword) setExpectedPassword(cfg.AdminPassword)
    })
    function onKeyDown(e: KeyboardEvent) {
      if (e.ctrlKey && e.shiftKey && (e.key === 'D' || e.key === 'd')) {
        e.preventDefault()
        e.stopPropagation()
        setGateOpen(true)
        setPassword('')
        setGateError(null)
      }
    }
    window.addEventListener('keydown', onKeyDown, true)
    return () => window.removeEventListener('keydown', onKeyDown, true)
  }, [])

  useEffect(() => {
    setInstallTestActive(unlocked)
    return () => setInstallTestActive(false)
  }, [unlocked, setInstallTestActive])

  useEffect(() => {
    if (!unlocked) return
    void refresh()
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [unlocked])

  async function refresh() {
    if (!isTauriApp()) {
      setAction('Hardware test only works in the Tauri kiosk app (npm run tauri:dev).')
      return
    }
    setBusy(true)
    setAction(null)
    try {
      const next = await diagnoseHardware()
      setReport(next)
    } catch (err) {
      setAction(err instanceof Error ? err.message : String(err))
    } finally {
      setBusy(false)
    }
  }

  function closeAll() {
    setUnlocked(false)
    setGateOpen(false)
    setPassword('')
    setListenHint(null)
    setInstallTestActive(false)
  }

  function submitGate(e: FormEvent) {
    e.preventDefault()
    if (password.trim() === expectedPassword.trim()) {
      setUnlocked(true)
      setGateOpen(false)
      setPassword('')
      setGateError(null)
      return
    }
    setGateError('Wrong password')
  }

  async function runPrint() {
    setBusy(true)
    setAction(null)
    try {
      await printTestTicket()
      setAction('Test slip sent to the Epson. Confirm paper came out.')
    } catch (err) {
      setAction(err instanceof Error ? err.message : String(err))
    } finally {
      setBusy(false)
    }
  }

  function runScan() {
    setListenHint('Scan any barcode now (15s)…')
    setAction(null)
    const stop = createBarcodeListener((code) => {
      stop()
      window.clearTimeout(timer)
      setListenHint(null)
      setAction(`Scanner OK — captured ${code}`)
    })
    const timer = window.setTimeout(() => {
      stop()
      setListenHint(null)
      setAction('No scan in 15s. Click the kiosk window, then Scan test again.')
    }, 15000)
  }

  function runBill() {
    if (!isTauriApp()) {
      setAction('Bill test only works in the Tauri app.')
      return
    }
    setListenHint('Insert one NAD note (25s). Credit is not applied.')
    setAction(null)
    let unlisten: (() => void) | undefined
    const timer = window.setTimeout(() => {
      unlisten?.()
      setListenHint(null)
      setAction('No note in 25s. Check GBA cable, 24V, and dialout group.')
    }, 25000)
    void onNoteAccepted((payload) => {
      window.clearTimeout(timer)
      unlisten?.()
      setListenHint(null)
      setAction(`Bill acceptor OK — ${payload.currency} ${payload.amount} (not credited)`)
    }).then((u) => {
      unlisten = u
    })
  }

  if (gateOpen && !unlocked) {
    return (
      <div className="pending-overlay" style={{ zIndex: 105 }}>
        <form className="pending-card" onSubmit={submitGate}>
          <h2>Hardware test</h2>
          <p className="cashout-hint">Staff password to run the new-device checklist (printer, bill, scanner, permissions).</p>
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
          {gateError ? (
            <p className="error-text" style={{ marginTop: 10 }}>
              {gateError}
            </p>
          ) : null}
          <div className="kx-cta-row" style={{ marginTop: 20, display: 'flex', gap: 10, justifyContent: 'center' }}>
            <button type="button" className="kx-btn kx-btn-ghost kx-btn-sm" onClick={() => setGateOpen(false)}>
              Cancel
            </button>
            <button type="submit" className="kx-btn kx-btn-primary kx-btn-sm" disabled={!password.trim()}>
              Open
            </button>
          </div>
        </form>
      </div>
    )
  }

  if (!unlocked) return null

  const failed = report?.checks.filter((c) => !c.ok).length ?? 0

  return (
    <div className="hw-test-overlay" role="dialog" aria-label="Hardware test">
      <aside className="hw-test-panel">
        <header className="hw-lab-head">
          <div>
            <strong>Hardware test</strong>
            <span>
              {report
                ? `${report.os} · ${report.user || 'user'} · ${failed} fail`
                : 'New cabinet checklist'}
            </span>
          </div>
          <button type="button" className="hw-lab-hide" onClick={closeAll}>
            Close
          </button>
        </header>

        <p className="hw-test-hint">Ctrl+Shift+D. Live cash-in and ticket-in are paused while this is open.</p>

        {listenHint ? <p className="hw-lab-status">{listenHint}</p> : null}
        {action ? <p className={action.toLowerCase().includes('ok') ? 'hw-lab-status' : 'error-text'}>{action}</p> : null}

        <ul className="hw-test-list">
          {(report?.checks ?? []).map((c) => (
            <li key={c.id} className={c.ok ? 'hw-test-pass' : 'hw-test-fail'}>
              <strong>{c.ok ? 'PASS' : 'FAIL'}</strong>
              <span>
                {c.name}
                <small>{c.detail}</small>
              </span>
            </li>
          ))}
        </ul>

        <p className="hw-lab-label">Trigger tests</p>
        <div className="hw-test-actions">
          <button type="button" className="kx-btn kx-btn-ghost kx-btn-sm" disabled={busy} onClick={() => void refresh()}>
            Re-check
          </button>
          <button type="button" className="kx-btn kx-btn-primary kx-btn-sm" disabled={busy} onClick={() => void runPrint()}>
            Print test
          </button>
          <button type="button" className="kx-btn kx-btn-primary kx-btn-sm" disabled={busy} onClick={runScan}>
            Scan test
          </button>
          <button type="button" className="kx-btn kx-btn-primary kx-btn-sm" disabled={busy} onClick={runBill}>
            Bill test
          </button>
        </div>
      </aside>
    </div>
  )
}
