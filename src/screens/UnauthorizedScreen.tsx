type Props = {
  onClearLocal?: () => void
}

export function UnauthorizedScreen({ onClearLocal }: Props) {
  return (
    <div className="center-panel">
      <div className="card">
        <div className="success-icon" style={{ background: 'rgba(239, 68, 68, 0.15)', color: '#f87171' }}>
          !
        </div>
        <h1 style={{ textAlign: 'center' }}>PC not authorized</h1>
        <p style={{ textAlign: 'center' }}>
          This installation does not match the hardware registered for this terminal. Copying the app to
          another computer will not work.
        </p>
        <p style={{ textAlign: 'center', color: '#94a3b8' }}>
          Ask Master to disable the old PC (if replaced) and provide a new registration token.
        </p>

        {onClearLocal ? (
          <button className="secondary-btn" type="button" style={{ width: '100%', marginTop: '1rem' }} onClick={onClearLocal}>
            Clear local data & register again
          </button>
        ) : null}
      </div>
    </div>
  )
}
