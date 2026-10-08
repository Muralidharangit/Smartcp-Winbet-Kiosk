import { useNavigate } from 'react-router-dom'
import { useMachine } from '../services/sessionStore'

export default function CashOutScreen() {
  const navigate = useNavigate()
  const { config, lastTicketCode, lastCashAmount, printerWarning } = useMachine()
  const symbol = config?.CurrencySymbol ?? 'N$'
  const amount = lastCashAmount ?? 0

  return (
    <div className="cash-inserted-fullscreen-overlay">
      <div className="cashout-modal-card animate-pop-in" style={{ textAlign: 'center' }}>
        <div className="winbet-modal-badge" style={{ marginBottom: 12 }}>
          <span className="modal-badge-num">04</span>
          <span className="modal-badge-title">Cash-Out Voucher</span>
        </div>

        <div className="cash-icon-glow">🖨</div>
        <h1 className="winbet-modal-title title-gold" style={{ marginTop: 8 }}>Cash Out Complete</h1>
        <p className="winbet-modal-desc">
          Take the printed voucher ticket below. Scan it on any terminal or redeem at the cashier desk.
        </p>

        {/* Realistic Ticket Paper Display */}
        <div className="receipt-paper" style={{ maxWidth: 360, margin: '16px auto' }}>
          <div className="receipt-header">
            <div className="receipt-logo">WINBET KIOSK TICKET</div>
            <div style={{ fontSize: 11, color: '#444', margin: '4px 0' }}>{config?.Terminal_ID || 'TERMINAL-001'}</div>
          </div>
          <div className="receipt-amount-box" style={{ margin: '12px 0' }}>
            <div style={{ fontSize: 12, textTransform: 'uppercase', color: '#666' }}>Payable Amount</div>
            <div className="amt">{symbol} {amount.toFixed(2)}</div>
          </div>
          <div className="receipt-barcode-box">
            <div style={{ letterSpacing: 4, fontSize: 18, fontFamily: 'monospace', fontWeight: 900 }}>
              ||| | |||| | ||| |||| |
            </div>
            <div className="barcode-code-text">{lastTicketCode || 'PRINTING…'}</div>
          </div>
        </div>

        {printerWarning ? (
          <p className="winbet-error-msg" style={{ margin: '12px auto', maxWidth: 400 }}>
            {printerWarning}
          </p>
        ) : null}

        <p className="muted" style={{ fontSize: '0.85rem', color: 'var(--text-muted)', marginBottom: 16 }}>
          Terminal machine balance is now <strong>{symbol} 0.00</strong>
        </p>

        <div className="winbet-modal-actions" style={{ width: '100%' }}>
          <button
            type="button"
            className="btn-winbet-modal-primary"
            style={{ width: '100%', maxWidth: 360, margin: '0 auto' }}
            onClick={() => navigate('/home')}
          >
            ✓ RETURN TO LOBBY
          </button>
        </div>
      </div>
    </div>
  )
}
