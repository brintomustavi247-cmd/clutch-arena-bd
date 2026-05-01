import { useState, useEffect, useMemo } from 'react'
import { useApp } from '../context'
import { formatTK, formatTKShort, calculateMatchEconomics, calculateResultPrize, calculateAllResultPrizes, getRoomUnlockCountdown, maxSlotsForMode, showToast } from '../utils'
import { approveAddMoneyRequest, rejectAddMoneyRequest, getPlatformProfitStats } from "../database"
import { FF_MAPS, FF_MODES, FF_GAME_TYPES, KILL_REWARDS, RESULT_METHODS } from '../data'

// ★ Inline fallback — remove this after updating utils.js
function isTeamMode(mode) {
 return mode === 'Duo' || mode === 'Squad' || mode === 'Clash Squad'
}
function modeColor(mode) {
 return { Solo: '#6c8cff', Duo: '#fbbf24', Squad: '#a78bfa', 'Clash Squad': '#f87171' }[mode] || '#6c8cff'
}

// ═══════════════════════════════════════
// PERMISSION MAP
// ═══════════════════════════════════════
const PERM_MAP = {
 'admin-overview': null,
 'admin-profit': 'finance', // ═══ v5.0: Profit dashboard
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
// HOOK: detect mobile
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
// SHARED STYLES
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
// V5.0: PROFIT DASHBOARD — FINANCIAL CONTROL
// ═══════════════════════════════════════
function AdminProfit() {
 const { state } = useApp()
 const { profitStats } = state
 const mobile = useIsMobile()
 const [loading, setLoading] = useState(false)
 const [localStats, setLocalStats] = useState(null)

 useEffect(() => {
 if (profitStats) {
 setLocalStats(profitStats)
 return
 }
 async function load() {
 setLoading(true)
 try {
 const stats = await getPlatformProfitStats()
 setLocalStats(stats)
 } catch (err) {
 console.error('Failed to load profit stats:', err)
 }
 setLoading(false)
 }
 load()
 }, [profitStats])

 const stats = profitStats || localStats

 const exportCSV = () => {
 if (!stats) return
 const rows = [
 ['CLUTCH ARENA BD — FINANCIAL REPORT'],
 ['Generated', new Date().toLocaleString('en-BD')],
 [''],
 ['TODAY\'S DATA'],
 ['Matches Created', stats.today.matchesCreated],
 ['Full Matches', stats.today.fullMatches],
 ['Total Entry Fees', stats.today.totalEntryFees],
 ['Admin Profit (20%)', stats.today.adminProfit],
 ['Prize Pool Paid', stats.today.prizePoolPaid],
 ['Cancellation Refunds', stats.today.cancellationRefunds],
 [''],
 ['SPENDING TRACKER'],
 ['Referral Payouts', stats.today.referralPayouts],
 ['Ad Rewards', stats.today.adRewards],
 ['Spin Payouts', stats.today.spinPayouts],
 ['Total Spendings', stats.today.totalSpendings],
 [''],
 ['NET PROFIT', stats.today.netProfit],
 [''],
 ['MONTHLY DATA'],
 ['Total Revenue', stats.month.totalRevenue],
 ['Total Spendings', stats.month.totalSpendings],
 ['Net Profit', stats.month.netProfit],
 ['Ad Revenue Estimate ($)', stats.month.adRevenueEstimate],
 [''],
 ['FUND STATUS'],
 ['Total User Balance', stats.funds.totalUserBalance],
 ['Total Locked Balance', stats.funds.totalLockedBalance],
 ['Active Escrow', stats.funds.activeEscrow],
 ['Pending Withdrawals', stats.funds.pendingWithdrawals],
 ['Total Platform Value', stats.funds.totalPlatformValue],
 ]
 const csv = rows.map(r => r.join(',')).join('\n')
 const blob = new Blob([csv], { type: 'text/csv' })
 const url = URL.createObjectURL(blob)
 const a = document.createElement('a')
 a.href = url
 a.download = `clutch-profit-${new Date().toISOString().split('T')[0]}.csv`
 a.click()
 URL.revokeObjectURL(url)
 }

 if (loading && !stats) {
 return (
  <div style={S.panel}>
   <h2 style={S.title}>Financial Control</h2>
   <div className="loading-spinner">Loading financial data...</div>
  </div>
 )
 }

 if (!stats) {
 return (
  <div style={S.panel}>
   <h2 style={S.title}>Financial Control</h2>
   <p style={{ color: 'var(--text-muted)' }}>Unable to load profit data</p>
  </div>
 )
 }

 const { today, month, funds, alerts } = stats

 const CardGrid = ({ cards }) => (
  <div style={{ display: 'grid', gridTemplateColumns: mobile ? '1fr 1fr' : 'repeat(4, 1fr)', gap: 12, marginBottom: 20 }}>
   {cards.map((c, i) => (
    <div key={i} style={{ background: 'rgba(255,255,255,0.02)', border: `1px solid ${c.highlight ? 'rgba(34,197,94,0.15)' : 'rgba(255,255,255,0.06)'}`, borderRadius: 12, padding: 16, transition: 'all 0.2s', cursor: 'default' }}
     onMouseEnter={e => { e.currentTarget.style.borderColor = c.color + '40'; e.currentTarget.style.boxShadow = `0 4px 20px ${c.color}10` }}
     onMouseLeave={e => { e.currentTarget.style.borderColor = c.highlight ? 'rgba(34,197,94,0.15)' : 'rgba(255,255,255,0.06)'; e.currentTarget.style.boxShadow = 'none' }}
    >
     <div style={{ fontSize: 10, fontWeight: 700, textTransform: 'uppercase', letterSpacing: 0.1, color: 'var(--text-muted)', marginBottom: 8 }}>{c.label}</div>
     <div style={{ fontSize: 20, fontWeight: 900, color: c.highlight ? '#22c55e' : '#fff', fontFamily: 'var(--font-number)' }}>{c.value}</div>
    </div>
   ))}
  </div>
 )

 const profitCards = [
 { label: 'Matches Created', value: today.matchesCreated, icon: 'fa-gamepad', color: '#6c8cff' },
 { label: 'Full Matches', value: today.fullMatches, icon: 'fa-users', color: '#a78bfa' },
 { label: 'Total Entry Fees', value: formatTK(today.totalEntryFees), icon: 'fa-sack-dollar', color: '#fbbf24' },
 { label: 'Your 20% Profit', value: formatTK(today.adminProfit), icon: 'fa-chart-line', color: '#22c55e', highlight: true },
 { label: 'Prize Pool Paid', value: formatTK(today.prizePoolPaid), icon: 'fa-trophy', color: '#a78bfa' },
 { label: 'Cancellation Refunds', value: formatTK(today.cancellationRefunds), icon: 'fa-rotate-left', color: '#f87171' },
 ]

 const spendingCards = [
 { label: 'Referral Payouts', value: formatTK(today.referralPayouts), icon: 'fa-user-plus', color: '#6c8cff' },
 { label: 'Ad Rewards to Users', value: formatTK(today.adRewards), icon: 'fa-ad', color: '#fbbf24' },
 { label: 'Spin Payouts', value: formatTK(today.spinPayouts), icon: 'fa-dice', color: '#a78bfa' },
 { label: 'Total Spendings', value: formatTK(today.totalSpendings), icon: 'fa-money-bill-transfer', color: '#ef4444', highlight: true },
 ]

 const fundCards = [
 { label: 'Available Balance', value: formatTK(funds.totalUserBalance), icon: 'fa-wallet', color: '#22c55e' },
 { label: 'Held in Escrow', value: formatTK(funds.activeEscrow), icon: 'fa-vault', color: '#00f0ff' },
 { label: 'Pending Withdrawals', value: formatTK(funds.pendingWithdrawals), icon: 'fa-hourglass-half', color: '#fbbf24' },
 { label: 'Total Platform Value', value: formatTK(funds.totalPlatformValue), icon: 'fa-building-columns', color: '#a78bfa', highlight: true },
 ]

 return (
  <div style={S.panel}>
   <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 20 }}>
    <h2 style={S.title}>Financial Control</h2>
    <button onClick={exportCSV} style={{ ...S.btnGhost, color: '#22c55e' }}>
     <i className="fa-solid fa-download"></i> Export CSV
    </button>
   </div>

   {/* Alerts */}
   {alerts.length > 0 && (
    <div style={{ marginBottom: 16 }}>
     {alerts.map((alert, i) => (
      <div key={i} style={{ background: 'rgba(239,68,68,0.08)', border: '1px solid rgba(239,68,68,0.2)', borderRadius: 10, padding: '10px 14px', marginBottom: 8, fontSize: 12, color: '#f87171' }}>
       <i className="fa-solid fa-triangle-exclamation" style={{ marginRight: 8 }}></i>
       {alert.message}
      </div>
     ))}
    </div>
   )}

   {/* Today's Live Data */}
   <div style={{ ...S.card, marginBottom: 20 }}>
    <div style={S.cardHeader}>
     <div style={S.cardHeaderIcon('#6c8cff')}><i className="fa-solid fa-calendar-day" style={{ color: '#6c8cff' }}></i></div>
     <h3 style={S.cardHeaderTitle}>Today's Live Data</h3>
     <span style={{ marginLeft: 'auto', fontSize: 11, color: 'var(--text-muted)' }}>{new Date().toLocaleDateString('en-BD')}</span>
    </div>
    <div style={{ padding: 16 }}>
     <CardGrid cards={profitCards} />
    </div>
   </div>

   {/* Spending Tracker */}
   <div style={{ ...S.card, marginBottom: 20 }}>
    <div style={S.cardHeader}>
     <div style={S.cardHeaderIcon('#ef4444')}><i className="fa-solid fa-money-bill-transfer" style={{ color: '#ef4444' }}></i></div>
     <h3 style={S.cardHeaderTitle}>Spending Tracker</h3>
    </div>
    <div style={{ padding: 16 }}>
     <CardGrid cards={spendingCards} />
    </div>
   </div>

   {/* Net Profit — Big Card */}
   <div style={{ background: 'linear-gradient(135deg, rgba(34,197,94,0.1), rgba(6,182,212,0.1))', border: '1px solid rgba(34,197,94,0.2)', borderRadius: 16, padding: 24, marginBottom: 20, textAlign: 'center' }}>
    <div style={{ fontSize: 12, fontWeight: 700, textTransform: 'uppercase', letterSpacing: 0.15, color: '#22c55e', marginBottom: 8 }}>Net Profit Today</div>
    <div style={{ fontSize: 36, fontWeight: 900, color: '#22c55e', fontFamily: 'var(--font-number)', letterSpacing: '-0.03em' }}>{formatTK(today.netProfit)}</div>
    <div style={{ display: 'flex', justifyContent: 'center', gap: 24, marginTop: 12, fontSize: 12, color: 'var(--text-muted)' }}>
     <span>Gross Profit {formatTK(today.adminProfit)}</span>
     <span>Total Spendings −{formatTK(today.totalSpendings)}</span>
    </div>
   </div>

   {/* Monthly Data */}
   <div style={{ ...S.card, marginBottom: 20 }}>
    <div style={S.cardHeader}>
     <div style={S.cardHeaderIcon('#a78bfa')}><i className="fa-solid fa-chart-column" style={{ color: '#a78bfa' }}></i></div>
     <h3 style={S.cardHeaderTitle}>This Month</h3>
     <span style={{ marginLeft: 'auto', fontSize: 11, color: 'var(--text-muted)' }}>{new Date().toLocaleDateString('en-BD', { month: 'long', year: 'numeric' })}</span>
    </div>
    <div style={{ padding: 16 }}>
     <div style={{ display: 'grid', gridTemplateColumns: mobile ? '1fr 1fr' : 'repeat(4, 1fr)', gap: 16 }}>
      <div>
       <div style={{ fontSize: 10, color: 'var(--text-muted)', marginBottom: 4, textTransform: 'uppercase', fontWeight: 700 }}>Total Revenue</div>
       <div style={{ fontSize: 18, fontWeight: 900, color: '#fff' }}>{formatTK(month.totalRevenue)}</div>
      </div>
      <div>
       <div style={{ fontSize: 10, color: 'var(--text-muted)', marginBottom: 4, textTransform: 'uppercase', fontWeight: 700 }}>Total Spendings</div>
       <div style={{ fontSize: 18, fontWeight: 900, color: '#ef4444' }}>{formatTK(month.totalSpendings)}</div>
      </div>
      <div>
       <div style={{ fontSize: 10, color: 'var(--text-muted)', marginBottom: 4, textTransform: 'uppercase', fontWeight: 700 }}>Net Profit</div>
       <div style={{ fontSize: 18, fontWeight: 900, color: '#22c55e' }}>{formatTK(month.netProfit)}</div>
      </div>
      <div>
       <div style={{ fontSize: 10, color: 'var(--text-muted)', marginBottom: 4, textTransform: 'uppercase', fontWeight: 700 }}>Ad Revenue (Est.)</div>
       <div style={{ fontSize: 18, fontWeight: 900, color: '#fbbf24' }}>${month.adRevenueEstimate}</div>
      </div>
     </div>
    </div>
   </div>

   {/* Fund Status */}
   <div style={{ ...S.card, marginBottom: 20 }}>
    <div style={S.cardHeader}>
     <div style={S.cardHeaderIcon('#00f0ff')}><i className="fa-solid fa-building-columns" style={{ color: '#00f0ff' }}></i></div>
     <h3 style={S.cardHeaderTitle}>Total Fund Status</h3>
    </div>
    <div style={{ padding: 16 }}>
     <CardGrid cards={fundCards} />
    </div>
   </div>

   {/* Auto-refresh indicator */}
   <div style={{ textAlign: 'center', fontSize: 11, color: 'var(--text-muted)', marginTop: 10 }}>
    <i className="fa-solid fa-rotate" style={{ marginRight: 6, animation: 'spin 2s linear infinite' }}></i>
    Auto-refreshes every 30 seconds
   </div>
  </div>
 )
}

