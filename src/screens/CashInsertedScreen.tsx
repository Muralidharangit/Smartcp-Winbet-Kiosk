import { useEffect, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { useMachine } from '../services/sessionStore'

export default function CashInsertedScreen() {
  const navigate = useNavigate()
  const { balance, config, lastCashAmount, creditSource, lastTicketCode } = useMachine()
  const [secondsLeft, setSecondsLeft] = useState(5)

  useEffect(() => {
    setSecondsLeft(5)
    const timer = setInterval(() => {
      setSecondsLeft((prev) => {
        if (prev <= 1) {
          clearInterval(timer)
          navigate('/play')
          return 0
        }
        return prev - 1
      })
    }, 1000)
    return () => clearInterval(timer)
  }, [navigate, lastCashAmount, lastTicketCode, balance])

  const symbol = config?.CurrencySymbol ?? 'N$'
  const fromTicket = creditSource === 'ticket'
  const rawAmt = lastCashAmount ?? 0
  const amount = typeof rawAmt === 'number' && Number.isFinite(rawAmt) ? rawAmt : parseFloat(String(rawAmt || 0)) || 0
  const rawBal = balance ?? 0
  const numBalance = typeof rawBal === 'number' && Number.isFinite(rawBal) ? rawBal : parseFloat(String(rawBal || 0)) || 0
  const displayAmount = amount > 0 ? amount : (numBalance > 0 ? numBalance : 0)
  const modalCode = fromTicket ? '09' : '08'
  const modalBadgeTitle = fromTicket ? 'Ticket Voucher In' : 'Bill Acceptor'
  const modalTitle = fromTicket ? 'VOUCHER TICKET CREDITED' : 'CASH LOADED SUCCESSFULLY'

  return (
    <div className="kx-alert-backdrop winbet-modal-backdrop" role="presentation">
      <div
        className="winbet-modal-card icon-gold animate-pop-in cash-success-modal"
        role="alertdialog"
        aria-modal="true"
        style={{ maxWidth: 480, width: '92vw', textAlign: 'center' }}
        onClick={(e) => e.stopPropagation()}
      >
        {/* Top Capsule Badge */}
        <div className="winbet-modal-badge" style={{ margin: '0 auto 14px auto' }}>
          <span className="modal-badge-num">{modalCode}</span>
          <span className="modal-badge-title">{modalBadgeTitle}</span>
          
        </div>

        {/* Glowing Circular Icon */}
        <div className="winbet-modal-icon-glow icon-gold cash-icon-glow" style={{ margin: '0 auto 12px auto' }}>
          <span className="modal-icon-symbol">
            {fromTicket ? (
              <i className="fa-solid fa-ticket" />
            ) : (
              <i className="fa-solid fa-money-bill-1-wave" />
            )}
          </span>
        </div>

        {/* Title & Hero Amount */}
        <h2 className="winbet-modal-title title-gold" style={{ textAlign: 'center', marginBottom: 4 }}>
          {modalTitle}
        </h2>

        <div className="deposited-amount-hero my-2" style={{ justifyContent: 'center', textAlign: 'center' }}>
          <span className="curr">+{symbol}</span>
          <span className="amt">{displayAmount.toFixed(2)}</span>
        </div>

        {/* Recessed Summary Box */}
       

        {/* Modal Action Buttons */}
        <div className="winbet-modal-actions">
          <button
            type="button"
            className="btn-winbet-modal-primary btn-play-now"
            onClick={() => navigate('/play')}
          >
            <span>PLAY GAMES ›</span>
          </button>
          <button
            type="button"
            className="btn-winbet-modal-secondary"
            onClick={() => navigate('/home')}
          >
            ✕ Lobby Home
          </button>
        </div>

        {/* Countdown Auto-Forward Bar */}
        <div className="cash-modal-countdown" style={{ textAlign: 'center' }}>
          <span>Entering games lobby automatically in {secondsLeft}s</span>
          <div className="countdown-bar-track" style={{ margin: '8px auto 0 auto' }}>
            <div
              className="countdown-bar-fill"
              style={{ width: `${(secondsLeft / 5) * 100}%` }}
            />
          </div>
        </div>
      </div>
    </div>
  )
}

