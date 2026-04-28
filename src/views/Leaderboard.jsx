import { useState } from 'react'
import { useApp } from '../context'
import { formatTK } from '../utils'

export default function Leaderboard() {
  const { state } = useApp()
  const { users, standings, currentUser } = state
  const [tab, setTab] = useState('standings')

  if (!currentUser) return null

  const activeUsers = users.filter(u => u.ign && !u.banned && u.role !== 'owner' && u.role !== 'admin')

  const sortedPlayers = (() => {
    const s = [...activeUsers].sort((a, b) => (b.earnings || 0) - (a.earnings || 0))
    return tab === 'wins' ? [...activeUsers].sort((a, b) => (b.wins || 0) - (a.wins || 0))
      : tab === 'kills' ? [...activeUsers].sort((a, b) => (b.kills || 0) - (a.kills || 0))
      : s
  })()

  const podiumPlayers = sortedPlayers.slice(0, 3).map(u => ({
    ...u,
    xp: tab === 'earnings' ? formatTK(u.earnings || 0) : tab === 'wins' ? `${u.wins || 0} W` : `${u.kills || 0} K`
  }))

  const hasPodium = podiumPlayers.length === 3

  const restList = sortedPlayers.slice(3)

  const userPlayerRank = sortedPlayers.findIndex(u => u.id === currentUser.id)
  const userRank = userPlayerRank >= 0 ? userPlayerRank + 1 : null

  const initial = (name) => name ? name[0].toUpperCase() : '?'

  const AvatarCircle = ({ name, size = 32, rank }) => {
    const colors = { 1: '#facc15', 2: '#cccccc', 3: '#cd7f32' }
    const c = colors[rank] || '#2a2a2c'
    return (
      <div style={{
        width: size, height: size, borderRadius: '50%',
        background: '#2a2a2c',
        border: rank <= 3 ? `2px solid ${c}` : '1px solid rgba(255,255,255,0.06)',
        display: 'flex', alignItems: 'center', justifyContent: 'center',
        fontFamily: "'Lexend', sans-serif", fontSize: size * 0.35, fontWeight: 700,
        color: rank <= 3 ? '#000' : '#889299',
        flexShrink: 0,
      }}>
        {initial(name)}
      </div>
    )
  }

  return (
    <div style={{ padding: '0 0 100px 0', overflowX: 'hidden' }}>

      {/* ═══ PAGE HEADER ═══ */}
      <div style={{ marginBottom: 32 }}>
        <h1 style={{
          fontFamily: "'Lexend', sans-serif", fontSize: 28, fontWeight: 700,
          color: '#e5e1e4', margin: '0 0 6px',
          letterSpacing: '-0.025em', textTransform: 'uppercase',
        }}>
          Leaderboard
        </h1>
        <p style={{
          fontFamily: "'Plus Jakarta Sans', sans-serif", fontSize: 13,
          color: '#889299', margin: 0, fontWeight: 500,
        }}>
          Compete in matches to climb the leaderboard and win rewards.
        </p>
      </div>

      {/* ═══ TAB SWITCHER ═══ */}
      <div style={{
        display: 'flex', background: '#1c1b1d', padding: 4,
        borderRadius: 12, border: '1px solid rgba(255,255,255,0.05)',
        marginBottom: 40, width: 'fit-content',
      }}>
        {[
          { key: 'earnings', label: 'Earnings' },
          { key: 'wins', label: 'Wins' },
          { key: 'kills', label: 'Kills' },
        ].map(t => {
          const active = tab === t.key
          return (
            <button
              key={t.key}
              onClick={() => setTab(t.key)}
              style={{
                padding: '8px 24px', borderRadius: 8, border: 'none',
                fontFamily: "'Lexend', sans-serif", fontSize: 13, fontWeight: 600,
                color: active ? '#005572' : '#889299',
                background: active ? '#61cdff' : 'transparent',
                cursor: 'pointer',
                WebkitTapHighlightColor: 'transparent',
                transition: 'opacity 0.2s ease',
              }}
            >
              {t}
            </button>
          )
        })}
      </div>

      {/* ═══ PODIUM SECTION ═══ */}
      {hasPodium && (
      <div style={{
        display: 'flex', justifyContent: 'center', alignItems: 'flex-end',
        height: 280, marginBottom: 48, gap: 8,
      }}>
        {/* Rank 2 — Left */}
        <div style={{
          display: 'flex', flexDirection: 'column', alignItems: 'center',
          width: '28%', maxWidth: 160,
        }}>
          <AvatarCircle name={podiumPlayers[1]?.name} size={56} rank={2} />
          <div style={{ textAlign: 'center', marginBottom: 10 }}>
            <div style={{
              fontFamily: "'Lexend', sans-serif", fontSize: 14, fontWeight: 700,
              color: '#e5e1e4', overflow: 'hidden', textOverflow: 'ellipsis',
              whiteSpace: 'nowrap', maxWidth: 120,
            }}>
              {podiumPlayers[1]?.name}
            </div>
            <div style={{
              fontFamily: "'Inter', sans-serif", fontSize: 13, fontWeight: 600, color: '#cccccc', marginTop: 2,
            }}>
              {podiumPlayers[1]?.xp} XP
            </div>
          </div>
          <div style={{
            width: '100%', height: 120,
            background: '#2a2a2c', borderRadius: '12px 12px 0 0',
            borderTop: '3px solid #cccccc',
            display: 'flex', justifyContent: 'center', alignItems: 'flex-start', paddingTop: 16,
            position: 'relative', overflow: 'hidden',
          }}>
            <div style={{
              position: 'absolute', inset: 0,
              background: 'linear-gradient(to bottom, rgba(204,204,204,0.08), transparent)',
            }} />
            <span style={{
              fontFamily: "'Lexend', sans-serif", fontSize: 28, fontWeight: 700, color: '#cccccc',
            }}>2</span>
          </div>
        </div>

        {/* Rank 1 — Center (tallest) */}
        <div style={{
          display: 'flex', flexDirection: 'column', alignItems: 'center',
          width: '32%', maxWidth: 180, position: 'relative', zIndex: 2,
        }}>
          <div style={{ marginBottom: 8, color: '#facc15' }}>
            <i className="fa-solid fa-crown" style={{ fontSize: 28 }} />
          </div>
          <AvatarCircle name={podiumPlayers[0]?.name} size={72} rank={1} />
          <div style={{ textAlign: 'center', marginBottom: 10 }}>
            <div style={{
              fontFamily: "'Lexend', sans-serif", fontSize: 16, fontWeight: 700,
              color: '#e5e1e4', overflow: 'hidden', textOverflow: 'ellipsis',
              whiteSpace: 'nowrap', maxWidth: 140,
            }}>
              {podiumPlayers[0]?.name}
            </div>
            <div style={{
              fontFamily: "'Inter', sans-serif", fontSize: 14, fontWeight: 600, color: '#facc15', marginTop: 2,
            }}>
              {podiumPlayers[0]?.xp} XP
            </div>
          </div>
          <div style={{
            width: '100%', height: 160,
            background: '#2a2a2c', borderRadius: '12px 12px 0 0',
            borderTop: '4px solid #facc15',
            display: 'flex', justifyContent: 'center', alignItems: 'flex-start', paddingTop: 16,
            position: 'relative', overflow: 'hidden',
          }}>
            <div style={{
              position: 'absolute', inset: 0,
              background: 'linear-gradient(to bottom, rgba(250,204,21,0.1), transparent)',
            }} />
            <span style={{
              fontFamily: "'Lexend', sans-serif", fontSize: 36, fontWeight: 700, color: '#facc15',
            }}>1</span>
          </div>
        </div>

        {/* Rank 3 — Right */}
        <div style={{
          display: 'flex', flexDirection: 'column', alignItems: 'center',
          width: '28%', maxWidth: 160,
        }}>
          <AvatarCircle name={podiumPlayers[2]?.name} size={56} rank={3} />
          <div style={{ textAlign: 'center', marginBottom: 10 }}>
            <div style={{
              fontFamily: "'Lexend', sans-serif", fontSize: 14, fontWeight: 700,
              color: '#e5e1e4', overflow: 'hidden', textOverflow: 'ellipsis',
              whiteSpace: 'nowrap', maxWidth: 120,
            }}>
              {podiumPlayers[2]?.name}
            </div>
            <div style={{
              fontFamily: "'Inter', sans-serif", fontSize: 13, fontWeight: 600, color: '#cd7f32', marginTop: 2,
            }}>
              {podiumPlayers[2]?.xp} XP
            </div>
          </div>
          <div style={{
            width: '100%', height: 80,
            background: '#2a2a2c', borderRadius: '12px 12px 0 0',
            borderTop: '3px solid #cd7f32',
            display: 'flex', justifyContent: 'center', alignItems: 'flex-start', paddingTop: 14,
            position: 'relative', overflow: 'hidden',
          }}>
            <div style={{
              position: 'absolute', inset: 0,
              background: 'linear-gradient(to bottom, rgba(205,127,50,0.06), transparent)',
            }} />
            <span style={{
              fontFamily: "'Lexend', sans-serif", fontSize: 28, fontWeight: 700, color: '#cd7f32',
            }}>3</span>
          </div>
        </div>
      </div>
      )}

      {/* ═══ RANKED TABLE ═══ */}
      <div style={{
        background: '#0e0e10', borderRadius: 12,
        border: '1px solid rgba(255,255,255,0.05)',
        overflow: 'hidden', marginBottom: 24,
      }}>
        {/* Header */}
        <div style={{
          display: 'grid',
          gridTemplateColumns: '36px 1fr 60px 58px 48px',
          gap: 4, padding: '12px 16px',
          borderBottom: '1px solid rgba(255,255,255,0.05)',
          background: '#1c1b1d',
          fontFamily: "'Plus Jakarta Sans', sans-serif", fontSize: 10, fontWeight: 700,
          color: '#889299', textTransform: 'uppercase', letterSpacing: '0.08em',
        }}>
          <div style={{ textAlign: 'center' }}>Rank</div>
          <div style={{ minWidth: 0, overflow: 'hidden' }}>Player</div>
          <div style={{ textAlign: 'center' }}>Matches</div>
          <div style={{ textAlign: 'center' }}>Win Rate</div>
          <div style={{ textAlign: 'center' }}>Score</div>
        </div>

        {/* Rows */}
        {restList.map((item, idx) => {
          const rank = tab === 'players' ? idx + 4 : idx + 4
          const isMe = item.id === currentUser.id
          const isTop3 = false

          return (
            <div key={item.id || item.teamName} style={{
              display: 'grid',
              gridTemplateColumns: '36px 1fr 60px 58px 48px',
              gap: 4, padding: '12px 16px', alignItems: 'center',
              borderBottom: idx < restList.length - 1 ? '1px solid rgba(255,255,255,0.03)' : 'none',
              background: isMe ? 'rgba(97,205,255,0.05)' : 'transparent',
            }}>
              {/* Rank */}
              <div style={{
                textAlign: 'center',
                fontFamily: "'Lexend', sans-serif", fontSize: 13, fontWeight: 700,
                color: isMe ? '#61cdff' : '#889299',
              }}>
                {rank}
              </div>

              {/* Player */}
              <div style={{ display: 'flex', alignItems: 'center', gap: 10, minWidth: 0, overflow: 'hidden' }}>
                {isMe ? (
                  <div style={{
                    width: 28, height: 28, borderRadius: '50%',
                    background: '#2a2a2c', border: '1px solid #61cdff',
                    display: 'flex', alignItems: 'center', justifyContent: 'center',
                    fontFamily: "'Lexend', sans-serif", fontSize: 11, fontWeight: 700, color: '#61cdff',
                    flexShrink: 0,
                  }}>
                    {(currentUser?.ign || 'Y')[0].toUpperCase()}
                  </div>
                ) : (
                  <div style={{
                    width: 28, height: 28, borderRadius: '50%',
                    background: '#2a2a2c', flexShrink: 0,
                    display: 'flex', alignItems: 'center', justifyContent: 'center',
                    fontFamily: "'Lexend', sans-serif", fontSize: 10, fontWeight: 700, color: '#555555',
                  }}>
                    {(item.name || item.teamName || '?')[0].toUpperCase()}
                  </div>
                )}
                <span style={{
                  fontFamily: "'Lexend', sans-serif", fontSize: 13, fontWeight: 600,
                  color: isMe ? '#61cdff' : '#e5e1e4',
                  overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap',
                }}>
                  {isMe ? `${currentUser?.ign || 'You'} ` : (item.name || item.teamName)}
                  {isMe && (
                    <span style={{
                      fontSize: 9, fontWeight: 700, color: '#0e0e10',
                      background: '#61cdff', padding: '1px 5px', borderRadius: 3,
                      marginLeft: 6, textTransform: 'uppercase', letterSpacing: '0.05em',
                    }}>
                      Me
                    </span>
                  )}
                </span>
              </div>

              {/* Matches */}
              <div style={{
                textAlign: 'center',
                fontFamily: "'Inter', sans-serif", fontSize: 13, fontWeight: 500, color: '#555555',
              }}>
                {tab === 'players' ? (item.matchesPlayed || 0) : (item.played || 0)}
              </div>

              {/* Win Rate */}
              <div style={{
                textAlign: 'center',
                fontFamily: "'Inter', sans-serif", fontSize: 13, fontWeight: 500, color: '#555555',
              }}>
                {tab === 'players'
                  ? `${Math.round((item.wins / (item.matchesPlayed || 1)) * 100)}%`
                  : `${Math.round(((item.wins || 0) / (item.played || 1)) * 100)}%`
                }
              </div>

              {/* Score */}
              <div style={{
                textAlign: 'center',
                fontFamily: "'Inter', sans-serif", fontSize: 13, fontWeight: 700,
                color: isMe ? '#61cdff' : '#e5e1e4',
              }}>
                {tab === 'earnings' ? formatTK(item.earnings || 0) : tab === 'wins' ? `${item.wins || 0}` : `${item.kills || 0}`}
              </div>
            </div>
          )
        })}
      </div>

      {/* ═══ YOUR RANK BANNER ═══ */}
      {userRank && (
        <div style={{
          background: 'rgba(97,205,255,0.05)',
          border: '1px solid rgba(97,205,255,0.1)',
          borderRadius: 12, padding: '16px 24px',
          display: 'flex', justifyContent: 'space-between', alignItems: 'center',
          marginBottom: 16, flexWrap: 'wrap', gap: 12,
        }}>
          <span style={{
            fontSize: 12, fontWeight: 700, color: '#889299',
            fontFamily: "'Plus Jakarta Sans', sans-serif",
            textTransform: 'uppercase', letterSpacing: '0.08em',
          }}>
            Your Ranking
          </span>
          <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
            <span style={{ fontFamily: "'Lexend', sans-serif", fontSize: 24, fontWeight: 700, color: '#61cdff' }}>
              #{userRank}
            </span>
            <span style={{ fontFamily: "'Inter', sans-serif", fontSize: 13, fontWeight: 600, color: '#e5e1e4' }}>
              {podiumPlayers[userPlayerRank]?.xp || 'N/A'}
            </span>
            <span style={{
              fontSize: 10, fontWeight: 700, color: '#0e0e0e',
              background: '#61cdff', padding: '3px 10px', borderRadius: 4,
              fontFamily: "'Plus Jakarta Sans', sans-serif",
              textTransform: 'uppercase', letterSpacing: '0.05em',
            }}>
              Top {Math.round((userRank / Math.max(sortedPlayers.length, 1)) * 100)}%
            </span>
          </div>
        </div>
      )}

      {/* ═══ TEAM STANDINGS (from standings data) ═══ */}
      {tab === 'standings' && (
        <div style={{ marginBottom: 16 }}>
          <div style={{
            display: 'flex', alignItems: 'center', gap: 10, marginBottom: 14,
            borderBottom: '1px solid rgba(255,255,255,0.04)', paddingBottom: 12,
          }}>
            <div style={{ width: 4, height: 18, background: '#61cdff', flexShrink: 0 }} />
            <h3 style={{
              fontFamily: "'Lexend', sans-serif", fontSize: 16, fontWeight: 700,
              color: '#e5e1e4', margin: 0, textTransform: 'uppercase',
              letterSpacing: '-0.025em',
            }}>
              Team Standings
            </h3>
          </div>

          <div style={{
            background: '#0e0e10', borderRadius: 12,
            border: '1px solid rgba(255,255,255,0.05)', overflow: 'hidden',
          }}>
            {/* Header */}
            <div style={{
              display: 'grid',
              gridTemplateColumns: '28px 1fr 40px 40px 40px 40px',
              gap: 2, padding: '10px 12px',
              borderBottom: '1px solid rgba(255,255,255,0.05)',
              background: '#1c1b1d',
              fontFamily: "'Plus Jakarta Sans', sans-serif", fontSize: 10, fontWeight: 700,
              color: '#889299', textTransform: 'uppercase', letterSpacing: '0.08em',
            }}>
              <div style={{ textAlign: 'center' }}>#</div>
              <div style={{ minWidth: 0, overflow: 'hidden' }}>Team</div>
              <div style={{ textAlign: 'center' }}>P</div>
              <div style={{ textAlign: 'center' }}>W</div>
              <div style={{ textAlign: 'center' }}>K</div>
              <div style={{ textAlign: 'center' }}>Pts</div>
            </div>

            {sortedStandings.map((t, i) => (
              <div key={t.teamName} style={{
                display: 'grid',
                gridTemplateColumns: '28px 1fr 40px 40px 40px 40px',
                gap: 2, padding: '10px 12px', alignItems: 'center',
                borderBottom: i < sortedStandings.length - 1 ? '1px solid rgba(255,255,255,0.03)' : 'none',
                background: i < 3 ? (i === 0 ? 'rgba(250,204,21,0.03)' : i === 1 ? 'rgba(204,204,204,0.03)' : 'rgba(205,127,50,0.03)') : 'transparent',
                borderLeft: i < 3 ? `2px solid ${['#facc15','#cccccc','#cd7f32'][i]}` : '2px solid transparent',
              }}>
                <div style={{
                  textAlign: 'center', fontFamily: "'Lexend', sans-serif",
                  fontSize: 11, fontWeight: 700,
                  color: i === 0 ? '#facc15' : i === 1 ? '#cccccc' : i === 2 ? '#cd7f32' : '#555555',
                }}>
                  {i + 1}
                </div>
                <div style={{
                  fontFamily: "'Lexend', sans-serif", fontSize: 12, fontWeight: 600,
                  color: i < 3 ? '#e5e1e4' : '#bdc8cf',
                  overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', textAlign: 'left', paddingLeft: 8,
                }}>
                  {t.teamName}
                </div>
                {[
                  t.played, t.wins, t.kills,
                  t.points
                ].map((val, si) => (
                  <div key={si} style={{
                    textAlign: 'center',
                    fontFamily: "'Inter', sans-serif", fontSize: 12, fontWeight: 500,
                    color: i === 0 ? '#facc15' : i === 1 ? '#cccccc' : i === 2 ? '#cd7f32' : '#555555',
                  }}>
                    {val}
                  </div>
                ))}
              </div>
            ))}
          </div>
        </div>
      )}

      {/* ═══ LOAD MORE ═══ */}
      <div style={{ textAlign: 'center', padding: '12px 0' }}>
        <span style={{
          fontFamily: "'Lexend', sans-serif", fontSize: 14, fontWeight: 600, color: '#61cdff', cursor: 'pointer',
          WebkitTapHighlightColor: 'transparent',
        }}>
          Load More
        </span>
      </div>
    </div>
  )
}