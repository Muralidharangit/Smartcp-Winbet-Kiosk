import { useEffect, useState, type ReactNode } from 'react';
import { useNavigate } from 'react-router-dom';
import { loadTerminal } from '../lib/storage';
import { useMachine } from '../services/sessionStore';
import { ZeroBalanceModal } from './ZeroBalanceModal';

type Props = {
  children: ReactNode;
  onCashOut?: () => void;
  showCreditPanel?: boolean;
  /** Epson connected — cash-out stays disabled until true */
  printerReady?: boolean;
  onRegisterToken?: () => void;
};

export default function ArenaShell({
  children,
  onCashOut,
  showCreditPanel: _showCreditPanel = true,
  printerReady = false,
  onRegisterToken,
}: Props) {
  const navigate = useNavigate();
  const { config, balance } = useMachine();
  const stored = loadTerminal();
  const pcName = stored?.pcName || config?.PC_Name || config?.Terminal_ID || 'TEST-PC-012';
  const siteName = stored?.siteName || config?.Site_Name || 'Blinkit';
  const [muted, setMuted] = useState(false);
  const ready = balance > 0;
  const canCashOut = ready && printerReady && !!onCashOut;
  const symbol = config?.CurrencySymbol ?? 'N$';

  useEffect(() => {
    document.documentElement.classList.add('winbet-kiosk');
    document.body.classList.add('winbet-kiosk');
    return () => {
      document.documentElement.classList.remove('winbet-kiosk');
      document.body.classList.remove('winbet-kiosk');
    };
  }, []);

  useEffect(() => {
    if (!ready) {
      document.documentElement.classList.add('is-zero-balance');
      document.body.classList.add('is-zero-balance');
    } else {
      document.documentElement.classList.remove('is-zero-balance');
      document.body.classList.remove('is-zero-balance');
    }
    return () => {
      document.documentElement.classList.remove('is-zero-balance');
      document.body.classList.remove('is-zero-balance');
    };
  }, [ready]);

  const [isScrolled, setIsScrolled] = useState(false);

  useEffect(() => {
    const handleScroll = () => {
      const scrollY =
        window.scrollY ||
        document.documentElement.scrollTop ||
        document.body.scrollTop ||
        document.querySelector('.winbet-app-layout')?.scrollTop ||
        0;
      setIsScrolled(scrollY > 15);
    };

    window.addEventListener('scroll', handleScroll, { passive: true });
    const layout = document.querySelector('.winbet-app-layout');
    if (layout) {
      layout.addEventListener('scroll', handleScroll, { passive: true });
    }

    return () => {
      window.removeEventListener('scroll', handleScroll);
      if (layout) {
        layout.removeEventListener('scroll', handleScroll);
      }
    };
  }, []);

  const toggleFullscreen = () => {
    if (!document.fullscreenElement) {
      document.documentElement.requestFullscreen?.().catch(() => undefined);
    } else {
      document.exitFullscreen?.().catch(() => undefined);
    }
  };

  const triggerStaffKey = () => {
    window.dispatchEvent(
      new KeyboardEvent('keydown', {
        key: 'K',
        ctrlKey: true,
        shiftKey: true,
        bubbles: true,
      })
    );
  };

  return (
    <div className={`winbet-app-layout${ready ? '' : ' arena--empty is-zero-balance'}`}>
      <ZeroBalanceModal />
      {/* Top WINBET Header Bar */}
      <header className={`smart-pc-header-bar ${isScrolled ? 'is-scrolled' : ''}`}>
        <div className="header-brand-wrap">
          <div className="brand-winbet-logo" onClick={() => navigate('/home')} role="button" tabIndex={0}>
            <span className="brand-win-part">WIN</span>
            <span className="brand-bet-part">BET</span>
          </div>

          <div className="smart-pc-capsule">
            <span className="smart-pc-online-dot" />
            <span className="smart-pc-tag">
              <i className="fa-solid fa-desktop me-1.5 text-cyan"></i> TERMINAL
            </span>
            <span className="smart-pc-terminal-id">{pcName}</span>
            <span className="smart-pc-shop-tag">
              <i className="fa-solid fa-shop me-1 text-warning"></i> {siteName}
            </span>
          </div>
        </div>

        {/* Header Right Actions */}
        <div className="header-right-actions">
          <div className="header-balance-chip">
            <span className="balance-label">
              <i className="fa-solid fa-coins me-1 text-warning"></i> BALANCE
            </span>
            <span className="balance-val">
              {symbol} {balance.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
            </span>
          </div>

          <button
            type="button"
            className={`btn-header-cashout${canCashOut ? ' is-ready' : ' is-disabled'}`}
            disabled={!canCashOut}
            onClick={onCashOut}
          >
            <i className="fa-solid fa-print me-1.5"></i> Cash Out
          </button>

          <button
            type="button"
            className="header-square-btn"
            title={muted ? 'Unmute' : 'Mute'}
            onClick={() => setMuted(!muted)}
          >
            {muted ? <i className="fa-solid fa-volume-xmark"></i> : <i className="fa-solid fa-volume-high"></i>}
          </button>
          <button
            type="button"
            className="header-square-btn"
            title="Toggle Fullscreen"
            onClick={toggleFullscreen}
          >
            <i className="fa-solid fa-expand"></i>
          </button>
          <button
            type="button"
            className="header-square-btn"
            title="Staff Key / In-Key Check"
            onClick={triggerStaffKey}
          >
            <i className="fa-solid fa-key"></i>
          </button>
          {onRegisterToken && (
            <button
              type="button"
              className="header-square-btn"
              title="Register / Change Machine Token"
              onClick={onRegisterToken}
            >
              <i className="fa-solid fa-id-card"></i>
            </button>
          )}
        </div>
      </header>

      {/* Main Kiosk Content */}
      <main className="winbet-main-area">{children}</main>
    </div>
  );
}
