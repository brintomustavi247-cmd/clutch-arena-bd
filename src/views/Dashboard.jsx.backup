import { useState, useEffect, useRef, useCallback } from 'react'
import { useApp } from '../context'
import MatchCard from '../components/MatchCard'
import { formatTK, getMatchPhase, getMatchCountdown } from '../utils'

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
//  ANIMATED COUNTER
// ═══════════════════════════════════════════════════════════════════════
function useAnimatedCounter(target, duration = 1200) {
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
//  CIRCULAR STAT BADGE (Inspired by Gambit CIS)
// ═══════════════════════════════════════════════════════════════════════
function CircularStat({ value, label, color, icon, suffix = '' }) {
  const size = 72
  const stroke = 4
  const radius = (size - stroke) / 2
  const circumference = 2 * Math.PI * radius
  const pct = Math.min(value / 100, 1)
  const offset = circumference - pct * circumference

  return (
    <div className="circular-stat">
      <div className="circular-stat-ring" style={{ width: size, height: size }}>
        <svg width={size} height={size}>
          <circle className="ring-bg" cx={size/2} cy={size/2} r={radius} strokeWidth={stroke} />
          <circle
            className="ring-fill"
            cx={size/2} cy={size/2} r={radius} strokeWidth={stroke}
            strokeDasharray={circumference}
            strokeDashoffset={offset}
            style={{ stroke: color }}
          />
        </svg>
        <div className="ring-text">
          <i className={icon} style={{ color, fontSize: 14 }} />
          <span style={{ color, fontSize: 16, fontWeight: 800 }}>{value}{suffix}</span>
        </div>
      </div>
      <span className="circular-stat-label">{label}</span>
    </div>
  )
}

// ═══════════════════════════════════════════════════════════════════════
//  STREAK BAR (Upgraded from flame)
// ═══════════════════════════════════════════════════════════════════════
function StreakBar({ streak, maxStreak = 7 }) {
  const days = ['M','T','W','T','F','S','S']
  return (
    <div className="streak-bar">
      <div className="streak-header">
        <div className="streak-title">
          <i className="fa-solid fa-fire" style={{ color: '#f59e0b' }} />
          <span>{streak} Day Streak</span>
        </div>
        <span className="streak-bonus">
          {streak >= maxStreak ? '🔥 MAX BONUS!' : `${maxStreak - streak} more for 50 TK`}
        </span>
      </div>
      <div className="streak-days">
        {days.map((day, i) => (
          <div key={i} className={`streak-day ${i < streak ? 'active' : ''}`}>
            <span className="day-letter">{day}</span>
            <span className="day-check">{i < streak ? '✓' : '·'}</span>
          </div>
        ))}
      </div>
    </div>
  )
}

// ═══════════════════════════════════════════════════════════════════════
//  XP BAR (Upgraded)
// ═══════════════════════════════════════════════════════════════════════
function XPBar({ xp, level, nextLevelXP }) {
  const progress = Math.min((xp / nextLevelXP) * 100, 100)
  return (
    <div className="xp-bar">
      <div className="xp-header">
        <div className="xp-level">
          <div className="level-badge">{level}</div>
          <span>Level {level}</span>
        </div>
        <span className="xp-text">{xp} / {nextLevelXP} XP</span>
      </div>
      <div className="xp-track">
        <div className="xp-fill" style={{ width: `${progress}%` }} />
      </div>
    </div>
  )
}

// ═══════════════════════════════════════════════════════════════════════
//  HERO BANNER (Upgraded — PUBG/Free Fire vibe)
// ═══════════════════════════════════════════════════════════════════════
function HeroBanner({ hero, heroPhase, heroCountdown, heroJoined, heroTime, onJoin, onNavigate }) {
  const [countdown, setCountdown] = useState(heroCountdown)

  useEffect(() => {
    if (heroPhase === 'live' || heroPhase === 'completed') return
    const interval = setInterval(() => {
      setCountdown(prev => prev > 1000 ? prev - 1000 : 0)
    }, 1000)
    return () => clearInterval(interval)
  }, [heroPhase, heroCountdown])

  if (!hero) return null

  return (
    <div className="hero-banner-v2" onClick={() => onNavigate(`match-detail/${hero.id}`)}>
      {/* Animated gradient mesh background */}
      <div className="hero-mesh">
        <div className="mesh-blob mesh-1" />
        <div className="mesh-blob mesh-2" />
        <div className="mesh-blob mesh-3" />
      </div>

      {/* Content */}
      <div className="hero-content">
        <div className="hero-badge-row">
          {heroPhase === 'live' ? (
            <span className="hero-badge live">
              <span className="live-dot" /> LIVE NOW
            </span>
          ) : (
            <span className="hero-badge upcoming">UPCOMING ARENA</span>
          )}
          <span className="hero-prize">
            <i className="fa-solid fa-trophy" /> {formatTK(hero.prizePool || 0)} TK
          </span>
        </div>

        <h2 className="hero-title">
          {hero.title || 'Clutch Arena'}
          <span className="hero-title-accent"> Tournament</span>
        </h2>

        <p className="hero-meta">
          <span className="meta-pill"><i className="fa-solid fa-gamepad" /> {hero.mode || 'Solo'}</span>
          <span className="meta-pill"><i className="fa-solid fa-map" /> {hero.map || 'Erangel'}</span>
          <span className="meta-pill"><i className="fa-regular fa-clock" /> {heroTime.time}</span>
        </p>

        <div className="hero-actions">
          <button
            className={`hero-cta ${heroJoined ? 'joined' : ''}`}
            onClick={(e) => { e.stopPropagation(); if (!heroJoined) onJoin(hero.id) }}
            disabled={heroJoined}
          >
            {heroJoined ? (
              <><i className="fa-solid fa-check" /> Joined</>
            ) : (
              <><i className="fa-solid fa-bolt" /> Join Arena — {formatTK(hero.entryFee || 30)} TK</>
            )}
          </button>

          {countdown > 0 && heroPhase === 'upcoming' && (
            <div className="hero-countdown">
              <i className="fa-regular fa-clock" />
              {cdFormat(countdown)}
            </div>
          )}
        </div>

        {/* Player avatars stack */}
        <div className="hero-players">
          <div className="avatar-stack">
            {[1,2,3,4].map(i => (
              <div key={i} className="hero-avatar" style={{ zIndex: 5-i }}>
                <div className="avatar-glow" />
              </div>
            ))}
            <div className="avatar-more">+{Math.max((hero.maxPlayers || 50) - 4, 0)}</div>
          </div>
          <span className="players-text">
            {hero.participants?.length || 0}/{hero.maxPlayers || 50} warriors joined
          </span>
        </div>
      </div>

      {/* Decorative character silhouette */}
      <div className="hero-character">
        <div className="character-silhouette" />
      </div>
    </div>
  )
}

// ═══════════════════════════════════════════════════════════════════════
//  WALLET VAULT V2 (With locked balance + quick actions)
// ═══════════════════════════════════════════════════════════════════════
function WalletVaultV2({ balance, lockedBalance, onDeposit, onWithdraw, onNavigate }) {
  const animatedBalance = useAnimatedCounter(balance, 1500)
  const animatedLocked = useAnimatedCounter(lockedBalance, 1500)

  return (
    <div className="wallet-v2" onClick={() => onNavigate('wallet')}>
      <div className="wallet-glow" />
      <div className="wallet-inner">
        <div className="wallet-header">
          <div className="wallet-label">
            <i className="fa-solid fa-wallet" /> Available Balance
          </div>
          <div className="wallet-locked">
            <i className="fa-solid fa-lock" /> {formatTK(animatedLocked)} TK locked
          </div>
        </div>

        <div className="wallet-balance">
          <span className="balance-currency">৳</span>
          <span className="balance-amount">{formatTK(animatedBalance)}</span>
          <span className="balance-unit">TK</span>
        </div>

        <div className="wallet-actions">
          <button className="wallet-btn withdraw" onClick={(e) => { e.stopPropagation(); onWithdraw() }}>
            <i className="fa-solid fa-arrow-up-from-bracket" /> Withdraw
          </button>
          <button className="wallet-btn deposit" onClick={(e) => { e.stopPropagation(); onDeposit() }}>
            <i className="fa-solid fa-plus" /> Deposit
          </button>
        </div>
      </div>
    </div>
  )
}

// ═══════════════════════════════════════════════════════════════════════
//  QUICK ACTION V2 (Glowing hover)
// ═══════════════════════════════════════════════════════════════════════
function QuickActionV2({ icon, label, color, onClick, badge }) {
  return (
    <button className="quick-action-v2" onClick={onClick} style={{ '--qa-color': color }}>
      {badge && <span className="qa-badge">{badge}</span>}
      <div className="qa-icon">
        <i className={icon} />
      </div>
      <span className="qa-label">{label}</span>
    </button>
  )
}

// ═══════════════════════════════════════════════════════════════════════
//  CLUTCH SPIN WHEEL (Daily lottery)
// ═══════════════════════════════════════════════════════════════════════
function ClutchSpin({ onSpin, canSpin, lastSpin }) {
  const [spinning, setSpinning] = useState(false)
  const [result, setResult] = useState(null)

  const prizes = [
    { label: '5 TK', chance: 50, color: '#6b7280' },
    { label: '10 TK', chance: 30, color: '#8b5cf6' },
    { label: '15 TK', chance: 15, color: '#06b6d4' },
    { label: '25 TK', chance: 4, color: '#f59e0b' },
    { label: 'FREE MATCH', chance: 1, color: '#ef4444' },
  ]

  const handleSpin = () => {
    if (!canSpin || spinning) return
    setSpinning(true)
    setTimeout(() => {
      const rand = Math.random() * 100
      let cum = 0
      let won = prizes[0]
      for (const p of prizes) {
        cum += p.chance
        if (rand <= cum) { won = p; break }
      }
      setResult(won)
      setSpinning(false)
      onSpin(won)
    }, 2000)
  }

  return (
    <div className="clutch-spin">
      <div className="spin-header">
        <div className="spin-title">
          <i className="fa-solid fa-diamond" style={{ color: '#f59e0b' }} />
          <span>Clutch Spin</span>
        </div>
        {canSpin ? (
          <span className="spin-status ready">Ready!</span>
        ) : (
          <span className="spin-status wait">Come back tomorrow</span>
        )}
      </div>

      <div className={`spin-wheel ${spinning ? 'spinning' : ''}`}>
        <div className="wheel-center">
          {spinning ? (
            <i className="fa-solid fa-spinner fa-spin" style={{ fontSize: 32, color: '#f59e0b' }} />
          ) : result ? (
            <div className="spin-result">
              <span className="result-prize" style={{ color: result.color }}>{result.label}</span>
              <span className="result-won">WON!</span>
            </div>
          ) : (
            <i className="fa-solid fa-gift" style={{ fontSize: 28, color: '#f59e0b' }} />
          )}
        </div>
        {prizes.map((p, i) => (
          <div key={i} className="wheel-slice" style={{ '--slice-color': p.color, '--slice-index': i }}>
            <span>{p.label}</span>
          </div>
        ))}
      </div>

      <button
        className={`spin-btn ${canSpin && !spinning ? 'active' : 'disabled'}`}
        onClick={handleSpin}
        disabled={!canSpin || spinning}
      >
        {spinning ? 'Spinning...' : canSpin ? 'SPIN NOW' : 'Already Spun Today'}
      </button>

      <div className="spin-odds">
        {prizes.map(p => (
          <span key={p.label} style={{ color: p.color }}>{p.chance}% {p.label}</span>
        ))}
      </div>
    </div>
  )
}

// ═══════════════════════════════════════════════════════════════════════
//  REFERRAL CARD
// ═══════════════════════════════════════════════════════════════════════
function ReferralCard({ referralCode, referralCount, onShare }) {
  const [copied, setCopied] = useState(false)

  const copyCode = () => {
    navigator.clipboard.writeText(`Join Clutch Arena BD! Use my code ${referralCode} and we both get 20 TK bonus: https://clutcharena.bd/ref/${referralCode}`)
    setCopied(true)
    setTimeout(() => setCopied(false), 2000)
  }

  const shareWhatsApp = () => {
    const text = `🔥 Join Clutch Arena BD — Win Real Cash in PUBG/Free Fire!\n\nUse my referral code: *${referralCode}*\nWe both get 20 TK bonus! 💰\n\n👉 https://clutcharena.bd/ref/${referralCode}`
    window.open(`https://wa.me/?text=${encodeURIComponent(text)}`, '_blank')
    onShare?.()
  }

  return (
    <div className="referral-card">
      <div className="referral-glow" />
      <div className="referral-inner">
        <div className="referral-header">
          <i className="fa-solid fa-rocket" style={{ color: '#8b5cf6' }} />
          <div>
            <h4>Refer & Earn</h4>
            <p>You & friend both get 20 TK</p>
          </div>
        </div>

        <div className="referral-code-box" onClick={copyCode}>
          <span className="ref-code">{referralCode || 'YOURCODE'}</span>
          <button className="ref-copy">
            <i className={copied ? 'fa-solid fa-check' : 'fa-regular fa-copy'} />
            {copied ? 'Copied!' : 'Copy'}
          </button>
        </div>

        <div className="referral-stats">
          <div className="ref-stat">
            <span className="ref-stat-value">{referralCount || 0}</span>
            <span className="ref-stat-label">Friends Joined</span>
          </div>
          <div className="ref-stat">
            <span className="ref-stat-value">{(referralCount || 0) * 20}</span>
            <span className="ref-stat-label">TK Earned</span>
          </div>
        </div>

        <button className="whatsapp-share" onClick={shareWhatsApp}>
          <i className="fa-brands fa-whatsapp" /> Share on WhatsApp
        </button>
      </div>
    </div>
  )
}

// ═══════════════════════════════════════════════════════════════════════
//  AD REWARD BUTTON
// ═══════════════════════════════════════════════════════════════════════
function AdRewardButton({ onWatch, cooldown }) {
  const [timeLeft, setTimeLeft] = useState(cooldown || 0)

  useEffect(() => {
    if (timeLeft <= 0) return
    const interval = setInterval(() => setTimeLeft(t => Math.max(0, t - 1000)), 1000)
    return () => clearInterval(interval)
  }, [timeLeft])

  const formatCooldown = (ms) => {
    const m = Math.floor(ms / 60000)
    const s = Math.floor((ms % 60000) / 1000)
    return `${pad(m)}:${pad(s)}`
  }

  return (
    <div className="ad-reward">
      <div className="ad-icon">
        <i className="fa-solid fa-play" />
      </div>
      <div className="ad-info">
        <h4>Watch Ad & Earn</h4>
        <p>Watch a 30s video → Get 5 TK instantly</p>
      </div>
      <button
        className={`ad-btn ${timeLeft > 0 ? 'cooldown' : ''}`}
        onClick={() => timeLeft <= 0 && onWatch()}
        disabled={timeLeft > 0}
      >
        {timeLeft > 0 ? formatCooldown(timeLeft) : '+5 TK'}
      </button>
    </div>
  )
}

// ═══════════════════════════════════════════════════════════════════════
//  SECTION HEADER V2
// ═══════════════════════════════════════════════════════════════════════
function SectionHeaderV2({ title, count, link, onNavigate, icon }) {
  return (
    <div className="section-header-v2">
      <div className="section-title">
        <i className={icon || 'fa-solid fa-bolt'} />
        <h3>{title}</h3>
        {count !== undefined && <span className="section-count">{count}</span>}
      </div>
      {link && (
        <button className="section-link" onClick={() => onNavigate(link)}>
          View All <i className="fa-solid fa-chevron-right" />
        </button>
      )}
    </div>
  )
}

// ═══════════════════════════════════════════════════════════════════════
//  MATCH FILTER TABS (Inspired by Gempod)
// ═══════════════════════════════════════════════════════════════════════
function MatchFilterTabs({ active, onChange }) {
  const tabs = [
    { id: 'all', label: 'All Games', icon: 'fa-solid fa-border-all' },
    { id: 'solo', label: 'Solo', icon: 'fa-solid fa-user' },
    { id: 'duo', label: 'Duo', icon: 'fa-solid fa-user-group' },
    { id: 'squad', label: 'Squad', icon: 'fa-solid fa-users' },
  ]
  return (
    <div className="match-tabs">
      {tabs.map(tab => (
        <button
          key={tab.id}
          className={`match-tab ${active === tab.id ? 'active' : ''}`}
          onClick={() => onChange(tab.id)}
        >
          <i className={tab.icon} />
          <span>{tab.label}</span>
        </button>
      ))}
    </div>
  )
}

// ═══════════════════════════════════════════════════════════════════════
//  MAIN DASHBOARD V2
// ═══════════════════════════════════════════════════════════════════════
export default function Dashboard() {
  const { state, dispatch, navigate } = useApp()
  const { matches, currentUser } = state

  const [filter, setFilter] = useState('all')
  const [showSpin, setShowSpin] = useState(false)

  if (!currentUser) return null

  // Gamification data
  const streak = currentUser.streak || 3
  const level = currentUser.level || 5
  const xp = currentUser.xp || 340
  const nextLevelXP = currentUser.nextLevelXP || 500
  const lockedBalance = currentUser.lockedBalance || 0
  const referralCode = currentUser.referralCode || currentUser.id?.slice(0, 8).toUpperCase()
  const referralCount = currentUser.referralCount || 0
  const lastSpinDate = currentUser.lastSpinDate
  const canSpin = !lastSpinDate || new Date(lastSpinDate).toDateString() !== new Date().toDateString()
  const adCooldown = currentUser.adCooldown || 0

  // Filter matches
  const allLive = matches.filter(m => m.status === 'live')
  const allUpcoming = matches.filter(m => m.status === 'upcoming').sort((a, b) => {
    const tA = a.startTime ? new Date(a.startTime.replace(' ', 'T')).getTime() : Infinity
    const tB = b.startTime ? new Date(b.startTime.replace(' ', 'T')).getTime() : Infinity
    return tA - tB
  })
  const allCompleted = matches.filter(m => m.status === 'completed')

  const filterFn = m => filter === 'all' || m.mode?.toLowerCase() === filter
  const liveMatches = allLive.filter(filterFn)
  const upcomingMatches = allUpcoming.filter(filterFn)
  const completedMatches = allCompleted.filter(filterFn)

  const myJoinedCount = matches.filter(m => m.participants?.includes(currentUser.id)).length

  const hero = allUpcoming[0] || allLive[0] || allCompleted[0]
  const heroPhase = hero ? getMatchPhase(hero) : 'unknown'
  const heroCountdown = hero ? getMatchCountdown(hero) : 0
  const heroJoined = hero ? hero.participants?.includes(currentUser.id) : false
  const heroTime = hero ? scheduledTime(hero.startTime) : { time: 'TBA', date: '' }

  // Stats for circular badges
  const winRate = currentUser.winRate || 68.4

  const handleJoin = (matchId) => {
    dispatch({ type: 'SHOW_MODAL', payload: { type: 'join-match', matchId } })
  }

  const handleDeposit = () => dispatch({ type: 'SHOW_MODAL', payload: { type: 'add-money' } })
  const handleWithdraw = () => dispatch({ type: 'SHOW_MODAL', payload: { type: 'withdraw' } })

  const handleSpin = (prize) => {
    dispatch({ type: 'SPIN_CLUTCH', payload: prize })
  }

  const handleWatchAd = () => {
    dispatch({ type: 'WATCH_AD_REWARD' })
  }

  const handleReferralShare = () => {
    dispatch({ type: 'REFERRAL_SHARED' })
  }

  return (
    <div className="dashboard-v2">

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

      {/* ═══ GAMIFICATION ROW ═══ */}
      <div className="gamification-row">
        <StreakBar streak={streak} />
        <XPBar xp={xp} level={level} nextLevelXP={nextLevelXP} />
      </div>

      {/* ═══ WALLET VAULT ═══ */}
      <WalletVaultV2
        balance={currentUser.balance || 0}
        lockedBalance={lockedBalance}
        onDeposit={handleDeposit}
        onWithdraw={handleWithdraw}
        onNavigate={navigate}
      />

      {/* ═══ QUICK ACTIONS ═══ */}
      <div className="quick-actions-grid">
        <QuickActionV2 icon="fa-solid fa-gamepad" label="Join" color="#06b6d4" onClick={() => navigate('matches')} />
        <QuickActionV2 icon="fa-solid fa-trophy" label="Ranks" color="#8b5cf6" onClick={() => navigate('leaderboard')} />
        <QuickActionV2 icon="fa-solid fa-clock-rotate-left" label="History" color="#10b981" onClick={() => navigate('profile')} />
        <QuickActionV2 icon="fa-solid fa-gift" label="Spin" color="#f59e0b" onClick={() => setShowSpin(!showSpin)} badge={canSpin ? '!' : null} />
      </div>

      {/* ═══ CLUTCH SPIN (Collapsible) ═══ */}
      {showSpin && (
        <ClutchSpin onSpin={handleSpin} canSpin={canSpin} lastSpin={lastSpinDate} />
      )}

      {/* ═══ AD REWARD ═══ */}
      <AdRewardButton onWatch={handleWatchAd} cooldown={adCooldown} />

      {/* ═══ REFERRAL CARD ═══ */}
      <ReferralCard
        referralCode={referralCode}
        referralCount={referralCount}
        onShare={handleReferralShare}
      />

      {/* ═══ CIRCULAR STATS (Inspired by Gambit CIS) ═══ */}
      <div className="circular-stats-row">
        <CircularStat value={liveMatches.length} label="Live" color="#06b6d4" icon="fa-solid fa-circle-play" />
        <CircularStat value={myJoinedCount} label="My Matches" color="#8b5cf6" icon="fa-solid fa-user-check" />
        <CircularStat value={winRate} label="Win Rate" color="#10b981" icon="fa-solid fa-percent" suffix="%" />
        <CircularStat value={level} label="Level" color="#f59e0b" icon="fa-solid fa-military-tech" />
      </div>

      {/* ═══ MATCH FILTER TABS ═══ */}
      <MatchFilterTabs active={filter} onChange={setFilter} />

      {/* ═══ LIVE MATCHES ═══ */}
      {liveMatches.length > 0 && (
        <div className="match-section">
          <SectionHeaderV2 title="Live Now" count={liveMatches.length} link="matches" onNavigate={navigate} icon="fa-solid fa-tower-broadcast" />
          <div className="match-list">
            {liveMatches.map(m => <MatchCard key={m.id} match={m} variant="glow" />)}
          </div>
        </div>
      )}

      {/* ═══ UPCOMING MATCHES ═══ */}
      {upcomingMatches.length > 0 && (
        <div className="match-section">
          <SectionHeaderV2 title="Upcoming Arenas" count={upcomingMatches.length} link="matches" onNavigate={navigate} icon="fa-solid fa-calendar" />
          <div className="match-list">
            {upcomingMatches.slice(0, 5).map(m => <MatchCard key={m.id} match={m} variant="glow" />)}
          </div>
        </div>
      )}

      {/* ═══ COMPLETED MATCHES ═══ */}
      {completedMatches.length > 0 && (
        <div className="match-section">
          <SectionHeaderV2 title="Completed" count={completedMatches.length} onNavigate={navigate} icon="fa-solid fa-flag-checkered" />
          <div className="match-list">
            {completedMatches.slice(0, 3).map(m => <MatchCard key={m.id} match={m} variant="dim" />)}
          </div>
        </div>
      )}

      {/* ═══ EMPTY STATE ═══ */}
      {matches.length === 0 && (
        <div className="empty-state">
          <i className="fa-solid fa-gamepad" />
          <p>No matches available right now</p>
          <button className="btn-primary" onClick={() => navigate('matches')}>Browse Matches</button>
        </div>
      )}

      {/* Bottom spacer for mobile nav */}
      <div style={{ height: 80 }} />
    </div>
  )
}