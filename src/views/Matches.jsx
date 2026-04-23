import { useState } from 'react'
import { useApp } from '../context'
import MatchCard from '../components/MatchCard'
import { MATCH_RULES } from '../data'

export default function Matches() {
  const { state, dispatch } = useApp()
  const { matches, matchFilter, isAdmin } = state
  const [search, setSearch] = useState('')
  const [showRules, setShowRules] = useState(false)

  const filters = [
    { key: 'all', label: 'All Matches', icon: 'fa-solid fa-gamepad' },
    { key: 'Solo', label: 'Solo', icon: 'fa-solid fa-user' },
    { key: 'Duo', label: 'Duo', icon: 'fa-solid fa-user-group' },
    { key: 'Squad', label: 'Squad', icon: 'fa-solid fa-shield-halved' },
    { key: 'Clash Squad', label: 'CS 4v4', icon: 'fa-solid fa-crosshairs' },
  ]

  const filtered = matches.filter(m => {
    const modeMatch = matchFilter === 'all' || m.mode === matchFilter
    const q = search.toLowerCase()
    const searchMatch = !q || m.title.toLowerCase().includes(q) || m.map.toLowerCase().includes(q)
    return modeMatch && searchMatch
  })

  const live = filtered.filter(m => m.status === 'live')
  const upcoming = filtered
    .filter(m => m.status === 'upcoming')
    .sort((a, b) => new Date(a.startTime.replace(' ', 'T')).getTime() - new Date(b.startTime.replace(' ', 'T')).getTime())
  const completed = filtered.filter(m => m.status === 'completed')

  const sectionHead = (title, count, countColor, liveDot) => (
    <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 18 }}>
      {liveDot && (
        <span style={{
          width: 8, height: 8, borderRadius: '50%', background: '#4ade80',
          animation: 'pulse 1.5s infinite', flexShrink: 0,
        }} />
      )}
      <div style={{ width: 4, height: 12, background: '#61cdff', borderRadius: 9999, flexShrink: 0 }} />
      <h2 style={{
        fontFamily: "'Plus Jakarta Sans', sans-serif", fontSize: 10, fontWeight: 700,
        color: '#c6c6c6', letterSpacing: '0.15em', textTransform: 'uppercase', margin: 0,
      }}>
        {title}
      </h2>
      <span style={{
        fontFamily: "'Inter', sans-serif", fontSize: 13, fontWeight: 700,
        color: countColor,
      }}>
        {count}
      </span>
    </div>
  )

  return (
    <div style={{
  padding: '4px 4px 100px',
  background: '#14141a',
  borderRadius: 16,
  WebkitTapHighlightColor: 'transparent',
}}>

      {/* ═══ HERO HEADER — "Match Arena" with colored accent (Stitch exact) ═══ */}
      <div style={{ marginBottom: 28 }}>
        <h1 style={{
          fontFamily: "'Lexend', sans-serif", fontSize: 32, fontWeight: 700,
          color: '#e5e1e4', margin: '0 0 6px',
          textTransform: 'uppercase', letterSpacing: '-0.025em', fontStyle: 'italic',
          lineHeight: 1.1,
        }}>
          Match <span style={{ color: '#61cdff' }}>Arena</span>
        </h1>
        <p style={{
          fontFamily: "'Plus Jakarta Sans', sans-serif", fontSize: 13,
          color: '#889299', margin: 0, fontWeight: 500, lineHeight: 1.5,
        }}>
          Find and join the most competitive tournaments in Bangladesh. High stakes, premium rewards.
        </p>
      </div>

      {/* ═══ SEARCH — bottom-border accent + gradient underline (Stitch exact) ═══ */}
      <div style={{ position: 'relative', marginBottom: 28 }}>
        <i className="fa-solid fa-magnifying-glass" style={{
          position: 'absolute', left: 16, top: '50%', transform: 'translateY(-50%)',
          fontSize: 18, color: '#889299', pointerEvents: 'none',
        }} />
        <input
          type="text"
          placeholder="Search tournaments..."
          value={search}
          onChange={e => setSearch(e.target.value)}
          style={{
            width: '100%', padding: '14px 40px 14px 48px',
            background: 'rgba(27,27,29,0.8)',
            border: 'none', borderBottom: '2px solid #2a2a2c',
            borderRadius: '12px 12px 0 0', outline: 'none',
            fontFamily: "'Plus Jakarta Sans', sans-serif", fontSize: 14, fontWeight: 500,
            color: '#e5e1e4', boxSizing: 'border-box',
            WebkitTapHighlightColor: 'transparent',
          }}
          onFocus={e => { e.target.style.borderBottomColor = '#61cdff' }}
          onBlur={e => { e.target.style.borderBottomColor = '#2a2a2c' }}
        />
        <div style={{
          position: 'absolute', left: '10%', right: '10%', bottom: -1, height: 1,
          background: 'linear-gradient(to right, transparent, rgba(97,205,255,0.2), transparent)',
          pointerEvents: 'none',
        }} />
        {search && (
          <button onClick={() => setSearch('')} style={{
            position: 'absolute', right: 14, top: '50%', transform: 'translateY(-50%)',
            width: 28, height: 28, borderRadius: 8,
            background: '#2a2a2c', border: 'none',
            color: '#889299', cursor: 'pointer',
            display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 11,
            WebkitTapHighlightColor: 'transparent',
          }}>
            <i className="fa-solid fa-xmark" />
          </button>
        )}
      </div>

      {/* ═══ PREMIUM FILTER PILLS — pill shape, inset shadow, bottom border (Stitch exact) ═══ */}
      <div style={{
        display: 'flex', gap: 10, marginBottom: 6,
        overflowX: 'auto', paddingBottom: 2,
        scrollbarWidth: 'none', msOverflowStyle: 'none',
      }}>
        <style>{`.fp-sb::-webkit-scrollbar{display:none}`}</style>
        <div className="fp-sb" style={{ display: 'flex', gap: 10, paddingBottom: 4 }}>
          {filters.map(f => {
            const active = matchFilter === f.key
            return (
              <button
                key={f.key}
                onClick={() => dispatch({ type: 'SET_FILTER', payload: f.key })}
                style={{
                  position: 'relative',
                  padding: '11px 24px',
                  borderRadius: 9999,
                  border: 'none',
                  background: active ? '#61cdff' : 'transparent',
                  color: active ? '#005572' : '#889299',
                  cursor: 'pointer',
                  fontFamily: "'Plus Jakarta Sans', sans-serif",
                  fontSize: 13, fontWeight: active ? 700 : 600,
                  letterSpacing: '0.04em',
                  whiteSpace: 'nowrap',
                  WebkitTapHighlightColor: 'transparent',
                  display: 'flex', alignItems: 'center', gap: 9,
                  boxShadow: active
                    ? 'inset 0 0 8px rgba(255,255,255,0.08), 0 2px 12px rgba(97,205,255,0.25), 0 0 0 1px rgba(97,205,255,0.1)'
                    : '0 0 0 1px rgba(255,255,255,0.06)',
                  transition: 'all 0.2s ease',
                }}
              >
                <i className={f.icon} style={{ fontSize: 12 }} />
                {f.label}
              </button>
            )
          })}
        </div>
      </div>

      {/* ═══ FILTER BOTTOM BORDER (Stitch: border-b under tabs) ═══ */}
      <div style={{
        height: 1, background: 'linear-gradient(to right, transparent, rgba(255,255,255,0.04), transparent)',
        marginBottom: 28,
      }} />

      {/* ═══ RULES TOGGLE ═══ */}
      <button
        onClick={() => setShowRules(!showRules)}
        style={{
          display: 'flex', alignItems: 'center', gap: 10,
          width: '100%', padding: '14px 16px', marginBottom: 24,
          background: '#1b1b1d',
          border: `1px solid ${showRules ? 'rgba(248,113,113,0.12)' : '#2a2a2c'}`,
          borderLeft: `3px solid ${showRules ? '#f87171' : '#61cdff'}`,
          borderRadius: 12, cursor: 'pointer',
          WebkitTapHighlightColor: 'transparent',
        }}
      >
        <i className={`fa-solid ${showRules ? 'fa-xmark' : 'fa-scroll'}`} style={{
          fontSize: 13, color: showRules ? '#f87171' : '#61cdff', flexShrink: 0,
        }} />
        <span style={{
          fontFamily: "'Plus Jakarta Sans', sans-serif", fontSize: 13, fontWeight: 600,
          color: showRules ? '#f87171' : '#c6c6c6',
        }}>
          {showRules ? 'Hide Rules & Regulations' : 'Rules & Regulations'}
        </span>
      </button>

      {/* ═══ RULES PANEL ═══ */}
      {showRules && (
        <div style={{
          background: '#1b1b1d', borderRadius: 12,
          border: '1px solid rgba(255,255,255,0.06)',
          marginBottom: 28, overflow: 'hidden',
        }}>
          <div style={{ padding: '0 0 100px 0' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 16 }}>
              <div style={{ width: 4, height: 12, background: '#61cdff', borderRadius: 9999, flexShrink: 0 }} />
              <span style={{
                fontFamily: "'Plus Jakarta Sans', sans-serif", fontSize: 10, fontWeight: 700,
                color: '#c6c6c6', letterSpacing: '0.15em', textTransform: 'uppercase',
              }}>
                Read carefully before joining
              </span>
            </div>
            <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
              {MATCH_RULES.map((rule, i) => (
                <div key={i} style={{
                  display: 'flex', alignItems: 'flex-start', gap: 10,
                  padding: '10px 12px', borderRadius: 8,
                  background: '#131315',
                }}>
                  <span style={{
                    fontFamily: "'Inter', sans-serif", fontSize: 11, fontWeight: 700,
                    color: '#555555', flexShrink: 0, marginTop: 1, minWidth: 20,
                  }}>
                    {String(i + 1).padStart(2, '0')}
                  </span>
                  <span style={{
                    fontSize: 12, color: '#c6c6c6',
                    fontFamily: "'Plus Jakarta Sans', sans-serif", lineHeight: 1.5, fontWeight: 500,
                  }}>
                    {rule}
                  </span>
                </div>
              ))}
            </div>
          </div>
        </div>
      )}

      {/* ═══ MATCH SECTIONS — vertical stack for card layout ═══ */}
      {live.length > 0 && (
        <div style={{ marginBottom: 32 }}>
          {sectionHead('Live Now', live.length, '#4ade80', true)}
          <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
            {live.map(m => <MatchCard key={m.id} match={m} />)}
          </div>
        </div>
      )}

      {upcoming.length > 0 && (
        <div style={{ marginBottom: 32 }}>
          {sectionHead('Upcoming', upcoming.length, '#61cdff')}
          <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
            {upcoming.map(m => <MatchCard key={m.id} match={m} animated />)}
          </div>
        </div>
      )}

      {completed.length > 0 && (
        <div style={{ marginBottom: 32 }}>
          {sectionHead('Completed', completed.length, '#555555')}
          <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
            {completed.map(m => <MatchCard key={m.id} match={m} />)}
          </div>
        </div>
      )}

      {/* ═══ EMPTY STATE ═══ */}
      {filtered.length === 0 && (
        <div style={{
          textAlign: 'center', padding: '60px 20px',
          background: '#1b1b1d', borderRadius: 12,
          border: '1px solid rgba(255,255,255,0.06)',
        }}>
          <i className="fa-solid fa-magnifying-glass" style={{
            fontSize: 36, color: '#2a2a2c', marginBottom: 16, display: 'block',
          }} />
          <p style={{
            color: '#c6c6c6', fontFamily: "'Plus Jakarta Sans', sans-serif",
            fontSize: 14, fontWeight: 600, margin: '0 0 6px',
          }}>
            No matches found
          </p>
          <p style={{
            color: '#555555', fontFamily: "'Plus Jakarta Sans', sans-serif",
            fontSize: 12, margin: 0, fontWeight: 500,
          }}>
            {search ? `No results for "${search}"` : 'No matches in this category'}
          </p>
        </div>
      )}

      {/* ═══ FOOTER ═══ */}
      {filtered.length > 0 && (
        <div style={{ textAlign: 'center', padding: '8px 0 16px' }}>
          <span style={{
            fontFamily: "'Plus Jakarta Sans', sans-serif",
            fontSize: 11, fontWeight: 600, color: '#555555',
            letterSpacing: '0.06em', textTransform: 'uppercase',
          }}>
            Showing {filtered.length} match{filtered.length !== 1 ? 'es' : ''}
          </span>
        </div>
      )}
    </div>
  )
}