// ═══════════════════════════════════════
// 1. OVERVIEW
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
   <h2 style={S.title}>Dashboard Overview</h2>
   <div style={{ display: 'grid', gridTemplateColumns: mobile ? '1fr 1fr' : 'repeat(auto-fill, minmax(200px, 1fr))', gap: 12 }}>
    {stats.map((s, i) => (
     <div key={i} style={{ background: 'rgba(255,255,255,0.02)', border: '1px solid rgba(255,255,255,0.06)', borderRadius: 12, padding: 16, transition: 'all 0.2s', cursor: 'default' }}
      onMouseEnter={e => { e.currentTarget.style.borderColor = s.color + '30'; e.currentTarget.style.boxShadow = `0 4px 20px ${s.color}10` }}
      onMouseLeave={e => { e.currentTarget.style.borderColor = 'rgba(255,255,255,0.06)'; e.currentTarget.style.boxShadow = 'none' }}
     >
      <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 10 }}>
       <i className={s.icon} style={{ color: s.color, fontSize: 14 }}></i>
       <span style={{ fontSize: 10, fontWeight: 700, textTransform: 'uppercase', letterSpacing: 0.1, color: 'var(--text-muted)' }}>{s.label}</span>
      </div>
      <div style={{ fontSize: 22, fontWeight: 900, color: '#fff', fontFamily: 'var(--font-number)', letterSpacing: '-0.03em' }}>{s.value}</div>
      {s.sub && (
       <div style={{ fontSize: 10, color: 'var(--text-muted)', marginTop: 4, fontWeight: 600 }}>{s.sub}</div>
      )}
     </div>
    ))}
   </div>
  </div>
 )
}


// ═══════════════════════════════════════
// 2. CREATE MATCH
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
   <h2 style={S.title}>Create Match</h2>
   <form onSubmit={handleSubmit} style={{ maxWidth: 600 }}>
    <label style={S.label}>Match Title *</label>
    <input style={S.input} value={form.title} onChange={e => update('title', e.target.value)} placeholder="e.g. Evening Squad Clash" />

    <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12, marginTop: 12 }}>
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

    <div style={{ marginTop: 12 }}>
     <label style={S.label}>Map</label>
     <select style={S.select} value={form.map} onChange={e => update('map', e.target.value)}>
      {FF_MAPS.map(m => <option key={m} value={m}>{m}</option>)}
     </select>
    </div>

    <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12, marginTop: 12 }}>
     <div>
      <label style={S.label}>Start Time</label>
      <input style={S.input} type="datetime-local" value={form.startTime} onChange={e => update('startTime', e.target.value)} />
     </div>
     <div>
      <label style={S.label}>Entry Fee (TK) *</label>
      <input style={S.input} type="number" min="1" value={form.entryFee} onChange={e => update('entryFee', e.target.value)} />
     </div>
    </div>

    <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12, marginTop: 12 }}>
     <div>
      <label style={S.label}>Total Slots *</label>
      <input style={S.input} type="number" min="2" value={form.maxSlots} onChange={e => update('maxSlots', e.target.value)} />
     </div>
     <div>
      <label style={S.label}>Per Kill Reward (TK)</label>
      <input style={S.input} type="number" min="0" value={form.perKill} onChange={e => update('perKill', e.target.value)} />
     </div>
    </div>

    {/* ═══ PHASE 1.5: Min Players input field ═══ */}
    <div style={{ marginTop: 12 }}>
     <label style={S.label}>Min Players to Start</label>
     <input style={S.input} type="number" min="2" value={form.minPlayers} onChange={e => update('minPlayers', Number(e.target.value))} />
     <span style={{ fontSize: 11, color: 'var(--text-muted)', marginTop: 4, display: 'block' }}>Room won't unlock below this count</span>
    </div>
    {/* ═══ END PHASE 1.5 ═══ */}

    <div style={{ marginTop: 12, fontSize: 11, color: 'var(--text-muted)' }}>
     Auto slots for {form.mode}: {maxSlotsForMode(form.mode)}
    </div>

    {form.gameType === 'BR' && (
     <div style={{ display: 'flex', gap: 16, marginTop: 12 }}>
      {['include4th', 'include5th'].map(key => (
       <label key={key} onClick={() => toggle(key)} style={{ display: 'flex', alignItems: 'center', gap: 8, cursor: 'pointer' }}>
        <input type="checkbox" checked={form[key]} readOnly style={{ accentColor: '#a78bfa' }} />
        <span style={{ fontSize: 12, color: '#fff' }}>{key === 'include4th' ? '4th Prize (10%)' : '5th Prize (5%)'}</span>
       </label>
      ))}
     </div>
    )}

    <div style={{ ...S.card, marginTop: 20 }}>
     <div style={S.cardHeader}>
      <div style={S.cardHeaderIcon('#fbbf24')}><i className="fa-solid fa-calculator" style={{ color: '#fbbf24' }}></i></div>
      <h3 style={S.cardHeaderTitle}>Live Calculation</h3>
     </div>
     <div style={{ padding: 16 }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 8 }}>
       <span style={{ color: 'var(--text-muted)', fontSize: 12 }}>Total Collection</span>
       <span style={{ fontWeight: 700, color: '#fff' }}>{formatTK(eco.totalCollection)}</span>
      </div>
      <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 8 }}>
       <span style={{ color: 'var(--text-muted)', fontSize: 12 }}>Admin Profit (20%)</span>
       <span style={{ fontWeight: 700, color: '#22c55e' }}>{formatTK(eco.adminProfit)}</span>
      </div>
      <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 8 }}>
       <span style={{ color: 'var(--text-muted)', fontSize: 12 }}>Prize Pool</span>
       <span style={{ fontWeight: 700, color: '#a78bfa' }}>{formatTK(eco.prizePool)}</span>
      </div>

      {/* ═══ PHASE 1.3: Escrow breakdown in live preview ═══ */}
      <div style={{ borderTop: '1px solid rgba(255,255,255,0.06)', marginTop: 12, paddingTop: 12 }}>
       <h4 style={{ fontSize: 11, fontWeight: 700, textTransform: 'uppercase', color: 'var(--text-muted)', marginBottom: 8 }}>Escrow Analysis</h4>
       <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 4 }}>
        <span style={{ color: 'var(--text-muted)', fontSize: 11 }}>Min Threshold Escrow ({form.minPlayers} players)</span>
        <span style={{ fontWeight: 600, fontSize: 12 }}>{formatTK(minEscrow)}</span>
       </div>
       <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 4 }}>
        <span style={{ color: 'var(--text-muted)', fontSize: 11 }}>Max Escrow (full {form.maxSlots} slots)</span>
        <span style={{ fontWeight: 600, fontSize: 12 }}>{formatTK(maxEscrow)}</span>
       </div>
       <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 4 }}>
        <span style={{ color: 'var(--text-muted)', fontSize: 11 }}>Est. Max Kill Payout</span>
        <span style={{ fontWeight: 600, fontSize: 12 }}>{formatTK(estMaxKillPayout)}</span>
       </div>
       <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 4 }}>
        <span style={{ color: 'var(--text-muted)', fontSize: 11 }}>Total Outflow (prizes + kills)</span>
        <span style={{ fontWeight: 600, fontSize: 12 }}>{formatTK(totalPrizeOutflow)}</span>
       </div>
       {!escrowSafe && (
        <div style={{ color: '#ef4444', fontSize: 11, marginTop: 8, fontWeight: 700 }}>
         ⚠ Shortfall of {formatTK(totalPrizeOutflow - maxEscrow)} — increase slots or reduce prizes
        </div>
       )}
      </div>
      {/* ═══ END PHASE 1.3 ═══ */}

      <div style={{ borderTop: '1px solid rgba(255,255,255,0.06)', marginTop: 12, paddingTop: 12 }}>
       <h4 style={{ fontSize: 11, fontWeight: 700, textTransform: 'uppercase', color: 'var(--text-muted)', marginBottom: 8 }}>Prize Breakdown</h4>
       {eco.prizes.length === 0 ? (
        <p style={{ fontSize: 12, color: 'var(--text-muted)' }}>Set entry fee & slots to see preview</p>
       ) : (
        eco.prizes.map((p, i) => {
         const medals = ['🥇', '🥈', '🥉']
         const colors = ['#fbbf24', '#c0c0c0', '#cd7f32', '#ccc', '#999']
         return (
          <div key={i} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '4px 0' }}>
           <span style={{ fontSize: 12 }}>{medals[i] || `#${i + 1}`} {p.rank}</span>
           <span style={{ fontWeight: 700, color: colors[i] || '#fff', fontSize: 13 }}>{formatTK(p.amount)}</span>
          </div>
         )
        })
       )}
      </div>
     </div>
    </div>

    <button type="submit" style={{ ...S.btnPrimary, marginTop: 20 }}>
     <i className="fa-solid fa-circle-plus"></i> Create Match
    </button>
   </form>
  </div>
 )
}


