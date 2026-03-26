export function getLivekitTokenEndpoint() {
  return import.meta.env?.VITE_LIVEKIT_TOKEN_ENDPOINT || '/api/livekit/token'
}

export async function fetchLivekitToken({
  endpoint,
  matrixAccessToken,
  matrixRoomId,
  matrixBaseUrl,
}) {
  const url = endpoint || getLivekitTokenEndpoint()
  const res = await fetch(url, {
    method: 'POST',
    headers: {
      'content-type': 'application/json',
      ...(matrixAccessToken ? { authorization: `Bearer ${matrixAccessToken}` } : {}),
    },
    body: JSON.stringify({
      matrix_room_id: matrixRoomId,
      matrix_base_url: matrixBaseUrl || null,
    }),
  })

  if (!res.ok) {
    const text = await res.text().catch(() => '')
    throw new Error(`Token endpoint failed (${res.status}): ${text || res.statusText}`)
  }

  return await res.json()
}

