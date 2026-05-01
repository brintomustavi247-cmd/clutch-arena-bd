import { useState, useEffect, useRef, useCallback } from 'react'
import { useApp } from '../context'
import { formatTK, slotPercent, getMatchPhase, getMatchCountdown } from '../utils'
import './MatchCard.css'  // ← THIS LINE MUST EXIST

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
    <div className="countdown-digit-box">
      <div className="countdown-digit-value">{String(value).padStart(2, '0')}</div>
      <div className="countdown-digit-label">{label}</div>
    </div>
  )

  return (
    <div className="digital-countdown">
      {h > 0 && <><Digit value={h} label="HR" /><span className="countdown-separator">:</span></>}
      <Digit value={m} label="MIN" />
      <span className="countdown-separator">:</span>
      <Digit value={s} label="SEC" />
    </div>
  )
}

// ═══════════════════════════════════════════════════════════════════════
//  PROGRESS RING (Slots) — Gambit CIS inspired
// ═══════════════════════════════════════════════════════════════════════
function SlotRing({ current, max, phase }) {
  const pct = Math.min((current / max) * 100, 100)
  const circumference = 2 * Math.PI * 18
  const offset = circumference - (pct / 100) * circumference
  const color = phase === 'live' ? '#ef4444' : phase === 'completed' ? '#6b7280' : '#06b6d4'

  return (
    <div className="slot-ring">
      <svg width="40" height="40" viewBox="0 0 40 40" style={{ transform: 'rotate(-90deg)' }}>
        <circle cx="20" cy="20" r="18" fill="none" stroke="#1a1a2e" strokeWidth="3" />
        <circle cx="20" cy="20" r="18" fill="none" stroke={color} strokeWidth="3" strokeLinecap="round"
          strokeDasharray={circumference} strokeDashoffset={offset}
          style={{ transition: 'stroke-dashoffset 0.6s cubic-bezier(0.34, 1.56, 0.64, 1)' }} />
      </svg>
      <div className="slot-ring-text">{current}</div>
    </div>
  )
}

// ═══════════════════════════════════════════════════════════════════════
//  AVATAR STACK (Inspired by eSports Mobile)
// ═══════════════════════════════════════════════════════════════════════
function AvatarStack({ participants = [], maxShow = 4 }) {
  const displayCount = Math.min(participants.length, maxShow)
  const remaining = Math.max(participants.length - maxShow, 0)

  return (
    <div className="avatar-stack">
      {participants.slice(0, maxShow).map((p, i) => (
        <div key={p.userId || i} className="avatar-item" style={{ zIndex: maxShow - i }} title={p.name || p.username || 'Player'}>
          {p.avatar ? (
            <img src={p.avatar} alt="" />
          ) : (
            <div className="avatar-placeholder">{(p.name || p.username || '?')[0].toUpperCase()}</div>
          )}
        </div>
      ))}
      {remaining > 0 && <div className="avatar-more">+{remaining}</div>}
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
    const rotateX = (y - 0.5) * -10
    const rotateY = (x - 0.5) * 10
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
      color: ['#06b6d4', '#8b5cf6', '#f59e0b', '#ffffff'][i % 4],
      delay: i * 30,
    }))
    setParticles(newParticles)
    const timer = setTimeout(() => setParticles([]), 1000)
    return () => clearTimeout(timer)
  }, [trigger])

  if (particles.length === 0) return null

  return (
    <div className="particle-burst">
      {particles.map(p => (
        <div key={p.id} className="particle" style={{
          background: p.color,
          boxShadow: `0 0 6px ${p.color}`,
          animationDelay: `${p.delay}ms`,
          transform: `rotate(${p.angle}deg)`,
        }} />
      ))}
    </div>
  )
}

// ═══════════════════════════════════════════════════════════════════════
//  WHATSAPP SHARE BUTTON — V5.0 Growth Engine
// ═══════════════════════════════════════════════════════════════════════
function WhatsAppShare({ match, onShare }) {
  const handleShare = (e) => {
    e.stopPropagation()
    const text = `🔥 *${match.title}* on Clutch Arena BD!\n\n` +
      `🎮 Mode: ${match.mode}\n` +
      `🗺️ Map: ${match.map}\n` +
      `💰 Prize Pool: ${formatTK(match.prizePool || match.entryFee * match.maxSlots * 0.8)} TK\n` +
      `🎫 Entry: ${formatTK(match.entryFee)} TK\n` +
      `👥 ${match.joinedCount || 0}/${match.maxSlots} Joined\n\n` +
      `Join now: https://clutcharena.bd/match/${match.id}`
    window.open(`https://wa.me/?text=${encodeURIComponent(text)}`, '_blank')
    onShare?.()
  }

  return (
    <button className="whatsapp-share-btn" onClick={handleShare} title="Share on WhatsApp">
      <i className="fa-brands fa-whatsapp" />
    </button>
  )
}

