import { useState, useEffect, useMemo } from 'react'
import { useApp } from '../context'
import { formatTK, formatTKShort, calculateMatchEconomics, calculateResultPrize, calculateAllResultPrizes, getRoomUnlockCountdown, maxSlotsForMode, showToast } from '../utils'
import { approveAddMoneyRequest, rejectAddMoneyRequest } from '../db'
import { FF_MAPS, FF_MODES, FF_GAME_TYPES, KILL_REWARDS, RESULT_METHODS } from '../data'

// ★ Inline fallback — remove this after updating utils.js
function isTeamMode(mode) {
  return mode === 'Duo' || mode === 'Squad' || mode === 'Clash Squad'
}
function modeColor(mode) {
  return { Solo: '#6c8cff', Duo: '#fbbf24', Squad: '#a78bfa', 'Clash Squad': '#f87171' }[mode] || '#6c8cff'
}

// ═══════════════════════════════════════
//  PERMISSION MAP
// ═══════════════════════════════════════
const PERM_MAP = {
  'admin-overview': null,
  'admin-create': 'matches',
  'admin-rooms': 'rooms',
  'admin-results': 'results',
  'admin-users': 'users',
  'admin-finance': 'finance',
  'admin-add-money': 'finance',
  'admin-payments': 'payments',
  'admin-owners': '__owner__',
  'admin-activity': '__owner__',
}
const ALL_PERMISSIONS = [
  { key: 'matches', label: 'Create & Edit Matches', icon: 'fa-gamepad', color: '#a78bfa' },
  { key: 'rooms', label: 'Room Management', icon: 'fa-key', color: '#fbbf24' },
  { key: 'results', label: 'Submit Results', icon: 'fa-flag-checkered', color: '#22c55e' },
  { key: 'users', label: 'User Management', icon: 'fa-users', color: '#6c8cff' },
  { key: 'finance', label: 'Finance & Withdrawals', icon: 'fa-money-bill-wave', color: '#ef4444' },
  { key: 'payments', label: 'Payment Settings', icon: 'fa-credit-card', color: '#f59e0b' },
]

// ═══════════════════════════════════════
//  HOOK: detect mobile
// ═══════════════════════════════════════
function useIsMobile() {
  const [m, setM] = useState(() => typeof window !== 'undefined' ? window.innerWidth <= 768 : false)
  useEffect(() => {
    const h = () => setM(window.innerWidth <= 768)
    window.addEventListener('resize', h)
    return () => window.removeEventListener('resize', h)
  }, [])
  return m
}

// ═══════════════════════════════════════
//  SHARED STYLES
// ═══════════════════════════════════════
const S = {
  panel: { padding: '0 0 20px 0' },
  title: { fontFamily: 'var(--font-heading)', fontSize: 22, fontWeight: 800, color: '#fff', margin: '0 0 20px' },
  card: { background: 'rgba(255,255,255,0.02)', border: '1px solid rgba(255,255,255,0.06)', borderRadius: 16, overflow: 'hidden' },
  cardHeader: { display: 'flex', alignItems: 'center', gap: 10, padding: '14px 18px', borderBottom: '1px solid rgba(255,255,255,0.04)' },
  cardHeaderIcon: (color) => ({ width: 32, height: 32, borderRadius: 8, background: color + '15', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }),
  cardHeaderTitle: { fontFamily: 'var(--font-heading)', fontSize: 14, fontWeight: 700, color: '#fff', margin: 0 },
  label: { display: 'block', fontFamily: 'var(--font-heading)', fontSize: 11, fontWeight: 700, color: 'var(--text-muted, #777)', letterSpacing: 0.5, textTransform: 'uppercase', marginBottom: 6 },
  input: { width: '100%', padding: '10px 14px', borderRadius: 10, border: '1px solid rgba(255,255,255,0.08)', background: 'rgba(255,255,255,0.04)', color: '#fff', fontFamily: 'var(--font-body)', fontSize: 13, outline: 'none', boxSizing: 'border-box', transition: 'border-color 0.2s' },
  select: { width: '100%', padding: '10px 14px', borderRadius: 10, border: '1px solid rgba(255,255,255,0.08)', background: 'rgba(255,255,255,0.04)', color: '#fff', fontFamily: 'var(--font-body)', fontSize: 13, outline: 'none', boxSizing: 'border-box' },
  btnPrimary: { width: '100%', padding: '12px 0', borderRadius: 12, border: 'none', fontFamily: 'var(--font-display)', fontSize: 14, fontWeight: 700, cursor: 'pointer', background: 'linear-gradient(135deg, #6c8cff, #a78bfa)', color: '#fff', boxShadow: '0 4px 20px rgba(108,140,255,0.3)', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 8 },
  btnGhost: { padding: '8px 14px', borderRadius: 8, border: '1px solid rgba(255,255,255,0.1)', background: 'rgba(255,255,255,0.04)', color: 'var(--text-muted, #888)', fontFamily: 'var(--font-heading)', fontSize: 11, fontWeight: 600, cursor: 'pointer', display: 'inline-flex', alignItems: 'center', gap: 6 },
  btnDanger: { padding: '6px 12px', borderRadius: 8, border: 'none', background: 'rgba(239,68,68,0.12)', color: '#ef4444', fontFamily: 'var(--font-heading)', fontSize: 11, fontWeight: 600, cursor: 'pointer' },
  btnSuccess: { padding: '6px 12px', borderRadius: 8, border: 'none', background: 'rgba(34,197,94,0.12)', color: '#22c55e', fontFamily: 'var(--font-heading)', fontSize: 11, fontWeight: 600, cursor: 'pointer' },
  btnWarning: { padding: '6px 12px', borderRadius: 8, border: 'none', background: 'rgba(251,191,36,0.12)', color: '#fbbf24', fontFamily: 'var(--font-heading)', fontSize: 11, fontWeight: 600, cursor: 'pointer' },
  table: { width: '100%', borderCollapse: 'collapse', tableLayout: 'fixed' },
  th: { padding: '10px 12px', fontFamily: 'var(--font-heading)', fontSize: 10, fontWeight: 700, color: 'var(--text-muted, #666)', letterSpacing: 1, textTransform: 'uppercase', textAlign: 'left', borderBottom: '1px solid rgba(255,255,255,0.06)', background: 'rgba(255,255,255,0.02)' },
  td: { padding: '12px', borderBottom: '1px solid rgba(255,255,255,0.03)', fontSize: 13, wordBreak: 'break-word' },
  mCard: { padding: 14, borderRadius: 12, background: 'rgba(255,255,255,0.02)', border: '1px solid rgba(255,255,255,0.06)', marginBottom: 10 },
  mRow: { display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '5px 0' },
  mLabel: { fontSize: 10, color: 'var(--text-muted, #666)', fontWeight: 600, textTransform: 'uppercase', letterSpacing: 0.5 },
}

function adminAction(dispatch, action, target, toastMsg, toastType) {
  dispatch({ type: 'LOG_ACTION', payload: { action, target } })
  if (toastMsg) showToast(dispatch, toastMsg, toastType || 'success')
}

// ═══════════════════════════════════════
//  1. OVERVIEW
// ═══════════════════════════════════════
function AdminOverview() {
  const { state } = useApp()
  const { matches, users, transactions, pendingWithdrawals, pendingAddMoneyRequests } = state
  const mobile = useIsMobile()

  const totalCollection = matches.reduce((s, m) => s + (m.entryFee * (m.joinedCount || 0)), 0)
  const adminProfit = Math.round(totalCollection * 0.20)
  const totalPrizes = transactions.filter(t => t.type === 'win').reduce((s, t) => s + t.amount, 0)
  const liveCount = matches.filter(m => m.status === 'live').length
  const upcomingCount = matches.filter(m => m.status === 'upcoming').length

  // ═══ PHASE 1.3: Entry fee escrow tracking — refund + distributed stats ═══
  const totalRefunded = matches.reduce((s, m) => s + (m.escrow?.refunded || 0), 0)
  const totalDistributed = matches.reduce((s, m) => s + (m.escrow?.distributed || 0), 0)
  const activeEscrow = Math.max(0, totalCollection - totalRefunded - totalDistributed)

  const stats = [
    { label: 'Total Collection', value: formatTK(totalCollection), icon: 'fa-solid fa-sack-dollar', color: '#fbbf24' },
    { label: 'Admin Profit (20%)', value: formatTK(adminProfit), icon: 'fa-solid fa-chart-line', color: '#22c55e' },
    { label: 'Prize Distributed', value: formatTK(totalPrizes), icon: 'fa-solid fa-trophy', color: '#a78bfa' },
    // ═══ PHASE 1.3: New escrow stats ═══
    { label: 'Total Refunded', value: formatTK(totalRefunded), icon: 'fa-solid fa-rotate-left', color: '#f87171', sub: 'From cancellations' },
    { label: 'Active Escrow', value: formatTK(activeEscrow), icon: 'fa-solid fa-vault', color: '#00f0ff', sub: 'Held in system' },
    // ═══ END PHASE 1.3 ═══
    { label: 'Live Matches', value: liveCount, icon: 'fa-solid fa-tower-broadcast', color: '#ef4444' },
    { label: 'Upcoming', value: upcomingCount, icon: 'fa-solid fa-clock', color: '#6c8cff' },
    { label: 'Total Users', value: users.filter(u => u.role === 'user').length, icon: 'fa-solid fa-users', color: '#00f0ff', sub: `${users.filter(u => !u.banned).length} active` },
    { label: 'Pending Withdrawals', value: pendingWithdrawals.length, icon: 'fa-solid fa-hourglass-half', color: '#fbbf24' },
    { label: 'Add Money Requests', value: (pendingAddMoneyRequests || []).length, icon: 'fa-solid fa-wallet', color: '#22c55e', sub: 'Need approval' },
    { label: 'Transactions', value: transactions.length, icon: 'fa-solid fa-receipt', color: '#64748b' },
  ]

  return (
    <div style={S.panel}>
      <h1 style={S.title}><i className="fa-solid fa-chart-pie" style={{ marginRight: 10, color: '#00f0ff' }}></i>Dashboard Overview</h1>
      <div style={{ display: 'grid', gridTemplateColumns: mobile ? 'repeat(2, 1fr)' : 'repeat(auto-fill, minmax(200px, 1fr))', gap: 10 }}>
        {stats.map((s, i) => (
          <div key={i} style={{
            padding: mobile ? '12px 14px' : '16px 18px', borderRadius: 14,
            background: 'rgba(255,255,255,0.02)', border: '1px solid rgba(255,255,255,0.06)', transition: 'all 0.3s ease',
          }}
          onMouseEnter={e => { e.currentTarget.style.borderColor = s.color + '30'; e.currentTarget.style.boxShadow = `0 4px 20px ${s.color}10` }}
          onMouseLeave={e => { e.currentTarget.style.borderColor = 'rgba(255,255,255,0.06)'; e.currentTarget.style.boxShadow = 'none' }}
          >
            <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 8 }}>
              <div style={{ ...S.cardHeaderIcon(s.color), width: 28, height: 28 }}>
                <i className={s.icon} style={{ fontSize: 12, color: s.color }}></i>
              </div>
              <span style={{ fontSize: mobile ? 9 : 10, color: 'var(--text-muted, #777)', fontFamily: 'var(--font-heading)', letterSpacing: 0.5, textTransform: 'uppercase', lineHeight: 1.2 }}>{s.label}</span>
            </div>
            <div style={{ fontFamily: 'var(--font-display)', fontSize: mobile ? (typeof s.value === 'number' ? 22 : 14) : (typeof s.value === 'number' ? 26 : 17), fontWeight: 800, color: s.color }}>{s.value}</div>
            {s.sub && <div style={{ fontSize: 11, color: 'var(--text-muted, #666)', marginTop: 3 }}>{s.sub}</div>}
          </div>
        ))}
      </div>
    </div>
  )
}

