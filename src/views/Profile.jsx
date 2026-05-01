import { useState, useEffect, useRef } from 'react'
import { useApp } from '../context'
import { formatTK, formatTKShort, getEloTier, getTierProgress } from '../utils'

// ═══════════════════════════════════════════════════════════════════════════════
//  ANIMATED COUNTER — Premium number animation
// ═══════════════════════════════════════════════════════════════════════════════
function AnimatedNumber({ value, duration = 1500, suffix = '' }) {
  const [display, setDisplay] = useState(0)
  const startRef = useRef(null)
  const fromRef = useRef(0)

  useEffect(() => {
    fromRef.current = display
    startRef.current = null
    let raf
    const animate = (timestamp) => {
      if (!startRef.current) startRef.current = timestamp
      const progress = Math.min((timestamp - startRef.current) / duration, 1)
      const easeOut = 1 - Math.pow(1 - progress, 4)
      const current = Math.round(fromRef.current + (value - fromRef.current) * easeOut)
      setDisplay(current)
      if (progress < 1) raf = requestAnimationFrame(animate)
    }
    raf = requestAnimationFrame(animate)
    return () => cancelAnimationFrame(raf)
  }, [value])

  return <span>{display.toLocaleString()}{suffix}</span>
}

// ═══════════════════════════════════════════════════════════════════════════════
//  CIRCULAR PROGRESS — SVG ring with glow
// ═══════════════════════════════════════════════════════════════════════════════
function CircularProgress({ value, max = 100, size = 80, strokeWidth = 6, color, icon, label }) {
  const radius = (size - strokeWidth) / 2
  const circumference = 2 * Math.PI * radius
  const progress = Math.min(value / max, 1)
  const offset = circumference - progress * circumference
  const [animatedOffset, setAnimatedOffset] = useState(circumference)

  useEffect(() => {
    const timer = setTimeout(() => setAnimatedOffset(offset), 100)
    return () => clearTimeout(timer)
  }, [offset])

  return (
    <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 8 }}>
      <div style={{ position: 'relative', width: size, height: size }}>
        <svg width={size} height={size} style={{ transform: 'rotate(-90deg)' }}>
          <defs>
            <filter id={`glow-${label}`}>
              <feGaussianBlur stdDeviation="3" result="coloredBlur"/>
              <feMerge>
                <feMergeNode in="coloredBlur"/>
                <feMergeNode in="SourceGraphic"/>
              </feMerge>
            </filter>
          </defs>
          <circle
            cx={size/2} cy={size/2} r={radius}
            fill="none"
            stroke="rgba(255,255,255,0.05)"
            strokeWidth={strokeWidth}
          />
          <circle
            cx={size/2} cy={size/2} r={radius}
            fill="none"
            stroke={color}
            strokeWidth={strokeWidth}
            strokeLinecap="round"
            strokeDasharray={circumference}
            strokeDashoffset={animatedOffset}
            filter={`url(#glow-${label})`}
            style={{ transition: 'stroke-dashoffset 1.5s cubic-bezier(0.34, 1.56, 0.64, 1)' }}
          />
        </svg>
        <div style={{
          position: 'absolute',
          inset: 0,
          display: 'flex',
          flexDirection: 'column',
          alignItems: 'center',
          justifyContent: 'center',
          gap: 2,
        }}>
          <i className={icon} style={{ fontSize: 14, color, opacity: 0.8 }} />
          <span style={{ fontSize: 16, fontWeight: 800, color, fontFamily: 'var(--font-mono)' }}>
            {value}{label === 'Win Rate' ? '%' : ''}
          </span>
        </div>
      </div>
      <span style={{
        fontSize: 10,
        fontWeight: 700,
        textTransform: 'uppercase',
        letterSpacing: '0.1em',
        color: 'var(--text-muted)',
      }}>{label}</span>
    </div>
  )
}

