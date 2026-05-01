import { useState, useEffect, useRef } from 'react'
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
//  BACKGROUND PARTICLES
// ═══════════════════════════════════════════════════════════════════════
function BackgroundParticles() {
  const particles = Array.from({ length: 40 }, (_, i) => ({
    id: i,
    left: Math.random() * 100,
    delay: Math.random() * 20,
    duration: 15 + Math.random() * 10,
    size: 2 + Math.random() * 2,
    opacity: 0.2 + Math.random() * 0.3,
  }))

  return (
    <div className="bg-particles">
      {particles.map(p => (
        <div
          key={p.id}
          className="particle"
          style={{
            left: `${p.left}%`,
            width: p.size,
            height: p.size,
            opacity: p.opacity,
            animationDelay: `${p.delay}s`,
            animationDuration: `${p.duration}s`,
          }}
        />
      ))}
    </div>
  )
}

// ═══════════════════════════════════════════════════════════════════════
//  HERO BANNER v3 — Valorant/Gambit Style
// ═══════════════════════════════════════════════════════════════════════
function HeroBannerV3({ hero, heroPhase, heroCountdown, heroJoined, heroTime, onJoin, onNavigate }) {
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
    <div className="hero-banner-v3" onClick={() => onNavigate(`match-detail/${hero.id}`)}>
      <div className="hero-bg-v3" />

      {/* Character silhouette - replace src with your game character */}
      <div className="hero-character-v3">
        <img 
          src="https://images.unsplash.com/photo-1542751371-adc38448a05e?w=600&h=800&fit=crop" 
          alt="Character" 
        />
      </div>

      <div className="hero-content-v3">
        <div className="hero-badge-row-v3">
          {heroPhase === 'live' ? (
            <span className="hero-badge-live">LIVE NOW</span>
          ) : (
            <span className="hero-badge-live" style={{ background: 'rgba(139,92,246,0.15)', borderColor: 'rgba(139,92,246,0.3)', color: '#8b5cf6' }}>
              <span className="live-dot" style={{ background: '#8b5cf6', animation: 'none' }} /> UPCOMING
            </span>
          )}
          <span className="hero-badge-prize">
            <i className="fa-solid fa-trophy" /> {formatTK(hero.prizePool || 0)} TK
          </span>
        </div>

        <h2 className="hero-title-v3">
          {hero.title || 'Clutch Arena'}<br />
          <span>Tournament</span>
        </h2>

        <div className="hero-meta-v3">
          <span className="meta-pill-v3"><i className="fa-solid fa-gamepad" /> {hero.mode || 'Solo'}</span>
          <span className="meta-pill-v3"><i className="fa-solid fa-map" /> {hero.map || 'Erangel'}</span>
          <span className="meta-pill-v3"><i className="fa-regular fa-clock" /> {heroTime.time}</span>
          <span className="meta-pill-v3"><i className="fa-solid fa-users" /> {hero.participants?.length || 0}/{hero.maxPlayers || 50}</span>
        </div>

        <div className="hero-actions-v3">
          <button
            className="btn-hero-primary"
            onClick={(e) => { e.stopPropagation(); if (!heroJoined) onJoin(hero.id) }}
            disabled={heroJoined}
          >
            {heroJoined ? (
              <><i className="fa-solid fa-check" /> Joined</>
            ) : (
              <><i className="fa-solid fa-bolt" /> Join Arena</>
            )}
          </button>
          <button className="btn-hero-secondary" onClick={(e) => e.stopPropagation()}>
            <i className="fa-solid fa-share-nodes" /> Share
          </button>
        </div>
      </div>
    </div>
  )
}

