import { useEffect, useState, type FormEvent } from 'react'
import { isHardwareSimulatorEnabled } from '../config/env'
import { downloadDemoTicket, type DemoTicket } from '../lib/demoTicket'
import { formatCurrency } from '../api/client'

const NOTES = [10, 20, 50, 100]
const LAB_PASSWORD = 'admin123'

type Props = {
  balance: number
  currencySymbol: string
  kioskName: string
  adminPassword?: string
  onBillIn: (amount: number) => Promise<boolean>
  onTicketIn: (barcode: string) => Promise<boolean>
  onCashOut: (simulatePrintFail: boolean) => Promise<DemoTicket | null>
}

export function HardwareLabPanel({
  balance,
  currencySymbol,
  kioskName,
  adminPassword = LAB_PASSWORD,
  onBillIn,
  onTicketIn,
  onCashOut,
}: Props) {
  const enabled = isHardwareSimulatorEnabled()
  const [gateOpen, setGateOpen] = useState(false)
  const [unlocked, setUnlocked] = useState(false)
  const [collapsed, setCollapsed] = useState(false)
  const [password, setPassword] = useState('')
  const [gateError, setGateError] = useState<string | null>(null)
  const [busy, setBusy] = useState(false)
  const [status, setStatus] = useState<string | null>(null)
  const [customAmount, setCustomAmount] = useState('')
  const [barcode, setBarcode] = useState('')
  const [printFail, setPrintFail] = useState(false)
  const [history, setHistory] = useState<DemoTicket[]>([])

  useEffect(() => {
    if (!enabled) return

    function onKeyDown(e: KeyboardEvent) {
      const labKey = e.key === 'H' || e.key === 'h' || e.key === 'L' || e.key === 'l'
      if (!(e.ctrlKey && e.shiftKey && labKey)) return
      e.preventDefault()
      e.stopPropagation()
      if (unlocked) {
        setCollapsed((wasCollapsed) => !wasCollapsed)
        return
      }
      setGateOpen(true)
      setPassword('')
      setGateError(null)
    }

    window.addEventListener('keydown', onKeyDown, true)
    return () => window.removeEventListener('keydown', onKeyDown, true)
  }, [enabled, unlocked])

  if (!enabled) return null

  function submitGate(e: FormEvent) {
    e.preventDefault()
    if (password.trim() === adminPassword.trim()) {
      setUnlocked(true)
      setCollapsed(false)
      setGateOpen(false)
      setPassword('')
      setGateError(null)
      return
    }
    setGateError('Wrong password')
  }

  async function run(label: string, work: () => Promise<boolean | DemoTicket | null>) {
    if (busy) return
    setBusy(true)
    setStatus(null)
    try {
      const result = await work()
      if (result === false) {
        setStatus('Failed — see the kiosk alert')
      } else if (result && typeof result === 'object' && result.barcode) {
        setHistory((prev) => [result, ...prev.filter((t) => t.barcode !== result.barcode)].slice(0, 8))
        setStatus(`Ticket ${result.barcode}`)
      } else if (printFail && result == null) {
        setStatus('Print fail — see kiosk alert')
      } else {
        setStatus(label)
      }
    } finally {
      setBusy(false)
    }
  }

  async function billIn(amount: number) {
    await run(`Cash in ${currencySymbol}${amount}`, () => onBillIn(amount))
  }

  const panelOpen = unlocked && !collapsed

  return (
    <>
      {gateOpen && !unlocked ? (
        <div className="pending-overlay" style={{ zIndex: 110 }}>
          <form className="pending-card" onSubmit={submitGate}>
            <h2>Hardware Lab</h2>
            <p className="cashout-hint">Staff password to open the demo overlay (no real hardware).</p>
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
                Open lab
              </button>
            </div>
          </form>
        </div>
      ) : null}

      {unlocked && collapsed ? (
        <button type="button" className="hw-lab-tab" onClick={() => setCollapsed(false)}>
          Lab
        </button>
      ) : null}

      {!unlocked && !gateOpen ? (
        <button type="button" className="hw-lab-tab" onClick={() => setGateOpen(true)}>
          Lab
        </button>
      ) : null}

      {panelOpen ? (
        <aside className="hw-lab-dock" aria-label="Hardware Lab">
          <header className="hw-lab-head">
            <div>
              <strong>Hardware Lab</strong>
              <span>Demo devices · {kioskName}</span>
            </div>
            <button type="button" className="hw-lab-hide" onClick={() => setCollapsed(true)}>
              Hide
            </button>
          </header>

          <p className="hw-lab-balance">
            Credit {formatCurrency(balance)}
          </p>

          <p className="hw-lab-label">Bill acceptor</p>
          <div className="bill-sim-row">
            {NOTES.map((n) => (
              <button
                key={n}
                type="button"
                className="kx-btn kx-btn-primary kx-btn-sm bill-sim-btn"
                disabled={busy}
                onClick={() => void billIn(n)}
              >
                {currencySymbol}
                {n}
              </button>
            ))}
          </div>
          <form
            className="ticket-scan-form"
            onSubmit={(e) => {
              e.preventDefault()
              const amount = Number(customAmount)
              if (!Number.isFinite(amount) || amount < 1) return
              void billIn(amount)
            }}
          >
            <input
              type="number"
              min={1}
              step="1"
              placeholder="Custom amount"
              value={customAmount}
              disabled={busy}
              onChange={(e) => setCustomAmount(e.target.value)}
            />
            <button type="submit" className="kx-btn kx-btn-ghost kx-btn-sm" disabled={busy}>
              Cash in
            </button>
          </form>

          <p className="hw-lab-label">Scanner</p>
          <form
            className="ticket-scan-form"
            onSubmit={(e) => {
              e.preventDefault()
              const code = barcode.trim().toUpperCase()
              if (!code) return
              void run(`Ticket in ${code}`, () => onTicketIn(code))
            }}
          >
            <input
              value={barcode}
              disabled={busy}
              placeholder="Paste ticket barcode"
              autoCapitalize="characters"
              onChange={(e) => setBarcode(e.target.value)}
            />
            <button type="submit" className="kx-btn kx-btn-ghost kx-btn-sm" disabled={busy || !barcode.trim()}>
              Scan
            </button>
          </form>

          <p className="hw-lab-label">Printer</p>
          <label className="hw-lab-check">
            <input
              type="checkbox"
              checked={printFail}
              disabled={busy}
              onChange={(e) => setPrintFail(e.target.checked)}
            />
            Simulate print failed
          </label>
          <button
            type="button"
            className="kx-btn kx-btn-primary kx-btn-sm kx-btn-block"
            disabled={busy || balance <= 0}
            onClick={() => void run('Cash out', () => onCashOut(printFail))}
          >
            {printFail ? 'Cash out (print fail)' : 'Cash out · download ticket'}
          </button>

          {history.length > 0 ? (
            <ul className="hw-lab-tickets">
              {history.map((ticket) => (
                <li key={ticket.barcode}>
                  <code>{ticket.barcode}</code>
                  <span>
                    {ticket.currencySymbol}
                    {ticket.amount.toFixed(2)}
                  </span>
                  <button
                    type="button"
                    onClick={() => void navigator.clipboard.writeText(ticket.barcode)}
                  >
                    Copy
                  </button>
                  <button type="button" onClick={() => downloadDemoTicket(ticket)}>
                    File
                  </button>
                </li>
              ))}
            </ul>
          ) : null}

          {status ? <p className="hw-lab-status">{status}</p> : null}
          <p className="bill-sim-note">Click Lab, or Ctrl+Shift+L / Ctrl+Shift+H. Off unless VITE_HW_SIMULATOR=true.</p>
        </aside>
      ) : null}
    </>
  )
}
