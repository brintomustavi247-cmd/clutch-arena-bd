import { useEffect } from 'react'
import { useApp } from '../context'
import { timeAgo } from '../utils'

export default function Notifications() {
  const { state, dispatch } = useApp()
  const { notifications } = state

  useEffect(() => {
    dispatch({ type: 'MARK_NOTIFICATIONS_READ' })
  }, [dispatch])

  const config = {
    room:   { icon: 'fa-solid fa-key',       color: '#00f0ff', bg: 'rgba(0,240,255,0.1)',    border: 'rgba(0,240,255,0.25)',    label: 'Room' },
    result: { icon: 'fa-solid fa-trophy',     color: '#22c55e', bg: 'rgba(34,197,94,0.1)',    border: 'rgba(34,197,94,0.25)',    label: 'Result' },
    match:  { icon: 'fa-solid fa-gamepad',    color: '#fbbf24', bg: 'rgba(251,191,36,0.1)',   border: 'rgba(251,191,36,0.25)',   label: 'Match' },
    wallet: { icon: 'fa-solid fa-wallet',     color: '#a78bfa', bg: 'rgba(167,139,250,0.1)',  border: 'rgba(167,139,250,0.25)', label: 'Wallet' },
    system: { icon: 'fa-solid fa-circle-info', color: '#64748b', bg: 'rgba(100,116,139,0.08)', border: 'rgba(100,116,139,0.15)', label: 'System' },
  }

  const unread = notifications.filter(n => !n.read).length

  // Group by type
  const grouped = notifications.reduce((acc, n) => {
    const type = n.type || 'system'
    if (!acc[type]) acc[type] = []
    acc[type].push(n)
    return acc
  }, {})

  return (
    <div style={{ padding: '0 0 80px 0' }}>

      {/* ===== PAGE HEADER ===== */}
      <div style={{ marginBottom: 20 }}>
        <h1 style={{
          fontFamily: 'var(--font-heading)', fontSize: 26, fontWeight: 800,
          color: '#fff', margin: '0 0 4px', lineHeight: 1.2,
        }}>
          <i className="fa-solid fa-bell" style={{ marginRight: 10, color: '#00f0ff' }}></i>
          Notifications
        </h1>
        <p style={{ fontSize: 13, color: 'var(--text-muted, #777)', fontFamily: 'var(--font-body)', margin: 0 }}>
          {notifications.length} total • {unread} unread
        </p>
      </div>

      {/* ===== MARK ALL READ INDICATOR ===== */}
      {unread > 0 && (
        <div style={{
          display: 'flex', alignItems: 'center', gap: 10,
          padding: '10px 16px', borderRadius: 12, marginBottom: 18,
          background: 'rgba(0,240,255,0.06)', border: '1px solid rgba(0,240,255,0.15)',
        }}>
          <i className="fa-solid fa-check-double" style={{ color: '#00f0ff', fontSize: 13 }}></i>
          <span style={{ fontSize: 12, color: '#00f0ff', fontFamily: 'var(--font-body)', fontWeight: 600 }}>
            All notifications marked as read
          </span>
        </div>
      )}

      {/* ===== NOTIFICATION LIST ===== */}
      {notifications.length === 0 ? (
        <div style={{
          textAlign: 'center', padding: '60px 20px',
          background: 'rgba(255,255,255,0.02)',
          border: '1px solid rgba(255,255,255,0.05)',
          borderRadius: 18,
        }}>
          <i className="fa-solid fa-bell-slash" style={{ fontSize: 40, color: 'rgba(255,255,255,0.12)', marginBottom: 16, display: 'block' }}></i>
          <p style={{ color: 'var(--text-muted, #555)', fontFamily: 'var(--font-heading)', fontSize: 15, margin: '0 0 6px' }}>
            No notifications yet
          </p>
          <p style={{ color: 'var(--text-muted, #444)', fontFamily: 'var(--font-body)', fontSize: 13, margin: 0 }}>
            They'll appear here when you join matches or get results
          </p>
        </div>
      ) : (
        <div style={{
          borderRadius: 18, overflow: 'hidden',
          background: 'rgba(255,255,255,0.02)',
          border: '1px solid rgba(255,255,255,0.05)',
        }}>
          {notifications.map((n, i) => {
            const cfg = config[n.type] || config.system
            const isLast = i === notifications.length - 1

            return (
              <div
                key={n.id}
                style={{
                  display: 'flex', alignItems: 'flex-start', gap: 14,
                  padding: '16px 18px',
                  borderBottom: isLast ? 'none' : '1px solid rgba(255,255,255,0.04)',
                  background: n.read ? 'transparent' : `${cfg.bg}`,
                  borderLeft: n.read ? '3px solid transparent' : `3px solid ${cfg.border}`,
                  transition: 'all 0.2s ease',
                }}
                onMouseEnter={e => e.currentTarget.style.background = 'rgba(255,255,255,0.03)'}
                onMouseLeave={e => e.currentTarget.style.background = n.read ? 'transparent' : cfg.bg}
              >
                {/* Icon */}
                <div style={{
                  width: 40, height: 40, borderRadius: 12, flexShrink: 0,
                  background: n.read ? 'rgba(255,255,255,0.04)' : cfg.bg,
                  border: `1px solid ${n.read ? 'rgba(255,255,255,0.06)' : cfg.border}`,
                  display: 'flex', alignItems: 'center', justifyContent: 'center',
                }}>
                  <i className={cfg.icon} style={{
                    fontSize: 15,
                    color: n.read ? 'var(--text-muted, #555)' : cfg.color,
                    opacity: n.read ? 0.6 : 1,
                  }}></i>
                </div>

                {/* Content */}
                <div style={{ flex: 1, minWidth: 0 }}>
                  {/* Type label */}
                  <div style={{
                    fontSize: 9, fontWeight: 700, fontFamily: 'var(--font-display)',
                    letterSpacing: 1, textTransform: 'uppercase',
                    color: n.read ? 'var(--text-muted, #555)' : cfg.color,
                    marginBottom: 4, opacity: n.read ? 0.6 : 1,
                  }}>
                    {cfg.label}
                  </div>

                  {/* Message */}
                  <div style={{
                    fontSize: 13, fontWeight: n.read ? 400 : 600,
                    color: n.read ? 'var(--text-muted, #888)' : 'var(--text-primary, #eee)',
                    fontFamily: 'var(--font-body)', lineHeight: 1.5,
                    marginBottom: 4,
                  }}>
                    {n.text}
                  </div>

                  {/* Time */}
                  <div style={{
                    fontSize: 11, color: 'var(--text-muted, #555)',
                    fontFamily: 'var(--font-body)',
                    display: 'flex', alignItems: 'center', gap: 6,
                  }}>
                    <i className="fa-regular fa-clock" style={{ fontSize: 10 }}></i>
                    {typeof n.time === 'string' && (n.time.includes('ago') || n.time.includes('just'))
                      ? n.time
                      : timeAgo(n.time)
                    }
                  </div>
                </div>

                {/* Unread dot */}
                {!n.read && (
                  <div style={{
                    width: 8, height: 8, borderRadius: '50%',
                    background: cfg.color, flexShrink: 0, marginTop: 16,
                    boxShadow: `0 0 8px ${cfg.color}66`,
                    animation: 'pulse 2s infinite',
                  }}></div>
                )}
              </div>
            )
          })}
        </div>
      )}

      {/* ===== TYPE LEGEND ===== */}
      {notifications.length > 0 && (
        <div style={{
          display: 'flex', flexWrap: 'wrap', gap: 12,
          marginTop: 18, padding: '0 4px',
        }}>
          {Object.entries(config).map(([key, cfg]) => {
            const count = grouped[key]?.length || 0
            if (count === 0) return null
            return (
              <div key={key} style={{
                display: 'flex', alignItems: 'center', gap: 6,
                fontSize: 11, color: 'var(--text-muted, #666)', fontFamily: 'var(--font-body)',
              }}>
                <div style={{
                  width: 8, height: 8, borderRadius: 3,
                  background: cfg.color, opacity: 0.7,
                }}></div>
                <span>{cfg.label}</span>
                <span style={{
                  fontFamily: 'var(--font-display)', fontWeight: 700,
                  color: cfg.color, fontSize: 11,
                }}>
                  {count}
                </span>
              </div>
            )
          })}
        </div>
      )}
    </div>
  )
}