// ═══════════════════════════════════════════════════════════════════════
//  AGENT CARDS — Valorant Style
// ═══════════════════════════════════════════════════════════════════════
const AGENTS = [
  { id: 'jett', name: 'Jett', role: 'Duelist', roleIcon: 'fa-solid fa-wind', pickRate: 32, winRate: 51, image: 'https://images.unsplash.com/photo-1542751371-adc38448a05e?w=400&h=600&fit=crop' },
  { id: 'raze', name: 'Raze', role: 'Duelist', roleIcon: 'fa-solid fa-bomb', pickRate: 28, winRate: 49, image: 'https://images.unsplash.com/photo-1538481199705-c710c4e965fc?w=400&h=600&fit=crop' },
  { id: 'breach', name: 'Breach', role: 'Initiator', roleIcon: 'fa-solid fa-fist-raised', pickRate: 24, winRate: 53, image: 'https://images.unsplash.com/photo-1511512578047-dfb367046420?w=400&h=600&fit=crop' },
  { id: 'omen', name: 'Omen', role: 'Controller', roleIcon: 'fa-solid fa-mask', pickRate: 35, winRate: 55, image: 'https://images.unsplash.com/photo-1552820728-8b83bb6b2b0a?w=400&h=600&fit=crop' },
  { id: 'brimstone', name: 'Brimstone', role: 'Controller', roleIcon: 'fa-solid fa-fire', pickRate: 18, winRate: 47, image: 'https://images.unsplash.com/photo-1493711662062-fa541adb3fc8?w=400&h=600&fit=crop' },
]

function AgentCardV3({ agent, selected, onSelect }) {
  return (
    <div 
      className={`agent-card-v3 ${selected ? 'selected' : ''}`} 
      onClick={() => onSelect(agent.id)}
    >
      <img src={agent.image} alt={agent.name} className="agent-image-v3" />
      <div className="agent-info-v3">
        <div className="agent-name-v3">{agent.name}</div>
        <div className="agent-role-v3">
          <i className={agent.roleIcon} /> {agent.role}
        </div>
        <div className="agent-stats-v3">
          <div className="agent-stat-v3">
            <span className="agent-stat-value-v3">{agent.pickRate}%</span>
            <span className="agent-stat-label-v3">Pick Rate</span>
          </div>
          <div className="agent-stat-v3">
            <span className="agent-stat-value-v3">{agent.winRate}%</span>
            <span className="agent-stat-label-v3">Win Rate</span>
          </div>
        </div>
      </div>
    </div>
  )
}

function AgentsSectionV3() {
  const [selected, setSelected] = useState('omen')

  return (
    <div className="agents-section">
      <div className="section-header-v3">
        <h2 className="section-title-v3">Top Agents</h2>
        <span className="view-all-v3">View All <i className="fa-solid fa-arrow-right" /></span>
      </div>
      <div className="agents-grid">
        {AGENTS.map(agent => (
          <AgentCardV3 
            key={agent.id} 
            agent={agent} 
            selected={selected === agent.id}
            onSelect={setSelected}
          />
        ))}
      </div>
    </div>
  )
}

// ═══════════════════════════════════════════════════════════════════════
//  LIVE CHANNELS — Unity Style
// ═══════════════════════════════════════════════════════════════════════
const CHANNELS = [
  { id: 1, title: '2024 World Championship Finals - Live Commentary', streamer: 'TenZ', game: 'Valorant', viewers: '12.4K', image: 'https://images.unsplash.com/photo-1542751110-97427bbecf20?w=600&h=400&fit=crop', avatar: 'https://images.unsplash.com/photo-1535713875002-d1d0cf377fde?w=100&h=100&fit=crop' },
  { id: 2, title: 'Team Flash vs Saigon Phantom - VCS Finals', streamer: 'Caedrel', game: 'League of Legends', viewers: '8.7K', image: 'https://images.unsplash.com/photo-1511882150382-421056c89033?w=600&h=400&fit=crop', avatar: 'https://images.unsplash.com/photo-1494790108377-be9c29b29330?w=100&h=100&fit=crop' },
  { id: 3, title: 'Ranked Grind to Radiant - Day 15', streamer: 'Shroud', game: 'Valorant', viewers: '5.2K', image: 'https://images.unsplash.com/photo-1560253023-3ec5d502959f?w=600&h=400&fit=crop', avatar: 'https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?w=100&h=100&fit=crop' },
  { id: 4, title: 'CS2 Major Qualifiers - Team Analysis', streamer: 'Scrawny', game: 'CS2', viewers: '3.8K', image: 'https://images.unsplash.com/photo-1534423861386-85a16f5d13fd?w=600&h=400&fit=crop', avatar: 'https://images.unsplash.com/photo-1438761681033-6461ffad8d80?w=100&h=100&fit=crop' },
]

