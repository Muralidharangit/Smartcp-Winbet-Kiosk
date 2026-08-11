import { useEffect } from 'react';
import { useMachine } from '../services/sessionStore';

export default function KioskAlert() {
  const alert = useMachine((s) => s.alert);
  const clearAlert = useMachine((s) => s.clearAlert);

  useEffect(() => {
    if (!alert) return;
    if (alert.autoCloseMs === 0) return;
    const ms = alert.autoCloseMs ?? (alert.tone === 'ok' ? 3500 : 0);
    if (!ms) return;
    const t = setTimeout(() => clearAlert(), ms);
    return () => clearTimeout(t);
  }, [alert, clearAlert]);

  if (!alert) return null;

  const icon = alert.tone === 'ok' ? '✓' : alert.tone === 'warn' ? '!' : '×';

  return (
    <div className="kx-alert-backdrop" role="presentation" onClick={() => clearAlert()}>
      <div
        className={`kx-alert kx-alert-${alert.tone}`}
        role="alertdialog"
        aria-modal="true"
        aria-labelledby="kx-alert-title"
        aria-describedby="kx-alert-body"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="kx-alert-icon" aria-hidden>
          {icon}
        </div>
        <h2 id="kx-alert-title">{alert.title}</h2>
        <p id="kx-alert-body">{alert.message}</p>
        <button type="button" className="kx-btn kx-btn-primary" onClick={() => clearAlert()}>
          {alert.tone === 'ok' ? 'Continue' : 'OK'}
        </button>
      </div>
    </div>
  );
}
