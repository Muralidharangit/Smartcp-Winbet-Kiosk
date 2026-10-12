import { useEffect } from 'react';
import { useMachine } from '../services/sessionStore';

export function ZeroBalanceModal() {
  const { balance, showInsertMoneyModal, setShowInsertMoneyModal } = useMachine();
  const numBalance = typeof balance === 'number' && Number.isFinite(balance) ? balance : 0;

  // Auto-close modal when credit is loaded
  useEffect(() => {
    if (numBalance > 0 && showInsertMoneyModal) {
      setShowInsertMoneyModal(false);
    }
  }, [numBalance, showInsertMoneyModal, setShowInsertMoneyModal]);

  if (!showInsertMoneyModal || numBalance > 0) {
    return null;
  }

  function handleClose() {
    setShowInsertMoneyModal(false);
  }

  return (
    <div
      className="kx-alert-backdrop winbet-modal-backdrop gaming-modal-backdrop"
      role="presentation"
      onClick={handleClose}
      style={{ zIndex: 1200 }}
    >
      <div
        className="winbet-modal-card gaming-insert-modal animate-gaming-pop"
        role="alertdialog"
        aria-modal="true"
        aria-labelledby="gaming-modal-title"
        aria-describedby="gaming-modal-desc"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Top Glowing Header Badge & Quick Close */}
        <div className="gaming-modal-top-bar">
          <div className="gaming-badge-pill">
            <span className="gaming-badge-icon">⚡</span>
            <span className="gaming-badge-text">CREDITS REQUIRED TO PLAY</span>
          </div>
          <button
            type="button"
            className="btn-gaming-close"
            onClick={handleClose}
            title="Close"
          >
            ✕
          </button>
        </div>

        {/* Hero Glowing 3D Casino Animation Centerpiece */}
        <div className="gaming-hero-visual">
          <div className="gaming-neon-ring" />
          <div className="gaming-icon-core">
            <span className="gaming-main-emoji">🎰</span>
          </div>
          <div className="gaming-floating-coins">
            <span className="coin-particle c1">🪙</span>
            <span className="coin-particle c2">💵</span>
            <span className="coin-particle c3">✨</span>
          </div>
        </div>

        {/* Centered Punchy Gaming Headline */}
        <h2 id="gaming-modal-title" className="gaming-modal-headline text-center">
          PLEASE INSERT MONEY
        </h2>
        <p id="gaming-modal-desc" className="gaming-modal-subtext text-center">
          Feed cash into the bill acceptor or scan your barcode ticket to start playing games!
        </p>

        {/* Main Action Button */}
        <div className="gaming-modal-actions">
          <button
            type="button"
            className="btn-gaming-catalog-cta"
            onClick={handleClose}
          >
            <span>👀 VIEW GAMES CATALOG (PREVIEW)</span>
            <i className="fa-solid fa-arrow-right ms-2" />
          </button>
        </div>
      </div>
    </div>
  );
}