// ═══════════════════════════════════════════════════════════════════════
//  PRIZE BADGE — Floating trophy indicator
// ═══════════════════════════════════════════════════════════════════════
function PrizeBadge({ amount }) {
  return (
    <div className="prize-badge">
      <i className="fa-solid fa-trophy" />
      <span>{formatTK(amount)} TK</span>
    </div>
  )
}

// ═══════════════════════════════════════════════════════════════════════
//  MAIN MATCH CARD V2 — COMPLETE GAMING AESTHETIC
// ═══════════════════════════════════════════════════════════════════════
export default function MatchCard({ match, variant = 'default', index = 0 }) {
  const { dispatch, navigate } = useApp()
  const [countdown, setCountdown] = useState(getMatchCountdown(match))
  const [burstTrigger, setBurstTrigger] = useState(0)
  const [isHovered, setIsHovered] = useState(false)
  const { ref, style, onMouseMove, onMouseLeave } = useTilt()

  const phase = getMatchPhase(match)
  const isLive = phase === 'live'
  const isUpcoming = phase === 'upcoming'
  const isCompleted = phase === 'completed'
  const pct = slotPercent(match)
  const prizePoolValue = match.prizePool || Math.round(match.entryFee * match.maxSlots * 0.8)

  useEffect(() => {
    if (!isUpcoming) return
    const interval = setInterval(() => setCountdown(getMatchCountdown(match)), 1000)
    return () => clearInterval(interval)
  }, [isUpcoming, match])

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

  const handleViewDetail = () => navigate(`match-detail/${match.id}`)
  const handleShareMatch = () => dispatch({ type: 'SHARE_MATCH', payload: match.id })

  const modeIcon = match.mode === 'Solo' ? 'fa-user'
    : match.mode === 'Duo' ? 'fa-user-group'
    : match.mode === 'Clash Squad' ? 'fa-crosshairs'
    : 'fa-shield-halved'

  const isGlow = variant === 'glow'
  const isDim = variant === 'dim'

  const phaseColors = {
    live: { accent: '#ef4444', gradient: 'linear-gradient(135deg, #ef4444, #f97316)', glow: 'rgba(239, 68, 68, 0.3)' },
    upcoming: { accent: '#8b5cf6', gradient: 'linear-gradient(135deg, #8b5cf6, #06b6d4)', glow: 'rgba(139, 92, 246, 0.3)' },
    completed: { accent: '#6b7280', gradient: 'linear-gradient(135deg, #374151, #4b5563)', glow: 'transparent' },
  }
  const pc = phaseColors[phase] || phaseColors.upcoming

  return (
    <div
      ref={ref}
      onClick={handleViewDetail}
      onMouseMove={onMouseMove}
      onMouseLeave={(e) => { onMouseLeave(e); setIsHovered(false) }}
      onMouseEnter={() => setIsHovered(true)}
      className={`match-card-v2 ${isGlow ? 'match-card-glow' : ''} ${isDim ? 'match-card-dim' : ''}`}
      style={{ ...style, animationDelay: `${index * 80}ms`, '--card-accent': pc.accent, '--card-glow': pc.glow }}
    >
      {isGlow && <div className={`card-glow-border ${isHovered ? 'active' : ''}`} style={{ background: pc.gradient }} />}
      <div className="holographic-shine" />
      {isLive && <div className="live-pulse-ring" />}

      <div className="match-card-header">
        {match.image ? (
          <img src={match.image} alt="" className="match-card-bg" />
        ) : (
          <div className="match-card-bg-fallback" style={{ background: pc.gradient }} />
        )}
        <div className="match-card-overlay" />

        <div className="status-badge" style={{ background: pc.gradient, boxShadow: `0 0 20px ${pc.glow}` }}>
          {isLive && <span className="live-dot" />}
          <i className={isLive ? 'fa-solid fa-tower-broadcast' : isUpcoming ? 'fa-regular fa-clock' : 'fa-solid fa-check-circle'} />
          {isLive ? 'LIVE NOW' : isUpcoming ? matchTimeStr || 'UPCOMING' : 'COMPLETED'}
        </div>

        <div className="prize-badge-wrapper">
          <PrizeBadge amount={prizePoolValue} />
        </div>

        {!isCompleted && (
          <div className="no-refund-badge">
            <i className="fa-solid fa-shield-halved" /> No Refund
          </div>
        )}

        <div className="mode-badge">
          <i className={`fa-solid ${modeIcon}`} style={{ color: pc.accent }} />
          {match.mode}
        </div>

        <div className="slot-ring-wrapper">
          <SlotRing current={match.joinedCount || 0} max={match.maxSlots} phase={phase} />
        </div>

        {!isCompleted && (
          <div className="share-wrapper">
            <WhatsAppShare match={match} onShare={handleShareMatch} />
          </div>
        )}
      </div>

      <div className="match-card-content">
        <h3 className="match-title" style={{ textShadow: isLive ? `0 0 20px ${pc.glow}` : 'none' }}>
          {match.title}
        </h3>

        {isUpcoming && countdown > 0 && countdown < 3600000 && (
          <div className="countdown-wrapper"><DigitalCountdown ms={countdown} /></div>
        )}

        <div className="match-meta-row">
          <span className="meta-item"><i className="fa-solid fa-location-dot" style={{ color: pc.accent }} />{match.map}</span>
          <span className="meta-dot" />
          <span className="meta-item">{match.gameType === 'BR' ? 'TPP' : 'FPP'}</span>
          <span className="meta-dot" />
          <span className="meta-item"><i className="fa-solid fa-users" style={{ color: pc.accent }} />{match.joinedCount || 0}/{match.maxSlots}</span>
        </div>

        {match.joined && match.joined.length > 0 && (
          <div className="match-avatars-row">
            <AvatarStack participants={match.joined} maxShow={4} />
            <span className="players-text">{match.joinedCount || 0} warriors joined</span>
          </div>
        )}

        <div className="slot-progress">
          <div className="slot-track">
            <div className="slot-fill" style={{ width: `${pct}%`, background: pc.gradient, boxShadow: `0 0 10px ${pc.glow}` }} />
          </div>
          <div className="slot-labels">
            <span>Slots Filled</span>
            <span style={{ color: pc.accent }}>{Math.round(pct)}%</span>
          </div>
        </div>

        {match.perKill > 0 && !isCompleted && (
          <div className="per-kill-badge">
            <i className="fa-solid fa-crosshairs" />+{match.perKill} TK per Kill
          </div>
        )}

        <div className="prize-row">
          <div className="prize-item">
            <div className="prize-label">Entry Fee</div>
            <div className="prize-value"><i className="fa-solid fa-ticket" style={{ color: '#8b5cf6' }} />{formatTK(match.entryFee)}</div>
          </div>
          <div className="prize-item right">
            <div className="prize-label">Prize Pool</div>
            <div className="prize-value gold"><i className="fa-solid fa-trophy" />{formatTK(prizePoolValue)}</div>
          </div>
        </div>
      </div>

      {!isCompleted && (
        <div className="match-card-actions">
          <ParticleBurst trigger={burstTrigger} />
          <button
            className="join-btn-v2"
            style={{ background: pc.gradient, boxShadow: `0 4px 20px ${pc.glow}` }}
            onClick={handleJoin}
            onMouseEnter={e => {
              e.currentTarget.style.transform = 'translateY(-2px) scale(1.02)'
              e.currentTarget.style.boxShadow = `0 8px 30px ${pc.glow}`
            }}
            onMouseLeave={e => {
              e.currentTarget.style.transform = 'translateY(0) scale(1)'
              e.currentTarget.style.boxShadow = `0 4px 20px ${pc.glow}`
            }}
          >
            <span className="btn-shine" />
            <i className={isLive ? 'fa-solid fa-play' : 'fa-solid fa-bolt'} />
            {isLive ? 'Watch Live' : 'Join Match'}
    <span className="join-fee">{formatTK(match.entryFee)}</span>
            <i className="fa-solid fa-arrow-right" />
          </button>
        </div>
      )}

      {isCompleted && (
        <div className="completed-overlay">
          <div className="completed-badge"><i className="fa-solid fa-flag-checkered" />Match Ended</div>
        </div>
      )}
    </div>
  )
}