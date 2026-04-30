import { useState, useEffect, useRef, useCallback } from 'react'
import { useApp } from '../context'
import { formatTK, modeColor, mapIcon, getMatchPhase, getMatchCountdown, slotPercent, phaseColor, phaseLabel } from '../utils'

function parseMatchTime(startTime) {
  if (!startTime) return null
  if (startTime && typeof startTime.toDate === 'function') return startTime.toDate().getTime()
  if (typeof startTime === 'number') return startTime
  if (typeof startTime === 'string') {
    const ts = new Date(startTime.replace(' ', 'T')).getTime()
    if (!isNaN(ts)) return ts
    const ts2 = new Date(startTime).getTime()
    if (!isNaN(ts2)) return ts2
  }
  return null
}

// ═══════════════════════════════════════════════════════════════════════
//  DIGITAL COUNTDOWN DISPLAY
// ═══════════════════════════════════════════════════════════════════════
function DigitalCountdown({ ms }) {
  if (ms <= 0) return null
  const h = Math.floor(ms / 3600000)
  const m = Math.floor((ms % 3600000) / 60000)
  const s = Math.floor((ms % 60000) / 1000)

  const Digit = ({ value, label }) => (
    <div style={{ textAlign: 'center' }}>
      <div style={{
        fontFamily: 'var(--font-number)', fontSize: 18, fontWeight: 800,
        color: 'var(--cyan)', fontVariantNumeric: 'tabular-nums',
        textShadow: '0 0 10px rgba(0,240,255,0.5)',
        letterSpacing: '-0.02em',
      }}>
        {String(value).padStart(2, '0')}
      </div>
      <div style={{
        fontSize: 8, fontWeight: 700, color: 'var(--text-muted)',
        textTransform: 'uppercase', letterSpacing: '0.15em',
      }}>
        {label}
      </div>
    </div>
  )

  return (
    <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
      {h > 0 && <><Digit value={h} label="HR" /><span style={{ color: 'var(--cyan)', fontWeight: 800 }}>:</span></>}
      <Digit value={m} label="MIN" />
      <span style={{ color: 'var(--cyan)', fontWeight: 800 }}>:</span>
      <Digit value={s} label="SEC" />
    </div>
  )
}

// ═══════════════════════════════════════════════════════════════════════
//  PROGRESS RING (Slots)
// ═══════════════════════════════════════════════════════════════════════
function SlotRing({ current, max, phase }) {
  const pct = Math.min((current / max) * 100, 100)
  const circumference = 2 * Math.PI * 18
  const offset = circumference - (pct / 100) * circumference

  const color = phase === 'live' ? 'var(--red)' : phase === 'completed' ? 'var(--text-dim)' : 'var(--cyan)'

  return (
    <div style={{ position: 'relative', width: 40, height: 40 }}>
      <svg width="40" height="40" viewBox="0 0 40 40" style={{ transform: 'rotate(-90deg)' }}>
        <circle cx="20" cy="20" r="18" fill="none" stroke="var(--bg-elevated)" strokeWidth="3" />
        <circle
          cx="20" cy="20" r="18" fill="none" stroke={color}
          strokeWidth="3" strokeLinecap="round"
          strokeDasharray={circumference}
          strokeDashoffset={offset}
          style={{ transition: 'stroke-dashoffset 0.6s cubic-bezier(0.34, 1.56, 0.64, 1)' }}
        />
      </svg>
      <div style={{
        position: 'absolute', inset: 0, display: 'flex', alignItems: 'center', justifyContent: 'center',
        fontFamily: 'var(--font-number)', fontSize: 11, fontWeight: 800, color: 'var(--text)',
      }}>
        {current}
      </div>
    </div>
  )
}

