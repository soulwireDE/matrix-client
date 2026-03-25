let permissionGranted = false
let useBrowserFallback = false

export async function initNotifications() {
  try {
    const { isPermissionGranted, requestPermission } = await import('@tauri-apps/plugin-notification')
    permissionGranted = await isPermissionGranted()
    if (!permissionGranted) {
      const permission = await requestPermission()
      permissionGranted = permission === 'granted'
    }
    if (!permissionGranted) throw new Error('Tauri permission denied')
  } catch (e) {
    // Fallback auf Browser Notifications
    console.log('Tauri Notifications nicht verfügbar, nutze Browser-Fallback', e)
    useBrowserFallback = true
    if ('Notification' in window) {
      const permission = await Notification.requestPermission()
      permissionGranted = permission === 'granted'
    }
  }
  return permissionGranted
}

export function notify(title, body) {
  if (!permissionGranted) return

  if (useBrowserFallback) {
    new Notification(title, {
      body,
      icon: '/vite.svg',
    })
    return
  }

  import('@tauri-apps/plugin-notification').then(({ sendNotification }) => {
    sendNotification({ title, body })
  })
}