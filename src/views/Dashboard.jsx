import { useState, useEffect, useRef } from 'react'
import { useApp } from '../context'
import MatchCard from '../components/MatchCard'
import { formatTK, formatTKShort, getMatchPhase, getMatchCountdown } from '../utils'

const pad = n => String(n).padStart(2, '0')

function scheduledTime(ts) {
  if (!ts) return { time: 'TBA', date: '' }
  const d = new Date(ts)
  let h = d.getHours()
  const m = pad(d.getMinutes())
  const ap = h >= 12 ? 'PM' : 'AM'
  h = h % 12 || 12
  const day = d.getDate()
  const mons = ['Jan','Feb','Mar','Apr','May','Jun','Jul','Aug','Sep','Oct','Nov','Dec']
  return { time: `${h}:${m} ${ap}`, date: `${day} ${mons[d.getMonth()]}` }
}

function cdFormat(ms) {
  if (ms <= 0) return null
  const h = Math.floor(ms / 3600000)
  const m = Math.floor((ms % 3600000) / 60000)
  const s = Math.floor((ms % 60000) / 1000)
  return `${pad(h)}:${pad(m)}:${pad(s)}`
}

// ═══════════════════════════════════════════════════════════════════════
//  ANIMATED COUNTER HOOK
// ═══════════════════════════════════════════════════════════════════════
function useAnimatedCounter(target, duration = 1000) {
  const [count, setCount] = useState(0)
  const startRef = useRef(null)
  const fromRef = useRef(0)

  useEffect(() => {
    fromRef.current = count
    startRef.current = null
    let raf

    const animate = (timestamp) => {
      if (!startRef.current) startRef.current = timestamp
      const progress = Math.min((timestamp - startRef.current) / duration, 1)
      const easeOut = 1 - Math.pow(1 - progress, 3)
      const current = Math.round(fromRef.current + (target - fromRef.current) * easeOut)
      setCount(current)
      if (progress < 1) raf = requestAnimationFrame(animate)
    }

    raf = requestAnimationFrame(animate)
    return () => cancelAnimationFrame(raf)
  }, [target, duration])

  return count
}

// ═══════════════════════════════════════════════════════════════════════
//  PROGRESS RING COMPONENT
// ═══════════════════════════════════════════════════════════════════════
function ProgressRing({ value, max, size = 80, stroke = 6, children }) {
  const radius = (size - stroke) / 2
  const circumference = 2 * Math.PI * radius
  const offset = circumference - (value / max) * circumference

  return (
    <div className="progress-ring" style={{ width: size, height: size }}>
      <svg width={size} height={size} viewBox={`0 0 ${size} ${size}`}>
        <circle
          className="progress-ring-bg"
          cx={size / 2} cy={size / 2} r={radius}
          strokeWidth={stroke}
        />
        <circle
          className="progress-ring-fill"
          cx={size / 2} cy={size / 2} r={radius}
          strokeWidth={stroke}
          strokeDasharray={circumference}
          strokeDashoffset={offset}
        />
      </svg>
      <div className="progress-ring-text">{children}</div>
    </div>
  )
}

// ═══════════════════════════════════════════════════════════════════════
//  STREAK FLAME COMPONENT
// ═══════════════════════════════════════════════════════════════════════
function StreakFlame({ streak, maxStreak = 7 }) {
  const days = ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun']
  return (
    <div style={{ marginBottom: 20 }}>
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 12 }}>
        <div className="streak-flame">
          <i className="fa-solid fa-fire" style={{ fontSize: 14 }} />
          <span>{streak} Day Streak</span>
        </div>
        <span style={{ fontSize: 11, color: 'var(--text-muted)', fontFamily: 'var(--font-number)', fontWeight: 600 }}>
          {streak >= maxStreak ? 'MAX BONUS!' : `${maxStreak - streak} more for 50 TK`}
        </span>
      </div>
      <div style={{ display: 'flex', gap: 6 }}>
        {days.map((day, i) => (
          <div key={day} style={{
            flex: 1, textAlign: 'center', padding: '8px 4px',
            borderRadius: 'var(--radius-sm)',
            background: i < streak ? 'linear-gradient(135deg, var(--warning), var(--red))' : 'var(--bg-raised)',
            border: `1px solid ${i < streak ? 'rgba(245,158,11,0.3)' : 'var(--glass-border)'}`,
            transition: 'var(--transition)',
          }}>
            <div style={{ fontSize: 9, fontWeight: 700, color: i < streak ? '#fff' : 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '0.1em' }}>
              {day}
            </div>
            <div style={{ fontSize: 12, fontWeight: 800, color: i < streak ? '#fff' : 'var(--text-muted)', fontFamily: 'var(--font-number)', marginTop: 2 }}>
              {i < streak ? <i className="fa-solid fa-check" /> : '·'}
            </div>
          </div>
        ))}
      </div>
    </div>
  )
}

