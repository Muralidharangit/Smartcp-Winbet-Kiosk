import { useNavigate } from 'react-router-dom'
import { useMachine } from '../services/sessionStore'

export default function CashOutScreen() {
  const navigate = useNavigate()
  const { config, lastTicketCode, lastCashAmount, printerWarning } = useMachine()
  const symbol = config?.CurrencySymbol ?? 'N$'
  const amount = lastCashAmount ?? 0

  return (
    <div className="screen screen--arena-fit">
      <div className="success-shell success-shell--fit">
        <div className="success-card kx-result-card kx-result-card--compact">
          <div className="kx-result-badge kx-result-badge-gold" aria-hidden>
            ★
          </div>
          <p className="eyebrow">Cash out complete</p>
          <h1>Your ticket is ready</h1>
          <p className="big-plus" style={{ color: 'var(--gold)' }}>
            {symbol}
            {amount.toFixed(2)}
          </p>
          <p className="muted">Take the printed ticket. Scan it on a Terminal in this shop, or take it to the cashier.</p>

          <div className="kx-ticket-panel">
            <span className="kx-ticket-label">Ticket number</span>
            <div className="ticket-box">{lastTicketCode || 'Printing…'}</div>
          </div>

          {printerWarning ? (
            <p className="kx-result-meta" style={{ color: 'var(--warn, #fbbf24)' }}>
              {printerWarning}
            </p>
          ) : null}

          <p className="muted" style={{ marginTop: 8 }}>
            Machine balance is now {symbol}0.00
          </p>
          <div className="kx-cta-row" style={{ marginTop: 16 }}>
            <button type="button" className="kx-btn kx-btn-primary" onClick={() => navigate('/home')}>
              Done
            </button>
          </div>
        </div>
      </div>
    </div>
  )
}
