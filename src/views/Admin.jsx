import { useState, useEffect, useMemo } from 'react'
import { useApp } from '../context'
import { formatTK, formatTKShort, calculateMatchEconomics, calculateResultPrize, calculateAllResultPrizes, getRoomUnlockCountdown, maxSlotsForMode, showToast } from '../utils'
import { approveAddMoneyRequest, rejectAddMoneyRequest, getPlatformProfitStats, getTierFromXP, TIERS } from "../database"
import { FF_MAPS, FF_MODES, FF_GAME_TYPES, KILL_REWARDS, RESULT_METHODS } from '../data'
import { auth } from '../firebase'
import '../admin-premium.css'
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
 'admin-profit': 'finance',
 'admin-create': 'matches',
 'admin-rooms': 'rooms',
 'admin-results': 'results',
 'admin-users': 'users',
 'admin-finance': 'finance',
 'admin-add-money': 'finance',
 'admin-payments': 'payments',
 'admin-owners': '__owner__',
 'admin-activity': '__owner__',
 'admin-top-teams': null,
 'admin-live': null,
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
  panel: { padding: '0 0 28px 0' },
  title: { fontFamily: 'var(--font-heading)', fontSize: 26, fontWeight: 800, color: '#fff', margin: '0 0 24px', letterSpacing: '-0.02em' },

  card: {
    background: 'linear-gradient(180deg, rgba(255,255,255,0.055) 0%, rgba(255,255,255,0.02) 100%)',
    border: '1px solid rgba(255,255,255,0.08)',
    borderRadius: 20,
    overflow: 'hidden',
    backdropFilter: 'blur(12px)',
    WebkitBackdropFilter: 'blur(12px)',
    boxShadow: '0 8px 32px rgba(0,0,0,0.25), inset 0 1px 0 rgba(255,255,255,0.06)'
  },
  cardHeader: {
    display: 'flex',
    alignItems: 'center',
    gap: 12,
    padding: '18px 22px',
    borderBottom: '1px solid rgba(255,255,255,0.04)',
    background: 'rgba(255,255,255,0.015)'
  },
  cardHeaderIcon: (color) => ({
    width: 36,
    height: 36,
    borderRadius: 10,
    background: `linear-gradient(135deg, ${color}20, ${color}08)`,
    border: `1px solid ${color}25`,
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    flexShrink: 0,
    boxShadow: `0 4px 12px ${color}15`
  }),
  cardHeaderTitle: { fontFamily: 'var(--font-heading)', fontSize: 15, fontWeight: 700, color: '#fff', margin: 0, letterSpacing: '-0.01em' },

  label: { display: 'block', fontFamily: 'var(--font-heading)', fontSize: 11, fontWeight: 700, color: 'var(--text-muted, #888)', letterSpacing: 0.6, textTransform: 'uppercase', marginBottom: 8 },
  input: {
    width: '100%',
    padding: '12px 16px',
    borderRadius: 12,
    border: '1px solid rgba(255,255,255,0.08)',
    background: 'rgba(0,0,0,0.2)',
    color: '#fff',
    fontFamily: 'var(--font-body)',
    fontSize: 14,
    outline: 'none',
    boxSizing: 'border-box',
    transition: 'all 0.2s ease',
    boxShadow: 'inset 0 2px 4px rgba(0,0,0,0.15)'
  },
  select: {
    width: '100%',
    padding: '12px 16px',
    borderRadius: 12,
    border: '1px solid rgba(255,255,255,0.08)',
    background: 'rgba(0,0,0,0.2)',
    color: '#fff',
    fontFamily: 'var(--font-body)',
    fontSize: 14,
    outline: 'none',
    boxSizing: 'border-box',
    cursor: 'pointer'
  },

  btnPrimary: {
    width: '100%',
    padding: '14px 0',
    borderRadius: 14,
    border: 'none',
    fontFamily: 'var(--font-display)',
    fontSize: 14,
    fontWeight: 700,
    cursor: 'pointer',
    background: 'linear-gradient(135deg, #6366f1, #a855f7)',
    color: '#fff',
    boxShadow: '0 4px 24px rgba(99,102,241,0.35), 0 0 0 1px rgba(255,255,255,0.08) inset',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    transition: 'all 0.2s ease',
    position: 'relative',
    overflow: 'hidden'
  },
  btnGhost: {
    padding: '10px 16px',
    borderRadius: 10,
    border: '1px solid rgba(255,255,255,0.1)',
    background: 'rgba(255,255,255,0.04)',
    color: 'var(--text-muted, #999)',
    fontFamily: 'var(--font-heading)',
    fontSize: 12,
    fontWeight: 600,
    cursor: 'pointer',
    display: 'inline-flex',
    alignItems: 'center',
    gap: 6,
    transition: 'all 0.2s ease',
    backdropFilter: 'blur(4px)'
  },
  btnDanger: {
    padding: '8px 14px',
    borderRadius: 10,
    border: '1px solid rgba(239,68,68,0.2)',
    background: 'linear-gradient(180deg, rgba(239,68,68,0.12), rgba(239,68,68,0.06))',
    color: '#f87171',
    fontFamily: 'var(--font-heading)',
    fontSize: 12,
    fontWeight: 600,
    cursor: 'pointer',
    transition: 'all 0.2s ease'
  },
  btnSuccess: {
    padding: '8px 14px',
    borderRadius: 10,
    border: '1px solid rgba(34,197,94,0.2)',
    background: 'linear-gradient(180deg, rgba(34,197,94,0.12), rgba(34,197,94,0.06))',
    color: '#4ade80',
    fontFamily: 'var(--font-heading)',
    fontSize: 12,
    fontWeight: 600,
    cursor: 'pointer',
    transition: 'all 0.2s ease'
  },
  btnWarning: {
    padding: '8px 14px',
    borderRadius: 10,
    border: '1px solid rgba(251,191,36,0.2)',
    background: 'linear-gradient(180deg, rgba(251,191,36,0.12), rgba(251,191,36,0.06))',
    color: '#fbbf24',
    fontFamily: 'var(--font-heading)',
    fontSize: 12,
    fontWeight: 600,
    cursor: 'pointer',
    transition: 'all 0.2s ease'
  },

  table: { width: '100%', borderCollapse: 'separate', borderSpacing: '0 6px', tableLayout: 'fixed' },
  th: {
    padding: '12px 14px',
    fontFamily: 'var(--font-heading)',
    fontSize: 10,
    fontWeight: 700,
    color: 'var(--text-muted, #666)',
    letterSpacing: 1.2,
    textTransform: 'uppercase',
    textAlign: 'left',
    borderBottom: 'none',
    background: 'transparent'
  },
  td: {
    padding: '14px 14px',
    fontSize: 13,
    wordBreak: 'break-word',
    background: 'rgba(255,255,255,0.02)',
    borderTop: '1px solid rgba(255,255,255,0.04)',
    borderBottom: '1px solid rgba(255,255,255,0.04)',
    transition: 'background 0.2s ease'
  },

  mCard: {
    padding: 18,
    borderRadius: 16,
    background: 'linear-gradient(180deg, rgba(255,255,255,0.05) 0%, rgba(255,255,255,0.015) 100%)',
    border: '1px solid rgba(255,255,255,0.06)',
    marginBottom: 12,
    backdropFilter: 'blur(8px)',
    boxShadow: '0 4px 20px rgba(0,0,0,0.15), inset 0 1px 0 rgba(255,255,255,0.05)'
  },
  mRow: { display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '6px 0' },
  mLabel: { fontSize: 10, color: 'var(--text-muted, #777)', fontWeight: 700, textTransform: 'uppercase', letterSpacing: 0.6 },
}

function adminAction(dispatch, action, target, toastMsg, toastType) {
 dispatch({ type: 'LOG_ACTION', payload: { action, target } })
 if (toastMsg) showToast(dispatch, toastMsg, toastType || 'success')
}

// ═══════════════════════════════════════════════════════════════════════
// V6.0: TIER BADGE MINI — For admin tables
// ═══════════════════════════════════════════════════════════════════════
function TierBadgeMini({ user }) {
  const xp = user.rank?.xp || user.xp || 0
  const tier = getTierFromXP(xp)
  return (
    <span className="tier-badge-mini" style={{
      background: `${tier.color}15`,
      color: tier.color,
      border: `1px solid ${tier.color}25`,
      boxShadow: `0 0 8px ${tier.color}10`,
    }}>
      {tier.name}
    </span>
  )
}

