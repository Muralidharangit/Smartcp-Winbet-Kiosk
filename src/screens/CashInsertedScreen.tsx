import { useEffect, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { useMachine } from '../services/sessionStore'

export default function CashInsertedScreen() {
  const navigate = useNavigate()
  const { balance, config, lastCashAmount, creditSource, lastTicketCode } = useMachine()
  const [secondsLeft, setSecondsLeft] = useState(5)

  useEffect(() => {
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
  }, [navigate])

  const symbol = config?.CurrencySymbol ?? 'N$'
  const fromTicket = creditSource === 'ticket'
  const amount = lastCashAmount ?? 0
  const modalCode = fromTicket ? '09' : '08'
  const modalBadgeTitle = fromTicket ? 'Ticket Voucher In' : 'Bill Acceptor'

  return (
    <div className="kx-alert-backdrop winbet-modal-backdrop" role="presentation">
      <div
        className="winbet-modal-card icon-gold animate-pop-in cash-success-modal"
        role="alertdialog"
        aria-modal="true"
        style={{ maxWidth: 480, width: '92vw' }}
        onClick={(e) => e.stopPropagation()}
      >
        {/* Top Capsule Badge */}
        <div className="winbet-modal-badge">
          <span className="modal-badge-num">{modalCode}</span>
          <span className="modal-badge-title">{modalBadgeTitle}</span>
          <span className="modal-badge-status-pill">
            <span className="smart-pc-online-dot" /> LIVE CREDITED
          </span>
        </div>

        {/* Glowing Circular Icon */}
        <div className="winbet-modal-icon-glow icon-gold cash-icon-glow">
          <span className="modal-icon-symbol">
            {fromTicket ? (
              <i className="fa-solid fa-ticket" />
            ) : (
              <i className="fa-solid fa-money-bill-1-wave" />
            )}
          </span>
        </div>

        {/* Title & Hero Amount */}
        <h2 className="winbet-modal-title title-gold">
          {fromTicket ? 'Ticket Voucher Accepted' : 'Currency Note Accepted'}
        </h2>

        <div className="deposited-amount-hero my-2">
          <span className="curr">+{symbol}</span>
          <span className="amt">{amount.toFixed(2)}</span>
        </div>

        {/* Recessed Summary Box */}
        <div className="winbet-modal-recessed-box cash-recessed-box">
          <div className="recessed-row">
            <span className="recessed-label">
              <i className="fa-solid fa-circle-check text-warning me-1.5" /> Accepted Amount:
            </span>
            <span className="recessed-value status-highlight">
              +{symbol} {amount.toFixed(2)}
            </span>
          </div>

          <div className="recessed-row">
            <span className="recessed-label">
              <i className="fa-solid fa-coins text-cyan me-1.5" /> Updated Machine Balance:
            </span>
            <span className="recessed-value balance-highlight">
              {symbol} {balance.toFixed(2)}
            </span>
          </div>

          {fromTicket && lastTicketCode ? (
            <div className="recessed-row">
              <span className="recessed-label">
                <i className="fa-solid fa-barcode text-muted me-1.5" /> Voucher Barcode:
              </span>
              <span className="recessed-value font-mono">{lastTicketCode}</span>
            </div>
          ) : null}

          <div className="recessed-row">
            <span className="recessed-label">
              <i className="fa-solid fa-shield-halved text-success me-1.5" /> Session Status:
            </span>
            <span className="recessed-value status-ready">
              <span className="smart-pc-online-dot" /> Ready to Play
            </span>
          </div>
        </div>

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
        <div className="cash-modal-countdown">
          <span>Entering games lobby automatically in {secondsLeft}s</span>
          <div className="countdown-bar-track">
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

