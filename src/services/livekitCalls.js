const CALL_EVENT_TYPE = 'com.matrixclient.livekit.call'
const CALL_STATE_KEY = ''

export function getLivekitCallState(room) {
  const ev = room?.currentState?.getStateEvents?.(CALL_EVENT_TYPE, CALL_STATE_KEY)
  if (!ev) return null
  const content = ev.getContent?.() || {}
  return { event: ev, content }
}

export async function setLivekitCallActive(matrixClient, roomId, { active, livekitUrl, roomName }) {
  if (!matrixClient) throw new Error('matrixClient missing')
  if (!roomId) throw new Error('roomId missing')

  const userId = matrixClient.getUserId?.()
  const payload = {
    v: 1,
    active: !!active,
    livekit_url: livekitUrl || null,
    room_name: roomName || null,
    created_by: userId || null,
    created_ts: Date.now(),
  }

  return await matrixClient.sendStateEvent(roomId, CALL_EVENT_TYPE, payload, CALL_STATE_KEY)
}

export function deriveLivekitRoomName(matrixRoomId) {
  return `mx_${String(matrixRoomId).replaceAll(':', '_')}`
}

export function getCallEventType() {
  return CALL_EVENT_TYPE
}
