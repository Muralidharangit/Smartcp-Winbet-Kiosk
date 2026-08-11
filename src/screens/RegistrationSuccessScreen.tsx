import type { TerminalRegistration } from '../api/client'

type Props = {
  result: TerminalRegistration
  onContinue: () => void
}

export function RegistrationSuccessScreen({ result, onContinue }: Props) {
  return (
    <div className="app-shell">
      <header className="top-bar">
        <div className="brand">Kiosk Terminal Setup</div>
      </header>

      <div className="center-panel">
        <div className="card success-card">
          <div className="success-icon" aria-hidden>
            ✓
          </div>
          <h1>Registration successful</h1>
          <p className="success-lead">This Kiosk is now linked to your site and ready for betting.</p>

          <dl className="success-details">
            <div className="success-detail-row">
              <dt>Site name</dt>
              <dd>{result.site_name}</dd>
            </div>
            <div className="success-detail-row">
              <dt>Terminal name</dt>
              <dd>{result.pc_name}</dd>
            </div>
          </dl>

          <p className="success-note">
            The cashier will load coins from the portal. You can start playing once your balance appears.
          </p>

          <button className="primary-btn" type="button" onClick={onContinue}>
            Continue to betting platform
          </button>
        </div>
      </div>
    </div>
  )
}
