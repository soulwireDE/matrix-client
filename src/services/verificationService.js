

let onVerificationRequestCallback = null

export function setVerificationRequestHandler(callback) {
  onVerificationRequestCallback = callback
}

export function attachVerificationListener(client) {
  client.on('crypto.verificationRequestReceived', (request) => {
    if (onVerificationRequestCallback) {
      onVerificationRequestCallback(request)
    }
  })
}

export async function startVerification(client, userId) {
  try {
    // ✅ Korrekte Methode in matrix-js-sdk v41
    await client.getCrypto().getUserDeviceInfo([userId])

    const room = await getOrCreateDMRoom(client, userId)
    const request = await client.getCrypto().requestVerificationDM(
      userId,
      room.roomId
    )
    return request
  } catch (e) {
    console.error('Verification start fehler:', e)
    throw e
  }
}

async function getOrCreateDMRoom(client, userId) {
  // Existierenden DM suchen
  const rooms = client.getRooms()
  const existing = rooms.find(room => {
    const members = room.getMembers()
    const isDM = members.length === 2
    const hasUser = members.some(m => m.userId === userId)
    return isDM && hasUser
  })

  if (existing) return existing

  // Neuen DM erstellen
  const result = await client.createRoom({
    invite: [userId],
    is_direct: true,
    preset: 'trusted_private_chat',
  })

  return client.getRoom(result.room_id)
}