// ═══════════════════════════════════════════════════════════════════════════════
//  PARTICLE BUTTON — Click burst effect
// ═══════════════════════════════════════════════════════════════════════════════
function ParticleButton({ children, onClick, variant = 'primary', className = '' }) {
  const btnRef = useRef(null)
  const [particles, setParticles] = useState([])

  const handleClick = (e) => {
    const rect = btnRef.current.getBoundingClientRect()
    const x = e.clientX - rect.left
    const y = e.clientY - rect.top

    const newParticles = Array.from({ length: 8 }, (_, i) => ({
      id: Date.now() + i,
      x,
      y,
      angle: (i * 45) + Math.random() * 30,
      color: variant === 'primary' ? '#a855f7' : '#ef4444',
    }))

    setParticles(prev => [...prev, ...newParticles])
    setTimeout(() => setParticles(prev => prev.filter(p => !newParticles.find(np => np.id === p.id))), 600)
    onClick?.(e)
  }

  const baseStyle = {
    position: 'relative',
    padding: '12px 24px',
    borderRadius: 12,
    fontFamily: 'var(--font-display)',
    fontSize: 13,
    fontWeight: 700,
    letterSpacing: '0.05em',
    textTransform: 'uppercase',
    border: 'none',
    cursor: 'pointer',
    overflow: 'hidden',
    transition: 'all 0.3s cubic-bezier(0.4, 0, 0.2, 1)',
  }

  const variants = {
    primary: {
      background: 'linear-gradient(135deg, #a855f7, #ec4899)',
      color: '#fff',
      boxShadow: '0 4px 20px rgba(168, 85, 247, 0.3)',
    },
    secondary: {
      background: 'rgba(255,255,255,0.05)',
      color: 'var(--text-secondary)',
      border: '1px solid rgba(255,255,255,0.1)',
    },
    danger: {
      background: 'rgba(239, 68, 68, 0.1)',
      color: '#ef4444',
      border: '1px solid rgba(239, 68, 68, 0.2)',
    },
  }

  return (
    <button
      ref={btnRef}
      onClick={handleClick}
      className={className}
      style={{ ...baseStyle, ...variants[variant] }}
      onMouseEnter={e => {
        e.currentTarget.style.transform = 'translateY(-2px)'
        if (variant === 'primary') {
          e.currentTarget.style.boxShadow = '0 8px 30px rgba(168, 85, 247, 0.4), 0 0 60px rgba(168, 85, 247, 0.15)'
        }
      }}
      onMouseLeave={e => {
        e.currentTarget.style.transform = 'translateY(0)'
        if (variant === 'primary') {
          e.currentTarget.style.boxShadow = '0 4px 20px rgba(168, 85, 247, 0.3)'
        }
      }}
    >
      {particles.map(p => (
        <span
          key={p.id}
          style={{
            position: 'absolute',
            left: p.x,
            top: p.y,
            width: 4,
            height: 4,
            borderRadius: '50%',
            background: p.color,
            pointerEvents: 'none',
            animation: `particleBurst 0.6s ease-out forwards`,
            '--angle': `${p.angle}deg`,
          }}
        />
      ))}
      <span style={{ position: 'relative', zIndex: 1 }}>{children}</span>
    </button>
  )
}