// ═══════════════════════════════════════
//  2. CREATE MATCH
// ═══════════════════════════════════════
function AdminCreateMatch() {
  const { state, dispatch } = useApp()
  const mobile = useIsMobile()
  const [form, setForm] = useState({
    title: '', gameType: 'BR', mode: 'Solo', map: 'Bermuda',
    entryFee: 30, maxSlots: 50, perKill: 10,
    include4th: true, include5th: true, startTime: '',
    // ═══ PHASE 1.5: Minimum player threshold field ═══
    minPlayers: 10,
    // ═══ END PHASE 1.5 ═══
  })

  const update = (k, v) => {
    const next = { ...form, [k]: v }
    if (k === 'gameType' && v === 'CS') { next.mode = 'Clash Squad'; next.maxSlots = 12; next.minPlayers = 4 }
    if (k === 'gameType' && v === 'BR') { next.mode = 'Solo'; next.maxSlots = 50; next.minPlayers = 10 }
    // ═══ PHASE 1.5: Auto-adjust min players for duo/squad ═══
    if (k === 'mode') {
      next.maxSlots = maxSlotsForMode(v)
      if (v === 'Duo') next.minPlayers = Math.min(next.minPlayers || 10, 10)
      if (v === 'Squad') next.minPlayers = Math.min(next.minPlayers || 10, 10)
      if (v === 'Solo') next.minPlayers = Math.min(next.minPlayers || 10, 20)
    }
    // ═══ END PHASE 1.5 ═══
    setForm(next)
  }
  const toggle = (k) => setForm(p => ({ ...p, [k]: !p[k] }))

  const eco = calculateMatchEconomics(Number(form.entryFee) || 0, Number(form.maxSlots) || 0, form.gameType, form.include4th, form.include5th)
  const availableModes = FF_GAME_TYPES.find(g => g.value === form.gameType)?.modes || []

  // ═══ PHASE 1.3: Escrow calculations for live preview ═══
  const minEscrow = (Number(form.entryFee) || 0) * (Number(form.minPlayers) || 10)
  const maxEscrow = (Number(form.entryFee) || 0) * (Number(form.maxSlots) || 50)
  const estMaxKillPayout = (Number(form.perKill) || 0) * (Number(form.maxSlots) || 50) * (isTeamMode(form.mode) ? 4 : 1)
  const totalPrizeOutflow = eco.prizePool + estMaxKillPayout
  const escrowSafe = maxEscrow >= totalPrizeOutflow
  // ═══ END PHASE 1.3 ═══

  const handleSubmit = (e) => {
    e.preventDefault()
    if (!form.title.trim()) return showToast(dispatch, 'Enter match title!', 'error')
    if (!form.entryFee || form.entryFee <= 0) return showToast(dispatch, 'Enter valid entry fee!', 'error')
    // ═══ PHASE 1.3: Validate escrow math before creating ═══
    if (Number(form.entryFee) > 0 && totalPrizeOutflow > maxEscrow) {
      return showToast(dispatch, `Prize outflow (${formatTK(totalPrizeOutflow)}) exceeds max escrow (${formatTK(maxEscrow)}). Reduce prizes or increase slots.`, 'error')
    }
    // ═══ PHASE 1.5: Validate minPlayers <= maxSlots ═══
    if (Number(form.minPlayers) > Number(form.maxSlots)) {
      return showToast(dispatch, 'Min players cannot exceed total slots!', 'error')
    }
    if (Number(form.minPlayers) < 2) {
      return showToast(dispatch, 'Min players must be at least 2!', 'error')
    }
    // ═══ END PHASE 1.3 + 1.5 ═══
    dispatch({ type: 'CREATE_MATCH', payload: form })
    adminAction(dispatch, 'Created match', form.title, 'Match created successfully!', 'success')
    setForm({ title: '', gameType: 'BR', mode: 'Solo', map: 'Bermuda', entryFee: 30, maxSlots: 50, perKill: 10, include4th: true, include5th: true, startTime: '', minPlayers: 10 })
  }

  return (
    <div style={S.panel}>
      <h1 style={S.title}><i className="fa-solid fa-circle-plus" style={{ marginRight: 10, color: '#a78bfa' }}></i>Create Match</h1>
      <div style={{ display: 'grid', gridTemplateColumns: mobile ? '1fr' : '1fr 1fr', gap: 20 }}>
        <form onSubmit={handleSubmit} style={{ ...S.card, padding: mobile ? 16 : 20 }}>
          <div style={{ marginBottom: 16 }}>
            <label style={S.label}>Match Title *</label>
            <input style={S.input} placeholder="e.g. Bermuda Rush Solo" value={form.title} onChange={e => update('title', e.target.value)} />
          </div>
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12, marginBottom: 16 }}>
            <div>
              <label style={S.label}>Game Type</label>
              <select style={S.select} value={form.gameType} onChange={e => update('gameType', e.target.value)}>
                {FF_GAME_TYPES.map(g => <option key={g.value} value={g.value}>{g.label}</option>)}
              </select>
            </div>
            <div>
              <label style={S.label}>Mode</label>
              <select style={S.select} value={form.mode} onChange={e => update('mode', e.target.value)}>
                {availableModes.map(m => <option key={m} value={m}>{m}</option>)}
              </select>
            </div>
          </div>
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12, marginBottom: 16 }}>
            <div>
              <label style={S.label}>Map</label>
              <select style={S.select} value={form.map} onChange={e => update('map', e.target.value)}>
                {FF_MAPS.map(m => <option key={m} value={m}>{m}</option>)}
              </select>
            </div>
            <div>
              <label style={S.label}>Start Time</label>
              <input style={{ ...S.input, colorScheme: 'dark' }} type="datetime-local" value={form.startTime} onChange={e => update('startTime', e.target.value)} />
            </div>
          </div>
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12, marginBottom: 16 }}>
            <div>
              <label style={S.label}>Entry Fee (TK) *</label>
              <input style={S.input} type="number" min="0" value={form.entryFee} onChange={e => update('entryFee', e.target.value)} />
            </div>
            <div>
              <label style={S.label}>Total Slots *</label>
              <input style={S.input} type="number" min="2" value={form.maxSlots} onChange={e => update('maxSlots', e.target.value)} />
            </div>
          </div>
          {/* ═══ PHASE 1.5: Min Players input field ═══ */}
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12, marginBottom: 16 }}>
            <div>
              <label style={S.label}>Per Kill Reward (TK)</label>
              <select style={S.select} value={form.perKill} onChange={e => update('perKill', Number(e.target.value))}>
                {KILL_REWARDS.map(k => <option key={k} value={k}>{k} TK</option>)}
              </select>
            </div>
            <div>
              <label style={S.label}>Min Players to Start</label>
              <input style={S.input} type="number" min="2" max={form.maxSlots} value={form.minPlayers} onChange={e => update('minPlayers', Number(e.target.value))} />
              <div style={{ fontSize: 9, color: 'var(--text-muted, #555)', marginTop: 3 }}>Room won't unlock below this count</div>
            </div>
          </div>
          {/* ═══ END PHASE 1.5 ═══ */}
          <div style={{ display: 'flex', alignItems: 'flex-end', marginBottom: 16 }}>
            <span style={{ fontSize: 11, color: 'var(--text-muted, #666)' }}>Auto slots for {form.mode}: {maxSlotsForMode(form.mode)}</span>
          </div>
          {form.gameType === 'BR' && (
            <div style={{ display: 'flex', gap: 24, marginBottom: 20 }}>
              {['include4th', 'include5th'].map(key => (
                <div key={key} onClick={() => toggle(key)} style={{ display: 'flex', alignItems: 'center', gap: 8, cursor: 'pointer' }}>
                  <div style={{ width: 36, height: 20, borderRadius: 10, background: form[key] ? 'linear-gradient(135deg, #6c8cff, #a78bfa)' : 'rgba(255,255,255,0.1)', position: 'relative', transition: 'all 0.3s ease' }}>
                    <div style={{ width: 16, height: 16, borderRadius: '50%', background: '#fff', position: 'absolute', top: 2, left: form[key] ? 18 : 2, transition: 'left 0.3s ease', boxShadow: '0 2px 4px rgba(0,0,0,0.3)' }}></div>
                  </div>
                  <span style={{ fontSize: 12, color: form[key] ? '#fff' : 'var(--text-muted, #777)' }}>{key === 'include4th' ? '4th Prize (10%)' : '5th Prize (5%)'}</span>
                </div>
              ))}
            </div>
          )}
          <button type="submit" style={S.btnPrimary}><i className="fa-solid fa-plus"></i> Create Match</button>
        </form>

        <div style={{ ...S.card }}>
          <div style={{ ...S.cardHeader, background: 'rgba(0,240,255,0.04)' }}>
            <div style={S.cardHeaderIcon('#00f0ff')}><i className="fa-solid fa-eye" style={{ fontSize: 14, color: '#00f0ff' }}></i></div>
            <h3 style={S.cardHeaderTitle}>Live Calculation</h3>
          </div>
          <div style={{ padding: '18px' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', padding: '10px 0', borderBottom: '1px solid rgba(255,255,255,0.04)' }}>
              <span style={{ fontSize: 12, color: 'var(--text-muted, #777)' }}>Total Collection</span>
              <span style={{ fontFamily: 'var(--font-display)', fontSize: 14, fontWeight: 700, color: '#fff' }}>{formatTK(eco.totalCollection)}</span>
            </div>
            <div style={{ display: 'flex', justifyContent: 'space-between', padding: '10px 0', borderBottom: '1px solid rgba(255,255,255,0.04)' }}>
              <span style={{ fontSize: 12, color: 'var(--text-muted, #777)' }}>Admin Profit (20%)</span>
              <span style={{ fontFamily: 'var(--font-display)', fontSize: 14, fontWeight: 700, color: '#22c55e' }}>{formatTK(eco.adminProfit)}</span>
            </div>
            <div style={{ display: 'flex', justifyContent: 'space-between', padding: '12px 0', borderBottom: '1px solid rgba(255,255,255,0.04)' }}>
              <span style={{ fontSize: 13, color: 'var(--text-muted, #777)', fontFamily: 'var(--font-heading)', fontWeight: 600 }}>Prize Pool</span>
              <span style={{ fontFamily: 'var(--font-display)', fontSize: 20, fontWeight: 800, color: '#fbbf24', textShadow: '0 0 16px rgba(251,191,36,0.2)' }}>{formatTK(eco.prizePool)}</span>
            </div>

            {/* ═══ PHASE 1.3: Escrow breakdown in live preview ═══ */}
            <div style={{ marginTop: 14, padding: '12px 14px', borderRadius: 10, background: escrowSafe ? 'rgba(34,197,94,0.04)' : 'rgba(239,68,68,0.06)', border: `1px solid ${escrowSafe ? 'rgba(34,197,94,0.1)' : 'rgba(239,68,68,0.15)'}` }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: 6, marginBottom: 8 }}>
                <i className={`fa-solid ${escrowSafe ? 'fa-shield-check' : 'fa-triangle-exclamation'}`} style={{ fontSize: 12, color: escrowSafe ? '#22c55e' : '#ef4444' }}></i>
                <span style={{ fontFamily: 'var(--font-heading)', fontSize: 11, fontWeight: 700, color: escrowSafe ? '#22c55e' : '#ef4444', letterSpacing: 0.5, textTransform: 'uppercase' }}>Escrow Analysis</span>
              </div>
              <div style={{ display: 'flex', justifyContent: 'space-between', padding: '4px 0' }}>
                <span style={{ fontSize: 11, color: 'var(--text-muted, #777)' }}>Min Threshold Escrow ({form.minPlayers} players)</span>
                <span style={{ fontFamily: 'var(--font-display)', fontSize: 12, fontWeight: 700, color: '#fbbf24' }}>{formatTK(minEscrow)}</span>
              </div>
              <div style={{ display: 'flex', justifyContent: 'space-between', padding: '4px 0' }}>
                <span style={{ fontSize: 11, color: 'var(--text-muted, #777)' }}>Max Escrow (full {form.maxSlots} slots)</span>
                <span style={{ fontFamily: 'var(--font-display)', fontSize: 12, fontWeight: 700, color: '#00f0ff' }}>{formatTK(maxEscrow)}</span>
              </div>
              <div style={{ display: 'flex', justifyContent: 'space-between', padding: '4px 0' }}>
                <span style={{ fontSize: 11, color: 'var(--text-muted, #777)' }}>Est. Max Kill Payout</span>
                <span style={{ fontFamily: 'var(--font-display)', fontSize: 12, fontWeight: 700, color: '#a78bfa' }}>{formatTK(estMaxKillPayout)}</span>
              </div>
              <div style={{ display: 'flex', justifyContent: 'space-between', padding: '6px 0 0', borderTop: '1px solid rgba(255,255,255,0.06)', marginTop: 6 }}>
                <span style={{ fontSize: 11, color: 'var(--text-muted, #777)', fontWeight: 600 }}>Total Outflow (prizes + kills)</span>
                <span style={{ fontFamily: 'var(--font-display)', fontSize: 13, fontWeight: 800, color: escrowSafe ? '#22c55e' : '#ef4444' }}>{formatTK(totalPrizeOutflow)}</span>
              </div>
              {!escrowSafe && (
                <div style={{ fontSize: 10, color: '#ef4444', marginTop: 6, lineHeight: 1.4 }}>
                  ⚠ Shortfall of {formatTK(totalPrizeOutflow - maxEscrow)} — increase slots or reduce prizes
                </div>
              )}
            </div>
            {/* ═══ END PHASE 1.3 ═══ */}

            <div style={{ marginTop: 14 }}>
              <span style={{ fontSize: 10, color: 'var(--text-muted, #666)', fontFamily: 'var(--font-heading)', letterSpacing: 1, textTransform: 'uppercase' }}>Prize Breakdown</span>
              <div style={{ marginTop: 8, display: 'flex', flexDirection: 'column', gap: 6 }}>
                {eco.prizes.length === 0 ? (
                  <p style={{ fontSize: 12, color: 'var(--text-muted, #555)', padding: '10px 0' }}>Set entry fee & slots to see preview</p>
                ) : (
                  eco.prizes.map((p, i) => {
                    const medals = ['🥇', '🥈', '🥉']
                    const colors = ['#fbbf24', '#c0c0c0', '#cd7f32', '#ccc', '#999']
                    return (
                      <div key={i} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '8px 12px', borderRadius: 8, background: i === 0 ? 'rgba(251,191,36,0.06)' : 'rgba(255,255,255,0.02)', border: `1px solid ${i === 0 ? 'rgba(251,191,36,0.12)' : 'rgba(255,255,255,0.04)'}` }}>
                        <span style={{ fontSize: 13, fontWeight: 600, color: colors[i], fontFamily: 'var(--font-heading)' }}>{medals[i] || `#${i + 1}`} {p.rank}</span>
                        <span style={{ fontFamily: 'var(--font-display)', fontSize: 14, fontWeight: 800, color: colors[i] }}>{formatTK(p.amount)}</span>
                      </div>
                    )
                  })
                )}
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}

// ═══════════════════════════════════════
//  3. ROOM MANAGEMENT
// ═══════════════════════════════════════
function AdminRooms() {
  const { state, dispatch } = useApp()
  const { matches } = state
  const mobile = useIsMobile()
  const [roomData, setRoomData] = useState({})
  // ═══ PHASE 1.4: Cancel match confirmation state ═══
  const [confirmCancelId, setConfirmCancelId] = useState(null)
  // ═══ END PHASE 1.4 ═══

  useEffect(() => {
    const initial = {}
    matches.forEach(m => { initial[m.id] = { roomId: m.roomId || '', roomPassword: m.roomPassword || '' } })
    setRoomData(initial)
  }, [matches])

  const updateRoomField = (id, field, value) => {
    setRoomData(prev => ({ ...prev, [id]: { ...prev[id], [field]: value } }))
  }

  const saveRoom = (id, matchTitle) => {
    const data = roomData[id]
    if (!data) return
    dispatch({ type: 'SET_ROOM_CREDENTIALS', payload: { matchId: id, roomId: data.roomId, roomPassword: data.roomPassword } })
    adminAction(dispatch, 'Set room credentials', matchTitle, 'Room credentials saved!', 'success')
  }

  // ═══ PHASE 1.4: Cancel match + full refund handler ═══
  const handleCancelMatch = (matchId) => {
    const match = matches.find(m => m.id === matchId)
    if (!match) return
    const joinCount = match.joinedCount || 0
    const refundTotal = joinCount * (match.entryFee || 0)

    dispatch({ type: 'CANCEL_MATCH', payload: matchId })
    adminAction(dispatch, 'Cancelled match', match.title, `Match cancelled. ${joinCount} refunds (${formatTK(refundTotal)}) processed.`, 'error')
    setConfirmCancelId(null)
  }
  // ═══ END PHASE 1.4 ═══

  // ═══ PHASE 1.5: Threshold check helper ═══
  const getThresholdInfo = (m) => {
    const joined = m.joinedCount || 0
    const min = m.minPlayers || 10
    const meets = joined >= min
    return { joined, min, meets, deficit: Math.max(0, min - joined) }
  }
  // ═══ END PHASE 1.5 ═══

  // ═══ PHASE 1.3: Escrow info helper ═══
  const getMatchEscrow = (m) => {
    const collected = (m.joinedCount || 0) * (m.entryFee || 0)
    const refunded = m.escrow?.refunded || 0
    const distributed = m.escrow?.distributed || 0
    return { collected, refunded, distributed, held: Math.max(0, collected - refunded - distributed) }
  }
  // ═══ END PHASE 1.3 ═══

  const activeMatches = matches.filter(m => m.status !== 'completed' && m.status !== 'cancelled')

  if (activeMatches.length === 0) {
    return (
      <div style={S.panel}>
        <h1 style={S.title}><i className="fa-solid fa-key" style={{ marginRight: 10, color: '#fbbf24' }}></i>Room Management</h1>
        <div style={{ textAlign: 'center', padding: 40, color: 'var(--text-muted, #555)' }}>No active matches to manage rooms for</div>
      </div>
    )
  }

  if (mobile) {
    return (
      <div style={S.panel}>
        <h1 style={S.title}><i className="fa-solid fa-key" style={{ marginRight: 10, color: '#fbbf24' }}></i>Room Management</h1>
        <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
          {activeMatches.map(m => {
            const countdown = getRoomUnlockCountdown(m)
            const isUnlocked = countdown === 'UNLOCKED'
            const rd = roomData[m.id] || {}
            // ═══ PHASE 1.5: Threshold info ═══
            const threshold = getThresholdInfo(m)
            // ═══ PHASE 1.3: Escrow info ═══
            const escrow = getMatchEscrow(m)
            // ═══ PHASE 1.4: Cancel confirm state ═══
            const isConfirming = confirmCancelId === m.id
            // ═══ END PHASE 1.3 + 1.4 + 1.5 ═══
            return (
              <div key={m.id} style={{
                ...S.mCard,
                // ═══ PHASE 1.5: Red border if below threshold ═══
                borderLeft: !threshold.meets ? '3px solid #f87171' : '3px solid rgba(255,255,255,0.06)',
                // ═══ END PHASE 1.5 ═══
              }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 12 }}>
                  <div style={{ flex: 1, minWidth: 0 }}>
                    <div style={{ fontFamily: 'var(--font-heading)', fontWeight: 600, color: '#fff', fontSize: 13, wordBreak: 'break-word' }}>{m.title}</div>
                    <div style={{ fontSize: 10, color: 'var(--text-muted, #666)', marginTop: 2 }}>{m.mode} • {m.map}</div>
                  </div>
                  <span style={{ marginLeft: 8, padding: '3px 10px', borderRadius: 6, fontSize: 9, fontWeight: 700, fontFamily: 'var(--font-heading)', flexShrink: 0, background: m.status === 'live' ? 'rgba(239,68,68,0.12)' : 'rgba(108,140,255,0.12)', color: m.status === 'live' ? '#ef4444' : '#6c8cff' }}>
                    {m.status === 'live' && <span style={{ display: 'inline-block', width: 5, height: 5, borderRadius: '50%', background: '#ef4444', marginRight: 4, verticalAlign: 'middle' }}></span>}
                    {m.status.toUpperCase()}
                  </span>
                </div>

                {/* ═══ PHASE 1.5: Player threshold indicator (mobile) ═══ */}
                <div style={{ display: 'flex', gap: 8, marginBottom: 10 }}>
                  <div style={{ flex: 1, padding: '8px 10px', borderRadius: 8, background: threshold.meets ? 'rgba(34,197,94,0.06)' : 'rgba(239,68,68,0.08)', border: `1px solid ${threshold.meets ? 'rgba(34,197,94,0.12)' : 'rgba(239,68,68,0.15)'}` }}>
                    <div style={{ fontSize: 9, color: 'var(--text-muted, #555)', fontWeight: 600, textTransform: 'uppercase', letterSpacing: 0.5 }}>Players</div>
                    <div style={{ fontFamily: 'var(--font-display)', fontSize: 16, fontWeight: 800, color: threshold.meets ? '#22c55e' : '#f87171', marginTop: 2 }}>
                      {threshold.joined}<span style={{ fontSize: 10, color: 'var(--text-muted, #555)', fontWeight: 400 }}>/ {threshold.min} min</span>
                    </div>
                  </div>
                  {/* ═══ PHASE 1.3: Escrow display (mobile) ═══ */}
                  <div style={{ flex: 1, padding: '8px 10px', borderRadius: 8, background: 'rgba(0,240,255,0.04)', border: '1px solid rgba(0,240,255,0.1)' }}>
                    <div style={{ fontSize: 9, color: 'var(--text-muted, #555)', fontWeight: 600, textTransform: 'uppercase', letterSpacing: 0.5 }}>Escrow</div>
                    <div style={{ fontFamily: 'var(--font-display)', fontSize: 16, fontWeight: 800, color: '#00f0ff', marginTop: 2 }}>
                      {formatTK(escrow.collected)}
                    </div>
                  </div>
                  {/* ═══ END PHASE 1.3 + 1.5 ═══ */}
                </div>
                {/* ═══ PHASE 1.5: Threshold warning (mobile) ═══ */}
                {!threshold.meets && m.status !== 'completed' && (
                  <div style={{ padding: '8px 10px', borderRadius: 8, marginBottom: 10, background: 'rgba(239,68,68,0.06)', border: '1px solid rgba(239,68,68,0.1)', display: 'flex', alignItems: 'center', gap: 6 }}>
                    <i className="fa-solid fa-triangle-exclamation" style={{ fontSize: 11, color: '#f87171', flexShrink: 0 }}></i>
                    <span style={{ fontSize: 11, color: '#f87171', fontWeight: 600 }}>Need {threshold.deficit} more player{threshold.deficit > 1 ? 's' : ''} to unlock room</span>
                  </div>
                )}
                {/* ═══ END PHASE 1.5 ═══ */}

                <div style={{ marginBottom: 10 }}>
                  <label style={S.label}>Room ID</label>
                  <input style={{ ...S.input, padding: '8px 10px', fontSize: 12, fontFamily: 'var(--font-display)', letterSpacing: 1 }} value={rd.roomId || ''} placeholder="Type Room ID" onChange={e => updateRoomField(m.id, 'roomId', e.target.value)} />
                </div>
                <div style={{ marginBottom: 12 }}>
                  <label style={S.label}>Password</label>
                  <input style={{ ...S.input, padding: '8px 10px', fontSize: 12, fontFamily: 'var(--font-display)', letterSpacing: 1 }} value={rd.roomPassword || ''} placeholder="Type Password" onChange={e => updateRoomField(m.id, 'roomPassword', e.target.value)} />
                </div>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                  <div>
                    <div style={{ fontFamily: 'var(--font-display)', fontSize: 10, fontWeight: 700, color: isUnlocked && !threshold.meets ? '#f87171' : isUnlocked ? '#22c55e' : '#fbbf24' }}>
                      {/* ═══ PHASE 1.5: Show BLOCKED if below threshold even when time-unlocked ═══ */}
                      {isUnlocked && !threshold.meets ? 'BLOCKED' : isUnlocked ? 'UNLOCKED' : (countdown || '—').replace('Unlocks in ', '')}
                    </div>
                    <div style={{ fontSize: 9, color: 'var(--text-muted, #555)', marginTop: 1 }}>
                      {isUnlocked && !threshold.meets ? `Need ${threshold.deficit} more players` : '10 min before start'}
                    </div>
                    {/* ═══ END PHASE 1.5 ═══ */}
                  </div>
                  {/* ═══ PHASE 1.4: Cancel / Save buttons (mobile) ═══ */}
                  {isConfirming ? (
                    <div style={{ display: 'flex', gap: 6 }}>
                      <button style={{ ...S.btnGhost, fontSize: 10, padding: '6px 10px' }} onClick={() => setConfirmCancelId(null)}>No</button>
                      <button style={{ ...S.btnDanger, fontSize: 10, padding: '6px 10px' }} onClick={() => handleCancelMatch(m.id)}>
                        <i className="fa-solid fa-check"></i> Yes, Cancel
                      </button>
                    </div>
                  ) : (
                    <div style={{ display: 'flex', gap: 6 }}>
                      {(m.status === 'upcoming' || m.status === 'live') && (
                        <button style={{ ...S.btnDanger, fontSize: 10, padding: '6px 10px' }} onClick={() => setConfirmCancelId(m.id)}>
                          <i className="fa-solid fa-xmark"></i> Cancel
                        </button>
                      )}
                      <button style={S.btnSuccess} onClick={() => saveRoom(m.id, m.title)}><i className="fa-solid fa-save"></i> Save</button>
                    </div>
                  )}
                  {/* ═══ END PHASE 1.4 ═══ */}
                </div>
              </div>
            )
          })}
        </div>
      </div>
    )
  }

  return (
    <div style={S.panel}>
      <h1 style={S.title}><i className="fa-solid fa-key" style={{ marginRight: 10, color: '#fbbf24' }}></i>Room Management</h1>
      <div style={{ ...S.card }}>
        <div style={{ ...S.cardHeader, background: 'rgba(251,191,36,0.04)' }}>
          <div style={S.cardHeaderIcon('#fbbf24')}><i className="fa-solid fa-key" style={{ fontSize: 14, color: '#fbbf24' }}></i></div>
          <h3 style={S.cardHeaderTitle}>Room Credentials</h3>
          <span style={{ marginLeft: 'auto', fontSize: 10, color: 'var(--text-muted, #555)' }}>Type manually — NO copy button</span>
        </div>
        <table style={S.table}>
          <thead>
            <tr>
              <th style={S.th}>Match</th><th style={S.th}>Start Time</th>
              {/* ═══ PHASE 1.5: Players column ═══ */}
              <th style={S.th}>Players</th>
              {/* ═══ PHASE 1.3: Escrow column ═══ */}
              <th style={S.th}>Escrow</th>
              {/* ═══ END PHASE 1.3 + 1.5 ═══ */}
              <th style={S.th}>Room ID</th><th style={S.th}>Password</th><th style={S.th}>Visibility</th><th style={S.th}>Status</th><th style={S.th}></th>
            </tr>
          </thead>
          <tbody>
            {activeMatches.map(m => {
              const countdown = getRoomUnlockCountdown(m)
              const isUnlocked = countdown === 'UNLOCKED'
              const rd = roomData[m.id] || {}
              // ═══ PHASE 1.5 + 1.3 + 1.4 ═══
              const threshold = getThresholdInfo(m)
              const escrow = getMatchEscrow(m)
              const isConfirming = confirmCancelId === m.id
              // ═══ END PHASE 1.5 + 1.3 + 1.4 ═══
              return (
                <tr key={m.id}>
                  <td style={S.td}>
                    <div style={{ fontFamily: 'var(--font-heading)', fontWeight: 600, color: '#fff', fontSize: 12 }}>{m.title}</div>
                    <div style={{ fontSize: 10, color: 'var(--text-muted, #666)' }}>{m.mode} • {m.map}</div>
                  </td>
                  <td style={{ ...S.td, fontSize: 11, color: 'var(--text-muted, #777)' }}>
                    {m.startTime ? new Date(m.startTime.replace(' ', 'T')).toLocaleString('en-GB', { day: '2-digit', month: 'short', hour: '2-digit', minute: '2-digit' }) : '—'}
                  </td>
                  {/* ═══ PHASE 1.5: Players + threshold column (desktop) ═══ */}
                  <td style={S.td}>
                    <div style={{ fontFamily: 'var(--font-display)', fontSize: 13, fontWeight: 700, color: threshold.meets ? '#22c55e' : '#f87171' }}>
                      {threshold.joined}<span style={{ fontSize: 10, color: 'var(--text-muted, #555)', fontWeight: 400 }}>/ {threshold.min}</span>
                    </div>
                    {!threshold.meets && (
                      <div style={{ fontSize: 9, color: '#f87171', marginTop: 1 }}>⚠ Need {threshold.deficit} more</div>
                    )}
                  </td>
                  {/* ═══ PHASE 1.3: Escrow column (desktop) ═══ */}
                  <td style={S.td}>
                    <div style={{ fontFamily: 'var(--font-display)', fontSize: 12, fontWeight: 700, color: '#00f0ff' }}>{formatTK(escrow.collected)}</div>
                    {escrow.refunded > 0 && (
                      <div style={{ fontSize: 9, color: '#f87171', marginTop: 1 }}>−{formatTK(escrow.refunded)} ref.</div>
                    )}
                  </td>
                  {/* ═══ END PHASE 1.3 + 1.5 ═══ */}
                  <td style={S.td}>
                    <input style={{ ...S.input, padding: '7px 10px', fontSize: 12, fontFamily: 'var(--font-display)', letterSpacing: 1 }} value={rd.roomId || ''} placeholder="Type Room ID" onChange={e => updateRoomField(m.id, 'roomId', e.target.value)} />
                  </td>
                  <td style={S.td}>
                    <input style={{ ...S.input, padding: '7px 10px', fontSize: 12, fontFamily: 'var(--font-display)', letterSpacing: 1 }} value={rd.roomPassword || ''} placeholder="Type Password" onChange={e => updateRoomField(m.id, 'roomPassword', e.target.value)} />
                  </td>
                  <td style={S.td}>
                    <div style={{ fontFamily: 'var(--font-display)', fontSize: 10, fontWeight: 700, color: isUnlocked && !threshold.meets ? '#f87171' : isUnlocked ? '#22c55e' : '#fbbf24' }}>
                      {/* ═══ PHASE 1.5: BLOCKED state ═══ */}
                      {isUnlocked && !threshold.meets ? 'BLOCKED' : isUnlocked ? 'UNLOCKED' : (countdown || '—').replace('Unlocks in ', '')}
                    </div>
                    <div style={{ fontSize: 9, color: 'var(--text-muted, #555)', marginTop: 2 }}>
                      {isUnlocked && !threshold.meets ? `Need ${threshold.deficit} more players` : '10 min before start'}
                    </div>
                    {/* ═══ END PHASE 1.5 ═══ */}
                  </td>
                  <td style={S.td}>
                    <span style={{ display: 'inline-flex', alignItems: 'center', gap: 4, padding: '3px 10px', borderRadius: 6, fontSize: 10, fontWeight: 700, fontFamily: 'var(--font-heading)', background: m.status === 'live' ? 'rgba(239,68,68,0.12)' : 'rgba(108,140,255,0.12)', color: m.status === 'live' ? '#ef4444' : '#6c8cff' }}>
                      {m.status === 'live' && <span style={{ width: 5, height: 5, borderRadius: '50%', background: '#ef4444', animation: 'pulse 1s infinite' }}></span>}
                      {m.status.toUpperCase()}
                    </span>
                  </td>
                  <td style={S.td}>
                    {/* ═══ PHASE 1.4: Cancel + Save buttons (desktop) ═══ */}
                    <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap' }}>
                      {isConfirming ? (
                        <>
                          <button style={{ ...S.btnGhost, fontSize: 10 }} onClick={() => setConfirmCancelId(null)}>No</button>
                          <button style={{ ...S.btnDanger, fontSize: 10 }} onClick={() => handleCancelMatch(m.id)}>Yes, Cancel</button>
                        </>
                      ) : (
                        <>
                          {(m.status === 'upcoming' || m.status === 'live') && (
                            <button style={{ ...S.btnDanger, fontSize: 10 }} onClick={() => setConfirmCancelId(m.id)}>
                              <i className="fa-solid fa-xmark"></i> Cancel
                            </button>
                          )}
                          <button style={S.btnSuccess} onClick={() => saveRoom(m.id, m.title)}><i className="fa-solid fa-save"></i> Save</button>
                        </>
                      )}
                    </div>
                    {/* ═══ END PHASE 1.4 ═══ */}
                  </td>
                </tr>
              )
            })}
          </tbody>
        </table>
      </div>
    </div>
  )
}