// ═══════════════════════════════════════════════════════════════════════
//  XP BAR COMPONENT
// ═══════════════════════════════════════════════════════════════════════
function XPBar({ xp, level, nextLevelXP }) {
  const progress = (xp / nextLevelXP) * 100
  return (
    <div style={{ marginBottom: 20 }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 8 }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
          <div style={{
            width: 28, height: 28, borderRadius: 'var(--radius-sm)',
            background: 'linear-gradient(135deg, var(--cyan), var(--purple))',
            display: 'flex', alignItems: 'center', justifyContent: 'center',
            fontFamily: 'var(--font-number)', fontSize: 12, fontWeight: 800, color: '#fff',
            boxShadow: 'var(--cyan-glow)',
          }}>
            {level}
          </div>
          <span style={{ fontSize: 13, fontWeight: 700, color: 'var(--text)', fontFamily: 'var(--font-heading)' }}>
            Level {level}
          </span>
        </div>
        <span style={{ fontSize: 11, color: 'var(--text-muted)', fontFamily: 'var(--font-number)', fontWeight: 600 }}>
          {xp} / {nextLevelXP} XP
        </span>
      </div>
      <div style={{
        height: 6, background: 'var(--bg-elevated)', borderRadius: 'var(--radius-full)', overflow: 'hidden',
      }}>
        <div style={{
          height: '100%', width: `${progress}%`,
          background: 'linear-gradient(90deg, var(--cyan), var(--purple))',
          borderRadius: 'var(--radius-full)',
          boxShadow: 'var(--cyan-glow)',
          transition: 'width 1s cubic-bezier(0.34, 1.56, 0.64, 1)',
        }} />
      </div>
    </div>
  )
}

// ═══════════════════════════════════════════════════════════════════════
//  QUICK ACTION BUTTON
// ═══════════════════════════════════════════════════════════════════════
function QuickAction({ icon, label, color, onClick, delay }) {
  return (
    <button
      onClick={onClick}
      className="fade-in"
      style={{
        animationDelay: `${delay}ms`,
        display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 8,
        padding: '16px 12px', borderRadius: 'var(--radius)',
        background: 'var(--glass-bg)', backdropFilter: 'var(--glass-blur)',
        border: '1px solid var(--glass-border)', cursor: 'pointer',
        transition: 'var(--transition)', WebkitTapHighlightColor: 'transparent',
      }}
      onMouseEnter={e => {
        e.currentTarget.style.borderColor = color
        e.currentTarget.style.transform = 'translateY(-4px)'
        e.currentTarget.style.boxShadow = `0 8px 24px ${color}30`
      }}
      onMouseLeave={e => {
        e.currentTarget.style.borderColor = 'var(--glass-border)'
        e.currentTarget.style.transform = 'translateY(0)'
        e.currentTarget.style.boxShadow = 'none'
      }}
    >
      <div style={{
        width: 44, height: 44, borderRadius: 'var(--radius-sm)',
        background: `${color}15`, display: 'flex', alignItems: 'center', justifyContent: 'center',
        fontSize: 20, color, transition: 'var(--transition)',
      }}>
        <i className={icon} />
      </div>
      <span style={{
        fontSize: 10, fontWeight: 700, textTransform: 'uppercase',
        letterSpacing: '0.1em', color: 'var(--text-secondary)',
        fontFamily: 'var(--font-body)',
      }}>
        {label}
      </span>
    </button>
  )
}

