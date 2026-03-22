import { load } from '@tauri-apps/plugin-store'

const STORE_FILE = 'session.json'

async function getStore() {
  return await load(STORE_FILE, { autoSave: true })
}

export async function saveSession(data) {
  try {
    const store = await getStore()
    await store.set('session', data)
    await store.save()
  } catch (e) {
    // Fallback auf localStorage falls Tauri Store nicht verfügbar
    localStorage.setItem('matrix_session', JSON.stringify(data))
  }
}

export async function loadSession() {
  try {
    const store = await getStore()
    return await store.get('session')
  } catch (e) {
    const raw = localStorage.getItem('matrix_session')
    return raw ? JSON.parse(raw) : null
  }
}

export async function clearSession() {
  try {
    const store = await getStore()
    await store.delete('session')
    await store.save()
  } catch (e) {
    localStorage.removeItem('matrix_session')
  }
}