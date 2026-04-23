import { useApp } from '../context'

const ICONS = {
  success: 'fa-solid fa-circle-check',
  error:   'fa-solid fa-circle-xmark',
  info:    'fa-solid fa-circle-info',
  warning: 'fa-solid fa-triangle-exclamation',
  live:    'fa-solid fa-circle-play',
}

const COLORS = {
  success: { bg: 'rgba(34,197,94,0.1)',   border: 'rgba(34,197,94,0.25)',  text: '#4ade80', glow: 'rgba(34,197,94,0.15)' },
  error:   { bg: 'rgba(239,68,68,0.1)',    border: 'rgba(239,68,68,0.25)',  text: '#f87171', glow: 'rgba(239,68,68,0.15)' },
  info:    { bg: 'rgba(6,214,240,0.08)',    border: 'rgba(6,214,240,0.2)',   text: '#06d6f0', glow: 'rgba(6,214,240,0.12)' },
  warning: { bg: 'rgba(251,191,36,0.1)',   border: 'rgba(251,191,36,0.25)', text: '#fbbf24', glow: 'rgba(251,191,36,0.15)' },
  live:    { bg: 'rgba(239,68,68,0.08)',    border: 'rgba(239,68,68,0.2)',   text: '#f87171', glow: 'rgba(239,68,68,0.1)' },
}

const MAX_VISIBLE = 3

export default function Toast() {
  const { state } = useApp()
  const { toasts } = state

  if (!toasts || toasts.length === 0) return null

  /* Only show newest MAX_VISIBLE — older ones silently disappear */
  const visible = toasts.slice(-MAX_VISIBLE)

  return (
    <div
      aria-live="polite"
      aria-atomic="false"
      style={{
        position: 'fixed',
        top: 12,
        right: 12,
        left: 12,
        zIndex: 9000,
        display: 'flex',
        flexDirection: 'column',
        gap: 8,
        pointerEvents: 'none',
        paddingTop: 'env(safe-area-inset-top, 0px)',
      }}
    >
      {visible.map(t => {
        const c = COLORS[t.type] || COLORS.info
        const isLive = t.type === 'live'

        /* ── LIVE: compact pill ── */
        if (isLive) {
          return (
            <div
              key={t.id}
              style={{
                display: 'flex',
                alignItems: 'center',
                gap: 8,
                padding: '8px 14px',
                background: 'rgba(239,68,68,0.1)',
                backdropFilter: 'blur(16px)',
                WebkitBackdropFilter: 'blur(16px)',
                border: '1px solid rgba(239,68,68,0.2)',
                borderRadius: 10,
                pointerEvents: 'auto',
                animation: t.removing
                  ? 'toastOut 0.25s ease forwards'
                  : 'toastIn 0.3s cubic-bezier(0.4,0,0.2,1) forwards',
                opacity: t.removing ? 1 : 0,
                transform: t.removing ? 'translateY(0)' : 'translateY(-12px)',
                maxWidth: 420,
                marginLeft: 'auto',
              }}
            >
              <span style={{
                width: 6, height: 6, borderRadius: '50%',
                background: '#f87171',
                animation: 'pulse 1.2s infinite',
                flexShrink: 0,
              }} />
              <span style={{
                fontSize: 12, fontWeight: 600,
                fontFamily: "'Rajdhani', sans-serif",
                color: '#fca5a5',
                lineHeight: 1.3,
                flex: 1,
              }}>
                {t.message}
              </span>
            </div>
          )
        }

        /* ── NORMAL: full card ── */
        return (
          <div
            key={t.id}
            style={{
              display: 'flex',
              alignItems: 'center',
              gap: 10,
              padding: '12px 16px',
              background: c.bg,
              backdropFilter: 'blur(20px)',
              WebkitBackdropFilter: 'blur(20px)',
              border: `1px solid ${c.border}`,
              borderRadius: 12,
              boxShadow: `0 4px 20px ${c.glow}`,
              pointerEvents: 'auto',
              animation: t.removing
                ? 'toastOut 0.3s ease forwards'
                : 'toastIn 0.35s cubic-bezier(0.4,0,0.2,1) forwards',
              opacity: t.removing ? 1 : 0,
              transform: t.removing ? 'translateY(0)' : 'translateY(-14px)',
              maxWidth: 400,
              marginLeft: 'auto',
            }}
          >
            {/* Icon */}
            <div style={{
              width: 28, height: 28, borderRadius: 8, flexShrink: 0,
              background: c.bg,
              border: `1px solid ${c.border}`,
              display: 'flex', alignItems: 'center', justifyContent: 'center',
            }}>
              <i
                className={ICONS[t.type] || ICONS.info}
                style={{ fontSize: 13, color: c.text }}
              />
            </div>

            {/* Message */}
            <span style={{
              flex: 1,
              fontSize: 13, fontWeight: 600,
              fontFamily: "'Rajdhani', sans-serif",
              color: c.text,
              lineHeight: 1.35,
            }}>
              {t.message}
            </span>

            {/* Progress tick — visual auto-dismiss hint */}
            {!t.removing && (
              <div style={{
                width: 4, borderRadius: 2, flexShrink: 0,
                background: c.border,
                overflow: 'hidden', height: 20,
              }}>
                <div style={{
                  width: '100%', height: '100%',
                  background: c.text,
                  borderRadius: 2,
                  animation: 'toastProgress 3s linear forwards',
                }} />
              </div>
            )}
          </div>
        )
      })}

      <style>{`
        @keyframes toastIn {
          0% { transform: translateY(-14px); opacity: 0; }
          100% { transform: translateY(0); opacity: 1; }
        }
        @keyframes toastOut {
          0% { transform: translateY(0); opacity: 1; }
          100% { transform: translateY(-10px); opacity: 0; }
        }
        @keyframes toastProgress {
          0% { height: 100%; }
          100% { height: 0%; }
        }
        @keyframes pulse {
          0%, 100% { opacity: 1; }
          50% { opacity: 0.3; }
        }
      `}</style>
    </div>
  )
}