import { useState } from 'react'
import { useApp } from '../context'
import { formatTK, formatTKShort } from '../utils'

export default function Profile() {
  const { state, dispatch, navigate } = useApp()
  const { currentUser, matches } = state

  const [editing, setEditing] = useState(false)
  const [editName, setEditName] = useState('')
  const [editIgn, setEditIgn] = useState('')

  if (!currentUser) return null

  const myMatches = matches.filter(m => m.participants?.includes(currentUser.id))
  const winRate = currentUser.matchesPlayed > 0
    ? Math.round((currentUser.wins / currentUser.matchesPlayed) * 100)
    : 0
  const kd = currentUser.matchesPlayed > 0
    ? (currentUser.kills / currentUser.matchesPlayed).toFixed(2)
    : '0.00'

  const startEdit = () => {
    setEditName(currentUser.displayName || currentUser.name)
    setEditIgn(currentUser.ign)
    setEditing(true)
  }

  const saveEdit = () => {
    if (!editName.trim()) return
    dispatch({
      type: 'UPDATE_PROFILE',
      payload: { name: editName.trim(), displayName: editName.trim(), ign: editIgn.trim() },
    })
    setEditing(false)
  }

  const handleAvatarChange = (e) => {
    const file = e.target.files?.[0]
    if (!file) return
    if (file.size > 2 * 1024 * 1024) return
    const reader = new FileReader()
    reader.onload = (ev) => {
      dispatch({ type: 'SET_AVATAR', payload: ev.target.result })
    }
    reader.readAsDataURL(file)
  }

  const handleLogout = () => {
    dispatch({ type: 'LOGOUT' })
    window.location.hash = 'login'
  }

  const roleLabel = currentUser.role === 'owner' ? '👑 OWNER' : currentUser.role === 'admin' ? '🛡️ ADMIN' : '🎮 PLAYER'
  const roleColor = currentUser.role === 'owner' ? '#fbbf24' : currentUser.role === 'admin' ? '#ef4444' : '#00f0ff'
  const roleBg = currentUser.role === 'owner' ? 'rgba(251,191,36,0.12)' : currentUser.role === 'admin' ? 'rgba(239,68,68,0.1)' : 'rgba(0,240,255,0.1)'

  const stats = [
    { label: 'Matches', value: currentUser.matchesPlayed, icon: 'fa-solid fa-gamepad', color: '#6c8cff', bg: 'rgba(108,140,255,0.1)' },
    { label: 'Wins', value: currentUser.wins, icon: 'fa-solid fa-trophy', color: '#fbbf24', bg: 'rgba(251,191,36,0.1)' },
    { label: 'Kills', value: currentUser.kills, icon: 'fa-solid fa-crosshairs', color: '#ef4444', bg: 'rgba(239,68,68,0.1)' },
    { label: 'Win Rate', value: `${winRate}%`, icon: 'fa-solid fa-chart-line', color: '#22c55e', bg: 'rgba(34,197,94,0.1)' },
    { label: 'K/D', value: kd, icon: 'fa-solid fa-skull-crossbones', color: '#a78bfa', bg: 'rgba(167,139,250,0.1)' },
    { label: 'Earnings', value: formatTKShort(currentUser.earnings), icon: 'fa-solid fa-coins', color: '#fbbf24', bg: 'rgba(251,191,36,0.1)' },
  ]

  return (
    <div style={{ padding: '0 0 80px 0' }}>

      {/* ===== PROFILE HEADER CARD ===== */}
      <div style={{
        position: 'relative', borderRadius: 24, overflow: 'hidden',
        marginBottom: 24,
        background: 'linear-gradient(135deg, rgba(0,240,255,0.08), rgba(167,139,250,0.06)), linear-gradient(180deg, rgba(15,15,35,0.95), rgba(10,10,25,0.98))',
        border: '1px solid rgba(255,255,255,0.06)',
      }}>
        {/* Top gradient line */}
        <div style={{
          height: 3,
          background: 'linear-gradient(90deg, transparent, #00f0ff, #a78bfa, transparent)',
          backgroundSize: '200% 100%', animation: 'shimmer 3s linear infinite',
        }}></div>

        {/* Decorative circles */}
        <div style={{
          position: 'absolute', top: -40, right: -40,
          width: 180, height: 180, borderRadius: '50%',
          background: 'rgba(0,240,255,0.03)', filter: 'blur(30px)',
        }}></div>
        <div style={{
          position: 'absolute', bottom: -30, left: -30,
          width: 120, height: 120, borderRadius: '50%',
          background: 'rgba(167,139,250,0.03)', filter: 'blur(20px)',
        }}></div>

        <div style={{ position: 'relative', padding: '32px 24px 28px' }}>
          {/* Avatar + Name */}
          <div style={{ display: 'flex', alignItems: 'center', gap: 20, marginBottom: 20 }}>
            {/* Avatar */}
            <div style={{ position: 'relative', flexShrink: 0 }}>
              {currentUser.avatar ? (
                <img
                  src={currentUser.avatar}
                  alt="Avatar"
                  style={{
                    width: 80, height: 80, borderRadius: 20,
                    objectFit: 'cover',
                    border: '2px solid rgba(0,240,255,0.2)',
                    boxShadow: '0 8px 32px rgba(0,240,255,0.15)',
                  }}
                />
              ) : (
                <div style={{
                  width: 80, height: 80, borderRadius: 20,
                  background: 'linear-gradient(135deg, rgba(0,240,255,0.15), rgba(167,139,250,0.1))',
                  border: '2px solid rgba(0,240,255,0.2)',
                  boxShadow: '0 8px 32px rgba(0,240,255,0.15)',
                  display: 'flex', alignItems: 'center', justifyContent: 'center',
                  fontFamily: 'var(--font-heading)', fontSize: 32, fontWeight: 800,
                  color: '#00f0ff',
                }}>
                  {(currentUser.displayName || currentUser.name).charAt(0).toUpperCase()}
                </div>
              )}

              {/* Online dot */}
              <div style={{
                position: 'absolute', bottom: 2, right: 2,
                width: 16, height: 16, borderRadius: '50%',
                background: '#22c55e',
                border: '3px solid rgba(10,10,25,0.9)',
              }}></div>

              {/* Upload button */}
              <label style={{
                position: 'absolute', bottom: -4, left: '50%', transform: 'translateX(-50%)',
                width: 28, height: 28, borderRadius: 8,
                background: 'linear-gradient(135deg, #6c8cff, #a78bfa)',
                border: '2px solid rgba(10,10,25,0.9)',
                display: 'flex', alignItems: 'center', justifyContent: 'center',
                cursor: 'pointer',
                boxShadow: '0 4px 12px rgba(108,140,255,0.3)',
                transition: 'transform 0.2s ease',
              }}
              onMouseEnter={e => e.currentTarget.style.transform = 'translateX(-50%) scale(1.1)'}
              onMouseLeave={e => e.currentTarget.style.transform = 'translateX(-50%) scale(1)'}
              >
                <i className="fa-solid fa-camera" style={{ fontSize: 11, color: '#fff' }}></i>
                <input type="file" accept="image/*" onChange={handleAvatarChange} style={{ display: 'none' }} />
              </label>
            </div>

            {/* Name + Info */}
            <div style={{ flex: 1, minWidth: 0 }}>
              {editing ? (
                <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
                  <input
                    value={editName}
                    onChange={e => setEditName(e.target.value)}
                    placeholder="Display Name"
                    style={{
                      padding: '8px 12px', borderRadius: 8,
                      border: '1px solid rgba(0,240,255,0.3)',
                      background: 'rgba(0,240,255,0.05)',
                      color: '#fff', fontFamily: 'var(--font-heading)', fontSize: 15, fontWeight: 700,
                      outline: 'none',
                    }}
                  />
                  <input
                    value={editIgn}
                    onChange={e => setEditIgn(e.target.value)}
                    placeholder="In-Game Name"
                    style={{
                      padding: '8px 12px', borderRadius: 8,
                      border: '1px solid rgba(167,139,250,0.3)',
                      background: 'rgba(167,139,250,0.05)',
                      color: '#fff', fontFamily: 'var(--font-display)', fontSize: 13, fontWeight: 600,
                      outline: 'none',
                    }}
                  />
                  <div style={{ display: 'flex', gap: 8 }}>
                    <button onClick={saveEdit} style={{
                      padding: '6px 16px', borderRadius: 8, border: 'none',
                      background: 'linear-gradient(135deg, #22c55e, #16a34a)',
                      color: '#fff', fontFamily: 'var(--font-display)', fontSize: 11,
                      fontWeight: 700, cursor: 'pointer',
                    }}>
                      <i className="fa-solid fa-check" style={{ marginRight: 4 }}></i> Save
                    </button>
                    <button onClick={() => setEditing(false)} style={{
                      padding: '6px 16px', borderRadius: 8,
                      border: '1px solid rgba(255,255,255,0.1)',
                      background: 'rgba(255,255,255,0.04)',
                      color: 'var(--text-muted, #888)', fontFamily: 'var(--font-display)', fontSize: 11,
                      fontWeight: 600, cursor: 'pointer',
                    }}>
                      Cancel
                    </button>
                  </div>
                </div>
              ) : (
                <>
                  <h1 style={{
                    fontFamily: 'var(--font-heading)', fontSize: 24, fontWeight: 800,
                    color: '#fff', margin: '0 0 4px', lineHeight: 1.2,
                    whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis',
                  }}>
                    {currentUser.displayName || currentUser.name}
                  </h1>
                  <div style={{
                    fontFamily: 'var(--font-display)', fontSize: 14, fontWeight: 600,
                    color: '#a78bfa', marginBottom: 6,
                  }}>
                    {currentUser.ign}
                  </div>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 8, flexWrap: 'wrap' }}>
                    <span style={{
                      padding: '3px 10px', borderRadius: 6, fontSize: 10,
                      fontFamily: 'var(--font-display)', fontWeight: 700,
                      background: roleBg,
                      color: roleColor,
                      letterSpacing: 0.5, textTransform: 'uppercase',
                    }}>
                      {roleLabel}
                    </span>
                    <span style={{
                      padding: '3px 10px', borderRadius: 6, fontSize: 10,
                      fontFamily: 'var(--font-body)',
                      background: 'rgba(255,255,255,0.04)',
                      color: 'var(--text-muted, #666)',
                    }}>
                      @{currentUser.username}
                    </span>
                  </div>
                </>
              )}
            </div>
          </div>

          {/* Quick info row */}
          <div style={{
            display: 'flex', gap: 12, flexWrap: 'wrap',
            paddingTop: 16,
            borderTop: '1px solid rgba(255,255,255,0.04)',
          }}>
            {[
              { label: 'Balance', value: formatTK(currentUser.balance), color: '#fbbf24', icon: 'fa-solid fa-wallet' },
              { label: 'Joined', value: myMatches.length + ' matches', color: '#6c8cff', icon: 'fa-solid fa-calendar-check' },
              { label: 'Member Since', value: currentUser.createdAt || 'N/A', color: 'var(--text-muted, #777)', icon: 'fa-solid fa-clock' },
            ].map(item => (
              <div key={item.label} style={{
                display: 'flex', alignItems: 'center', gap: 8,
                padding: '8px 14px', borderRadius: 10,
                background: 'rgba(255,255,255,0.03)',
                border: '1px solid rgba(255,255,255,0.04)',
              }}>
                <i className={item.icon} style={{ fontSize: 12, color: item.color, opacity: 0.7 }}></i>
                <div>
                  <div style={{ fontSize: 9, color: 'var(--text-muted, #555)', fontFamily: 'var(--font-heading)', letterSpacing: 0.5, textTransform: 'uppercase' }}>
                    {item.label}
                  </div>
                  <div style={{
                    fontSize: item.label === 'Balance' ? 14 : 12,
                    fontWeight: item.label === 'Balance' ? 800 : 600,
                    fontFamily: item.label === 'Balance' ? 'var(--font-display)' : 'var(--font-body)',
                    color: item.color,
                  }}>
                    {item.value}
                  </div>
                </div>
              </div>
            ))}
          </div>

          {/* Edit button */}
          {!editing && (
            <div style={{ marginTop: 16, display: 'flex', gap: 10 }}>
              <button
                onClick={startEdit}
                style={{
                  padding: '10px 20px', borderRadius: 10,
                  border: '1px solid rgba(0,240,255,0.2)',
                  background: 'rgba(0,240,255,0.08)',
                  color: '#00f0ff', fontFamily: 'var(--font-display)', fontSize: 12,
                  fontWeight: 700, cursor: 'pointer',
                  display: 'flex', alignItems: 'center', gap: 6,
                  transition: 'all 0.2s ease',
                }}
                onMouseEnter={e => e.currentTarget.style.background = 'rgba(0,240,255,0.12)'}
                onMouseLeave={e => e.currentTarget.style.background = 'rgba(0,240,255,0.08)'}
              >
                <i className="fa-solid fa-pen"></i> Edit Profile
              </button>
              <button
                onClick={() => navigate('settings')}
                style={{
                  padding: '10px 20px', borderRadius: 10,
                  border: '1px solid rgba(255,255,255,0.08)',
                  background: 'rgba(255,255,255,0.03)',
                  color: 'var(--text-muted, #777)', fontFamily: 'var(--font-display)', fontSize: 12,
                  fontWeight: 600, cursor: 'pointer',
                  display: 'flex', alignItems: 'center', gap: 6,
                }}
              >
                <i className="fa-solid fa-gear"></i> Settings
              </button>
            </div>
          )}
        </div>
      </div>

      {/* ===== STATS GRID ===== */}
      <div style={{
        display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: 10, marginBottom: 24,
      }}>
        {stats.map(s => (
          <div key={s.label} style={{
            padding: '16px 14px', borderRadius: 14,
            background: 'rgba(255,255,255,0.02)',
            border: '1px solid rgba(255,255,255,0.05)',
            textAlign: 'center',
            transition: 'all 0.3s ease',
          }}
          onMouseEnter={e => { e.currentTarget.style.borderColor = s.color + '25'; e.currentTarget.style.boxShadow = `0 4px 16px ${s.color}08` }}
          onMouseLeave={e => { e.currentTarget.style.borderColor = 'rgba(255,255,255,0.05)'; e.currentTarget.style.boxShadow = 'none' }}
          >
            <div style={{
              width: 36, height: 36, borderRadius: 10,
              background: s.bg, margin: '0 auto 8px',
              display: 'flex', alignItems: 'center', justifyContent: 'center',
            }}>
              <i className={s.icon} style={{ fontSize: 15, color: s.color }}></i>
            </div>
            <div style={{
              fontFamily: 'var(--font-display)', fontSize: 20, fontWeight: 800,
              color: s.color, lineHeight: 1.2,
            }}>
              {s.value}
            </div>
            <div style={{
              fontSize: 10, color: 'var(--text-muted, #666)',
              fontFamily: 'var(--font-heading)', letterSpacing: 0.5,
              textTransform: 'uppercase', marginTop: 4,
            }}>
              {s.label}
            </div>
          </div>
        ))}
      </div>

      {/* Responsive stats grid */}
      <style>{`@media(max-width:480px){[style*="grid-template-columns: repeat(3"]{grid-template-columns:repeat(2, 1fr)!important}}`}</style>

      {/* ===== MATCH HISTORY ===== */}
      <div style={{
        borderRadius: 18, overflow: 'hidden', marginBottom: 24,
        background: 'rgba(255,255,255,0.02)',
        border: '1px solid rgba(255,255,255,0.05)',
      }}>
        <div style={{
          display: 'flex', alignItems: 'center', gap: 10,
          padding: '16px 20px',
          borderBottom: '1px solid rgba(255,255,255,0.04)',
        }}>
          <div style={{
            width: 32, height: 32, borderRadius: 8,
            background: 'rgba(108,140,255,0.1)',
            display: 'flex', alignItems: 'center', justifyContent: 'center',
          }}>
            <i className="fa-solid fa-clock-rotate-left" style={{ fontSize: 14, color: '#6c8cff' }}></i>
          </div>
          <h3 style={{ fontFamily: 'var(--font-heading)', fontSize: 15, fontWeight: 700, color: '#fff', margin: 0 }}>
            Match History
            <span style={{ marginLeft: 8, fontSize: 11, color: 'var(--text-muted, #666)', fontFamily: 'var(--font-display)', fontWeight: 600 }}>
              ({myMatches.length})
            </span>
          </h3>
        </div>

        {myMatches.length === 0 ? (
          <div style={{ textAlign: 'center', padding: '40px 20px' }}>
            <i className="fa-solid fa-ghost" style={{ fontSize: 32, color: 'rgba(255,255,255,0.1)', marginBottom: 12, display: 'block' }}></i>
            <p style={{ color: 'var(--text-muted, #555)', fontFamily: 'var(--font-body)', fontSize: 13, margin: 0 }}>
              No matches joined yet
            </p>
          </div>
        ) : (
          <div style={{ padding: '8px 12px' }}>
            {myMatches.map(m => {
              const phaseColors = { live: '#22c55e', upcoming: '#6c8cff', completed: '#64748b' }
              const phaseLabels = { live: 'LIVE', upcoming: 'UPCOMING', completed: 'DONE' }
              return (
                <div
                  key={m.id}
                  onClick={() => navigate(`match-detail/${m.id}`)}
                  style={{
                    display: 'flex', alignItems: 'center', gap: 14,
                    padding: '12px 14px', borderRadius: 12,
                    cursor: 'pointer', transition: 'all 0.2s ease',
                    borderBottom: '1px solid rgba(255,255,255,0.03)',
                  }}
                  onMouseEnter={e => e.currentTarget.style.background = 'rgba(255,255,255,0.03)'}
                  onMouseLeave={e => e.currentTarget.style.background = 'transparent'}
                >
                  {/* Phase dot */}
                  <div style={{
                    width: 8, height: 8, borderRadius: '50%', flexShrink: 0,
                    background: phaseColors[m.status] || '#64748b',
                    boxShadow: m.status === 'live' ? `0 0 8px ${phaseColors[m.status]}66` : 'none',
                    animation: m.status === 'live' ? 'pulse 1.5s infinite' : 'none',
                  }}></div>

                  {/* Info */}
                  <div style={{ flex: 1, minWidth: 0 }}>
                    <div style={{
                      fontFamily: 'var(--font-heading)', fontSize: 13, fontWeight: 600,
                      color: '#fff', marginBottom: 2,
                      whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis',
                    }}>
                      {m.title}
                    </div>
                    <div style={{ fontSize: 10, color: 'var(--text-muted, #555)', fontFamily: 'var(--font-body)' }}>
                      {m.mode} • {m.map} • {formatTK(m.entryFee)}
                    </div>
                  </div>

                  {/* Status badge */}
                  <span style={{
                    padding: '3px 10px', borderRadius: 6, fontSize: 9,
                    fontFamily: 'var(--font-display)', fontWeight: 700,
                    letterSpacing: 0.5, textTransform: 'uppercase',
                    background: (phaseColors[m.status] || '#64748b') + '15',
                    color: phaseColors[m.status] || '#64748b',
                    flexShrink: 0,
                  }}>
                    {m.status === 'live' && <span style={{ display: 'inline-block', width: 4, height: 4, borderRadius: '50%', background: '#22c55e', marginRight: 4, animation: 'pulse 1s infinite', verticalAlign: 'middle' }}></span>}
                    {phaseLabels[m.status] || m.status}
                  </span>

                  {/* Arrow */}
                  <i className="fa-solid fa-chevron-right" style={{ fontSize: 10, color: 'var(--text-muted, #444)', flexShrink: 0 }}></i>
                </div>
              )
            })}
          </div>
        )}
      </div>

      {/* ===== LOGOUT ===== */}
      <button
        onClick={handleLogout}
        style={{
          width: '100%', padding: '14px 0', borderRadius: 14,
          border: '1px solid rgba(239,68,68,0.2)',
          background: 'rgba(239,68,68,0.06)',
          color: '#ef4444',
          fontFamily: 'var(--font-display)', fontSize: 14, fontWeight: 700,
          cursor: 'pointer', transition: 'all 0.3s ease',
          display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 8,
        }}
        onMouseEnter={e => { e.currentTarget.style.background = 'rgba(239,68,68,0.12)'; e.currentTarget.style.borderColor = 'rgba(239,68,68,0.35)' }}
        onMouseLeave={e => { e.currentTarget.style.background = 'rgba(239,68,68,0.06)'; e.currentTarget.style.borderColor = 'rgba(239,68,68,0.2)' }}
      >
        <i className="fa-solid fa-right-from-bracket"></i> Logout
      </button>
    </div>
  )
}