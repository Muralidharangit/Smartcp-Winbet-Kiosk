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
      <div className="kx-alert-backdrop winbet-modal-backdrop" style={{ zIndex: 110 }}>
        <form className="winbet-modal-card icon-gold animate-pop-in" onSubmit={submitGate}>
          <div className="winbet-modal-badge">
            <span className="modal-badge-num"><i className="fa-solid fa-lock" /></span>
            <span className="modal-badge-title">STAFF DIAGNOSTICS</span>
          </div>
          <div className="winbet-modal-icon-glow icon-gold">
            <i className="fa-solid fa-key" style={{ fontSize: '1.8rem', color: '#f5b300' }} />
          </div>
          <h2 className="winbet-modal-title title-gold">Hardware Test</h2>
          <p className="winbet-modal-desc">
            Staff password to run the cabinet checklist (printer, bill, scanner, permissions).
          </p>
          <input
            type="password"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            placeholder="Admin password"
            autoFocus
            autoComplete="current-password"
            className="winbet-modal-input"
          />
          {gateError ? <p className="winbet-error-msg">{gateError}</p> : null}
          <div className="winbet-modal-actions" style={{ marginTop: 20 }}>
            <button type="submit" className="btn-winbet-modal-primary" disabled={!password.trim()}>
              <i className="fa-solid fa-unlock me-1.5" /> Unlock
            </button>
            <button type="button" className="btn-winbet-modal-secondary" onClick={() => setGateOpen(false)}>
              Cancel
            </button>
          </div>
        </form>
      </div>
    )
  }

  if (!unlocked) return null

  const failed = report?.checks.filter((c) => !c.ok).length ?? 0

  return (
    <div className="kx-alert-backdrop winbet-modal-backdrop" role="dialog" aria-label="Hardware test" style={{ zIndex: 110 }}>
      <div className="winbet-modal-card hw-diag-modal animate-pop-in">
        {/* Top Header Bar */}
        <div className="hw-diag-top-bar">
          <div className="winbet-modal-badge mb-0">
            <span className="modal-badge-num"><i className="fa-solid fa-microchip" /></span>
            <span className="modal-badge-title">HARDWARE DIAGNOSTICS</span>
          </div>
          <button type="button" className="btn-diag-close" onClick={closeAll} title="Close Diagnostics">
            <i className="fa-solid fa-xmark" />
          </button>
        </div>

        {/* Modal Header */}
        <div className="hw-diag-header">
          <div className="hw-diag-icon-box">
            <i className="fa-solid fa-toolbox" />
          </div>
          <div className="hw-diag-title-wrap">
            <h2 className="hw-diag-title">CABINET HARDWARE TEST</h2>
            <div className="hw-diag-meta-row">
              <span className="hw-meta-tag">
                <i className="fa-brands fa-linux me-1" /> {report?.os || 'Linux'}
              </span>
              <span className="hw-meta-tag">
                <i className="fa-solid fa-user me-1" /> {report?.user || 'sys-0743'}
              </span>
              <span className={`hw-status-tag ${failed === 0 ? 'is-pass' : 'is-fail'}`}>
                <i className={`fa-solid ${failed === 0 ? 'fa-circle-check' : 'fa-circle-exclamation'} me-1`} />
                {failed === 0 ? '0 FAIL • ALL PASS' : `${failed} FAIL`}
              </span>
            </div>
          </div>
        </div>

        <div className="hw-diag-hint-box">
          <i className="fa-solid fa-circle-info text-cyan me-1.5" />
          <span>Press <kbd>Ctrl+Shift+D</kbd> to toggle • Live cash-in and ticket-in are paused while open.</span>
        </div>

        {listenHint ? (
          <div className="hw-diag-live-status is-listening">
            <i className="fa-solid fa-spinner fa-spin me-2" />
            <span>{listenHint}</span>
          </div>
        ) : null}

        {action ? (
          <div className={`hw-diag-live-status ${action.toLowerCase().includes('ok') ? 'is-success' : 'is-error'}`}>
            <i className={`fa-solid ${action.toLowerCase().includes('ok') ? 'fa-circle-check' : 'fa-triangle-exclamation'} me-2`} />
            <span>{action}</span>
          </div>
        ) : null}

        {/* Diagnostic Checks List */}
        <div className="hw-diag-checks-container">
          <div className="hw-diag-checks-grid">
            {(report?.checks ?? []).map((c) => (
              <div key={c.id} className={`hw-check-card ${c.ok ? 'is-pass' : 'is-fail'}`}>
                <div className="hw-check-badge">
                  {c.ok ? (
                    <><i className="fa-solid fa-check me-1" /> PASS</>
                  ) : (
                    <><i className="fa-solid fa-xmark me-1" /> FAIL</>
                  )}
                </div>
                <div className="hw-check-info">
                  <span className="hw-check-name">{c.name}</span>
                  <span className="hw-check-detail">{c.detail}</span>
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Actions Button Grid */}
        <div className="hw-diag-actions-section">
          <span className="hw-actions-label">
            <i className="fa-solid fa-bolt text-warning me-1.5" /> TRIGGER HARDWARE TESTS
          </span>
          <div className="hw-diag-btn-grid">
            <button
              type="button"
              className="btn-diag-action btn-diag-recheck"
              disabled={busy}
              onClick={() => void refresh()}
            >
              <i className="fa-solid fa-arrows-rotate me-1.5" /> Re-check
            </button>
            <button
              type="button"
              className="btn-diag-action btn-diag-print"
              disabled={busy}
              onClick={() => void runPrint()}
            >
              <i className="fa-solid fa-print me-1.5" /> Print Test
            </button>
            <button
              type="button"
              className="btn-diag-action btn-diag-scan"
              disabled={busy}
              onClick={runScan}
            >
              <i className="fa-solid fa-barcode me-1.5" /> Scan Test
            </button>
            <button
              type="button"
              className="btn-diag-action btn-diag-bill"
              disabled={busy}
              onClick={runBill}
            >
              <i className="fa-solid fa-money-bill-wave me-1.5" /> Bill Test
            </button>
          </div>
        </div>
      </div>
    </div>
  )
}
