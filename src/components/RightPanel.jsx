import { useApp } from '../context'
import { modeColor, getMatchPhase, getMatchCountdown, phaseColor } from '../utils'

/* ── local helpers ── */
const pad = n => String(n).padStart(2, '0')

function scheduledTime(ts) {
  const d = new Date(ts)
  let h = d.getHours()
  const m = pad(d.getMinutes())
  const ap = h >= 12 ? 'PM' : 'AM'
  h = h % 12 || 12
  const day = d.getDate()
  const mons = ['Jan','Feb','Mar','Apr','May','Jun','Jul','Aug','Sep','Oct','Nov','Dec']
  return { time: `${h}:${m} ${ap}`, date: `${day} ${mons[d.getMonth()]}` }
}

function cdText(ms) {
  if (ms <= 0) return null
  const h = Math.floor(ms / 3600000)
  const m = Math.floor((ms % 3600000) / 60000)
  const s = Math.floor((ms % 60000) / 1000)
  return `${pad(h)}:${pad(m)}:${pad(s)}`
}

const notifStyle = {
  room:   { color: '#06d6f0', icon: 'fa-solid fa-key',       bg: 'rgba(6,214,240,0.1)' },
  result: { color: '#4ade80', icon: 'fa-solid fa-trophy',     bg: 'rgba(74,222,128,0.1)' },
  match:  { color: '#fbbf24', icon: 'fa-solid fa-gamepad',    bg: 'rgba(251,191,36,0.1)' },
  wallet: { color: '#4ade80', icon: 'fa-solid fa-wallet',     bg: 'rgba(74,222,128,0.1)' },
  system: { color: '#94a3b8', icon: 'fa-solid fa-circle-info', bg: 'rgba(148,163,184,0.08)' },
}

