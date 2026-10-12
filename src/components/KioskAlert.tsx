import { useEffect } from 'react';
import { useMachine } from '../services/sessionStore';

export default function KioskAlert() {
  const alert = useMachine((s) => s.alert);
  const balance = useMachine((s) => s.balance);
  const config = useMachine((s) => s.config);
  const clearAlert = useMachine((s) => s.clearAlert);
  const symbol = config?.CurrencySymbol ?? 'N$';

  useEffect(() => {
    if (!alert) return;
    if (alert.autoCloseMs === 0) return;
    const ms = alert.autoCloseMs ?? (alert.tone === 'ok' ? 3500 : 0);
    if (!ms) return;
    const t = setTimeout(() => clearAlert(), ms);
    return () => clearTimeout(t);
  }, [alert, clearAlert]);

  if (!alert) return null;

  const isScanner = alert.title.toLowerCase().includes('scan');
  const isBill = alert.title.toLowerCase().includes('cash') || alert.title.toLowerCase().includes('bill') || alert.title.toLowerCase().includes('note') || alert.title.toLowerCase().includes('coin');
  

  const iconGlyph = isBill ? '💵' : isScanner ? '❙❙❙' : alert.tone === 'ok' ? '✓' : alert.tone === 'warn' ? '!' : '×';
  const iconThemeClass = isBill ? 'icon-gold' : isScanner ? 'icon-cyan' : alert.tone === 'ok' ? 'icon-green' : alert.tone === 'warn' ? 'icon-gold' : 'icon-red';
  const titleColorClass = isBill || alert.tone === 'warn' ? 'title-gold' : isScanner ? 'title-cyan' : alert.tone === 'ok' ? 'title-green' : 'title-red';

  const btnText = isScanner ? '❙❙❙ SCAN TICKET AGAIN' : isBill ? '🔄 TRY AGAIN' : alert.tone === 'ok' ? 'CONTINUE' : 'OK';

  return (
    <div className="kx-alert-backdrop winbet-modal-backdrop" role="presentation" onClick={() => clearAlert()}>
      <div
        className={`winbet-modal-card ${iconThemeClass}`}
        role="alertdialog"
        aria-modal="true"
        aria-labelledby="kx-alert-title"
        aria-describedby="kx-alert-body"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Center Glowing Circular Icon */}
        <div className={`winbet-modal-icon-glow ${iconThemeClass}`}>
          <span className="modal-icon-symbol">{iconGlyph}</span>
        </div>

        {/* Heading & Subtext */}
        <div className="kx-alert-text-content">
          <h2 id="kx-alert-title" className={`winbet-modal-title ${titleColorClass}`}>
            {alert.title}
          </h2>
          <p id="kx-alert-body" className="winbet-modal-desc">
            {alert.message}
          </p>
        </div>

        {/* Recessed Info Box */}
        <div className="winbet-modal-recessed-box">
          <div className="recessed-row">
            <span className="recessed-label">Machine Credits:</span>
            <span className="recessed-value balance-highlight">
              {balance > 0 ? `${symbol} ${Number(balance || 0).toFixed(2)}` : 'Unchanged'}
            </span>
          </div>
          <div className="recessed-row">
            <span className="recessed-label">Status:</span>
            <span className={`recessed-value status-highlight ${titleColorClass}`}>
              {alert.tone === 'ok' ? 'Success' : 'Ready for retry'}
            </span>
          </div>
        </div>

        {/* Action Buttons */}
        <div className="winbet-modal-actions">
          <button type="button" className={`btn-winbet-modal-primary ${iconThemeClass}`} onClick={() => clearAlert()}>
            {btnText}
          </button>
          <button type="button" className="btn-winbet-modal-secondary" onClick={() => clearAlert()}>
            ✕ CLOSE
          </button>
        </div>
      </div>
    </div>
  );
}

