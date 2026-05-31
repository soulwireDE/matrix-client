import { useMemo } from 'react'
import {
  LiveKitRoom,
  RoomAudioRenderer,
  ParticipantTile,
  TrackLoop,
  useTracks,
  VideoTrack,
  useMediaDeviceSelect,
  useTrackToggle,
  useConnectionState,
} from '@livekit/components-react'
import { ConnectionState, Track } from 'livekit-client'

function CallGrid({ joinMode }) {
  const tracks = useTracks([
    {
      source: joinMode === 'video' ? Track.Source.Camera : Track.Source.Audio,
      withPlaceholder: true,
    },
  ])

  return (
    <div
      style={{
        flex: 1,
        minHeight: 0,
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

function CallPanelBody({ joinMode, onLeave }) {
  const connectionState = useConnectionState()
  const connected = connectionState === ConnectionState.Connected

  const micDevices = useMediaDeviceSelect({ kind: 'audioinput', requestPermissions: true })
  const camDevices = useMediaDeviceSelect({ kind: 'videoinput', requestPermissions: true })
  const micToggle = useTrackToggle({ source: Track.Source.Microphone })
  const camToggle = useTrackToggle({ source: Track.Source.Camera })

  return (
    <>
      <div style={topBarStyle}>
        <div style={{ color: 'var(--dc-text-1)', fontWeight: 700, fontSize: '13px', flexShrink: 0 }}>
          {connected ? 'Im Call' : 'Verbinde…'}
        </div>

        <div style={controlsRowStyle}>
          <label style={deviceLabelStyle}>
            Mikro
            <select
              value={micDevices.activeDeviceId || ''}
              onChange={(e) => micDevices.setActiveMediaDevice(e.target.value)}
              style={selectStyle}
              disabled={!connected}
            >
              {micDevices.devices.map((d) => (
                <option key={d.deviceId} value={d.deviceId}>
                  {d.label || `Mikrofon ${d.deviceId.slice(0, 6)}`}
                </option>
              ))}
            </select>
          </label>

          {joinMode === 'video' && (
            <label style={deviceLabelStyle}>
              Kamera
              <select
                value={camDevices.activeDeviceId || ''}
                onChange={(e) => camDevices.setActiveMediaDevice(e.target.value)}
                style={selectStyle}
                disabled={!connected}
              >
                {camDevices.devices.map((d) => (
                  <option key={d.deviceId} value={d.deviceId}>
                    {d.label || `Kamera ${d.deviceId.slice(0, 6)}`}
                  </option>
                ))}
              </select>
            </label>
          )}

          <button
            type="button"
            {...micToggle.buttonProps}
            style={toggleBtnStyle}
            title="Mikrofon an/aus"
          >
            {micToggle.enabled ? 'Mic an' : 'Mic aus'}
          </button>

          {joinMode === 'video' && (
            <button
              type="button"
              {...camToggle.buttonProps}
              style={toggleBtnStyle}
              title="Kamera an/aus"
            >
              {camToggle.enabled ? 'Cam an' : 'Cam aus'}
            </button>
          )}

          <button type="button" style={leaveBtnStyle} onClick={onLeave} title="Call verlassen">
            Leave
          </button>
        </div>
      </div>

      <RoomAudioRenderer />
      <CallGrid joinMode={joinMode} />
    </>
  )
}

export default function LiveKitCallPanel({ livekitUrl, token, joinMode, onLeave }) {
  const connectOpts = useMemo(() => ({ autoSubscribe: true }), [])

  if (!livekitUrl || !token) return null

  return (
    <div style={panelStyle}>
      <LiveKitRoom
        serverUrl={livekitUrl}
        token={token}
        connect={true}
        options={connectOpts}
        audio={true}
        video={joinMode === 'video'}
        style={{ display: 'flex', flexDirection: 'column', height: '100%', minHeight: 0 }}
      >
        <CallPanelBody joinMode={joinMode} onLeave={onLeave} />
      </LiveKitRoom>
    </div>
  )
}

const panelStyle = {
  height: '320px',
  background: 'rgba(0,0,0,0.12)',
  borderBottom: '1px solid var(--dc-bg-1)',
  display: 'flex',
  flexDirection: 'column',
  flexShrink: 0,
  minHeight: 0,
  position: 'relative',
  zIndex: 30,
  isolation: 'isolate',
}

const topBarStyle = {
  display: 'flex',
  flexDirection: 'column',
  gap: '8px',
  padding: '8px 12px',
  borderBottom: '1px solid rgba(255,255,255,0.06)',
  flexShrink: 0,
  background: 'var(--dc-bg-2)',
}

const controlsRowStyle = {
  display: 'flex',
  flexWrap: 'wrap',
  alignItems: 'flex-end',
  gap: '8px',
}

const deviceLabelStyle = {
  display: 'flex',
  flexDirection: 'column',
  gap: '4px',
  color: 'var(--dc-text-muted)',
  fontSize: '11px',
  fontWeight: 600,
  minWidth: '140px',
  flex: '1 1 140px',
  maxWidth: '220px',
}

const selectStyle = {
  background: 'var(--dc-bg-4)',
  border: '1px solid rgba(255,255,255,0.12)',
  borderRadius: '6px',
  color: 'var(--dc-text-1)',
  padding: '6px 8px',
  fontSize: '12px',
  cursor: 'pointer',
  width: '100%',
}

const toggleBtnStyle = {
  background: 'var(--dc-bg-4)',
  border: '1px solid rgba(255,255,255,0.12)',
  color: 'var(--dc-text-1)',
  borderRadius: '6px',
  padding: '7px 10px',
  cursor: 'pointer',
  fontWeight: 700,
  fontSize: '12px',
  flexShrink: 0,
}

const leaveBtnStyle = {
  background: 'rgba(237,66,69,0.18)',
  border: '1px solid rgba(237,66,69,0.35)',
  color: 'var(--dc-text-1)',
  borderRadius: '6px',
  padding: '7px 10px',
  cursor: 'pointer',
  fontWeight: 800,
  fontSize: '12px',
  flexShrink: 0,
  marginLeft: 'auto',
}