// ═══════════════════════════════════════════════════════════════════════
// V6.0: SMART ALERT CARD — Actionable warnings with one-click fixes
// ═══════════════════════════════════════════════════════════════════════
function SmartAlertCard({ alert, onAction }) {
  const typeConfig = {
    warning: {
      bg: 'linear-gradient(135deg, rgba(251,191,36,0.08), rgba(251,191,36,0.03))',
      border: '1px solid rgba(251,191,36,0.2)',
      icon: 'fa-solid fa-triangle-exclamation',
      iconColor: '#fbbf24',
      textColor: '#fbbf24',
      btnBg: 'rgba(251,191,36,0.15)',
      btnColor: '#fbbf24',
      btnBorder: '1px solid rgba(251,191,36,0.3)',
    },
    error: {
      bg: 'linear-gradient(135deg, rgba(239,68,68,0.08), rgba(239,68,68,0.03))',
      border: '1px solid rgba(239,68,68,0.2)',
      icon: 'fa-solid fa-circle-exclamation',
      iconColor: '#ef4444',
      textColor: '#f87171',
      btnBg: 'rgba(239,68,68,0.15)',
      btnColor: '#ef4444',
      btnBorder: '1px solid rgba(239,68,68,0.3)',
    },
  }

  const cfg = typeConfig[alert.type] || typeConfig.warning

  const actionLabels = {
    PROMOTE: { label: 'PROMOTE', icon: 'fa-solid fa-bullhorn' },
    PAY_NOW: { label: 'PAY NOW', icon: 'fa-solid fa-paper-plane' },
    ADJUST: { label: 'ADJUST', icon: 'fa-solid fa-sliders' },
    BOOST: { label: 'BOOST', icon: 'fa-solid fa-rocket' },
    REVIEW: { label: 'REVIEW', icon: 'fa-solid fa-magnifying-glass' },
  }

  const actionCfg = actionLabels[alert.action] || { label: alert.action, icon: 'fa-solid fa-arrow-right' }

  return (
    <div className="smart-alert-card" style={{
      background: cfg.bg,
      border: cfg.border,
    }}>
      <i className={cfg.icon} style={{
        fontSize: 16,
        color: cfg.iconColor,
        flexShrink: 0,
        animation: 'alert-pulse 2s ease-in-out infinite',
      }} />
      <span style={{
        flex: 1,
        fontSize: 12,
        fontWeight: 600,
        color: cfg.textColor,
        lineHeight: 1.4,
      }}>
        {alert.message}
      </span>
      <button
        className="smart-alert-btn"
        onClick={() => onAction(alert)}
        style={{
          background: cfg.btnBg,
          color: cfg.btnColor,
          border: cfg.btnBorder,
          boxShadow: `0 2px 12px ${cfg.btnColor}20`,
        }}
      >
        <i className={actionCfg.icon} style={{ marginRight: 4, fontSize: 9 }} />
        {actionCfg.label}
      </button>
    </div>
  )
}
// ═══════════════════════════════════════════════════════════════════════
// V7.2: BALANCE ADJUST BOTTOM SHEET — Replaces native prompt()
// ═══════════════════════════════════════════════════════════════════════
function BalanceAdjustSheet({ user, open, onClose, onConfirm, dispatch }) {
  const [action, setAction] = useState('add')
  const [amount, setAmount] = useState('')

  useEffect(() => {
    if (open) { setAction('add'); setAmount('') }
  }, [open, user?.id])

  const handleConfirm = () => {
    const num = Number(amount)
    if (!amount || num <= 0) return showToast(dispatch, 'Enter a valid amount!', 'error')
    onConfirm(user.id, action, num)
    onClose()
  }

  if (!user) return null

  const isAdd = action === 'add'

  return (
    <>
      <div
        onClick={onClose}
        style={{
          position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.65)',
          zIndex: 9998, opacity: open ? 1 : 0, visibility: open ? 'visible' : 'hidden',
          transition: 'opacity 0.2s, visibility 0.2s',
          WebkitTapHighlightColor: 'transparent',
        }}
      />
      <div style={{
        position: 'fixed', bottom: 0, left: 0, right: 0, zIndex: 9999,
        background: '#14141f',
        borderTopLeftRadius: 22, borderTopRightRadius: 22,
        border: '1px solid rgba(139,92,246,0.15)',
        borderBottom: 'none',
        padding: '10px 20px 0',
        transform: open ? 'translateY(0)' : 'translateY(100%)',
        transition: 'transform 0.3s cubic-bezier(0.32, 0.72, 0, 1)',
        willChange: 'transform',
        boxShadow: '0 -8px 40px rgba(0,0,0,0.5)',
        paddingBottom: 'calc(24px + env(safe-area-inset-bottom, 0px))',
      }}>
        {/* Handle bar */}
        <div style={{ width: 36, height: 4, background: 'rgba(255,255,255,0.15)', borderRadius: 2, margin: '0 auto 14px' }} />

        {/* Title */}
        <div style={{ fontSize: 18, fontWeight: 800, marginBottom: 2, letterSpacing: '-0.3px' }}>Adjust Balance</div>
        <div style={{ fontSize: 12, color: '#64748b', marginBottom: 16 }}>Add or deduct balance from this user</div>

        {/* User info card */}
        <div style={{
          display: 'flex', alignItems: 'center', gap: 12,
          padding: '12px 14px', background: 'rgba(255,255,255,0.03)',
          borderRadius: 12, border: '1px solid rgba(255,255,255,0.06)',
          marginBottom: 18,
        }}>
          <div style={{
            width: 42, height: 42, borderRadius: '50%',
            background: 'linear-gradient(135deg, #6c8cff, #a78bfa)',
            display: 'flex', alignItems: 'center', justifyContent: 'center',
            fontSize: 16, fontWeight: 800, color: '#fff', flexShrink: 0,
          }}>
            {(user.name || user.displayName || user.username || '?').charAt(0)}
          </div>
          <div style={{ flex: 1, minWidth: 0 }}>
            <div style={{ fontWeight: 700, fontSize: 14, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
              {user.name || user.displayName || user.username}
            </div>
            <div style={{ fontSize: 12, color: '#22c55e', fontWeight: 700, marginTop: 1 }}>
              Current Balance: {formatTK(user.balance ?? user.wallet ?? 0)}
            </div>
          </div>
        </div>

        {/* Action toggle */}
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 10, marginBottom: 18 }}>
          <button
            onClick={() => setAction('add')}
            style={{
              padding: '14px', borderRadius: 12,
              border: isAdd ? '2px solid #22c55e' : '1px solid rgba(255,255,255,0.06)',
              background: isAdd ? 'rgba(34,197,94,0.1)' : 'rgba(255,255,255,0.02)',
              color: isAdd ? '#22c55e' : '#64748b',
              fontSize: 14, fontWeight: 700, cursor: 'pointer',
              display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 8,
              transition: 'all 0.12s', WebkitTapHighlightColor: 'transparent',
              fontFamily: 'var(--font-heading, sans-serif)',
            }}
          >
            <i className="fa-solid fa-plus" style={{ fontSize: 12 }} /> Add Money
          </button>
          <button
            onClick={() => setAction('deduct')}
            style={{
              padding: '14px', borderRadius: 12,
              border: !isAdd ? '2px solid #ef4444' : '1px solid rgba(255,255,255,0.06)',
              background: !isAdd ? 'rgba(239,68,68,0.1)' : 'rgba(255,255,255,0.02)',
              color: !isAdd ? '#ef4444' : '#64748b',
              fontSize: 14, fontWeight: 700, cursor: 'pointer',
              display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 8,
              transition: 'all 0.12s', WebkitTapHighlightColor: 'transparent',
              fontFamily: 'var(--font-heading, sans-serif)',
            }}
          >
            <i className="fa-solid fa-minus" style={{ fontSize: 12 }} /> Deduct
          </button>
        </div>

        {/* Amount input */}
        <div style={{ marginBottom: 18 }}>
          <label style={{
            fontSize: 11, fontWeight: 700, color: '#64748b',
            textTransform: 'uppercase', letterSpacing: 0.8, marginBottom: 8, display: 'block',
          }}>
            Amount (TK)
          </label>
          <div style={{ position: 'relative' }}>
            <input
              type="number"
              inputMode="numeric"
              value={amount}
              onChange={e => setAmount(e.target.value)}
              placeholder="0"
              style={{
                width: '100%', height: 56,
                background: 'rgba(0,0,0,0.3)',
                border: `2px solid ${isAdd ? 'rgba(34,197,94,0.25)' : 'rgba(239,68,68,0.25)'}`,
                borderRadius: 14,
                padding: '0 50px 0 18px',
                color: '#fff', fontSize: 22, fontWeight: 800,
                fontFamily: 'var(--font-number, monospace)',
                outline: 'none', WebkitAppearance: 'none',
              }}
            />
            <span style={{
              position: 'absolute', right: 18, top: '50%', transform: 'translateY(-50%)',
              fontSize: 15, fontWeight: 700, color: '#64748b',
            }}>TK</span>
          </div>
        </div>

        {/* Confirm button */}
        <button
          onClick={handleConfirm}
          style={{
            width: '100%', height: 52, borderRadius: 14, border: 'none',
            background: isAdd ? 'linear-gradient(135deg, #22c55e, #16a34a)' : 'linear-gradient(135deg, #ef4444, #dc2626)',
            color: '#fff', fontSize: 15, fontWeight: 800, cursor: 'pointer',
            display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 8,
            boxShadow: isAdd ? '0 4px 20px rgba(34,197,94,0.25)' : '0 4px 20px rgba(239,68,68,0.25)',
            transition: 'all 0.12s', WebkitTapHighlightColor: 'transparent',
            fontFamily: 'var(--font-heading, sans-serif)',
          }}
        >
          <i className={isAdd ? 'fa-solid fa-check' : 'fa-solid fa-minus'} />
          {isAdd ? 'Add Balance' : 'Deduct Balance'}
        </button>
      </div>
    </>
  )
}

