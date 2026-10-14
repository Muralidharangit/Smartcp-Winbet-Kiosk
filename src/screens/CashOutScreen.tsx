import { useNavigate } from 'react-router-dom'
import { useMachine } from '../services/sessionStore'

export default function CashOutScreen() {
  const navigate = useNavigate()
  const { config, lastTicketCode, lastCashAmount, printerWarning } = useMachine()
  const symbol = config?.CurrencySymbol ?? 'N$'
  const amount = lastCashAmount ?? 0

  return (
    <div className="cash-inserted-fullscreen-overlay">
      <div className="winbet-modal-card animate-pop-in">
        {/* Glowing Circular Icon */}
        <div className="winbet-modal-icon-glow icon-gold" style={{ margin: '0 auto 12px auto' }}>
          <span className="modal-icon-symbol">🖨</span>
        </div>
        
        <h1 className="winbet-modal-title title-gold" style={{ marginTop: 8 }}>Cash Out Complete</h1>
        <p className="winbet-modal-desc">
          Take the printed voucher ticket below. Scan it on any terminal or redeem at the cashier desk.
        </p>

        {/* Realistic Theme-Friendly Digital Ticket Display */}
        <div className="premium-digital-ticket">
          <div className="ticket-header">
            <div className="ticket-logo">BETWISE TERMINAL TICKET</div>
            <div className="ticket-terminal">{config?.Terminal_ID || 'TERMINAL-001'}</div>
          </div>
          
          <div className="ticket-amount-box">
            <div className="ticket-label">Payable Amount</div>
            <div className="ticket-amt title-gold">{symbol} {amount.toFixed(2)}</div>
          </div>
          
          <div className="ticket-barcode-box">
            <div className="digital-barcode">
              |||| |||| |||| || 
            </div>
            <div className="barcode-code-text title-cyan">{lastTicketCode || 'PRINTING…'}</div>
          </div>
        </div>

        {printerWarning ? (
          <p className="winbet-error-msg" style={{ margin: '12px auto', maxWidth: 400 }}>
            {printerWarning}
          </p>
        ) : null}

        <p className="muted" style={{ fontSize: '0.85rem', color: '#94a3b8', marginBottom: 16 }}>
          Terminal machine balance is now <strong>{symbol} 0.00</strong>
        </p>

        <div className="winbet-modal-actions" style={{ width: '100%' }}>
          <button
            type="button"
            className="btn-winbet-modal-primary icon-gold"
            onClick={() => navigate('/home')}
          >
            ✓ RETURN TO LOBBY
          </button>
        </div>
      </div>
    </div>
  )
}
