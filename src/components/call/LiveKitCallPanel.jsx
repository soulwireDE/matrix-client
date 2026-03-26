import { useMemo, useState } from 'react'
import {
  LiveKitRoom,
  RoomAudioRenderer,
  ControlBar,
  ParticipantTile,
  TrackLoop,
  useTracks,
  VideoTrack,
} from '@livekit/components-react'
import { Track } from 'livekit-client'

function CallGrid({ joinMode }) {
  // Wichtig: `useTracks()` braucht den LiveKitRoom-Context.
  const tracks = useTracks([
    {
      source: joinMode === 'video' ? Track.Source.Camera : Track.Source.Audio,
      // Platzhalter sorgen dafür, dass die UI sofort eine Kachel hat,
      // auch wenn der Track noch nicht "ready" ist.
      withPlaceholder: true,
    },
  ])

  return (
    <div
      style={{
        height: '100%',
        padding: '10px',
        display: 'grid',
        gridTemplateColumns: 'repeat(auto-fill, minmax(180px, 1fr))',
        gap: '10px',
        alignContent: 'start',
        overflow: 'auto',
      }}
    >
      <TrackLoop tracks={tracks}>
        {joinMode === 'video' ? <VideoTrack /> : <ParticipantTile />}
      </TrackLoop>
    </div>
  )
}

export default function LiveKitCallPanel({ livekitUrl, token, joinMode, onLeave }) {
  const [connected, setConnected] = useState(false)

  const connectOpts = useMemo(() => {
    return { autoSubscribe: true }
  }, [])

  if (!livekitUrl || !token) return null

  return (
    <div style={panelStyle}>
      <div style={topBarStyle}>
        <div style={{ color: 'var(--dc-text-1)', fontWeight: 700, fontSize: '13px' }}>
          {connected ? 'Im Call' : 'Verbinde…'}
        </div>
        <button style={leaveBtnStyle} onClick={onLeave} title="Call verlassen">
          Leave
        </button>
      </div>

      <div style={{ flex: 1, minHeight: 0 }}>
        <LiveKitRoom
          serverUrl={livekitUrl}
          token={token}
          connect={true}
          options={connectOpts}
          audio={true}
          video={joinMode === 'video'}
          onConnected={() => {
            setConnected(true)
          }}
          onDisconnected={() => setConnected(false)}
        >
          <RoomAudioRenderer />
          <CallGrid joinMode={joinMode} />
          <div style={{ padding: '0 10px 10px' }}>
            <ControlBar variation="minimal" />
          </div>
        </LiveKitRoom>
      </div>
    </div>
  )
}

const panelStyle = {
  height: '280px',
  background: 'rgba(0,0,0,0.12)',
  borderBottom: '1px solid var(--dc-bg-1)',
  display: 'flex',
  flexDirection: 'column',
  flexShrink: 0,
  minHeight: 0,
}

const topBarStyle = {
  height: '38px',
  display: 'flex',
  alignItems: 'center',
  justifyContent: 'space-between',
  padding: '0 12px',
  borderBottom: '1px solid rgba(255,255,255,0.06)',
}

const leaveBtnStyle = {
  background: 'rgba(237,66,69,0.18)',
  border: '1px solid rgba(237,66,69,0.35)',
  color: 'var(--dc-text-1)',
  borderRadius: '8px',
  padding: '6px 10px',
  cursor: 'pointer',
  fontWeight: 800,
  fontSize: '12px',
}

