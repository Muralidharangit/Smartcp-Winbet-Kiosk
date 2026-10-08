import { useEffect, useState } from 'react';
import { loadTerminal } from '../lib/storage';
import { useMachine } from '../services/sessionStore';

type Props = {
  /** If dismissed by the user to look around, can be re-opened */
  onDismiss?: () => void;
};

export function ZeroBalanceModal({ onDismiss }: Props) {
  const { balance, config } = useMachine();
  const [dismissed, setDismissed] = useState(false);
  const stored = loadTerminal();
  const pcName = stored?.pcName || config?.PC_Name || config?.Terminal_ID || 'TERMINAL';
  const siteName = stored?.siteName || config?.Site_Name || 'WINBET SHOP';
  const symbol = config?.CurrencySymbol ?? 'N$';

  // Automatically reset dismissed state when balance is 0 or if balance changes
  useEffect(() => {
    if (balance > 0) {
      setDismissed(false);
    }
  }, [balance]);

  // When balance > 0 or user dismissed, don't show the modal
  if (balance > 0 || dismissed) {
    return null;
  }

  function handleDismiss() {
    setDismissed(true);
    onDismiss?.();
  }

  return (
    <div
      className="kx-alert-backdrop winbet-modal-backdrop zero-balance-backdrop"
      role="presentation"
    >
      <div
        className="winbet-modal-card icon-gold animate-pop-in"
        role="alertdialog"
        aria-modal="true"
        aria-labelledby="zero-bal-title"
        aria-describedby="zero-bal-desc"
        style={{ maxWidth: 480, width: '92vw' }}
        onClick={(e) => e.stopPropagation()}
      >
        {/* Top Badge */}
        <div className="winbet-modal-badge">
          <span className="modal-badge-num" style={{ background: '#f5b300', color: '#000' }}>
            00
          </span>
          <span className="modal-badge-title">Cashier & Credits Required</span>
        </div>

        {/* Center Glowing Gold Icon */}
        <div className="winbet-modal-icon-glow icon-gold">
          <span className="modal-icon-symbol">🪙</span>
        </div>

        {/* Heading & Subtext */}
        <h2 id="zero-bal-title" className="winbet-modal-title title-gold">
          PLEASE CONTACT CASHIER
        </h2>
        <p id="zero-bal-desc" className="winbet-modal-desc">
          Ask cashier to load coins, insert cash into the bill acceptor, or scan your credit ticket to start playing.
        </p>

        {/* Live Station & Balance Recessed Box */}
        <div className="winbet-modal-recessed-box" style={{ width: '100%', margin: '1rem 0' }}>
          <div className="recessed-row">
            <span className="recessed-label">Terminal ID:</span>
            <span className="recessed-value">{pcName}</span>
          </div>
          <div className="recessed-row">
            <span className="recessed-label">Shop Name:</span>
            <span className="recessed-value status-highlight">{siteName}</span>
          </div>
          <div className="recessed-row">
            <span className="recessed-label">Current Balance:</span>
            <span className="recessed-value" style={{ color: '#f5b300', fontWeight: 800 }}>
              {symbol} {balance.toFixed(2)}
            </span>
          </div>
          <div className="recessed-row" style={{ borderTop: '1px solid rgba(255,255,255,0.06)', paddingTop: 6, marginTop: 4 }}>
            <span className="recessed-label">Live Status:</span>
            <span className="recessed-value" style={{ color: '#22c55e', fontSize: '0.8rem', display: 'flex', alignItems: 'center', gap: 6 }}>
              <span className="smart-pc-online-dot" style={{ display: 'inline-block' }} />
              Waiting for coins from portal...
            </span>
          </div>
        </div>

        {/* Action Buttons */}
        <div className="winbet-modal-actions" style={{ width: '100%' }}>
          <button
            type="button"
            className="btn-winbet-modal-secondary"
            style={{ width: '100%' }}
            onClick={handleDismiss}
          >
            👀 VIEW GAMES CATALOG (PREVIEW)
          </button>
        </div>
      </div>
    </div>
  );
}
