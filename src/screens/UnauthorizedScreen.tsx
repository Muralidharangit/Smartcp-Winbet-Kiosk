type Props = {
  onClearLocal?: () => void
}

export function UnauthorizedScreen({ onClearLocal }: Props) {
  return (
    <div className="center-panel" style={{ padding: '2rem 1rem' }}>
      <div className="winbet-modal-card icon-red" style={{ maxWidth: 520, margin: '0 auto' }}>
        <div className="winbet-modal-badge">
          <span className="modal-badge-num">99</span>
          <span className="modal-badge-title">Security Alert</span>
        </div>
        <div className="winbet-modal-icon-glow icon-red">
          <span className="modal-icon-symbol">!</span>
        </div>
        <h1 className="winbet-modal-title title-red">PC Not Authorized</h1>
        <p className="winbet-modal-desc">
          This installation does not match the hardware registered for this terminal. Copying the app to
          another computer will not work.
        </p>
        <p style={{ textAlign: 'center', color: 'var(--text-subtitle)', fontSize: '0.85rem', marginBottom: '1.25rem' }}>
          Ask Master to disable the old PC (if replaced) and provide a new registration token.
        </p>

        {onClearLocal ? (
          <div className="winbet-modal-actions" style={{ width: '100%' }}>
            <button className="btn-winbet-modal-secondary" type="button" onClick={onClearLocal}>
              Clear Local Data & Register Again
            </button>
          </div>
        ) : null}
      </div>
    </div>
  )
}