function ChannelCardV3({ channel }) {
  return (
    <div className="channel-card-v3">
      <div className="channel-thumbnail-v3">
        <img src={channel.image} alt={channel.title} />
        <div className="channel-overlay-v3">
          <div className="channel-live-badge">
            <i className="fa-solid fa-circle" /> {channel.viewers} viewers
          </div>
        </div>
      </div>
      <div className="channel-info-v3">
        <div className="channel-title-v3">{channel.title}</div>
        <div className="channel-meta-v3">
          <img src={channel.avatar} alt={channel.streamer} />
          <span>{channel.streamer}</span>
          <div className="channel-online-dot" />
          <span>{channel.game}</span>
        </div>
      </div>
    </div>
  )
}

function ChannelsSectionV3() {
  return (
    <div className="channels-section">
      <div className="section-header-v3">
        <h2 className="section-title-v3">Live Channels</h2>
        <span className="view-all-v3">View All <i className="fa-solid fa-arrow-right" /></span>
      </div>
      <div className="channels-grid">
        {CHANNELS.map(channel => (
          <ChannelCardV3 key={channel.id} channel={channel} />
        ))}
      </div>
    </div>
  )
}

// ═══════════════════════════════════════════════════════════════════════
//  STATS SECTION — Gambit CIS Style
// ═══════════════════════════════════════════════════════════════════════
const META_STATS = [
  { rank: 1, name: 'Sage', role: 'Sentinel', roleIcon: 'fa-solid fa-plus-circle', percentage: 20.1, avatar: 'https://images.unsplash.com/photo-1542751371-adc38448a05e?w=100&h=100&fit=crop' },
  { rank: 2, name: 'Raze', role: 'Duelist', roleIcon: 'fa-solid fa-bomb', percentage: 17.6, avatar: 'https://images.unsplash.com/photo-1538481199705-c710c4e965fc?w=100&h=100&fit=crop' },
  { rank: 3, name: 'Omen', role: 'Controller', roleIcon: 'fa-solid fa-mask', percentage: 15.2, avatar: 'https://images.unsplash.com/photo-1552820728-8b83bb6b2b0a?w=100&h=100&fit=crop' },
  { rank: 4, name: 'Phoenix', role: 'Duelist', roleIcon: 'fa-solid fa-fire', percentage: 13.5, avatar: 'https://images.unsplash.com/photo-1493711662062-fa541adb3fc8?w=100&h=100&fit=crop' },
]

const TOURNAMENT_STATS = [
  { rank: 1, name: 'VCT Masters Tokyo', detail: '$500,000 Prize Pool', value: '48', suffix: 'Teams' },
  { rank: 2, name: 'ESL Pro League S18', detail: '$750,000 Prize Pool', value: '59', suffix: '% Fill' },
  { rank: 3, name: 'Worlds 2024', detail: '$2,225,000 Prize Pool', value: '$561K', suffix: 'Top Prize' },
  { rank: 4, name: 'BLAST Premier', detail: '$425,000 Prize Pool', value: '32', suffix: 'Teams' },
]

