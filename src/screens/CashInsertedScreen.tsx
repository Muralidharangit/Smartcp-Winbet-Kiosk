import { useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import { useMachine } from '../services/sessionStore'

export default function CashInsertedScreen() {
  const navigate = useNavigate()
  const { balance, config, lastCashAmount, creditSource, lastTicketCode } = useMachine()

  useEffect(() => {
    const t = setTimeout(() => navigate('/play'), 5000)
    return () => clearTimeout(t)
  }, [navigate])

  const symbol = config?.CurrencySymbol ?? 'N$'
  const fromTicket = creditSource === 'ticket'
  const amount = lastCashAmount ?? 0

  return (
    <div className="screen screen--arena-fit">
      <div className="success-shell success-shell--fit">
        <div className="success-card kx-result-card kx-result-card--compact">
          <div className="kx-result-badge kx-result-badge-ok" aria-hidden>
            ✓
          </div>
          <p className="eyebrow">{fromTicket ? 'Ticket accepted' : 'Cash accepted'}</p>
          <h1>{fromTicket ? 'Credit loaded' : 'Credit added'}</h1>
          <p className="big-plus">
            +{symbol}
            {amount.toFixed(2)}
          </p>
          <p className="muted">
            Available balance{' '}
            <strong>
              {symbol}
              {balance.toFixed(2)}
            </strong>
          </p>
          {fromTicket && lastTicketCode ? (
            <p className="kx-result-meta">Ticket {lastTicketCode}</p>
          ) : (
            <p className="kx-result-meta">You can play now — no receipt is printed for cash-in.</p>
          )}
          <div className="kx-cta-row" style={{ marginTop: 16 }}>
            <button type="button" className="kx-btn kx-btn-primary" onClick={() => navigate('/play')}>
              Enter games
            </button>
            <button type="button" className="kx-btn kx-btn-ghost" onClick={() => navigate('/home')}>
              Home
            </button>
          </div>
        </div>
      </div>
    </div>
  )
}
