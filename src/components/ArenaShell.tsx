import { useEffect, type ReactNode } from 'react';
import { useNavigate } from 'react-router-dom';
import { formatCurrency } from '../api/client';
import { useMachine } from '../services/sessionStore';

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
  showCreditPanel: _showCreditPanel = true,
  printerReady = false,
}: Props) {
  const navigate = useNavigate();
  const { config, balance } = useMachine();
  const ready = balance > 0;
  const canCashOut = ready && printerReady && !!onCashOut;

  useEffect(() => {
    document.documentElement.classList.add('shop-light');
    document.body.classList.add('shop-light');
    return () => {
      document.documentElement.classList.remove('shop-light');
      document.body.classList.remove('shop-light');
    };
  }, []);

  return (
    <div className={`arena arena--shop${ready ? '' : ' arena--empty'}`}>
      <header className="arena-header">
        <div className="arena-brand" onClick={() => navigate('/home')} role="button" tabIndex={0}>
          <span className="arena-brand-mark">N$</span>
          <strong>Terminal Games</strong>
        </div>
        <div className="header-actions">
          <div className="header-balance" title={ready ? 'Available credit' : 'Insert cash or scan a ticket'}>
            <span>Balance</span>
            <strong>{formatCurrency(balance)}</strong>
          </div>
          <button
            type="button"
            className="header-cashout"
            onClick={onCashOut}
            disabled={!canCashOut}
          >
            Cash out
          </button>
          <div className="station-badge" title="This terminal">
            <span className="station-badge-label">Terminal</span>
            <strong className="station-badge-name">{config?.Terminal_ID ?? 'KIOSK-001'}</strong>
          </div>
        </div>
      </header>

      <main className="arena-main">{children}</main>
    </div>
  );
}
