import { useApp } from '../context'
import { formatTK, modeColor, mapIcon, getMatchPhase, getMatchCountdown, slotPercent, phaseColor, phaseLabel } from '../utils'

export default function MatchCard({ match, animated }) {
  const { dispatch, navigate } = useApp()
  const phase = getMatchPhase(match)
  const countdown = getMatchCountdown(match)
  const pct = slotPercent(match)
  const isLive = phase === 'live'
  const isUpcoming = phase === 'upcoming'
  const isCompleted = phase === 'completed'

  const prizePoolValue = match.prizePool || Math.round(match.entryFee * match.maxSlots * 0.8)

  const statusConfig = {
    live: {
      label: 'LIVE',
      badgeBg: '#e63946', badgeColor: '#ffffff',
      edgeColor: '#4ade80', showKinetic: true,
      fillBar: '#e63946',
    },
    upcoming: {
      label: isUpcoming && countdown > 0
        ? `${Math.floor(countdown / 60000)}m left`
        : 'STARTING SOON',
      badgeBg: '#61cdff', badgeColor: '#0e0e10',
      edgeColor: '#e3d7ff', showKinetic: false,
      fillBar: '#61cdff',
    },
    completed: {
      label: 'COMPLETED',
      badgeBg: '#3a3a48', badgeColor: '#b0b0c0',
      edgeColor: '#3a3a48', showKinetic: false,
      fillBar: '#3a3a48',
    },
  }
  const sc = statusConfig[phase] || statusConfig.upcoming

  const handleJoin = (e) => {
    e.stopPropagation()
    if (isCompleted) return
    dispatch({ type: 'SHOW_MODAL', payload: { type: 'join-match', matchId: match.id } })
  }

  const handleViewDetail = () => {
    navigate(`match-detail/${match.id}`)
    dispatch({ type: 'NAVIGATE', payload: { view: 'match-detail', param: match.id } })
  }

  const modeIcon = match.mode === 'Solo' ? 'fa-user'
    : match.mode === 'Duo' ? 'fa-user-group'
    : match.mode === 'Clash Squad' ? 'fa-crosshairs'
    : 'fa-shield-halved'

  return (
    <div
      onClick={handleViewDetail}
      style={{
        position: 'relative',
        borderRadius: 12,
        overflow: 'hidden',
        cursor: 'pointer',
        background: '#1b1b1d',
        boxShadow: 'inset 0 0 0 1px rgba(62,72,78,0.15), 0 4px 20px rgba(0,0,0,0.25)',
        opacity: 1,
        WebkitTapHighlightColor: 'transparent',
        animation: animated ? 'slideInUp 0.4s ease' : 'none',
        border: isLive ? '1px solid rgba(97,205,255,0.15)' : '1px solid rgba(62,72,78,0.15)',
      }}
    >
      {/* Left edge marker */}
      <div style={{
        position: 'absolute', left: 0, top: 0, bottom: 0, width: 3,
        background: sc.edgeColor, zIndex: 10,
      }} />

      {/* Kinetic gradient — live only */}
      {sc.showKinetic && (
        <div style={{
          position: 'absolute', inset: 0,
          background: 'linear-gradient(135deg, rgba(97,205,255,0.10) 0%, transparent 100%)',
          pointerEvents: 'none',
        }} />
      )}

      {/* Content */}
      <div style={{ padding: '16px 16px 16px 19px', position: 'relative', zIndex: 20 }}>
        {/* Status badge + NO REFUND */}
        <div style={{ marginBottom: 6, display: 'flex', alignItems: 'center', gap: 6 }}>
          <div style={{
            display: 'inline-flex', alignItems: 'center',
            padding: '2px 8px', borderRadius: 0,
            background: sc.badgeBg, color: sc.badgeColor,
            fontFamily: "'Lexend', sans-serif", fontSize: 10, fontWeight: 700,
            fontStyle: 'italic', textTransform: 'uppercase', letterSpacing: '0.08em',
          }}>
            {isLive && (
              <span style={{
                width: 6, height: 6, borderRadius: '50%', background: '#ffffff',
                marginRight: 6, animation: 'pulse 1.5s infinite',
              }} />
            )}
            {sc.label}
          </div>
          {!isCompleted && (
            <span style={{
              padding: '2px 7px', borderRadius: 0,
              background: 'rgba(248,113,113,0.15)',
              border: '1px solid rgba(248,113,113,0.25)',
              fontFamily: "'Inter', sans-serif", fontSize: 9, fontWeight: 700,
              color: '#f87171', letterSpacing: '0.08em', textTransform: 'uppercase',
            }}>
              NO REFUND
            </span>
          )}
        </div>
        {/* Title */}
        <h3 style={{
          fontFamily: "'Lexend', sans-serif", fontSize: 15, fontWeight: 700,
        color: '#808090',
          textTransform: 'uppercase', letterSpacing: '-0.02em',
          margin: '0 0 12px', lineHeight: 1.2,
          overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap',
        }}>
          {match.title}
        </h3>

        {/* Info row + Prize */}
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-end' }}>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 6, minWidth: 0, flex: 1 }}>
            <div style={{
              display: 'flex', alignItems: 'center', gap: 6,
              fontSize: 12, color: '#606070',
              fontFamily: "'Plus Jakarta Sans', sans-serif", fontWeight: 500,
            }}>
              <i className="fa-solid fa-location-dot" style={{
                fontSize: 13, color: isCompleted ? '#555' : '#61cdff', flexShrink: 0,
              }} />
              <span style={{
                minWidth: 0, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap',
              }}>
                {match.map}{match.gameType === 'BR' ? ' · TPP' : ' · FPP'}
              </span>
              <span style={{ opacity: 0.4, flexShrink: 0 }}>·</span>
              <i className={`fa-solid ${modeIcon}`} style={{
                fontSize: 13, color: isCompleted ? '#555' : '#a0a0b0', flexShrink: 0,
              }} />
              <span style={{
                fontFamily: "'Inter', sans-serif", fontWeight: 600, flexShrink: 0,
              }}>
                {match.joinedCount || 0}/{match.maxSlots}
              </span>
            </div>

            {/* Slot bar */}
            <div style={{ maxWidth: 140 }}>
              <div style={{
                width: '100%', height: 4, borderRadius: 999,
                background: '#353437', overflow: 'hidden',
              }}>
                <div style={{
                  height: '100%', width: `${pct}%`, borderRadius: 999,
                  background: sc.fillBar,
                  transition: 'width 0.3s ease',
                }} />
              </div>
            </div>
          </div>

          {/* Prize pool */}
          <div style={{ textAlign: 'right', flexShrink: 0, marginLeft: 16 }}>
            <div style={{
              fontSize: 10, color: isCompleted ? '#808090' : '#b0b0c0',
              fontFamily: "'Plus Jakarta Sans', sans-serif", fontWeight: 600,
              textTransform: 'uppercase', letterSpacing: '0.1em', marginBottom: 2,
            }}>
              Prize Pool
            </div>
            <div style={{
              fontFamily: "'Inter', sans-serif", fontSize: 14, fontWeight: 700,
              color: isCompleted ? '#808090' : '#b08cff',
            }}>
              {formatTK(prizePoolValue)}
            </div>
          </div>
        </div>

        {/* Per kill chip */}
        {match.perKill > 0 && !isCompleted && (
          <div style={{ marginTop: 10 }}>
            <span style={{
              display: 'inline-flex', alignItems: 'center', gap: 5,
              padding: '4px 12px', borderRadius: 0,
              background: 'rgba(250,204,21,0.12)',
              border: '1px solid rgba(250,204,21,0.2)',
              fontFamily: "'Inter', sans-serif", fontSize: 12, fontWeight: 700,
              color: '#ffd84a',
            }}>
              <i className="fa-solid fa-crosshairs" style={{ fontSize: 10 }} />
              +{match.perKill} TK / kill
            </span>
          </div>
        )}
      </div>

      {/* Action area */}
      {!isCompleted && (
        <div style={{
         background: '#2a2a2c',
          padding: '12px 16px 12px 19px',
          display: 'flex', justifyContent: 'space-between', alignItems: 'center',
          position: 'relative', zIndex: 20,
          borderTop: '1px solid #353437',
        }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
            <span style={{
              fontSize: 12, color: '#9090a0',
              fontFamily: "'Plus Jakarta Sans', sans-serif", fontWeight: 600,
              textTransform: 'uppercase', letterSpacing: '0.08em',
            }}>
              Entry
            </span>
            <span style={{
              fontFamily: "'Inter', sans-serif", fontSize: 14, fontWeight: 700,
              color: '#e3d7ff',
            }}>
              {formatTK(match.entryFee)}
            </span>
          </div>

          {isLive ? (
            <button onClick={handleJoin} style={{
              padding: '8px 20px', borderRadius: 0,
              background: '#e63946', color: '#ffffff', border: 'none', cursor: 'pointer',
              fontFamily: "'Plus Jakarta Sans', sans-serif", fontSize: 12, fontWeight: 700,
              letterSpacing: '0.1em', textTransform: 'uppercase',
              WebkitTapHighlightColor: 'transparent',
            }}>
              <i className="fa-solid fa-play" style={{ fontSize: 11, marginRight: 6 }} />
              Watch
            </button>
          ) : (
            <button onClick={handleJoin} style={{
              padding: '8px 20px', borderRadius: 0,
              background: '#61cdff', color: '#0e0e10', border: 'none', cursor: 'pointer',
              fontFamily: "'Plus Jakarta Sans', sans-serif", fontSize: 12, fontWeight: 700,
              letterSpacing: '0.1em', textTransform: 'uppercase',
              WebkitTapHighlightColor: 'transparent',
            }}>
              <i className="fa-solid fa-bolt" style={{ fontSize: 11, marginRight: 6 }} />
              Join
            </button>
          )}
        </div>
      )}
    </div>
  )
}