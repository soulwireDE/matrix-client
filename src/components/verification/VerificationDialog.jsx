// src/components/verification/VerificationDialog.jsx
import { useEffect, useState } from 'react'
import { VerificationPhase  } from 'matrix-js-sdk/lib/crypto-api'

export default function VerificationDialog({ request, onClose }) {
  const [phase, setPhase] = useState('waiting')  // waiting | showEmojis | done | cancelled
  const [emojis, setEmojis] = useState([])
  const [verifier, setVerifier] = useState(null)

  useEffect(() => {
    if (!request) return

    async function startSAS() {
      try {
        // SAS Verifier starten
        const v = await request.startVerification('m.sas.v1')
        setVerifier(v)

        // Auf Emojis warten
        v.on('show_sas', (sas) => {
          setEmojis(sas.sas.emoji || [])
          setPhase('showEmojis')
        })

        v.on('cancel', () => setPhase('cancelled'))
        v.on('done', () => setPhase('done'))

      } catch (e) {
        console.error('SAS Fehler:', e)
        setPhase('cancelled')
      }
    }

    // Wenn wir die anfragende Seite sind
    if (request.initiatedByMe) {
      startSAS()
    } else {
      // Wir haben die Anfrage empfangen – annehmen
      request.accept().then(() => startSAS())
    }
  }, [request])

  async function confirmEmojis() {
    try {
      await verifier?.confirm()
      setPhase('done')
    } catch (e) {
      console.error('Confirm Fehler:', e)
    }
  }

  async function cancelVerification() {
    try {
      await verifier?.cancel()
      await request?.cancel()
    } catch (e) {}
    onClose()
  }

  return (
    <div style={{
      position: 'fixed', inset: 0, zIndex: 9999,
      background: 'rgba(0,0,0,0.7)',
      display: 'flex', alignItems: 'center', justifyContent: 'center',
    }}>
      <div style={{
        background: 'var(--dc-bg-2)',
        borderRadius: '12px',
        padding: '32px',
        width: '480px',
        maxWidth: '90vw',
        boxShadow: '0 8px 32px rgba(0,0,0,0.4)',
      }}>

        {/* Header */}
        <h2 style={{
          color: 'var(--dc-text-1)', fontSize: '20px',
          fontWeight: 700, marginBottom: '8px', textAlign: 'center',
        }}>
          🔐 Gerät verifizieren
        </h2>

        {/* Wartephase */}
        {phase === 'waiting' && (
          <div style={{ textAlign: 'center', color: 'var(--dc-text-muted)', padding: '24px 0' }}>
            <div style={{ fontSize: '32px', marginBottom: '12px' }}>⏳</div>
            Warte auf Gegenseite…
          </div>
        )}

        {/* Emojis anzeigen */}
        {phase === 'showEmojis' && (
          <>
            <p style={{
              color: 'var(--dc-text-muted)', fontSize: '14px',
              textAlign: 'center', marginBottom: '24px',
            }}>
              Vergleiche diese Emojis mit dem anderen Gerät.<br />
              Stimmen sie überein?
            </p>

            {/* Emoji Grid */}
            <div style={{
              display: 'grid',
              gridTemplateColumns: 'repeat(4, 1fr)',
              gap: '12px',
              marginBottom: '28px',
            }}>
              {emojis.map(([emoji, name], i) => (
                <div key={i} style={{
                  display: 'flex', flexDirection: 'column',
                  alignItems: 'center', gap: '4px',
                  background: 'var(--dc-bg-3)',
                  borderRadius: '8px', padding: '12px 8px',
                }}>
                  <span style={{ fontSize: '28px' }}>{emoji}</span>
                  <span style={{
                    color: 'var(--dc-text-muted)', fontSize: '11px',
                    textTransform: 'capitalize',
                  }}>
                    {name}
                  </span>
                </div>
              ))}
            </div>

            {/* Buttons */}
            <div style={{ display: 'flex', gap: '12px' }}>
              <button
                onClick={cancelVerification}
                style={{
                  flex: 1, padding: '11px',
                  background: 'rgba(237,66,69,0.15)',
                  border: '1px solid var(--dc-red)',
                  borderRadius: '6px',
                  color: 'var(--dc-red)',
                  fontSize: '14px', fontWeight: 600, cursor: 'pointer',
                }}
              >
                ✕ Stimmt nicht
              </button>
              <button
                onClick={confirmEmojis}
                style={{
                  flex: 1, padding: '11px',
                  background: 'var(--dc-accent)',
                  border: 'none', borderRadius: '6px',
                  color: '#fff',
                  fontSize: '14px', fontWeight: 600, cursor: 'pointer',
                }}
              >
                ✓ Stimmt überein
              </button>
            </div>
          </>
        )}

        {/* Erfolg */}
        {phase === 'done' && (
          <div style={{ textAlign: 'center', padding: '24px 0' }}>
            <div style={{ fontSize: '48px', marginBottom: '12px' }}>✅</div>
            <p style={{ color: 'var(--dc-text-1)', fontWeight: 600, marginBottom: '8px' }}>
              Erfolgreich verifiziert!
            </p>
            <p style={{ color: 'var(--dc-text-muted)', fontSize: '13px', marginBottom: '24px' }}>
              Nachrichten sind jetzt Ende-zu-Ende verschlüsselt.
            </p>
            <button
              onClick={onClose}
              style={{
                padding: '10px 32px',
                background: 'var(--dc-accent)',
                border: 'none', borderRadius: '6px',
                color: '#fff', fontSize: '14px',
                fontWeight: 600, cursor: 'pointer',
              }}
            >
              Schließen
            </button>
          </div>
        )}

        {/* Abgebrochen */}
        {phase === 'cancelled' && (
          <div style={{ textAlign: 'center', padding: '24px 0' }}>
            <div style={{ fontSize: '48px', marginBottom: '12px' }}>❌</div>
            <p style={{ color: 'var(--dc-red)', fontWeight: 600, marginBottom: '24px' }}>
              Verifizierung abgebrochen
            </p>
            <button
              onClick={onClose}
              style={{
                padding: '10px 32px',
                background: 'var(--dc-bg-3)',
                border: '1px solid rgba(255,255,255,0.1)',
                borderRadius: '6px',
                color: 'var(--dc-text-1)', fontSize: '14px',
                fontWeight: 600, cursor: 'pointer',
              }}
            >
              Schließen
            </button>
          </div>
        )}

      </div>
    </div>
  )
}