// ═══════════════════════════════════════════════════════════════════════
//  3D TILT HOOK
// ═══════════════════════════════════════════════════════════════════════
function useTilt() {
  const ref = useRef(null)
  const [style, setStyle] = useState({})

  const onMouseMove = useCallback((e) => {
    if (!ref.current) return
    const rect = ref.current.getBoundingClientRect()
    const x = (e.clientX - rect.left) / rect.width
    const y = (e.clientY - rect.top) / rect.height
    const rotateX = (y - 0.5) * -12
    const rotateY = (x - 0.5) * 12
    setStyle({
      transform: `perspective(1000px) rotateX(${rotateX}deg) rotateY(${rotateY}deg) scale3d(1.02, 1.02, 1.02)`,
      transition: 'transform 0.1s ease-out',
    })
  }, [])

  const onMouseLeave = useCallback(() => {
    setStyle({
      transform: 'perspective(1000px) rotateX(0deg) rotateY(0deg) scale3d(1, 1, 1)',
      transition: 'transform 0.5s cubic-bezier(0.34, 1.56, 0.64, 1)',
    })
  }, [])

  return { ref, style, onMouseMove, onMouseLeave }
}

// ═══════════════════════════════════════════════════════════════════════
//  PARTICLE BURST ON JOIN
// ═══════════════════════════════════════════════════════════════════════
function ParticleBurst({ trigger }) {
  const [particles, setParticles] = useState([])

  useEffect(() => {
    if (!trigger) return
    const newParticles = Array.from({ length: 12 }, (_, i) => ({
      id: Date.now() + i,
      angle: (i / 12) * 360,
      color: ['var(--cyan)', 'var(--purple)', 'var(--gold)', '#fff'][i % 4],
      delay: i * 30,
    }))
    setParticles(newParticles)
    const timer = setTimeout(() => setParticles([]), 1000)
    return () => clearTimeout(timer)
  }, [trigger])

  if (particles.length === 0) return null

  return (
    <div style={{ position: 'absolute', inset: 0, pointerEvents: 'none', zIndex: 100, overflow: 'hidden' }}>
      {particles.map(p => (
        <div
          key={p.id}
          style={{
            position: 'absolute',
            left: '50%',
            top: '50%',
            width: 4,
            height: 4,
            borderRadius: '50%',
            background: p.color,
            boxShadow: `0 0 6px ${p.color}`,
            animation: `particleBurst 0.6s ease-out ${p.delay}ms forwards`,
            transform: `rotate(${p.angle}deg) translateX(0)`,
          }}
        />
      ))}
    </div>
  )
}