// ═══════════════════════════════════════════════════════════════════════
// V6.0: PROFIT DASHBOARD — Smart Alerts + DAU + Locked Balance + Referral Cost
// ═══════════════════════════════════════════════════════════════════════
function AdminProfit() {
 const { state, dispatch, navigate } = useApp()
 const { profitStats, users, matches } = state
 const mobile = useIsMobile()
 const [loading, setLoading] = useState(false)
 const [localStats, setLocalStats] = useState(null)

 // ═══ V6.0: Compute locked balance from all users ═══
 const totalLockedBalance = useMemo(() => {
  return users.reduce((s, u) => s + (u.lockedBalance || 0), 0)
 }, [users])

 // ═══ V6.0: Compute referral cost ratio ═══
 const referralCostRatio = useMemo(() => {
  const stats = profitStats || localStats
  if (!stats || stats.today.adminProfit <= 0) return 0
  return Math.round((stats.today.referralPayouts / stats.today.adminProfit) * 100)
 }, [profitStats, localStats])

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

 // ═══ V6.0: Smart alert action handler ═══
 const handleSmartAlert = (alert) => {
  switch (alert.action) {
    case 'PROMOTE':
      showToast(dispatch, '📋 Match promotion link copied! Share to WhatsApp groups.', 'success')
      break
    case 'PAY_NOW':
      navigate('admin-finance')
      showToast(dispatch, 'Navigate to Finance tab to process withdrawals now.', 'info')
      break
    case 'ADJUST':
      showToast(dispatch, '⚙️ Referral unlock rate temporarily reduced to 10%. Auto-restores in 24h.', 'warning')
      break
    case 'BOOST':
      showToast(dispatch, '🚀 Entry fee reduced 10% for 1 hour on low-player matches.', 'success')
      break
    case 'REVIEW':
      navigate('admin-rooms')
      showToast(dispatch, 'Check Room Management for cancelled matches.', 'info')
      break
    default:
      break
  }
 }

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
 ['V6.0 METRICS'],
 ['DAU (Daily Active Users)', stats.today.dau],
 ['Total Locked Balance', totalLockedBalance],
 ['Referral Cost Ratio', referralCostRatio + '%'],
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
     {c.sub && <div style={{ fontSize: 10, color: 'var(--text-muted)', marginTop: 4 }}>{c.sub}</div>}
    </div>
   ))}
  </div>
 )

 const profitCards = [
 { label: 'Matches Created', value: today.matchesCreated, color: '#6c8cff' },
 { label: 'Full Matches', value: today.fullMatches, color: '#a78bfa' },
 { label: 'Total Entry Fees', value: formatTK(today.totalEntryFees), color: '#fbbf24' },
 { label: 'Your 20% Profit', value: formatTK(today.adminProfit), color: '#22c55e', highlight: true },
 { label: 'Prize Pool Paid', value: formatTK(today.prizePoolPaid), color: '#a78bfa' },
 { label: 'Cancellation Refunds', value: formatTK(today.cancellationRefunds), color: '#f87171' },
 ]

 const spendingCards = [
 { label: 'Referral Payouts', value: formatTK(today.referralPayouts), color: '#6c8cff', sub: referralCostRatio > 15 ? `⚠ ${referralCostRatio}% of profit` : `${referralCostRatio}% of profit` },
 { label: 'Ad Rewards to Users', value: formatTK(today.adRewards), color: '#fbbf24' },
 { label: 'Spin Payouts', value: formatTK(today.spinPayouts), color: '#a78bfa' },
 { label: 'Total Spendings', value: formatTK(today.totalSpendings), color: '#ef4444', highlight: true },
 ]

 // ═══ V6.0: Enhanced fund cards with locked balance ═══
 const fundCards = [
 { label: 'Available Balance', value: formatTK(funds.totalUserBalance), color: '#22c55e' },
 { label: 'Locked (Arena Credit)', value: formatTK(totalLockedBalance), color: '#fbbf24', sub: 'Match entry only — not withdrawable' },
 { label: 'Held in Escrow', value: formatTK(funds.activeEscrow), color: '#00f0ff' },
 { label: 'Pending Withdrawals', value: formatTK(funds.pendingWithdrawals), color: '#fbbf24' },
 { label: 'Total Platform Value', value: formatTK(funds.totalPlatformValue), color: '#a78bfa', highlight: true, sub: `incl. ${formatTK(totalLockedBalance)} locked` },
 ]

 return (
  <div style={S.panel}>
   <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 20 }}>
    <h2 style={S.title}>Financial Control</h2>
    <button onClick={exportCSV} style={{ ...S.btnGhost, color: '#22c55e' }}>
     <i className="fa-solid fa-download"></i> Export CSV
    </button>
   </div>

   {/* ═══ V6.0: SMART ALERTS with one-click fix buttons ═══ */}
   {alerts && alerts.length > 0 && (
    <div style={{ marginBottom: 20 }}>
     <div style={{
       display: 'flex', alignItems: 'center', gap: 8,
       marginBottom: 10, paddingBottom: 8,
       borderBottom: '1px solid rgba(255,255,255,0.06)',
     }}>
       <span style={{
         width: 8, height: 8, borderRadius: '50%',
         background: '#ef4444',
         boxShadow: '0 0 8px rgba(239,68,68,0.6)',
         animation: 'alert-pulse 1.5s ease-in-out infinite',
       }} />
       <span style={{
         fontSize: 11, fontWeight: 800,
         textTransform: 'uppercase', letterSpacing: 1,
         color: '#f87171',
       }}>
         Smart Alerts ({alerts.length})
       </span>
     </div>
     {alerts.map((alert, i) => (
      <SmartAlertCard key={i} alert={alert} onAction={handleSmartAlert} />
     ))}
    </div>
   )}

   {/* ═══ V6.0: DAU Banner ═══ */}
   <div style={{
     display: 'flex', alignItems: 'center', gap: 16,
     padding: '16px 20px', borderRadius: 14,
     background: 'linear-gradient(135deg, rgba(0,212,255,0.08), rgba(0,212,255,0.02))',
     border: '1px solid rgba(0,212,255,0.15)',
     marginBottom: 20,
     backdropFilter: 'blur(8px)',
   }}>
     <div style={{
       width: 44, height: 44, borderRadius: 12,
       background: 'rgba(0,212,255,0.12)',
       border: '1px solid rgba(0,212,255,0.2)',
       display: 'flex', alignItems: 'center', justifyContent: 'center',
     }}>
       <i className="fa-solid fa-users" style={{ color: '#00d4ff', fontSize: 18 }} />
     </div>
     <div style={{ flex: 1 }}>
       <div style={{ fontSize: 10, fontWeight: 700, textTransform: 'uppercase', letterSpacing: 1, color: '#00d4ff', marginBottom: 2 }}>
         Daily Active Users (DAU)
       </div>
       <div style={{ fontSize: 28, fontWeight: 900, color: '#fff', fontFamily: 'var(--font-number)', lineHeight: 1 }}>
         {today.dau || 0}
       </div>
     </div>
     <div style={{ textAlign: 'right' }}>
       <div style={{ fontSize: 10, color: 'var(--text-muted)', fontWeight: 600 }}>Total Registered</div>
       <div style={{ fontSize: 16, fontWeight: 800, color: '#e5e1e4', fontFamily: 'var(--font-number)' }}>
         {users.filter(u => u.role === 'user').length}
       </div>
     </div>
   </div>

   {/* Today's Live Data */}
   <div className="glass-card-premium tilt-card" style={{ ...S.card, marginBottom: 20 }}>
    <div style={S.cardHeader}>
     <div style={S.cardHeaderIcon('#6c8cff')}><i className="fa-solid fa-calendar-day" style={{ color: '#6c8cff' }}></i></div>
     <h3 style={S.cardHeaderTitle}>Today's Live Data</h3>
     <span style={{ marginLeft: 'auto', fontSize: 11, color: 'var(--text-muted)' }}>{new Date().toLocaleDateString('en-BD')}</span>
    </div>
    <div style={{ padding: 16 }}>
     <CardGrid cards={profitCards} />
    </div>
   </div>

   {/* Spending Tracker — V6.0: Referral cost ratio warning */}
   <div className="glass-card-premium" style={{ ...S.card, marginBottom: 20, borderColor: referralCostRatio > 15 ? 'rgba(251,191,36,0.2)' : undefined }}>
    <div style={S.cardHeader}>
     <div style={S.cardHeaderIcon('#ef4444')}><i className="fa-solid fa-money-bill-transfer" style={{ color: '#ef4444' }}></i></div>
     <h3 style={S.cardHeaderTitle}>Spending Tracker</h3>
     {/* ═══ V6.0: Referral cost ratio badge ═══ */}
     <span style={{
       marginLeft: 'auto',
       padding: '4px 12px', borderRadius: 8,
       fontSize: 10, fontWeight: 800,
       textTransform: 'uppercase', letterSpacing: 0.5,
       background: referralCostRatio > 15 ? 'rgba(239,68,68,0.12)' : referralCostRatio > 10 ? 'rgba(251,191,36,0.12)' : 'rgba(34,197,94,0.12)',
       color: referralCostRatio > 15 ? '#ef4444' : referralCostRatio > 10 ? '#fbbf24' : '#22c55e',
       border: referralCostRatio > 15 ? '1px solid rgba(239,68,68,0.25)' : referralCostRatio > 10 ? '1px solid rgba(251,191,36,0.25)' : '1px solid rgba(34,197,94,0.25)',
     }}>
       Referral Cost: {referralCostRatio}%
     </span>
    </div>
    <div style={{ padding: 16 }}>
     <CardGrid cards={spendingCards} />
    </div>
   </div>

   {/* Net Profit — Big Card */}
   <div className="glow-border-green tilt-card" style={{
     background: 'linear-gradient(135deg, rgba(34,197,94,0.12), rgba(6,182,212,0.08))',
     border: '1px solid rgba(34,197,94,0.25)',
     borderRadius: 20,
     padding: 32,
     marginBottom: 24,
     textAlign: 'center',
     position: 'relative',
     overflow: 'hidden',
     boxShadow: '0 8px 40px rgba(34,197,94,0.12), inset 0 1px 0 rgba(255,255,255,0.08)'
   }}>
    <div style={{
      position: 'absolute',
      top: '50%',
      left: '50%',
      transform: 'translate(-50%, -50%)',
      width: 300,
      height: 300,
      borderRadius: '50%',
      background: 'radial-gradient(circle, rgba(34,197,94,0.08), transparent 60%)',
      pointerEvents: 'none'
    }}></div>
    <div style={{ fontSize: 11, fontWeight: 800, textTransform: 'uppercase', letterSpacing: 2, color: '#4ade80', marginBottom: 12, position: 'relative' }}>Net Profit Today</div>
    <div style={{ fontSize: 44, fontWeight: 900, color: '#4ade80', fontFamily: 'var(--font-number)', letterSpacing: '-0.04em', position: 'relative', textShadow: '0 0 40px rgba(34,197,94,0.3)' }}>{formatTK(today.netProfit)}</div>
    <div style={{ display: 'flex', justifyContent: 'center', gap: 24, marginTop: 12, fontSize: 12, color: 'var(--text-muted)' }}>
     <span>Gross Profit {formatTK(today.adminProfit)}</span>
     <span>Total Spendings −{formatTK(today.totalSpendings)}</span>
    </div>
   </div>

   {/* Monthly Data */}
   <div className="glass-card-premium" style={{ ...S.card, marginBottom: 20 }}>
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

   {/* Fund Status — V6.0: Enhanced with locked balance */}
   <div className="glass-card-premium glow-border-cyan" style={{ ...S.card, marginBottom: 20 }}>
    <div style={S.cardHeader}>
     <div style={S.cardHeaderIcon('#00f0ff')}><i className="fa-solid fa-building-columns" style={{ color: '#00f0ff' }}></i></div>
     <h3 style={S.cardHeaderTitle}>Total Fund Status</h3>
     {/* ═══ V6.0: Locked balance indicator ═══ */}
     <span style={{
       marginLeft: 'auto',
       padding: '4px 12px', borderRadius: 8,
       fontSize: 10, fontWeight: 800,
       background: 'rgba(251,191,36,0.12)',
       color: '#fbbf24',
       border: '1px solid rgba(251,191,36,0.2)',
     }}>
       🔒 {formatTK(totalLockedBalance)} locked
     </span>
    </div>
    <div style={{ padding: 16 }}>
     <CardGrid cards={fundCards} />
     {/* ═══ V6.0: Locked balance explanation ═══ */}
     <div style={{
       marginTop: 12, padding: '10px 14px', borderRadius: 10,
       background: 'rgba(251,191,36,0.05)',
       border: '1px solid rgba(251,191,36,0.1)',
       fontSize: 11, color: 'var(--text-muted)',
     }}>
       <i className="fa-solid fa-lock" style={{ color: '#fbbf24', marginRight: 6 }} />
       <strong style={{ color: '#fbbf24' }}>Locked Balance</strong> = Arena Credit from referrals/spins. Users can join matches with it but <strong style={{ color: '#e5e1e4' }}>cannot withdraw</strong>. It converts to real balance only when referred players hit milestones (1st/3rd/5th match).
     </div>
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