// ═══════════════════════════════════════════════════════════════════════════════
//  HOLOGRAPHIC CARD — 3D tilt + shine effect
// ═══════════════════════════════════════════════════════════════════════════════
function HolographicCard({ children, className = '', glowColor = 'rgba(0,212,255,0.3)' }) {
  const cardRef = useRef(null)
  const [transform, setTransform] = useState('perspective(1000px) rotateX(0) rotateY(0)')
  const [shine, setShine] = useState({ x: 50, y: 50, opacity: 0 })

  const handleMouseMove = (e) => {
    if (!cardRef.current) return
    const rect = cardRef.current.getBoundingClientRect()
    const x = (e.clientX - rect.left) / rect.width
    const y = (e.clientY - rect.top) / rect.height
    const rotateX = (y - 0.5) * -10
    const rotateY = (x - 0.5) * 10
    setTransform(`perspective(1000px) rotateX(${rotateX}deg) rotateY(${rotateY}deg) scale3d(1.02, 1.02, 1.02)`)
    setShine({ x: x * 100, y: y * 100, opacity: 0.15 })
  }

  const handleMouseLeave = () => {
    setTransform('perspective(1000px) rotateX(0) rotateY(0) scale3d(1, 1, 1)')
    setShine({ x: 50, y: 50, opacity: 0 })
  }

  return (
    <div
      ref={cardRef}
      className={className}
      onMouseMove={handleMouseMove}
      onMouseLeave={handleMouseLeave}
      style={{
        position: 'relative',
        borderRadius: 24,
        background: 'linear-gradient(135deg, rgba(255,255,255,0.05) 0%, rgba(255,255,255,0.02) 100%)',
        backdropFilter: 'blur(20px)',
        border: '1px solid rgba(255,255,255,0.08)',
        boxShadow: `0 8px 32px rgba(0,0,0,0.3), 0 0 0 1px ${glowColor}`,
        transform,
        transition: 'transform 0.15s ease-out',
        overflow: 'hidden',
      }}
    >
      {/* Shine overlay */}
      <div style={{
        position: 'absolute',
        inset: 0,
        background: `radial-gradient(circle at ${shine.x}% ${shine.y}%, rgba(255,255,255,${shine.opacity}) 0%, transparent 50%)`,
        pointerEvents: 'none',
        transition: 'background 0.3s ease-out',
        zIndex: 2,
      }} />
      <div style={{ position: 'relative', zIndex: 1 }}>
        {children}
      </div>
    </div>
  )
}

