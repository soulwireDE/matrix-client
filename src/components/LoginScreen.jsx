import { useState } from 'react'
import * as sdk from 'matrix-js-sdk'
import useAppStore from '../store/useAppStore'
import TitleBar from './TitleBar'
import { initNotifications } from '../services/notifications.backup'
import { attachNotificationListener } from '../services/matrixNotifications'
import { initCrypto } from '../services/cryptoInit'
import { saveSession } from '../store/sessionStore'

const inputStyle = {
  width: '100%',
  background: 'var(--dc-bg-1)',
  border: '1px solid rgba(255,255,255,0.08)',
  borderRadius: '4px',
  padding: '10px 12px',
  color: 'var(--dc-text-1)',
  fontSize: '14px',
  outline: 'none',
}

export default function LoginScreen() {
  const [homeserver, setHomeserver] = useState('https://matrix.service.dev-nook.de')
  const [username, setUsername] = useState('')
  const [password, setPassword] = useState('')
  const [error, setError] = useState('')
  const [loading, setLoading] = useState(false)

  const { setMatrixClient, setLoggedIn, setCurrentUser } = useAppStore()

  async function handleLogin(e) {
    e.preventDefault()
    setError('')
    setLoading(true)

    try {
      let baseUrl = homeserver.trim()
      if (!baseUrl.startsWith('http://') && !baseUrl.startsWith('https://')) {
        baseUrl = 'https://' + baseUrl
      }

      // Schritt 1: Login um deviceId zu bekommen
      const tempClient = sdk.createClient({ baseUrl })
      const response = await tempClient.login('m.login.password', {
        user: username,
        password: password,
        initial_device_display_name: 'SoulWire Desktop', // ✅ Gerätename
      })

      // Schritt 2: Echten Client MIT deviceId erstellen
      const client = sdk.createClient({
        baseUrl,
        accessToken: response.access_token,
        userId: response.user_id,
        deviceId: response.device_id,  // ✅ jetzt bekannt → Crypto funktioniert
      })

      // Schritt 3: Crypto initialisieren
      await initCrypto(client)

      // Schritt 4: Session speichern
      await saveSession({
        baseUrl,
        accessToken: response.access_token,
        userId: response.user_id,
        deviceId: response.device_id,
      })

      // Schritt 5: App-State setzen und Client starten
      setMatrixClient(client)
      setCurrentUser({ userId: response.user_id, displayName: username })
      setLoggedIn(true)

      client.startClient({ initialSyncLimit: 20 })

      await initNotifications()
      attachNotificationListener(client)

    } catch (err) {
      setError(err.message || 'Login fehlgeschlagen')
    } finally {
      setLoading(false)
    }
  }

  return (
    <div style={{ display: 'flex', flexDirection: 'column', height: '100vh', background: 'var(--dc-bg-1)' }}>
      <TitleBar />
      <div style={{
        flex: 1, display: 'flex', alignItems: 'center',
        justifyContent: 'center', width: '100%',
      }}>
        <div style={{
          background: 'var(--dc-bg-2)', borderRadius: '8px',
          padding: '32px 40px', width: '420px', maxWidth: '90vw',
        }}>
          <h1 style={{
            color: 'var(--dc-text-1)', fontSize: '24px',
            fontWeight: 700, marginBottom: '8px', textAlign: 'center',
          }}>
            Willkommen zurück
          </h1>
          <p style={{
            color: 'var(--dc-text-muted)', textAlign: 'center',
            marginBottom: '24px', fontSize: '14px',
          }}>
            Melde dich mit deinem Matrix-Konto an
          </p>

          <form onSubmit={handleLogin} style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
            <div>
              <label style={{
                display: 'block', color: 'var(--dc-text-3)', fontSize: '12px',
                fontWeight: 600, marginBottom: '6px',
                textTransform: 'uppercase', letterSpacing: '0.5px',
              }}>
                Homeserver
              </label>
              <input
                type="text" value={homeserver}
                onChange={e => setHomeserver(e.target.value)}
                style={inputStyle}
              />
            </div>

            <div>
              <label style={{
                display: 'block', color: 'var(--dc-text-3)', fontSize: '12px',
                fontWeight: 600, marginBottom: '6px',
                textTransform: 'uppercase', letterSpacing: '0.5px',
              }}>
                Benutzername
              </label>
              <input
                type="text" value={username}
                placeholder="@du:dein-server.de"
                onChange={e => setUsername(e.target.value)}
                style={inputStyle}
              />
            </div>

            <div>
              <label style={{
                display: 'block', color: 'var(--dc-text-3)', fontSize: '12px',
                fontWeight: 600, marginBottom: '6px',
                textTransform: 'uppercase', letterSpacing: '0.5px',
              }}>
                Passwort
              </label>
              <input
                type="password" value={password}
                onChange={e => setPassword(e.target.value)}
                style={inputStyle}
              />
            </div>

            {error && (
              <div style={{
                background: 'rgba(237,66,69,0.1)',
                border: '1px solid var(--dc-red)',
                borderRadius: '4px', padding: '10px 12px',
                color: 'var(--dc-red)', fontSize: '13px',
              }}>
                {error}
              </div>
            )}

            <button
              type="submit" disabled={loading}
              style={{
                background: loading ? 'var(--dc-accent-hover)' : 'var(--dc-accent)',
                color: '#fff', border: 'none', borderRadius: '4px',
                padding: '12px', fontSize: '15px', fontWeight: 600,
                cursor: loading ? 'not-allowed' : 'pointer', marginTop: '8px',
              }}
            >
              {loading ? 'Wird angemeldet…' : 'Anmelden'}
            </button>
          </form>
        </div>
      </div>
    </div>
  )
}