// ═══════════════════════════════════════════════════════════════════════
//  MAIN MATCH CARD
// ═══════════════════════════════════════════════════════════════════════
export default function MatchCard({ match, animated, index = 0 }) {
  const { dispatch, navigate } = useApp()
  const [countdown, setCountdown] = useState(getMatchCountdown(match))
  const [burstTrigger, setBurstTrigger] = useState(0)
  const { ref, style, onMouseMove, onMouseLeave } = useTilt()

  const phase = getMatchPhase(match)
  const isLive = phase === 'live'
  const isUpcoming = phase === 'upcoming'
  const isCompleted = phase === 'completed'
  const pct = slotPercent(match)

  const prizePoolValue = match.prizePool || Math.round(match.entryFee * match.maxSlots * 0.8)

  // Live countdown
  useEffect(() => {
    if (!isUpcoming) return
    const interval = setInterval(() => {
      setCountdown(getMatchCountdown(match))
    }, 1000)
    return () => clearInterval(interval)
  }, [isUpcoming, match])

  // Parse scheduled time
  const matchTimeStr = (() => {
    const ts = parseMatchTime(match.startTime)
    if (!ts) return ''
    const d = new Date(ts)
    let h = d.getHours()
    const m = String(d.getMinutes()).padStart(2, '0')
    const ap = h >= 12 ? 'PM' : 'AM'
    h = h % 12 || 12
    const day = d.getDate()
    const mons = ['Jan','Feb','Mar','Apr','May','Jun','Jul','Aug','Sep','Oct','Nov','Dec']
    return `${h}:${m} ${ap} · ${day} ${mons[d.getMonth()]}`
  })()

  const handleJoin = (e) => {
    e.stopPropagation()
    if (isCompleted) return
    setBurstTrigger(prev => prev + 1)
    dispatch({ type: 'SHOW_MODAL', payload: { type: 'join-match', matchId: match.id } })
  }

  const handleViewDetail = () => {
    navigate(`match-detail/${match.id}`)
  }

  const modeIcon = match.mode === 'Solo' ? 'fa-user'
    : match.mode === 'Duo' ? 'fa-user-group'
    : match.mode === 'Clash Squad' ? 'fa-crosshairs'
    : 'fa-shield-halved'

  // Phase-based styling
  const phaseStyles = {
    live: {
      border: '1px solid rgba(255, 45, 85, 0.3)',
      glow: '0 0 30px rgba(255, 45, 85, 0.15), inset 0 0 30px rgba(255, 45, 85, 0.05)',
      badgeBg: 'linear-gradient(135deg, var(--red), #ff6b8a)',
      badgeText: '#fff',
      accent: 'var(--red)',
      fillBar: 'linear-gradient(90deg, var(--red), #ff6b8a)',
      statusIcon: 'fa-solid fa-tower-broadcast',
      statusText: 'LIVE NOW',
    },
    upcoming: {
      border: '1px solid rgba(0, 240, 255, 0.15)',
      glow: '0 0 30px rgba(0, 240, 255, 0.08), inset 0 0 30px rgba(0, 240, 255, 0.03)',
      badgeBg: 'linear-gradient(135deg, var(--cyan), var(--purple))',
      badgeText: '#000',
      accent: 'var(--cyan)',
      fillBar: 'linear-gradient(90deg, var(--cyan), var(--purple))',
      statusIcon: 'fa-regular fa-clock',
      statusText: matchTimeStr || 'UPCOMING',
    },
    completed: {
      border: '1px solid var(--glass-border)',
      glow: 'none',
      badgeBg: 'var(--bg-elevated)',
      badgeText: 'var(--text-muted)',
      accent: 'var(--text-muted)',
      fillBar: 'var(--bg-highlight)',
      statusIcon: 'fa-solid fa-check-circle',
      statusText: 'COMPLETED',
    },
  }

  const ps = phaseStyles[phase] || phaseStyles.upcoming

  return (
    <div
      ref={ref}
      onClick={handleViewDetail}
      onMouseMove={onMouseMove}
      onMouseLeave={onMouseLeave}
      className="fade-in"
      style={{
        ...style,
        animationDelay: `${index * 80}ms`,
        position: 'relative',
        borderRadius: 'var(--radius-lg)',
        overflow: 'hidden',
        cursor: 'pointer',
        background: 'var(--glass-bg)',
        backdropFilter: 'var(--glass-blur)',
        border: ps.border,
        boxShadow: `0 8px 32px rgba(0,0,0,0.4), ${ps.glow}`,
        WebkitTapHighlightColor: 'transparent',
        transformStyle: 'preserve-3d',
        willChange: 'transform',
      }}
    >
      {/* ═══ HOLOGRAPHIC SHINE OVERLAY ═══ */}
      <div style={{
        position: 'absolute', inset: 0,
        background: 'linear-gradient(105deg, transparent 40%, rgba(255,255,255,0.03) 45%, rgba(255,255,255,0.08) 50%, rgba(255,255,255,0.03) 55%, transparent 60%)',
        backgroundSize: '200% 100%',
        animation: 'shineSweep 3s ease-in-out infinite',
        pointerEvents: 'none', zIndex: 5,
      }} />

      {/* ═══ LIVE PULSE RING (Live only) ═══ */}
      {isLive && (
        <div style={{
          position: 'absolute', inset: -1,
          borderRadius: 'var(--radius-lg)',
          background: 'linear-gradient(135deg, var(--red), var(--purple), var(--cyan))',
          opacity: 0.2,
          zIndex: -1,
          filter: 'blur(12px)',
          animation: 'pulse-live 3s ease-in-out infinite',
        }} />
      )}

      {/* ═══ TOP SECTION: IMAGE + BADGES ═══ */}
      <div style={{
        position: 'relative', height: 140,
        overflow: 'hidden',
        background: 'linear-gradient(135deg, var(--bg-deep), var(--bg-raised))',
      }}>
        {/* Map Background */}
        {match.image ? (
          <img
            src={match.image}
            alt=""
            style={{
              width: '100%', height: '100%', objectFit: 'cover',
              opacity: 0.4, transition: 'transform 0.6s ease, opacity 0.3s ease',
            }}
            className="match-card-bg"
          />
        ) : (
          <div style={{
            position: 'absolute', inset: 0,
            background: `linear-gradient(135deg, ${phase === 'live' ? 'rgba(255,45,85,0.1)' : 'var(--bg-deep)'}, var(--bg-raised))`,
          }} />
        )}

        {/* Gradient Overlay */}
        <div style={{
          position: 'absolute', inset: 0,
          background: 'linear-gradient(to bottom, transparent 40%, var(--bg-raised) 100%)',
        }} />

        {/* Status Badge (Top Left) */}
        <div style={{
          position: 'absolute', top: 12, left: 12, zIndex: 10,
          display: 'flex', alignItems: 'center', gap: 6,
          padding: '4px 12px',
          borderRadius: 'var(--radius-sm)',
          background: ps.badgeBg,
          color: ps.badgeText,
          fontFamily: 'var(--font-body)', fontSize: 10, fontWeight: 800,
          textTransform: 'uppercase', letterSpacing: '0.12em',
          boxShadow: isLive ? 'var(--red-glow)' : 'var(--cyan-glow)',
        }}>
          {isLive && (
            <span style={{
              width: 6, height: 6, borderRadius: '50%', background: '#fff',
              animation: 'blink 1.2s infinite',
              boxShadow: '0 0 8px #fff',
            }} />
          )}
          <i className={ps.statusIcon} style={{ fontSize: 10 }} />
          {ps.statusText}
        </div>

        {/* NO REFUND Badge (Top Right) */}
        {!isCompleted && (
          <div style={{
            position: 'absolute', top: 12, right: 12, zIndex: 10,
            padding: '3px 8px',
            borderRadius: 'var(--radius-sm)',
            background: 'rgba(239, 68, 68, 0.15)',
            border: '1px solid rgba(239, 68, 68, 0.25)',
            fontFamily: 'var(--font-body)', fontSize: 9, fontWeight: 800,
            color: 'var(--danger)', textTransform: 'uppercase', letterSpacing: '0.1em',
          }}>
            No Refund
          </div>
        )}

        {/* Mode Badge (Bottom Left) */}
        <div style={{
          position: 'absolute', bottom: 12, left: 12, zIndex: 10,
          display: 'flex', alignItems: 'center', gap: 6,
          padding: '4px 10px',
          borderRadius: 'var(--radius-sm)',
          background: 'rgba(0,0,0,0.5)',
          backdropFilter: 'blur(8px)',
          border: '1px solid var(--glass-border)',
          fontFamily: 'var(--font-body)', fontSize: 10, fontWeight: 700,
          color: 'var(--text-secondary)', textTransform: 'uppercase',
        }}>
          <i className={`fa-solid ${modeIcon}`} style={{ color: ps.accent, fontSize: 11 }} />
          {match.mode}
        </div>

        {/* Slot Ring (Bottom Right) */}
        <div style={{ position: 'absolute', bottom: 8, right: 12, zIndex: 10 }}>
          <SlotRing current={match.joinedCount || 0} max={match.maxSlots} phase={phase} />
        </div>
      </div>

      {/* ═══ CONTENT SECTION ═══ */}
      <div style={{ padding: '16px 18px', position: 'relative', zIndex: 10 }}>
        {/* Title */}
        <h3 style={{
          fontFamily: 'var(--font-hero)', fontSize: 16, fontWeight: 800,
          color: 'var(--text)', textTransform: 'uppercase',
          letterSpacing: '-0.02em', margin: '0 0 10px',
          lineHeight: 1.2,
          overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap',
          textShadow: isLive ? '0 0 20px rgba(255,45,85,0.3)' : 'none',
        }}>
          {match.title}
        </h3>

        {/* Countdown (Upcoming only, < 1 hour) */}
        {isUpcoming && countdown > 0 && countdown < 3600000 && (
          <div style={{ marginBottom: 12 }}>
            <DigitalCountdown ms={countdown} />
          </div>
        )}

        {/* Info Row */}
        <div style={{
          display: 'flex', alignItems: 'center', gap: 12, marginBottom: 12,
          flexWrap: 'wrap',
        }}>
          <div style={{
            display: 'flex', alignItems: 'center', gap: 5,
            fontSize: 12, color: 'var(--text-muted)',
            fontFamily: 'var(--font-body)', fontWeight: 600,
          }}>
            <i className="fa-solid fa-location-dot" style={{ color: ps.accent, fontSize: 11 }} />
            {match.map}
          </div>
          <div style={{ width: 3, height: 3, borderRadius: '50%', background: 'var(--text-dim)' }} />
          <div style={{
            fontSize: 12, color: 'var(--text-muted)',
            fontFamily: 'var(--font-number)', fontWeight: 700,
          }}>
            {match.gameType === 'BR' ? 'TPP' : 'FPP'}
          </div>
          <div style={{ width: 3, height: 3, borderRadius: '50%', background: 'var(--text-dim)' }} />
          <div style={{
            fontSize: 12, color: 'var(--text-muted)',
            fontFamily: 'var(--font-number)', fontWeight: 700,
          }}>
            {match.joinedCount || 0}/{match.maxSlots} Players
          </div>
        </div>

        {/* Slot Progress Bar */}
        <div style={{ marginBottom: 14 }}>
          <div style={{
            height: 5, background: 'var(--bg-elevated)',
            borderRadius: 'var(--radius-full)', overflow: 'hidden',
            boxShadow: 'inset 0 1px 3px rgba(0,0,0,0.3)',
          }}>
            <div style={{
              height: '100%', width: `${pct}%`,
              background: ps.fillBar,
              borderRadius: 'var(--radius-full)',
              boxShadow: `0 0 10px ${isLive ? 'rgba(255,45,85,0.4)' : 'rgba(0,240,255,0.3)'}`,
              transition: 'width 0.8s cubic-bezier(0.34, 1.56, 0.64, 1)',
            }} />
          </div>
          <div style={{
            display: 'flex', justifyContent: 'space-between', marginTop: 4,
            fontSize: 10, fontFamily: 'var(--font-number)', fontWeight: 700,
          }}>
            <span style={{ color: 'var(--text-muted)' }}>Slots Filled</span>
            <span style={{ color: ps.accent }}>{Math.round(pct)}%</span>
          </div>
        </div>

        {/* Per Kill Reward */}
        {match.perKill > 0 && !isCompleted && (
          <div style={{ marginBottom: 14 }}>
            <div style={{
              display: 'inline-flex', alignItems: 'center', gap: 6,
              padding: '6px 14px',
              borderRadius: 'var(--radius-sm)',
              background: 'linear-gradient(135deg, rgba(251,191,36,0.15), rgba(245,158,11,0.05))',
              border: '1px solid rgba(251,191,36,0.2)',
              fontFamily: 'var(--font-body)', fontSize: 12, fontWeight: 800,
              color: 'var(--gold)', textTransform: 'uppercase', letterSpacing: '0.05em',
              boxShadow: 'var(--gold-glow)',
            }}>
              <i className="fa-solid fa-crosshairs" style={{ fontSize: 11 }} />
              +{match.perKill} TK per Kill
            </div>
          </div>
        )}

        {/* Prize Pool + Entry Fee Row */}
        <div style={{
          display: 'flex', justifyContent: 'space-between', alignItems: 'center',
          padding: '12px 0', borderTop: '1px solid var(--glass-border)',
        }}>
          <div>
            <div style={{
              fontSize: 9, fontWeight: 700, color: 'var(--text-muted)',
              textTransform: 'uppercase', letterSpacing: '0.15em', marginBottom: 2,
            }}>
              Entry Fee
            </div>
            <div style={{
              fontFamily: 'var(--font-number)', fontSize: 18, fontWeight: 800,
              color: 'var(--text)', display: 'flex', alignItems: 'center', gap: 4,
            }}>
              <i className="fa-solid fa-ticket" style={{ fontSize: 12, color: 'var(--purple)' }} />
              {formatTK(match.entryFee)}
            </div>
          </div>

          <div style={{ textAlign: 'right' }}>
            <div style={{
              fontSize: 9, fontWeight: 700, color: 'var(--text-muted)',
              textTransform: 'uppercase', letterSpacing: '0.15em', marginBottom: 2,
            }}>
              Prize Pool
            </div>
            <div style={{
              fontFamily: 'var(--font-number)', fontSize: 22, fontWeight: 800,
              color: 'var(--gold)', textShadow: 'var(--gold-glow)',
              display: 'flex', alignItems: 'center', gap: 6, justifyContent: 'flex-end',
            }}>
              <i className="fa-solid fa-trophy" style={{ fontSize: 14 }} />
              {formatTK(prizePoolValue)}
            </div>
          </div>
        </div>
      </div>

      {/* ═══ ACTION BAR ═══ */}
      {!isCompleted && (
        <div style={{
          padding: '14px 18px',
          background: 'var(--bg-raised)',
          borderTop: '1px solid var(--glass-border)',
          position: 'relative', zIndex: 10,
        }}>
          <ParticleBurst trigger={burstTrigger} />
          <button
            onClick={handleJoin}
            className="join-btn"
            style={{
              width: '100%', padding: '14px 24px',
              borderRadius: 'var(--radius)',
              border: 'none',
              background: isLive
                ? 'linear-gradient(135deg, var(--red), #ff6b8a)'
                : 'linear-gradient(135deg, var(--cyan), var(--purple))',
              color: '#fff',
              fontFamily: 'var(--font-body)', fontSize: 13, fontWeight: 800,
              textTransform: 'uppercase', letterSpacing: '0.12em',
              cursor: 'pointer',
              display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 10,
              boxShadow: isLive ? 'var(--red-glow)' : 'var(--cyan-glow)',
              transition: 'all 0.3s cubic-bezier(0.34, 1.56, 0.64, 1)',
              position: 'relative', overflow: 'hidden',
            }}
            onMouseEnter={e => {
              e.currentTarget.style.transform = 'translateY(-2px) scale(1.02)'
              e.currentTarget.style.boxShadow = isLive
                ? '0 8px 30px rgba(255,45,85,0.4)'
                : '0 8px 30px rgba(0,240,255,0.3)'
            }}
            onMouseLeave={e => {
              e.currentTarget.style.transform = 'translateY(0) scale(1)'
              e.currentTarget.style.boxShadow = isLive ? 'var(--red-glow)' : 'var(--cyan-glow)'
            }}
            onTouchStart={e => {
              e.currentTarget.style.transform = 'scale(0.98)'
            }}
            onTouchEnd={e => {
              e.currentTarget.style.transform = 'scale(1)'
            }}
          >
            <span style={{
              position: 'absolute', top: 0, left: '-100%', width: '100%', height: '100%',
              background: 'linear-gradient(90deg, transparent, rgba(255,255,255,0.2), transparent)',
              transition: 'left 0.5s',
            }} className="btn-shine" />
            <i className={isLive ? 'fa-solid fa-play' : 'fa-solid fa-bolt'} style={{ fontSize: 14 }} />
            {isLive ? 'Watch Live' : 'Join Match'}
            <i className="fa-solid fa-arrow-right" style={{ fontSize: 11, opacity: 0.8 }} />
          </button>
        </div>
      )}

      {/* ═══ COMPLETED OVERLAY ═══ */}
      {isCompleted && (
        <div style={{
          position: 'absolute', inset: 0,
          background: 'rgba(10,10,15,0.7)',
          backdropFilter: 'blur(2px)',
          display: 'flex', alignItems: 'center', justifyContent: 'center',
          zIndex: 20,
        }}>
          <div style={{
            padding: '8px 20px',
            borderRadius: 'var(--radius)',
            background: 'var(--glass-bg)',
            border: '1px solid var(--glass-border)',
            fontFamily: 'var(--font-body)', fontSize: 12, fontWeight: 800,
            color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '0.1em',
          }}>
            <i className="fa-solid fa-check-circle" style={{ marginRight: 8 }} />
            Match Ended
          </div>
        </div>
      )}
    </div>
  )
}