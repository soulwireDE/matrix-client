import {
  isPermissionGranted,
  requestPermission,
  sendNotification,
} from '@tauri-apps/plugin-notification'

let permissionGranted = false

export async function initNotifications() {
  permissionGranted = await isPermissionGranted()
  if (!permissionGranted) {
    const permission = await requestPermission()
    permissionGranted = permission === 'granted'
  }
  return permissionGranted
}

export function notify(title, body, roomId) {
  if (!permissionGranted) return
  sendNotification({ title, body })
}