import { useState, type FormEvent } from 'react'
import { registerTerminal, type TerminalRegistration } from '../api/client'
import {
  API_ORIGIN,
  DEFAULT_PORTAL_SLUG,
  getPortalSlug,
  getShopApiBaseUrl,
} from '../config/env'
import { getLiveHardwareId, getOperatingSystem, unbindDevHardware } from '../lib/storage'

type Props = {
  onRegistered: (result: TerminalRegistration) => void
  onCancel?: () => void
}

export function RegistrationScreen({ onRegistered, onCancel }: Props) {
  const [portalSlug, setPortalSlugInput] = useState(() => getPortalSlug() || DEFAULT_PORTAL_SLUG)
  const [token, setToken] = useState('')
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [activeField, setActiveField] = useState<'slug' | 'token'>('token')
  const [showKeyboard, setShowKeyboard] = useState(false)
  const [capsLock, setCapsLock] = useState(true)

  function handleKeyPress(char: string) {
    if (activeField === 'slug') {
      const val = char === 'SPACE' ? ' ' : capsLock ? char.toLowerCase() : char.toLowerCase()
      setPortalSlugInput((prev) => (prev + val).trim().toLowerCase())
    } else {
      const val = char === 'SPACE' ? '' : char.toUpperCase()
      setToken((prev) => {
        if (prev.length >= 19) return prev
        return (prev + val).toUpperCase()
      })
    }
  }

  function handleBackspace() {
    if (activeField === 'slug') {
      setPortalSlugInput((prev) => prev.slice(0, -1))
    } else {
      setToken((prev) => prev.slice(0, -1))
    }
  }

  function handleClearField() {
    if (activeField === 'slug') {
      setPortalSlugInput('')
    } else {
      setToken('')
    }
  }

  async function handleSubmit(event: FormEvent) {
    event.preventDefault()
    setError(null)

    const slug = portalSlug.trim()
    if (!slug) {
      setError('Portal slug is required (same slug as the portal admin URL).')
      return
    }

    setLoading(true)

    try {
      const result = await registerTerminal({
        portal_slug: slug,
        registration_token: token.trim().toUpperCase(),
        device_fingerprint: await getLiveHardwareId(),
        operating_system: await getOperatingSystem(),
      })
      onRegistered(result)
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Registration failed'
      const lower = message.toLowerCase()
      if (
        lower.includes('load failed') ||
        lower.includes('failed to fetch') ||
        (lower.includes('fetch') && lower.includes('not')) ||
        lower.includes('networkerror') ||
        lower.includes('network request failed')
      ) {
        setError(
          `Cannot reach the API at ${getShopApiBaseUrl(slug)}. ` +
            `On the shop PC, open ${API_ORIGIN} in a browser. ` +
            `If the browser works but this app fails, rebuild the Tauri app with production .env AND update connect-src in tauri.conf.json (CSP blocks external URLs).`,
        )
      } else {
        setError(message)
      }
    } finally {
      setLoading(false)
    }
  }

  const ROW_NUMS = ['1', '2', '3', '4', '5', '6', '7', '8', '9', '0']
  const ROW_QWERTY = ['Q', 'W', 'E', 'R', 'T', 'Y', 'U', 'I', 'O', 'P']
  const ROW_ASDF = ['A', 'S', 'D', 'F', 'G', 'H', 'J', 'K', 'L']
  const ROW_ZXCV = ['Z', 'X', 'C', 'V', 'B', 'N', 'M', '-', '.']

  return (
    <div className="winbet-reg-page">
      <form className="winbet-reg-form" onSubmit={handleSubmit} style={{ maxWidth: showKeyboard ? 720 : 540 }}>
        {/* Header with Title and LIVE API Pill */}
        <div className="winbet-reg-header">
          <h2 className="winbet-reg-title">Register Machine</h2>
          <div style={{ display: 'flex', gap: 8, alignItems: 'center' }}>
            <button
              type="button"
              onClick={() => setShowKeyboard((prev) => !prev)}
              style={{
                background: showKeyboard ? 'rgba(168, 85, 247, 0.35)' : 'rgba(255, 255, 255, 0.08)',
                border: '1px solid rgba(168, 85, 247, 0.5)',
                color: '#e9d5ff',
                padding: '4px 10px',
                borderRadius: 6,
                fontSize: '0.8rem',
                fontWeight: 700,
                cursor: 'pointer',
              }}
              title="Toggle Touch On-Screen Keyboard"
            >
              ⌨️ {showKeyboard ? 'Hide Touch Keyboard' : 'Touch Keyboard'}
            </button>
            <span className="winbet-reg-api-badge">LIVE API</span>
          </div>
        </div>

        <p className="winbet-reg-desc">
          Enter the portal slug and shop registration token to claim your station.
        </p>

        {error ? (
          <div className="winbet-reg-error">
            <div>{error}</div>
            {error.toLowerCase().includes('already registered') || error.toLowerCase().includes('unbind') ? (
              <div style={{ marginTop: 10 }}>
                <button
                  type="button"
                  style={{
                    background: 'linear-gradient(180deg, #781ff5 0%, #590fc9 100%)',
                    border: '1px solid #a855f7',
                    color: '#ffffff',
                    padding: '8px 14px',
                    borderRadius: 8,
                    cursor: 'pointer',
                    fontSize: '0.85rem',
                    fontWeight: 700,
                    letterSpacing: '0.3px',
                    boxShadow: '0 4px 12px rgba(120, 31, 245, 0.4)',
                  }}
                  onClick={() => {
                    const newId = unbindDevHardware()
                    setError(null)
                    alert(`Unbound! Generated fresh Hardware ID: ${newId}. You can now register with your token.`)
                  }}
                >
                  ⚡ Unbind & Generate New Dev Hardware ID
                </button>
              </div>
            ) : null}
          </div>
        ) : null}

        {/* PORTAL SLUG Field */}
        <div className="winbet-reg-field">
          <label
            htmlFor="portal_slug"
            className="winbet-reg-label"
            style={{ color: activeField === 'slug' ? '#f5b300' : undefined }}
          >
            PORTAL SLUG {activeField === 'slug' ? '◀ (Active)' : ''}
          </label>
          <input
            id="portal_slug"
            name="portal_slug"
            className={`winbet-reg-input ${activeField === 'slug' ? 'is-focused' : ''}`}
            value={portalSlug}
            onFocus={() => setActiveField('slug')}
            onChange={(event) => setPortalSlugInput(event.target.value.trim().toLowerCase())}
            placeholder="betwise"
            autoComplete="off"
            required
          />
        </div>

        {/* REGISTRATION TOKEN Field */}
        <div className="winbet-reg-field">
          <label
            htmlFor="registration_token"
            className="winbet-reg-label"
            style={{ color: activeField === 'token' ? '#f5b300' : undefined }}
          >
            REGISTRATION TOKEN {activeField === 'token' ? '◀ (Active)' : ''}
          </label>
          <input
            id="registration_token"
            name="registration_token"
            className={`winbet-reg-input winbet-reg-input-token ${activeField === 'token' ? 'is-focused' : ''}`}
            value={token}
            onFocus={() => setActiveField('token')}
            onChange={(event) => setToken(event.target.value.toUpperCase())}
            maxLength={19}
            placeholder="TES4122000111554535"
            autoComplete="off"
            required
          />
        </div>

        {/* On-Screen Touch Keyboard Panel */}
        {showKeyboard && (
          <div
            className="touch-keyboard-panel"
            style={{
              background: 'rgba(10, 4, 28, 0.95)',
              border: '1.5px solid rgba(147, 51, 234, 0.45)',
              borderRadius: 12,
              padding: '12px 10px',
              marginTop: 12,
              marginBottom: 12,
              display: 'flex',
              flexDirection: 'column',
              gap: 6,
            }}
          >
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 4 }}>
              <span style={{ fontSize: '0.8rem', color: '#c4b5fd', fontWeight: 700 }}>
                Typing in: <strong style={{ color: '#f5b300' }}>{activeField === 'slug' ? 'PORTAL SLUG' : 'REGISTRATION TOKEN'}</strong>
              </span>
              <button
                type="button"
                onClick={() => setActiveField((prev) => (prev === 'slug' ? 'token' : 'slug'))}
                style={{
                  background: 'rgba(120, 31, 245, 0.3)',
                  border: '1px solid #a855f7',
                  color: '#fff',
                  padding: '3px 10px',
                  borderRadius: 6,
                  fontSize: '0.75rem',
                  fontWeight: 700,
                  cursor: 'pointer',
                }}
              >
                ⇄ Switch to {activeField === 'slug' ? 'Token' : 'Slug'}
              </button>
            </div>

            {/* Row 1: Numbers */}
            <div style={{ display: 'flex', gap: 4, justifyContent: 'center' }}>
              {ROW_NUMS.map((n) => (
                <button
                  key={n}
                  type="button"
                  onClick={() => handleKeyPress(n)}
                  style={{
                    flex: 1,
                    minHeight: 38,
                    background: 'rgba(30, 15, 65, 0.9)',
                    border: '1px solid rgba(147, 51, 234, 0.35)',
                    borderRadius: 6,
                    color: '#f8fafc',
                    fontWeight: 700,
                    fontSize: '0.95rem',
                    cursor: 'pointer',
                  }}
                >
                  {n}
                </button>
              ))}
            </div>

            {/* Row 2: QWERTY */}
            <div style={{ display: 'flex', gap: 4, justifyContent: 'center' }}>
              {ROW_QWERTY.map((k) => (
                <button
                  key={k}
                  type="button"
                  onClick={() => handleKeyPress(capsLock || activeField === 'token' ? k : k.toLowerCase())}
                  style={{
                    flex: 1,
                    minHeight: 38,
                    background: 'rgba(30, 15, 65, 0.9)',
                    border: '1px solid rgba(147, 51, 234, 0.35)',
                    borderRadius: 6,
                    color: '#f8fafc',
                    fontWeight: 700,
                    fontSize: '0.95rem',
                    cursor: 'pointer',
                  }}
                >
                  {capsLock || activeField === 'token' ? k : k.toLowerCase()}
                </button>
              ))}
            </div>

            {/* Row 3: ASDF */}
            <div style={{ display: 'flex', gap: 4, justifyContent: 'center' }}>
              {ROW_ASDF.map((k) => (
                <button
                  key={k}
                  type="button"
                  onClick={() => handleKeyPress(capsLock || activeField === 'token' ? k : k.toLowerCase())}
                  style={{
                    flex: 1,
                    minHeight: 38,
                    background: 'rgba(30, 15, 65, 0.9)',
                    border: '1px solid rgba(147, 51, 234, 0.35)',
                    borderRadius: 6,
                    color: '#f8fafc',
                    fontWeight: 700,
                    fontSize: '0.95rem',
                    cursor: 'pointer',
                  }}
                >
                  {capsLock || activeField === 'token' ? k : k.toLowerCase()}
                </button>
              ))}
            </div>

            {/* Row 4: ZXCV + Backspace */}
            <div style={{ display: 'flex', gap: 4, justifyContent: 'center' }}>
              <button
                type="button"
                onClick={() => setCapsLock((p) => !p)}
                style={{
                  flex: 1.2,
                  minHeight: 38,
                  background: capsLock ? 'rgba(245, 179, 0, 0.25)' : 'rgba(30, 15, 65, 0.9)',
                  border: capsLock ? '1px solid #f5b300' : '1px solid rgba(147, 51, 234, 0.35)',
                  borderRadius: 6,
                  color: capsLock ? '#f5b300' : '#f8fafc',
                  fontWeight: 800,
                  fontSize: '0.8rem',
                  cursor: 'pointer',
                }}
              >
                CAPS
              </button>
              {ROW_ZXCV.map((k) => (
                <button
                  key={k}
                  type="button"
                  onClick={() => handleKeyPress(capsLock || activeField === 'token' ? k : k.toLowerCase())}
                  style={{
                    flex: 1,
                    minHeight: 38,
                    background: 'rgba(30, 15, 65, 0.9)',
                    border: '1px solid rgba(147, 51, 234, 0.35)',
                    borderRadius: 6,
                    color: '#f8fafc',
                    fontWeight: 700,
                    fontSize: '0.95rem',
                    cursor: 'pointer',
                  }}
                >
                  {capsLock || activeField === 'token' ? k : k.toLowerCase()}
                </button>
              ))}
              <button
                type="button"
                onClick={handleBackspace}
                style={{
                  flex: 1.4,
                  minHeight: 38,
                  background: 'rgba(239, 68, 68, 0.2)',
                  border: '1px solid rgba(239, 68, 68, 0.4)',
                  borderRadius: 6,
                  color: '#fca5a5',
                  fontWeight: 800,
                  fontSize: '0.85rem',
                  cursor: 'pointer',
                }}
              >
                ⌫ DEL
              </button>
            </div>

            {/* Row 5: Action Keys */}
            <div style={{ display: 'flex', gap: 6, justifyContent: 'center', marginTop: 2 }}>
              <button
                type="button"
                onClick={handleClearField}
                style={{
                  flex: 1,
                  minHeight: 36,
                  background: 'rgba(255, 255, 255, 0.08)',
                  border: '1px solid rgba(255, 255, 255, 0.2)',
                  borderRadius: 6,
                  color: '#cbd5e1',
                  fontWeight: 700,
                  fontSize: '0.8rem',
                  cursor: 'pointer',
                }}
              >
                Clear Field
              </button>
              {activeField === 'slug' && (
                <button
                  type="button"
                  onClick={() => handleKeyPress('-')}
                  style={{
                    flex: 1,
                    minHeight: 36,
                    background: 'rgba(30, 15, 65, 0.9)',
                    border: '1px solid rgba(147, 51, 234, 0.35)',
                    borderRadius: 6,
                    color: '#f8fafc',
                    fontWeight: 700,
                    fontSize: '0.95rem',
                    cursor: 'pointer',
                  }}
                >
                  - (Hyphen)
                </button>
              )}
              <button
                type="button"
                onClick={() => setShowKeyboard(false)}
                style={{
                  flex: 1,
                  minHeight: 36,
                  background: 'rgba(34, 197, 94, 0.2)',
                  border: '1px solid rgba(34, 197, 94, 0.4)',
                  borderRadius: 6,
                  color: '#86efac',
                  fontWeight: 700,
                  fontSize: '0.8rem',
                  cursor: 'pointer',
                }}
              >
                ✓ Done
              </button>
            </div>
          </div>
        )}

        <p className="winbet-reg-note">
          Station ID, shop name, player ID, and real-time cash balance are fetched directly from the backend API.
        </p>

        {/* Actions Row */}
        <div className="winbet-reg-actions">
          <button
            type="button"
            className="winbet-reg-btn-close"
            onClick={() => {
              setError(null)
              if (onCancel) {
                onCancel()
              }
            }}
          >
            Close
          </button>

          <button
            type="submit"
            className="winbet-reg-btn-submit"
            disabled={loading || token.trim().length !== 19 || !portalSlug.trim()}
          >
            <span>🔗</span>
            <span>{loading ? 'Registering…' : 'Register Station'}</span>
          </button>
        </div>

        {/* Footer Station Badge Strip */}
        <div className="winbet-reg-footer">
          <div className="winbet-reg-footer-icon" aria-hidden="true">
            🎰
          </div>
          <div>
            <div className="winbet-reg-footer-title">WinBet Station</div>
            <div className="winbet-reg-footer-sub">
              Live Backend Integration • Real-Time Cash Balance
            </div>
          </div>
        </div>
      </form>
    </div>
  )
}
