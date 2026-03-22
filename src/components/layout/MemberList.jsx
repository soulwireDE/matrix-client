import { useEffect, useState } from 'react'
import useAppStore from '../../store/useAppStore'

export default function MemberList() {
  const { matrixClient, activeRoomId } = useAppStore()
  const [members, setMembers] = useState([])

useEffect(() => {
  if (!matrixClient || !activeRoomId) {
    setMembers([])
    return
  }

  const room = matrixClient.getRoom(activeRoomId)
  if (!room) return

  const loadMembers = async () => {
    await matrixClient.getJoinedRoomMembers(activeRoomId)
    const joined = room.getMembersWithMembership('join')
    const invited = room.getMembersWithMembership('invite')

    const withPresence = await Promise.all(
      joined.map(async (m) => {
        let presence = 'offline'
        try {
          const p = await matrixClient.getPresence(m.userId)
          presence = p?.presence || 'offline'
        } catch (_) {}
        return { member: m, presence }
      })
    )

    const order = { online: 0, unavailable: 1, offline: 2 }
    withPresence.sort((a, b) => {
      const od = (order[a.presence] ?? 2) - (order[b.presence] ?? 2)
      if (od !== 0) return od
      return a.member.name.localeCompare(b.member.name)
    })

    setMembers({
      online:  withPresence.filter(m => m.presence === 'online'),
      idle:    withPresence.filter(m => m.presence === 'unavailable'),
      offline: withPresence.filter(m => m.presence === 'offline'),
      invited,
    })
  }

  const onMembership = (_, member) => {
    if (member.roomId === activeRoomId) loadMembers()
  }

  const onPowerLevel = (_, member) => {
    if (member.roomId === activeRoomId) loadMembers()
  }

  const onPresence = (event, user) => {
    const currentRoom = matrixClient.getRoom(activeRoomId)
    if (!currentRoom) return
    if (currentRoom.getMember(user.userId)) loadMembers()
  }

  loadMembers()

  matrixClient.on('RoomMember.membership', onMembership)
  matrixClient.on('RoomMember.powerLevel', onPowerLevel)
  matrixClient.on('User.presence', onPresence)

  return () => {
    matrixClient.off('RoomMember.membership', onMembership)
    matrixClient.off('RoomMember.powerLevel', onPowerLevel)
    matrixClient.off('User.presence', onPresence)
  }
}, [matrixClient, activeRoomId])

  function getAvatarColor(userId) {
    const colors = ['#5865f2','#eb459e','#3ba55c','#faa61a','#ed4245','#00b0f4']
    let hash = 0
    for (const c of (userId || '')) hash = (hash * 31 + c.charCodeAt(0)) & 0xffffffff
    return colors[Math.abs(hash) % colors.length]
  }

  function getInitials(name) {
    return (name || '?').slice(0, 2).toUpperCase()
  }

  function statusColor(presence) {
    return presence === 'online' ? '#3ba55c'
         : presence === 'unavailable' ? '#faa61a'
         : '#747f8d'
  }

  function MemberEntry({ member, presence }) {
    const displayName = member.name || member.userId.split(':')[0].slice(1)
    const isAdmin = member.powerLevel >= 100
    const isMod   = member.powerLevel >= 50 && member.powerLevel < 100

    return (
      <div
        style={{
          display: 'flex', alignItems: 'center', gap: '8px',
          padding: '4px 8px', borderRadius: '4px', cursor: 'pointer',
          transition: 'background 0.1s',
        }}
        onMouseEnter={e => e.currentTarget.style.background = '#35373c'}
        onMouseLeave={e => e.currentTarget.style.background = 'transparent'}
        title={member.userId}
      >
        {/* Avatar mit Status-Dot */}
        <div style={{ position: 'relative', flexShrink: 0 }}>
          <div style={{
            width: '28px', height: '28px', borderRadius: '50%',
            background: getAvatarColor(member.userId),
            display: 'flex', alignItems: 'center', justifyContent: 'center',
            color: '#fff', fontWeight: 700, fontSize: '11px',
            opacity: presence === 'offline' ? 0.4 : 1,
          }}>
            {getInitials(displayName)}
          </div>
          <div style={{
            position: 'absolute', bottom: '-1px', right: '-1px',
            width: '9px', height: '9px', borderRadius: '50%',
            background: statusColor(presence),
            border: '2px solid var(--dc-bg-2)',
          }} />
        </div>

        {/* Name + Rolle */}
        <div style={{ flex: 1, minWidth: 0 }}>
          <div style={{
            fontSize: '13px', fontWeight: 500,
            color: presence === 'offline' ? 'var(--dc-text-muted)' : 'var(--dc-text-2)',
            overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap',
            display: 'flex', alignItems: 'center', gap: '4px',
          }}>
            {displayName}
            {isAdmin && (
              <span style={{
                fontSize: '10px', background: 'rgba(237,66,69,0.2)',
                color: '#ed4245', borderRadius: '3px', padding: '0 4px',
                fontWeight: 600, flexShrink: 0,
              }}>ADMIN</span>
            )}
            {isMod && (
              <span style={{
                fontSize: '10px', background: 'rgba(88,101,242,0.2)',
                color: '#5865f2', borderRadius: '3px', padding: '0 4px',
                fontWeight: 600, flexShrink: 0,
              }}>MOD</span>
            )}
          </div>
        </div>
      </div>
    )
  }

  function Section({ title, items, presence }) {
    if (!items || items.length === 0) return null
    return (
      <div style={{ marginBottom: '8px' }}>
        <div style={{
          padding: '16px 8px 4px',
          color: 'var(--dc-text-muted)', fontSize: '11px',
          fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.5px',
        }}>
          {title} — {items.length}
        </div>
        {items.map(({ member, presence: p }) => (
          <MemberEntry key={member.userId} member={member} presence={p ?? presence} />
        ))}
      </div>
    )
  }

  if (!activeRoomId) {
    return (
      <div style={{
        width: '240px', background: 'var(--dc-bg-2)',
        flexShrink: 0, display: 'flex', alignItems: 'center',
        justifyContent: 'center',
      }}>
        <span style={{ color: 'var(--dc-text-muted)', fontSize: '13px' }}>–</span>
      </div>
    )
  }

  const hasMembers = members.online || members.idle || members.offline

  return (
    <div style={{
      width: '240px', background: 'var(--dc-bg-2)',
      flexShrink: 0, display: 'flex', flexDirection: 'column',
      borderLeft: '1px solid var(--dc-bg-1)',
    }}>
      {/* Header */}
      <div style={{
        height: '48px', padding: '0 12px',
        borderBottom: '1px solid var(--dc-bg-1)',
        display: 'flex', alignItems: 'center',
        color: 'var(--dc-text-1)', fontWeight: 600, fontSize: '14px',
        flexShrink: 0,
      }}>
        Mitglieder
      </div>

      {/* Liste */}
      <div style={{ flex: 1, overflowY: 'auto', padding: '0 8px 8px' }}>
        {!hasMembers && (
          <div style={{ padding: '16px 8px', color: 'var(--dc-text-muted)', fontSize: '13px' }}>
            Lade Mitglieder…
          </div>
        )}
        {hasMembers && (
          <>
            <Section title="Online"   items={members.online} />
            <Section title="Abwesend" items={members.idle} />
            <Section title="Offline"  items={members.offline} />
            {members.invited?.length > 0 && (
              <Section
                title="Eingeladen"
                items={members.invited.map(m => ({ member: m, presence: 'offline' }))}
              />
            )}
          </>
        )}
      </div>
    </div>
  )
}