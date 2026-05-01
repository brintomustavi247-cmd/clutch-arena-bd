import { useState } from 'react'
import { useApp } from '../context'
import { formatTK, formatTKShort, getEloTier, getTierProgress } from '../utils'

export default function Profile() {
  const { state, dispatch, navigate } = useApp()
  const { currentUser, matches } = state

  const [editing, setEditing] = useState(false)
  const [editName, setEditName] = useState('')
  const [editIgn, setEditIgn] = useState('')

  if (!currentUser) return null

  // ===== ELO RANK LOGIC =====
  const elo = currentUser.elo || 1000
  const tier = getEloTier(elo)
  const tierProgress = getTierProgress(elo)
  const nextTier = tier.max === 9999 ? null : getEloTier(tier.max + 1)
  const pointsToNext = nextTier ? (nextTier.min - elo) : 0

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
    { label: 'ELO', value: elo, icon: 'fa-solid fa-ranking-star', color: tier.color, bg: `${tier.color}15` },
    { label: 'Matches', value: currentUser.matchesPlayed, icon: 'fa-solid fa-gamepad', color: '#6c8cff', bg: 'rgba(108,140,255,0.1)' },
    { label: 'Wins', value: currentUser.wins, icon: 'fa-solid fa-trophy', color: '#fbbf24', bg: 'rgba(251,191,36,0.1)' },
    { label: 'Kills', value: currentUser.kills, icon: 'fa-solid fa-crosshairs', color: '#ef4444', bg: 'rgba(239,68,68,0.1)' },
    { label: 'Win Rate', value: `${winRate}%`, icon: 'fa-solid fa-chart-line', color: '#22c55e', bg: 'rgba(34,197,94,0.1)' },
    { label: 'K/D', value: kd, icon: 'fa-solid fa-skull-crossbones', color: '#a78bfa', bg: 'rgba(167,139,250,0.1)' },
    { label: 'Earnings', value: formatTKShort(currentUser.earnings), icon: 'fa-solid fa-coins', color: '#fbbf24', bg: 'rgba(251,191,36,0.1)' },
  ]

  return (
    <div className="profile-page">

      {/* ===== PROFILE HEADER CARD ===== */}
      <div className="profile-header-card" style={{
        position: 'relative',
        borderRadius: 24,
        overflow: 'hidden',
        marginBottom: 24,
        background: `linear-gradient(135deg, ${tier.color}08, ${tier.color}04), linear-gradient(180deg, #0f0f1f, #0a0a18)`,
        border: `1px solid ${tier.color}20`,
      }}>
        {/* Top gradient line */}
        <div style={{
          height: 3,
          background: `linear-gradient(90deg, transparent, ${tier.color}, transparent)`,
          backgroundSize: '200% 100%',
          animation: 'shimmer 3s linear infinite',
        }} />

        {/* Decorative glow orbs */}
        <div style={{
          position: 'absolute',
          top: -40,
          right: -40,
          width: 180,
          height: 180,
          borderRadius: '50%',
          background: `${tier.color}06`,
          filter: 'blur(40px)',
          pointerEvents: 'none',
        }} />
        <div style={{
          position: 'absolute',
          bottom: -30,
          left: -30,
          width: 120,
          height: 120,
          borderRadius: '50%',
          background: `${tier.color}04`,
          filter: 'blur(30px)',
          pointerEvents: 'none',
        }} />

        <div style={{ position: 'relative', padding: '32px 24px 28px', zIndex: 2 }}>
          {/* Avatar + Name Row */}
          <div style={{ display: 'flex', alignItems: 'center', gap: 20, marginBottom: 20 }}>
            {/* Avatar */}
            <div style={{ position: 'relative', flexShrink: 0 }}>
              {currentUser.avatar ? (
                <img
                  src={currentUser.avatar}
                  alt="Avatar"
                  style={{
                    width: 80,
                    height: 80,
                    borderRadius: 20,
                    objectFit: 'cover',
                    border: `2px solid ${tier.color}50`,
                    boxShadow: `0 8px 32px ${tier.color}30`,
                  }}
                />
              ) : (
                <div style={{
                  width: 80,
                  height: 80,
                  borderRadius: 20,
                  background: `linear-gradient(135deg, ${tier.color}30, ${tier.color}15)`,
                  border: `2px solid ${tier.color}50`,
                  boxShadow: `0 8px 32px ${tier.color}30`,
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  fontFamily: 'var(--font-heading)',
                  fontSize: 32,
                  fontWeight: 800,
                  color: tier.color,
                }}>
                  {(currentUser.displayName || currentUser.name).charAt(0).toUpperCase()}
                </div>
              )}

              {/* Online indicator */}
              <div style={{
                position: 'absolute',
                bottom: 2,
                right: 2,
                width: 16,
                height: 16,
                borderRadius: '50%',
                background: '#22c55e',
                border: '3px solid #0a0a18',
              }} />

              {/* Camera upload button */}
              <label style={{
                position: 'absolute',
                bottom: -4,
                left: '50%',
                transform: 'translateX(-50%)',
                width: 28,
                height: 28,
                borderRadius: 8,
                background: `linear-gradient(135deg, ${tier.color}, ${tier.color}cc)`,
                border: '2px solid #0a0a18',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                cursor: 'pointer',
                boxShadow: `0 4px 12px ${tier.color}50`,
                transition: 'transform 0.2s ease',
              }}
              onMouseEnter={e => e.currentTarget.style.transform = 'translateX(-50%) scale(1.1)'}
              onMouseLeave={e => e.currentTarget.style.transform = 'translateX(-50%) scale(1)'}
              >
                <i className="fa-solid fa-camera" style={{ fontSize: 11, color: '#fff' }} />
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
                      padding: '8px 12px',
                      borderRadius: 8,
                      border: `1px solid ${tier.color}40`,
                      background: `${tier.color}10`,
                      color: '#fff',
                      fontFamily: 'var(--font-heading)',
                      fontSize: 15,
                      fontWeight: 700,
                      outline: 'none',
                    }}
                  />
                  <input
                    value={editIgn}
                    onChange={e => setEditIgn(e.target.value)}
                    placeholder="In-Game Name"
                    style={{
                      padding: '8px 12px',
                      borderRadius: 8,
                      border: '1px solid rgba(167,139,250,0.3)',
                      background: 'rgba(167,139,250,0.08)',
                      color: '#fff',
                      fontFamily: 'var(--font-display)',
                      fontSize: 13,
                      fontWeight: 600,
                      outline: 'none',
                    }}
                  />
                  <div style={{ display: 'flex', gap: 8 }}>
                    <button onClick={saveEdit} style={{
                      padding: '6px 16px',
                      borderRadius: 8,
                      border: 'none',
                      background: 'linear-gradient(135deg, #22c55e, #16a34a)',
                      color: '#fff',
                      fontFamily: 'var(--font-display)',
                      fontSize: 11,
                      fontWeight: 700,
                      cursor: 'pointer',
                    }}>
                      <i className="fa-solid fa-check" style={{ marginRight: 4 }} /> Save
                    </button>
                    <button onClick={() => setEditing(false)} style={{
                      padding: '6px 16px',
                      borderRadius: 8,
                      border: '1px solid rgba(255,255,255,0.1)',
                      background: 'rgba(255,255,255,0.05)',
                      color: 'var(--text-muted, #888)',
                      fontFamily: 'var(--font-display)',
                      fontSize: 11,
                      fontWeight: 600,
                      cursor: 'pointer',
                    }}>
                      Cancel
                    </button>
                  </div>
                </div>
              ) : (
                <>
                  <h1 style={{
                    fontFamily: 'var(--font-heading)',
                    fontSize: 24,
                    fontWeight: 800,
                    color: '#fff',
                    margin: '0 0 4px',
                    lineHeight: 1.2,
                    whiteSpace: 'nowrap',
                    overflow: 'hidden',
                    textOverflow: 'ellipsis',
                  }}>
                    {currentUser.displayName || currentUser.name}
                  </h1>
                  <div style={{
                    fontFamily: 'var(--font-display)',
                    fontSize: 14,
                    fontWeight: 600,
                    color: tier.color,
                    marginBottom: 6,
                  }}>
                    {currentUser.ign}
                  </div>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 8, flexWrap: 'wrap' }}>
                    <span style={{
                      padding: '3px 10px',
                      borderRadius: 6,
                      fontSize: 10,
                      fontFamily: 'var(--font-display)',
                      fontWeight: 700,
                      background: roleBg,
                      color: roleColor,
                      letterSpacing: 0.5,
                      textTransform: 'uppercase',
                    }}>
                      {roleLabel}
                    </span>
                    <span style={{
                      padding: '3px 10px',
                      borderRadius: 6,
                      fontSize: 10,
                      fontFamily: 'var(--font-body)',
                      background: 'rgba(255,255,255,0.05)',
                      color: 'var(--text-muted, #666)',
                    }}>
                      @{currentUser.username}
                    </span>
                  </div>
                </>
              )}
            </div>
          </div>

          {/* ===== RANK BADGE + PROGRESS ===== */}
          <div style={{
            display: 'flex',
            alignItems: 'center',
            gap: 14,
            padding: '14px 16px',
            borderRadius: 12,
            background: `${tier.color}10`,
            border: `1px solid ${tier.color}25`,
            marginBottom: 20,
          }}>
            <div style={{ fontSize: 32, lineHeight: 1 }}>{tier.icon}</div>
            <div style={{ flex: 1 }}>
              <div style={{
                fontSize: 9,
                color: `${tier.color}aa`,
                fontFamily: "'Lexend', sans-serif",
                fontWeight: 700,
                letterSpacing: '0.15em',
                textTransform: 'uppercase',
                marginBottom: 2,
              }}>
                {tier.name} Rank
              </div>
              <div style={{
                fontFamily: "'Inter', sans-serif",
                fontSize: 24,
                fontWeight: 900,
                color: tier.color,
                lineHeight: 1.1,
              }}>
                {elo} <span style={{ fontSize: 11, fontWeight: 600, opacity: 0.6 }}>ELO</span>
              </div>
            </div>
            <div style={{ textAlign: 'right', minWidth: 90 }}>
              <div style={{
                fontSize: 9,
                color: '#555',
                fontFamily: "'Plus Jakarta Sans', sans-serif",
                marginBottom: 6,
                fontWeight: 600,
              }}>
                {pointsToNext > 0 ? `${pointsToNext} pts to ${nextTier.name}` : 'MAX RANK'}
              </div>
              <div style={{
                width: '100%',
                height: 5,
                borderRadius: 99,
                background: '#1a1a2e',
                overflow: 'hidden',
                boxShadow: 'inset 0 1px 3px rgba(0,0,0,0.4)',
              }}>
                <div style={{
                  width: `${tierProgress}%`,
                  height: '100%',
                  background: `linear-gradient(90deg, ${tier.color}, ${tier.color}dd)`,
                  borderRadius: 99,
                  boxShadow: `0 0 8px ${tier.color}60`,
                }} />
              </div>
            </div>
          </div>

          {/* Quick info row */}
          <div style={{
            display: 'flex',
            gap: 12,
            flexWrap: 'wrap',
            paddingTop: 16,
            borderTop: '1px solid rgba(255,255,255,0.06)',
          }}>
            {[
              { label: 'Balance', value: formatTK(currentUser.balance), color: '#fbbf24', icon: 'fa-solid fa-wallet' },
              { label: 'Joined', value: myMatches.length + ' matches', color: tier.color, icon: 'fa-solid fa-calendar-check' },
              { label: 'Member Since', value: currentUser.createdAt ? new Date(currentUser.createdAt).toLocaleDateString('en-US', { month: 'short', year: 'numeric' }) : 'N/A', color: 'var(--text-muted, #777)', icon: 'fa-solid fa-clock' },
            ].map(item => (
              <div key={item.label} style={{
                display: 'flex',
                alignItems: 'center',
                gap: 8,
                padding: '8px 14px',
                borderRadius: 10,
                background: 'rgba(255,255,255,0.04)',
                border: '1px solid rgba(255,255,255,0.06)',
              }}>
                <i className={item.icon} style={{ fontSize: 12, color: item.color, opacity: 0.8 }} />
                <div>
                  <div style={{
                    fontSize: 9,
                    color: 'var(--text-muted, #555)',
                    fontFamily: 'var(--font-heading)',
                    letterSpacing: 0.5,
                    textTransform: 'uppercase',
                  }}>
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

          {/* Edit / Settings buttons */}
          {!editing && (
            <div style={{ marginTop: 16, display: 'flex', gap: 10 }}>
              <button
                onClick={startEdit}
                style={{
                  padding: '10px 20px',
                  borderRadius: 10,
                  border: `1px solid ${tier.color}35`,
                  background: `${tier.color}12`,
                  color: tier.color,
                  fontFamily: 'var(--font-display)',
                  fontSize: 12,
                  fontWeight: 700,
                  cursor: 'pointer',
                  display: 'flex',
                  alignItems: 'center',
                  gap: 6,
                  transition: 'all 0.2s ease',
                }}
                onMouseEnter={e => e.currentTarget.style.background = `${tier.color}1a`}
                onMouseLeave={e => e.currentTarget.style.background = `${tier.color}12`}
              >
                <i className="fa-solid fa-pen" /> Edit Profile
              </button>
              <button
                onClick={() => navigate('settings')}
                style={{
                  padding: '10px 20px',
                  borderRadius: 10,
                  border: '1px solid rgba(255,255,255,0.1)',
                  background: 'rgba(255,255,255,0.04)',
                  color: 'var(--text-muted, #777)',
                  fontFamily: 'var(--font-display)',
                  fontSize: 12,
                  fontWeight: 600,
                  cursor: 'pointer',
                  display: 'flex',
                  alignItems: 'center',
                  gap: 6,
                }}
              >
                <i className="fa-solid fa-gear" /> Settings
              </button>
            </div>
          )}
        </div>
      </div>

      {/* ===== STATS GRID ===== */}
      <div className="profile-stats-grid">
        {stats.map(s => (
          <div key={s.label} className="profile-stat-card" style={{
            padding: '16px 14px',
            borderRadius: 14,
            background: 'rgba(255,255,255,0.03)',
            border: '1px solid rgba(255,255,255,0.06)',
            textAlign: 'center',
            transition: 'all 0.3s ease',
          }}
          onMouseEnter={e => {
            e.currentTarget.style.borderColor = s.color + '30'
            e.currentTarget.style.boxShadow = `0 4px 16px ${s.color}10`
            e.currentTarget.style.background = 'rgba(255,255,255,0.05)'
          }}
          onMouseLeave={e => {
            e.currentTarget.style.borderColor = 'rgba(255,255,255,0.06)'
            e.currentTarget.style.boxShadow = 'none'
            e.currentTarget.style.background = 'rgba(255,255,255,0.03)'
          }}
          >
            <div style={{
              width: 36,
              height: 36,
              borderRadius: 10,
              background: s.bg,
              margin: '0 auto 8px',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
            }}>
              <i className={s.icon} style={{ fontSize: 15, color: s.color }} />
            </div>
            <div style={{
              fontFamily: 'var(--font-display)',
              fontSize: 20,
              fontWeight: 800,
              color: s.color,
              lineHeight: 1.2,
            }}>
              {s.value}
            </div>
            <div style={{
              fontSize: 10,
              color: 'var(--text-muted, #666)',
              fontFamily: 'var(--font-heading)',
              letterSpacing: 0.5,
              textTransform: 'uppercase',
              marginTop: 4,
            }}>
              {s.label}
            </div>
          </div>
        ))}
      </div>

      {/* ===== MATCH HISTORY ===== */}
      <div style={{
        borderRadius: 18,
        overflow: 'hidden',
        marginBottom: 24,
        background: 'rgba(255,255,255,0.03)',
        border: '1px solid rgba(255,255,255,0.06)',
      }}>
        <div style={{
          display: 'flex',
          alignItems: 'center',
          gap: 10,
          padding: '16px 20px',
          borderBottom: '1px solid rgba(255,255,255,0.06)',
        }}>
          <div style={{
            width: 32,
            height: 32,
            borderRadius: 8,
            background: `${tier.color}18`,
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
          }}>
            <i className="fa-solid fa-clock-rotate-left" style={{ fontSize: 14, color: tier.color }} />
          </div>
          <h3 style={{
            fontFamily: 'var(--font-heading)',
            fontSize: 15,
            fontWeight: 700,
            color: '#fff',
            margin: 0,
          }}>
            Match History
            <span style={{
              marginLeft: 8,
              fontSize: 11,
              color: 'var(--text-muted, #666)',
              fontFamily: 'var(--font-display)',
              fontWeight: 600,
            }}>
              ({myMatches.length})
            </span>
          </h3>
        </div>

        {myMatches.length === 0 ? (
          <div style={{ textAlign: 'center', padding: '40px 20px' }}>
            <i className="fa-solid fa-ghost" style={{
              fontSize: 32,
              color: 'rgba(255,255,255,0.1)',
              marginBottom: 12,
              display: 'block',
            }} />
            <p style={{
              color: 'var(--text-muted, #555)',
              fontFamily: 'var(--font-body)',
              fontSize: 13,
              margin: 0,
            }}>
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
                    display: 'flex',
                    alignItems: 'center',
                    gap: 14,
                    padding: '12px 14px',
                    borderRadius: 12,
                    cursor: 'pointer',
                    transition: 'all 0.2s ease',
                    borderBottom: '1px solid rgba(255,255,255,0.04)',
                  }}
                  onMouseEnter={e => e.currentTarget.style.background = 'rgba(255,255,255,0.04)'}
                  onMouseLeave={e => e.currentTarget.style.background = 'transparent'}
                >
                  <div style={{
                    width: 8,
                    height: 8,
                    borderRadius: '50%',
                    flexShrink: 0,
                    background: phaseColors[m.status] || '#64748b',
                    boxShadow: m.status === 'live' ? `0 0 8px ${phaseColors[m.status]}80` : 'none',
                    animation: m.status === 'live' ? 'pulse 1.5s infinite' : 'none',
                  }} />

                  <div style={{ flex: 1, minWidth: 0 }}>
                    <div style={{
                      fontFamily: 'var(--font-heading)',
                      fontSize: 13,
                      fontWeight: 600,
                      color: '#fff',
                      marginBottom: 2,
                      whiteSpace: 'nowrap',
                      overflow: 'hidden',
                      textOverflow: 'ellipsis',
                    }}>
                      {m.title}
                    </div>
                    <div style={{
                      fontSize: 10,
                      color: 'var(--text-muted, #555)',
                      fontFamily: 'var(--font-body)',
                    }}>
                      {m.mode} • {m.map} • {formatTK(m.entryFee)}
                    </div>
                  </div>

                  <span style={{
                    padding: '3px 10px',
                    borderRadius: 6,
                    fontSize: 9,
                    fontFamily: 'var(--font-display)',
                    fontWeight: 700,
                    letterSpacing: 0.5,
                    textTransform: 'uppercase',
                    background: (phaseColors[m.status] || '#64748b') + '18',
                    color: phaseColors[m.status] || '#64748b',
                    flexShrink: 0,
                  }}>
                    {m.status === 'live' && (
                      <span style={{
                        display: 'inline-block',
                        width: 4,
                        height: 4,
                        borderRadius: '50%',
                        background: '#22c55e',
                        marginRight: 4,
                        animation: 'pulse 1s infinite',
                        verticalAlign: 'middle',
                      }} />
                    )}
                    {phaseLabels[m.status] || m.status}
                  </span>

                  <i className="fa-solid fa-chevron-right" style={{
                    fontSize: 10,
                    color: 'var(--text-muted, #444)',
                    flexShrink: 0,
                  }} />
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
          width: '100%',
          padding: '14px 0',
          borderRadius: 14,
          border: '1px solid rgba(239,68,68,0.25)',
          background: 'rgba(239,68,68,0.08)',
          color: '#ef4444',
          fontFamily: 'var(--font-display)',
          fontSize: 14,
          fontWeight: 700,
          cursor: 'pointer',
          transition: 'all 0.3s ease',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          gap: 8,
        }}
        onMouseEnter={e => {
          e.currentTarget.style.background = 'rgba(239,68,68,0.14)'
          e.currentTarget.style.borderColor = 'rgba(239,68,68,0.4)'
        }}
        onMouseLeave={e => {
          e.currentTarget.style.background = 'rgba(239,68,68,0.08)'
          e.currentTarget.style.borderColor = 'rgba(239,68,68,0.25)'
        }}
      >
        <i className="fa-solid fa-right-from-bracket" /> Logout
      </button>
    </div>
  )
}