// ═══════════════════════════════════════
// 3. ROOM MANAGEMENT
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
    <h2 style={S.title}>Room Management</h2>
    <div className="empty-state">
     <i className="fa-solid fa-key"></i>
     <p>No active matches to manage rooms for</p>
    </div>
   </div>
  )
 }

 if (mobile) {
  return (
   <div style={S.panel}>
    <h2 style={S.title}>Room Management</h2>
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
      <div key={m.id} style={S.mCard}>
       <div style={{ fontWeight: 700, fontSize: 14, marginBottom: 4 }}>{m.title}</div>
       <div style={{ fontSize: 11, color: 'var(--text-muted)', marginBottom: 8 }}>{m.mode} • {m.map}</div>
       <div style={{ display: 'flex', alignItems: 'center', gap: 6, marginBottom: 8 }}>
        {m.status === 'live' && <span className="live-dot"></span>}
        <span style={{ fontSize: 11, fontWeight: 700, color: m.status === 'live' ? '#ef4444' : 'var(--text-muted)' }}>{m.status.toUpperCase()}</span>
       </div>

       {/* ═══ PHASE 1.5: Player threshold indicator (mobile) ═══ */}
       <div style={S.mRow}>
        <span style={S.mLabel}>Players</span>
        <span style={{ fontSize: 13, fontWeight: 700 }}>{threshold.joined}/ {threshold.min} min</span>
       </div>
       {/* ═══ PHASE 1.3: Escrow display (mobile) ═══ */}
       <div style={S.mRow}>
        <span style={S.mLabel}>Escrow</span>
        <span style={{ fontSize: 13, fontWeight: 700, color: '#00f0ff' }}>{formatTK(escrow.collected)}</span>
       </div>
       {/* ═══ END PHASE 1.3 + 1.5 ═══ */}

       {/* ═══ PHASE 1.5: Threshold warning (mobile) ═══ */}
       {!threshold.meets && m.status !== 'completed' && (
        <div style={{ background: 'rgba(251,191,36,0.1)', border: '1px solid rgba(251,191,36,0.2)', borderRadius: 8, padding: '8px 12px', marginBottom: 10, fontSize: 11, color: '#fbbf24' }}>
         Need {threshold.deficit} more player{threshold.deficit > 1 ? 's' : ''} to unlock room
        </div>
       )}
       {/* ═══ END PHASE 1.5 ═══ */}

       <div style={{ marginBottom: 8 }}>
        <label style={{ ...S.label, fontSize: 10 }}>Room ID</label>
        <input style={S.input} value={rd.roomId || ''} onChange={e => updateRoomField(m.id, 'roomId', e.target.value)} placeholder="e.g. 123456789" />
       </div>
       <div style={{ marginBottom: 8 }}>
        <label style={{ ...S.label, fontSize: 10 }}>Password</label>
        <input style={S.input} value={rd.roomPassword || ''} onChange={e => updateRoomField(m.id, 'roomPassword', e.target.value)} placeholder="e.g. abc123" />
       </div>
       <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 10 }}>
        <span style={{ fontSize: 11, fontWeight: 700, color: isUnlocked ? '#22c55e' : '#fbbf24' }}>
         {/* ═══ PHASE 1.5: Show BLOCKED if below threshold even when time-unlocked ═══ */}
         {isUnlocked && !threshold.meets ? 'BLOCKED' : isUnlocked ? 'UNLOCKED' : (countdown || '—').replace('Unlocks in ', '')}
        </span>
        <span style={{ fontSize: 10, color: 'var(--text-muted)' }}>
         {isUnlocked && !threshold.meets ? `Need ${threshold.deficit} more players` : '10 min before start'}
        </span>
        {/* ═══ END PHASE 1.5 ═══ */}
       </div>

       {/* ═══ PHASE 1.4: Cancel / Save buttons (mobile) ═══ */}
       {isConfirming ? (
        <div style={{ display: 'flex', gap: 8 }}>
         <button style={S.btnDanger} onClick={() => handleCancelMatch(m.id)}>Confirm Cancel</button>
         <button style={S.btnGhost} onClick={() => setConfirmCancelId(null)}>Keep</button>
        </div>
       ) : (
        <div style={{ display: 'flex', gap: 8 }}>
         <button style={S.btnSuccess} onClick={() => saveRoom(m.id, m.title)}><i className="fa-solid fa-save"></i> Save</button>
         {(m.status === 'upcoming' || m.status === 'live') && (
          <button style={S.btnDanger} onClick={() => setConfirmCancelId(m.id)}><i className="fa-solid fa-ban"></i> Cancel</button>
         )}
        </div>
       )}
       {/* ═══ END PHASE 1.4 ═══ */}
      </div>
     )
    })}
   </div>
  )
 }

 return (
  <div style={S.panel}>
   <h2 style={S.title}>Room Management</h2>
   <div style={{ ...S.card, overflowX: 'auto' }}>
    <div style={S.cardHeader}>
     <div style={S.cardHeaderIcon('#fbbf24')}><i className="fa-solid fa-key" style={{ color: '#fbbf24' }}></i></div>
     <h3 style={S.cardHeaderTitle}>Room Credentials</h3>
     <span style={{ marginLeft: 'auto', fontSize: 11, color: 'var(--text-muted)' }}>Type manually — NO copy button</span>
    </div>
    <table style={{ ...S.table, minWidth: 900 }}>
     <thead>
      <tr>
       <th style={{ ...S.th, width: '20%' }}>Match</th>
       <th style={S.th}>Start Time</th>
       {/* ═══ PHASE 1.5: Players column ═══ */}
       <th style={S.th}>Players</th>
       {/* ═══ PHASE 1.3: Escrow column ═══ */}
       <th style={S.th}>Escrow</th>
       {/* ═══ END PHASE 1.3 + 1.5 ═══ */}
       <th style={S.th}>Room ID</th>
       <th style={S.th}>Password</th>
       <th style={S.th}>Visibility</th>
       <th style={S.th}>Status</th>
       <th style={S.th}>Actions</th>
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
          <div style={{ fontWeight: 700, fontSize: 13 }}>{m.title}</div>
          <div style={{ fontSize: 11, color: 'var(--text-muted)' }}>{m.mode} • {m.map}</div>
         </td>
         <td style={S.td}>
          {m.startTime ? new Date(m.startTime.replace(' ', 'T')).toLocaleString('en-GB', { day: '2-digit', month: 'short', hour: '2-digit', minute: '2-digit' }) : '—'}
         </td>
         {/* ═══ PHASE 1.5: Players + threshold column (desktop) ═══ */}
         <td style={S.td}>
          <div style={{ fontWeight: 700 }}>{threshold.joined}/ {threshold.min}</div>
          {!threshold.meets && (
           <div style={{ fontSize: 10, color: '#fbbf24', marginTop: 2 }}>
            ⚠ Need {threshold.deficit} more
           </div>
          )}
         </td>
         {/* ═══ PHASE 1.3: Escrow column (desktop) ═══ */}
         <td style={S.td}>
          <div style={{ fontWeight: 700, color: '#00f0ff' }}>{formatTK(escrow.collected)}</div>
          {escrow.refunded > 0 && (
           <div style={{ fontSize: 10, color: '#f87171', marginTop: 2 }}>
            −{formatTK(escrow.refunded)} ref.
           </div>
          )}
         </td>
         {/* ═══ END PHASE 1.3 + 1.5 ═══ */}
         <td style={S.td}>
          <input style={{ ...S.input, width: 120 }} value={rd.roomId || ''} onChange={e => updateRoomField(m.id, 'roomId', e.target.value)} placeholder="Room ID" />
         </td>
         <td style={S.td}>
          <input style={{ ...S.input, width: 100 }} value={rd.roomPassword || ''} onChange={e => updateRoomField(m.id, 'roomPassword', e.target.value)} placeholder="Password" />
         </td>
         <td style={S.td}>
          {/* ═══ PHASE 1.5: BLOCKED state ═══ */}
          <div style={{ fontSize: 12, fontWeight: 700, color: isUnlocked && !threshold.meets ? '#ef4444' : isUnlocked ? '#22c55e' : '#fbbf24' }}>
           {isUnlocked && !threshold.meets ? 'BLOCKED' : isUnlocked ? 'UNLOCKED' : (countdown || '—').replace('Unlocks in ', '')}
          </div>
          <div style={{ fontSize: 10, color: 'var(--text-muted)', marginTop: 2 }}>
           {isUnlocked && !threshold.meets ? `Need ${threshold.deficit} more players` : '10 min before start'}
          </div>
          {/* ═══ END PHASE 1.5 ═══ */}
         </td>
         <td style={S.td}>
          {m.status === 'live' && <span className="live-dot" style={{ marginRight: 6 }}></span>}
          <span style={{ fontSize: 11, fontWeight: 700, color: m.status === 'live' ? '#ef4444' : 'var(--text-muted)' }}>{m.status.toUpperCase()}</span>
         </td>
         <td style={S.td}>
          {/* ═══ PHASE 1.4: Cancel + Save buttons (desktop) ═══ */}
          {isConfirming ? (
           <>
            <button style={S.btnDanger} onClick={() => handleCancelMatch(m.id)}>Confirm</button>
            <button style={{ ...S.btnGhost, marginLeft: 6 }} onClick={() => setConfirmCancelId(null)}>Keep</button>
           </>
          ) : (
           <>
            <button style={S.btnSuccess} onClick={() => saveRoom(m.id, m.title)}><i className="fa-solid fa-save"></i></button>
            {(m.status === 'upcoming' || m.status === 'live') && (
             <button style={{ ...S.btnDanger, marginLeft: 6 }} onClick={() => setConfirmCancelId(m.id)}><i className="fa-solid fa-ban"></i></button>
            )}
           </>
          )}
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
// 4. RESULT PANEL — ★ UPGRADED: Team Name + Points + EDIT RESULT
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
   <h2 style={S.title}>Match Results</h2>

   {/* ═══ PHASE 4.2: Edit mode banner ═══ */}
   {editingResultId && (
    <div style={{ background: 'rgba(139,92,246,0.1)', border: '1px solid rgba(139,92,246,0.3)', borderRadius: 12, padding: '12px 16px', marginBottom: 16, display: 'flex', alignItems: 'center', gap: 10 }}>
     <i className="fa-solid fa-pen-to-square" style={{ color: '#a78bfa' }}></i>
     <div>
      <div style={{ fontWeight: 700, fontSize: 13, color: '#a78bfa' }}>Editing Results</div>
      <div style={{ fontSize: 11, color: 'var(--text-muted)' }}>Modifying results for: {selected?.title || 'Loading...'}</div>
     </div>
     <button style={{ marginLeft: 'auto', ...S.btnGhost }} onClick={cancelEdit}>Cancel Edit</button>
    </div>
   )}
   {/* ═══ END PHASE 4.2 ═══ */}

   <div style={{ marginBottom: 16 }}>
    <label style={S.label}>Result Method</label>
    <div style={{ display: 'flex', gap: 8 }}>
     {RESULT_METHODS.map(rm => (
      <button
       key={rm.id}
       onClick={() => onMethodChange(rm.id)}
       style={{
        flex: 1,
        padding: '10px',
        borderRadius: 10,
        border: method === rm.id ? '1px solid #a78bfa' : '1px solid rgba(255,255,255,0.06)',
        background: method === rm.id ? 'rgba(139,92,246,0.1)' : 'rgba(255,255,255,0.02)',
        color: method === rm.id ? '#a78bfa' : 'var(--text-muted)',
        fontWeight: 700,
        fontSize: 12,
        cursor: 'pointer',
        transition: 'all 0.2s'
       }}
      >
       <i className={rm.icon} style={{ marginRight: 6 }}></i>
       {rm.label}
      </button>
     ))}
    </div>
   </div>

   <div style={{ marginBottom: 16 }}>
    <label style={S.label}>Select Match *</label>
    <select style={S.select} value={selectedId} onChange={onMatchChange}>
     <option value="">Choose a match...</option>
     {activeMatches.map(m => (
      <option key={m.id} value={m.id}>{m.title} ({m.mode} • {m.map})</option>
     ))}
    </select>
    {selected && (
     <div style={{ marginTop: 8, fontSize: 12, color: 'var(--text-muted)' }}>
      <span style={{ fontWeight: 700, color: '#a78bfa' }}>
       {selected.mode === 'Solo' ? '👤' : selected.mode === 'Duo' ? '👥' : selected.mode === 'Squad' ? '🛡️' : '⚔️'}{' '}
       {selected.mode.toUpperCase()} MODE
      </span>
      <span style={{ marginLeft: 8 }}>— Enter {teamMode ? 'Team Name' : 'IGN'} + {teamMode ? 'Points' : 'Kills'} + Position</span>
     </div>
    )}
   </div>

   {/* ═══ PHASE 1.6: Team Name → User ID Mapping Display ═══ */}
   {teamMapping && method === 'manual' && (
    <div style={{ ...S.card, marginBottom: 16 }}>
     <div style={S.cardHeader}>
      <div style={S.cardHeaderIcon('#6c8cff')}><i className="fa-solid fa-users" style={{ color: '#6c8cff' }}></i></div>
      <h3 style={S.cardHeaderTitle}>Team Name → User Mapping</h3>
      <span style={{ marginLeft: 'auto', fontSize: 11, color: 'var(--text-muted)' }}>{Object.keys(teamMapping).length} teams • {(selected.joined || []).length} players</span>
     </div>
     <div style={{ padding: 16 }}>
      {Object.entries(teamMapping).map(([team, members]) => (
       <div key={team} style={{ marginBottom: 10, padding: '8px 12px', background: 'rgba(255,255,255,0.02)', borderRadius: 8, border: '1px solid rgba(255,255,255,0.04)' }}>
        <div style={{ fontWeight: 700, fontSize: 12, marginBottom: 4, color: '#a78bfa' }}>
         🛡️ {team} ({members.length})
        </div>
        {members.map(mb => (
         <div key={mb.userId} style={{ fontSize: 11, color: 'var(--text-muted)', paddingLeft: 16 }}>
          • {mb.ign || mb.username || 'Unknown'} (ID: {String(mb.userId || '').slice(0, 8)}…)
         </div>
        ))}
       </div>
      ))}
      <div style={{ fontSize: 11, color: '#fbbf24', marginTop: 8 }}>
       💡 Copy team names exactly into the result form below. Matched user IDs will auto-attach for prize distribution.
      </div>
     </div>
    </div>
   )}
   {/* ═══ END PHASE 1.6 ═══ */}

   {method === 'manual' && (
    <div style={{ ...S.card, marginBottom: 16 }}>
     <div style={{ ...S.cardHeader, justifyContent: 'space-between' }}>
      <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
       <div style={S.cardHeaderIcon('#22c55e')}><i className="fa-solid fa-list-ol" style={{ color: '#22c55e' }}></i></div>
       <h3 style={S.cardHeaderTitle}>{teamMode ? 'Team Results' : 'Player Results'}</h3>
      </div>
      <button style={{ ...S.btnGhost, color: '#22c55e' }} onClick={addPlayer}><i className="fa-solid fa-plus"></i> Add</button>
     </div>
     <div style={{ padding: 16 }}>
      <div style={{ display: 'grid', gridTemplateColumns: teamMode ? '1fr 80px 60px 40px' : '1fr 80px 60px 40px', gap: 8, marginBottom: 8, fontSize: 10, fontWeight: 700, textTransform: 'uppercase', color: 'var(--text-muted)', letterSpacing: 0.1 }}>
       <span>{teamMode ? 'Team Name' : 'IGN'}</span>
       <span>{teamMode ? 'Points' : 'Kills'}</span>
       <span>Pos</span>
       <span></span>
      </div>
      {players.map((p, i) => {
       // ═══ PHASE 1.6: Highlight if team name matches a joined team ═══
       const matchedMembers = teamMode ? findTeamMembers(p.ign.trim()) : null
       // ═══ END PHASE 1.6 ═══
       return (
        <div key={i} style={{ display: 'grid', gridTemplateColumns: teamMode ? '1fr 80px 60px 40px' : '1fr 80px 60px 40px', gap: 8, alignItems: 'center', marginBottom: 8 }}>
         <div style={{ position: 'relative' }}>
          <input
           style={{ ...S.input, borderColor: matchedMembers ? 'rgba(34,197,94,0.3)' : undefined }}
           value={p.ign}
           onChange={e => updatePlayer(i, 'ign', e.target.value)}
           placeholder={teamMode ? 'Team name...' : 'IGN...'}
          />
          {/* ═══ PHASE 1.6: Match indicator badge ═══ */}
          {matchedMembers && (
           <span style={{ position: 'absolute', right: 8, top: '50%', transform: 'translateY(-50%)', fontSize: 10, color: '#22c55e', fontWeight: 700 }}>
            ✓ {matchedMembers.length}
           </span>
          )}
          {/* ═══ END PHASE 1.6 ═══ */}
         </div>
         <input style={S.input} type="number" min="0" value={teamMode ? p.points || 0 : p.kills || 0} onChange={e => updatePlayer(i, teamMode ? 'points' : 'kills', Number(e.target.value))} />
         <input style={S.input} type="number" min="1" value={p.position} onChange={e => updatePlayer(i, 'position', Number(e.target.value))} />
         <button style={{ ...S.btnDanger, padding: '4px 8px' }} onClick={() => removePlayer(i)}><i className="fa-solid fa-trash"></i></button>
        </div>
       )
      })}
      {/* ═══ PHASE 4.2: Submit/Update button + Cancel edit ═══ */}
      <div style={{ display: 'flex', gap: 10, marginTop: 12 }}>
       <button style={S.btnPrimary} onClick={handleSubmit}>
        <i className={editingResultId ? "fa-solid fa-rotate" : "fa-solid fa-check"}></i>
        {editingResultId ? 'Update Results' : 'Submit Results'}
       </button>
       {editingResultId && (
        <button style={{ ...S.btnGhost, borderColor: 'rgba(239,68,68,0.2)', color: '#ef4444' }} onClick={cancelEdit}>
         Cancel
        </button>
       )}
      </div>
      {/* ═══ END PHASE 4.2 ═══ */}
     </div>
    </div>
   )}

   {method === 'screenshot' && (
    <div style={{ ...S.card, marginBottom: 16, padding: 16, textAlign: 'center' }}>
     <div style={{ width: 80, height: 80, borderRadius: 12, background: 'rgba(255,255,255,0.04)', border: '2px dashed rgba(255,255,255,0.1)', display: 'flex', alignItems: 'center', justifyContent: 'center', margin: '0 auto 12px', cursor: 'pointer' }}>
      <i className="fa-solid fa-image" style={{ fontSize: 28, color: 'var(--text-muted)' }}></i>
     </div>
     <h4 style={{ margin: '0 0 4px', fontSize: 14 }}>Upload FF Result Screenshot</h4>
     <p style={{ margin: 0, fontSize: 11, color: 'var(--text-muted)' }}>Tap to select image from gallery</p>
    </div>
   )}

   {eco && (
    <div style={{ ...S.card, marginBottom: 16 }}>
     <div style={S.cardHeader}>
      <div style={S.cardHeaderIcon('#fbbf24')}><i className="fa-solid fa-trophy" style={{ color: '#fbbf24' }}></i></div>
      <h3 style={S.cardHeaderTitle}>Prize Preview</h3>
     </div>
     <div style={{ padding: 16 }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 12, fontSize: 12 }}>
       <span style={{ color: 'var(--text-muted)' }}>Match</span>
       <span style={{ fontWeight: 700 }}>{selected?.title}</span>
      </div>
      <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 12, fontSize: 12 }}>
       <span style={{ color: 'var(--text-muted)' }}>Prize Pool</span>
       <span style={{ fontWeight: 700, color: '#a78bfa' }}>{formatTK(eco.prizePool)}</span>
      </div>
      <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 12, fontSize: 12 }}>
       <span style={{ color: 'var(--text-muted)' }}>Per Kill</span>
       <span style={{ fontWeight: 700, color: '#fbbf24' }}>{formatTK(selected.perKill || 0)}</span>
      </div>
      {/* ═══ PHASE 1.6: Show matched user count in preview ═══ */}
      {teamMode && teamMapping && (
       <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 12, fontSize: 12 }}>
        <span style={{ color: 'var(--text-muted)' }}>Teams Mapped</span>
        <span style={{ fontWeight: 700, color: '#22c55e' }}>{Object.keys(teamMapping).length}</span>
       </div>
      )}
      {/* ═══ END PHASE 1.6 ═══ */}
      {method === 'manual' && (
       <div style={{ borderTop: '1px solid rgba(255,255,255,0.06)', paddingTop: 12 }}>
        <h4 style={{ fontSize: 11, fontWeight: 700, textTransform: 'uppercase', color: 'var(--text-muted)', marginBottom: 8 }}>Auto Calculated Prizes</h4>
        {resultsWithPrizes.filter(r => r.ign).map((r, i) => (
         <div key={i} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '6px 0', borderBottom: '1px solid rgba(255,255,255,0.03)' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
           <span style={{ fontSize: 14 }}>{i === 0 ? '🥇' : i === 1 ? '🥈' : i === 2 ? '🥉' : `#${r.position}`}</span>
           <div>
            <div style={{ fontWeight: 700, fontSize: 13 }}>{r.ign}</div>
            <div style={{ fontSize: 10, color: 'var(--text-muted)' }}>
             {teamMode
              ? `⭐ ${r.points || 0} pts — Pos: ${formatTK(r.positionPrize)}${r.killPrize > 0 ? ` + Kill: ${formatTK(r.killPrize)}` : ''}`
              : `${r.kills} kills — Pos: ${formatTK(r.positionPrize)} + Kill: ${formatTK(r.killPrize)}`
             }
             {/* ═══ PHASE 1.6: Show matched user IDs in prize preview ═══ */}
             {r.matchedUserIds?.length > 0 && (
              <span style={{ color: '#22c55e', marginLeft: 4 }}>✓ {r.matchedUserIds.length} user{r.matchedUserIds.length > 1 ? 's' : ''} matched</span>
             )}
             {/* ═══ END PHASE 1.6 ═══ */}
            </div>
           </div>
          </div>
          <div style={{ fontWeight: 900, fontSize: 14, color: '#fbbf24' }}>{formatTK(r.totalPrize)}</div>
         </div>
        ))}
        {resultsWithPrizes.filter(r => r.ign).length === 0 && (
         <p style={{ fontSize: 12, color: 'var(--text-muted)' }}>Enter {teamMode ? 'team' : 'player'} names to see auto calculation</p>
        )}
       </div>
      )}
     </div>
    </div>
   )}

   {completedWithResult.length > 0 && (
    <div style={S.panel}>
     <h3 style={{ ...S.title, fontSize: 18 }}>Previous Results</h3>
     {completedWithResult.map(m => {
      const mTeam = isTeamMode(m.mode)
      return (
       <div key={m.id} style={{ ...S.mCard, position: 'relative' }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 8 }}>
         <div>
          <div style={{ fontWeight: 700, fontSize: 14 }}>{m.title}</div>
          <div style={{ fontSize: 11, color: 'var(--text-muted)' }}>{m.mode} • {m.map} • {m.result?.method === 'screenshot' ? 'Screenshot' : 'Manual'}</div>
         </div>
         {/* ═══ PHASE 4.2: SUBMITTED badge + EDIT button ═══ */}
         <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
          <span style={{ fontSize: 10, fontWeight: 800, textTransform: 'uppercase', letterSpacing: 0.1, color: '#22c55e', background: 'rgba(34,197,94,0.1)', padding: '2px 8px', borderRadius: 6 }}>
           SUBMITTED
          </span>
          <button style={{ ...S.btnGhost, fontSize: 10, padding: '4px 8px' }} onClick={() => handleEditResult(m.id)}>
           <i className="fa-solid fa-pen"></i> Edit
          </button>
         </div>
         {/* ═══ END PHASE 4.2 ═══ */}
        </div>
        {m.result?.players?.length > 0 && (
         <div style={{ display: 'flex', flexWrap: 'wrap', gap: 6 }}>
          {m.result.players.slice(0, 5).map((p, i) => (
           <span key={i} style={{ fontSize: 11, background: 'rgba(255,255,255,0.04)', padding: '4px 8px', borderRadius: 6 }}>
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
// 5. USERS PANEL — ★ UPGRADED: Duplicate IGN Detection
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
    <h2 style={S.title}>User Management</h2>

    {/* ═══ PHASE 7.8: Duplicate IGN warning banner (mobile) ═══ */}
    {duplicateIGNs.size > 0 && (
     <div style={{ background: 'rgba(239,68,68,0.08)', border: '1px solid rgba(239,68,68,0.2)', borderRadius: 12, padding: '12px 16px', marginBottom: 16 }}>
      <div style={{ fontWeight: 700, fontSize: 13, color: '#ef4444', marginBottom: 4 }}>
       <i className="fa-solid fa-triangle-exclamation" style={{ marginRight: 6 }}></i>
       Duplicate IGNs Detected ({duplicateIGNs.size})
      </div>
      <div style={{ fontSize: 11, color: '#f87171' }}>
       {[...duplicateIGNs].join(', ')} — Possible multi-accounting
      </div>
     </div>
    )}
    {/* ═══ END PHASE 7.8 ═══ */}

    <div>
     {users.map(u => {
      // ═══ PHASE 1.9: Self-check flag ═══
      const isSelf = u.id === currentUserId
      // ═══ PHASE 7.8: Duplicate IGN check ═══
      const hasDupIGN = isDuplicateIGN(u)
      const dupCount = getDuplicateCount(u)
      // ═══ END PHASE 1.9 + 7.8 ═══
      return (
       <div key={u.id} style={S.mCard}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 8 }}>
         <div style={{ width: 36, height: 36, borderRadius: '50%', background: 'linear-gradient(135deg, #6c8cff, #a78bfa)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 14, fontWeight: 800, color: '#fff' }}>
          {(u.name || u.displayName || u.username || '?').charAt(0)}
         </div>
         <div style={{ flex: 1 }}>
          <div style={{ fontWeight: 700, fontSize: 14 }}>
           {u.name || u.displayName || u.username}
           {isSelf && <span style={{ fontSize: 10, color: '#6c8cff', marginLeft: 6, fontWeight: 800 }}>YOU</span>}
          </div>
          <div style={{ fontSize: 11, color: 'var(--text-muted)' }}>
           <span style={{ color: u.role === 'owner' ? '#fbbf24' : u.role === 'admin' ? '#a78bfa' : 'var(--text-muted)', fontWeight: 700 }}>
            {u.role === 'owner' ? 'OWNER' : u.role === 'admin' ? 'ADMIN' : 'USER'}
           </span>
          </div>
         </div>
        </div>
        <div style={{ fontSize: 12, color: 'var(--text-muted)', marginBottom: 8 }}>
         @{u.username}
         {/* ═══ PHASE 7.8: Duplicate IGN badge ═══ */}
         {hasDupIGN && (
          <span style={{ marginLeft: 8, fontSize: 10, color: '#ef4444', fontWeight: 700, background: 'rgba(239,68,68,0.1)', padding: '2px 6px', borderRadius: 4 }}>
           IGN: {u.ign} ({dupCount}x)
          </span>
         )}
         {!hasDupIGN && <span style={{ marginLeft: 8 }}>IGN: {u.ign || '—'}</span>}
         {/* ═══ END PHASE 7.8 ═══ */}
        </div>
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: 8, marginBottom: 10 }}>
         <div style={{ textAlign: 'center' }}>
          <div style={{ fontSize: 10, color: 'var(--text-muted)', textTransform: 'uppercase', fontWeight: 700 }}>Balance</div>
          <div style={{ fontWeight: 900, fontSize: 14 }}>{formatTK(u.balance ?? u.wallet ?? 0)}</div>
         </div>
         <div style={{ textAlign: 'center' }}>
          <div style={{ fontSize: 10, color: 'var(--text-muted)', textTransform: 'uppercase', fontWeight: 700 }}>Matches</div>
          <div style={{ fontWeight: 900, fontSize: 14 }}>{u.matchesPlayed ?? u.joinedMatches?.length ?? 0}</div>
         </div>
         <div style={{ textAlign: 'center' }}>
          <div style={{ fontSize: 10, color: 'var(--text-muted)', textTransform: 'uppercase', fontWeight: 700 }}>Status</div>
          <div style={{ fontWeight: 900, fontSize: 14, color: u.banned ? '#ef4444' : '#22c55e' }}>{u.banned ? 'BANNED' : 'ACTIVE'}</div>
         </div>
        </div>
        {/* ═══ PHASE 1.9: Block self-balance-adjust + show reason ═══ */}
        {isSelf ? (
         <div style={{ fontSize: 11, color: 'var(--text-muted)', fontStyle: 'italic', padding: '6px 0' }}>
          Cannot adjust own balance
         </div>
        ) : (
         <button style={{ ...S.btnGhost, width: '100%', marginBottom: 6 }} onClick={() => dispatch({ type: 'ADJUST_BALANCE', payload: { userId: u.id } })}>
          <i className="fa-solid fa-scale-balanced"></i> Adjust Balance
         </button>
        )}
        {/* ═══ END PHASE 1.9 ═══ */}
        {u.role !== 'owner' && (
         <button style={{ ...S.btnDanger, width: '100%' }} onClick={() => dispatch({ type: u.banned ? 'UNBAN_USER' : 'BAN_USER', payload: u.id })}>
          <i className={u.banned ? "fa-solid fa-user-check" : "fa-solid fa-user-slash"}></i>
          {u.banned ? ' Unban' : ' Ban'}
         </button>
        )}
       </div>
      )
     })}
    </div>
   </div>
  )
 }

 return (
  <div style={S.panel}>
   <h2 style={S.title}>User Management</h2>

   {/* ═══ PHASE 7.8: Duplicate IGN warning banner (desktop) ═══ */}
   {duplicateIGNs.size > 0 && (
    <div style={{ background: 'rgba(239,68,68,0.08)', border: '1px solid rgba(239,68,68,0.2)', borderRadius: 12, padding: '12px 16px', marginBottom: 16 }}>
     <div style={{ fontWeight: 700, fontSize: 13, color: '#ef4444', marginBottom: 4 }}>
      <i className="fa-solid fa-triangle-exclamation" style={{ marginRight: 6 }}></i>
      Duplicate IGNs Detected ({duplicateIGNs.size})
     </div>
     <div style={{ fontSize: 11, color: '#f87171', marginBottom: 8 }}>
      These IGNs are used by multiple accounts — possible multi-accounting:
     </div>
     <div style={{ display: 'flex', flexWrap: 'wrap', gap: 6 }}>
      {[...duplicateIGNs].map(ign => (
       <span key={ign} style={{ fontSize: 10, background: 'rgba(239,68,68,0.1)', color: '#ef4444', padding: '2px 8px', borderRadius: 6, fontWeight: 700 }}>
        {ign} ({users.filter(u => (u.ign || '').toLowerCase().trim() === ign).length} accounts)
       </span>
      ))}
     </div>
    </div>
   )}
   {/* ═══ END PHASE 7.8 ═══ */}

   <div style={{ ...S.card, overflowX: 'auto' }}>
    <table style={S.table}>
     <thead>
      <tr>
       <th style={{ ...S.th, width: '25%' }}>User</th>
       <th style={S.th}>IGN</th>
       <th style={S.th}>Role</th>
       <th style={S.th}>Balance</th>
       <th style={S.th}>Matches</th>
       <th style={S.th}>Status</th>
       <th style={S.th}>Actions</th>
      </tr>
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
        <tr key={u.id}>
         <td style={S.td}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
           <div style={{ width: 32, height: 32, borderRadius: '50%', background: 'linear-gradient(135deg, #6c8cff, #a78bfa)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 12, fontWeight: 800, color: '#fff' }}>
            {(u.name || u.displayName || u.username || '?').charAt(0)}
           </div>
           <div>
            <div style={{ fontWeight: 700, fontSize: 13 }}>
             {u.name || u.displayName || u.username}
             {isSelf && <span style={{ fontSize: 10, color: '#6c8cff', marginLeft: 4, fontWeight: 800 }}>YOU</span>}
            </div>
            <div style={{ fontSize: 11, color: 'var(--text-muted)' }}>@{u.username}</div>
           </div>
          </div>
         </td>
         <td style={S.td}>
          {/* ═══ PHASE 7.8: Highlight duplicate IGNs in table ═══ */}
          <div style={{ fontWeight: 600, fontSize: 13 }}>{u.ign || '—'}</div>
          {hasDupIGN && (
           <span style={{ fontSize: 10, color: '#ef4444', fontWeight: 700, background: 'rgba(239,68,68,0.1)', padding: '1px 6px', borderRadius: 4 }}>
            {dupCount}x
           </span>
          )}
          {/* ═══ END PHASE 7.8 ═══ */}
         </td>
         <td style={S.td}>
          <span style={{ fontSize: 11, fontWeight: 700, color: u.role === 'owner' ? '#fbbf24' : u.role === 'admin' ? '#a78bfa' : 'var(--text-muted)' }}>
           {u.role === 'owner' ? 'OWNER' : u.role === 'admin' ? 'ADMIN' : 'USER'}
          </span>
         </td>
         <td style={S.td}>
          <span style={{ fontWeight: 700, fontSize: 13 }}>{formatTK(u.balance ?? u.wallet ?? 0)}</span>
         </td>
         <td style={S.td}>
          <span style={{ fontSize: 13 }}>{u.matchesPlayed ?? u.joinedMatches?.length ?? 0}</span>
         </td>
         <td style={S.td}>
          <span style={{ fontSize: 11, fontWeight: 700, color: u.banned ? '#ef4444' : '#22c55e' }}>
           {u.banned ? 'BANNED' : 'ACTIVE'}
          </span>
         </td>
         <td style={S.td}>
          {/* ═══ PHASE 1.9: Block self-balance-adjust (desktop) ═══ */}
          {isSelf ? (
           <span style={{ fontSize: 11, color: 'var(--text-muted)', fontStyle: 'italic' }}>Self</span>
          ) : (
           <button style={S.btnGhost} onClick={() => dispatch({ type: 'ADJUST_BALANCE', payload: { userId: u.id } })}>
            <i className="fa-solid fa-scale-balanced"></i> Adjust
           </button>
          )}
          {/* ═══ END PHASE 1.9 ═══ */}
          {u.role !== 'owner' && (
           <button style={{ ...S.btnDanger, marginLeft: 6 }} onClick={() => dispatch({ type: u.banned ? 'UNBAN_USER' : 'BAN_USER', payload: u.id })}>
            <i className={u.banned ? "fa-solid fa-user-check" : "fa-solid fa-user-slash"}></i>
           </button>
          )}
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
// 6. FINANCE PANEL
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
  <div style={{ textAlign: 'center', padding: 40 }}>
   <i className="fa-solid fa-check-circle" style={{ fontSize: 32, color: '#22c55e', marginBottom: 12, display: 'block' }}></i>
   <p style={{ fontSize: 12, fontWeight: 700, color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: 0.1 }}>All Caught Up</p>
   <p style={{ fontSize: 11, color: 'var(--text-muted)' }}>No pending deposit requests</p>
  </div>
 ) : mobile ? (
  <div>
   {requests.map(req => {
    const isProc = processing === req.id
    return (
     <div key={req.id} style={S.mCard}>
      <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 8 }}>
       <div style={{ width: 32, height: 32, borderRadius: '50%', background: 'linear-gradient(135deg, #22c55e, #10b981)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 12, fontWeight: 800, color: '#fff' }}>
        {(req.username || '?').charAt(0)}
       </div>
       <div style={{ flex: 1 }}>
        <div style={{ fontWeight: 700, fontSize: 13 }}>{req.username}</div>
        {req.ign && (
         <div style={{ fontSize: 11, color: 'var(--text-muted)' }}>IGN: {req.ign}</div>
        )}
       </div>
       <div style={{ fontWeight: 900, fontSize: 16, color: '#22c55e' }}>{formatTK(req.amount)}</div>
      </div>
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 8, marginBottom: 10 }}>
       <div>
        <div style={S.mLabel}>Method</div>
        <div style={{ fontSize: 12, fontWeight: 700 }}>{req.method}</div>
       </div>
       {/* ═══ PHASE 3.3: TXID + Sender Number ═══ */}
       <div>
        <div style={S.mLabel}>TXID</div>
        <div style={{ fontSize: 12, fontWeight: 700 }}>{req.txId || '—'}</div>
       </div>
       {req.senderNumber && (
        <div>
         <div style={S.mLabel}>Sender #</div>
         <div style={{ fontSize: 12, fontWeight: 700 }}>{req.senderNumber}</div>
        </div>
       )}
       {req.phone && (
        <div>
         <div style={S.mLabel}>Registered</div>
         <div style={{ fontSize: 12, fontWeight: 700 }}>{req.phone}</div>
        </div>
       )}
       {/* ═══ END PHASE 3.3 ═══ */}
       <div>
        <div style={S.mLabel}>Time</div>
        <div style={{ fontSize: 12, color: 'var(--text-muted)' }}>{timeAgo(req.createdAt)}</div>
       </div>
      </div>
      <div style={{ display: 'flex', gap: 8 }}>
       <button style={{ ...S.btnSuccess, flex: 1 }} onClick={() => handleApproveDeposit(req)} disabled={isProc}>
        {isProc ? <i className="fa-solid fa-spinner fa-spin"></i> : <i className="fa-solid fa-check"></i>} Approve
       </button>
       <button style={{ ...S.btnDanger, flex: 1 }} onClick={() => handleRejectDeposit(req)} disabled={isProc}>
        <i className="fa-solid fa-xmark"></i> Reject
       </button>
      </div>
     </div>
    )
   })}
  </div>
 ) : (
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
     <th style={S.th}>Actions</th>
    </tr>
   </thead>
   <tbody>
    {requests.map(req => {
     const isProc = processing === req.id
     return (
      <tr key={req.id}>
       <td style={S.td}>
        <div style={{ fontWeight: 700, fontSize: 13 }}>{req.username}</div>
        {req.ign && (
         <div style={{ fontSize: 11, color: 'var(--text-muted)' }}>IGN: {req.ign}</div>
        )}
       </td>
       <td style={S.td}><span style={{ fontWeight: 700, color: '#22c55e' }}>{formatTK(req.amount)}</span></td>
       <td style={S.td}>{req.method}</td>
       <td style={S.td}><span style={{ fontFamily: 'var(--font-number)', fontSize: 12 }}>{req.txId || '—'}</span></td>
       <td style={S.td}>{req.senderNumber || '—'}</td>
       <td style={S.td}>{req.phone || '—'}</td>
       <td style={S.td}><span style={{ fontSize: 11, color: 'var(--text-muted)' }}>{timeAgo(req.createdAt)}</span></td>
       <td style={S.td}>
        <button style={S.btnSuccess} onClick={() => handleApproveDeposit(req)} disabled={isProc}>
         {isProc ? <i className="fa-solid fa-spinner fa-spin"></i> : <i className="fa-solid fa-check"></i>}
        </button>
        <button style={{ ...S.btnDanger, marginLeft: 6 }} onClick={() => handleRejectDeposit(req)} disabled={isProc}>
         <i className="fa-solid fa-xmark"></i>
        </button>
       </td>
      </tr>
     )
    })}
   </tbody>
  </table>
 )

 // ═══ WITHDRAWALS TAB CONTENT ═══
 const withdrawalsContent = pendingWithdrawals.length === 0 ? (
  <div style={{ textAlign: 'center', padding: 40 }}>
   <i className="fa-solid fa-check-circle" style={{ fontSize: 32, color: '#fbbf24', marginBottom: 12, display: 'block' }}></i>
   <p style={{ fontSize: 12, fontWeight: 700, color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: 0.1 }}>All Caught Up</p>
   <p style={{ fontSize: 11, color: 'var(--text-muted)' }}>No pending withdrawal requests</p>
  </div>
 ) : mobile ? (
  <div>
   {pendingWithdrawals.map(w => (
    <div key={w.id} style={S.mCard}>
     <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 8 }}>
      <span style={{ fontWeight: 700, fontSize: 14 }}>{w.username}</span>
      <span style={{ fontWeight: 900, fontSize: 16, color: '#fbbf24' }}>{formatTK(w.amount)}</span>
     </div>
     <div style={S.mRow}>
      <span style={S.mLabel}>Method</span>
      <span style={{ fontSize: 13, fontWeight: 700 }}>{w.method}</span>
     </div>
     <div style={S.mRow}>
      <span style={S.mLabel}>Account</span>
      <span style={{ fontSize: 13, fontFamily: 'var(--font-number)' }}>{w.account || '—'}</span>
     </div>
     <div style={{ display: 'flex', gap: 8, marginTop: 10 }}>
      <button style={{ ...S.btnSuccess, flex: 1 }} onClick={() => handleApproveWithdraw(w)}><i className="fa-solid fa-check"></i> Approve</button>
      <button style={{ ...S.btnDanger, flex: 1 }} onClick={() => handleRejectWithdraw(w)}><i className="fa-solid fa-xmark"></i> Reject</button>
     </div>
    </div>
   ))}
  </div>
 ) : (
  <table style={S.table}>
   <thead>
    <tr>
     <th style={S.th}>User</th>
     <th style={S.th}>Amount</th>
     <th style={S.th}>Method</th>
     <th style={S.th}>Account</th>
     <th style={S.th}>Actions</th>
    </tr>
   </thead>
   <tbody>
    {pendingWithdrawals.map(w => (
     <tr key={w.id}>
      <td style={S.td}><span style={{ fontWeight: 700 }}>{w.username}</span></td>
      <td style={S.td}><span style={{ fontWeight: 700, color: '#fbbf24' }}>{formatTK(w.amount)}</span></td>
      <td style={S.td}>{w.method}</td>
      <td style={S.td}><span style={{ fontFamily: 'var(--font-number)' }}>{w.account || '—'}</span></td>
      <td style={S.td}>
       <button style={S.btnSuccess} onClick={() => handleApproveWithdraw(w)}><i className="fa-solid fa-check"></i></button>
       <button style={{ ...S.btnDanger, marginLeft: 6 }} onClick={() => handleRejectWithdraw(w)}><i className="fa-solid fa-xmark"></i></button>
      </td>
     </tr>
    ))}
   </tbody>
  </table>
 )

 // ═══ TRANSACTIONS TAB CONTENT ═══
 const txContent = mobile ? (
  <div>
   {transactions.slice(0, 30).map(tx => {
    const isPos = tx.type === 'add' || tx.type === 'win'
    return (
     <div key={tx.id} style={{ ...S.mCard, display: 'flex', alignItems: 'center', gap: 10 }}>
      <div style={{ flex: 1 }}>
       <div style={{ fontSize: 11, fontWeight: 700, textTransform: 'uppercase', color: isPos ? '#22c55e' : '#ef4444' }}>{tx.type.toUpperCase()}</div>
       <div style={{ fontSize: 11, color: 'var(--text-muted)' }}>{tx.date}</div>
       <div style={{ fontSize: 12, marginTop: 2 }}>{tx.desc}</div>
      </div>
      <div style={{ fontWeight: 900, fontSize: 14, color: isPos ? '#22c55e' : '#ef4444' }}>
       {isPos ? '+' : '-'}{formatTK(Math.abs(tx.amount))}
      </div>
     </div>
    )
   })}
  </div>
 ) : (
  <table style={S.table}>
   <thead>
    <tr>
     <th style={S.th}>Type</th>
     <th style={S.th}>Description</th>
     <th style={S.th}>Amount</th>
     <th style={S.th}>Status</th>
     <th style={S.th}>Date</th>
    </tr>
   </thead>
   <tbody>
    {transactions.slice(0, 30).map(tx => {
     const isPos = tx.type === 'add' || tx.type === 'win'
     return (
      <tr key={tx.id}>
       <td style={S.td}><span style={{ fontSize: 11, fontWeight: 700, color: isPos ? '#22c55e' : '#ef4444' }}>{tx.type.toUpperCase()}</span></td>
       <td style={S.td}>{tx.desc}</td>
       <td style={S.td}><span style={{ fontWeight: 700, color: isPos ? '#22c55e' : '#ef4444' }}>{isPos ? '+' : '-'}{formatTK(Math.abs(tx.amount))}</span></td>
       <td style={S.td}><span style={{ fontSize: 11 }}>{(tx.status || 'completed').toUpperCase()}</span></td>
       <td style={S.td}><span style={{ fontSize: 11, color: 'var(--text-muted)' }}>{tx.date}</span></td>
      </tr>
     )
    })}
   </tbody>
  </table>
 )

 return (
  <div style={S.panel}>
   <h2 style={S.title}>Finance Management</h2>

   {/* ═══ PHASE 3.5 + 3.6: Sub-tab bar ═══ */}
   <div style={{ display: 'flex', gap: 8, marginBottom: 16, overflowX: 'auto', paddingBottom: 4 }}>
    {subTabs.map(st => {
     const active = financeTab === st.id
     return (
      <button
       key={st.id}
       onClick={() => setFinanceTab(st.id)}
       style={{
        display: 'flex',
        alignItems: 'center',
        gap: 6,
        padding: '8px 14px',
        borderRadius: 10,
        border: active ? `1px solid ${st.color}` : '1px solid rgba(255,255,255,0.06)',
        background: active ? `${st.color}15` : 'rgba(255,255,255,0.02)',
        color: active ? st.color : 'var(--text-muted)',
        fontWeight: 700,
        fontSize: 12,
        cursor: 'pointer',
        whiteSpace: 'nowrap',
        transition: 'all 0.2s'
       }}
      >
       <i className={st.icon}></i>
       {st.label}
       {st.count > 0 && (
        <span style={{ marginLeft: 4, fontSize: 10, background: active ? st.color : 'rgba(255,255,255,0.06)', color: active ? '#fff' : 'var(--text-muted)', padding: '1px 6px', borderRadius: 6, fontWeight: 800 }}>
         {st.count}
        </span>
       )}
      </button>
     )
    })}
   </div>
   {/* ═══ END PHASE 3.5 + 3.6 ═══ */}

   {/* Verify warning for deposits */}
   {financeTab === 'deposits' && requests.length > 0 && (
    <div style={{ background: 'rgba(251,191,36,0.08)', border: '1px solid rgba(251,191,36,0.2)', borderRadius: 10, padding: '10px 14px', marginBottom: 16, fontSize: 12, color: '#fbbf24' }}>
     <i className="fa-solid fa-triangle-exclamation" style={{ marginRight: 8 }}></i>
     <strong>Verify before approving:</strong> Check your payment app to confirm the user sent money. Match the <strong>TXID</strong> and <strong>Sender Number</strong>.
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
// 7. ADD MONEY REQUESTS (NEW)
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
    <h2 style={S.title}>Add Money Requests</h2>
    <div className="empty-state">
     <i className="fa-solid fa-check-circle" style={{ fontSize: 40, color: '#22c55e', marginBottom: 12, display: 'block' }}></i>
     <p style={{ fontSize: 12, fontWeight: 700, color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: 0.1 }}>All Caught Up</p>
     <p style={{ fontSize: 11, color: 'var(--text-muted)' }}>No pending add money requests. New requests appear here automatically.</p>
    </div>
   </div>
  )
 }

 return (
  <div style={S.panel}>
   <h2 style={S.title}>Add Money Requests</h2>

   <div style={{ background: 'rgba(251,191,36,0.08)', border: '1px solid rgba(251,191,36,0.2)', borderRadius: 10, padding: '10px 14px', marginBottom: 16, fontSize: 12, color: '#fbbf24' }}>
    <i className="fa-solid fa-triangle-exclamation" style={{ marginRight: 8 }}></i>
    <strong>Verify Before Approving</strong>
    <div style={{ marginTop: 4, color: 'var(--text-muted)' }}>
     Check your {requests[0]?.method || 'bKash'} payment app to confirm the user actually sent the money. Match the Transaction ID (TXID) before approving.
    </div>
   </div>

   {mobile ? (
    <div>
     {requests.map(req => {
      const isProcessing = processing === req.id
      return (
       <div key={req.id} style={S.mCard}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 8 }}>
         <div style={{ width: 32, height: 32, borderRadius: '50%', background: 'linear-gradient(135deg, #22c55e, #10b981)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 12, fontWeight: 800, color: '#fff' }}>
          {(req.username || '?').charAt(0)}
         </div>
         <div style={{ flex: 1 }}>
          <div style={{ fontWeight: 700, fontSize: 13 }}>{req.username}</div>
          {req.ign && (
           <div style={{ fontSize: 11, color: 'var(--text-muted)' }}>IGN: {req.ign}</div>
          )}
         </div>
         <div style={{ fontWeight: 900, fontSize: 16, color: '#22c55e' }}>{formatTK(req.amount)}</div>
        </div>
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 8, marginBottom: 10 }}>
         <div>
          <div style={S.mLabel}>Method</div>
          <div style={{ fontSize: 12, fontWeight: 700 }}>{req.method}</div>
         </div>
         <div>
          <div style={S.mLabel}>TXID</div>
          <div style={{ fontSize: 12, fontWeight: 700, fontFamily: 'var(--font-number)' }}>{req.txId || '—'}</div>
         </div>
         {req.senderNumber && (
          <div>
           <div style={S.mLabel}>Sender #</div>
           <div style={{ fontSize: 12, fontWeight: 700 }}>{req.senderNumber}</div>
          </div>
         )}
         {req.phone && (
          <div>
           <div style={S.mLabel}>Registered</div>
           <div style={{ fontSize: 12, fontWeight: 700 }}>{req.phone}</div>
          </div>
         )}
         <div>
          <div style={S.mLabel}>Time</div>
          <div style={{ fontSize: 12, color: 'var(--text-muted)' }}>{timeAgo(req.createdAt)}</div>
         </div>
        </div>
        <div style={{ display: 'flex', gap: 8 }}>
         <button style={{ ...S.btnSuccess, flex: 1 }} onClick={() => handleApprove(req)} disabled={isProcessing}>
          {isProcessing ? <i className="fa-solid fa-spinner fa-spin"></i> : <i className="fa-solid fa-check"></i>} Approve
         </button>
         <button style={{ ...S.btnDanger, flex: 1 }} onClick={() => handleReject(req)} disabled={isProcessing}>
          <i className="fa-solid fa-xmark"></i> Reject
         </button>
        </div>
       </div>
      )
     })}
    </div>
   ) : (
    <div style={{ ...S.card, overflowX: 'auto' }}>
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
        <th style={S.th}>Actions</th>
       </tr>
      </thead>
      <tbody>
       {requests.map(req => {
        const isProcessing = processing === req.id
        return (
         <tr key={req.id}>
          <td style={S.td}>
           <div style={{ fontWeight: 700, fontSize: 13 }}>{req.username}</div>
           {req.ign && (
            <div style={{ fontSize: 11, color: 'var(--text-muted)' }}>IGN: {req.ign}</div>
           )}
          </td>
          <td style={S.td}><span style={{ fontWeight: 700, color: '#22c55e' }}>{formatTK(req.amount)}</span></td>
          <td style={S.td}>{req.method}</td>
          <td style={S.td}><span style={{ fontFamily: 'var(--font-number)', fontSize: 12 }}>{req.txId || '—'}</span></td>
          <td style={S.td}>{req.senderNumber || '—'}</td>
          <td style={S.td}>{req.phone || '—'}</td>
          <td style={S.td}><span style={{ fontSize: 11, color: 'var(--text-muted)' }}>{timeAgo(req.createdAt)}</span></td>
          <td style={S.td}>
           <button style={S.btnSuccess} onClick={() => handleApprove(req)} disabled={isProcessing}>
            {isProcessing ? <i className="fa-solid fa-spinner fa-spin"></i> : <i className="fa-solid fa-check"></i>}
           </button>
           <button style={{ ...S.btnDanger, marginLeft: 6 }} onClick={() => handleReject(req)} disabled={isProcessing}>
            <i className="fa-solid fa-xmark"></i>
           </button>
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
// 8. PAYMENT SETTINGS
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
   <h2 style={S.title}>Payment Settings</h2>
   <p style={{ fontSize: 12, color: 'var(--text-muted)', marginBottom: 16 }}>Where users send money</p>

   <div style={{ maxWidth: 500 }}>
    {methods.map(m => (
     <div key={m.key} style={{ marginBottom: 16 }}>
      <label style={{ ...S.label, color: m.color }}>{m.label}</label>
      <div style={{ fontSize: 11, color: 'var(--text-muted)', marginBottom: 6 }}>Users see this number</div>
      <input
       style={{ ...S.input, borderColor: m.border, background: m.bg }}
       value={form[m.key]}
       onChange={e => update(m.key, e.target.value)}
       placeholder={`Enter ${m.label} number...`}
      />
     </div>
    ))}

    <button style={S.btnPrimary} onClick={handleSave}>
     <i className="fa-solid fa-save"></i> Save Payment Numbers
    </button>

    <div style={{ ...S.card, marginTop: 20 }}>
     <div style={S.cardHeader}>
      <div style={S.cardHeaderIcon('#6c8cff')}><i className="fa-solid fa-eye" style={{ color: '#6c8cff' }}></i></div>
      <h3 style={S.cardHeaderTitle}>User Preview (Add Money Modal)</h3>
     </div>
     <div style={{ padding: 16 }}>
      <div style={{ fontSize: 12, color: 'var(--text-muted)', marginBottom: 8 }}>Send Money To</div>
      <div style={{ display: 'flex', alignItems: 'center', gap: 10, padding: '10px 14px', background: 'rgba(226,19,110,0.05)', border: '1px solid rgba(226,19,110,0.15)', borderRadius: 10 }}>
       <i className="fa-solid fa-mobile-screen" style={{ color: '#e2136e', fontSize: 18 }}></i>
       <div>
        <div style={{ fontWeight: 700, fontSize: 16, color: '#fff' }}>{form.bKash || 'Not set by admin'}</div>
        <div style={{ fontSize: 11, color: 'var(--text-muted)' }}>via bKash</div>
       </div>
      </div>
     </div>
    </div>
   </div>
  </div>
 )
}


// ═══════════════════════════════════════
// 9. OWNER PANEL
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
   <h2 style={S.title}>Owner Control Panel</h2>

   <h3 style={{ ...S.title, fontSize: 16, marginTop: 20 }}>Admins & Their Permissions ({admins.length})</h3>
   {admins.map(admin => (
    <div key={admin.id} style={{ ...S.mCard, marginBottom: 12 }}>
     <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 10 }}>
      <div style={{ width: 36, height: 36, borderRadius: '50%', background: 'linear-gradient(135deg, #fbbf24, #f59e0b)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 14, fontWeight: 800, color: '#fff' }}>
       {(admin.name || admin.displayName || '?').charAt(0)}
      </div>
      <div style={{ flex: 1 }}>
       <div style={{ fontWeight: 700, fontSize: 14 }}>{admin.name || admin.displayName}</div>
       <div style={{ fontSize: 11, color: 'var(--text-muted)' }}>
        <span style={{ color: admin.role === 'owner' ? '#fbbf24' : '#a78bfa', fontWeight: 700 }}>
         {admin.role === 'owner' ? 'OWNER' : 'ADMIN'}
        </span>
       </div>
      </div>
      <div style={{ fontSize: 11, color: 'var(--text-muted)' }}>
       @{admin.username} — {admin.permissions?.length || 0} permissions
      </div>
      {admin.role !== 'owner' && (
       <button style={S.btnDanger} onClick={() => demote(admin.id)}>
        <i className="fa-solid fa-user-minus"></i> Demote
       </button>
      )}
     </div>

     {editingId === admin.id && (
      <div style={{ background: 'rgba(255,255,255,0.02)', borderRadius: 10, padding: 12, marginBottom: 10 }}>
       <div style={{ fontSize: 12, fontWeight: 700, marginBottom: 10, color: 'var(--text-muted)' }}>Toggle Permissions</div>
       {ALL_PERMISSIONS.map(p => {
        const on = editPerms.includes(p.key)
        return (
         <div key={p.key} onClick={() => togglePerm(p.key)} style={{ display: 'flex', alignItems: 'center', gap: 10, padding: '10px 14px', borderRadius: 8, cursor: 'pointer', background: on ? p.color + '10' : 'transparent', border: `1px solid ${on ? p.color + '30' : 'rgba(255,255,255,0.04)'}`, transition: 'all 0.2s', marginBottom: 6 }}>
          <i className={p.icon} style={{ color: on ? p.color : 'var(--text-muted)', width: 20, textAlign: 'center' }}></i>
          <span style={{ flex: 1, fontSize: 12, fontWeight: 600, color: on ? '#fff' : 'var(--text-muted)' }}>{p.label}</span>
          {on && <i className="fa-solid fa-check" style={{ color: p.color }}></i>}
         </div>
        )
       })}
       <div style={{ display: 'flex', gap: 8, marginTop: 10 }}>
        <button style={S.btnSuccess} onClick={savePerms}><i className="fa-solid fa-save"></i> Save</button>
        <button style={S.btnGhost} onClick={() => setEditingId(null)}>Cancel</button>
       </div>
      </div>
     )}

     {editingId !== admin.id && admin.permissions && admin.permissions.length > 0 && (
      <div style={{ display: 'flex', flexWrap: 'wrap', gap: 6 }}>
       {admin.permissions.map(pk => {
        const permDef = ALL_PERMISSIONS.find(p => p.key === pk)
        return permDef ? (
         <span key={pk} style={{ fontSize: 10, background: permDef.color + '15', color: permDef.color, padding: '2px 8px', borderRadius: 6, fontWeight: 700 }}>
          {permDef.label}
         </span>
        ) : null
       })}
      </div>
     )}
     {editingId !== admin.id && (!admin.permissions || admin.permissions.length === 0) && admin.role !== 'owner' && (
      <div style={{ fontSize: 11, color: 'var(--text-muted)', fontStyle: 'italic' }}>
       No permissions assigned — this admin can only see Overview
      </div>
     )}
     {editingId !== admin.id && admin.role !== 'owner' && (
      <button style={{ ...S.btnGhost, marginTop: 8, fontSize: 10 }} onClick={() => startEditPerms(admin)}>
       <i className="fa-solid fa-pen"></i> Edit Permissions
      </button>
     )}
    </div>
   ))}

   <h3 style={{ ...S.title, fontSize: 16, marginTop: 30 }}>Promote to Admin ({regularUsers.length} users)</h3>
   {mobile ? (
    <div>
     {regularUsers.filter(u => !u.banned).slice(0, 15).map(u => (
      <div key={u.id} style={{ ...S.mCard, display: 'flex', alignItems: 'center', gap: 10 }}>
       <div style={{ width: 32, height: 32, borderRadius: '50%', background: 'linear-gradient(135deg, #6c8cff, #a78bfa)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 12, fontWeight: 800, color: '#fff' }}>
        {(u.name || u.displayName || '?').charAt(0)}
       </div>
       <div style={{ flex: 1 }}>
        <div style={{ fontWeight: 700, fontSize: 13 }}>{u.name || u.displayName}</div>
        <div style={{ fontSize: 11, color: 'var(--text-muted)' }}>{u.ign || '—'} • {formatTK(u.balance ?? u.wallet ?? 0)}</div>
       </div>
       <button style={S.btnSuccess} onClick={() => promote(u.id)}>
        <i className="fa-solid fa-user-plus"></i> Promote
       </button>
      </div>
     ))}
    </div>
   ) : (
    <div style={{ ...S.card, overflowX: 'auto' }}>
     <table style={S.table}>
      <thead>
       <tr>
        <th style={S.th}>User</th>
        <th style={S.th}>IGN</th>
        <th style={S.th}>Balance</th>
        <th style={S.th}>Status</th>
        <th style={S.th}>Action</th>
       </tr>
      </thead>
      <tbody>
       {regularUsers.filter(u => !u.banned).slice(0, 15).map(u => (
        <tr key={u.id}>
         <td style={S.td}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
           <div style={{ width: 28, height: 28, borderRadius: '50%', background: 'linear-gradient(135deg, #6c8cff, #a78bfa)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 11, fontWeight: 800, color: '#fff' }}>
            {(u.name || u.displayName || '?').charAt(0)}
           </div>
           <span style={{ fontWeight: 700 }}>{u.name || u.displayName}</span>
          </div>
         </td>
         <td style={S.td}>{u.ign || '—'}</td>
         <td style={S.td}>{formatTK(u.balance ?? u.wallet ?? 0)}</td>
         <td style={S.td}><span style={{ fontSize: 11, fontWeight: 700, color: '#22c55e' }}>ACTIVE</span></td>
         <td style={S.td}>
          <button style={S.btnSuccess} onClick={() => promote(u.id)}>
           <i className="fa-solid fa-user-plus"></i> Promote
          </button>
         </td>
        </tr>
       ))}
      </tbody>
     </table>
    </div>
   )}
  </div>
 )
}

// ═══════════════════════════════════════
// 10. ACTIVITY LOG
// ═══════════════════════════════════════
function AdminActivityLog() {
 const { state } = useApp()
 const { activityLog } = state

 return (
  <div style={S.panel}>
   <h2 style={S.title}>Activity Log</h2>

   <div style={{ ...S.card }}>
    <div style={S.cardHeader}>
     <div style={S.cardHeaderIcon('#6c8cff')}><i className="fa-solid fa-clock-rotate-left" style={{ color: '#6c8cff' }}></i></div>
     <h3 style={S.cardHeaderTitle}>All Admin Actions</h3>
     <span style={{ marginLeft: 'auto', fontSize: 11, color: 'var(--text-muted)' }}>{(activityLog || []).length} entries</span>
    </div>
    <div style={{ padding: 16 }}>
     {!(activityLog || []).length ? (
      <div style={{ textAlign: 'center', padding: 40 }}>
       <i className="fa-solid fa-clipboard" style={{ fontSize: 32, color: 'var(--bg-elevated)', marginBottom: 12, display: 'block' }}></i>
       <p style={{ fontSize: 12, fontWeight: 700, color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: 0.1 }}>No activity logged yet</p>
      </div>
     ) : (
      <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
       {activityLog.map(log => (
        <div key={log.id} style={{ display: 'flex', alignItems: 'center', gap: 12, padding: '10px 14px', background: 'rgba(255,255,255,0.02)', borderRadius: 8, border: '1px solid rgba(255,255,255,0.04)' }}>
         <div style={{ width: 28, height: 28, borderRadius: '50%', background: 'linear-gradient(135deg, #6c8cff, #a78bfa)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 10, fontWeight: 800, color: '#fff', flexShrink: 0 }}>
          {log.adminName?.charAt(0) || '?'}
         </div>
         <div style={{ flex: 1 }}>
          <div style={{ fontWeight: 700, fontSize: 12 }}>
           {log.adminName}
           <span style={{ fontSize: 10, color: 'var(--text-muted)', marginLeft: 6, fontWeight: 600 }}>
            {(log.adminRole || '').toUpperCase()}
           </span>
          </div>
          <div style={{ fontSize: 11, color: 'var(--text-muted)', marginTop: 2 }}>
           {log.action}{log.target ? ` — ${log.target}` : ''}
          </div>
         </div>
         <div style={{ fontSize: 10, color: 'var(--text-muted)', flexShrink: 0 }}>
          {log.createdAt ? new Date(log.createdAt.replace(' ', 'T')).toLocaleString('en-GB', { day: '2-digit', month: 'short', hour: '2-digit', minute: '2-digit' }) : '—'}
         </div>
        </div>
       ))}
      </div>
     )}
    </div>
   </div>
  </div>
 )
}

// ═══════════════════════════════════════
// MAIN ADMIN LAYOUT
// ═══════════════════════════════════════
const ADMIN_TABS = [
 { id: 'admin-overview', label: 'Overview', icon: 'fa-chart-pie', color: '#00f0ff' },
 { id: 'admin-profit', label: 'Profit', icon: 'fa-chart-line', color: '#22c55e' }, // ═══ v5.0
 { id: 'admin-create', label: 'Create Match', icon: 'fa-circle-plus', color: '#a78bfa' },
 { id: 'admin-rooms', label: 'Rooms', icon: 'fa-key', color: '#fbbf24' },
 { id: 'admin-results', label: 'Results', icon: 'fa-clipboard-check', color: '#22c55e' },
 { id: 'admin-users', label: 'Users', icon: 'fa-users-gear', color: '#6c8cff' },
 { id: 'admin-finance', label: 'Finance', icon: 'fa-money-bill-transfer', color: '#ef4444' },
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
  if (perm === null) return true // overview — always visible
  if (perm === '__owner__') return false // owner-only tabs
  return userPerms.includes(perm)
 }

 const visibleTabs = ADMIN_TABS.filter(t => canAccess(t.id))
 const activeTab = VALID_ADMIN_TABS.has(state.currentView) ? state.currentView : 'admin-overview'
 const handleTab = (id) => navigate(id)

 return (
  <div className="admin-panel" style={{ padding: mobile ? '16px' : '24px', maxWidth: 1200, margin: '0 auto' }}>
   {/* Desktop tabs — only show accessible ones */}
   {!mobile && (
    <div style={{ display: 'flex', flexWrap: 'wrap', gap: 8, marginBottom: 24 }}>
     {visibleTabs.map(t => {
      const active = activeTab === t.id
      return (
       <button
        key={t.id}
        onClick={() => handleTab(t.id)}
        style={{
         display: 'flex',
         alignItems: 'center',
         gap: 8,
         padding: '10px 16px',
         borderRadius: 10,
         border: active ? `1px solid ${t.color}` : '1px solid rgba(255,255,255,0.06)',
         background: active ? `${t.color}15` : 'rgba(255,255,255,0.02)',
         color: active ? t.color : 'var(--text-muted)',
         fontWeight: 700,
         fontSize: 12,
         cursor: 'pointer',
         transition: 'all 0.2s',
         whiteSpace: 'nowrap'
        }}
       >
        <i className={t.icon}></i>
        {t.label}
       </button>
      )
     })}
    </div>
   )}

   {/* Mobile bottom nav */}
   {mobile && (
    <div style={{ display: 'flex', overflowX: 'auto', gap: 8, marginBottom: 16, paddingBottom: 4, scrollbarWidth: 'none' }}>
     {visibleTabs.map(t => {
      const active = activeTab === t.id
      return (
       <button
        key={t.id}
        onClick={() => handleTab(t.id)}
        style={{
         display: 'flex',
         flexDirection: 'column',
         alignItems: 'center',
         gap: 4,
         padding: '8px 12px',
         borderRadius: 10,
         border: active ? `1px solid ${t.color}` : '1px solid rgba(255,255,255,0.06)',
         background: active ? `${t.color}15` : 'rgba(255,255,255,0.02)',
         color: active ? t.color : 'var(--text-muted)',
         fontWeight: 700,
         fontSize: 10,
         cursor: 'pointer',
         transition: 'all 0.2s',
         minWidth: 60,
         flexShrink: 0
        }}
       >
        <i className={t.icon} style={{ fontSize: 16 }}></i>
        <span>{t.label}</span>
       </button>
      )
     })}
    </div>
   )}

   {/* ═══ FIX: Tab content — Added AdminOverview which was missing! ═══ */}
   {activeTab === 'admin-overview' && canAccess('admin-overview') && <AdminOverview />}
   {activeTab === 'admin-profit' && canAccess('admin-profit') && <AdminProfit />}
   {activeTab === 'admin-create' && canAccess('admin-create') && <AdminCreateMatch />}
   {activeTab === 'admin-rooms' && canAccess('admin-rooms') && <AdminRooms />}
   {activeTab === 'admin-results' && canAccess('admin-results') && <AdminResults />}
   {activeTab === 'admin-users' && canAccess('admin-users') && <AdminUsers />}
   {activeTab === 'admin-finance' && canAccess('admin-finance') && <AdminFinance />}
   {activeTab === 'admin-add-money' && canAccess('admin-add-money') && <AdminAddMoneyRequests />}
   {activeTab === 'admin-payments' && canAccess('admin-payments') && <AdminPaymentSettings />}
   {activeTab === 'admin-owners' && canAccess('admin-owners') && <AdminOwnerPanel />}
   {activeTab === 'admin-activity' && canAccess('admin-activity') && <AdminActivityLog />}
   {/* ═══ END FIX ═══ */}

   {/* Locked fallback */}
   {!canAccess(activeTab) && (
    <div style={{ textAlign: 'center', padding: 60 }}>
     <i className="fa-solid fa-lock" style={{ fontSize: 40, color: 'var(--bg-elevated)', marginBottom: 16, display: 'block' }}></i>
     <h3 style={{ fontSize: 18, fontWeight: 800, marginBottom: 8 }}>No Access</h3>
     <p style={{ fontSize: 12, color: 'var(--text-muted)' }}>
      You don't have permission to view this section.<br />
      Contact the Owner to get access.
     </p>
    </div>
   )}
  </div>
 )
}
