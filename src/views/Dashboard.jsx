import { useApp } from '../context'
import MatchCard from '../components/MatchCard'
import { formatTK, formatTKShort, modeColor, mapIcon, getMatchPhase, getMatchCountdown, slotStatusText, phaseColor, phaseLabel } from '../utils'

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

export default function Dashboard() {
  const { state, dispatch, navigate } = useApp()
  const { matches, currentUser } = state

  if (!currentUser) return null

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
    { label: 'MATCHES', value: liveMatches.length, icon: 'fa-solid fa-circle-play', color: '#61cdff' },
    { label: 'WIN RATE', value: '68.4%', icon: 'fa-solid fa-check-double', color: '#61cdff' },
    { label: 'MY MATCHES', value: myJoinedCount, icon: 'fa-solid fa-user-check', color: '#61cdff' },
    { label: 'RANK', value: 'Unranked', icon: 'fa-solid fa-military-tech', color: '#61cdff', highlight: true },
  ]

  const sectionHead = (title, count, link) => (
    <div style={{
      display: 'flex', alignItems: 'flex-end', justifyContent: 'space-between',
      marginBottom: 14, borderBottom: '1px solid rgba(255,255,255,0.04)', paddingBottom: 12,
    }}>
      <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
        <div style={{ width: 4, height: 20, background: '#61cdff', flexShrink: 0 }} />
        <h3 style={{
          fontFamily: "'Lexend', sans-serif", fontSize: 18, fontWeight: 700,
          color: '#e5e1e4', margin: 0, letterSpacing: '-0.025em', textTransform: 'uppercase',
        }}>
          {title}
        </h3>
        {count !== undefined && (
          <span style={{ fontSize: 12, color: '#889299', fontFamily: "'Inter', sans-serif", fontWeight: 600 }}>
            ({count})
          </span>
        )}
      </div>
      {link && (
        <span
          onClick={() => navigate(link)}
          style={{
            fontSize: 10, fontWeight: 700, color: '#61cdff',
            fontFamily: "'Plus Jakarta Sans', sans-serif",
            textTransform: 'uppercase', letterSpacing: '0.1em', cursor: 'pointer',
          }}
        >
          View All Schedule
        </span>
      )}
    </div>
  )

  return (
    <div style={{ padding: '0 0 100px 0' }}>

      {/* ═══ HERO BANNER ═══ */}
      {hero && (
        <div
          onClick={() => navigate(`match-detail/${hero.id}`)}
          style={{
            position: 'relative', borderRadius: 8, overflow: 'hidden',
            marginBottom: 20, cursor: 'pointer',
            height: 200,
            background: '#1c1b1d',
            WebkitTapHighlightColor: 'transparent',
          }}
        >
          {hero.image ? (
            <img src={hero.image} alt="" style={{
              position: 'absolute', inset: 0, width: '100%', height: '100%',
              objectFit: 'cover', opacity: 0.5,
            }} />
          ) : (
            <div style={{
              position: 'absolute', inset: 0, opacity: 0.5,
              background: 'linear-gradient(135deg, #1c1b1d 0%, #201f21 100%)',
            }} />
          )}

          <div style={{
            position: 'absolute', inset: 0,
            background: 'linear-gradient(to right, #0e0e10, rgba(32,31,33,0.6), transparent)',
          }} />

          <div style={{
            position: 'relative', height: '100%',
            display: 'flex', flexDirection: 'column', justifyContent: 'center',
            padding: '0 24px',
          }}>
            {heroPhase !== 'completed' && (
              <div style={{ display: 'flex', alignItems: 'center', gap: 6, marginBottom: 8 }}>
                <span style={{
                  padding: '2px 8px', borderRadius: 0,
                  fontSize: 10, fontWeight: 700,
                  fontFamily: "'Plus Jakarta Sans', sans-serif",
                  letterSpacing: '0.05em', textTransform: 'uppercase',
                  background: heroPhase === 'live' ? '#353437' : '#61cdff',
                  color: heroPhase === 'live' ? '#61cdff' : '#005572',
                }}>
                  {heroPhase === 'live' && (
                    <span style={{ display: 'inline-block', width: 5, height: 5, borderRadius: 0, background: '#61cdff', marginRight: 4, animation: 'pulse 1s infinite' }} />
                  )}
                  {heroPhase === 'live' ? 'Live Tournament' : 'Upcoming'}
                </span>
              </div>
            )}

            <h2 style={{
              fontFamily: "'Lexend', sans-serif", fontSize: 28, fontWeight: 700,
              color: '#e5e1e4', margin: 0, lineHeight: 1,
              letterSpacing: '-0.05em', textTransform: 'uppercase', fontStyle: 'italic',
            }}>
              {hero.title.split(' ').slice(0, -1).join(' ')}<br />
              <span style={{ color: '#61cdff' }}>{hero.title.split(' ').slice(-1)}</span>
            </h2>

            <p style={{
              fontFamily: "'Plus Jakarta Sans', sans-serif",
              fontSize: 10, fontWeight: 700,
              color: '#889299', margin: '6px 0 0',
              letterSpacing: '0.1em', textTransform: 'uppercase',
            }}>
              {hero.mode} {hero.map ? `| ${hero.map}` : ''} {heroTime.date ? `| ${heroTime.date} · ${heroTime.time}` : ''}
            </p>

            <div style={{ marginTop: 16 }}>
              {heroPhase !== 'completed' && (
                <button
                  onClick={(e) => {
                    e.stopPropagation()
                    if (heroJoined) return
                    dispatch({ type: 'SHOW_MODAL', payload: { type: 'join-match', matchId: hero.id } })
                  }}
                  disabled={heroJoined}
                  style={{
                    padding: '8px 24px', borderRadius: 8, border: 'none',
                    fontFamily: "'Plus Jakarta Sans', sans-serif",
                    fontSize: 10, fontWeight: 700,
                    letterSpacing: '0.1em', textTransform: 'uppercase',
                    cursor: heroJoined ? 'default' : 'pointer',
                    background: heroJoined ? '#353437' : '#61cdff',
                    color: heroJoined ? '#889299' : '#005572',
                    WebkitTapHighlightColor: 'transparent',
                  }}
                >
                  {heroJoined ? 'Joined' : 'Join Arena'}
                </button>
              )}
            </div>
          </div>
        </div>
      )}

      {/* ═══ BALANCE CARD — Full Width ═══ */}
      <div
        onClick={() => navigate('wallet')}
        style={{
          background: '#201f21',
          border: '1px solid rgba(255,255,255,0.06)',
          borderLeft: '2px solid #61cdff',
          borderRadius: 8, padding: '20px 24px',
          cursor: 'pointer', position: 'relative',
          marginBottom: 12,
          WebkitTapHighlightColor: 'transparent',
        }}
      >
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 8 }}>
          <span style={{
            fontSize: 10, fontWeight: 700, textTransform: 'uppercase',
            letterSpacing: '0.1em', color: '#889299',
            fontFamily: "'Plus Jakarta Sans', sans-serif",
          }}>
            Account Balance
          </span>
          <i className="fa-solid fa-wallet" style={{ fontSize: 16, color: '#61cdff' }} />
        </div>
        <div style={{ marginBottom: 20 }}>
          <span style={{
            fontFamily: "'Inter', sans-serif", fontSize: 36, fontWeight: 700,
            color: '#e5e1e4', letterSpacing: '-0.02em',
          }}>
            {formatTK(currentUser.balance)}
          </span>
          <span style={{
            fontSize: 13, fontWeight: 700, color: '#61cdff',
            letterSpacing: '0.05em', textTransform: 'uppercase',
            marginLeft: 8, fontFamily: "'Plus Jakarta Sans', sans-serif",
          }}>
            TK
          </span>
        </div>
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 8 }}>
          <button
            onClick={(e) => { e.stopPropagation(); dispatch({ type: 'SHOW_MODAL', payload: { type: 'withdraw' } }) }}
            style={{
              padding: '10px 0', borderRadius: 8, border: '1px solid rgba(255,255,255,0.06)',
              background: '#353437', color: '#e5e1e4',
              fontFamily: "'Plus Jakarta Sans', sans-serif",
              fontSize: 10, fontWeight: 700, letterSpacing: '0.1em',
              textTransform: 'uppercase', cursor: 'pointer',
              WebkitTapHighlightColor: 'transparent',
            }}
          >
            Withdraw
          </button>
          <button
            onClick={(e) => { e.stopPropagation(); dispatch({ type: 'SHOW_MODAL', payload: { type: 'add-money' } }) }}
            style={{
              padding: '10px 0', borderRadius: 8, border: 'none',
              background: '#61cdff', color: '#005572',
              fontFamily: "'Plus Jakarta Sans', sans-serif",
              fontSize: 10, fontWeight: 700, letterSpacing: '0.1em',
              textTransform: 'uppercase', cursor: 'pointer',
              WebkitTapHighlightColor: 'transparent',
            }}
          >
            Deposit
          </button>
        </div>
      </div>

      {/* ═══ STATS GRID — Full Width 2x2 ═══ */}
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 8, marginBottom: 24 }}>
        {stats.map((s, i) => (
          <div
            key={s.label}
            onClick={() => navigate(i === 3 ? 'leaderboard' : 'matches')}
            style={{
              background: i === 3 ? '#201f21' : '#1c1b1d',
              border: i === 3 ? '1px solid rgba(97,205,255,0.15)' : '1px solid transparent',
              borderRadius: 8, padding: '16px',
              cursor: 'pointer', position: 'relative', overflow: 'hidden',
              WebkitTapHighlightColor: 'transparent',
            }}
          >
            {s.highlight && (
              <i className="fa-solid fa-military-tech" style={{
                position: 'absolute', right: -8, bottom: -8, fontSize: 64,
                color: '#61cdff', opacity: 0.06,
              }} />
            )}
            <i className={s.icon} style={{ fontSize: 20, color: '#61cdff', marginBottom: 14, display: 'block' }} />
            <div style={{ position: 'relative', zIndex: 1 }}>
              <p style={{
                fontSize: 10, fontWeight: 700, textTransform: 'uppercase',
                letterSpacing: '0.1em', color: '#889299', margin: 0,
                fontFamily: "'Plus Jakarta Sans', sans-serif",
              }}>
                {s.label}
              </p>
              <p style={{
                fontFamily: s.highlight ? "'Lexend', sans-serif" : "'Inter', sans-serif",
                fontSize: 22, fontWeight: 700,
                color: s.highlight ? '#61cdff' : '#e5e1e4',
                margin: 0, letterSpacing: s.highlight ? '-0.03em' : 0,
                fontStyle: s.highlight ? 'italic' : 'normal',
                textTransform: s.highlight ? 'uppercase' : 'none',
              }}>
                {s.value}
              </p>
            </div>
          </div>
        ))}
      </div>

      {/* ═══ LIVE MATCHES — Vertical Stack ═══ */}
      {liveMatches.length > 0 && (
        <div style={{ marginBottom: 24 }}>
          {sectionHead('Live Now', liveMatches.length, 'matches')}
          <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
            {liveMatches.map(m => <MatchCard key={m.id} match={m} />)}
          </div>
        </div>
      )}

      {/* ═══ UPCOMING MATCHES — Vertical Stack ═══ */}
      {upcomingMatches.length > 0 && (
        <div style={{ marginBottom: 24 }}>
          {sectionHead('Upcoming Arenas', upcomingMatches.length, 'matches')}
          <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
            {upcomingMatches.slice(0, 5).map(m => <MatchCard key={m.id} match={m} animated />)}
          </div>
        </div>
      )}

      {/* ═══ COMPLETED MATCHES — Vertical Stack (was h-scroll, now scrollable) ═══ */}
      {completedMatches.length > 0 && (
        <div style={{ marginBottom: 24 }}>
          {sectionHead('Completed', completedMatches.length)}
          <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
            {completedMatches.map(m => <MatchCard key={m.id} match={m} />)}
          </div>
        </div>
      )}

      {/* ═══ EMPTY STATE ═══ */}
      {matches.length === 0 && (
        <div style={{
          textAlign: 'center', padding: '60px 20px',
          background: '#1c1b1d', borderRadius: 8,
          border: '1px solid rgba(255,255,255,0.06)',
        }}>
          <i className="fa-solid fa-gamepad" style={{ fontSize: 40, color: '#353437', marginBottom: 12, display: 'block' }} />
          <p style={{
            fontFamily: "'Plus Jakarta Sans', sans-serif",
            fontSize: 12, fontWeight: 700, color: '#889299',
            textTransform: 'uppercase', letterSpacing: '0.1em', margin: 0,
          }}>
            No matches available
          </p>
        </div>
      )}
    </div>
  )
}