// ═══════════════════════════════════════════════════════════════════════
//  HERO BANNER COMPONENT
// ═══════════════════════════════════════════════════════════════════════
function HeroBanner({ hero, heroPhase, heroCountdown, heroJoined, heroTime, onJoin, onNavigate }) {
  const [countdown, setCountdown] = useState(heroCountdown)

  useEffect(() => {
    if (heroPhase === 'live' || heroPhase === 'completed') return
    const interval = setInterval(() => {
      setCountdown(prev => {
        const next = prev - 1000
        return next > 0 ? next : 0
      })
    }, 1000)
    return () => clearInterval(interval)
  }, [heroPhase, heroCountdown])

  if (!hero) return null

  return (
    <div
      className="hero-banner fade-in"
      onClick={() => onNavigate(`match-detail/${hero.id}`)}
    >
      {hero.image ? (
        <img src={hero.image} alt="" />
      ) : (
        <div style={{
          position: 'absolute', inset: 0,
          background: 'linear-gradient(135deg, var(--bg-deep), var(--bg-raised))',
        }} />
      )}

      <div className="content">
        {heroPhase !== 'completed' && (
          <div className="badge">
            {heroPhase === 'live' && <span className="dot" />}
            {heroPhase === 'live' ? 'Live Tournament' : 'Upcoming Arena'}
          </div>
        )}

        <h2 className="title">
          {hero.title.split(' ').slice(0, -1).join(' ')}<br />
          <span style={{ color: 'var(--cyan)' }}>{hero.title.split(' ').slice(-1)}</span>
        </h2>

        <p className="subtitle">
          {hero.mode} {hero.map ? `| ${hero.map}` : ''} {heroTime.date ? `| ${heroTime.date} · ${heroTime.time}` : ''}
        </p>

        {heroPhase !== 'completed' && (
          <div style={{ display: 'flex', alignItems: 'center', gap: 12, marginTop: 16 }}>
            <button
              className="hero-cta"
              onClick={(e) => {
                e.stopPropagation()
                if (heroJoined) return
                onJoin(hero.id)
              }}
              disabled={heroJoined}
              style={{ opacity: heroJoined ? 0.6 : 1, cursor: heroJoined ? 'default' : 'pointer' }}
            >
              {heroJoined ? '✓ Joined' : 'Join Arena'}
            </button>

            {countdown > 0 && heroPhase === 'upcoming' && (
              <div style={{
                fontFamily: 'var(--font-number)', fontSize: 14, fontWeight: 700,
                color: 'var(--cyan)', background: 'rgba(0,0,0,0.4)',
                padding: '8px 16px', borderRadius: 'var(--radius-sm)',
                border: '1px solid var(--glass-border)',
                fontVariantNumeric: 'tabular-nums',
              }}>
                <i className="fa-regular fa-clock" style={{ marginRight: 6, fontSize: 12 }} />
                {cdFormat(countdown)}
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  )
}

// ═══════════════════════════════════════════════════════════════════════
//  WALLET VAULT CARD
// ═══════════════════════════════════════════════════════════════════════
function WalletVault({ balance, onDeposit, onWithdraw, onNavigate }) {
  const animatedBalance = useAnimatedCounter(balance, 1500)

  return (
    <div
      className="wallet-card fade-in"
      onClick={() => onNavigate('wallet')}
      style={{ animationDelay: '100ms', cursor: 'pointer' }}
    >
      <div className="label">Account Balance</div>
      <div className="balance">
        {formatTK(animatedBalance)}
        <span style={{ fontSize: 16, marginLeft: 8, color: 'var(--cyan)', fontWeight: 700 }}>TK</span>
      </div>

      <div className="wallet-actions">
        <button className="wallet-btn withdraw" onClick={(e) => { e.stopPropagation(); onWithdraw() }}>
          <i className="fa-solid fa-arrow-up-from-bracket" /> Withdraw
        </button>
        <button className="wallet-btn add" onClick={(e) => { e.stopPropagation(); onDeposit() }}>
          <i className="fa-solid fa-plus" /> Deposit
        </button>
      </div>
    </div>
  )
}

// ═══════════════════════════════════════════════════════════════════════
//  STAT CARD COMPONENT
// ═══════════════════════════════════════════════════════════════════════
function StatCard({ stat, index, onClick, delay }) {
  return (
    <div
      className="fade-in"
      onClick={onClick}
      style={{
        animationDelay: `${delay}ms`,
        background: stat.highlight ? 'var(--glass-bg)' : 'var(--bg-raised)',
        border: stat.highlight ? '1px solid rgba(0,240,255,0.15)' : '1px solid transparent',
        borderRadius: 'var(--radius)', padding: '16px',
        cursor: 'pointer', position: 'relative', overflow: 'hidden',
        backdropFilter: stat.highlight ? 'var(--glass-blur)' : 'none',
        transition: 'var(--transition)', WebkitTapHighlightColor: 'transparent',
      }}
      onMouseEnter={e => {
        e.currentTarget.style.transform = 'translateY(-4px)'
        e.currentTarget.style.borderColor = 'var(--glass-border-hover)'
        e.currentTarget.style.boxShadow = 'var(--shadow)'
      }}
      onMouseLeave={e => {
        e.currentTarget.style.transform = 'translateY(0)'
        e.currentTarget.style.borderColor = stat.highlight ? 'rgba(0,240,255,0.15)' : 'transparent'
        e.currentTarget.style.boxShadow = 'none'
      }}
    >
      {stat.highlight && (
        <i className="fa-solid fa-military-tech" style={{
          position: 'absolute', right: -8, bottom: -8, fontSize: 64,
          color: 'var(--cyan)', opacity: 0.06,
        }} />
      )}
      <i className={stat.icon} style={{
        fontSize: 20, color: stat.color || 'var(--cyan)', marginBottom: 14, display: 'block',
        filter: stat.highlight ? 'drop-shadow(0 0 8px rgba(0,240,255,0.4))' : 'none',
      }} />
      <div style={{ position: 'relative', zIndex: 1 }}>
        <p style={{
          fontSize: 10, fontWeight: 700, textTransform: 'uppercase',
          letterSpacing: '0.1em', color: 'var(--text-muted)', margin: 0,
          fontFamily: 'var(--font-body)',
        }}>
          {stat.label}
        </p>
        <p style={{
          fontFamily: stat.highlight ? 'var(--font-hero)' : 'var(--font-number)',
          fontSize: 22, fontWeight: 800,
          color: stat.highlight ? 'var(--cyan)' : 'var(--text)',
          margin: 0, letterSpacing: stat.highlight ? '-0.03em' : 0,
          fontStyle: stat.highlight ? 'italic' : 'normal',
          textTransform: stat.highlight ? 'uppercase' : 'none',
          textShadow: stat.highlight ? 'var(--cyan-glow)' : 'none',
        }}>
          {stat.value}
        </p>
      </div>
    </div>
  )
}

// ═══════════════════════════════════════════════════════════════════════
//  SECTION HEADER
// ═══════════════════════════════════════════════════════════════════════
function SectionHeader({ title, count, link, onNavigate }) {
  return (
    <div style={{
      display: 'flex', alignItems: 'flex-end', justifyContent: 'space-between',
      marginBottom: 14, borderBottom: '1px solid var(--glass-border)', paddingBottom: 12,
    }}>
      <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
        <div style={{ width: 4, height: 20, background: 'var(--cyan)', flexShrink: 0, boxShadow: 'var(--cyan-glow)' }} />
        <h3 className="title-section" style={{ margin: 0, fontSize: 16 }}>{title}</h3>
        {count !== undefined && (
          <span style={{ fontSize: 12, color: 'var(--text-muted)', fontFamily: 'var(--font-number)', fontWeight: 600 }}>
            ({count})
          </span>
        )}
      </div>
      {link && (
        <span
          onClick={() => onNavigate(link)}
          style={{
            fontSize: 10, fontWeight: 700, color: 'var(--cyan)',
            fontFamily: 'var(--font-body)',
            textTransform: 'uppercase', letterSpacing: '0.1em', cursor: 'pointer',
            transition: 'var(--transition)',
          }}
          onMouseEnter={e => e.currentTarget.style.textShadow = 'var(--cyan-glow)'}
          onMouseLeave={e => e.currentTarget.style.textShadow = 'none'}
        >
          View All
        </span>
      )}
    </div>
  )
}

// ═══════════════════════════════════════════════════════════════════════
//  MATCH CAROUSEL (Horizontal Scroll)
// ═══════════════════════════════════════════════════════════════════════
function MatchCarousel({ matches, emptyMessage }) {
  if (matches.length === 0) {
    return (
      <div style={{
        textAlign: 'center', padding: '40px 20px',
        background: 'var(--bg-raised)', borderRadius: 'var(--radius)',
        border: '1px solid var(--glass-border)',
      }}>
        <i className="fa-solid fa-gamepad" style={{ fontSize: 32, color: 'var(--bg-elevated)', marginBottom: 12, display: 'block' }} />
        <p style={{
          fontFamily: 'var(--font-body)', fontSize: 12, fontWeight: 700,
          color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '0.1em', margin: 0,
        }}>
          {emptyMessage}
        </p>
      </div>
    )
  }

  return (
    <div className="h-scroll" style={{ margin: '-4px -16px', padding: '4px 16px' }}>
      {matches.map((m, i) => (
        <div key={m.id} className="fade-in" style={{ animationDelay: `${i * 100}ms` }}>
          <MatchCard match={m} />
        </div>
      ))}
    </div>
  )
}

// ═══════════════════════════════════════════════════════════════════════
//  MAIN DASHBOARD
// ═══════════════════════════════════════════════════════════════════════
export default function Dashboard() {
  const { state, dispatch, navigate } = useApp()
  const { matches, currentUser } = state

  if (!currentUser) return null

  // Gamification data (will come from state in future)
  const streak = currentUser.streak || 3
  const level = currentUser.level || 5
  const xp = currentUser.xp || 340
  const nextLevelXP = currentUser.nextLevelXP || 500

  const liveMatches = matches.filter(m => m.status === 'live')
  const upcomingMatches = matches
    .filter(m => m.status === 'upcoming')
    .sort((a, b) => {
      const tA = a.startTime ? new Date(a.startTime.replace(' ', 'T')).getTime() : Infinity
      const tB = b.startTime ? new Date(b.startTime.replace(' ', 'T')).getTime() : Infinity
      return tA - tB
    })
  const completedMatches = matches.filter(m => m.status === 'completed')
  const myJoinedCount = matches.filter(m => m.participants?.includes(currentUser.id)).length

  const hero = upcomingMatches[0] || liveMatches[0] || completedMatches[0]
  const heroPhase = hero ? getMatchPhase(hero) : 'unknown'
  const heroCountdown = hero ? getMatchCountdown(hero) : 0
  const heroJoined = hero ? hero.participants?.includes(currentUser.id) : false
  const heroTime = hero ? scheduledTime(hero.startTime) : { time: 'TBA', date: '' }

  const stats = [
    { label: 'Live Matches', value: liveMatches.length, icon: 'fa-solid fa-circle-play', color: 'var(--cyan)' },
    { label: 'My Matches', value: myJoinedCount, icon: 'fa-solid fa-user-check', color: 'var(--purple)' },
    { label: 'Win Rate', value: '68.4%', icon: 'fa-solid fa-check-double', color: 'var(--success)' },
    { label: 'Rank', value: currentUser.rank || 'Unranked', icon: 'fa-solid fa-military-tech', color: 'var(--cyan)', highlight: true },
  ]

  const handleJoin = (matchId) => {
    dispatch({ type: 'SHOW_MODAL', payload: { type: 'join-match', matchId } })
  }

  const handleDeposit = () => {
    dispatch({ type: 'SHOW_MODAL', payload: { type: 'add-money' } })
  }

  const handleWithdraw = () => {
    dispatch({ type: 'SHOW_MODAL', payload: { type: 'withdraw' } })
  }

  return (
    <div style={{ padding: '0 0 100px 0' }}>

      {/* ═══ HERO BANNER ═══ */}
      <HeroBanner
        hero={hero}
        heroPhase={heroPhase}
        heroCountdown={heroCountdown}
        heroJoined={heroJoined}
        heroTime={heroTime}
        onJoin={handleJoin}
        onNavigate={navigate}
      />

      {/* ═══ GAMIFICATION BAR (Streak + XP) ═══ */}
      <div className="fade-in" style={{ animationDelay: '150ms' }}>
        <StreakFlame streak={streak} />
        <XPBar xp={xp} level={level} nextLevelXP={nextLevelXP} />
      </div>

      {/* ═══ WALLET VAULT ═══ */}
      <WalletVault
        balance={currentUser.balance || 0}
        onDeposit={handleDeposit}
        onWithdraw={handleWithdraw}
        onNavigate={navigate}
      />

      {/* ═══ QUICK ACTIONS ═══ */}
      <div style={{
        display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: 8, marginBottom: 24, marginTop: 16,
      }}>
        <QuickAction
          icon="fa-solid fa-gamepad" label="Join" color="var(--cyan)"
          onClick={() => navigate('matches')} delay={200}
        />
        <QuickAction
          icon="fa-solid fa-trophy" label="Ranks" color="var(--purple)"
          onClick={() => navigate('leaderboard')} delay={300}
        />
        <QuickAction
          icon="fa-solid fa-clock-rotate-left" label="History" color="var(--success)"
          onClick={() => navigate('profile')} delay={400}
        />
        <QuickAction
          icon="fa-solid fa-share-nodes" label="Refer" color="var(--warning)"
          onClick={() => navigate('settings')} delay={500}
        />
      </div>

      {/* ═══ STATS GRID ═══ */}
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 8, marginBottom: 24 }}>
        {stats.map((s, i) => (
          <StatCard
            key={s.label}
            stat={s}
            index={i}
            delay={600 + i * 100}
            onClick={() => navigate(i === 3 ? 'leaderboard' : 'matches')}
          />
        ))}
      </div>

      {/* ═══ LIVE MATCHES ═══ */}
      {liveMatches.length > 0 && (
        <div className="fade-in" style={{ marginBottom: 24, animationDelay: '800ms' }}>
          <SectionHeader title="Live Now" count={liveMatches.length} link="matches" onNavigate={navigate} />
          <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
            {liveMatches.map(m => <MatchCard key={m.id} match={m} />)}
          </div>
        </div>
      )}

      {/* ═══ UPCOMING MATCHES — Horizontal Carousel ═══ */}
      {upcomingMatches.length > 0 && (
        <div className="fade-in" style={{ marginBottom: 24, animationDelay: '900ms' }}>
          <SectionHeader title="Upcoming Arenas" count={upcomingMatches.length} link="matches" onNavigate={navigate} />
          <MatchCarousel matches={upcomingMatches.slice(0, 5)} emptyMessage="No upcoming matches" />
        </div>
      )}

      {/* ═══ COMPLETED MATCHES ═══ */}
      {completedMatches.length > 0 && (
        <div className="fade-in" style={{ marginBottom: 24, animationDelay: '1000ms' }}>
          <SectionHeader title="Completed" count={completedMatches.length} onNavigate={navigate} />
          <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
            {completedMatches.slice(0, 3).map(m => <MatchCard key={m.id} match={m} />)}
          </div>
        </div>
      )}

      {/* ═══ EMPTY STATE ═══ */}
      {matches.length === 0 && (
        <div className="fade-in" style={{
          textAlign: 'center', padding: '60px 20px',
          background: 'var(--bg-raised)', borderRadius: 'var(--radius)',
          border: '1px solid var(--glass-border)',
        }}>
          <i className="fa-solid fa-gamepad" style={{ fontSize: 40, color: 'var(--bg-elevated)', marginBottom: 12, display: 'block' }} />
          <p style={{
            fontFamily: 'var(--font-body)', fontSize: 12, fontWeight: 700,
            color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '0.1em', margin: 0,
          }}>
            No matches available
          </p>
          <button
            className="btn btn-primary"
            onClick={() => navigate('matches')}
            style={{ marginTop: 16 }}
          >
            Browse Matches
          </button>
        </div>
      )}
    </div>
  )
}