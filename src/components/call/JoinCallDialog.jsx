import { useState } from 'react'

export default function JoinCallDialog({ open, onClose, onJoin }) {
  const [mode, setMode] = useState('voice')

  if (!open) return null

  return (
    <div style={backdropStyle} onMouseDown={onClose}>
      <div style={dialogStyle} onMouseDown={(e) => e.stopPropagation()}>
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: '12px' }}>
          <div style={{ color: 'var(--dc-text-1)', fontWeight: 700, fontSize: '14px' }}>Call beitreten</div>
          <button style={iconBtnStyle} onClick={onClose} title="Schließen">
            ✕
          </button>
        </div>

        <div style={{ marginTop: '12px', color: 'var(--dc-text-muted)', fontSize: '13px' }}>
          Wähle, wie du teilnehmen möchtest.
        </div>

        <div style={{ display: 'flex', gap: '10px', marginTop: '12px' }}>
          <ModeButton label="Voice" selected={mode === 'voice'} onClick={() => setMode('voice')} />
          <ModeButton label="Video" selected={mode === 'video'} onClick={() => setMode('video')} />
        </div>

        <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '10px', marginTop: '16px' }}>
          <button style={secondaryBtn} onClick={onClose}>
            Abbrechen
          </button>
          <button
            style={primaryBtn}
            onClick={() => onJoin(mode)}
          >
            Beitreten
          </button>
        </div>
      </div>
    </div>
  )
}

function ModeButton({ label, selected, onClick }) {
  return (
    <button
      onClick={onClick}
      style={{
        flex: 1,
        background: selected ? 'rgba(88, 101, 242, 0.18)' : 'var(--dc-bg-4)',
        border: selected ? '1px solid rgba(88, 101, 242, 0.45)' : '1px solid rgba(255,255,255,0.06)',
        borderRadius: '8px',
        padding: '12px 10px',
        cursor: 'pointer',
        color: selected ? 'var(--dc-text-1)' : 'var(--dc-text-2)',
        fontWeight: 700,
        fontSize: '13px',
      }}
    >
      {label}
    </button>
  )
}

const backdropStyle = {
  position: 'fixed',
  inset: 0,
  background: 'rgba(0,0,0,0.55)',
  display: 'flex',
  alignItems: 'center',
  justifyContent: 'center',
  zIndex: 50,
}

const dialogStyle = {
  width: '420px',
  maxWidth: 'calc(100vw - 32px)',
  background: 'var(--dc-bg-2)',
  border: '1px solid rgba(255,255,255,0.08)',
  borderRadius: '12px',
  padding: '14px',
  boxShadow: '0 18px 50px rgba(0,0,0,0.45)',
}

const iconBtnStyle = {
  width: '30px',
  height: '30px',
  borderRadius: '6px',
  border: 'none',
  cursor: 'pointer',
  background: 'transparent',
  color: 'var(--dc-text-muted)',
  fontSize: '16px',
}

const primaryBtn = {
  background: 'var(--dc-accent)',
  border: 'none',
  color: '#fff',
  borderRadius: '8px',
  padding: '10px 12px',
  cursor: 'pointer',
  fontWeight: 800,
}

const secondaryBtn = {
  background: 'transparent',
  border: '1px solid rgba(255,255,255,0.12)',
  color: 'var(--dc-text-2)',
  borderRadius: '8px',
  padding: '10px 12px',
  cursor: 'pointer',
  fontWeight: 700,
}