/* ── component ── */
export default function RightPanel() {
  const { state, dispatch, navigate } = useApp()
  const { matches, notifications, users, rightPanelOpen, currentUser } = state

  if (!currentUser) return null

  const joined = matches.filter(m => m.participants?.includes(currentUser.id) && m.status !== 'completed')
  const online = users.filter(u => u.online && !u.banned)
  const unread = notifications.filter(n => !n.read).length

  return (
    <>
      {/* ── Backdrop ── */}
      <div
        onClick={() => dispatch({ type: 'TOGGLE_RIGHT_PANEL' })}
        style={{
          display: rightPanelOpen ? 'block' : 'none',
          position: 'fixed',
          inset: 0,
          zIndex: 1100,
          background: 'rgba(0,0,0,0.55)',
          backdropFilter: 'blur(4px)',
          WebkitBackdropFilter: 'blur(4px)',
        }}
      />

      {/* ── Panel ── */}
      <aside style={{
        position: 'fixed',
        top: 0,
        right: 0,
        bottom: 0,
        width: 340,
        maxWidth: '92vw',
        zIndex: 1200,
        background: 'linear-gradient(180deg, rgba(10,10,30,0.98) 0%, rgba(8,8,22,0.99) 100%)',
        backdropFilter: 'blur(30px)',
        WebkitBackdropFilter: 'blur(30px)',
        borderLeft: '1px solid rgba(6,214,240,0.08)',
        display: 'flex',
        flexDirection: 'column',
        transform: rightPanelOpen ? 'translateX(0)' : 'translateX(100%)',
        transition: 'transform 0.35s cubic-bezier(0.4,0,0.2,1)',
        boxShadow: rightPanelOpen ? '-12px 0 50px rgba(0,0,0,0.6), -1px 0 0 rgba(6,214,240,0.06)' : 'none',
        paddingTop: 'env(safe-area-inset-top, 0px)',
        paddingBottom: 'env(safe-area-inset-bottom, 0px)',
        overflow: 'hidden',
      }}>

        {/* ═══ Header ═══ */}
        <div style={{
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          padding: '16px 18px',
          borderBottom: '1px solid rgba(255,255,255,0.05)',
          flexShrink: 0,
        }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
            <div style={{
              width: 34, height: 34, borderRadius: 9,
              background: 'rgba(6,214,240,0.1)',
              border: '1px solid rgba(6,214,240,0.15)',
              display: 'flex', alignItems: 'center', justifyContent: 'center',
            }}>
              <i className="fa-solid fa-bolt" style={{ color: '#06d6f0', fontSize: 14 }} />
            </div>
            <span style={{
              fontFamily: "'Exo 2', sans-serif",
              fontSize: 16, fontWeight: 700, color: '#f1f5f9',
            }}>
              Activity
            </span>
          </div>
          <button
            onClick={() => dispatch({ type: 'TOGGLE_RIGHT_PANEL' })}
            aria-label="Close panel"
            style={{
              width: 34, height: 34, borderRadius: 9,
              background: 'rgba(255,255,255,0.05)',
              border: '1px solid rgba(255,255,255,0.07)',
              color: '#64748b', cursor: 'pointer',
              display: 'flex', alignItems: 'center', justifyContent: 'center',
              fontSize: 14,
            }}
          >
            <i className="fa-solid fa-xmark" />
          </button>
        </div>

        {/* ═══ Joined Matches ═══ */}
        <div style={{
          flexShrink: 0,
          maxHeight: 240,
          overflowY: 'auto',
          borderBottom: '1px solid rgba(255,255,255,0.04)',
        }}>
          <div style={{
            padding: '14px 18px 8px',
            fontFamily: "'Exo 2', sans-serif",
            fontSize: 11, fontWeight: 700,
            color: '#64748b', letterSpacing: 1.5, textTransform: 'uppercase',
            display: 'flex', alignItems: 'center', gap: 8,
          }}>
            Joined Matches
            <span style={{
              background: 'rgba(6,214,240,0.12)', color: '#06d6f0',
              padding: '2px 9px', borderRadius: 10, fontSize: 10,
              fontFamily: "'Orbitron', monospace", fontWeight: 600,
            }}>
              {joined.length}
            </span>
          </div>

          {joined.length === 0 ? (
            <div style={{
              padding: '10px 18px 18px',
              fontSize: 13, color: '#475569',
              fontFamily: "'Rajdhani', sans-serif", fontWeight: 500,
            }}>
              No matches joined yet
            </div>
          ) : (
            <div style={{ padding: '0 10px 12px' }}>
              {joined.map(m => {
                const phase = getMatchPhase(m)
                const cd = getMatchCountdown(m)
                const st = scheduledTime(new Date(m.startTime.replace(' ', 'T')).toLocaleString())
                const mc = modeColor(m.mode)

                return (
                  <div
                    key={m.id}
                    onClick={() => {
                      navigate(`match-detail/${m.id}`)
                      dispatch({ type: 'TOGGLE_RIGHT_PANEL' })
                    }}
                    style={{
                      display: 'flex', alignItems: 'center', gap: 12,
                      padding: '10px 8px', borderRadius: 10,
                      cursor: 'pointer',
                    }}
                  >
                    {/* Mode icon */}
                    <div style={{
                      width: 38, height: 38, borderRadius: 10, flexShrink: 0,
                      background: mc + '15',
                      border: `1px solid ${mc}20`,
                      display: 'flex', alignItems: 'center', justifyContent: 'center',
                    }}>
                      <i className="fa-solid fa-gamepad" style={{ fontSize: 14, color: mc }} />
                    </div>

                    {/* Info */}
                    <div style={{ flex: 1, minWidth: 0 }}>
                      <div style={{
                        fontFamily: "'Exo 2', sans-serif",
                        fontSize: 13, fontWeight: 600, color: '#f1f5f9',
                        whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis',
                      }}>
                        {m.title}
                      </div>

                      {/* Scheduled time */}
                      <div style={{
                        display: 'flex', alignItems: 'center', gap: 8,
                        marginTop: 3,
                      }}>
                        <span style={{
                          fontFamily: "'Rajdhani', sans-serif",
                          fontSize: 12, fontWeight: 500, color: '#94a3b8',
                        }}>
                          <i className="fa-regular fa-clock" style={{ fontSize: 10, marginRight: 3, color: '#64748b' }} />
                          {st.time} · {st.date}
                        </span>

                        {/* Phase badge */}
                        {phase === 'live' ? (
                          <span style={{
                            display: 'inline-flex', alignItems: 'center', gap: 4,
                            fontSize: 10, fontWeight: 700, color: '#4ade80',
                            fontFamily: "'Orbitron', monospace",
                            letterSpacing: 0.5,
                          }}>
                            <span style={{
                              width: 5, height: 5, borderRadius: '50%',
                              background: '#4ade80',
                              animation: 'pulse 1.5s infinite',
                            }} />
                            LIVE
                          </span>
                        ) : phase === 'upcoming' && cd > 0 ? (
                          <span style={{
                            fontFamily: "'Orbitron', monospace",
                            fontSize: 10, fontWeight: 600,
                            color: '#60a5fa', letterSpacing: 0.3,
                          }}>
                            {cdText(cd)}
                          </span>
                        ) : phase === 'room_open' ? (
                          <span style={{
                            fontFamily: "'Orbitron', monospace",
                            fontSize: 10, fontWeight: 600,
                            color: '#06d6f0', letterSpacing: 0.3,
                          }}>
                            ROOM OPEN
                          </span>
                        ) : null}
                      </div>
                    </div>
                  </div>
                )
              })}
            </div>
          )}
        </div>

        {/* ═══ Notifications ═══ */}
        <div style={{
          flexShrink: 0,
          maxHeight: 260,
          overflowY: 'auto',
          borderBottom: '1px solid rgba(255,255,255,0.04)',
        }}>
          <div style={{
            padding: '14px 18px 8px',
            fontFamily: "'Exo 2', sans-serif",
            fontSize: 11, fontWeight: 700,
            color: '#64748b', letterSpacing: 1.5, textTransform: 'uppercase',
            display: 'flex', alignItems: 'center', gap: 8,
          }}>
            Notifications
            {unread > 0 && (
              <span style={{
                background: 'linear-gradient(135deg, #ef4444, #dc2626)',
                color: '#fff', padding: '2px 9px', borderRadius: 10,
                fontSize: 10, fontFamily: "'Orbitron', monospace", fontWeight: 700,
                boxShadow: '0 2px 8px rgba(239,68,68,0.3)',
              }}>
                {unread}
              </span>
            )}
          </div>

          <div style={{ padding: '0 10px 12px' }}>
            {notifications.length === 0 ? (
              <div style={{
                padding: '10px 8px 16px',
                fontSize: 13, color: '#475569',
                fontFamily: "'Rajdhani', sans-serif", fontWeight: 500,
              }}>
                No notifications yet
              </div>
            ) : (
              notifications.slice(0, 6).map(n => {
                const ns = notifStyle[n.type] || notifStyle.system
                return (
                  <div
                    key={n.id}
                    onClick={() => {
                      dispatch({ type: 'MARK_NOTIFICATION_READ', payload: n.id })
                      navigate('notifications')
                      dispatch({ type: 'TOGGLE_RIGHT_PANEL' })
                    }}
                    style={{
                      display: 'flex', gap: 10,
                      padding: '10px 8px', borderRadius: 10,
                      cursor: 'pointer',
                      background: n.read ? 'transparent' : 'rgba(255,255,255,0.02)',
                      borderLeft: n.read ? '2px solid transparent' : `2px solid ${ns.color}40`,
                      marginBottom: 2,
                    }}
                  >
                    {/* Icon */}
                    <div style={{
                      width: 28, height: 28, borderRadius: 8, flexShrink: 0,
                      background: ns.bg,
                      display: 'flex', alignItems: 'center', justifyContent: 'center',
                    }}>
                      <i className={ns.icon} style={{ fontSize: 11, color: ns.color }} />
                    </div>

                    {/* Text */}
                    <div style={{ flex: 1, minWidth: 0 }}>
                      <div style={{
                        fontSize: 12, lineHeight: 1.4,
                        color: n.read ? '#64748b' : '#cbd5e1',
                        fontFamily: "'Rajdhani', sans-serif", fontWeight: 500,
                        display: '-webkit-box',
                        WebkitLineClamp: 2,
                        WebkitBoxOrient: 'vertical',
                        overflow: 'hidden',
                      }}>
                        {n.text}
                      </div>
                      <div style={{
                        fontSize: 10, color: '#475569', marginTop: 2,
                        fontFamily: "'Rajdhani', sans-serif", fontWeight: 400,
                      }}>
                        {typeof n.time === 'string' ? n.time : 'just now'}
                      </div>
                    </div>
                  </div>
                )
              })
            )}
          </div>
        </div>

        {/* ═══ Online Users ═══ */}
        <div style={{ flex: 1, overflowY: 'auto', minHeight: 0 }}>
          <div style={{
            padding: '14px 18px 8px',
            fontFamily: "'Exo 2', sans-serif",
            fontSize: 11, fontWeight: 700,
            color: '#64748b', letterSpacing: 1.5, textTransform: 'uppercase',
            display: 'flex', alignItems: 'center', gap: 8,
          }}>
            Online
            <span style={{
              display: 'inline-flex', alignItems: 'center', gap: 5,
              color: '#4ade80', fontSize: 12,
              fontFamily: "'Orbitron', monospace", fontWeight: 600,
            }}>
              <span style={{
                width: 6, height: 6, borderRadius: '50%', background: '#4ade80',
                boxShadow: '0 0 6px rgba(74,222,128,0.5)',
              }} />
              {online.length}
            </span>
          </div>

          <div style={{ padding: '0 10px 20px' }}>
            {online.length === 0 ? (
              <div style={{
                padding: '10px 8px 16px',
                fontSize: 13, color: '#475569',
                fontFamily: "'Rajdhani', sans-serif", fontWeight: 500,
              }}>
                Nobody online
              </div>
            ) : (
              online.slice(0, 10).map(u => (
                <div
                  key={u.id}
                  style={{
                    display: 'flex', alignItems: 'center', gap: 10,
                    padding: '7px 8px', borderRadius: 8,
                  }}
                >
                  {/* Avatar */}
                  <div style={{ position: 'relative', flexShrink: 0 }}>
                    {u.avatar ? (
                      <img
                        src={u.avatar}
                        alt={u.name}
                        loading="lazy"
                        style={{ width: 32, height: 32, borderRadius: 8, objectFit: 'cover' }}
                      />
                    ) : (
                      <div style={{
                        width: 32, height: 32, borderRadius: 8,
                        background: 'linear-gradient(135deg, rgba(6,214,240,0.15), rgba(167,139,250,0.15))',
                        border: '1px solid rgba(255,255,255,0.07)',
                        display: 'flex', alignItems: 'center', justifyContent: 'center',
                        fontFamily: "'Exo 2', sans-serif", fontSize: 13, fontWeight: 700, color: '#a78bfa',
                      }}>
                        {u.name?.charAt(0)?.toUpperCase() || '?'}
                      </div>
                    )}
                    <div style={{
                      position: 'absolute', bottom: -1, right: -1,
                      width: 10, height: 10, borderRadius: '50%',
                      background: '#4ade80',
                      border: '2px solid rgba(10,10,30,0.95)',
                    }} />
                  </div>

                  {/* Name */}
                  <div style={{ flex: 1, minWidth: 0 }}>
                    <div style={{
                      fontFamily: "'Exo 2', sans-serif",
                      fontSize: 12, fontWeight: 600, color: '#e2e8f0',
                      whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis',
                    }}>
                      {u.name}
                    </div>
                    {u.ign && (
                      <div style={{
                        fontSize: 10, color: '#475569',
                        fontFamily: "'Rajdhani', sans-serif", fontWeight: 400,
                        whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis',
                      }}>
                        {u.ign}
                      </div>
                    )}
                  </div>
                </div>
              ))
            )}
          </div>
        </div>

      </aside>
    </>
  )
}