function StatsSectionV3() {
  return (
    <div className="stats-section-v3">
      <div className="stats-card-v3">
        <div className="stats-header-v3">
          <h3 className="stats-title-v3">Agent Meta</h3>
          <span className="trend-up-v3"><i className="fa-solid fa-arrow-trend-up" /> +12% this week</span>
        </div>
        {META_STATS.map(stat => (
          <div key={stat.rank} className="stat-row-v3">
            <span className="stat-rank-v3">{stat.rank}</span>
            <img src={stat.avatar} alt={stat.name} className="stat-avatar-v3" />
            <div className="stat-details-v3">
              <div className="stat-name-v3">{stat.name}</div>
              <div className="stat-role-v3"><i className={stat.roleIcon} /> {stat.role}</div>
            </div>
            <span className="stat-percentage-v3">{stat.percentage}%</span>
          </div>
        ))}
      </div>

      <div className="stats-card-v3">
        <div className="stats-header-v3">
          <h3 className="stats-title-v3">Tournaments</h3>
          <span className="trend-up-v3"><i className="fa-solid fa-arrow-trend-up" /> +8% this month</span>
        </div>
        {TOURNAMENT_STATS.map(stat => (
          <div key={stat.rank} className="stat-row-v3">
            <span className="stat-rank-v3">{stat.rank}</span>
            <div className="stat-details-v3" style={{ marginLeft: 0 }}>
              <div className="stat-name-v3">{stat.name}</div>
              <div className="stat-role-v3">{stat.detail}</div>
            </div>
            <span className="stat-percentage-v3">{stat.value}</span>
          </div>
        ))}
      </div>
    </div>
  )
}

// ═══════════════════════════════════════════════════════════════════════
//  NEWS SECTION — Gambit Style
// ═══════════════════════════════════════════════════════════════════════
const NEWS = [
  { id: 1, title: 'Diamondprox rejoins Gambit LCL team as captain for Summer Split', date: 'April 28, 2026', excerpt: 'The legendary support player returns to lead the team after a brief hiatus...', image: 'https://images.unsplash.com/photo-1542751371-adc38448a05e?w=600&h=400&fit=crop' },
  { id: 2, title: 'Gambit Esports wins victory at CS:GO PGL Major Stockholm', date: 'April 27, 2026', excerpt: 'A dominant performance throughout the tournament secures the championship...', image: 'https://images.unsplash.com/photo-1511882150382-421056c89033?w=600&h=400&fit=crop' },
  { id: 3, title: 'Gambit is invited to DreamHack Masters Malmo 2026', date: 'April 25, 2026', excerpt: 'The team receives a direct invitation to one of the biggest events of the year...', image: 'https://images.unsplash.com/photo-1560253023-3ec5d502959f?w=600&h=400&fit=crop' },
]

function NewsSectionV3() {
  return (
    <div className="news-section">
      <div className="section-header-v3">
        <h2 className="section-title-v3">Latest News</h2>
        <span className="view-all-v3">View All <i className="fa-solid fa-arrow-right" /></span>
      </div>
      <div className="news-grid-v3">
        {NEWS.map(news => (
          <div key={news.id} className="news-card-v3">
            <img src={news.image} alt={news.title} className="news-image-v3" />
            <div className="news-content-v3">
              <div className="news-date-v3">{news.date}</div>
              <div className="news-title-v3">{news.title}</div>
              <div className="news-excerpt-v3">{news.excerpt}</div>
            </div>
          </div>
        ))}
      </div>
    </div>
  )
}

// ═══════════════════════════════════════════════════════════════════════
//  PARTNERS BAR
// ═══════════════════════════════════════════════════════════════════════
function PartnersSectionV3() {
  const partners = ['LEON', 'VISA', 'BENQ', 'HYPERX', 'DROPGUN']
  return (
    <div className="partners-section-v3">
      {partners.map(p => (
        <div key={p} className="partner-logo-v3">{p}</div>
      ))}
    </div>
  )
}

