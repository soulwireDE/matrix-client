import { useEffect, useState } from 'react'
import * as sdk from 'matrix-js-sdk'
import useAppStore from './store/useAppStore'
import { loadSession, clearSession } from './store/sessionStore'
import { initNotifications } from './services/notifications'
import { attachNotificationListener } from './services/matrixNotifications'
import LoginScreen from './components/LoginScreen'
import MainLayout from './components/layout/MainLayout'

export default function App() {
  const { isLoggedIn, setLoggedIn, setMatrixClient, setCurrentUser } = useAppStore()
  const [checking, setChecking] = useState(true)

  useEffect(() => {
    async function tryRestoreSession() {
      try {
        const session = await loadSession()

        if (session?.accessToken && session?.userId && session?.baseUrl) {
          const client = sdk.createClient({
            baseUrl: session.baseUrl,
            accessToken: session.accessToken,
            userId: session.userId,
            deviceId: session.deviceId,
          })

          await client.whoami()

          setMatrixClient(client)
          setCurrentUser({ userId: session.userId })
          setLoggedIn(true)

          client.startClient({ initialSyncLimit: 20 })
          await initNotifications()
          attachNotificationListener(client)
        }
      } catch (e) {
        console.log('Session ungültig, neu einloggen:', e.message)
        await clearSession()
      } finally {
        setChecking(false)
      }
    }

    tryRestoreSession()
  }, [])

  if (checking) {
    return (
      <div style={{
        height: '100vh', width: '100vw',
        background: 'var(--dc-bg-1)',
        display: 'flex', alignItems: 'center', justifyContent: 'center',
      }}>
        <div style={{ color: 'var(--dc-text-muted)', fontSize: '14px' }}>
          Lade Session…
        </div>
      </div>
    )
  }

  return isLoggedIn ? <MainLayout /> : <LoginScreen />
}