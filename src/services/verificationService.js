// src/services/verificationService.js

let onVerificationRequestCallback = null

export function setVerificationRequestHandler(callback) {
  onVerificationRequestCallback = callback
}

export function attachVerificationListener(client) {
  client.on('crypto.verificationRequestReceived', (request) => {
    console.log('📩 Verification Request empfangen:', request)
    if (onVerificationRequestCallback) {
      onVerificationRequestCallback(request)
    }
  })
}

export async function startVerification(client, userId) {
  try {
    console.log('🔐 Starte Verifizierung für:', userId)

    // ✅ Erst Keys vom Server laden und warten bis sie da sind
    const crypto = client.getCrypto()
    if (!crypto) throw new Error('Crypto nicht verfügbar')

    // Keys laden
    await crypto.getUserDeviceInfo([userId], true) // true = force refresh vom Server

    // Kurz warten damit die Geräte registriert sind
    await new Promise(resolve => setTimeout(resolve, 500))

    // Nochmal prüfen ob Geräte jetzt bekannt sind
    const deviceInfo = await crypto.getUserDeviceInfo([userId])
    const devices = deviceInfo.get(userId)
    console.log('📱 Gefundene Geräte:', devices?.size, devices)

    if (!devices || devices.size === 0) {
      throw new Error(`Keine Geräte für ${userId} gefunden – Verifizierung nicht möglich`)
    }

    const room = await getOrCreateDMRoom(client, userId)
    console.log('🏠 DM Raum:', room.roomId)

    const request = await client.getCrypto().requestVerificationDM(
      userId,
      room.roomId
    )
    console.log('✅ Verification Request gesendet:', request)
    return request

  } catch (e) {
    console.error('❌ Verification start fehler:', e)
    throw e
  }
}

async function getOrCreateDMRoom(client, userId) {
  const rooms = client.getRooms()
  const existing = rooms.find(room => {
    const members = room.getMembers()
    const isDM = members.length === 2
    const hasUser = members.some(m => m.userId === userId)
    return isDM && hasUser
  })

  if (existing) return existing

  const result = await client.createRoom({
    invite: [userId],
    is_direct: true,
    preset: 'trusted_private_chat',
  })

  // Warten bis der Raum im Client verfügbar ist
  await new Promise(resolve => setTimeout(resolve, 1000))
  return client.getRoom(result.room_id)
}