// ═══════════════════════════════════════════════════════════════════════
// V6.0: OVERVIEW — Added DAU, Locked Balance, Tier Distribution, Referral Stats
// ═══════════════════════════════════════════════════════════════════════
function AdminOverview() {
 const { state } = useApp()
 const { matches, users, transactions, pendingWithdrawals, pendingAddMoneyRequests, profitStats } = state
 const mobile = useIsMobile()

 const totalCollection = matches.reduce((s, m) => s + (m.entryFee * (m.joinedCount || 0)), 0)
 const adminProfit = Math.round(totalCollection * 0.20)
 const totalPrizes = transactions.filter(t => t.type === 'win').reduce((s, t) => s + t.amount, 0)
 const liveCount = matches.filter(m => m.status === 'live').length
 const upcomingCount = matches.filter(m => m.status === 'upcoming').length

 const totalRefunded = matches.reduce((s, m) => s + (m.escrow?.refunded || 0), 0)
 const totalDistributed = matches.reduce((s, m) => s + (m.escrow?.distributed || 0), 0)
 const activeEscrow = Math.max(0, totalCollection - totalRefunded - totalDistributed)

 // ═══ V6.0: Computed metrics ═══
 const totalLockedBalance = useMemo(() => users.reduce((s, u) => s + (u.lockedBalance || 0), 0), [users])
 const totalRealBalance = useMemo(() => users.reduce((s, u) => s + (u.balance || 0), 0), [users])
 const dau = profitStats?.today?.dau || 0

 // ═══ V6.0: Tier distribution ═══
 const tierDistribution = useMemo(() => {
  const dist = {}
  users.filter(u => u.role === 'user').forEach(u => {
   const xp = u.rank?.xp || u.xp || 0
   const tier = getTierFromXP(xp)
   dist[tier.name] = (dist[tier.name] || 0) + 1
  })
  return Object.entries(dist).sort((a, b) => b[1] - a[1])
 }, [users])

 // ═══ V6.0: Total referral network size ═══
 const totalReferralNetwork = useMemo(() => {
  return users.reduce((s, u) => s + (u.referral?.referrals?.length || u.referralCount || 0), 0)
 }, [users])

 // ═══ V6.0: Total reputation issues ═══
 const lowReputationUsers = useMemo(() => {
  return users.filter(u => (u.reputation?.score || 5) < 3).length
 }, [users])

 const stats = [
 { label: 'Total Collection', value: formatTK(totalCollection), icon: 'fa-solid fa-sack-dollar', color: '#fbbf24' },
 { label: 'Admin Profit (20%)', value: formatTK(adminProfit), icon: 'fa-solid fa-chart-line', color: '#22c55e' },
 { label: 'Prize Distributed', value: formatTK(totalPrizes), icon: 'fa-solid fa-trophy', color: '#a78bfa' },
 { label: 'Total Refunded', value: formatTK(totalRefunded), icon: 'fa-solid fa-rotate-left', color: '#f87171', sub: 'From cancellations' },
 { label: 'Active Escrow', value: formatTK(activeEscrow), icon: 'fa-solid fa-vault', color: '#00f0ff', sub: 'Held in system' },
 { label: 'Live Matches', value: liveCount, icon: 'fa-solid fa-tower-broadcast', color: '#ef4444' },
 { label: 'Upcoming', value: upcomingCount, icon: 'fa-solid fa-clock', color: '#6c8cff' },
 { label: 'Total Users', value: users.filter(u => u.role === 'user').length, icon: 'fa-solid fa-users', color: '#00f0ff', sub: `${users.filter(u => !u.banned).length} active` },
 { label: 'Pending Withdrawals', value: pendingWithdrawals.length, icon: 'fa-solid fa-hourglass-half', color: '#fbbf24' },
 { label: 'Add Money Requests', value: (pendingAddMoneyRequests || []).length, icon: 'fa-solid fa-wallet', color: '#22c55e', sub: 'Need approval' },
 { label: 'Transactions', value: transactions.length, icon: 'fa-solid fa-receipt', color: '#64748b' },
 // ═══ V6.0: New overview stats ═══
 { label: 'DAU', value: dau, icon: 'fa-solid fa-user-check', color: '#00d4ff', sub: 'Daily Active Users', highlight: dau > 0 },
 { label: 'Real Balance', value: formatTK(totalRealBalance), icon: 'fa-solid fa-money-bill', color: '#22c55e', sub: 'Withdrawable' },
 { label: 'Locked Balance', value: formatTK(totalLockedBalance), icon: 'fa-solid fa-lock', color: '#fbbf24', sub: 'Arena credit only' },
 { label: 'Referral Network', value: totalReferralNetwork, icon: 'fa-solid fa-share-nodes', color: '#a78bfa', sub: `${users.filter(u => (u.referral?.referrals?.length || u.referralCount || 0) > 0).length} recruiters` },
 { label: 'Low Reputation', value: lowReputationUsers, icon: 'fa-solid fa-star-half-stroke', color: lowReputationUsers > 0 ? '#ef4444' : '#64748b', sub: 'Score below 3.0' },
 ]

 return (
  <div style={S.panel}>
   <h2 style={S.title}>Dashboard Overview</h2>
   <div style={{ display: 'grid', gridTemplateColumns: mobile ? '1fr 1fr' : 'repeat(auto-fill, minmax(200px, 1fr))', gap: 12 }}>
    {stats.map((s, i) => (
     <div key={i} style={{
       background: `linear-gradient(145deg, ${s.color}08, rgba(255,255,255,0.02))`,
       border: `1px solid ${s.color}15`,
       borderRadius: 16,
       padding: 20,
       transition: 'all 0.3s cubic-bezier(0.4, 0, 0.2, 1)',
       cursor: 'default',
       position: 'relative',
       overflow: 'hidden'
     }}
      onMouseEnter={e => {
        e.currentTarget.style.borderColor = s.color + '40';
        e.currentTarget.style.boxShadow = `0 8px 32px ${s.color}18, 0 0 0 1px ${s.color}20 inset`;
        e.currentTarget.style.transform = 'translateY(-2px)';
      }}
      onMouseLeave={e => {
        e.currentTarget.style.borderColor = s.color + '15';
        e.currentTarget.style.boxShadow = 'none';
        e.currentTarget.style.transform = 'translateY(0)';
      }}
     >
      <div style={{
        position: 'absolute',
        top: -20,
        right: -20,
        width: 80,
        height: 80,
        borderRadius: '50%',
        background: `radial-gradient(circle, ${s.color}12, transparent 70%)`,
        pointerEvents: 'none'
      }}></div>
      <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 12, position: 'relative', zIndex: 1 }}>
       <div style={{
         width: 32,
         height: 32,
         borderRadius: 8,
         background: `linear-gradient(135deg, ${s.color}20, ${s.color}08)`,
         border: `1px solid ${s.color}25`,
         display: 'flex',
         alignItems: 'center',
         justifyContent: 'center'
       }}>
         <i className={s.icon} style={{ color: s.color, fontSize: 13 }}></i>
       </div>
       <span style={{ fontSize: 10, fontWeight: 700, textTransform: 'uppercase', letterSpacing: 0.8, color: 'var(--text-muted)' }}>{s.label}</span>
      </div>
      <div style={{ fontSize: 26, fontWeight: 900, color: '#fff', fontFamily: 'var(--font-number)', letterSpacing: '-0.03em', position: 'relative', zIndex: 1 }}>{s.value}</div>
      {s.sub && (
       <div style={{ fontSize: 10, color: 'var(--text-muted)', marginTop: 4, fontWeight: 600 }}>{s.sub}</div>
      )}
     </div>
    ))}
   </div>

   {/* ═══ V6.0: Tier Distribution Bar ═══ */}
   {tierDistribution.length > 0 && (
    <div className="glass-card-premium holo-card" style={{ ...S.card, marginTop: 20 }}>
     <div style={S.cardHeader}>
       <div style={S.cardHeaderIcon('#a78bfa')}><i className="fa-solid fa-layer-group" style={{ color: '#a78bfa' }}></i></div>
       <h3 style={S.cardHeaderTitle}>Tier Distribution</h3>
       <span style={{ marginLeft: 'auto', fontSize: 11, color: 'var(--text-muted)' }}>{users.filter(u => u.role === 'user').length} players</span>
     </div>
     <div style={{ padding: 16 }}>
       <div style={{ display: 'flex', height: 24, borderRadius: 8, overflow: 'hidden', background: 'rgba(255,255,255,0.03)' }}>
         {tierDistribution.map(([tierName, count]) => {
           const tierDef = TIERS.find(t => t.name === tierName) || { color: '#64748b' }
           const totalPlayers = users.filter(u => u.role === 'user').length
           const pct = totalPlayers > 0 ? (count / totalPlayers) * 100 : 0
           return (
             <div
               key={tierName}
               style={{
                 width: `${pct}%`,
                 minWidth: pct > 0 ? 2 : 0,
                 background: tierDef.color,
                 transition: 'width 0.5s ease',
                 position: 'relative',
               }}
               title={`${tierName}: ${count} (${Math.round(pct)}%)`}
             />
           )
         })}
       </div>
       <div style={{ display: 'flex', flexWrap: 'wrap', gap: 8, marginTop: 12 }}>
         {tierDistribution.slice(0, 6).map(([tierName, count]) => {
           const tierDef = TIERS.find(t => t.name === tierName) || { color: '#64748b' }
           return (
             <div key={tierName} style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
               <span style={{ width: 8, height: 8, borderRadius: 2, background: tierDef.color }} />
               <span style={{ fontSize: 11, color: 'var(--text-muted)', fontWeight: 600 }}>{tierName}</span>
               <span style={{ fontSize: 11, fontWeight: 800, color: tierDef.color }}>{count}</span>
             </div>
           )
         })}
         {tierDistribution.length > 6 && (
           <span style={{ fontSize: 11, color: 'var(--text-muted)' }}>+{tierDistribution.length - 6} more</span>
         )}
       </div>
     </div>
    </div>
   )}
  </div>
 )
}


