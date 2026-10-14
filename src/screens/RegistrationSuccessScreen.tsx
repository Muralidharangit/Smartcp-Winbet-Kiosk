import type { TerminalRegistration } from '../api/client'

type Props = {
  result: TerminalRegistration
  onContinue: () => void
}

export function RegistrationSuccessScreen({ result, onContinue }: Props) {
  return (
    <div className="winbet-app-layout" style={{ minHeight: '100vh', display: 'flex', flexDirection: 'column' }}>
      <header className="winbet-topbar">
        <div className="winbet-brand">
          <span className="winbet-brand-text">BETWISE TERMINAL</span>
        </div>
        <div className="terminal-name" style={{ color: '#c4b5fd', fontSize: '0.85rem' }}>
          <span>Terminal Kiosk Setup</span>
        </div>
      </header>

      <div
        className="winbet-reg-page"
        style={{ flex: 1, display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '2rem 1rem' }}
      >
        <div className="winbet-modal-card icon-green animate-pop-in" style={{ maxWidth: 520, margin: '0 auto' }}>
          <div className="winbet-modal-badge">
            <span className="modal-badge-num">02</span>
            <span className="modal-badge-title">Registration Complete</span>
          </div>

          <div className="winbet-modal-icon-glow icon-green">
            <span className="modal-icon-symbol">✓</span>
          </div>

          <h1 className="winbet-modal-title title-green">Registration Successful</h1>
          <p className="winbet-modal-desc">This Kiosk is now linked to your shop and ready for betting.</p>

          <div className="winbet-modal-recessed-box" style={{ margin: '1.25rem 0' }}>
            <div className="recessed-row">
              <span className="recessed-label">Shop Name:</span>
              <span className="recessed-value status-highlight">{result.site_name}</span>
            </div>
            <div className="recessed-row">
              <span className="recessed-label">Terminal Name:</span>
              <span className="recessed-value">{result.pc_name}</span>
            </div>
          </div>

          <p style={{ color: 'var(--text-subtitle)', fontSize: '0.85rem', marginBottom: '1.25rem', textAlign: 'center' }}>
            The cashier will load coins from the portal. You can start playing once your balance appears.
          </p>

          <div className="winbet-modal-actions" style={{ width: '100%' }}>
            <button className="btn-winbet-modal-primary" type="button" onClick={onContinue}>
              ENTER BETTING ARENA ›
            </button>
          </div>
        </div>
      </div>
    </div>
  )
}