// ═══════════════════════════════════════════════════════════════════════
//  CIRCULAR STAT BADGE
// ═══════════════════════════════════════════════════════════════════════
function CircularStatV3({ value, label, color, icon, suffix = '' }) {
  const size = 72
  const stroke = 4
  const radius = (size - stroke) / 2
  const circumference = 2 * Math.PI * radius
  const pct = Math.min(value / 100, 1)
  const offset = circumference - pct * circumference

  return (
    <div className="circular-stat" style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 8 }}>
      <div style={{ position: 'relative', width: size, height: size }}>
        <svg width={size} height={size} style={{ transform: 'rotate(-90deg)' }}>
          <circle fill="none" stroke="rgba(255,255,255,0.05)" cx={size/2} cy={size/2} r={radius} strokeWidth={stroke} />
          <circle
            fill="none"
            strokeLinecap="round"
            cx={size/2} cy={size/2} r={radius} strokeWidth={stroke}
            strokeDasharray={circumference}
            strokeDashoffset={offset}
            style={{ stroke: color, transition: 'stroke-dashoffset 1s cubic-bezier(0.34, 1.56, 0.64, 1)' }}
          />
        </svg>
        <div style={{ position: 'absolute', inset: 0, display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', gap: 2 }}>
          <i className={icon} style={{ color, fontSize: 14 }} />
          <span style={{ color, fontSize: 16, fontWeight: 800, fontFamily: 'var(--font-display)' }}>{value}{suffix}</span>
        </div>
      </div>
      <span style={{ fontSize: 10, fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.1em', color: 'var(--text-muted)' }}>{label}</span>
    </div>
  )
}

// ═══════════════════════════════════════════════════════════════════════
//  WALLET V3
// ═══════════════════════════════════════════════════════════════════════
function WalletVaultV3({ balance, lockedBalance, onDeposit, onWithdraw, onNavigate }) {
  const animatedBalance = useAnimatedCounter(balance, 1500)
  const animatedLocked = useAnimatedCounter(lockedBalance, 1500)

  return (
    <div className="wallet-v3" onClick={() => onNavigate('wallet')} style={{
      position: 'relative',
      background: 'var(--bg-card)',
      border: '1px solid var(--border-subtle)',
      borderRadius: 'var(--radius)',
      padding: '24px',
      marginBottom: '24px',
      cursor: 'pointer',
      overflow: 'hidden',
      transition: 'var(--transition)',
    }}>
      <div style={{
        position: 'absolute',
        top: '-50%',
        right: '-20%',
        width: '200px',
        height: '200px',
        background: 'radial-gradient(circle, rgba(139,92,246,0.12), transparent 70%)',
        pointerEvents: 'none',
      }} />
      <div style={{ position: 'relative', zIndex: 1 }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '12px' }}>
          <div style={{ fontSize: '11px', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.15em', color: 'var(--text-muted)', display: 'flex', alignItems: 'center', gap: '6px' }}>
            <i className="fa-solid fa-wallet" /> Available Balance
          </div>
          <div style={{ fontSize: '11px', fontWeight: 600, color: 'var(--warning)', display: 'flex', alignItems: 'center', gap: '4px' }}>
            <i className="fa-solid fa-lock" /> {formatTK(animatedLocked)} TK locked
          </div>
        </div>
        <div style={{ display: 'flex', alignItems: 'baseline', gap: '4px', marginBottom: '20px' }}>
          <span style={{ fontSize: '20px', fontWeight: 700, color: 'var(--cyan)' }}>৳</span>
          <span style={{ fontSize: '36px', fontWeight: 900, color: 'var(--text)', letterSpacing: '-0.03em', fontFamily: 'var(--font-display)' }}>{formatTK(animatedBalance)}</span>
          <span style={{ fontSize: '14px', fontWeight: 700, color: 'var(--text-secondary)' }}>TK</span>
        </div>
        <div style={{ display: 'flex', gap: '10px' }}>
          <button style={{
            flex: 1,
            padding: '10px',
            borderRadius: 'var(--radius-sm)',
            fontSize: '12px',
            fontWeight: 700,
            border: 'none',
            cursor: 'pointer',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            gap: '6px',
            transition: 'var(--transition)',
            background: 'var(--bg-elevated)',
            color: 'var(--text)',
            border: '1px solid var(--border-subtle)',
          }} onClick={(e) => { e.stopPropagation(); onWithdraw() }}>
            <i className="fa-solid fa-arrow-up-from-bracket" /> Withdraw
          </button>
          <button style={{
            flex: 1,
            padding: '10px',
            borderRadius: 'var(--radius-sm)',
            fontSize: '12px',
            fontWeight: 700,
            border: 'none',
            cursor: 'pointer',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            gap: '6px',
            transition: 'var(--transition)',
            background: 'linear-gradient(135deg, var(--purple), var(--pink))',
            color: '#fff',
          }} onClick={(e) => { e.stopPropagation(); onDeposit() }}>
            <i className="fa-solid fa-plus" /> Deposit
          </button>
        </div>
      </div>
    </div>
  )
}

// ═══════════════════════════════════════════════════════════════════════
//  MAIN DASHBOARD v3
// ═══════════════════════════════════════════════════════════════════════
export default function Dashboard() {
  const { state, dispatch, navigate } = useApp()
  const { matches, currentUser } = state

  if (!currentUser) return null

  const hero = matches.filter(m => m.status === 'upcoming')[0] || matches[0]
  const heroPhase = hero ? getMatchPhase(hero) : 'unknown'
  const heroCountdown = hero ? getMatchCountdown(hero) : 0
  const heroJoined = hero ? hero.participants?.includes(currentUser.id) : false
  const heroTime = hero ? scheduledTime(hero.startTime) : { time: 'TBA', date: '' }

  const myJoinedCount = matches.filter(m => m.participants?.includes(currentUser.id)).length
  const liveCount = matches.filter(m => m.status === 'live').length
  const winRate = currentUser.winRate || 68.4
  const level = currentUser.level || 5

  const handleJoin = (matchId) => {
    dispatch({ type: 'SHOW_MODAL', payload: { type: 'join-match', matchId } })
  }

  const handleDeposit = () => dispatch({ type: 'SHOW_MODAL', payload: { type: 'add-money' } })
  const handleWithdraw = () => dispatch({ type: 'SHOW_MODAL', payload: { type: 'withdraw' } })

  return (
    <div className="dashboard-v2">
      <BackgroundParticles />

      {/* HERO BANNER */}
      <HeroBannerV3
        hero={hero}
        heroPhase={heroPhase}
        heroCountdown={heroCountdown}
        heroJoined={heroJoined}
        heroTime={heroTime}
        onJoin={handleJoin}
        onNavigate={navigate}
      />

      {/* CIRCULAR STATS ROW */}
      <div style={{ display: 'flex', justifyContent: 'space-around', marginBottom: '32px', padding: '20px 0' }}>
        <CircularStatV3 value={liveCount} label="Live" color="#00d4ff" icon="fa-solid fa-circle-play" />
        <CircularStatV3 value={myJoinedCount} label="My Matches" color="#8b5cf6" icon="fa-solid fa-user-check" />
        <CircularStatV3 value={winRate} label="Win Rate" color="#10b981" icon="fa-solid fa-percent" suffix="%" />
        <CircularStatV3 value={level} label="Level" color="#f59e0b" icon="fa-solid fa-military-tech" />
      </div>

      {/* WALLET */}
      <WalletVaultV3
        balance={currentUser.balance || 0}
        lockedBalance={currentUser.lockedBalance || 0}
        onDeposit={handleDeposit}
        onWithdraw={handleWithdraw}
        onNavigate={navigate}
      />

      {/* AGENTS SECTION */}
      <AgentsSectionV3 />

      {/* LIVE CHANNELS */}
      <ChannelsSectionV3 />

      {/* STATS SECTION */}
      <StatsSectionV3 />

      {/* NEWS SECTION */}
      <NewsSectionV3 />

      {/* PARTNERS */}
      <PartnersSectionV3 />

      {/* YOUR EXISTING MATCH SECTIONS */}
      {/* Keep your existing live/upcoming/completed match lists here */}

      <div style={{ height: 80 }} />
    </div>
  )
}