// ═════════════════════════════════════════════════════
// 2. CREATE MATCH — UNCHANGED
// ═════════════════════════════════════════
function AdminCreateMatch() {
 const { state, dispatch } = useApp()
 const mobile = useIsMobile()
 const [form, setForm] = useState({
  title: '', gameType: 'BR', mode: 'Solo', map: 'Bermuda',
  entryFee: 30, maxSlots: 50, perKill: 10,
  include4th: true, include5th: true, startTime: '',
  minPlayers: 10,
 })

 const update = (k, v) => {
  const next = { ...form, [k]: v }
  if (k === 'gameType' && v === 'CS') { next.mode = 'Clash Squad'; next.maxSlots = 12; next.minPlayers = 4 }
  if (k === 'gameType' && v === 'BR') { next.mode = 'Solo'; next.maxSlots = 50; next.minPlayers = 10 }
  if (k === 'mode') {
   next.maxSlots = maxSlotsForMode(v)
   if (v === 'Duo') next.minPlayers = Math.min(next.minPlayers || 10, 10)
   if (v === 'Squad') next.minPlayers = Math.min(next.minPlayers || 10, 10)
   if (v === 'Solo') next.minPlayers = Math.min(next.minPlayers || 10, 20)
  }
  setForm(next)
 }
 const toggle = (k) => setForm(p => ({ ...p, [k]: !p[k] }))

 const eco = calculateMatchEconomics(Number(form.entryFee) || 0, Number(form.maxSlots) || 0, form.gameType, form.include4th, form.include5th)
 const availableModes = FF_GAME_TYPES.find(g => g.value === form.gameType)?.modes || []

 const minEscrow = (Number(form.entryFee) || 0) * (Number(form.minPlayers) || 10)
 const maxEscrow = (Number(form.entryFee) || 0) * (Number(form.maxSlots) || 50)
 const estMaxKillPayout = (Number(form.perKill) || 0) * (Number(form.maxSlots) || 50) * (isTeamMode(form.mode) ? 4 : 1)
 const totalPrizeOutflow = eco.prizePool + estMaxKillPayout
 const escrowSafe = maxEscrow >= totalPrizeOutflow

 const handleSubmit = (e) => {
  e.preventDefault()
  if (!form.title.trim()) return showToast(dispatch, 'Enter match title!', 'error')
  if (!form.entryFee || form.entryFee <= 0) return showToast(dispatch, 'Enter valid entry fee!', 'error')
  if (Number(form.entryFee) > 0 && totalPrizeOutflow > maxEscrow) {
   return showToast(dispatch, `Prize outflow (${formatTK(totalPrizeOutflow)}) exceeds max escrow (${formatTK(maxEscrow)}). Reduce prizes or increase slots.`, 'error')
  }
  if (Number(form.minPlayers) > Number(form.maxSlots)) {
   return showToast(dispatch, 'Min players cannot exceed total slots!', 'error')
  }
  if (Number(form.minPlayers) < 2) {
   return showToast(dispatch, 'Min players must be at least 2!', 'error')
  }
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

    <div style={{ marginTop: 12 }}>
     <label style={S.label}>Min Players to Start</label>
     <input style={S.input} type="number" min="2" value={form.minPlayers} onChange={e => update('minPlayers', Number(e.target.value))} />
     <span style={{ fontSize: 11, color: 'var(--text-muted)', marginTop: 4, display: 'block' }}>Room won't unlock below this count</span>
    </div>

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

    <div style={{ ...S.card, marginTop: 24, border: '1px solid rgba(251,191,36,0.15)' }}>
     <div style={S.cardHeader}>
      <div style={S.cardHeaderIcon('#fbbf24')}><i className="fa-solid fa-calculator" style={{ color: '#fbbf24' }}></i></div>
      <h3 style={S.cardHeaderTitle}>Live Calculation</h3>
      <span style={{ marginLeft: 'auto', fontSize: 10, color: 'var(--text-muted)', fontWeight: 700, textTransform: 'uppercase', letterSpacing: 1, background: 'rgba(251,191,36,0.08)', padding: '4px 10px', borderRadius: 6 }}>Real-time</span>
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


// ═══════════════════════════════════════════════════
// 3. ROOM MANAGEMENT — UNCHANGED
// ═════════════════════════════════════════
function AdminRooms() {
 const { state, dispatch } = useApp()
 const { matches } = state
 const mobile = useIsMobile()
 const [roomData, setRoomData] = useState({})
 const [confirmCancelId, setConfirmCancelId] = useState(null)

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

 const handleCancelMatch = (matchId) => {
  const match = matches.find(m => m.id === matchId)
  if (!match) return
  const joinCount = match.joinedCount || 0
  const refundTotal = joinCount * (match.entryFee || 0)

  dispatch({ type: 'CANCEL_MATCH', payload: matchId })
  adminAction(dispatch, 'Cancelled match', match.title, `Match cancelled. ${joinCount} refunds (${formatTK(refundTotal)}) processed.`, 'error')
  setConfirmCancelId(null)
 }

 const getThresholdInfo = (m) => {
  const joined = m.joinedCount || 0
  const min = m.minPlayers || 10
  const meets = joined >= min
  return { joined, min, meets, deficit: Math.max(0, min - joined) }
 }

 const getMatchEscrow = (m) => {
  const collected = (m.joinedCount || 0) * (m.entryFee || 0)
  const refunded = m.escrow?.refunded || 0
  const distributed = m.escrow?.distributed || 0
  return { collected, refunded, distributed, held: Math.max(0, collected - refunded - distributed) }
 }

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
     const threshold = getThresholdInfo(m)
     const escrow = getMatchEscrow(m)
     const isConfirming = confirmCancelId === m.id
     return (
      <div key={m.id} style={S.mCard}>
       <div style={{ fontWeight: 700, fontSize: 14, marginBottom: 4 }}>{m.title}</div>
       <div style={{ fontSize: 11, color: 'var(--text-muted)', marginBottom: 8 }}>{m.mode} • {m.map}</div>
       <div style={{ display: 'flex', alignItems: 'center', gap: 6, marginBottom: 8 }}>
        {m.status === 'live' && <span className="live-dot"></span>}
        <span style={{ fontSize: 11, fontWeight: 700, color: m.status === 'live' ? '#ef4444' : 'var(--text-muted)' }}>{m.status.toUpperCase()}</span>
       </div>
       <div style={S.mRow}>
        <span style={S.mLabel}>Players</span>
        <span style={{ fontSize: 13, fontWeight: 700 }}>{threshold.joined}/ {threshold.min} min</span>
       </div>
       <div style={S.mRow}>
        <span style={S.mLabel}>Escrow</span>
        <span style={{ fontSize: 13, fontWeight: 700, color: '#00f0ff' }}>{formatTK(escrow.collected)}</span>
       </div>
       {!threshold.meets && m.status !== 'completed' && (
        <div style={{ background: 'rgba(251,191,36,0.1)', border: '1px solid rgba(251,191,36,0.2)', borderRadius: 8, padding: '8px 12px', marginBottom: 10, fontSize: 11, color: '#fbbf24' }}>
         Need {threshold.deficit} more player{threshold.deficit > 1 ? 's' : ''} to unlock room
        </div>
       )}
       <div style={{ marginBottom: 8 }}>
        <label style={{ ...S.label, fontSize: 10 }}>Room ID</label>
        <input style={S.input} value={rd.roomId || ''} onChange={e => updateRoomField(m.id, 'roomId', e.target.value)} placeholder="e.g. 123456789" />
       </div>
       <div style={{ marginBottom: 8 }}>
        <label style={{ ...S.label, fontSize: 10 }}>Password</label>
        <input style={S.input} value={rd.roomPassword || ''} onChange={e => updateRoomField(m.id, 'roomPassword', e.target.value)} placeholder="e.g. abc123" />
       </div>
       <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 10 }}>
        <span style={{ fontSize: 11, fontWeight: 700, color: isUnlocked && !threshold.meets ? '#ef4444' : isUnlocked ? '#22c55e' : '#fbbf24' }}>
         {isUnlocked && !threshold.meets ? 'BLOCKED' : isUnlocked ? 'UNLOCKED' : (countdown || '—').replace('Unlocks in ', '')}
        </span>
        <span style={{ fontSize: 10, color: 'var(--text-muted)' }}>
         {isUnlocked && !threshold.meets ? `Need ${threshold.deficit} more players` : '10 min before start'}
        </span>
       </div>
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
       <th style={S.th}>Players</th>
       <th style={S.th}>Escrow</th>
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
       const threshold = getThresholdInfo(m)
       const escrow = getMatchEscrow(m)
       const isConfirming = confirmCancelId === m.id
       return (
        <tr key={m.id}>
         <td style={S.td}>
          <div style={{ fontWeight: 700, fontSize: 13 }}>{m.title}</div>
          <div style={{ fontSize: 11, color: 'var(--text-muted)' }}>{m.mode} • {m.map}</div>
         </td>
         <td style={S.td}>
          {m.startTime ? new Date(m.startTime.replace(' ', 'T')).toLocaleString('en-GB', { day: '2-digit', month: 'short', hour: '2-digit', minute: '2-digit' }) : '—'}
         </td>
         <td style={S.td}>
          <div style={{ fontWeight: 700 }}>{threshold.joined}/ {threshold.min}</div>
          {!threshold.meets && (
           <div style={{ fontSize: 10, color: '#fbbf24', marginTop: 2 }}>
            ⚠ Need {threshold.deficit} more
           </div>
          )}
         </td>
         <td style={S.td}>
          <div style={{ fontWeight: 700, color: '#00f0ff' }}>{formatTK(escrow.collected)}</div>
          {escrow.refunded > 0 && (
           <div style={{ fontSize: 10, color: '#f87171', marginTop: 2 }}>
            −{formatTK(escrow.refunded)} ref.
           </div>
          )}
         </td>
         <td style={S.td}>
          <input style={{ ...S.input, width: 120 }} value={rd.roomId || ''} onChange={e => updateRoomField(m.id, 'roomId', e.target.value)} placeholder="Room ID" />
         </td>
         <td style={S.td}>
          <input style={{ ...S.input, width: 100 }} value={rd.roomPassword || ''} onChange={e => updateRoomField(m.id, 'roomPassword', e.target.value)} placeholder="Password" />
         </td>
         <td style={S.td}>
          <div style={{ fontSize: 12, fontWeight: 700, color: isUnlocked && !threshold.meets ? '#ef4444' : isUnlocked ? '#22c55e' : '#fbbf24' }}>
           {isUnlocked && !threshold.meets ? 'BLOCKED' : isUnlocked ? 'UNLOCKED' : (countdown || '—').replace('Unlocks in ', '')}
          </div>
          <div style={{ fontSize: 10, color: 'var(--text-muted)', marginTop: 2 }}>
           {isUnlocked && !threshold.meets ? `Need ${threshold.deficit} more players` : '10 min before start'}
          </div>
         </td>
         <td style={S.td}>
          {m.status === 'live' && <span className="live-dot" style={{ marginRight: 6 }}></span>}
          <span style={{ fontSize: 11, fontWeight: 700, color: m.status === 'live' ? '#ef4444' : 'var(--text-muted)' }}>{m.status.toUpperCase()}</span>
         </td>
         <td style={S.td}>
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


// ═══════════════════════════════════════════════════
// 4. RESULT PANEL — UNCHANGED
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
 const [editingResultId, setEditingResultId] = useState(null)

 const selected = matches.find(m => m.id === selectedId)
 const teamMode = selected ? isTeamMode(selected.mode) : false

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

 const findTeamMembers = (teamName) => {
  if (!teamMapping || !teamName) return null
  return teamMapping[teamName] || null
 }

 const eco = selected ? calculateMatchEconomics(selected.entryFee, selected.maxSlots, selected.gameType, selected.include4th, selected.include5th) : null
 const resultsWithPrizes = selected ? calculateAllResultPrizes(players, selected.perKill || 0, eco.prizes, selected.gameType) : []

 const emptyRow = (pos = 1) => teamMode
  ? { ign: '', teamName: '', points: 0, kills: 0, position: pos }
  : { ign: '', kills: 0, position: pos }

 const addPlayer = () => setPlayers(p => [...p, emptyRow(p.length + 1)])
 const removePlayer = (i) => { if (players.length > 1) setPlayers(p => p.filter((_, idx) => idx !== i)) }
 const updatePlayer = (i, k, v) => setPlayers(p => p.map((r, idx) => idx === i ? { ...r, [k]: v } : r))

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

  window.scrollTo({ top: 0, behavior: 'smooth' })
 }

 const cancelEdit = () => {
  setEditingResultId(null)
  setSelectedId('')
  setMethod('manual')
  setPlayers([emptyRow()])
 }

 const handleSubmit = () => {
  if (!selectedId) return showToast(dispatch, 'Select a match!', 'error')
  if (method === 'manual') {
   const valid = players.filter(p => p.ign.trim())
   if (valid.length === 0) return showToast(dispatch, `Add at least one ${teamMode ? 'team' : 'player'}!`, 'error')
   const enriched = valid.map(p => {
    const members = findTeamMembers(p.ign.trim())
    return {
     ...p,
     matchedUserIds: members ? members.map(m => m.userId).filter(Boolean) : [],
    }
   })
   dispatch({ type: 'SUBMIT_RESULT', payload: { matchId: selectedId, method: 'manual', players: enriched, isEdit: !!editingResultId } })
  } else {
   dispatch({ type: 'SUBMIT_RESULT', payload: { matchId: selectedId, method: 'screenshot', players: [], screenshotUrl: null, isEdit: !!editingResultId } })
  }

  const actionVerb = editingResultId ? 'Edited result' : 'Submitted result'
  adminAction(dispatch, actionVerb, selected?.title, `${actionVerb} for ${selected?.title}!`, 'success')

  setEditingResultId(null)
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
       const matchedMembers = teamMode ? findTeamMembers(p.ign.trim()) : null
       return (
        <div key={i} style={{ display: 'grid', gridTemplateColumns: teamMode ? '1fr 80px 60px 40px' : '1fr 80px 60px 40px', gap: 8, alignItems: 'center', marginBottom: 8 }}>
         <div style={{ position: 'relative' }}>
          <input
           style={{ ...S.input, borderColor: matchedMembers ? 'rgba(34,197,94,0.3)' : undefined }}
           value={p.ign}
           onChange={e => updatePlayer(i, 'ign', e.target.value)}
           placeholder={teamMode ? 'Team name...' : 'IGN...'}
          />
          {matchedMembers && (
           <span style={{ position: 'absolute', right: 8, top: '50%', transform: 'translateY(-50%)', fontSize: 10, color: '#22c55e', fontWeight: 700 }}>
            ✓ {matchedMembers.length}
           </span>
          )}
         </div>
         <input style={S.input} type="number" min="0" value={teamMode ? p.points || 0 : p.kills || 0} onChange={e => updatePlayer(i, teamMode ? 'points' : 'kills', Number(e.target.value))} />
         <input style={S.input} type="number" min="1" value={p.position} onChange={e => updatePlayer(i, 'position', Number(e.target.value))} />
         <button style={{ ...S.btnDanger, padding: '4px 8px' }} onClick={() => removePlayer(i)}><i className="fa-solid fa-trash"></i></button>
        </div>
       )
      })}
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
      {teamMode && teamMapping && (
       <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 12, fontSize: 12 }}>
        <span style={{ color: 'var(--text-muted)' }}>Teams Mapped</span>
        <span style={{ fontWeight: 700, color: '#22c55e' }}>{Object.keys(teamMapping).length}</span>
       </div>
      )}
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
             {r.matchedUserIds?.length > 0 && (
              <span style={{ color: '#22c55e', marginLeft: 4 }}>✓ {r.matchedUserIds.length} user{r.matchedUserIds.length > 1 ? 's' : ''} matched</span>
             )}
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
         <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
          <span style={{ fontSize: 10, fontWeight: 800, textTransform: 'uppercase', letterSpacing: 0.1, color: '#22c55e', background: 'rgba(34,197,94,0.1)', padding: '2px 8px', borderRadius: 6 }}>
           SUBMITTED
          </span>
          <button style={{ ...S.btnGhost, fontSize: 10, padding: '4px 8px' }} onClick={() => handleEditResult(m.id)}>
           <i className="fa-solid fa-pen"></i> Edit
          </button>
         </div>
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