// ═══════════════════════════════════════
//  4. RESULT PANEL — ★ UPGRADED: Team Name + Points + EDIT RESULT
// ═══════════════════════════════════════
function AdminResults() {
  const { state, dispatch } = useApp()
  const { matches } = state
  const mobile = useIsMobile()
  const activeMatches = matches.filter(m => m.status === 'live' || m.status === 'upcoming')
  const completedWithResult = matches.filter(m => m.status === 'completed' && m.result)

  const [selectedId, setSelectedId] = useState('')
  const [method, setMethod] = useState('manual')
  const [players, setPlayers] = useState([{ ign: '', kills: 0, position: 1 }])
  // ═══ PHASE 4.2: Edit result state ═══
  const [editingResultId, setEditingResultId] = useState(null)
  // ═══ END PHASE 4.2 ═══

  const selected = matches.find(m => m.id === selectedId)
  const teamMode = selected ? isTeamMode(selected.mode) : false

  // ═══ PHASE 1.6: Team Name → User ID mapping from joined list ═══
  const teamMapping = useMemo(() => {
    if (!selected || !teamMode || !selected.joined?.length) return null
    const map = {}
    selected.joined.forEach(j => {
      const team = j.teamName || 'No Team Name'
      if (!map[team]) map[team] = []
      map[team].push(j)
    })
    return Object.keys(map).length > 0 ? map : null
  }, [selected, teamMode])

  // Check if an entered team name matches a joined team (for highlighting)
  const findTeamMembers = (teamName) => {
    if (!teamMapping || !teamName) return null
    return teamMapping[teamName] || null
  }
  // ═══ END PHASE 1.6 ═══

  const eco = selected ? calculateMatchEconomics(selected.entryFee, selected.maxSlots, selected.gameType, selected.include4th, selected.include5th) : null
  const resultsWithPrizes = selected ? calculateAllResultPrizes(players, selected.perKill || 0, eco.prizes, selected.gameType) : []

  const emptyRow = (pos = 1) => teamMode
    ? { ign: '', teamName: '', points: 0, kills: 0, position: pos }
    : { ign: '', kills: 0, position: pos }

  const addPlayer = () => setPlayers(p => [...p, emptyRow(p.length + 1)])
  const removePlayer = (i) => { if (players.length > 1) setPlayers(p => p.filter((_, idx) => idx !== i)) }
  const updatePlayer = (i, k, v) => setPlayers(p => p.map((r, idx) => idx === i ? { ...r, [k]: v } : r))

  // ═══ PHASE 4.2: Edit result handler — loads existing data into form ═══
  const handleEditResult = (matchId) => {
    const match = matches.find(m => m.id === matchId)
    if (!match || !match.result) return

    setEditingResultId(matchId)
    setSelectedId(matchId)
    setMethod(match.result.method || 'manual')

    if (match.result.method === 'manual' && match.result.players?.length > 0) {
      setPlayers(match.result.players.map((p, i) => ({
        ign: p.ign || '',
        teamName: p.teamName || '',
        points: p.points || 0,
        kills: p.kills || 0,
        position: p.position || (i + 1)
      })))
    } else {
      setPlayers([emptyRow()])
    }

    // Scroll to top of form
    window.scrollTo({ top: 0, behavior: 'smooth' })
  }

  const cancelEdit = () => {
    setEditingResultId(null)
    setSelectedId('')
    setMethod('manual')
    setPlayers([emptyRow()])
  }
  // ═══ END PHASE 4.2 ═══

  const handleSubmit = () => {
    if (!selectedId) return showToast(dispatch, 'Select a match!', 'error')
    if (method === 'manual') {
      const valid = players.filter(p => p.ign.trim())
      if (valid.length === 0) return showToast(dispatch, `Add at least one ${teamMode ? 'team' : 'player'}!`, 'error')
      // ═══ PHASE 1.6: Attach matched user IDs to result players ═══
      const enriched = valid.map(p => {
        const members = findTeamMembers(p.ign.trim())
        return {
          ...p,
          matchedUserIds: members ? members.map(m => m.userId).filter(Boolean) : [],
        }
      })
      dispatch({ type: 'SUBMIT_RESULT', payload: { matchId: selectedId, method: 'manual', players: enriched, isEdit: !!editingResultId } })
      // ═══ END PHASE 1.6 ═══
    } else {
      dispatch({ type: 'SUBMIT_RESULT', payload: { matchId: selectedId, method: 'screenshot', players: [], screenshotUrl: null, isEdit: !!editingResultId } })
    }
    
    // ═══ PHASE 4.2: Log edit vs new result ═══
    const actionVerb = editingResultId ? 'Edited result' : 'Submitted result'
    adminAction(dispatch, actionVerb, selected?.title, `${actionVerb} for ${selected?.title}!`, 'success')
    
    // Reset edit state after submit
    setEditingResultId(null)
    // ═══ END PHASE 4.2 ═══
    setPlayers([emptyRow()])
  }

  const onMatchChange = (e) => {
    const newId = e.target.value
    setSelectedId(newId)
    const newMatch = matches.find(m => m.id === newId)
    const isTeam = newMatch ? isTeamMode(newMatch.mode) : false
    setPlayers(isTeam
      ? [{ ign: '', teamName: '', points: 0, kills: 0, position: 1 }]
      : [{ ign: '', kills: 0, position: 1 }]
    )
    // Clear edit state when manually changing match
    setEditingResultId(null)
  }
  const onMethodChange = (id) => {
    setMethod(id)
    const isTeam = selected ? isTeamMode(selected.mode) : false
    setPlayers(isTeam
      ? [{ ign: '', teamName: '', points: 0, kills: 0, position: 1 }]
      : [{ ign: '', kills: 0, position: 1 }]
    )
  }

  return (
    <div style={S.panel}>
      <h1 style={S.title}><i className="fa-solid fa-clipboard-check" style={{ marginRight: 10, color: '#22c55e' }}></i>Match Results</h1>

      {/* ═══ PHASE 4.2: Edit mode banner ═══ */}
      {editingResultId && (
        <div style={{
          padding: '14px 18px', borderRadius: 12, marginBottom: 20,
          background: 'rgba(251,191,36,0.08)', border: '1px solid rgba(251,191,36,0.2)',
          display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 12,
        }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
            <i className="fa-solid fa-pen-to-square" style={{ color: '#fbbf24', fontSize: 18, flexShrink: 0 }}></i>
            <div>
              <div style={{ fontFamily: 'var(--font-heading)', fontSize: 14, fontWeight: 700, color: '#fbbf24' }}>Editing Results</div>
              <div style={{ fontSize: 12, color: 'var(--text-muted, #888)', marginTop: 2 }}>
                Modifying results for: {selected?.title || 'Loading...'}
              </div>
            </div>
          </div>
          <button style={{ ...S.btnGhost, padding: '8px 14px', fontSize: 12, borderColor: 'rgba(251,191,36,0.3)', color: '#fbbf24' }} onClick={cancelEdit}>
            <i className="fa-solid fa-xmark"></i> Cancel
          </button>
        </div>
      )}
      {/* ═══ END PHASE 4.2 ═══ */}

      <div style={{ display: 'flex', gap: 10, marginBottom: 20 }}>
        {RESULT_METHODS.map(rm => (
          <button key={rm.id} onClick={() => onMethodChange(rm.id)} style={{
            flex: 1, padding: mobile ? '10px 12px' : '14px 16px', borderRadius: 14,
            border: `1px solid ${method === rm.id ? 'rgba(0,240,255,0.3)' : 'rgba(255,255,255,0.06)'}`,
            background: method === rm.id ? 'rgba(0,240,255,0.08)' : 'rgba(255,255,255,0.02)',
            cursor: 'pointer', transition: 'all 0.3s ease', textAlign: 'center',
          }}>
            <i className={rm.icon} style={{ fontSize: mobile ? 16 : 20, color: method === rm.id ? '#00f0ff' : 'var(--text-muted, #555)', display: 'block', marginBottom: 6 }}></i>
            <div style={{ fontFamily: 'var(--font-heading)', fontSize: mobile ? 11 : 13, fontWeight: 700, color: method === rm.id ? '#00f0ff' : 'var(--text-muted, #777)', marginBottom: 2 }}>{rm.label}</div>
            <div style={{ fontSize: mobile ? 9 : 10, color: 'var(--text-muted, #555)' }}>{rm.description}</div>
          </button>
        ))}
      </div>

      <div style={{ marginBottom: 16 }}>
        <label style={S.label}>Select Match *</label>
        <select style={S.select} value={selectedId} onChange={onMatchChange}>
          <option value="">— Choose Match —</option>
          {activeMatches.map(m => <option key={m.id} value={m.id}>{m.title} ({m.mode}) — {m.status}</option>)}
        </select>
      </div>

      {selected && (
        <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 16 }}>
          <span style={{
            padding: '4px 12px', borderRadius: 6, fontSize: 10, fontWeight: 700,
            fontFamily: 'var(--font-heading)', letterSpacing: 0.5,
            background: modeColor(selected.mode) + '15',
            color: modeColor(selected.mode),
            border: `1px solid ${modeColor(selected.mode)}30`,
          }}>
            {selected.mode === 'Solo' ? '👤' : selected.mode === 'Duo' ? '👥' : selected.mode === 'Squad' ? '🛡️' : '⚔️'}{' '}
            {selected.mode.toUpperCase()} MODE
          </span>
          <span style={{ fontSize: 11, color: 'var(--text-muted, #555)' }}>
            — Enter {teamMode ? 'Team Name' : 'IGN'} + {teamMode ? 'Points' : 'Kills'} + Position
          </span>
        </div>
      )}

      {/* ═══ PHASE 1.6: Team Name → User ID Mapping Display ═══ */}
      {teamMapping && method === 'manual' && (
        <div style={{ ...S.card, marginBottom: 16, borderLeft: '3px solid #a78bfa' }}>
          <div style={{ ...S.cardHeader, background: 'rgba(167,139,250,0.04)' }}>
            <div style={S.cardHeaderIcon('#a78bfa')}><i className="fa-solid fa-link" style={{ fontSize: 14, color: '#a78bfa' }}></i></div>
            <h3 style={S.cardHeaderTitle}>Team Name → User Mapping</h3>
            <span style={{ marginLeft: 'auto', fontSize: 10, color: 'var(--text-muted, #555)' }}>{Object.keys(teamMapping).length} teams • {(selected.joined || []).length} players</span>
          </div>
          <div style={{ padding: 14, display: 'grid', gridTemplateColumns: mobile ? '1fr' : 'repeat(auto-fill, minmax(240px, 1fr))', gap: 8 }}>
            {Object.entries(teamMapping).map(([team, members]) => (
              <div key={team} style={{ padding: '10px 12px', borderRadius: 8, background: 'rgba(167,139,250,0.04)', border: '1px solid rgba(167,139,250,0.1)' }}>
                <div style={{ fontFamily: 'var(--font-heading)', fontSize: 12, fontWeight: 700, color: '#a78bfa', marginBottom: 4 }}>
                  🛡️ {team} <span style={{ fontSize: 10, color: 'var(--text-muted, #666)', fontWeight: 400 }}>({members.length})</span>
                </div>
                {members.map(mb => (
                  <div key={mb.userId} style={{ fontSize: 11, color: 'var(--text-muted, #888)', paddingLeft: 10, lineHeight: 1.6 }}>
                    • {mb.ign || mb.username || 'Unknown'} <span style={{ color: '#555', fontSize: 10 }}>(ID: {String(mb.userId || '').slice(0, 8)}…)</span>
                  </div>
                ))}
              </div>
            ))}
          </div>
          <div style={{ padding: '6px 14px 10px', fontSize: 10, color: 'var(--text-muted, #555)', fontStyle: 'italic' }}>
            💡 Copy team names exactly into the result form below. Matched user IDs will auto-attach for prize distribution.
          </div>
        </div>
      )}
      {/* ═══ END PHASE 1.6 ═══ */}

      <div style={{ display: 'grid', gridTemplateColumns: (method === 'manual' && !mobile) ? '1fr 1fr' : '1fr', gap: 20 }}>
        {method === 'manual' && (
          <div style={{ ...S.card, padding: mobile ? 16 : 20 }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 14 }}>
              <span style={{ fontFamily: 'var(--font-heading)', fontSize: 13, fontWeight: 700, color: '#fff' }}>
                {teamMode ? 'Team Results' : 'Player Results'}
              </span>
              <button type="button" style={S.btnGhost} onClick={addPlayer}><i className="fa-solid fa-plus"></i> Add</button>
            </div>
            <div style={{ display: 'grid', gridTemplateColumns: mobile ? '1fr 50px 50px 30px' : '1fr 60px 60px 32px', gap: 6, marginBottom: 6 }}>
              <span style={{ ...S.label, marginBottom: 0 }}>{teamMode ? 'Team Name' : 'IGN'}</span>
              <span style={{ ...S.label, marginBottom: 0, textAlign: 'center' }}>{teamMode ? 'Points' : 'Kills'}</span>
              <span style={{ ...S.label, marginBottom: 0, textAlign: 'center' }}>Pos</span>
              <span></span>
            </div>
            {players.map((p, i) => {
              // ═══ PHASE 1.6: Highlight if team name matches a joined team ═══
              const matchedMembers = teamMode ? findTeamMembers(p.ign.trim()) : null
              // ═══ END PHASE 1.6 ═══
              return (
                <div key={i} style={{ display: 'grid', gridTemplateColumns: mobile ? '1fr 50px 50px 30px' : '1fr 60px 60px 32px', gap: 6, marginBottom: 8, alignItems: 'center' }}>
                  <div style={{ position: 'relative' }}>
                    <input
                      style={{
                        ...S.input, padding: '8px 10px', fontSize: 12,
                        // ═══ PHASE 1.6: Green border when team name matches ═══
                        borderColor: matchedMembers ? 'rgba(34,197,94,0.4)' : 'rgba(255,255,255,0.08)',
                        background: matchedMembers ? 'rgba(34,197,94,0.06)' : 'rgba(255,255,255,0.04)',
                        // ═══ END PHASE 1.6 ═══
                      }}
                      placeholder={teamMode ? 'Team Name' : 'IGN'}
                      value={p.ign}
                      onChange={e => updatePlayer(i, 'ign', e.target.value)}
                    />
                    {/* ═══ PHASE 1.6: Match indicator badge ═══ */}
                    {matchedMembers && (
                      <div style={{ position: 'absolute', top: -6, right: -4, padding: '1px 6px', borderRadius: 4, fontSize: 8, fontWeight: 700, fontFamily: 'var(--font-display)', background: '#22c55e', color: '#fff', lineHeight: 1.4 }}>
                        ✓ {matchedMembers.length}
                      </div>
                    )}
                    {/* ═══ END PHASE 1.6 ═══ */}
                  </div>
                  <input style={{ ...S.input, padding: '8px 6px', fontSize: 12, textAlign: 'center' }} type="number" min="0" value={teamMode ? (p.points || 0) : p.kills} onChange={e => updatePlayer(i, teamMode ? 'points' : 'kills', Number(e.target.value))} />
                  <select style={{ ...S.select, padding: '8px 4px', fontSize: 12 }} value={p.position} onChange={e => updatePlayer(i, 'position', Number(e.target.value))}>
                    {[1, 2, 3, 4, 5].map(n => <option key={n} value={n}>{n}{n === 1 ? 'st' : n === 2 ? 'nd' : n === 3 ? 'rd' : 'th'}</option>)}
                  </select>
                  <button type="button" onClick={() => removePlayer(i)} style={{ width: 30, height: 30, borderRadius: 6, border: 'none', background: 'rgba(239,68,68,0.1)', color: '#ef4444', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 11 }}><i className="fa-solid fa-xmark"></i></button>
                </div>
              )
            })}
            {/* ═══ PHASE 4.2: Submit/Update button + Cancel edit ═══ */}
            <div style={{ display: 'flex', gap: 10, marginTop: 12 }}>
              {editingResultId && (
                <button type="button" style={{ ...S.btnGhost, flex: 1, justifyContent: 'center', padding: '12px 0' }} onClick={cancelEdit}>
                  <i className="fa-solid fa-xmark"></i> Cancel
                </button>
              )}
              <button type="button" style={{ ...S.btnPrimary, flex: editingResultId ? 2 : 1, background: editingResultId ? 'linear-gradient(135deg, #fbbf24, #f59e0b)' : 'linear-gradient(135deg, #6c8cff, #a78bfa)', boxShadow: editingResultId ? '0 4px 20px rgba(251,191,36,0.3)' : '0 4px 20px rgba(108,140,255,0.3)' }} onClick={handleSubmit}>
                <i className={`fa-solid ${editingResultId ? 'fa-pen-to-square' : 'fa-check-double'}`}></i> 
                {editingResultId ? 'Update Results' : 'Submit Results'}
              </button>
            </div>
            {/* ═══ END PHASE 4.2 ═══ */}
          </div>
        )}

        {method === 'screenshot' && (
          <div style={{ ...S.card, padding: 20 }}>
            <div style={{ border: '2px dashed rgba(0,240,255,0.2)', borderRadius: 14, padding: '40px 20px', textAlign: 'center', marginBottom: 20, cursor: 'pointer' }}>
              <i className="fa-solid fa-camera" style={{ fontSize: 36, color: 'rgba(0,240,255,0.4)', marginBottom: 12, display: 'block' }}></i>
              <div style={{ fontFamily: 'var(--font-heading)', fontSize: 14, fontWeight: 600, color: '#fff', marginBottom: 4 }}>Upload FF Result Screenshot</div>
              <div style={{ fontSize: 12, color: 'var(--text-muted, #666)' }}>Tap to select image from gallery</div>
            </div>
            <button type="button" style={S.btnPrimary} onClick={handleSubmit}><i className="fa-solid fa-check-double"></i> Submit with Screenshot</button>
          </div>
        )}

        {eco && (
          <div style={{ ...S.card }}>
            <div style={{ ...S.cardHeader, background: 'rgba(34,197,94,0.04)' }}>
              <div style={S.cardHeaderIcon('#22c55e')}><i className="fa-solid fa-calculator" style={{ fontSize: 14, color: '#22c55e' }}></i></div>
              <h3 style={S.cardHeaderTitle}>Prize Preview</h3>
            </div>
            <div style={{ padding: '18px' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', padding: '8px 0', borderBottom: '1px solid rgba(255,255,255,0.04)' }}>
                <span style={{ fontSize: 12, color: 'var(--text-muted, #777)' }}>Match</span>
                <span style={{ fontSize: 12, color: '#fff', fontFamily: 'var(--font-heading)', fontWeight: 600 }}>{selected?.title}</span>
              </div>
              <div style={{ display: 'flex', justifyContent: 'space-between', padding: '8px 0', borderBottom: '1px solid rgba(255,255,255,0.04)' }}>
                <span style={{ fontSize: 12, color: 'var(--text-muted, #777)' }}>Prize Pool</span>
                <span style={{ fontFamily: 'var(--font-display)', fontSize: 16, fontWeight: 800, color: '#fbbf24' }}>{formatTK(eco.prizePool)}</span>
              </div>
              <div style={{ display: 'flex', justifyContent: 'space-between', padding: '8px 0', borderBottom: '1px solid rgba(255,255,255,0.04)' }}>
                <span style={{ fontSize: 12, color: 'var(--text-muted, #777)' }}>Per Kill</span>
                <span style={{ fontFamily: 'var(--font-display)', fontSize: 13, fontWeight: 700, color: '#22c55e' }}>{formatTK(selected.perKill || 0)}</span>
              </div>
              {/* ═══ PHASE 1.6: Show matched user count in preview ═══ */}
              {teamMode && teamMapping && (
                <div style={{ display: 'flex', justifyContent: 'space-between', padding: '8px 0', borderBottom: '1px solid rgba(255,255,255,0.04)' }}>
                  <span style={{ fontSize: 12, color: 'var(--text-muted, #777)' }}>Teams Mapped</span>
                  <span style={{ fontFamily: 'var(--font-display)', fontSize: 13, fontWeight: 700, color: '#a78bfa' }}>{Object.keys(teamMapping).length}</span>
                </div>
              )}
              {/* ═══ END PHASE 1.6 ═══ */}
              {method === 'manual' && (
                <div style={{ marginTop: 14 }}>
                  <span style={{ ...S.label, marginBottom: 8, display: 'block' }}>Auto Calculated Prizes</span>
                  {resultsWithPrizes.filter(r => r.ign).map((r, i) => (
                    <div key={i} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '10px 12px', borderRadius: 8, marginBottom: 6, background: 'rgba(255,255,255,0.02)', border: '1px solid rgba(255,255,255,0.04)' }}>
                      <div>
                        <div style={{ fontSize: 12, fontWeight: 600, color: teamMode && i === 0 ? '#fbbf24' : '#fff', fontFamily: 'var(--font-heading)' }}>{i === 0 ? '🥇' : i === 1 ? '🥈' : i === 2 ? '🥉' : `#${r.position}`} {r.ign}</div>
                        <div style={{ fontSize: 10, color: 'var(--text-muted, #666)' }}>
                          {teamMode
                            ? `⭐ ${r.points || 0} pts — Pos: ${formatTK(r.positionPrize)}${r.killPrize > 0 ? ` + Kill: ${formatTK(r.killPrize)}` : ''}`
                            : `${r.kills} kills — Pos: ${formatTK(r.positionPrize)} + Kill: ${formatTK(r.killPrize)}`
                          }
                          {/* ═══ PHASE 1.6: Show matched user IDs in prize preview ═══ */}
                          {r.matchedUserIds?.length > 0 && (
                            <span style={{ marginLeft: 6, color: '#22c55e' }}>✓ {r.matchedUserIds.length} user{r.matchedUserIds.length > 1 ? 's' : ''} matched</span>
                          )}
                          {/* ═══ END PHASE 1.6 ═══ */}
                        </div>
                      </div>
                      <span style={{ fontFamily: 'var(--font-display)', fontSize: 15, fontWeight: 800, color: '#fbbf24' }}>{formatTK(r.totalPrize)}</span>
                    </div>
                  ))}
                  {resultsWithPrizes.filter(r => r.ign).length === 0 && (
                    <div style={{ fontSize: 12, color: 'var(--text-muted, #555)', padding: '10px 0', textAlign: 'center' }}>Enter {teamMode ? 'team' : 'player'} names to see auto calculation</div>
                  )}
                </div>
              )}
            </div>
          </div>
        )}
      </div>

      {completedWithResult.length > 0 && (
        <div style={{ marginTop: 28 }}>
          <h2 style={{ fontFamily: 'var(--font-heading)', fontSize: 16, fontWeight: 700, color: '#fff', margin: '0 0 14px' }}>Previous Results</h2>
          {completedWithResult.map(m => {
            const mTeam = isTeamMode(m.mode)
            return (
              <div key={m.id} style={{ ...S.card, marginBottom: 12, padding: '14px 18px', borderLeft: m.result?.method === 'screenshot' ? '3px solid #a78bfa' : '3px solid #6c8cff' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 8, flexWrap: 'wrap', gap: 6 }}>
                  <div>
                    <div style={{ fontFamily: 'var(--font-heading)', fontSize: 14, fontWeight: 700, color: '#fff' }}>{m.title}</div>
                    <div style={{ fontSize: 10, color: 'var(--text-muted, #666)' }}>{m.mode} • {m.map} • {m.result?.method === 'screenshot' ? 'Screenshot' : 'Manual'}</div>
                  </div>
                  {/* ═══ PHASE 4.2: SUBMITTED badge + EDIT button ═══ */}
                  <div style={{ display: 'flex', gap: 8, alignItems: 'center', flexShrink: 0 }}>
                    <span style={{ fontSize: 10, fontWeight: 700, fontFamily: 'var(--font-display)', padding: '3px 10px', borderRadius: 6, background: 'rgba(34,197,94,0.1)', color: '#22c55e' }}>SUBMITTED</span>
                    <button 
                      style={{ ...S.btnWarning, display: 'inline-flex', alignItems: 'center', gap: 4 }}
                      onClick={() => handleEditResult(m.id)}
                    >
                      <i className="fa-solid fa-pen" style={{ fontSize: 9 }}></i> Edit
                    </button>
                  </div>
                  {/* ═══ END PHASE 4.2 ═══ */}
                </div>
                {m.result?.players?.length > 0 && (
                  <div style={{ display: 'flex', flexWrap: 'wrap', gap: 6 }}>
                    {m.result.players.slice(0, 5).map((p, i) => (
                      <span key={i} style={{
                        padding: '4px 10px', borderRadius: 6, fontSize: 11,
                        background: i === 0 ? 'rgba(251,191,36,0.1)' : 'rgba(255,255,255,0.04)',
                        border: `1px solid ${i === 0 ? 'rgba(251,191,36,0.2)' : 'rgba(255,255,255,0.06)'}`,
                        color: mTeam ? '#fbbf24' : (i === 0 ? '#fbbf24' : 'var(--text-muted, #888)'),
                        fontFamily: 'var(--font-heading)', fontWeight: 600,
                      }}>
                        {i === 0 ? '🥇' : `#${p.position}`} {p.ign} ({mTeam ? `⭐ ${p.points || 0} pts` : `${p.kills} kills`})
                      </span>
                    ))}
                  </div>
                )}
              </div>
            )
          })}
        </div>
      )}
    </div>
  )
}

