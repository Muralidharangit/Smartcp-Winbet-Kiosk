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

  return (
    <div className="winbet-reg-page">
      <form className="winbet-reg-form" onSubmit={handleSubmit}>
        {/* Header with Title and LIVE API Pill */}
        <div className="winbet-reg-header">
          <h2 className="winbet-reg-title">Register Machine</h2>
          <span className="winbet-reg-api-badge">LIVE API</span>
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
          <label htmlFor="portal_slug" className="winbet-reg-label">
            PORTAL SLUG
          </label>
          <input
            id="portal_slug"
            name="portal_slug"
            className="winbet-reg-input"
            value={portalSlug}
            onChange={(event) => setPortalSlugInput(event.target.value.trim().toLowerCase())}
            placeholder="betwise"
            autoComplete="off"
            required
          />
        </div>

        {/* REGISTRATION TOKEN Field */}
        <div className="winbet-reg-field">
          <label htmlFor="registration_token" className="winbet-reg-label">
            REGISTRATION TOKEN
          </label>
          <input
            id="registration_token"
            name="registration_token"
            className="winbet-reg-input winbet-reg-input-token"
            value={token}
            onChange={(event) => setToken(event.target.value.toUpperCase())}
            maxLength={19}
            placeholder="TES4122000111554535"
            autoComplete="off"
            required
          />
        </div>

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
