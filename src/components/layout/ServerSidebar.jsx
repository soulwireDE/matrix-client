import { useEffect, useState } from 'react'
import useAppStore from '../../store/useAppStore'

function SpaceIcon({ space, isActive, onClick }) {
  const [hovered, setHovered] = useState(false)
  const name = space === '__all__' ? 'Alle' : (space.name || '?')
  const initial = name.slice(0, 2).toUpperCase()

  const isRound = !isActive && !hovered

  function getColor(id) {
    const colors = ['#5865f2','#eb459e','#3ba55c','#faa61a','#ed4245','#00b0f4','#9b59b6']
    let hash = 0
    for (const c of (id || '')) hash = (hash * 31 + c.charCodeAt(0)) & 0xffffffff
    return colors[Math.abs(hash) % colors.length]
  }

  const bg = space === '__all__' ? '#5865f2' : getColor(space.roomId)

  return (
    <div style={{ position: 'relative', display: 'flex', alignItems: 'center' }}>
      {/* Aktiv-Indikator links */}
      <div style={{
        position: 'absolute', left: '-8px',
        width: '4px', borderRadius: '0 2px 2px 0',
        background: '#fff',
        height: isActive ? '36px' : hovered ? '20px' : '0',
        transition: 'height 0.15s',
      }} />

      <div
        onClick={onClick}
        onMouseEnter={() => setHovered(true)}
        onMouseLeave={() => setHovered(false)}
        title={name}
        style={{
          width: '44px', height: '44px',
          borderRadius: isRound ? '50%' : '14px',
          background: bg,
          display: 'flex', alignItems: 'center', justifyContent: 'center',
          color: '#fff', fontWeight: 700, fontSize: '15px',
          cursor: 'pointer',
          transition: 'border-radius 0.15s, filter 0.15s',
          filter: isActive ? 'brightness(1)' : hovered ? 'brightness(1.1)' : 'brightness(0.85)',
          flexShrink: 0,
          userSelect: 'none',
        }}
      >
        {initial}
      </div>
    </div>
  )
}

export default function ServerSidebar() {
  const { matrixClient, rooms, activeSpaceId, setActiveSpaceId, setActiveRoomId } = useAppStore()
  const [spaces, setSpaces] = useState([])

useEffect(() => {
  if (!matrixClient) return

  const loadSpaces = () => {
    const allRooms = matrixClient.getRooms()
    const spaceRooms = allRooms.filter(r => {
      const creation = r.currentState?.getStateEvents('m.room.create', '')
      return creation?.getContent()?.type === 'm.space'
    })
    setSpaces(spaceRooms)
  }

  loadSpaces()

  const onSync = (state) => {
    if (state === 'PREPARED' || state === 'SYNCING') loadSpaces()
  }

  matrixClient.on('sync', onSync)
  return () => matrixClient.off('sync', onSync)  // ← off statt removeAllListeners
}, [matrixClient])

  function handleSpaceClick(spaceId) {
    setActiveSpaceId(spaceId === activeSpaceId ? null : spaceId)
    setActiveRoomId(null)
  }

  return (
    <div style={{
      width: '68px', background: 'var(--dc-bg-1)',
      display: 'flex', flexDirection: 'column',
      alignItems: 'center', padding: '8px 0', gap: '8px',
      flexShrink: 0, overflowY: 'auto', overflowX: 'visible',
    }}>
      {/* Alle Räume Button */}
      <SpaceIcon
        space="__all__"
        isActive={activeSpaceId === null}
        onClick={() => { setActiveSpaceId(null); setActiveRoomId(null) }}
      />

      {/* Trennlinie */}
      <div style={{ width: '32px', height: '2px', background: 'var(--dc-bg-2)', borderRadius: '1px', flexShrink: 0 }} />

      {/* Spaces */}
      {spaces.map(space => (
        <SpaceIcon
          key={space.roomId}
          space={space}
          isActive={activeSpaceId === space.roomId}
          onClick={() => handleSpaceClick(space.roomId)}
        />
      ))}

      {/* Trennlinie falls Spaces vorhanden */}
      {spaces.length > 0 && (
        <div style={{ width: '32px', height: '2px', background: 'var(--dc-bg-2)', borderRadius: '1px', flexShrink: 0 }} />
      )}

      {/* Neuen Space erstellen */}
      <div
        title="Neuen Space erstellen"
        style={{
          width: '44px', height: '44px', borderRadius: '50%',
          background: 'var(--dc-bg-2)',
          display: 'flex', alignItems: 'center', justifyContent: 'center',
          color: '#3ba55c', fontWeight: 300, fontSize: '24px',
          cursor: 'pointer', flexShrink: 0,
          transition: 'border-radius 0.15s, background 0.15s',
        }}
        onMouseEnter={e => {
          e.currentTarget.style.borderRadius = '14px'
          e.currentTarget.style.background = '#3ba55c'
          e.currentTarget.style.color = '#fff'
        }}
        onMouseLeave={e => {
          e.currentTarget.style.borderRadius = '50%'
          e.currentTarget.style.background = 'var(--dc-bg-2)'
          e.currentTarget.style.color = '#3ba55c'
        }}
      >
        +
      </div>
    </div>
  )
}