// src/services/livekitToken.js

const JWT_SERVICE_URL = 'https://livekit.service.dev-nook.de/_matrix/livekit'

export async function fetchLivekitToken({ matrixAccessToken, matrixRoomId, matrixUserId }) {
  if (!matrixAccessToken) throw new Error('Kein Matrix Access Token vorhanden')
  if (!matrixRoomId) throw new Error('Keine Room ID vorhanden')
  if (!matrixUserId) throw new Error('Keine User ID vorhanden')

  // Schritt 1: OpenID Token von Synapse holen
  const encodedUserId = encodeURIComponent(matrixUserId)
  const openIdRes = await fetch(
    `https://matrix.service.dev-nook.de/_matrix/client/v3/user/${encodedUserId}/openid/request_token`,
    {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${matrixAccessToken}`,
      },
      body: JSON.stringify({}),
    }
  )

  if (!openIdRes.ok) {
    const text = await openIdRes.text().catch(() => '')
    throw new Error(`OpenID Token fehlgeschlagen (${openIdRes.status}): ${text}`)
  }

  const openIdData = await openIdRes.json()
  console.log('✅ OpenID Token:', openIdData)

  // Schritt 2: LiveKit JWT Token holen - korrekter Endpoint für v0.4.1
  const livekitRes = await fetch(
    `${JWT_SERVICE_URL}/sfu/get`,  // ✅ korrekter Endpoint
    {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        room: matrixRoomId,          // ✅ 'room' nicht 'room_id'
        openid_token: openIdData,
        device_id: crypto.randomUUID(),
      }),
    }
  )

  if (!livekitRes.ok) {
    const text = await livekitRes.text().catch(() => '')
    throw new Error(`LiveKit Token fehlgeschlagen (${livekitRes.status}): ${text}`)
  }

  const data = await livekitRes.json()
  console.log('✅ LiveKit Token:', data)

  // v0.4.1 gibt 'url' und 'jwt' zurück
  return {
    token: data.jwt,
    livekit_url: data.url || 'wss://livekit.service.dev-nook.de',
  }
}

export function getLivekitTokenEndpoint() {
  return JWT_SERVICE_URL
}