// ═══════════════════════════════════════════════════════════════════════════════
//  MAIN PROFILE COMPONENT — v6.0 Premium
// ═══════════════════════════════════════════════════════════════════════════════
export default function Profile() {
  const { state, dispatch, navigate } = useApp()
  const { currentUser, matches } = state

  const [editing, setEditing] = useState(false)
  const [editName, setEditName] = useState('')
  const [editIgn, setEditIgn] = useState('')
  const [activeTab, setActiveTab] = useState('overview')

  if (!currentUser) return null

  // Data
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

  const roleLabel = currentUser.role === 'owner' ? 'OWNER' : currentUser.role === 'admin' ? 'ADMIN' : 'PLAYER'
  const roleColor = currentUser.role === 'owner' ? '#fbbf24' : currentUser.role === 'admin' ? '#ef4444' : '#00d4ff'

  // Handlers
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
    if (!file || file.size > 2 * 1024 * 1024) return
    const reader = new FileReader()
    reader.onload = (ev) => dispatch({ type: 'SET_AVATAR', payload: ev.target.result })
    reader.readAsDataURL(file)
  }

  const handleLogout = () => {
    dispatch({ type: 'LOGOUT' })
    window.location.hash = 'login'
  }

  return (
    <div className="profile-page" style={{
      padding: '0 0 100px 0',
      position: 'relative',
      zIndex: 1,
    }}>

      {/* ═══ AMBIENT BACKGROUND GLOW ═══ */}
      <div style={{
        position: 'fixed',
        top: '10%',
        right: '-10%',
        width: 600,
        height: 600,
        borderRadius: '50%',
        background: `radial-gradient(circle, ${tier.color}08, transparent 70%)`,
        filter: 'blur(80px)',
        pointerEvents: 'none',
        zIndex: 0,
      }} />
      <div style={{
        position: 'fixed',
        bottom: '-10%',
        left: '-5%',
        width: 500,
        height: 500,
        borderRadius: '50%',
        background: 'radial-gradient(circle, rgba(168,85,247,0.05), transparent 70%)',
        filter: 'blur(80px)',
        pointerEvents: 'none',
        zIndex: 0,
      }} />

      {/* ═══ PROFILE HEADER — Holographic Card ═══ */}
      <HolographicCard glowColor={`${tier.color}20`}>
        <div style={{ padding: '40px 32px 32px' }}>

          {/* Top accent line */}
          <div style={{
            position: 'absolute',
            top: 0,
            left: 0,
            right: 0,
            height: 3,
            background: `linear-gradient(90deg, transparent, ${tier.color}, transparent)`,
            backgroundSize: '200% 100%',
            animation: 'shimmer 3s linear infinite',
          }} />

          <div style={{ display: 'flex', alignItems: 'flex-start', gap: 24, marginBottom: 28 }}>
            {/* Avatar with glow ring */}
            <div style={{ position: 'relative', flexShrink: 0 }}>
              <div style={{
                width: 96,
                height: 96,
                borderRadius: 24,
                padding: 3,
                background: `linear-gradient(135deg, ${tier.color}, ${tier.color}60)`,
                boxShadow: `0 0 30px ${tier.color}30, 0 0 60px ${tier.color}15`,
              }}>
                {currentUser.avatar ? (
                  <img
                    src={currentUser.avatar}
                    alt="Avatar"
                    style={{
                      width: '100%',
                      height: '100%',
                      borderRadius: 21,
                      objectFit: 'cover',
                      border: '2px solid var(--bg-card)',
                    }}
                  />
                ) : (
                  <div style={{
                    width: '100%',
                    height: '100%',
                    borderRadius: 21,
                    background: `linear-gradient(135deg, ${tier.color}40, ${tier.color}15)`,
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    fontSize: 36,
                    fontWeight: 800,
                    color: tier.color,
                    fontFamily: 'var(--font-heading)',
                  }}>
                    {(currentUser.displayName || currentUser.name).charAt(0).toUpperCase()}
                  </div>
                )}
              </div>

              {/* Online indicator */}
              <div style={{
                position: 'absolute',
                bottom: 4,
                right: 4,
                width: 20,
                height: 20,
                borderRadius: '50%',
                background: '#22c55e',
                border: '3px solid var(--bg-card)',
                boxShadow: '0 0 10px rgba(34,197,94,0.5)',
              }} />

              {/* Camera button */}
              <label style={{
                position: 'absolute',
                bottom: -6,
                left: '50%',
                transform: 'translateX(-50%)',
                width: 32,
                height: 32,
                borderRadius: 10,
                background: `linear-gradient(135deg, ${tier.color}, ${tier.color}cc)`,
                border: '2px solid var(--bg-card)',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                cursor: 'pointer',
                boxShadow: `0 4px 16px ${tier.color}50`,
                transition: 'transform 0.2s ease',
              }}
              onMouseEnter={e => e.currentTarget.style.transform = 'translateX(-50%) scale(1.1)'}
              onMouseLeave={e => e.currentTarget.style.transform = 'translateX(-50%) scale(1)'}
              >
                <i className="fa-solid fa-camera" style={{ fontSize: 12, color: '#fff' }} />
                <input type="file" accept="image/*" onChange={handleAvatarChange} style={{ display: 'none' }} />
              </label>
            </div>

            {/* User Info */}
            <div style={{ flex: 1, minWidth: 0 }}>
              {editing ? (
                <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
                  <input
                    value={editName}
                    onChange={e => setEditName(e.target.value)}
                    placeholder="Display Name"
                    className="input-premium"
                    style={{ maxWidth: 300 }}
                  />
                  <input
                    value={editIgn}
                    onChange={e => setEditIgn(e.target.value)}
                    placeholder="In-Game Name"
                    className="input-premium"
                    style={{ maxWidth: 300 }}
                  />
                  <div style={{ display: 'flex', gap: 10, marginTop: 4 }}>
                    <ParticleButton onClick={saveEdit} variant="primary">
                      <i className="fa-solid fa-check" style={{ marginRight: 6 }} /> Save
                    </ParticleButton>
                    <ParticleButton onClick={() => setEditing(false)} variant="secondary">
                      Cancel
                    </ParticleButton>
                  </div>
                </div>
              ) : (
                <>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 12, marginBottom: 6 }}>
                    <h1 style={{
                      fontFamily: 'var(--font-heading)',
                      fontSize: 28,
                      fontWeight: 800,
                      color: '#fff',
                      letterSpacing: '-0.02em',
                      lineHeight: 1.2,
                    }}>
                      {currentUser.displayName || currentUser.name}
                    </h1>
                    <span className="badge" style={{
                      background: `${roleColor}15`,
                      color: roleColor,
                      border: `1px solid ${roleColor}30`,
                    }}>
                      {currentUser.role === 'owner' && <i className="fa-solid fa-crown" style={{ fontSize: 10 }} />}
                      {roleLabel}
                    </span>
                  </div>

                  <div style={{
                    fontFamily: 'var(--font-mono)',
                    fontSize: 15,
                    fontWeight: 600,
                    color: tier.color,
                    marginBottom: 8,
                    display: 'flex',
                    alignItems: 'center',
                    gap: 8,
                  }}>
                    <i className="fa-solid fa-gamepad" style={{ fontSize: 12, opacity: 0.7 }} />
                    {currentUser.ign}
                  </div>

                  <div style={{ display: 'flex', alignItems: 'center', gap: 8, flexWrap: 'wrap' }}>
                    <span style={{
                      fontSize: 12,
                      color: 'var(--text-muted)',
                      fontFamily: 'var(--font-mono)',
                    }}>@{currentUser.username}</span>
                    <span style={{ color: 'var(--border-medium)' }}>•</span>
                    <span style={{
                      fontSize: 12,
                      color: 'var(--text-dim)',
                    }}>
                      Member since {currentUser.createdAt ? new Date(currentUser.createdAt).toLocaleDateString('en-US', { month: 'short', year: 'numeric' }) : 'N/A'}
                    </span>
                  </div>
                </>
              )}
            </div>
          </div>

          {/* ═══ RANK BADGE ═══ */}
          <div style={{
            display: 'flex',
            alignItems: 'center',
            gap: 20,
            padding: '20px 24px',
            borderRadius: 16,
            background: `linear-gradient(135deg, ${tier.color}08, transparent)`,
            border: `1px solid ${tier.color}15`,
            marginBottom: 24,
          }}>
            <div style={{
              width: 56,
              height: 56,
              borderRadius: 16,
              background: `linear-gradient(135deg, ${tier.color}20, ${tier.color}08)`,
              border: `1px solid ${tier.color}25`,
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              fontSize: 28,
              boxShadow: `0 4px 20px ${tier.color}15`,
            }}>
              {tier.icon}
            </div>

            <div style={{ flex: 1 }}>
              <div style={{
                fontSize: 10,
                fontWeight: 700,
                letterSpacing: '0.2em',
                textTransform: 'uppercase',
                color: `${tier.color}aa`,
                marginBottom: 4,
              }}>
                {tier.name} Rank
              </div>
              <div style={{ display: 'flex', alignItems: 'baseline', gap: 8 }}>
                <span style={{
                  fontSize: 32,
                  fontWeight: 900,
                  color: tier.color,
                  fontFamily: 'var(--font-mono)',
                  lineHeight: 1,
                  textShadow: `0 0 30px ${tier.color}40`,
                }}>
                  <AnimatedNumber value={elo} />
                </span>
                <span style={{ fontSize: 12, color: 'var(--text-muted)', fontWeight: 600 }}>ELO</span>
              </div>
            </div>

            <div style={{ textAlign: 'right', minWidth: 120 }}>
              <div style={{
                fontSize: 11,
                color: 'var(--text-muted)',
                marginBottom: 8,
                fontWeight: 600,
              }}>
                {pointsToNext > 0 ? `${pointsToNext} pts to ${nextTier?.name}` : 'MAX RANK'}
              </div>
              <div style={{
                width: '100%',
                height: 6,
                borderRadius: 99,
                background: 'rgba(255,255,255,0.05)',
                overflow: 'hidden',
                boxShadow: 'inset 0 1px 3px rgba(0,0,0,0.5)',
              }}>
                <div style={{
                  width: `${tierProgress}%`,
                  height: '100%',
                  background: `linear-gradient(90deg, ${tier.color}, ${tier.color}dd)`,
                  borderRadius: 99,
                  boxShadow: `0 0 12px ${tier.color}60`,
                  transition: 'width 1s cubic-bezier(0.34, 1.56, 0.64, 1)',
                }} />
              </div>
            </div>
          </div>

          {/* ═══ QUICK STATS ROW ═══ */}
          <div style={{
            display: 'grid',
            gridTemplateColumns: 'repeat(auto-fit, minmax(140px, 1fr))',
            gap: 12,
          }}>
            {[
              { label: 'Balance', value: currentUser.balance, color: '#fbbf24', icon: 'fa-solid fa-wallet', format: true },
              { label: 'Matches', value: currentUser.matchesPlayed, color: '#6c8cff', icon: 'fa-solid fa-gamepad' },
              { label: 'Wins', value: currentUser.wins, color: '#22c55e', icon: 'fa-solid fa-trophy' },
              { label: 'Earnings', value: currentUser.earnings, color: '#fbbf24', icon: 'fa-solid fa-coins', format: true },
            ].map(item => (
              <div key={item.label} style={{
                padding: '14px 16px',
                borderRadius: 12,
                background: 'rgba(255,255,255,0.03)',
                border: '1px solid rgba(255,255,255,0.06)',
                display: 'flex',
                alignItems: 'center',
                gap: 12,
                transition: 'all 0.3s ease',
              }}
              onMouseEnter={e => {
                e.currentTarget.style.background = 'rgba(255,255,255,0.05)'
                e.currentTarget.style.borderColor = `${item.color}20`
              }}
              onMouseLeave={e => {
                e.currentTarget.style.background = 'rgba(255,255,255,0.03)'
                e.currentTarget.style.borderColor = 'rgba(255,255,255,0.06)'
              }}
              >
                <div style={{
                  width: 36,
                  height: 36,
                  borderRadius: 10,
                  background: `${item.color}15`,
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                }}>
                  <i className={item.icon} style={{ fontSize: 14, color: item.color }} />
                </div>
                <div>
                  <div style={{
                    fontSize: 10,
                    fontWeight: 700,
                    textTransform: 'uppercase',
                    letterSpacing: '0.1em',
                    color: 'var(--text-muted)',
                    marginBottom: 2,
                  }}>{item.label}</div>
                  <div style={{
                    fontSize: 16,
                    fontWeight: 800,
                    color: item.color,
                    fontFamily: 'var(--font-mono)',
                  }}>
                    {item.format ? formatTK(item.value) : item.value.toLocaleString()}
                  </div>
                </div>
              </div>
            ))}
          </div>

          {/* Edit button */}
          {!editing && (
            <div style={{ marginTop: 24, display: 'flex', gap: 12 }}>
              <ParticleButton onClick={startEdit} variant="primary">
                <i className="fa-solid fa-pen" style={{ marginRight: 6 }} /> Edit Profile
              </ParticleButton>
              <ParticleButton onClick={() => navigate('settings')} variant="secondary">
                <i className="fa-solid fa-gear" style={{ marginRight: 6 }} /> Settings
              </ParticleButton>
            </div>
          )}
        </div>
      </HolographicCard>

      {/* ═══ TABS ═══ */}
      <div style={{
        display: 'flex',
        gap: 8,
        marginBottom: 24,
        overflowX: 'auto',
        paddingBottom: 4,
        scrollbarWidth: 'none',
      }}>
        {['overview', 'stats', 'history', 'achievements'].map(tab => (
          <button
            key={tab}
            onClick={() => setActiveTab(tab)}
            style={{
              padding: '10px 20px',
              borderRadius: 12,
              border: 'none',
              background: activeTab === tab 
                ? 'linear-gradient(135deg, rgba(168,85,247,0.2), rgba(244,114,182,0.15))' 
                : 'rgba(255,255,255,0.03)',
              color: activeTab === tab ? '#fff' : 'var(--text-muted)',
              fontFamily: 'var(--font-display)',
              fontSize: 12,
              fontWeight: 700,
              letterSpacing: '0.05em',
              textTransform: 'uppercase',
              cursor: 'pointer',
              transition: 'all 0.3s ease',
              border: activeTab === tab ? '1px solid rgba(168,85,247,0.3)' : '1px solid rgba(255,255,255,0.06)',
              whiteSpace: 'nowrap',
            }}
          >
            {tab}
          </button>
        ))}
      </div>

      {/* ═══ STATS GRID — Circular Progress ═══ */}
      {activeTab === 'overview' && (
        <div style={{
          display: 'grid',
          gridTemplateColumns: 'repeat(auto-fit, minmax(160px, 1fr))',
          gap: 16,
          marginBottom: 24,
        }}>
          <HolographicCard glowColor="rgba(108,140,255,0.2)">
            <div style={{ padding: '24px 20px', textAlign: 'center' }}>
              <CircularProgress 
                value={elo} 
                max={3000} 
                color="#6c8cff" 
                icon="fa-solid fa-ranking-star" 
                label="ELO Rating" 
              />
            </div>
          </HolographicCard>

          <HolographicCard glowColor="rgba(34,197,94,0.2)">
            <div style={{ padding: '24px 20px', textAlign: 'center' }}>
              <CircularProgress 
                value={winRate} 
                max={100} 
                color="#22c55e" 
                icon="fa-solid fa-chart-line" 
                label="Win Rate" 
              />
            </div>
          </HolographicCard>

          <HolographicCard glowColor="rgba(239,68,68,0.2)">
            <div style={{ padding: '24px 20px', textAlign: 'center' }}>
              <div style={{ fontSize: 32, fontWeight: 900, color: '#ef4444', fontFamily: 'var(--font-mono)' }}>
                {kd}
              </div>
              <div style={{ fontSize: 10, color: 'var(--text-muted)', marginTop: 4, fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.1em' }}>
                K/D Ratio
              </div>
            </div>
          </HolographicCard>

          <HolographicCard glowColor="rgba(251,191,36,0.2)">
            <div style={{ padding: '24px 20px', textAlign: 'center' }}>
              <div style={{ fontSize: 32, fontWeight: 900, color: '#fbbf24', fontFamily: 'var(--font-mono)' }}>
                <AnimatedNumber value={currentUser.kills} />
              </div>
              <div style={{ fontSize: 10, color: 'var(--text-muted)', marginTop: 4, fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.1em' }}>
                Total Kills
              </div>
            </div>
          </HolographicCard>
        </div>
      )}

      {/* ═══ MATCH HISTORY ═══ */}
      {activeTab === 'history' && (
        <HolographicCard glowColor="rgba(0,212,255,0.15)">
          <div style={{ padding: '24px' }}>
            <div style={{
              display: 'flex',
              alignItems: 'center',
              gap: 12,
              marginBottom: 20,
            }}>
              <div style={{
                width: 40,
                height: 40,
                borderRadius: 12,
                background: 'linear-gradient(135deg, rgba(0,212,255,0.15), rgba(168,85,247,0.1))',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
              }}>
                <i className="fa-solid fa-clock-rotate-left" style={{ fontSize: 16, color: 'var(--cyan)' }} />
              </div>
              <div>
                <h3 style={{
                  fontFamily: 'var(--font-heading)',
                  fontSize: 16,
                  fontWeight: 700,
                  color: '#fff',
                  margin: 0,
                }}>Match History</h3>
                <span style={{ fontSize: 12, color: 'var(--text-muted)' }}>{myMatches.length} matches played</span>
              </div>
            </div>

            {myMatches.length === 0 ? (
              <div style={{ textAlign: 'center', padding: '48px 20px' }}>
                <i className="fa-solid fa-ghost" style={{
                  fontSize: 40,
                  color: 'rgba(255,255,255,0.08)',
                  marginBottom: 16,
                  display: 'block',
                }} />
                <p style={{ color: 'var(--text-muted)', fontSize: 14 }}>No matches joined yet</p>
                <ParticleButton onClick={() => navigate('matches')} variant="primary" style={{ marginTop: 16 }}>
                  Browse Matches
                </ParticleButton>
              </div>
            ) : (
              <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
                {myMatches.slice(0, 10).map((m, i) => {
                  const phaseColors = { live: '#22c55e', upcoming: '#6c8cff', completed: '#64748b', cancelled: '#ef4444' }
                  const phaseLabels = { live: 'LIVE', upcoming: 'UPCOMING', completed: 'COMPLETED', cancelled: 'CANCELLED' }
                  return (
                    <div
                      key={m.id}
                      onClick={() => navigate(`match-detail/${m.id}`)}
                      style={{
                        display: 'flex',
                        alignItems: 'center',
                        gap: 14,
                        padding: '14px 16px',
                        borderRadius: 12,
                        cursor: 'pointer',
                        transition: 'all 0.2s ease',
                        background: 'rgba(255,255,255,0.02)',
                        border: '1px solid transparent',
                        animation: `fadeInUp 0.4s ease-out ${i * 0.05}s both`,
                      }}
                      onMouseEnter={e => {
                        e.currentTarget.style.background = 'rgba(255,255,255,0.04)'
                        e.currentTarget.style.borderColor = 'rgba(255,255,255,0.08)'
                        e.currentTarget.style.transform = 'translateX(4px)'
                      }}
                      onMouseLeave={e => {
                        e.currentTarget.style.background = 'rgba(255,255,255,0.02)'
                        e.currentTarget.style.borderColor = 'transparent'
                        e.currentTarget.style.transform = 'translateX(0)'
                      }}
                    >
                      <div style={{
                        width: 10,
                        height: 10,
                        borderRadius: '50%',
                        flexShrink: 0,
                        background: phaseColors[m.status] || '#64748b',
                        boxShadow: m.status === 'live' ? `0 0 12px ${phaseColors[m.status]}80` : 'none',
                        animation: m.status === 'live' ? 'pulse 1.5s infinite' : 'none',
                      }} />

                      <div style={{ flex: 1, minWidth: 0 }}>
                        <div style={{
                          fontFamily: 'var(--font-heading)',
                          fontSize: 14,
                          fontWeight: 600,
                          color: '#fff',
                          marginBottom: 2,
                          whiteSpace: 'nowrap',
                          overflow: 'hidden',
                          textOverflow: 'ellipsis',
                        }}>{m.title}</div>
                        <div style={{ fontSize: 11, color: 'var(--text-muted)' }}>
                          {m.mode} • {m.map} • {formatTK(m.entryFee)}
                        </div>
                      </div>

                      <span className="badge" style={{
                        background: `${phaseColors[m.status]}15`,
                        color: phaseColors[m.status],
                        border: `1px solid ${phaseColors[m.status]}30`,
                        fontSize: 10,
                      }}>
                        {phaseLabels[m.status] || m.status}
                      </span>

                      <i className="fa-solid fa-chevron-right" style={{ fontSize: 10, color: 'var(--text-dim)' }} />
                    </div>
                  )
                })}
              </div>
            )}
          </div>
        </HolographicCard>
      )}

      {/* ═══ ACHIEVEMENTS PLACEHOLDER ═══ */}
      {activeTab === 'achievements' && (
        <HolographicCard glowColor="rgba(251,191,36,0.2)">
          <div style={{ padding: '48px 24px', textAlign: 'center' }}>
            <i className="fa-solid fa-medal" style={{
              fontSize: 48,
              color: 'rgba(251,191,36,0.3)',
              marginBottom: 16,
            }} />
            <h3 style={{ fontFamily: 'var(--font-heading)', fontSize: 18, color: '#fff', marginBottom: 8 }}>
              Achievements Coming Soon
            </h3>
            <p style={{ color: 'var(--text-muted)', fontSize: 14 }}>
              Unlock badges, trophies, and exclusive rewards by completing challenges.
            </p>
          </div>
        </HolographicCard>
      )}

      {/* ═══ LOGOUT ═══ */}
      <div style={{ marginTop: 32 }}>
        <ParticleButton onClick={handleLogout} variant="danger" className="btn-logout">
          <i className="fa-solid fa-right-from-bracket" style={{ marginRight: 8 }} /> Logout
        </ParticleButton>
      </div>

      {/* Particle burst keyframes */}
      <style>{`
        @keyframes particleBurst {
          0% { transform: translate(0, 0) scale(1); opacity: 1; }
          100% { transform: translate(calc(cos(var(--angle)) * 60px), calc(sin(var(--angle)) * 60px)) scale(0); opacity: 0; }
        }
      `}</style>
    </div>
  )
}