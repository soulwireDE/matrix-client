import { getCurrentWindow } from '@tauri-apps/api/window'
import { useState, useEffect } from 'react'

export default function TitleBar() {
  const [isMaximized, setIsMaximized] = useState(false)
  const appWindow = getCurrentWindow()

  useEffect(() => {
    appWindow.isMaximized().then(setIsMaximized)
    const unlisten = appWindow.onResized(async () => {
      setIsMaximized(await appWindow.isMaximized())
    })
    return () => unlisten.then(f => f())
  }, [])

  return (
    <div
      data-tauri-drag-region
      style={{
        height: '32px',
         width: '100%',
        background: 'var(--dc-bg-1)',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'space-between',
        flexShrink: 0,
        userSelect: 'none',
        WebkitAppRegion: 'drag',
      }}
    >
      {/* App-Name links */}
      <div style={{
        paddingLeft: '12px',
        color: 'var(--dc-text-muted)',
        fontSize: '12px',
        fontWeight: 600,
        letterSpacing: '0.3px',
        WebkitAppRegion: 'drag',
      }}>
        Matrix Client
      </div>

      {/* Fenster-Buttons rechts */}
      <div style={{
        display: 'flex',
        WebkitAppRegion: 'no-drag',
      }}>
        {/* Minimieren */}
        <button
          onClick={() => appWindow.minimize()}
          style={btnStyle}
          onMouseEnter={e => e.currentTarget.style.background = 'rgba(255,255,255,0.1)'}
          onMouseLeave={e => e.currentTarget.style.background = 'transparent'}
          title="Minimieren"
        >
          <svg width="10" height="1" viewBox="0 0 10 1">
            <rect width="10" height="1" fill="currentColor"/>
          </svg>
        </button>

        {/* Maximieren / Wiederherstellen */}
        <button
          onClick={() => isMaximized ? appWindow.unmaximize() : appWindow.maximize()}
          style={btnStyle}
          onMouseEnter={e => e.currentTarget.style.background = 'rgba(255,255,255,0.1)'}
          onMouseLeave={e => e.currentTarget.style.background = 'transparent'}
          title={isMaximized ? 'Wiederherstellen' : 'Maximieren'}
        >
          {isMaximized ? (
            <svg width="10" height="10" viewBox="0 0 10 10">
              <path d="M2 0H10V8H8V10H0V2H2V0ZM8 2V8H2V2H8Z" fill="currentColor"/>
            </svg>
          ) : (
            <svg width="10" height="10" viewBox="0 0 10 10">
              <path d="M0 0H10V10H0V0ZM1 1V9H9V1H1Z" fill="currentColor"/>
            </svg>
          )}
        </button>

        {/* Schließen */}
        <button
          onClick={() => appWindow.close()}
          style={{ ...btnStyle, borderRadius: '0' }}
          onMouseEnter={e => {
            e.currentTarget.style.background = '#ed4245'
            e.currentTarget.style.color = '#fff'
          }}
          onMouseLeave={e => {
            e.currentTarget.style.background = 'transparent'
            e.currentTarget.style.color = 'var(--dc-text-muted)'
          }}
          title="Schließen"
        >
          <svg width="10" height="10" viewBox="0 0 10 10">
            <path d="M1 0L0 1L4 5L0 9L1 10L5 6L9 10L10 9L6 5L10 1L9 0L5 4L1 0Z" fill="currentColor"/>
          </svg>
        </button>
      </div>
    </div>
  )
}

const btnStyle = {
  width: '46px',
  height: '32px',
  background: 'transparent',
  border: 'none',
  color: 'var(--dc-text-muted)',
  cursor: 'pointer',
  display: 'flex',
  alignItems: 'center',
  justifyContent: 'center',
  transition: 'background 0.1s',
  WebkitAppRegion: 'no-drag',
}