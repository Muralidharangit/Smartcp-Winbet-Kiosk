import { useState, type FormEvent } from 'react'
import { registerTerminal, type TerminalRegistration } from '../api/client'
import { API_BASE_URL, API_ORIGIN } from '../config/env'
import { getLiveHardwareId, getOperatingSystem } from '../lib/storage'

type Props = {
  onRegistered: (result: TerminalRegistration) => void
}

export function RegistrationScreen({ onRegistered }: Props) {
  const [token, setToken] = useState('')
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  async function handleSubmit(event: FormEvent) {
    event.preventDefault()
    setError(null)
    setLoading(true)

    try {
      const result = await registerTerminal({
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
          `Cannot reach the API at ${API_BASE_URL}. ` +
            `On the site PC, open ${API_ORIGIN} in a browser. ` +
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
    <div className="center-panel">
      <form className="card" onSubmit={handleSubmit}>
        <h1>Register Kiosk</h1>
        <p>
          Enter the 19-character registration token from the portal. Site name, terminal name, and machine ID
          are assigned automatically from the next available terminal slot Master created for this site.
        </p>

        {error ? <div className="error-text">{error}</div> : null}

        <div className="field">
          <label htmlFor="registration_token">Registration token</label>
          <input
            id="registration_token"
            name="registration_token"
            value={token}
            onChange={(event) => setToken(event.target.value.toUpperCase())}
            maxLength={19}
            placeholder="ABC1234567890123456"
            autoComplete="off"
            required
          />
        </div>

        <button className="primary-btn" type="submit" disabled={loading || token.trim().length !== 19}>
          {loading ? 'Registering…' : 'Register PC'}
        </button>

        <p className="muted" style={{ marginTop: '1.25rem', textAlign: 'center', fontSize: '0.85rem' }}>
          API: {API_BASE_URL}
        </p>
      </form>
    </div>
  )
}
