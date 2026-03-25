// src/components/verification/VerificationBanner.jsx
export default function VerificationBanner({ userId, onStartVerification, onDismiss }) {
  const name = userId.split(':')[0].slice(1)

  return (
    <div style={{
      margin: '12px 16px',
      padding: '12px 16px',
      background: 'rgba(88,101,242,0.1)',
      border: '1px solid rgba(88,101,242,0.3)',
      borderRadius: '8px',
      display: 'flex', alignItems: 'center', gap: '12px',
    }}>
      <span style={{ fontSize: '20px' }}>🔐</span>
      <div style={{ flex: 1 }}>
        <div style={{ color: 'var(--dc-text-1)', fontSize: '13px', fontWeight: 600 }}>
          Diesen Chat verifizieren
        </div>
        <div style={{ color: 'var(--dc-text-muted)', fontSize: '12px' }}>
          Verifiziere {name}'s Gerät um sicherzustellen dass niemand mitlest.
        </div>
      </div>
      <button
        onClick={onStartVerification}
        style={{
          padding: '6px 14px',
          background: 'var(--dc-accent)',
          border: 'none', borderRadius: '5px',
          color: '#fff', fontSize: '12px',
          fontWeight: 600, cursor: 'pointer',
          whiteSpace: 'nowrap',
        }}
      >
        Jetzt verifizieren
      </button>
      <span
        onClick={onDismiss}
        style={{ cursor: 'pointer', color: 'var(--dc-text-muted)', fontSize: '18px' }}
      >
        ✕
      </span>
    </div>
  )
}