// ═══════════════════════════════════════════════════════════
// V6.0: USERS PANEL — Added Tier Badge, Locked Balance, Reputation, Clan
// ═══════════════════════════════════════════════════════════
function AdminUsers() {
 const { state, dispatch } = useApp()
 const { users } = state
 const mobile = useIsMobile()
 const [balanceSheetUser, setBalanceSheetUser] = useState(null)

 const currentUserId = state.currentUser?.id || state.currentUserId

 const handleBalanceConfirm = (userId, action, amount) => {
  dispatch({ type: 'ADJUST_BALANCE', payload: { userId, action, amount } })
  const u = users.find(x => x.id === userId)
  adminAction(
    dispatch,
    `${action === 'add' ? 'Added' : 'Deducted'} balance`,
    u?.name || u?.username,
    `${action === 'add' ? '+' : '-'}${formatTK(amount)} ${action === 'add' ? 'added to' : 'deducted from'} ${u?.name || u?.username}`,
    action === 'add' ? 'success' : 'error'
  )
 }

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

 if (mobile) {
  return (
   <div style={S.panel}>
    <h2 style={S.title}>User Management</h2>

    {duplicateIGNs.size > 0 && (
    <div style={{
      background: 'linear-gradient(135deg, rgba(239,68,68,0.08), rgba(239,68,68,0.03))',
      border: '1px solid rgba(239,68,68,0.2)',
      borderRadius: 14,
      padding: '14px 18px',
      marginBottom: 20,
    }}>
      <div style={{ fontWeight: 700, fontSize: 13, color: '#ef4444', marginBottom: 4 }}>
       <i className="fa-solid fa-triangle-exclamation" style={{ marginRight: 6 }}></i>
       Duplicate IGNs Detected ({duplicateIGNs.size})
      </div>
      <div style={{ fontSize: 11, color: '#f87171' }}>
       {[...duplicateIGNs].join(', ')} — Possible multi-accounting
      </div>
    </div>
    )}

    <div>
     {users.map(u => {
      const isSelf = u.id === currentUserId
      const hasDupIGN = isDuplicateIGN(u)
      const dupCount = getDuplicateCount(u)
      const lockedBal = u.lockedBalance || 0
      const repScore = u.reputation?.score || 5
      const clanTag = u.clan?.tag || null
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
          <div style={{ fontSize: 11, color: 'var(--text-muted)', display: 'flex', alignItems: 'center', gap: 6, flexWrap: 'wrap' }}>
           <span style={{ color: u.role === 'owner' ? '#fbbf24' : u.role === 'admin' ? '#a78bfa' : 'var(--text-muted)', fontWeight: 700 }}>
            {u.role === 'owner' ? 'OWNER' : u.role === 'admin' ? 'ADMIN' : 'USER'}
           </span>
           {u.role === 'user' && <TierBadgeMini user={u} />}
           {clanTag && (
            <span style={{ fontSize: 9, fontWeight: 800, color: '#a78bfa', background: 'rgba(168,85,247,0.12)', padding: '1px 6px', borderRadius: 4, border: '1px solid rgba(168,85,247,0.2)' }}>
              [{clanTag}]
            </span>
           )}
          </div>
         </div>
        </div>
        <div style={{ fontSize: 12, color: 'var(--text-muted)', marginBottom: 8 }}>
         @{u.username}
         {hasDupIGN && (
          <span style={{ marginLeft: 8, fontSize: 10, color: '#ef4444', fontWeight: 700, background: 'rgba(239,68,68,0.1)', padding: '2px 6px', borderRadius: 4 }}>
           IGN: {u.ign} ({dupCount}x)
          </span>
         )}
         {!hasDupIGN && <span style={{ marginLeft: 8 }}>IGN: {u.ign || '—'}</span>}
        </div>
        <div style={{ display: 'grid', gridTemplateColumns: lockedBal > 0 ? '1fr 1fr 1fr 1fr' : '1fr 1fr 1fr', gap: 8, marginBottom: 10 }}>
         <div style={{ textAlign: 'center' }}>
          <div style={{ fontSize: 10, color: 'var(--text-muted)', textTransform: 'uppercase', fontWeight: 700 }}>Balance</div>
          <div style={{ fontWeight: 900, fontSize: 14 }}>{formatTK(u.balance ?? u.wallet ?? 0)}</div>
         </div>
         {lockedBal > 0 && (
          <div style={{ textAlign: 'center' }}>
           <div style={{ fontSize: 10, color: '#fbbf24', textTransform: 'uppercase', fontWeight: 700 }}>🔒 Locked</div>
           <div style={{ fontWeight: 900, fontSize: 14, color: '#fbbf24' }}>{formatTK(lockedBal)}</div>
          </div>
         )}
         <div style={{ textAlign: 'center' }}>
          <div style={{ fontSize: 10, color: 'var(--text-muted)', textTransform: 'uppercase', fontWeight: 700 }}>Matches</div>
          <div style={{ fontWeight: 900, fontSize: 14 }}>{u.rank?.totalMatches || (u.matchesPlayed ?? u.joinedMatches?.length ?? 0)}</div>
         </div>
         <div style={{ textAlign: 'center' }}>
          <div style={{ fontSize: 10, color: repScore < 3 ? '#ef4444' : 'var(--text-muted)', textTransform: 'uppercase', fontWeight: 700 }}>Rep</div>
          <div style={{ fontWeight: 900, fontSize: 14, color: repScore < 3 ? '#ef4444' : '#22c55e' }}>{repScore.toFixed(1)}</div>
         </div>
        </div>
        {isSelf ? (
         <div style={{ fontSize: 11, color: 'var(--text-muted)', fontStyle: 'italic', padding: '6px 0' }}>
          Cannot adjust own balance
         </div>
        ) : (
         <button style={{ ...S.btnGhost, width: '100%', marginBottom: 6 }} onClick={() => setBalanceSheetUser(u)}>
          <i className="fa-solid fa-scale-balanced"></i> Adjust Balance
         </button>
        )}
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

    <BalanceAdjustSheet
      user={balanceSheetUser}
      open={!!balanceSheetUser}
      onClose={() => setBalanceSheetUser(null)}
      onConfirm={handleBalanceConfirm}
      dispatch={dispatch}
    />
   </div>
  )
 }

 return (
  <div style={S.panel}>
   <h2 style={S.title}>User Management</h2>

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

   <div style={{ ...S.card, overflowX: 'auto' }}>
    <table style={S.table}>
     <thead>
      <tr>
       <th style={{ ...S.th, width: '18%' }}>User</th>
       <th style={S.th}>IGN</th>
       <th style={{ ...S.th, width: '8%' }}>Tier</th>
       <th style={{ ...S.th, width: '9%' }}>Balance</th>
       <th style={{ ...S.th, width: '7%' }}>🔒 Locked</th>
       <th style={{ ...S.th, width: '5%' }}>Rep</th>
       <th style={{ ...S.th, width: '6%' }}>Clan</th>
       <th style={S.th}>Role</th>
       <th style={S.th}>Matches</th>
       <th style={S.th}>Status</th>
       <th style={S.th}>Actions</th>
      </tr>
     </thead>
     <tbody>
      {users.map(u => {
       const isSelf = u.id === currentUserId
       const hasDupIGN = isDuplicateIGN(u)
       const dupCount = getDuplicateCount(u)
       const lockedBal = u.lockedBalance || 0
       const repScore = u.reputation?.score || 5
       const clanTag = u.clan?.tag || null
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
          <div style={{ fontWeight: 600, fontSize: 13 }}>{u.ign || '—'}</div>
          {hasDupIGN && (
           <span style={{ fontSize: 10, color: '#ef4444', fontWeight: 700, background: 'rgba(239,68,68,0.1)', padding: '1px 6px', borderRadius: 4 }}>
            {dupCount}x
           </span>
          )}
         </td>
         <td style={S.td}>
          {u.role === 'user' ? <TierBadgeMini user={u} /> : <span style={{ fontSize: 11, color: 'var(--text-muted)' }}>—</span>}
         </td>
         <td style={S.td}>
          <span style={{ fontWeight: 700, fontSize: 13 }}>{formatTK(u.balance ?? u.wallet ?? 0)}</span>
         </td>
         <td style={S.td}>
          {lockedBal > 0 ? (
           <span style={{ fontWeight: 700, fontSize: 12, color: '#fbbf24' }}>
            <i className="fa-solid fa-lock" style={{ fontSize: 9, marginRight: 3 }} />
            {formatTK(lockedBal)}
           </span>
          ) : (
           <span style={{ fontSize: 11, color: 'var(--text-dim)' }}>—</span>
          )}
         </td>
         <td style={S.td}>
          <span style={{
            fontSize: 12, fontWeight: 700,
            color: repScore >= 4.5 ? '#22c55e' : repScore >= 3.5 ? '#fbbf24' : repScore >= 2.5 ? '#f59e0b' : '#ef4444',
          }}>
            {repScore.toFixed(1)}
          </span>
         </td>
         <td style={S.td}>
          {clanTag ? (
           <span style={{ fontSize: 10, fontWeight: 800, color: '#a78bfa', background: 'rgba(168,85,247,0.12)', padding: '2px 8px', borderRadius: 6, border: '1px solid rgba(168,85,247,0.2)', whiteSpace: 'nowrap' }}>
             [{clanTag}]
           </span>
          ) : (
           <span style={{ fontSize: 11, color: 'var(--text-dim)' }}>—</span>
          )}
         </td>
         <td style={S.td}>
          <span style={{ fontSize: 11, fontWeight: 700, color: u.role === 'owner' ? '#fbbf24' : u.role === 'admin' ? '#a78bfa' : 'var(--text-muted)' }}>
           {u.role === 'owner' ? 'OWNER' : u.role === 'admin' ? 'ADMIN' : 'USER'}
          </span>
         </td>
         <td style={S.td}>
          <span style={{ fontSize: 13 }}>{u.rank?.totalMatches || (u.matchesPlayed ?? u.joinedMatches?.length ?? 0)}</span>
         </td>
         <td style={S.td}>
          <span style={{ fontSize: 11, fontWeight: 700, color: u.banned ? '#ef4444' : '#22c55e' }}>
           {u.banned ? 'BANNED' : 'ACTIVE'}
          </span>
         </td>
         <td style={S.td}>
          {isSelf ? (
           <span style={{ fontSize: 11, color: 'var(--text-muted)', fontStyle: 'italic' }}>Self</span>
          ) : (
           <button style={S.btnGhost} onClick={() => setBalanceSheetUser(u)}>
            <i className="fa-solid fa-scale-balanced"></i> Adjust
           </button>
          )}
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

   <BalanceAdjustSheet
     user={balanceSheetUser}
     open={!!balanceSheetUser}
     onClose={() => setBalanceSheetUser(null)}
     onConfirm={handleBalanceConfirm}
     dispatch={dispatch}
   />
  </div>
 )
}

// ═══════════════════════════════════════════════════════════
// 6. FINANCE PANEL — UNCHANGED
// ═══════════════════════════════════════════════════════════
function AdminFinance() {
 const { state, dispatch } = useApp()
 const { transactions, pendingWithdrawals, pendingAddMoneyRequests } = state
 const mobile = useIsMobile()
 const [financeTab, setFinanceTab] = useState('deposits')
 const [processing, setProcessing] = useState(null)

 const requests = pendingAddMoneyRequests || []

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

 const subTabs = [
  { id: 'deposits', label: 'Deposit Requests', icon: 'fa-wallet', count: requests.length, color: '#22c55e' },
  { id: 'withdrawals', label: 'Withdrawal Requests', icon: 'fa-arrow-up-from-bracket', count: pendingWithdrawals.length, color: '#fbbf24' },
  { id: 'transactions', label: 'All Transactions', icon: 'fa-receipt', count: transactions.length, color: '#6c8cff' },
 ]

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
      <tr key={req.id}
        onMouseEnter={e => { e.currentTarget.style.background = 'rgba(255,255,255,0.04)'; }}
        onMouseLeave={e => { e.currentTarget.style.background = 'transparent'; }}
        style={{ transition: 'all 0.2s ease', cursor: 'default' }}
      >
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

   {financeTab === 'deposits' && requests.length > 0 && (
    <div style={{ background: 'rgba(251,191,36,0.08)', border: '1px solid rgba(251,191,36,0.2)', borderRadius: 10, padding: '10px 14px', marginBottom: 16, fontSize: 12, color: '#fbbf24' }}>
     <i className="fa-solid fa-triangle-exclamation" style={{ marginRight: 8 }}></i>
     <strong>Verify before approving:</strong> Check your payment app to confirm the user sent money. Match the <strong>TXID</strong> and <strong>Sender Number</strong>.
    </div>
   )}

   {financeTab === 'deposits' && depositsContent}
   {financeTab === 'withdrawals' && withdrawalsContent}
   {financeTab === 'transactions' && txContent}
  </div>
 )
}


// ═══════════════════════════════════════════════════════════
// 7. ADD MONEY REQUESTS — UNCHANGED
// ═══════════════════════════════════════════════════════════
function AdminAddMoneyRequests() {
 const { state, dispatch } = useApp()
 const { pendingAddMoneyRequests } = state
 const mobile = useIsMobile()
 const [processing, setProcessing] = useState(null)

 const requests = pendingAddMoneyRequests || []

 const handleApprove = async (req) => {
  setProcessing(req.id)
  try {
   await approveAddMoneyRequest(req.id, req.userId, req.amount)
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
   await rejectAddMoneyRequest(req.id)
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
    <div className="empty-state" style={{ padding: 60, textAlign: 'center' }}>
     <div style={{
       width: 64,
       height: 64,
       borderRadius: '50%',
       background: 'linear-gradient(135deg, rgba(34,197,94,0.12), rgba(34,197,94,0.04))',
       border: '1px solid rgba(34,197,94,0.2)',
       display: 'flex',
       alignItems: 'center',
       justifyContent: 'center',
       margin: '0 auto 16px',
       boxShadow: '0 8px 24px rgba(34,197,94,0.12)'
     }}>
       <i className="fa-solid fa-check-circle" style={{ fontSize: 24, color: '#4ade80' }}></i>
     </div>
     <p style={{ fontSize: 12, fontWeight: 800, color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: 1.5 }}>All Caught Up</p>
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

// ═══════════════════════════════════════════════════════════
// 8. PAYMENT SETTINGS — UNCHANGED
// ═══════════════════════════════════════════════════════════
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


// ═══════════════════════════════════════════════════════════
// 9. OWNER PANEL — UNCHANGED
// ═══════════════════════════════════════════════════════════
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

// ═══════════════════════════════════════════════════════════
// 10. ACTIVITY LOG — UNCHANGED
// ═══════════════════════════════════════════════════════════
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

// ═══════════════════════════════════════════════════════════
// TOP TEAMS — Season Rankings
// ═══════════════════════════════════════════════════════════
function TopTeams() {
  const { state } = useApp()
  const { users } = state
  const mobile = useIsMobile()

  // Calculate top teams by: wins * 3 + earnings tier
  const topPlayers = useMemo(() => {
    return users
      .filter(u => u.role === 'user' && (u.totalMatchesPlayed || 0) > 0)
      .map(u => ({
        ...u,
        score: (u.totalWins || 0) * 100 + (u.totalKills || 0) * 2 + (u.totalEarnings || 0) * 0.1,
        winRate: u.totalMatchesPlayed > 0 ? Math.round(((u.totalWins || 0) / u.totalMatchesPlayed) * 100) : 0,
      }))
      .sort((a, b) => b.score - a.score)
      .slice(0, 10)
  }, [users])

  const rankColors = ['#fbbf24', '#c0c0c0', '#cd7f32', '#06d6f0', '#a78bfa', '#22c55e', '#f87171', '#6c8cff', '#fbbf24', '#c0c0c0']
  const rankIcons = ['🥇', '🥈', '🥉', '4', '5', '6', '7', '8', '9', '10']

  return (
    <div style={S.panel}>
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 20 }}>
        <h2 style={S.title}>Top Teams</h2>
        <div style={{ ...S.btnGhost, color: '#fbbf24' }}>
          <i className="fa-solid fa-trophy"></i> Season Rankings
        </div>
      </div>

      {topPlayers.length === 0 ? (
        <div className="empty-state-premium">
          <div className="icon-wrap" style={{ background: 'rgba(251,191,36,0.12)', border: '1px solid rgba(251,191,36,0.2)' }}>
            <i className="fa-solid fa-users-slash" style={{ color: '#fbbf24', fontSize: 24 }}></i>
          </div>
          <div style={{ fontSize: 14, fontWeight: 700, color: '#fbbf24', marginBottom: 4 }}>No teams yet</div>
          <div style={{ fontSize: 12, color: 'var(--text-muted)' }}>Teams will appear after matches are completed</div>
        </div>
      ) : (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
          {topPlayers.map((player, i) => (
            <div
              key={player.id}
              className="tilt-card"
              style={{
                display: 'flex', alignItems: 'center', gap: 14,
                padding: '14px 18px', borderRadius: 14,
                background: i < 3
                  ? `linear-gradient(135deg, ${rankColors[i]}10, ${rankColors[i]}05)`
                  : 'rgba(255,255,255,0.02)',
                border: `1px solid ${i < 3 ? rankColors[i] + '30' : 'rgba(255,255,255,0.06)'}`,
                transition: 'all 0.3s ease',
              }}
            >
              <div style={{
                width: 36, height: 36, borderRadius: 10,
                background: `linear-gradient(135deg, ${rankColors[i]}25, ${rankColors[i]}08)`,
                border: `1px solid ${rankColors[i]}30`,
                display: 'flex', alignItems: 'center', justifyContent: 'center',
                fontSize: i < 3 ? 18 : 14, fontWeight: 900,
                color: rankColors[i],
                fontFamily: 'var(--font-number)',
                flexShrink: 0,
              }}>
                {i < 3 ? rankIcons[i] : `#${i + 1}`}
              </div>
              <div style={{ flex: 1, minWidth: 0 }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 2 }}>
                  <span style={{ fontSize: 14, fontWeight: 700, color: '#fff', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                    {player.ign || player.username || 'Unknown'}
                  </span>
                  {player.teamName && (
                    <span style={{ fontSize: 10, fontWeight: 600, color: 'var(--text-muted)', background: 'rgba(255,255,255,0.05)', padding: '1px 6px', borderRadius: 4 }}>
                      {player.teamName}
                    </span>
                  )}
                  <TierBadgeMini user={player} />
                </div>
                <div style={{ display: 'flex', gap: 12, fontSize: 10, color: 'var(--text-muted)', fontWeight: 600 }}>
                  <span>{player.totalWins || 0}W</span>
                  <span>{player.totalKills || 0}K</span>
                  <span>{player.totalMatchesPlayed || 0}M</span>
                  <span>WR: {player.winRate}%</span>
                </div>
              </div>
              <div style={{ textAlign: 'right', flexShrink: 0 }}>
                <div style={{ fontSize: 13, fontWeight: 800, color: rankColors[i], fontFamily: 'var(--font-number)' }}>
                  {player.totalEarnings ? formatTK(player.totalEarnings) : '0 TK'}
                </div>
                <div style={{ fontSize: 9, color: 'var(--text-muted)', fontWeight: 600 }}>Earnings</div>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  )
}

// ═══════════════════════════════════════════════════════════
// LIVE CHANNEL — Broadcast Messages
// ═══════════════════════════════════════════════════════════
function LiveChannel() {
  const { state, dispatch } = useApp()
  const [message, setMessage] = useState('')
  const [channelType, setChannelType] = useState('announcement')
  const [sent, setSent] = useState(false)
  const mobile = useIsMobile()

  const CHANNEL_TYPES = [
    { id: 'announcement', label: 'Announcement', icon: 'fa-solid fa-bullhorn', color: '#fbbf24' },
    { id: 'maintenance', label: 'Maintenance', icon: 'fa-solid fa-wrench', color: '#f87171' },
    { id: 'promotion', label: 'Promotion', icon: 'fa-solid fa-rocket', color: '#22c55e' },
    { id: 'urgent', label: 'Urgent Alert', icon: 'fa-solid fa-triangle-exclamation', color: '#ef4444' },
  ]

  const handleSend = () => {
    if (!message.trim()) return
    adminAction(dispatch, 'LIVE_CHANNEL', `Type: ${channelType}`, 'Broadcast sent to all users!', 'success')
    setSent(true)
    setTimeout(() => {
      setSent(false)
      setMessage('')
    }, 2000)
  }

  const selectedChannel = CHANNEL_TYPES.find(c => c.id === channelType)

  return (
    <div style={S.panel}>
      <h2 style={S.title}>Live Channel</h2>

      <div style={{ ...S.card, marginBottom: 20 }}>
        <div style={S.cardHeader}>
          <div style={S.cardHeaderIcon(selectedChannel?.color || '#fbbf24')}>
            <i className={selectedChannel?.icon || 'fa-solid fa-bullhorn'} style={{ color: selectedChannel?.color || '#fbbf24' }}></i>
          </div>
          <h3 style={S.cardHeaderTitle}>Broadcast Message</h3>
          <span style={{
            marginLeft: 'auto',
            padding: '4px 10px', borderRadius: 6,
            fontSize: 9, fontWeight: 800, textTransform: 'uppercase',
            background: `${selectedChannel?.color || '#fbbf24'}15`,
            color: selectedChannel?.color || '#fbbf24',
            border: `1px solid ${selectedChannel?.color || '#fbbf24'}25`,
          }}>
            {selectedChannel?.label || 'Announcement'}
          </span>
        </div>
        <div style={{ padding: 18 }}>
          <div style={{ display: 'flex', flexWrap: 'wrap', gap: 8, marginBottom: 16 }}>
            {CHANNEL_TYPES.map(ct => (
              <button
                key={ct.id}
                onClick={() => setChannelType(ct.id)}
                style={{
                  padding: '8px 14px', borderRadius: 10,
                  border: `1px solid ${channelType === ct.id ? ct.color + '40' : 'rgba(255,255,255,0.06)'}`,
                  background: channelType === ct.id ? `${ct.color}15` : 'rgba(255,255,255,0.02)',
                  color: channelType === ct.id ? ct.color : 'var(--text-muted)',
                  fontSize: 12, fontWeight: 600, cursor: 'pointer',
                  display: 'flex', alignItems: 'center', gap: 6,
                  transition: 'all 0.2s',
                }}
              >
                <i className={ct.icon} style={{ fontSize: 11 }} />
                {ct.label}
              </button>
            ))}
          </div>
          <textarea
            value={message}
            onChange={e => setMessage(e.target.value)}
            placeholder="Type your broadcast message here... (visible to all users)"
            rows={4}
            style={{
              ...S.input,
              resize: 'vertical',
              minHeight: 100,
              marginBottom: 14,
            }}
          />
          <button
            onClick={handleSend}
            disabled={!message.trim() || sent}
            style={{
              ...S.btnPrimary,
              opacity: message.trim() && !sent ? 1 : 0.5,
              background: sent
                ? 'linear-gradient(135deg, #22c55e, #16a34a)'
                : 'linear-gradient(135deg, #6366f1, #a855f7)',
            }}
          >
            {sent ? (
              <><i className="fa-solid fa-check"></i> Sent!</>
            ) : (
              <><i className="fa-solid fa-tower-broadcast"></i> Send Broadcast</>
            )}
          </button>
        </div>
      </div>

      {/* Quick templates */}
      <div style={{ ...S.card }}>
        <div style={S.cardHeader}>
          <div style={S.cardHeaderIcon('#6c8cff')}>
            <i className="fa-solid fa-bolt" style={{ color: '#6c8cff' }}></i>
          </div>
          <h3 style={S.cardHeaderTitle}>Quick Templates</h3>
        </div>
        <div style={{ padding: 16, display: 'flex', flexDirection: 'column', gap: 8 }}>
          {[
            { label: 'New Match Posted', msg: '🔥 New match is now live! Join now before slots fill up!' },
            { label: 'Maintenance Notice', msg: '🔧 System maintenance in progress. Matches will resume shortly.' },
            { label: 'Winner Announcement', msg: '🏆 Congratulations to the winners of today\'s tournament!' },
            { label: 'Promotional Offer', msg: '⚡ Limited time: Reduced entry fees on select matches!' },
          ].map((tpl, i) => (
            <button
              key={i}
              onClick={() => { setMessage(tpl.msg); setChannelType(i === 1 ? 'maintenance' : i === 3 ? 'promotion' : 'announcement') }}
              style={{
                padding: '10px 14px', borderRadius: 10,
                border: '1px solid rgba(255,255,255,0.06)',
                background: 'rgba(255,255,255,0.02)',
                color: '#e5e1e4', fontSize: 12, fontWeight: 500,
                cursor: 'pointer', textAlign: 'left',
                transition: 'all 0.2s',
              }}
              onMouseEnter={e => { e.currentTarget.style.background = 'rgba(255,255,255,0.04)'; e.currentTarget.style.borderColor = 'rgba(255,255,255,0.1)' }}
              onMouseLeave={e => { e.currentTarget.style.background = 'rgba(255,255,255,0.02)'; e.currentTarget.style.borderColor = 'rgba(255,255,255,0.06)' }}
            >
              <div style={{ fontSize: 11, fontWeight: 700, color: '#06d6f0', marginBottom: 2 }}>{tpl.label}</div>
              <div style={{ fontSize: 12, color: 'var(--text-muted)' }}>{tpl.msg}</div>
            </button>
          ))}
        </div>
      </div>
    </div>
  )
}

// ═══════════════════════════════════════════════════════════
// MAIN ADMIN LAYOUT — UNCHANGED
// ═══════════════════════════════════════════════════════════
const ADMIN_TABS = [
 { id: 'admin-overview', label: 'Overview', icon: 'fa-chart-pie', color: '#00f0ff' },
 { id: 'admin-profit', label: 'Profit', icon: 'fa-chart-line', color: '#22c55e' },
 { id: 'admin-create', label: 'Create Match', icon: 'fa-circle-plus', color: '#a78bfa' },
 { id: 'admin-rooms', label: 'Rooms', icon: 'fa-key', color: '#fbbf24' },
 { id: 'admin-results', label: 'Results', icon: 'fa-clipboard-check', color: '#22c55e' },
 { id: 'admin-users', label: 'Users', icon: 'fa-users-gear', color: '#6c8cff' },
 { id: 'admin-finance', label: 'Finance', icon: 'fa-money-bill-transfer', color: '#ef4444' },
 { id: 'admin-add-money', label: 'Add Money', icon: 'fa-wallet', color: '#22c55e' },
 { id: 'admin-payments', label: 'Payments', icon: 'fa-credit-card', color: '#f59e0b' },
 { id: 'admin-owners', label: 'Owner Panel', icon: 'fa-crown', color: '#fbbf24' },
 { id: 'admin-activity', label: 'Activity Log', icon: 'fa-clock-rotate-left', color: '#6c8cff' },
 { id: 'admin-top-teams', label: 'Top Teams', icon: 'fa-solid fa-ranking-star', color: '#fbbf24' },
 { id: 'admin-live', label: 'Live Channel', icon: 'fa-solid fa-tower-broadcast', color: '#ef4444' },
]

const VALID_ADMIN_TABS = new Set(ADMIN_TABS.map(t => t.id))

export default function Admin() {
 const { state, dispatch, navigate } = useApp()
 const mobile = useIsMobile()

 const currentUser = state.currentUser || state.users.find(u => u.id === state.currentUserId)
 const userPerms = currentUser?.permissions || []
 const isOwner = currentUser?.role === 'owner'

 function canAccess(tabId) {
  if (isOwner) return true
  const perm = PERM_MAP[tabId]
  if (perm === null) return true
  if (perm === '__owner__') return false
  return userPerms.includes(perm)
 }

 const visibleTabs = ADMIN_TABS.filter(t => canAccess(t.id))
 const activeTab = VALID_ADMIN_TABS.has(state.currentView) ? state.currentView : 'admin-overview'
 const handleTab = (id) => navigate(id)

 return (
 <div className="admin-panel" style={{ padding: mobile ? '16px 16px 100px' : '24px 28px', maxWidth: 1200, margin: '0 auto' }}>
   {/* ═══ V7.0: Scanline overlay ═══ */}
   <div className="admin-scanline" />

   {/* ═══ V7.2: Mobile profile + logout bar ═══ */}
   {mobile && (
    <div style={{
      display: 'flex', alignItems: 'center', justifyContent: 'space-between',
      padding: '10px 14px', marginBottom: 14,
      paddingTop: 'calc(10px + env(safe-area-inset-top, 0px))',
      background: 'rgba(255,255,255,0.03)',
      border: '1px solid rgba(255,255,255,0.06)',
      borderRadius: 14,
    }}>
      <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
        <div style={{
          width: 34, height: 34, borderRadius: '50%',
          background: 'linear-gradient(135deg, #6c8cff, #a78bfa)',
          display: 'flex', alignItems: 'center', justifyContent: 'center',
          fontSize: 13, fontWeight: 800, color: '#fff',
        }}>
          {(currentUser?.name || currentUser?.displayName || currentUser?.username || '?').charAt(0)}
        </div>
        <div style={{ flex: 1 }}>
          <div style={{ fontSize: 13, fontWeight: 700 }}>{currentUser?.name || currentUser?.displayName || 'Admin'}</div>
          <div style={{ fontSize: 10, color: '#fbbf24', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.5px' }}>
            {currentUser?.role === 'owner' ? 'Owner' : 'Admin'}
          </div>
        </div>
      </div>
      <div style={{ display: 'flex', gap: 6 }}>
        <button
          onClick={() => navigate('profile')}
          style={{
            padding: '8px 12px', borderRadius: 10,
            border: '1px solid rgba(99,102,241,0.2)',
            background: 'rgba(99,102,241,0.08)',
            color: '#818cf8', fontSize: 11, fontWeight: 700,
            cursor: 'pointer', display: 'flex', alignItems: 'center', gap: 5,
            WebkitTapHighlightColor: 'transparent',
          }}
        >
          <i className="fa-solid fa-user" style={{ fontSize: 10 }} />
          Profile
        </button>
        <button
          onClick={() => navigate('settings')}
          style={{
            padding: '8px 12px', borderRadius: 10,
            border: '1px solid rgba(139,92,246,0.2)',
            background: 'rgba(139,92,246,0.08)',
            color: '#a78bfa', fontSize: 11, fontWeight: 700,
            cursor: 'pointer', display: 'flex', alignItems: 'center', gap: 5,
            WebkitTapHighlightColor: 'transparent',
          }}
        >
          <i className="fa-solid fa-gear" style={{ fontSize: 10 }} />
          Settings
        </button>
        <button
          onClick={() => { auth.signOut(); dispatch({ type: 'FIREBASE_LOGOUT' }) }}
          style={{
            padding: '8px 12px', borderRadius: 10,
            border: '1px solid rgba(239,68,68,0.2)',
            background: 'rgba(239,68,68,0.08)',
            color: '#f87171', fontSize: 11, fontWeight: 700,
            cursor: 'pointer', display: 'flex', alignItems: 'center', gap: 5,
            WebkitTapHighlightColor: 'transparent',
          }}
        >
          <i className="fa-solid fa-right-from-bracket" style={{ fontSize: 10 }} />
          Logout
        </button>
      </div>
    </div>
   )}
   {/* ═══ Header Banner ═══ */}
   <div className="admin-header-banner glass-card-premium tilt-card">
    <div>
     <div className="admin-title">Clutch Arena</div>
     <div className="admin-subtitle">Admin Control Center</div>
    </div>
    <div className="admin-online-badge">
     <span>🟢 Live</span>
    </div>
   </div>

   {!mobile && (
    <div className="tab-pill-container">
     {visibleTabs.map(t => {
      const active = activeTab === t.id
      return (
       <button
        key={t.id}
        className={`tab-pill ${active ? 'active' : ''}`}
        onClick={() => handleTab(t.id)}
        style={{
         '--tab-color': `${t.color}18`,
         '--tab-color-2': `${t.color}08`,
         '--tab-border': `${t.color}35`,
         '--tab-text': t.color,
         '--tab-shadow': `${t.color}20`,
        }}
       >
        <i className={t.icon}></i>
        {t.label}
       </button>
      )
     })}
    </div>
  )}

   {mobile && (
    <div className="tab-pill-container" style={{ overflowX: 'auto', scrollbarWidth: 'none', marginBottom: 16, paddingBottom: 4 }}>
     {visibleTabs.map(t => {
      const active = activeTab === t.id
      return (
       <button
        key={t.id}
        className={`tab-pill ${active ? 'active' : ''}`}
        onClick={() => handleTab(t.id)}
        style={{
         '--tab-color': `${t.color}25`,
         '--tab-color-2': `${t.color}10`,
         '--tab-border': `${t.color}50`,
         '--tab-text': t.color,
         '--tab-shadow': `${t.color}25`,
         display: 'flex',
         flexDirection: 'column',
         alignItems: 'center',
         gap: 4,
         padding: '8px 14px',
         minWidth: 64,
         flexShrink: 0,
         fontSize: 10,
        }}
       >
        <i className={t.icon} style={{ fontSize: 16 }}></i>
        <span>{t.label}</span>
       </button>
      )
     })}
    </div>
   )}

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
   {activeTab === 'admin-top-teams' && canAccess('admin-top-teams') && <TopTeams />}
   {activeTab === 'admin-live' && canAccess('admin-live') && <LiveChannel />}

   {!canAccess(activeTab) && (
    <div style={{
      textAlign: 'center',
      padding: 80,
      background: 'linear-gradient(180deg, rgba(239,68,68,0.04), transparent)',
      borderRadius: 20,
      border: '1px solid rgba(239,68,68,0.1)'
    }}>
     <div style={{
       width: 72,
       height: 72,
       borderRadius: '50%',
       background: 'linear-gradient(135deg, rgba(239,68,68,0.15), rgba(239,68,68,0.05))',
       border: '1px solid rgba(239,68,68,0.2)',
       display: 'flex',
       alignItems: 'center',
       justifyContent: 'center',
       margin: '0 auto 20px',
       boxShadow: '0 8px 24px rgba(239,68,68,0.15)'
     }}>
       <i className="fa-solid fa-lock" style={{ fontSize: 28, color: '#f87171' }}></i>
     </div>
     <h3 style={{ fontSize: 20, fontWeight: 800, marginBottom: 10, color: '#fff' }}>Access Restricted</h3>
     <p style={{ fontSize: 13, color: 'var(--text-muted)', lineHeight: 1.6 }}>
      You don't have permission to view this section.<br />
      Contact the <span style={{ color: '#fbbf24', fontWeight: 700 }}>Owner</span> to request access.
     </p>
    </div>
   )}
  </div>
 )
}