// ═══════════════════════════════════════
//  5. USERS PANEL — ★ UPGRADED: Duplicate IGN Detection
// ═══════════════════════════════════════
function AdminUsers() {
  const { state, dispatch } = useApp()
  const { users } = state
  const mobile = useIsMobile()

  // ═══ PHASE 1.9: Identify current admin user to block self-balance-adjust ═══
  const currentUserId = state.currentUser?.id || state.currentUserId
  // ═══ END PHASE 1.9 ═══

  // ═══ PHASE 7.8: Duplicate IGN detection ═══
  const duplicateIGNs = useMemo(() => {
    const ignCounts = {}
    users.forEach(u => {
      const ign = (u.ign || '').toLowerCase().trim()
      if (ign) ignCounts[ign] = (ignCounts[ign] || 0) + 1
    })
    return new Set(Object.keys(ignCounts).filter(ign => ignCounts[ign] > 1))
  }, [users])

  const isDuplicateIGN = (user) => {
    if (!user.ign) return false
    return duplicateIGNs.has(user.ign.toLowerCase().trim())
  }

  const getDuplicateCount = (user) => {
    if (!user.ign) return 0
    const ign = user.ign.toLowerCase().trim()
    return users.filter(u => (u.ign || '').toLowerCase().trim() === ign).length
  }
  // ═══ END PHASE 7.8 ═══

  if (mobile) {
    return (
      <div style={S.panel}>
        <h1 style={S.title}><i className="fa-solid fa-users-gear" style={{ marginRight: 10, color: '#00f0ff' }}></i>User Management</h1>
        
        {/* ═══ PHASE 7.8: Duplicate IGN warning banner (mobile) ═══ */}
        {duplicateIGNs.size > 0 && (
          <div style={{
            padding: '12px 16px', borderRadius: 12, marginBottom: 16,
            background: 'rgba(251,191,36,0.08)', border: '1px solid rgba(251,191,36,0.15)',
            display: 'flex', alignItems: 'flex-start', gap: 10,
          }}>
            <i className="fa-solid fa-triangle-exclamation" style={{ color: '#fbbf24', fontSize: 16, marginTop: 2, flexShrink: 0 }}></i>
            <div>
              <div style={{ fontFamily: 'var(--font-heading)', fontSize: 13, fontWeight: 600, color: '#fbbf24', marginBottom: 3 }}>
                Duplicate IGNs Detected ({duplicateIGNs.size})
              </div>
              <div style={{ fontSize: 11, color: 'var(--text-muted, #888)', lineHeight: 1.5 }}>
                {[...duplicateIGNs].join(', ')} — Possible multi-accounting
              </div>
            </div>
          </div>
        )}
        {/* ═══ END PHASE 7.8 ═══ */}

        <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
          {users.map(u => {
            // ═══ PHASE 1.9: Self-check flag ═══
            const isSelf = u.id === currentUserId
            // ═══ PHASE 7.8: Duplicate IGN check ═══
            const hasDupIGN = isDuplicateIGN(u)
            const dupCount = getDuplicateCount(u)
            // ═══ END PHASE 1.9 + 7.8 ═══
            return (
              <div key={u.id} style={{
                ...S.mCard,
                // ═══ PHASE 7.8: Yellow border for duplicate IGN ═══
                borderLeft: hasDupIGN ? '3px solid #fbbf24' : '3px solid transparent',
                // ═══ END PHASE 7.8 ═══
              }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 10 }}>
                  <div style={{ width: 36, height: 36, borderRadius: 8, flexShrink: 0, background: u.role === 'owner' ? 'rgba(251,191,36,0.15)' : u.role === 'admin' ? 'rgba(239,68,68,0.15)' : 'rgba(108,140,255,0.15)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontFamily: 'var(--font-heading)', fontSize: 14, fontWeight: 700, color: u.role === 'owner' ? '#fbbf24' : u.role === 'admin' ? '#ef4444' : '#6c8cff' }}>
                    {(u.name || u.displayName || u.username || '?').charAt(0)}
                  </div>
                  <div style={{ flex: 1, minWidth: 0 }}>
                    <div style={{ fontFamily: 'var(--font-heading)', fontWeight: 600, color: '#fff', fontSize: 13, wordBreak: 'break-word' }}>
                      {u.name || u.displayName || u.username}
                      {isSelf && <span style={{ marginLeft: 6, fontSize: 8, padding: '2px 6px', borderRadius: 4, fontWeight: 700, background: 'rgba(0,240,255,0.1)', color: '#00f0ff' }}>YOU</span>}
                      <span style={{ marginLeft: 6, fontSize: 8, padding: '2px 6px', borderRadius: 4, fontWeight: 700, background: u.role === 'owner' ? 'rgba(251,191,36,0.12)' : u.role === 'admin' ? 'rgba(239,68,68,0.1)' : 'rgba(108,140,255,0.08)', color: u.role === 'owner' ? '#fbbf24' : u.role === 'admin' ? '#ef4444' : '#6c8cff' }}>
                        {u.role === 'owner' ? 'OWNER' : u.role === 'admin' ? 'ADMIN' : 'USER'}
                      </span>
                    </div>
                    <div style={{ fontSize: 10, color: 'var(--text-muted, #666)', display: 'flex', alignItems: 'center', gap: 6 }}>
                      <span>@{u.username}</span>
                      {/* ═══ PHASE 7.8: Duplicate IGN badge ═══ */}
                      {hasDupIGN && (
                        <span style={{ padding: '1px 6px', borderRadius: 4, fontSize: 8, fontWeight: 700, background: 'rgba(251,191,36,0.15)', color: '#fbbf24', display: 'inline-flex', alignItems: 'center', gap: 3 }}>
                          <i className="fa-solid fa-copy" style={{ fontSize: 7 }}></i>
                          IGN: {u.ign} ({dupCount}x)
                        </span>
                      )}
                      {!hasDupIGN && <span>IGN: {u.ign || '—'}</span>}
                      {/* ═══ END PHASE 7.8 ═══ */}
                    </div>
                  </div>
                </div>
                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: 6, marginBottom: 10 }}>
                  <div style={{ padding: '8px 10px', borderRadius: 8, background: 'rgba(255,255,255,0.02)' }}>
                    <div style={{ fontSize: 9, color: 'var(--text-muted, #555)', fontWeight: 600, textTransform: 'uppercase', letterSpacing: 0.5 }}>Balance</div>
                    <div style={{ fontFamily: 'var(--font-display)', fontWeight: 700, fontSize: 14, color: '#fbbf24', marginTop: 2 }}>{formatTK(u.balance ?? u.wallet ?? 0)}</div>
                  </div>
                  <div style={{ padding: '8px 10px', borderRadius: 8, background: 'rgba(255,255,255,0.02)' }}>
                    <div style={{ fontSize: 9, color: 'var(--text-muted, #555)', fontWeight: 600, textTransform: 'uppercase', letterSpacing: 0.5 }}>Matches</div>
                    <div style={{ fontFamily: 'var(--font-display)', fontWeight: 700, fontSize: 14, color: '#fff', marginTop: 2 }}>{u.matchesPlayed ?? u.joinedMatches?.length ?? 0}</div>
                  </div>
                  <div style={{ padding: '8px 10px', borderRadius: 8, background: 'rgba(255,255,255,0.02)' }}>
                    <div style={{ fontSize: 9, color: 'var(--text-muted, #555)', fontWeight: 600, textTransform: 'uppercase', letterSpacing: 0.5 }}>Status</div>
                    <div style={{ fontFamily: 'var(--font-heading)', fontWeight: 700, fontSize: 12, color: u.banned ? '#ef4444' : '#22c55e', marginTop: 2 }}>{u.banned ? 'BANNED' : 'ACTIVE'}</div>
                  </div>
                </div>
                <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap' }}>
                  {/* ═══ PHASE 1.9: Block self-balance-adjust + show reason ═══ */}
                  {isSelf ? (
                    <div style={{ padding: '6px 10px', borderRadius: 8, border: '1px solid rgba(255,255,255,0.05)', background: 'rgba(255,255,255,0.02)', fontSize: 10, color: 'var(--text-muted, #555)', fontFamily: 'var(--font-heading)', fontWeight: 600, display: 'inline-flex', alignItems: 'center', gap: 4 }}>
                      <i className="fa-solid fa-lock" style={{ fontSize: 9 }}></i> Cannot adjust own balance
                    </div>
                  ) : (
                    <button style={{ ...S.btnGhost, background: 'rgba(251,191,36,0.1)', color: '#fbbf24', borderColor: 'rgba(251,191,36,0.2)', fontSize: 10, padding: '6px 10px' }} onClick={() => dispatch({ type: 'SHOW_MODAL', payload: { type: 'adjust-balance', userId: u.id } })}>
                      <i className="fa-solid fa-wallet"></i> Balance
                    </button>
                  )}
                  {/* ═══ END PHASE 1.9 ═══ */}
                  {u.role !== 'owner' && (
                    <button style={u.banned ? { ...S.btnSuccess, fontSize: 10, padding: '6px 10px' } : { ...S.btnDanger, fontSize: 10, padding: '6px 10px' }} onClick={() => {
                      dispatch({ type: 'TOGGLE_BAN', payload: u.id })
                      adminAction(dispatch, u.banned ? 'Unbanned user' : 'Banned user', u.name || u.displayName, `${u.name || u.displayName} ${u.banned ? 'unbanned' : 'banned'}`, u.banned ? 'success' : 'error')
                    }}>
                      <i className={`fa-solid ${u.banned ? 'fa-lock-open' : 'fa-ban'}`}></i> {u.banned ? 'Unban' : 'Ban'}
                    </button>
                  )}
                </div>
              </div>
            )
          })}
        </div>
      </div>
    )
  }

  return (
    <div style={S.panel}>
      <h1 style={S.title}><i className="fa-solid fa-users-gear" style={{ marginRight: 10, color: '#00f0ff' }}></i>User Management</h1>
      
      {/* ═══ PHASE 7.8: Duplicate IGN warning banner (desktop) ═══ */}
      {duplicateIGNs.size > 0 && (
        <div style={{
          padding: '14px 18px', borderRadius: 12, marginBottom: 20,
          background: 'rgba(251,191,36,0.08)', border: '1px solid rgba(251,191,36,0.15)',
          display: 'flex', alignItems: 'flex-start', gap: 12,
        }}>
          <i className="fa-solid fa-triangle-exclamation" style={{ color: '#fbbf24', fontSize: 18, marginTop: 2, flexShrink: 0 }}></i>
          <div style={{ flex: 1 }}>
            <div style={{ fontFamily: 'var(--font-heading)', fontSize: 14, fontWeight: 700, color: '#fbbf24', marginBottom: 4 }}>
              <i className="fa-solid fa-copy" style={{ marginRight: 6, fontSize: 12 }}></i>
              Duplicate IGNs Detected ({duplicateIGNs.size})
            </div>
            <div style={{ fontSize: 12, color: 'var(--text-muted, #888)', lineHeight: 1.5, marginBottom: 8 }}>
              These IGNs are used by multiple accounts — possible multi-accounting:
            </div>
            <div style={{ display: 'flex', flexWrap: 'wrap', gap: 6 }}>
              {[...duplicateIGNs].map(ign => (
                <span key={ign} style={{
                  padding: '4px 10px', borderRadius: 6, fontSize: 11,
                  background: 'rgba(251,191,36,0.1)', border: '1px solid rgba(251,191,36,0.2)',
                  color: '#fbbf24', fontFamily: 'var(--font-display)', fontWeight: 700,
                }}>
                  {ign}
                  <span style={{ fontSize: 9, fontWeight: 400, color: 'var(--text-muted, #888)', marginLeft: 4 }}>
                    ({users.filter(u => (u.ign || '').toLowerCase().trim() === ign).length} accounts)
                  </span>
                </span>
              ))}
            </div>
          </div>
        </div>
      )}
      {/* ═══ END PHASE 7.8 ═══ */}

      <div style={{ ...S.card }}>
        <table style={S.table}>
          <thead>
            <tr><th style={S.th}>User</th><th style={S.th}>IGN</th><th style={S.th}>Role</th><th style={S.th}>Balance</th><th style={S.th}>Matches</th><th style={S.th}>Status</th><th style={S.th}>Actions</th></tr>
          </thead>
          <tbody>
            {users.map(u => {
              // ═══ PHASE 1.9: Self-check flag (desktop) ═══
              const isSelf = u.id === currentUserId
              // ═══ PHASE 7.8: Duplicate IGN check (desktop) ═══
              const hasDupIGN = isDuplicateIGN(u)
              const dupCount = getDuplicateCount(u)
              // ═══ END PHASE 1.9 + 7.8 ═══
              return (
                <tr key={u.id} style={hasDupIGN ? { background: 'rgba(251,191,36,0.03)' } : {}}>
                  <td style={S.td}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                      <div style={{ width: 32, height: 32, borderRadius: 8, flexShrink: 0, background: u.role === 'owner' ? 'rgba(251,191,36,0.15)' : u.role === 'admin' ? 'rgba(239,68,68,0.15)' : 'rgba(108,140,255,0.15)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontFamily: 'var(--font-heading)', fontSize: 13, fontWeight: 700, color: u.role === 'owner' ? '#fbbf24' : u.role === 'admin' ? '#ef4444' : '#6c8cff' }}>
                        {(u.name || u.displayName || u.username || '?').charAt(0)
                      }</div>
                      <div style={{ minWidth: 0 }}>
                        <span style={{ fontFamily: 'var(--font-heading)', fontWeight: 600, color: '#fff', fontSize: 12, display: 'block', wordBreak: 'break-word' }}>
                          {u.name || u.displayName || u.username}
                          {isSelf && <span style={{ marginLeft: 4, fontSize: 8, padding: '1px 5px', borderRadius: 3, fontWeight: 700, background: 'rgba(0,240,255,0.1)', color: '#00f0ff' }}>YOU</span>}
                        </span>
                        <div style={{ fontSize: 9, color: 'var(--text-muted, #666)' }}>@{u.username}</div>
                      </div>
                    </div>
                  </td>
                  <td style={{ ...S.td, fontFamily: 'var(--font-display)', color: hasDupIGN ? '#fbbf24' : 'var(--text-muted, #888)', fontSize: 12 }}>
                    {/* ═══ PHASE 7.8: Highlight duplicate IGNs in table ═══ */}
                    {u.ign || '—'}
                    {hasDupIGN && (
                      <div style={{ display: 'inline-flex', alignItems: 'center', gap: 3, marginLeft: 4, padding: '1px 5px', borderRadius: 3, fontSize: 8, fontWeight: 700, background: 'rgba(251,191,36,0.15)', color: '#fbbf24' }}>
                        <i className="fa-solid fa-copy" style={{ fontSize: 7 }}></i> {dupCount}x
                      </div>
                    )}
                    {/* ═══ END PHASE 7.8 ═══ */}
                  </td>
                  <td style={S.td}>
                    <span style={{ padding: '3px 8px', borderRadius: 6, fontSize: 9, fontWeight: 700, fontFamily: 'var(--font-heading)', background: u.role === 'owner' ? 'rgba(251,191,36,0.12)' : u.role === 'admin' ? 'rgba(239,68,68,0.1)' : 'rgba(108,140,255,0.08)', color: u.role === 'owner' ? '#fbbf24' : u.role === 'admin' ? '#ef4444' : '#6c8cff' }}>
                      {u.role === 'owner' ? 'OWNER' : u.role === 'admin' ? 'ADMIN' : 'USER'}
                    </span>
                  </td>
                  <td style={{ ...S.td, fontFamily: 'var(--font-display)', fontWeight: 700, fontSize: 13, color: '#fbbf24' }}>{formatTK(u.balance ?? u.wallet ?? 0)}</td>
                  <td style={{ ...S.td, fontFamily: 'var(--font-display)', fontWeight: 600, fontSize: 13 }}>{u.matchesPlayed ?? u.joinedMatches?.length ?? 0}</td>
                  <td style={S.td}>
                    <span style={{ padding: '3px 10px', borderRadius: 6, fontSize: 10, fontWeight: 700, fontFamily: 'var(--font-heading)', background: u.banned ? 'rgba(239,68,68,0.12)' : 'rgba(34,197,94,0.12)', color: u.banned ? '#ef4444' : '#22c55e' }}>
                      {u.banned ? 'BANNED' : 'ACTIVE'}
                    </span>
                  </td>
                  <td style={S.td}>
                    <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap' }}>
                      {/* ═══ PHASE 1.9: Block self-balance-adjust (desktop) ═══ */}
                      {isSelf ? (
                        <div style={{ padding: '6px 10px', borderRadius: 8, border: '1px solid rgba(255,255,255,0.05)', background: 'rgba(255,255,255,0.02)', fontSize: 10, color: 'var(--text-muted, #555)', fontFamily: 'var(--font-heading)', fontWeight: 600, display: 'inline-flex', alignItems: 'center', gap: 4 }}>
                          <i className="fa-solid fa-lock" style={{ fontSize: 9 }}></i> Self
                        </div>
                      ) : (
                        <button style={{ ...S.btnGhost, background: 'rgba(251,191,36,0.1)', color: '#fbbf24', borderColor: 'rgba(251,191,36,0.2)' }} onClick={() => dispatch({ type: 'SHOW_MODAL', payload: { type: 'adjust-balance', userId: u.id } })}>
                          <i className="fa-solid fa-wallet"></i> Balance
                        </button>
                      )}
                      {/* ═══ END PHASE 1.9 ═══ */}
                      {u.role !== 'owner' && (
                        <button style={u.banned ? S.btnSuccess : S.btnDanger} onClick={() => {
                          dispatch({ type: 'TOGGLE_BAN', payload: u.id })
                          adminAction(dispatch, u.banned ? 'Unbanned user' : 'Banned user', u.name || u.displayName, `${u.name || u.displayName} ${u.banned ? 'unbanned' : 'banned'}`, u.banned ? 'success' : 'error')
                        }}>
                          <i className={`fa-solid ${u.banned ? 'fa-lock-open' : 'fa-ban'}`}></i>
                        </button>
                      )}
                    </div>
                  </td>
                </tr>
              )
            })}
          </tbody>
        </table>
      </div>
    </div>
  )
}

// ═══════════════════════════════════════
//  6. FINANCE PANEL
// ═══════════════════════════════════════
function AdminFinance() {
  const { state, dispatch } = useApp()
  const { transactions, pendingWithdrawals, pendingAddMoneyRequests } = state
  const mobile = useIsMobile()
  const [financeTab, setFinanceTab] = useState('deposits')
  const [processing, setProcessing] = useState(null)

  const requests = pendingAddMoneyRequests || []

  // ═══ Deposit handlers ═══
  const handleApproveDeposit = async (req) => {
    setProcessing(req.id)
    try {
      await approveAddMoneyRequest(req.id, req.userId, req.amount)
      dispatch({ type: 'APPROVE_ADD_MONEY', payload: { requestId: req.id, userId: req.userId, amount: req.amount } })
      adminAction(dispatch, 'Approved add money', `${req.username} — ${formatTK(req.amount)} via ${req.method}`, `${formatTK(req.amount)} added to ${req.username}`, 'success')
    } catch (err) {
      console.error('Approve failed:', err)
      showToast(dispatch, 'Failed to approve. Check console.', 'error')
    }
    setProcessing(null)
  }

  const handleRejectDeposit = async (req) => {
    setProcessing(req.id)
    try {
      await rejectAddMoneyRequest(req.id)
      dispatch({ type: 'REJECT_ADD_MONEY', payload: { requestId: req.id } })
      adminAction(dispatch, 'Rejected add money', `${req.username} — ${formatTK(req.amount)} via ${req.method}`, `Rejected ${req.username}'s request`, 'error')
    } catch (err) {
      console.error('Reject failed:', err)
      showToast(dispatch, 'Failed to reject. Check console.', 'error')
    }
    setProcessing(null)
  }

  // ═══ Withdrawal handlers ═══
  const handleApproveWithdraw = (w) => {
    dispatch({ type: 'APPROVE_WITHDRAW', payload: w.id })
    adminAction(dispatch, 'Approved withdrawal', `${w.username} — ${formatTK(w.amount)} via ${w.method}`, `Approved ${w.username}'s withdrawal`, 'success')
  }
  const handleRejectWithdraw = (w) => {
    dispatch({ type: 'REJECT_WITHDRAW', payload: w.id })
    adminAction(dispatch, 'Rejected withdrawal', `${w.username} — ${formatTK(w.amount)}`, `Rejected ${w.username}'s withdrawal`, 'error')
  }

  const timeAgo = (isoStr) => {
    if (!isoStr) return '—'
    const diff = Date.now() - new Date(isoStr).getTime()
    const mins = Math.floor(diff / 60000)
    if (mins < 1) return 'Just now'
    if (mins < 60) return `${mins}m ago`
    const hrs = Math.floor(mins / 60)
    if (hrs < 24) return `${hrs}h ago`
    return `${Math.floor(hrs / 24)}d ago`
  }

  // ═══ PHASE 3.5 + 3.6: Sub-tabs ═══
  const subTabs = [
    { id: 'deposits', label: 'Deposit Requests', icon: 'fa-wallet', count: requests.length, color: '#22c55e' },
    { id: 'withdrawals', label: 'Withdrawal Requests', icon: 'fa-arrow-up-from-bracket', count: pendingWithdrawals.length, color: '#fbbf24' },
    { id: 'transactions', label: 'All Transactions', icon: 'fa-receipt', count: transactions.length, color: '#6c8cff' },
  ]

  // ═══ DEPOSITS TAB CONTENT ═══
  const depositsContent = requests.length === 0 ? (
    <div style={{ ...S.card, padding: 40, textAlign: 'center' }}>
      <i className="fa-solid fa-circle-check" style={{ fontSize: 36, color: '#22c55e', marginBottom: 12, display: 'block', opacity: 0.4 }}></i>
      <div style={{ fontFamily: 'var(--font-heading)', fontSize: 15, fontWeight: 700, color: '#fff', marginBottom: 4 }}>All Caught Up</div>
      <div style={{ fontSize: 12, color: 'var(--text-muted, #666)' }}>No pending deposit requests</div>
    </div>
  ) : mobile ? (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
      {requests.map(req => {
        const isProc = processing === req.id
        return (
          <div key={req.id} style={{ ...S.mCard, borderLeft: '3px solid #22c55e', opacity: isProc ? 0.5 : 1, pointerEvents: isProc ? 'none' : 'auto' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 10 }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                <div style={{ width: 32, height: 32, borderRadius: 8, flexShrink: 0, background: 'rgba(34,197,94,0.12)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontFamily: 'var(--font-heading)', fontSize: 13, fontWeight: 700, color: '#22c55e' }}>
                  {(req.username || '?').charAt(0)}
                </div>
                <div>
                  <div style={{ fontFamily: 'var(--font-heading)', fontWeight: 600, color: '#fff', fontSize: 13 }}>{req.username}</div>
                  {req.ign && <div style={{ fontSize: 10, color: 'var(--text-muted, #666)' }}>IGN: {req.ign}</div>}
                </div>
              </div>
              <span style={{ fontFamily: 'var(--font-display)', fontWeight: 700, color: '#22c55e', fontSize: 18 }}>{formatTK(req.amount)}</span>
            </div>
            <div style={S.mRow}><span style={S.mLabel}>Method</span><span style={{ fontSize: 12, color: '#fff', fontWeight: 600 }}>{req.method}</span></div>
            {/* ═══ PHASE 3.3: TXID + Sender Number ═══ */}
            <div style={S.mRow}><span style={S.mLabel}>TXID</span><span style={{ fontSize: 12, color: '#fbbf24', fontFamily: 'var(--font-display)', fontWeight: 700, letterSpacing: 0.5 }}>{req.txId || '—'}</span></div>
            {req.senderNumber && <div style={S.mRow}><span style={S.mLabel}>Sender #</span><span style={{ fontSize: 12, color: '#22c55e', fontFamily: 'var(--font-display)', fontWeight: 700 }}>{req.senderNumber}</span></div>}
            {req.phone && <div style={S.mRow}><span style={S.mLabel}>Registered</span><span style={{ fontSize: 12, color: 'var(--text-muted, #888)' }}>{req.phone}</span></div>}
            {/* ═══ END PHASE 3.3 ═══ */}
            <div style={S.mRow}><span style={S.mLabel}>Time</span><span style={{ fontSize: 11, color: 'var(--text-muted, #666)' }}>{timeAgo(req.createdAt)}</span></div>
            <div style={{ display: 'flex', gap: 8, marginTop: 12, justifyContent: 'flex-end' }}>
              <button style={{ ...S.btnDanger, padding: '8px 16px', fontSize: 12, opacity: isProc ? 0.5 : 1 }} onClick={() => handleRejectDeposit(req)} disabled={isProc}><i className="fa-solid fa-xmark"></i> Reject</button>
              <button style={{ ...S.btnSuccess, padding: '8px 16px', fontSize: 12, opacity: isProc ? 0.5 : 1 }} onClick={() => handleApproveDeposit(req)} disabled={isProc}><i className="fa-solid fa-check"></i> Approve</button>
            </div>
          </div>
        )
      })}
    </div>
  ) : (
    <div style={{ ...S.card }}>
      <table style={S.table}>
        <thead><tr>
          <th style={S.th}>User</th><th style={S.th}>Amount</th><th style={S.th}>Method</th>
          <th style={S.th}>TXID</th><th style={S.th}>Sender #</th><th style={S.th}>Phone</th><th style={S.th}>Time</th>
          <th style={{ ...S.th, textAlign: 'right' }}>Actions</th>
        </tr></thead>
        <tbody>
          {requests.map(req => {
            const isProc = processing === req.id
            return (
              <tr key={req.id} style={{ opacity: isProc ? 0.5 : 1 }}>
                <td style={S.td}>
                  <div style={{ fontFamily: 'var(--font-heading)', fontWeight: 600, color: '#fff', fontSize: 12 }}>{req.username}</div>
                  {req.ign && <div style={{ fontSize: 10, color: 'var(--text-muted, #666)' }}>IGN: {req.ign}</div>}
                </td>
                <td style={{ ...S.td, fontFamily: 'var(--font-display)', fontWeight: 700, color: '#22c55e', fontSize: 14 }}>{formatTK(req.amount)}</td>
                <td style={S.td}><span style={{ padding: '3px 8px', borderRadius: 6, fontSize: 10, fontWeight: 700, fontFamily: 'var(--font-heading)', background: 'rgba(34,197,94,0.1)', color: '#22c55e' }}>{req.method}</span></td>
                {/* ═══ PHASE 3.3: TXID + Sender Number ═══ */}
                <td style={{ ...S.td, fontFamily: 'var(--font-display)', fontWeight: 700, color: '#fbbf24', fontSize: 12, letterSpacing: 0.5 }}>{req.txId || '—'}</td>
                <td style={{ ...S.td, fontSize: 12, color: '#22c55e', fontFamily: 'var(--font-display)', fontWeight: 700 }}>{req.senderNumber || '—'}</td>
                <td style={{ ...S.td, fontSize: 12, color: 'var(--text-muted, #888)' }}>{req.phone || '—'}</td>
                {/* ═══ END PHASE 3.3 ═══ */}
                <td style={{ ...S.td, fontSize: 11, color: 'var(--text-muted, #666)' }}>{timeAgo(req.createdAt)}</td>
                <td style={{ ...S.td, textAlign: 'right' }}>
                  <div style={{ display: 'flex', gap: 6, justifyContent: 'flex-end' }}>
                    <button style={{ ...S.btnDanger, opacity: isProc ? 0.5 : 1 }} onClick={() => handleRejectDeposit(req)} disabled={isProc}><i className="fa-solid fa-xmark"></i> Reject</button>
                    <button style={{ ...S.btnSuccess, opacity: isProc ? 0.5 : 1 }} onClick={() => handleApproveDeposit(req)} disabled={isProc}><i className="fa-solid fa-check"></i> Approve</button>
                  </div>
                </td>
              </tr>
            )
          })}
        </tbody>
      </table>
    </div>
  )

  // ═══ WITHDRAWALS TAB CONTENT ═══
  const withdrawalsContent = pendingWithdrawals.length === 0 ? (
    <div style={{ ...S.card, padding: 40, textAlign: 'center' }}>
      <i className="fa-solid fa-circle-check" style={{ fontSize: 36, color: '#fbbf24', marginBottom: 12, display: 'block', opacity: 0.4 }}></i>
      <div style={{ fontFamily: 'var(--font-heading)', fontSize: 15, fontWeight: 700, color: '#fff', marginBottom: 4 }}>All Caught Up</div>
      <div style={{ fontSize: 12, color: 'var(--text-muted, #666)' }}>No pending withdrawal requests</div>
    </div>
  ) : mobile ? (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
      {pendingWithdrawals.map(w => (
        <div key={w.id} style={{ ...S.mCard, borderLeft: '3px solid #fbbf24' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 8 }}>
            <span style={{ fontFamily: 'var(--font-heading)', fontWeight: 600, color: '#fff', fontSize: 13 }}>{w.username}</span>
            <span style={{ fontFamily: 'var(--font-display)', fontWeight: 700, color: '#fbbf24', fontSize: 15 }}>{formatTK(w.amount)}</span>
          </div>
          <div style={S.mRow}><span style={S.mLabel}>Method</span><span style={{ fontSize: 12, color: 'var(--text-muted, #888)' }}>{w.method}</span></div>
          <div style={S.mRow}><span style={S.mLabel}>Account</span><span style={{ fontSize: 12, color: 'var(--text-muted, #777)', wordBreak: 'break-all' }}>{w.account || '—'}</span></div>
          <div style={{ display: 'flex', gap: 8, marginTop: 10, justifyContent: 'flex-end' }}>
            <button style={S.btnSuccess} onClick={() => handleApproveWithdraw(w)}><i className="fa-solid fa-check"></i> Approve</button>
            <button style={S.btnDanger} onClick={() => handleRejectWithdraw(w)}><i className="fa-solid fa-xmark"></i> Reject</button>
          </div>
        </div>
      ))}
    </div>
  ) : (
    <div style={{ ...S.card }}>
      <table style={S.table}>
        <thead><tr><th style={S.th}>User</th><th style={S.th}>Amount</th><th style={S.th}>Method</th><th style={S.th}>Account</th><th style={{ ...S.th, textAlign: 'right' }}>Actions</th></tr></thead>
        <tbody>
          {pendingWithdrawals.map(w => (
            <tr key={w.id}>
              <td style={{ ...S.td, fontFamily: 'var(--font-heading)', fontWeight: 600, color: '#fff' }}>{w.username}</td>
              <td style={{ ...S.td, fontFamily: 'var(--font-display)', fontWeight: 700, color: '#fbbf24' }}>{formatTK(w.amount)}</td>
              <td style={{ ...S.td, color: 'var(--text-muted, #888)' }}>{w.method}</td>
              <td style={{ ...S.td, fontSize: 11, color: 'var(--text-muted, #777)' }}>{w.account || '—'}</td>
              <td style={{ ...S.td, textAlign: 'right' }}>
                <div style={{ display: 'flex', gap: 6, justifyContent: 'flex-end' }}>
                  <button style={S.btnSuccess} onClick={() => handleApproveWithdraw(w)}><i className="fa-solid fa-check"></i> Approve</button>
                  <button style={S.btnDanger} onClick={() => handleRejectWithdraw(w)}><i className="fa-solid fa-xmark"></i> Reject</button>
                </div>
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  )

  // ═══ TRANSACTIONS TAB CONTENT ═══
  const txContent = mobile ? (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
      {transactions.slice(0, 30).map(tx => {
        const isPos = tx.type === 'add' || tx.type === 'win'
        return (
          <div key={tx.id} style={{ ...S.mCard, marginBottom: 0, display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            <div style={{ flex: 1, minWidth: 0 }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: 6, marginBottom: 2 }}>
                <span style={{ padding: '2px 8px', borderRadius: 4, fontSize: 9, fontWeight: 700, fontFamily: 'var(--font-heading)', background: isPos ? 'rgba(34,197,94,0.1)' : 'rgba(239,68,68,0.1)', color: isPos ? '#22c55e' : '#ef4444' }}>{tx.type.toUpperCase()}</span>
                <span style={{ fontSize: 10, color: 'var(--text-muted, #555)' }}>{tx.date}</span>
              </div>
              <div style={{ fontSize: 12, color: '#fff', wordBreak: 'break-word' }}>{tx.desc}</div>
            </div>
            <span style={{ fontFamily: 'var(--font-display)', fontWeight: 700, fontSize: 14, color: isPos ? '#22c55e' : '#ef4444', flexShrink: 0, marginLeft: 10 }}>{isPos ? '+' : '-'}{formatTK(Math.abs(tx.amount))}</span>
          </div>
        )
      })}
    </div>
  ) : (
    <div style={{ ...S.card }}>
      <table style={S.table}>
        <thead><tr><th style={S.th}>Type</th><th style={S.th}>Description</th><th style={S.th}>Amount</th><th style={S.th}>Status</th><th style={S.th}>Date</th></tr></thead>
        <tbody>
          {transactions.slice(0, 30).map(tx => {
            const isPos = tx.type === 'add' || tx.type === 'win'
            return (
              <tr key={tx.id}>
                <td style={S.td}><span style={{ padding: '3px 10px', borderRadius: 6, fontSize: 10, fontWeight: 700, fontFamily: 'var(--font-heading)', background: isPos ? 'rgba(34,197,94,0.1)' : 'rgba(239,68,68,0.1)', color: isPos ? '#22c55e' : '#ef4444' }}>{tx.type.toUpperCase()}</span></td>
                <td style={{ ...S.td, fontSize: 12, color: '#fff', wordBreak: 'break-word' }}>{tx.desc}</td>
                <td style={{ ...S.td, fontFamily: 'var(--font-display)', fontWeight: 700, fontSize: 13, color: isPos ? '#22c55e' : '#ef4444' }}>{isPos ? '+' : '-'}{formatTK(Math.abs(tx.amount))}</td>
                <td style={S.td}><span style={{ padding: '2px 8px', borderRadius: 4, fontSize: 9, fontWeight: 700, fontFamily: 'var(--font-display)', background: tx.status === 'completed' ? 'rgba(34,197,94,0.1)' : 'rgba(251,191,36,0.1)', color: tx.status === 'completed' ? '#22c55e' : '#fbbf24' }}>{(tx.status || 'completed').toUpperCase()}</span></td>
                <td style={{ ...S.td, fontSize: 11, color: 'var(--text-muted, #777)' }}>{tx.date}</td>
              </tr>
            )
          })}
        </tbody>
      </table>
    </div>
  )

  return (
    <div style={S.panel}>
      <h1 style={S.title}><i className="fa-solid fa-money-bill-transfer" style={{ marginRight: 10, color: '#a78bfa' }}></i>Finance Management</h1>

      {/* ═══ PHASE 3.5 + 3.6: Sub-tab bar ═══ */}
      <div style={{ display: 'flex', gap: 6, marginBottom: 20, overflowX: 'auto', paddingBottom: 2 }}>
        {subTabs.map(st => {
          const active = financeTab === st.id
          return (
            <button key={st.id} onClick={() => setFinanceTab(st.id)} style={{
              display: 'inline-flex', alignItems: 'center', gap: 7, padding: '10px 16px',
              borderRadius: 10, cursor: 'pointer', whiteSpace: 'nowrap', flexShrink: 0,
              fontSize: 12, fontWeight: 700, fontFamily: 'var(--font-heading)',
              background: active ? (st.color + '20') : 'rgba(255,255,255,0.03)',
              color: active ? st.color : '#666',
              border: '1px solid ' + (active ? (st.color + '40') : 'rgba(255,255,255,0.05)'),
              boxShadow: active ? ('0 4px 16px ' + st.color + '12') : 'none',
              transition: 'all 0.3s ease',
            }}>
              <i className={'fa-solid ' + st.icon} style={{ fontSize: 12 }}></i>
              {st.label}
              <span style={{
                padding: '1px 7px', borderRadius: 6, fontSize: 10, fontWeight: 700,
                fontFamily: 'var(--font-display)',
                background: active ? (st.color + '30') : 'rgba(255,255,255,0.06)',
                color: active ? st.color : '#555',
              }}>{st.count}</span>
            </button>
          )
        })}
      </div>

      {/* Verify warning for deposits */}
      {financeTab === 'deposits' && requests.length > 0 && (
        <div style={{
          padding: '12px 18px', borderRadius: 12, marginBottom: 20,
          background: 'rgba(251,191,36,0.06)', border: '1px solid rgba(251,191,36,0.12)',
          display: 'flex', alignItems: 'flex-start', gap: 10,
        }}>
          <i className="fa-solid fa-triangle-exclamation" style={{ color: '#fbbf24', fontSize: 14, marginTop: 2, flexShrink: 0 }}></i>
          <div style={{ fontSize: 12, color: 'var(--text-muted, #888)', lineHeight: 1.5 }}>
            <strong style={{ color: '#fbbf24' }}>Verify before approving:</strong> Check your payment app to confirm the user sent money. Match the <strong style={{ color: '#fbbf24' }}>TXID</strong> and <strong style={{ color: '#22c55e' }}>Sender Number</strong>.
          </div>
        </div>
      )}

      {/* Tab content */}
      {financeTab === 'deposits' && depositsContent}
      {financeTab === 'withdrawals' && withdrawalsContent}
      {financeTab === 'transactions' && txContent}
    </div>
  )
}

// ═══════════════════════════════════════
//  7. ADD MONEY REQUESTS (NEW)
// ═══════════════════════════════════════
function AdminAddMoneyRequests() {
  const { state, dispatch } = useApp()
  const { pendingAddMoneyRequests } = state
  const mobile = useIsMobile()
  const [processing, setProcessing] = useState(null)

  const requests = pendingAddMoneyRequests || []

  const handleApprove = async (req) => {
    setProcessing(req.id)
    try {
      // 1. Update Firestore (mark approved + add balance)
      await approveAddMoneyRequest(req.id, req.userId, req.amount)
      // 2. Update local state
      dispatch({
        type: 'APPROVE_ADD_MONEY',
        payload: { requestId: req.id, userId: req.userId, amount: req.amount }
      })
      adminAction(dispatch, 'Approved add money', `${req.username} — ${formatTK(req.amount)} via ${req.method}`, `${formatTK(req.amount)} added to ${req.username}`, 'success')
    } catch (err) {
      console.error('Approve failed:', err)
      showToast(dispatch, 'Failed to approve. Check console.', 'error')
    }
    setProcessing(null)
  }

  const handleReject = async (req) => {
    setProcessing(req.id)
    try {
      // 1. Update Firestore (mark rejected)
      await rejectAddMoneyRequest(req.id)
      // 2. Update local state
      dispatch({
        type: 'REJECT_ADD_MONEY',
        payload: { requestId: req.id }
      })
      adminAction(dispatch, 'Rejected add money', `${req.username} — ${formatTK(req.amount)} via ${req.method}`, `Rejected ${req.username}'s request`, 'error')
    } catch (err) {
      console.error('Reject failed:', err)
      showToast(dispatch, 'Failed to reject. Check console.', 'error')
    }
    setProcessing(null)
  }

  const timeAgo = (isoStr) => {
    if (!isoStr) return '—'
    const diff = Date.now() - new Date(isoStr).getTime()
    const mins = Math.floor(diff / 60000)
    if (mins < 1) return 'Just now'
    if (mins < 60) return `${mins}m ago`
    const hrs = Math.floor(mins / 60)
    if (hrs < 24) return `${hrs}h ago`
    return `${Math.floor(hrs / 24)}d ago`
  }

  if (requests.length === 0) {
    return (
      <div style={S.panel}>
        <h1 style={S.title}><i className="fa-solid fa-wallet" style={{ marginRight: 10, color: '#22c55e' }}></i>Add Money Requests</h1>
        <div style={{ ...S.card, padding: 40, textAlign: 'center' }}>
          <i className="fa-solid fa-circle-check" style={{ fontSize: 40, color: '#22c55e', marginBottom: 14, display: 'block', opacity: 0.4 }}></i>
          <div style={{ fontFamily: 'var(--font-heading)', fontSize: 16, fontWeight: 700, color: '#fff', marginBottom: 6 }}>All Caught Up</div>
          <div style={{ fontSize: 13, color: 'var(--text-muted, #666)' }}>No pending add money requests. New requests appear here automatically.</div>
        </div>
      </div>
    )
  }

  return (
    <div style={S.panel}>
      <h1 style={S.title}><i className="fa-solid fa-wallet" style={{ marginRight: 10, color: '#22c55e' }}></i>Add Money Requests</h1>

      <div style={{
        padding: '12px 18px', borderRadius: 12, marginBottom: 20,
        background: 'rgba(251,191,36,0.06)', border: '1px solid rgba(251,191,36,0.12)',
        display: 'flex', alignItems: 'flex-start', gap: 10,
      }}>
        <i className="fa-solid fa-triangle-exclamation" style={{ color: '#fbbf24', fontSize: 14, marginTop: 2, flexShrink: 0 }}></i>
        <div>
          <div style={{ fontFamily: 'var(--font-heading)', fontSize: 13, fontWeight: 600, color: '#fbbf24', marginBottom: 3 }}>Verify Before Approving</div>
          <div style={{ fontSize: 12, color: 'var(--text-muted, #888)', lineHeight: 1.5 }}>
            Check your {requests[0]?.method || 'bKash'} payment app to confirm the user actually sent the money. Match the Transaction ID (TXID) before approving.
          </div>
        </div>
      </div>

      {mobile ? (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
          {requests.map(req => {
            const isProcessing = processing === req.id
            return (
              <div key={req.id} style={{
                ...S.mCard, borderLeft: '3px solid #22c55e',
                opacity: isProcessing ? 0.5 : 1, pointerEvents: isProcessing ? 'none' : 'auto',
              }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 10 }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                    <div style={{
                      width: 32, height: 32, borderRadius: 8, flexShrink: 0,
                      background: 'rgba(34,197,94,0.12)', display: 'flex', alignItems: 'center', justifyContent: 'center',
                      fontFamily: 'var(--font-heading)', fontSize: 13, fontWeight: 700, color: '#22c55e',
                    }}>
                      {(req.username || '?').charAt(0)}
                    </div>
                    <div>
                      <div style={{ fontFamily: 'var(--font-heading)', fontWeight: 600, color: '#fff', fontSize: 13 }}>{req.username}</div>
                      {req.ign && <div style={{ fontSize: 10, color: 'var(--text-muted, #666)' }}>IGN: {req.ign}</div>}
                    </div>
                  </div>
                  <span style={{ fontFamily: 'var(--font-display)', fontWeight: 700, color: '#22c55e', fontSize: 18 }}>{formatTK(req.amount)}</span>
                </div>
                <div style={S.mRow}><span style={S.mLabel}>Method</span><span style={{ fontSize: 12, color: '#fff', fontWeight: 600 }}>{req.method}</span></div>
                <div style={S.mRow}><span style={S.mLabel}>TXID</span><span style={{ fontSize: 12, color: '#fbbf24', fontFamily: 'var(--font-display)', fontWeight: 700, letterSpacing: 0.5 }}>{req.txId || '—'}</span></div>
                {req.senderNumber && <div style={S.mRow}><span style={S.mLabel}>Sender #</span><span style={{ fontSize: 12, color: '#22c55e', fontFamily: 'var(--font-display)', fontWeight: 700 }}>{req.senderNumber}</span></div>}
                {req.phone && <div style={S.mRow}><span style={S.mLabel}>Registered</span><span style={{ fontSize: 12, color: 'var(--text-muted, #888)' }}>{req.phone}</span></div>}
                <div style={S.mRow}><span style={S.mLabel}>Time</span><span style={{ fontSize: 11, color: 'var(--text-muted, #666)' }}>{timeAgo(req.createdAt)}</span></div>
                <div style={{ display: 'flex', gap: 8, marginTop: 12, justifyContent: 'flex-end' }}>
                  <button
                    style={{ ...S.btnDanger, padding: '8px 16px', fontSize: 12, opacity: isProcessing ? 0.5 : 1 }}
                    onClick={() => handleReject(req)}
                    disabled={isProcessing}
                  >
                    <i className="fa-solid fa-xmark"></i> Reject
                  </button>
                  <button
                    style={{ ...S.btnSuccess, padding: '8px 16px', fontSize: 12, opacity: isProcessing ? 0.5 : 1 }}
                    onClick={() => handleApprove(req)}
                    disabled={isProcessing}
                  >
                    <i className="fa-solid fa-check"></i> Approve
                  </button>
                </div>
              </div>
            )
          })}
        </div>
      ) : (
        <div style={{ ...S.card }}>
          <table style={S.table}>
            <thead>
              <tr>
                <th style={S.th}>User</th>
                <th style={S.th}>Amount</th>
                <th style={S.th}>Method</th>
                <th style={S.th}>TXID</th>
                <th style={S.th}>Sender #</th>
                <th style={S.th}>Phone</th>
                <th style={S.th}>Time</th>
                <th style={{ ...S.th, textAlign: 'right' }}>Actions</th>
              </tr>
            </thead>
            <tbody>
              {requests.map(req => {
                const isProcessing = processing === req.id
                return (
                  <tr key={req.id} style={{ opacity: isProcessing ? 0.5 : 1 }}>
                    <td style={S.td}>
                      <div style={{ fontFamily: 'var(--font-heading)', fontWeight: 600, color: '#fff', fontSize: 12 }}>{req.username}</div>
                      {req.ign && <div style={{ fontSize: 10, color: 'var(--text-muted, #666)' }}>IGN: {req.ign}</div>}
                    </td>
                    <td style={{ ...S.td, fontFamily: 'var(--font-display)', fontWeight: 700, color: '#22c55e', fontSize: 14 }}>{formatTK(req.amount)}</td>
                    <td style={S.td}><span style={{ padding: '3px 8px', borderRadius: 6, fontSize: 10, fontWeight: 700, fontFamily: 'var(--font-heading)', background: 'rgba(34,197,94,0.1)', color: '#22c55e' }}>{req.method}</span></td>
                    <td style={{ ...S.td, fontFamily: 'var(--font-display)', fontWeight: 700, color: '#fbbf24', fontSize: 12, letterSpacing: 0.5 }}>{req.txId || '—'}</td>
                    <td style={{ ...S.td, fontSize: 12, color: '#22c55e', fontFamily: 'var(--font-display)', fontWeight: 700 }}>{req.senderNumber || '—'}</td>
                    <td style={{ ...S.td, fontSize: 12, color: 'var(--text-muted, #888)' }}>{req.phone || '—'}</td>
                    <td style={{ ...S.td, fontSize: 11, color: 'var(--text-muted, #666)' }}>{timeAgo(req.createdAt)}</td>
                    <td style={{ ...S.td, textAlign: 'right' }}>
                      <div style={{ display: 'flex', gap: 6, justifyContent: 'flex-end' }}>
                        <button style={{ ...S.btnDanger, opacity: isProcessing ? 0.5 : 1 }} onClick={() => handleReject(req)} disabled={isProcessing}>
                          <i className="fa-solid fa-xmark"></i> Reject
                        </button>
                        <button style={{ ...S.btnSuccess, opacity: isProcessing ? 0.5 : 1 }} onClick={() => handleApprove(req)} disabled={isProcessing}>
                          <i className="fa-solid fa-check"></i> Approve
                        </button>
                      </div>
                    </td>
                  </tr>
                )
              })}
            </tbody>
          </table>
        </div>
      )}
    </div>
  )
}

// ═══════════════════════════════════════
//  8. PAYMENT SETTINGS
// ═══════════════════════════════════════
function AdminPaymentSettings() {
  const { state, dispatch } = useApp()
  const { adminPayments } = state
  const [form, setForm] = useState({ bKash: adminPayments?.bKash || '', Nagad: adminPayments?.Nagad || '', Rocket: adminPayments?.Rocket || '' })
  const update = (k, v) => setForm(p => ({ ...p, [k]: v }))

  const handleSave = () => {
    const trimmed = { bKash: form.bKash.trim(), Nagad: form.Nagad.trim(), Rocket: form.Rocket.trim() }
    if (!trimmed.bKash && !trimmed.Nagad && !trimmed.Rocket) return showToast(dispatch, 'Enter at least one number!', 'error')
    dispatch({ type: 'UPDATE_ADMIN_PAYMENTS', payload: trimmed })
    adminAction(dispatch, 'Updated payment numbers', 'bKash/Nagad/Rocket', 'Payment numbers updated!', 'success')
  }

  const methods = [
    { key: 'bKash', label: 'bKash', color: '#e2136e', bg: 'rgba(226,19,110,0.08)', border: 'rgba(226,19,110,0.15)' },
    { key: 'Nagad', label: 'Nagad', color: '#f6921e', bg: 'rgba(246,146,30,0.08)', border: 'rgba(246,146,30,0.15)' },
    { key: 'Rocket', label: 'Rocket', color: '#8c3494', bg: 'rgba(140,52,148,0.08)', border: 'rgba(140,52,148,0.15)' },
  ]

  return (
    <div style={S.panel}>
      <h1 style={S.title}><i className="fa-solid fa-credit-card" style={{ marginRight: 10, color: '#fbbf24' }}></i>Payment Settings</h1>
      <div style={{ padding: '14px 18px', borderRadius: 14, marginBottom: 20, background: 'rgba(0,240,255,0.06)', border: '1px solid rgba(0,240,255,0.12)', display: 'flex', alignItems: 'flex-start', gap: 10 }}>
        <i className="fa-solid fa-circle-info" style={{ color: '#00f0ff', fontSize: 14, marginTop: 2, flexShrink: 0 }}></i>
        <div>
          <div style={{ fontFamily: 'var(--font-heading)', fontSize: 14, fontWeight: 600, color: '#fff', marginBottom: 4 }}>Where users send money</div>
          <div style={{ fontSize: 12, color: 'var(--text-muted, #888)' }}>These numbers appear in the Add Money modal.</div>
        </div>
      </div>
      <div style={{ display: 'flex', flexDirection: 'column', gap: 14, marginBottom: 20 }}>
        {methods.map(m => (
          <div key={m.key} style={{ padding: 18, borderRadius: 14, background: m.bg, border: `1px solid ${m.border}` }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 12 }}>
              <div style={{ width: 36, height: 36, borderRadius: 10, background: m.bg, border: `1px solid ${m.border}`, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                <i className="fa-solid fa-mobile-screen" style={{ fontSize: 16, color: m.color }}></i>
              </div>
              <div>
                <div style={{ fontFamily: 'var(--font-heading)', fontSize: 15, fontWeight: 700, color: m.color }}>{m.label}</div>
                <div style={{ fontSize: 10, color: 'var(--text-muted, #666)' }}>Users see this number</div>
              </div>
            </div>
            <input style={{ ...S.input, fontFamily: 'var(--font-display)', fontSize: 18, fontWeight: 700, letterSpacing: 2, textAlign: 'center', color: form[m.key] ? m.color : 'var(--text-muted, #555)', background: 'rgba(0,0,0,0.2)', border: `1px solid ${form[m.key] ? m.border : 'rgba(255,255,255,0.05)'}` }} placeholder="01XXXXXXXXX" value={form[m.key]} onChange={e => update(m.key, e.target.value)} />
          </div>
        ))}
      </div>
      <div style={{ ...S.card, marginBottom: 20 }}>
        <div style={{ ...S.cardHeader, background: 'rgba(251,191,36,0.04)' }}>
          <div style={S.cardHeaderIcon('#fbbf24')}><i className="fa-solid fa-eye" style={{ fontSize: 14, color: '#fbbf24' }}></i></div>
          <h3 style={S.cardHeaderTitle}>User Preview (Add Money Modal)</h3>
        </div>
        <div style={{ padding: 18, textAlign: 'center' }}>
          <div style={{ padding: '18px', borderRadius: 14, background: 'rgba(0,240,255,0.04)', border: '1px solid rgba(0,240,255,0.08)' }}>
            <div style={{ fontSize: 10, fontWeight: 700, fontFamily: 'var(--font-heading)', letterSpacing: 1, textTransform: 'uppercase', color: 'var(--text-muted, #777)', marginBottom: 6 }}>
              <i className="fa-solid fa-paper-plane" style={{ marginRight: 4 }}></i>Send Money To
            </div>
            <div style={{ fontFamily: 'var(--font-display)', fontSize: 24, fontWeight: 800, color: '#00f0ff', letterSpacing: 2, textShadow: '0 0 20px rgba(0,240,255,0.25)', wordBreak: 'break-all' }}>
              {form.bKash || 'Not set by admin'}
            </div>
            <div style={{ fontSize: 11, color: 'var(--text-muted, #888)', marginTop: 4 }}>via bKash</div>
          </div>
        </div>
      </div>
      <button style={{ ...S.btnPrimary, background: 'linear-gradient(135deg, #fbbf24, #f59e0b)', boxShadow: '0 4px 20px rgba(251,191,36,0.3)' }} onClick={handleSave}>
        <i className="fa-solid fa-floppy-disk"></i> Save Payment Numbers
      </button>
    </div>
  )
}

// ═══════════════════════════════════════
//  9. OWNER PANEL
// ═══════════════════════════════════════
function AdminOwnerPanel() {
  const { state, dispatch } = useApp()
  const { users } = state
  const mobile = useIsMobile()
  const [editingId, setEditingId] = useState(null)
  const [editPerms, setEditPerms] = useState([])

  const admins = users.filter(u => u.role === 'admin' || u.role === 'owner')
  const regularUsers = users.filter(u => u.role === 'user')

  const startEditPerms = (adminUser) => {
    setEditingId(adminUser.id)
    setEditPerms([...(adminUser.permissions || [])])
  }
  const savePerms = () => {
    dispatch({ type: 'ASSIGN_PERMISSIONS', payload: { userId: editingId, permissions: editPerms } })
    adminAction(dispatch, 'Updated permissions', users.find(u => u.id === editingId)?.name, 'Permissions saved!', 'success')
    setEditingId(null)
  }
  const togglePerm = (key) => setEditPerms(p => p.includes(key) ? p.filter(k => k !== key) : [...p, key])

  const promote = (userId) => {
    dispatch({ type: 'PROMOTE_TO_ADMIN', payload: userId })
    const u = users.find(x => x.id === userId)
    adminAction(dispatch, 'Promoted to admin', u?.name || u?.displayName, `${u?.name || u?.displayName} promoted to admin`, 'success')
  }
  const demote = (userId) => {
    dispatch({ type: 'DEMOTE_TO_USER', payload: userId })
    const u = users.find(x => x.id === userId)
    adminAction(dispatch, 'Demoted to user', u?.name || u?.displayName, `${u?.name || u?.displayName} demoted to user`, 'error')
    if (editingId === userId) setEditingId(null)
  }
  const forcePwChange = (userId) => {
    dispatch({ type: 'FORCE_PASSWORD_CHANGE', payload: userId })
    const u = users.find(x => x.id === userId)
    adminAction(dispatch, 'Force password change', u?.name || u?.displayName, `Password reset required for ${u?.name || u?.displayName}`, 'success')
  }

  return (
    <div style={S.panel}>
      <h1 style={S.title}><i className="fa-solid fa-crown" style={{ marginRight: 10, color: '#fbbf24' }}></i>Owner Control Panel</h1>

      <div style={{ marginBottom: 28 }}>
        <h2 style={{ fontFamily: 'var(--font-heading)', fontSize: 16, fontWeight: 700, color: '#fff', margin: '0 0 14px' }}>
          Admins & Their Permissions <span style={{ marginLeft: 8, fontSize: 11, color: '#fbbf24', fontFamily: 'var(--font-display)', fontWeight: 700 }}>({admins.length})</span>
        </h2>
        {admins.map(admin => (
          <div key={admin.id} style={{ ...S.card, marginBottom: 12, borderLeft: admin.role === 'owner' ? '3px solid #fbbf24' : '3px solid #ef4444' }}>
            <div style={{ padding: mobile ? 14 : '16px 18px' }}>
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: editingId === admin.id ? 14 : 0, flexWrap: 'wrap', gap: 8 }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: mobile ? 10 : 12, flex: 1, minWidth: 0 }}>
                  <div style={{ width: mobile ? 36 : 40, height: mobile ? 36 : 40, borderRadius: 10, flexShrink: 0, background: admin.role === 'owner' ? 'rgba(251,191,36,0.15)' : 'rgba(239,68,68,0.12)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontFamily: 'var(--font-heading)', fontSize: mobile ? 14 : 16, fontWeight: 800, color: admin.role === 'owner' ? '#fbbf24' : '#ef4444' }}>
                    {(admin.name || admin.displayName || '?').charAt(0)}
                  </div>
                  <div style={{ minWidth: 0 }}>
                    <div style={{ fontFamily: 'var(--font-heading)', fontSize: mobile ? 13 : 14, fontWeight: 700, color: '#fff', wordBreak: 'break-word' }}>
                      {admin.name || admin.displayName}
                      <span style={{ marginLeft: 6, fontSize: 9, padding: '2px 8px', borderRadius: 4, fontWeight: 700, background: admin.role === 'owner' ? 'rgba(251,191,36,0.12)' : 'rgba(239,68,68,0.1)', color: admin.role === 'owner' ? '#fbbf24' : '#ef4444' }}>
                        {admin.role === 'owner' ? 'OWNER' : 'ADMIN'}
                      </span>
                    </div>
                    <div style={{ fontSize: 11, color: 'var(--text-muted, #666)' }}>@{admin.username} — {admin.permissions?.length || 0} permissions</div>
                  </div>
                </div>
                {admin.role !== 'owner' && (
                  <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap' }}>
                    <button style={{ ...S.btnGhost, fontSize: 10, padding: '6px 10px' }} onClick={() => startEditPerms(admin)}><i className="fa-solid fa-shield-halved"></i> Perms</button>
                    <button style={{ ...S.btnGhost, fontSize: 10, padding: '6px 10px' }} onClick={() => forcePwChange(admin.id)}><i className="fa-solid fa-key"></i> PW</button>
                    <button style={{ ...S.btnDanger, fontSize: 10, padding: '6px 10px' }} onClick={() => demote(admin.id)}><i className="fa-solid fa-arrow-down"></i> Demote</button>
                  </div>
                )}
              </div>

              {editingId === admin.id && (
                <div style={{ padding: 14, background: 'rgba(255,255,255,0.02)', borderRadius: 12, border: '1px solid rgba(255,255,255,0.06)' }}>
                  <div style={{ fontSize: 10, fontWeight: 700, fontFamily: 'var(--font-heading)', color: 'var(--text-muted, #777)', letterSpacing: 1, textTransform: 'uppercase', marginBottom: 10 }}>Toggle Permissions</div>
                  <div style={{ display: 'grid', gridTemplateColumns: mobile ? '1fr' : 'repeat(auto-fill, minmax(220px, 1fr))', gap: 8, marginBottom: 14 }}>
                    {ALL_PERMISSIONS.map(p => {
                      const on = editPerms.includes(p.key)
                      return (
                        <div key={p.key} onClick={() => togglePerm(p.key)} style={{ display: 'flex', alignItems: 'center', gap: 10, padding: '10px 14px', borderRadius: 8, cursor: 'pointer', background: on ? p.color + '10' : 'transparent', border: `1px solid ${on ? p.color + '30' : 'rgba(255,255,255,0.04)'}`, transition: 'all 0.2s' }}>
                          <div style={{ width: 36, height: 20, borderRadius: 10, background: on ? p.color : 'rgba(255,255,255,0.1)', position: 'relative', transition: 'all 0.3s', flexShrink: 0 }}>
                            <div style={{ width: 16, height: 16, borderRadius: '50%', background: '#fff', position: 'absolute', top: 2, left: on ? 18 : 2, transition: 'left 0.3s', boxShadow: '0 2px 4px rgba(0,0,0,0.3)' }}></div>
                          </div>
                          <span style={{ fontSize: 12, fontWeight: 600, color: on ? p.color : 'var(--text-muted, #777)', fontFamily: 'var(--font-heading)' }}>{p.label}</span>
                        </div>
                      )
                    })}
                  </div>
                  <div style={{ display: 'flex', gap: 8, justifyContent: 'flex-end' }}>
                    <button style={S.btnGhost} onClick={() => setEditingId(null)}>Cancel</button>
                    <button style={{ ...S.btnGhost, background: 'rgba(34,197,94,0.12)', color: '#22c55e', borderColor: 'rgba(34,197,94,0.2)' }} onClick={savePerms}><i className="fa-solid fa-save"></i> Save</button>
                  </div>
                </div>
              )}

              {editingId !== admin.id && admin.permissions && admin.permissions.length > 0 && (
                <div style={{ display: 'flex', flexWrap: 'wrap', gap: 6 }}>
                  {admin.permissions.map(pk => {
                    const permDef = ALL_PERMISSIONS.find(p => p.key === pk)
                    return permDef ? (
                      <span key={pk} style={{ padding: '3px 10px', borderRadius: 6, fontSize: 10, fontWeight: 600, fontFamily: 'var(--font-heading)', background: permDef.color + '10', color: permDef.color, border: `1px solid ${permDef.color}20` }}>
                        <i className={`fa-solid ${permDef.icon}`} style={{ marginRight: 4, fontSize: 9 }}></i>{permDef.label}
                      </span>
                    ) : null
                  })}
                </div>
              )}
              {editingId !== admin.id && (!admin.permissions || admin.permissions.length === 0) && admin.role !== 'owner' && (
                <div style={{ fontSize: 11, color: 'var(--text-muted, #555)', fontStyle: 'italic' }}>No permissions assigned — this admin can only see Overview</div>
              )}
            </div>
          </div>
        ))}
      </div>

      <div>
        <h2 style={{ fontFamily: 'var(--font-heading)', fontSize: 16, fontWeight: 700, color: '#fff', margin: '0 0 14px' }}>
          Promote to Admin <span style={{ marginLeft: 8, fontSize: 11, color: '#6c8cff', fontFamily: 'var(--font-display)', fontWeight: 700 }}>({regularUsers.length} users)</span>
        </h2>
        {mobile ? (
          <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
            {regularUsers.filter(u => !u.banned).slice(0, 15).map(u => (
              <div key={u.id} style={S.mCard}>
                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 8, flex: 1, minWidth: 0 }}>
                    <div style={{ width: 28, height: 28, borderRadius: 6, flexShrink: 0, background: 'rgba(108,140,255,0.15)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontFamily: 'var(--font-heading)', fontSize: 11, fontWeight: 700, color: '#6c8cff' }}>{(u.name || u.displayName || '?').charAt(0)}</div>
                    <div style={{ minWidth: 0 }}>
                      <div style={{ fontFamily: 'var(--font-heading)', fontWeight: 600, color: '#fff', fontSize: 12, wordBreak: 'break-word' }}>{u.name || u.displayName}</div>
                      <div style={{ fontSize: 10, color: 'var(--text-muted, #888)' }}>{u.ign || '—'} • {formatTK(u.balance ?? u.wallet ?? 0)}</div>
                    </div>
                  </div>
                  <button style={{ ...S.btnGhost, background: 'rgba(251,191,36,0.1)', color: '#fbbf24', borderColor: 'rgba(251,191,36,0.2)', fontSize: 10, padding: '6px 10px', flexShrink: 0, marginLeft: 8 }} onClick={() => promote(u.id)}>
                    <i className="fa-solid fa-arrow-up"></i> Promote
                  </button>
                </div>
              </div>
            ))}
          </div>
        ) : (
          <div style={{ ...S.card }}>
            <table style={S.table}>
              <thead><tr><th style={S.th}>User</th><th style={S.th}>IGN</th><th style={S.th}>Balance</th><th style={S.th}>Status</th><th style={S.th}>Action</th></tr></thead>
              <tbody>
                {regularUsers.filter(u => !u.banned).slice(0, 15).map(u => (
                  <tr key={u.id}>
                    <td style={S.td}>
                      <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                        <div style={{ width: 28, height: 28, borderRadius: 6, flexShrink: 0, background: 'rgba(108,140,255,0.15)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontFamily: 'var(--font-heading)', fontSize: 11, fontWeight: 700, color: '#6c8cff' }}>{(u.name || u.displayName || '?').charAt(0)}</div>
                        <span style={{ fontFamily: 'var(--font-heading)', fontWeight: 600, color: '#fff', fontSize: 12 }}>{u.name || u.displayName}</span>
                      </div>
                    </td>
                    <td style={{ ...S.td, fontSize: 11, color: 'var(--text-muted, #888)' }}>{u.ign || '—'}</td>
                    <td style={{ ...S.td, fontFamily: 'var(--font-display)', fontWeight: 600, fontSize: 12, color: '#fbbf24' }}>{formatTK(u.balance ?? u.wallet ?? 0)}</td>
                    <td style={S.td}><span style={{ padding: '2px 8px', borderRadius: 4, fontSize: 9, fontWeight: 700, fontFamily: 'var(--font-heading)', background: 'rgba(34,197,94,0.1)', color: '#22c55e' }}>ACTIVE</span></td>
                    <td style={S.td}>
                      <button style={{ ...S.btnGhost, background: 'rgba(251,191,36,0.1)', color: '#fbbf24', borderColor: 'rgba(251,191,36,0.2)' }} onClick={() => promote(u.id)}>
                        <i className="fa-solid fa-arrow-up"></i> Promote
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  )
}

// ═══════════════════════════════════════
//  10. ACTIVITY LOG
// ═══════════════════════════════════════
function AdminActivityLog() {
  const { state } = useApp()
  const { activityLog } = state

  return (
    <div style={S.panel}>
      <h1 style={S.title}><i className="fa-solid fa-clock-rotate-left" style={{ marginRight: 10, color: '#6c8cff' }}></i>Activity Log</h1>
      <div style={{ ...S.card }}>
        <div style={{ ...S.cardHeader, background: 'rgba(108,140,255,0.04)' }}>
          <div style={S.cardHeaderIcon('#6c8cff')}><i className="fa-solid fa-list" style={{ fontSize: 14, color: '#6c8cff' }}></i></div>
          <h3 style={S.cardHeaderTitle}>All Admin Actions</h3>
          <span style={{ marginLeft: 'auto', fontSize: 10, color: 'var(--text-muted, #555)' }}>{(activityLog || []).length} entries</span>
        </div>
        {!(activityLog || []).length ? (
          <div style={{ textAlign: 'center', padding: 40, color: 'var(--text-muted, #555)', fontSize: 13 }}>No activity logged yet</div>
        ) : (
          <div style={{ maxHeight: 600, overflowY: 'auto' }}>
            {activityLog.map(log => (
              <div key={log.id} style={{ padding: '12px 18px', borderBottom: '1px solid rgba(255,255,255,0.03)', display: 'flex', alignItems: 'flex-start', gap: 12 }}>
                <div style={{ width: 8, height: 8, borderRadius: '50%', background: log.adminRole === 'owner' ? '#fbbf24' : '#6c8cff', marginTop: 5, flexShrink: 0 }}></div>
                <div style={{ flex: 1, minWidth: 0 }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 2, flexWrap: 'wrap' }}>
                    <span style={{ fontFamily: 'var(--font-heading)', fontSize: 12, fontWeight: 700, color: '#fff' }}>{log.adminName}</span>
                    <span style={{ fontSize: 9, padding: '1px 6px', borderRadius: 3, fontWeight: 700, fontFamily: 'var(--font-display)', background: log.adminRole === 'owner' ? 'rgba(251,191,36,0.1)' : 'rgba(108,140,255,0.1)', color: log.adminRole === 'owner' ? '#fbbf24' : '#6c8cff' }}>
                      {(log.adminRole || '').toUpperCase()}
                    </span>
                  </div>
                  <div style={{ fontSize: 12, color: 'var(--text-muted, #aaa)', wordBreak: 'break-word' }}>
                    {log.action}{log.target ? ` — ${log.target}` : ''}
                  </div>
                </div>
                <div style={{ fontSize: 10, color: 'var(--text-muted, #555)', whiteSpace: 'nowrap', flexShrink: 0 }}>
                  {log.createdAt ? new Date(log.createdAt.replace(' ', 'T')).toLocaleString('en-GB', { day: '2-digit', month: 'short', hour: '2-digit', minute: '2-digit' }) : '—'}
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  )
}

// ═══════════════════════════════════════
//  MAIN ADMIN LAYOUT
// ═══════════════════════════════════════
const ADMIN_TABS = [
  { id: 'admin-overview', label: 'Overview', icon: 'fa-chart-pie', color: '#00f0ff' },
  { id: 'admin-create', label: 'Create Match', icon: 'fa-circle-plus', color: '#a78bfa' },
  { id: 'admin-rooms', label: 'Rooms', icon: 'fa-key', color: '#fbbf24' },
  { id: 'admin-results', label: 'Results', icon: 'fa-clipboard-check', color: '#22c55e' },
  { id: 'admin-users', label: 'Users', icon: 'fa-users-gear', color: '#6c8cff' },
  { id: 'admin-finance', label: 'Finance', icon: 'fa-money-bill-transfer', color: '#ef4444', badge: (state.pendingAddMoneyRequests || []).length + (state.pendingWithdrawals || []).length },
  { id: 'admin-add-money', label: 'Add Money', icon: 'fa-wallet', color: '#22c55e' },
  { id: 'admin-payments', label: 'Payments', icon: 'fa-credit-card', color: '#f59e0b' },
  { id: 'admin-owners', label: 'Owner Panel', icon: 'fa-crown', color: '#fbbf24' },
  { id: 'admin-activity', label: 'Activity Log', icon: 'fa-clock-rotate-left', color: '#6c8cff' },
]

const VALID_ADMIN_TABS = new Set(ADMIN_TABS.map(t => t.id))

export default function Admin() {
  const { state, navigate } = useApp()
  const mobile = useIsMobile()

  // ── Permission system ──
  const currentUser = state.currentUser || state.users.find(u => u.id === state.currentUserId)
  const userPerms = currentUser?.permissions || []
  const isOwner = currentUser?.role === 'owner'

  function canAccess(tabId) {
    if (isOwner) return true
    const perm = PERM_MAP[tabId]
    if (perm === null) return true        // overview — always visible
    if (perm === '__owner__') return false // owner-only tabs
    return userPerms.includes(perm)
  }

  const visibleTabs = ADMIN_TABS.filter(t => canAccess(t.id))
  const activeTab = VALID_ADMIN_TABS.has(state.currentView) ? state.currentView : 'admin-overview'
  const handleTab = (id) => navigate(id)

  return (
    <div style={{ padding: '0 0 20px 0' }}>
      {/* Desktop tabs — only show accessible ones */}
      {!mobile && (
        <div style={{
          display: 'flex',
          gap: 6,
          marginBottom: 24,
          overflowX: 'auto',
          paddingBottom: 4,
          scrollbarWidth: 'none',
        }}>
          {visibleTabs.map(t => {
            const active = activeTab === t.id
            return (
              <button
                key={t.id}
                onClick={() => handleTab(t.id)}
                style={{
                  position: 'relative',
                  display: 'inline-flex',
                  alignItems: 'center',
                  gap: 7,
                  padding: '10px 16px',
                  borderRadius: 10,
                  cursor: 'pointer',
                  whiteSpace: 'nowrap',
                  minWidth: 'fit-content',
                  flexShrink: 0,
                  fontSize: 12,
                  fontWeight: 700,
                  fontFamily: 'var(--font-heading)',
                  background: active ? (t.color + '20') : 'rgba(255,255,255,0.03)',
                  color: active ? t.color : '#666',
                  border: '1px solid ' + (active ? (t.color + '40') : 'rgba(255,255,255,0.05)'),
                  boxShadow: active ? ('0 4px 16px ' + t.color + '12') : 'none',
                  transition: 'all 0.3s ease',
                }}
              >
                {active && (
                  <div style={{
                    position: 'absolute',
                    top: 0,
                    left: '50%',
                    transform: 'translateX(-50%)',
                    width: 22,
                    height: 2.5,
                    borderRadius: '0 0 3px 3px',
                    background: t.color,
                    boxShadow: `0 2px 12px ${t.color}60`,
                  }} />
                )}
                <i className={'fa-solid ' + t.icon} style={{ fontSize: 12 }}></i>
                {t.label}
                {t.badge > 0 && (
                  <span style={{
                    padding: '1px 7px', borderRadius: 8, fontSize: 9, fontWeight: 700,
                    fontFamily: 'var(--font-display)', background: t.color + '25', color: t.color,
                    marginLeft: 2,
                  }}>{t.badge}</span>
                )}
              </button>
            )
          })}
        </div>
      )}

      {/* Tab content — guard each with canAccess */}
      {activeTab === 'admin-overview' && canAccess('admin-overview') && <AdminOverview />}
      {activeTab === 'admin-create' && canAccess('admin-create') && <AdminCreateMatch />}
      {activeTab === 'admin-rooms' && canAccess('admin-rooms') && <AdminRooms />}
      {activeTab === 'admin-results' && canAccess('admin-results') && <AdminResults />}
      {activeTab === 'admin-users' && canAccess('admin-users') && <AdminUsers />}
      {activeTab === 'admin-finance' && canAccess('admin-finance') && <AdminFinance />}
      {activeTab === 'admin-add-money' && canAccess('admin-add-money') && <AdminAddMoneyRequests />}
      {activeTab === 'admin-payments' && canAccess('admin-payments') && <AdminPaymentSettings />}
      {activeTab === 'admin-owners' && canAccess('admin-owners') && <AdminOwnerPanel />}
      {activeTab === 'admin-activity' && canAccess('admin-activity') && <AdminActivityLog />}

      {/* Locked fallback */}
      {!canAccess(activeTab) && (
        <div style={{ textAlign: 'center', padding: '60px 20px' }}>
          <i className="fa-solid fa-lock" style={{ fontSize: 48, color: '#555', marginBottom: 16, display: 'block' }}></i>
          <h3 style={{ fontFamily: 'var(--font-heading)', fontSize: 18, fontWeight: 700, color: '#fff', margin: '0 0 8px' }}>No Access</h3>
          <p style={{ fontSize: 13, color: '#666', maxWidth: 280, margin: '0 auto 20px' }}>
            You don't have permission to view this section.
            Contact the Owner to get access.
          </p>
          <button onClick={() => navigate('admin-overview')} style={S.btnGhost}>
            <i className="fa-solid fa-arrow-left"></i> Back to Overview
          </button>
        </div>
      )}
    </div>
  )
}