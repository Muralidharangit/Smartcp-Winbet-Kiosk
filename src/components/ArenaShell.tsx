import { useEffect, useState, type MouseEvent, type ReactNode } from 'react';
import { NavLink, useNavigate } from 'react-router-dom';
import { useMachine } from '../services/sessionStore';

const NAV = [
  { to: '/home', label: 'Home', icon: '⌂', end: true as const },
  { to: '/play', label: 'Popular', icon: '★', needsCredit: true },
  { to: '/play/aviator', label: 'Aviator', icon: '✈', needsCredit: true },
  { to: '/play/wheel', label: 'Lucky Wheel', icon: '⚡', needsCredit: true },
];

type Props = {
  children: ReactNode;
  onCashOut?: () => void;
  showCreditPanel?: boolean;
  /** Epson connected — cash-out stays disabled until true */
  printerReady?: boolean;
};

export default function ArenaShell({
  children,
  onCashOut,
  showCreditPanel = true,
  printerReady = false,
}: Props) {
  const navigate = useNavigate();
  const { config, balance, showAlert, setPrinterWarning } = useMachine();
  const symbol = config?.CurrencySymbol ?? 'N$';
  const ready = balance > 0;
  const canCashOut = ready && printerReady && !!onCashOut;
  const [now, setNow] = useState(() => new Date());

  useEffect(() => {
    const t = setInterval(() => setNow(new Date()), 1000);
    return () => clearInterval(t);
  }, []);

  const time = now.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
  const date = now.toLocaleDateString([], { day: '2-digit', month: 'short', year: 'numeric' });

  function insertCashHint() {
    // Never show print/cash-out errors here — that was confusing leftover banner text
    setPrinterWarning(null);
    showAlert({
      tone: 'ok',
      title: 'Insert cash',
      message: 'Feed a NAD 10 / 20 / 50 / 100 note into the bill acceptor, or scan a credit ticket.',
      autoCloseMs: 4000,
    });
  }

  function onNavGame(e: MouseEvent, needsCredit?: boolean) {
    if (needsCredit && !ready) {
      e.preventDefault();
      navigate('/home');
      showAlert({
        tone: 'warn',
        title: 'Games locked',
        message: 'Insert cash or scan a credit ticket to unlock games.',
        autoCloseMs: 0,
      });
    }
  }

  return (
    <div className={`arena${showCreditPanel ? '' : ' arena--play'}${ready ? '' : ' arena--empty'}`}>
      <header className="arena-header">
        <div className="arena-brand" onClick={() => navigate('/home')} role="button" tabIndex={0}>
          <span className="arena-brand-mark">N$</span>
          <strong>NAD ARENA</strong>
        </div>
        <div className="arena-header-right">
          <span className="arena-online">
            <i />
            {config?.Terminal_ID ?? 'KIOSK-001'}
          </span>
          <div className="arena-clock">
            <strong>{time}</strong>
            <small>{date}</small>
          </div>
        </div>
      </header>

      <aside className="arena-nav">
        {NAV.map((item) => (
          <NavLink
            key={item.to}
            to={item.to}
            end={'end' in item ? item.end : false}
            className={({ isActive }) =>
              `arena-nav-item${isActive ? ' active' : ''}${
                item.needsCredit && !ready ? ' is-nav-locked' : ''
              }`
            }
            onClick={(e) => onNavGame(e, item.needsCredit)}
          >
            <span className="arena-nav-icon">{item.icon}</span>
            {item.label}
          </NavLink>
        ))}
        <button
          type="button"
          className="arena-help"
          onClick={() =>
            showAlert({
              tone: 'ok',
              title: 'Need help?',
              message: 'Please ask a staff member for assistance.',
              autoCloseMs: 4000,
            })
          }
        >
          Need help? Contact staff
        </button>
      </aside>

      <main className="arena-main">{children}</main>

      {showCreditPanel && (
        <aside className="arena-side">
          <div className={`arena-credit-card${ready ? '' : ' is-empty'}`}>
            <p className="arena-credit-label">{ready ? 'Available credit' : 'No credit yet'}</p>
            <p className="arena-credit-value">
              {symbol}
              {balance.toFixed(2)}
            </p>
            <p className="arena-credit-hint">
              {ready ? 'Ready to play' : 'Games unlock after cash or ticket'}
            </p>
          </div>

          <div className="arena-side-actions">
            <button
              type="button"
              className={`arena-btn arena-btn-gold${ready ? '' : ' is-pulse'}`}
              onClick={insertCashHint}
            >
              Insert cash
            </button>
            <button
              type="button"
              className="arena-btn arena-btn-outline"
              onClick={onCashOut}
              disabled={!canCashOut}
            >
              Cash out ticket
            </button>
            {ready && !printerReady ? (
              <p className="arena-credit-hint" style={{ margin: 0 }}>
                Connect printer to cash out
              </p>
            ) : null}
          </div>

          <div className="arena-howto">
            <h3>{ready ? 'How to play' : 'Start here'}</h3>
            <ol>
              <li className={!ready ? 'is-current' : undefined}>
                <strong>Insert cash</strong>
                <span>NAD notes: 10 · 20 · 50 · 100</span>
              </li>
              <li>
                <strong>Or scan ticket</strong>
                <span>Use a previous cash-out ticket</span>
              </li>
              <li>
                <strong>Choose a game</strong>
                <span>Aviator or Lucky Wheel</span>
              </li>
              <li>
                <strong>Cash out</strong>
                <span>Print a ticket when you finish</span>
              </li>
            </ol>
          </div>
        </aside>
      )}

      <footer className="arena-footer">
        <span>(18+) Play responsibly</span>
        <span>Kiosk ID: {config?.Terminal_ID ?? 'KIOSK-001'}</span>
        <span>Powering fun. Responsibly.</span>
      </footer>
    </div>
  );
}
