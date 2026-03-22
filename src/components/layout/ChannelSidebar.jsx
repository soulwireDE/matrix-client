import { useEffect } from "react";
import useAppStore from "../../store/useAppStore";
import { clearSession } from '../../store/sessionStore'

export default function ChannelSidebar() {
    const {
        matrixClient,
        rooms,
        setRooms,
        activeRoomId,
        setActiveRoomId,
        currentUser,
        activeSpaceId,
    } = useAppStore();


useEffect(() => {
  if (!matrixClient) return

  const onSync = (state) => {
    if (state === 'PREPARED' || state === 'SYNCING') loadRooms()
  }

  const loadRooms = () => {
    const allRooms = matrixClient.getRooms()

    const nonSpaceRooms = allRooms.filter(r => {
      const creation = r.currentState?.getStateEvents('m.room.create', '')
      return creation?.getContent()?.type !== 'm.space'
    })

    if (!activeSpaceId) {
      setRooms(nonSpaceRooms)
      return
    }

    const space = matrixClient.getRoom(activeSpaceId)
    if (!space) { setRooms(nonSpaceRooms); return }

    const childEvents = space.currentState?.getStateEvents('m.space.child') || []
    const childIds = new Set(
      (Array.isArray(childEvents) ? childEvents : [childEvents])
        .map(e => e.getStateKey())
        .filter(Boolean)
    )

    const filtered = nonSpaceRooms.filter(r => childIds.has(r.roomId))
    setRooms(filtered)
  }

  loadRooms()
  matrixClient.on('sync', onSync)

  return () => matrixClient.off('sync', onSync)
}, [matrixClient, activeSpaceId])

    const initials = currentUser?.userId?.slice(1, 3).toUpperCase() || "?";

    return (
        <div
            style={{
                width: "220px",
                background: "var(--dc-bg-2)",
                display: "flex",
                flexDirection: "column",
                flexShrink: 0,
            }}
        >
            {/* Server Header */}
            <div
                style={{
                    padding: "0 16px",
                    height: "48px",
                    borderBottom: "1px solid var(--dc-bg-1)",
                    display: "flex",
                    alignItems: "center",
                    color: "var(--dc-text-1)",
                    fontWeight: 700,
                    fontSize: "15px",
                    cursor: "pointer",
                    flexShrink: 0,
                }}
            >
                Matrix Client
            </div>

            {/* Kanal-Liste */}
            <div style={{ flex: 1, overflowY: "auto", padding: "8px 0" }}>
                <div
                    style={{
                        padding: "16px 16px 4px",
                        color: "var(--dc-text-muted)",
                        fontSize: "11px",
                        fontWeight: 600,
                        textTransform: "uppercase",
                        letterSpacing: "0.5px",
                    }}
                >
                    Räume — {rooms.length}
                </div>

                {rooms.length === 0 && (
                    <div
                        style={{
                            padding: "8px 16px",
                            color: "var(--dc-text-muted)",
                            fontSize: "13px",
                        }}
                    >
                        Lade Räume…
                    </div>
                )}

                {rooms.map((room) => {
                    const isActive = room.roomId === activeRoomId;
                    const unread = room.getUnreadNotificationCount?.() || 0;

                    return (
                        <div
                            key={room.roomId}
                            onClick={() => setActiveRoomId(room.roomId)}
                            style={{
                                display: "flex",
                                alignItems: "center",
                                gap: "6px",
                                padding: "5px 8px 5px 16px",
                                margin: "1px 8px",
                                borderRadius: "4px",
                                cursor: "pointer",
                                background: isActive
                                    ? "var(--dc-bg-4)"
                                    : "transparent",
                                color: isActive
                                    ? "var(--dc-text-1)"
                                    : "var(--dc-text-muted)",
                                transition: "background 0.1s",
                            }}
                            onMouseEnter={(e) => {
                                if (!isActive)
                                    e.currentTarget.style.background =
                                        "#35373c";
                            }}
                            onMouseLeave={(e) => {
                                if (!isActive)
                                    e.currentTarget.style.background =
                                        "transparent";
                            }}
                        >
                            <span
                                style={{
                                    fontSize: "16px",
                                    opacity: 0.5,
                                    flexShrink: 0,
                                }}
                            >
                                #
                            </span>
                            <span
                                style={{
                                    flex: 1,
                                    overflow: "hidden",
                                    textOverflow: "ellipsis",
                                    whiteSpace: "nowrap",
                                    fontSize: "14px",
                                }}
                            >
                                {room.name || room.roomId}
                            </span>
                            {unread > 0 && (
                                <span
                                    style={{
                                        background: "var(--dc-red)",
                                        color: "#fff",
                                        borderRadius: "10px",
                                        padding: "0 5px",
                                        fontSize: "11px",
                                        fontWeight: 700,
                                        flexShrink: 0,
                                    }}
                                >
                                    {unread}
                                </span>
                            )}
                        </div>
                    );
                })}
            </div>

            {/* User Bar unten */}
            <div style={{
            padding: '8px', background: 'var(--dc-bg-1)',
            display: 'flex', alignItems: 'center', gap: '8px', flexShrink: 0,
            }}>

  <div style={{
    width: '32px', height: '32px', borderRadius: '50%',
    background: 'var(--dc-accent)', display: 'flex',
    alignItems: 'center', justifyContent: 'center',
    color: '#fff', fontWeight: 700, fontSize: '12px', flexShrink: 0,
    position: 'relative',
  }}>
    {initials}
    <div style={{
      position: 'absolute', bottom: '-1px', right: '-1px',
      width: '10px', height: '10px', borderRadius: '50%',
      background: 'var(--dc-green)', border: '2px solid var(--dc-bg-1)',
    }} />
  </div>

  <div style={{ overflow: 'hidden', flex: 1 }}>
    <div style={{
      color: 'var(--dc-text-1)', fontSize: '13px',
      fontWeight: 500, overflow: 'hidden',
      textOverflow: 'ellipsis', whiteSpace: 'nowrap',
    }}>
      {currentUser?.userId?.split(':')[0].slice(1) || 'User'}
    </div>
    <div style={{ color: 'var(--dc-text-muted)', fontSize: '11px' }}>Online</div>
  </div>

  {/* Einstellungen */}
  <div
    title="Einstellungen"
    style={{
      width: '28px', height: '28px', borderRadius: '4px',
      display: 'flex', alignItems: 'center', justifyContent: 'center',
      cursor: 'pointer', color: 'var(--dc-text-muted)', fontSize: '16px',
      flexShrink: 0,
    }}
    onMouseEnter={e => {
      e.currentTarget.style.background = 'rgba(255,255,255,0.1)'
      e.currentTarget.style.color = 'var(--dc-text-1)'
    }}
    onMouseLeave={e => {
      e.currentTarget.style.background = 'transparent'
      e.currentTarget.style.color = 'var(--dc-text-muted)'
    }}
  >
    ⚙
  </div>


 {/* Logout */}
  <div
    title="Abmelden"
    onClick={async () => {
      const { clearSession } = await import('../../store/sessionStore')
      await clearSession()
      useAppStore.getState().matrixClient?.stopClient()
      useAppStore.getState().setLoggedIn(false)
      useAppStore.getState().setMatrixClient(null)
    }}
    style={{
      width: '28px', height: '28px', borderRadius: '4px',
      display: 'flex', alignItems: 'center', justifyContent: 'center',
      cursor: 'pointer', color: 'var(--dc-text-muted)', fontSize: '16px',
      flexShrink: 0,
    }}
    onMouseEnter={e => {
      e.currentTarget.style.background = 'rgba(237,66,69,0.2)'
      e.currentTarget.style.color = 'var(--dc-red)'
    }}
    onMouseLeave={e => {
      e.currentTarget.style.background = 'transparent'
      e.currentTarget.style.color = 'var(--dc-text-muted)'
    }}
  >
    ⏻
  </div>
</div>
</div>
    );
}
