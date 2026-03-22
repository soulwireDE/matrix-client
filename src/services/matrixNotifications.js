import { notify } from './notifications.backup'

let listenerAttached = false

export function attachNotificationListener(client) {
  if (listenerAttached) return
  listenerAttached = true

  client.on('Room.timeline', (event, room) => {
  //  if (event.getSender() === client.getUserId()) return
    if (event.getType() !== 'm.room.message') return
    if (document.hasFocus()) return

    const body = event.getContent().body || ''
    const senderName = event.getSender().split(':')[0].slice(1)
    const roomName = room?.name || 'Unbekannter Raum'

    const notifyCount = room?.getUnreadNotificationCount('highlight') || 0
    const isDM = room?.getMembers().length === 2

    if (notifyCount > 0 || isDM) {
      notify(
        `${senderName} in #${roomName}`,
        body.length > 100 ? body.slice(0, 100) + '…' : body
      )
    }
  })
}