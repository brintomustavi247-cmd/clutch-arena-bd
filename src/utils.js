// ============================
// 🔥 CLUTCH ARENA BD — CORE ENGINE v2.1
// ============================

// ===== CURRENCY FORMATTING (ONLY "TK", NO ICONS) =====
export function formatBDT(n) {
  if (!n || isNaN(n)) return '0 TK'
  return `${Math.round(Number(n)).toLocaleString('en-IN')} TK`
}
export const formatTK = formatBDT

// Short TK for cards — "1.5K TK"
export function formatTKShort(n) {
  if (!n || isNaN(n)) return '0 TK'
  const num = Math.round(Number(n))
  if (num >= 1000) return `${(num / 1000).toFixed(1)}K TK`
  return `${num} TK`
}

// ===== TIME FORMATTING =====
// Full countdown — "02:15:03"
export function formatTime(ms) {
  if (ms <= 0) return '00:00:00'
  const h = Math.floor(ms / 3600000)
  const m = Math.floor((ms % 3600000) / 60000)
  const s = Math.floor((ms % 60000) / 1000)
  return `${String(h).padStart(2, '0')}:${String(m).padStart(2, '0')}:${String(s).padStart(2, '0')}`
}

// Short countdown — "2h 15m"
export function formatTimeShort(ms) {
  if (ms <= 0) return 'Now'
  const h = Math.floor(ms / 3600000)
  const m = Math.floor((ms % 3600000) / 60000)
  if (h > 0) return `${h}h ${m}m`
  if (m > 0) return `${m}m`
  return `${Math.floor(ms / 1000)}s`
}

// Relative time — "5m ago"
export function timeAgo(str) {
  const ts = parseMatchTime(str)
  if (!ts) return 'just now'
  const diff = Date.now() - ts
  if (diff < 60000) return 'just now'
  if (diff < 3600000) return Math.floor(diff / 60000) + 'm ago'
  if (diff < 86400000) return Math.floor(diff / 3600000) + 'h ago'
  return Math.floor(diff / 86400000) + 'd ago'
}

// Current timestamp for DB format — "2026-04-19 01:05"
export function nowTimestamp() {
  return new Date().toISOString().slice(0, 16).replace('T', ' ')
}

// Premium date for match detail — "19 April 2026, 1:05 AM"
export function formatMatchDate(str) {
  const ts = parseMatchTime(str)
  if (!ts) return 'TBA'
  const d = new Date(ts)
  return d.toLocaleDateString('en-US', {
    day: 'numeric', month: 'long', year: 'numeric',
    hour: 'numeric', minute: '2-digit', hour12: true
  })
}

// ===== TIME PARSER — handles string, ISO, Firestore Timestamp, number =====
function parseMatchTime(startTime) {
  if (!startTime) return null
  if (startTime && typeof startTime.toDate === 'function') return startTime.toDate().getTime()
  if (typeof startTime === 'number') return startTime
  if (typeof startTime === 'string') {
    const ts = new Date(startTime.replace(' ', 'T')).getTime()
    if (!isNaN(ts)) return ts
    const ts2 = new Date(startTime).getTime()
    if (!isNaN(ts2)) return ts2
  }
  return null
}

// ===== MATCH PHASE DETECTION =====
export function getMatchPhase(match) {
  if (!match.startTime) return 'unknown'
  const start = parseMatchTime(match.startTime)
  if (!start) return 'unknown'
  const now = Date.now()
  const duration = match.gameType === 'CS' ? 15 * 60000 : 25 * 60000
  if (now < start) return 'upcoming'
  if (now < start + duration) return 'live'
  return 'completed'
}

// Countdown milliseconds to match start
export function getMatchCountdown(match) {
  if (!match.startTime) return 0
  const start = parseMatchTime(match.startTime)
  if (!start) return 0
  return start - Date.now()
}

// ===== FREE FIRE CONSTANTS (NO PUBG REFERENCES) =====
export const FF_MAPS = ['Bermuda', 'Purgatory', 'Kalahari', 'Alpine']
export const FF_MODES = ['Solo', 'Duo', 'Squad', 'Clash Squad']
export const FF_GAME_TYPES = [
  { value: 'BR', label: 'Battle Royale (Free Fire)' },
  { value: 'CS', label: 'Clash Squad (4v4)' }
]
// ★ ADDED: Missing exports referenced by Admin.jsx
export const KILL_REWARDS = [0, 5, 8, 10, 15, 20, 25]
export const RESULT_METHODS = [
  { id: 'manual', label: 'Manual Entry', icon: 'fa-solid fa-keyboard', description: 'Type player results manually' },
  { id: 'screenshot', label: 'Screenshot Upload', icon: 'fa-solid fa-camera', description: 'Upload FF result screenshot' },
]
export const ADD_MONEY_METHODS = [
  { id: 'bKash', label: 'bKash', color: '#e2136e', icon: 'fa-solid fa-mobile-screen' },
  { id: 'Nagad', label: 'Nagad', color: '#f6921e', icon: 'fa-solid fa-mobile-screen' },
  { id: 'Rocket', label: 'Rocket', color: '#8c3494', icon: 'fa-solid fa-mobile-screen' },
]
export const WITHDRAW_METHODS = ADD_MONEY_METHODS
export const ADD_AMOUNT_PRESETS = [50, 100, 200, 500, 1000, 2000]

export const isValidMap = (map) => FF_MAPS.includes(map)
export const isValidMode = (mode) => FF_MODES.includes(mode)

// Player count & max slots per mode
export function requiredNameInputs(mode) {
  const map = { Solo: 1, Duo: 2, Squad: 4, 'Clash Squad': 4 }
  return map[mode] || 1
}
export function maxSlotsForMode(mode) {
  const map = { Solo: 50, Duo: 25, Squad: 12, 'Clash Squad': 12 }
  return map[mode] || 50
}

// ★ ADDED: Is the match mode team-based? (Duo, Squad, CS)
export function isTeamMode(mode) {
  return mode === 'Duo' || mode === 'Squad' || mode === 'Clash Squad'
}

// ===== UI HELPERS =====
export function modeColor(mode) {
  return { Solo: '#6c8cff', Duo: '#fbbf24', Squad: '#a78bfa', 'Clash Squad': '#f87171' }[mode] || '#6c8cff'
}
export function modeBadge(mode) {
  return { Solo: '👤 SOLO', Duo: '👥 DUO', Squad: '🛡️ SQUAD', 'Clash Squad': '⚔️ CLASH SQUAD' }[mode] || '🎮'
}
export function mapIcon(map) {
  return { Bermuda: '🏝️', Purgatory: '🔥', Kalahari: '🏜️', Alpine: '❄️' }[map] || '🗺️'
}

// Phase display helpers
export function phaseColor(phase) {
  return { upcoming: '#6c8cff', live: '#22c55e', completed: '#64748b', unknown: '#64748b' }[phase] || '#64748b'
}
export function phaseLabel(phase) {
  return { upcoming: 'UPCOMING', live: '● LIVE', completed: 'COMPLETED', unknown: '—' }[phase] || '—'
}

// Slot helpers
export function slotsLeft(match) {
  return Math.max(0, (match.maxSlots || 0) - (match.joinedCount || 0))
}
export function slotPercent(match) {
  if (!match.maxSlots) return 0
  return Math.min(100, Math.round(((match.joinedCount || 0) / match.maxSlots) * 100))
}
export function isSlotFull(match) {
  return (match.joinedCount || 0) >= (match.maxSlots || 0)
}
export function slotStatusText(match) {
  const left = slotsLeft(match)
  if (left <= 0) return 'FULL'
  return `${left} Spot${left > 1 ? 's' : ''} Left`
}

// Toast
export function showToast(dispatch, message, type = 'info') {
  const id = Date.now() + Math.random()
  dispatch({ type: 'SHOW_TOAST', payload: { id, message, type, removing: false } })
  setTimeout(() => dispatch({ type: 'TOAST_REMOVING', payload: id }), 2700)
  setTimeout(() => dispatch({ type: 'REMOVE_TOAST', payload: id }), 3000)
}


// ====================================================================
// 💰 JOIN COST CALCULATOR
// ====================================================================
export function calculateJoinCost(mode, entryFee) {
  const fee = Number(entryFee)
  if (mode === 'Duo') return fee * 2
  if (mode === 'Squad' || mode === 'Clash Squad') return fee * 4
  return fee
}


// ====================================================================
// 💳 BALANCE DEDUCTION PREVIEW (Shown at join confirmation)
// ====================================================================
export function calculateJoinPreview(currentBalance, mode, entryFee) {
  const cost = calculateJoinCost(mode, entryFee)
  const canAfford = currentBalance >= cost
  return {
    entryFeePerPlayer: Number(entryFee),
    playersNeeded: requiredNameInputs(mode),
    totalCost: cost,
    currentBalance,
    remainingBalance: currentBalance - cost,
    canAfford,
    shortage: canAfford ? 0 : cost - currentBalance
  }
}


// ====================================================================
// 🧠 MATCH ECONOMICS ENGINE (20% ADMIN PROFIT — IMMUTABLE)
// ====================================================================
export function calculateMatchEconomics(entryFee, slots, gameType, include4th = true, include5th = true) {
  const totalCollection = Number(entryFee) * Number(slots)
  const adminProfit = Math.round(totalCollection * 0.20)
  const prizePool = totalCollection - adminProfit
  const prizes = calculatePrizes(gameType, prizePool, include4th, include5th)
  return { totalCollection, adminProfit, prizePool, prizes }
}


// ====================================================================
// ⚔️ PRIZE DISTRIBUTION ENGINE
// ★ FIX: 4th pushed BEFORE 5th — correct display order
// ====================================================================
export function calculatePrizes(gameType, prizePool, include4th = true, include5th = true) {
  if (!prizePool || prizePool <= 0) return []

  // CLASH SQUAD (4v4) — Winner 70%, Runner-up 30%
  if (gameType === 'CS') {
    return [
      { rank: 'Winner', amount: Math.round(prizePool * 0.70) },
      { rank: 'Runner-up', amount: Math.round(prizePool * 0.30) }
    ]
  }

  // BATTLE ROYALE — 5-tier with toggleable 4th/5th
  let weights = [
    { rank: '1st', weight: 40 },
    { rank: '2nd', weight: 22 },
    { rank: '3rd', weight: 15 }
  ]
  // ★ THE FIX: 4th BEFORE 5th — swap these two lines
  if (include4th) weights.push({ rank: '4th', weight: 10 })
  if (include5th) weights.push({ rank: '5th', weight: 5 })

  const totalWeight = weights.reduce((s, w) => s + w.weight, 0)
  let distributed = 0

  return weights.map((w, i) => {
    if (i === weights.length - 1) {
      return { rank: w.rank, amount: Math.max(0, prizePool - distributed) }
    }
    const amount = Math.floor((prizePool * w.weight) / totalWeight)
    distributed += amount
    return { rank: w.rank, amount }
  })
}


// ====================================================================
// 🏆 RESULT PRIZE CALCULATOR (Auto from position + kills)
// ====================================================================
function ordinal(n) {
  if (n === 1) return 'st'; if (n === 2) return 'nd'; if (n === 3) return 'rd'; return 'th'
}

export function calculateResultPrize(position, kills, perKillReward, prizes, gameType) {
  let positionPrize = 0

  if (gameType === 'CS') {
    const key = position === 1 ? 'Winner' : 'Runner-up'
    const entry = prizes.find(p => p.rank === key)
    positionPrize = entry ? entry.amount : 0
  } else {
    const key = `${position}${ordinal(position)}`
    const entry = prizes.find(p => p.rank === key)
    positionPrize = entry ? entry.amount : 0
  }

  const killPrize = (kills || 0) * Number(perKillReward || 0)
  return { positionPrize, killPrize, totalPrize: positionPrize + killPrize }
}

// Bulk calculate for entire result sheet
export function calculateAllResultPrizes(results, perKillReward, prizes, gameType) {
  return results.map(r => ({
    ...r,
    ...calculateResultPrize(r.position, r.kills, perKillReward, prizes, gameType)
  }))
}


// ====================================================================
// 📊 STANDINGS POINTS CALCULATOR (FF Tournament Format)
// ====================================================================
export const POSITION_POINTS = { 1: 12, 2: 9, 3: 8, 4: 7, 5: 6, 6: 5, 7: 4, 8: 3, 9: 2, 10: 1, 11: 0, 12: 0 }

export function calculateStandings(results) {
  return results
    .map(team => {
      const posPts = POSITION_POINTS[team.position] || 0
      const killPts = (team.kills || 0) * 1
      return { ...team, posPts, killPts, totalPoints: posPts + killPts }
    })
    .sort((a, b) => b.totalPoints - a.totalPoints || a.position - b.position)
    .map((team, i) => ({ ...team, rank: i + 1 }))
}

// Total prize verification — sum of all result prizes should ≤ prizePool
export function verifyResultTotal(results, prizePool) {
  const total = results.reduce((s, r) => s + (r.totalPrize || 0), 0)
  return { totalDistributed: total, isValid: total <= prizePool, overflow: total - prizePool }
}


// ====================================================================
// 🚪 ROOM ID & PASSWORD VISIBILITY (10 MIN BEFORE MATCH ONLY)
// ====================================================================
export function canSeeRoom(match) {
  if (!match.startTime || !match.roomId) return false
  const start = parseMatchTime(match.startTime)
  if (!start) return false
  return Date.now() >= start - 10 * 60 * 1000
}

export function getRoomUnlockCountdown(match) {
  if (!match.startTime) return null
  const start = parseMatchTime(match.startTime)
  if (!start) return null
  const unlockAt = start - 10 * 60 * 1000
  const diff = unlockAt - Date.now()
  if (diff <= 0) return 'UNLOCKED'
  return `Unlocks in ${formatTime(diff)}`
}

export function getRoomUnlockMs(match) {
  if (!match.startTime) return Infinity
  const start = parseMatchTime(match.startTime)
  if (!start) return Infinity
  return start - 10 * 60 * 1000 - Date.now()
}
// ====================================================================
// 🏆 ELO RANKING ENGINE
// ====================================================================

/**
 * Calculate ELO change for a Battle Royale match.
 * 1st place = +max, Last place = -max
 */
export function calculateELO(playerElo, avgOpponentElo, placement, totalPlayers) {
  const K = 32
  const expectedScore = 1 / (1 + Math.pow(10, (avgOpponentElo - playerElo) / 400))
  const actualScore = (totalPlayers - placement) / (totalPlayers - 1)
  const change = Math.round(K * (actualScore - expectedScore))
  return Math.max(-50, Math.min(50, change)) // Cap at +/- 50
}

/**
 * Get tier object based on ELO
 */
export function getEloTier(elo) {
  if (elo === undefined || elo === null) return { name: 'Unranked', color: '#555555', icon: '⚪', min: 0, max: 999 }
  if (elo >= 2200) return { name: 'Grandmaster', color: '#FF6B6B', icon: '🔥', min: 2200, max: 9999 }
  if (elo >= 2000) return { name: 'Heroic', color: '#A78BFA', icon: '💀', min: 2000, max: 2199 }
  if (elo >= 1800) return { name: 'Diamond', color: '#B9F2FF', icon: '💎', min: 1800, max: 1999 }
  if (elo >= 1600) return { name: 'Platinum', color: '#61CDFF', icon: '🥈', min: 1600, max: 1799 }
  if (elo >= 1400) return { name: 'Gold', color: '#FFD700', icon: '🥇', min: 1400, max: 1599 }
  if (elo >= 1200) return { name: 'Silver', color: '#C0C0C0', icon: '🥉', min: 1200, max: 1399 }
  if (elo >= 1000) return { name: 'Bronze', color: '#CD7F32', icon: '🛡️', min: 1000, max: 1199 }
  return { name: 'Unranked', color: '#555555', icon: '⚪', min: 0, max: 999 }
}

/**
 * Get progress percentage to next tier (0-100%)
 */
export function getTierProgress(elo) {
  const tier = getEloTier(elo)
  const progress = elo - tier.min
  const range = tier.max - tier.min
  return Math.min(100, Math.round((progress / range) * 100))
}
// ─── ELO ENGINE ──────────────────────────────────────────

export function calculateELO(playerElo, avgOpponentElo, placement, totalPlayers) {
  const K = 32
  const expectedScore = 1 / (1 + Math.pow(10, (avgOpponentElo - playerElo) / 400))
  // Battle Royale format: 1st place = 1.0, last place = 0.0
  const actualScore = (totalPlayers - placement) / (totalPlayers - 1)
  return Math.round(K * (actualScore - expectedScore))
}

const TIERS = [
  { name: 'Bronze',      min: 0,    max: 1199, color: '#CD7F32', icon: '🥉' },
  { name: 'Silver',      min: 1200, max: 1399, color: '#C0C0C0', icon: '🎖️' },
  { name: 'Gold',        min: 1400, max: 1599, color: '#FFD700', icon: '🥇' },
  { name: 'Platinum',    min: 1600, max: 1799, color: '#61CDFF', icon: '💠' },
  { name: 'Diamond',     min: 1800, max: 1999, color: '#B9F2FF', icon: '💎' },
  { name: 'Heroic',      min: 2000, max: 2199, color: '#A78BFA', icon: '🦸' },
  { name: 'Grandmaster', min: 2200, max: 9999, color: '#FF6B6B', icon: '👑' },
]

export function getEloTier(elo) {
  return TIERS.find(t => elo >= t.min && elo <= t.max) || TIERS[0]
}

export function getTierProgress(elo) {
  const tier = getEloTier(elo)
  if (tier.max === 9999) return 100
  const range = tier.max - tier.min + 1
  const progress = elo - tier.min
  return Math.min(100, Math.round((progress / range) * 100))
}

export function formatTKShort(amount) {
  if (amount == null || isNaN(amount)) return '৳0'
  const num = Number(amount)
  if (num >= 100000) return '৳' + (num / 100000).toFixed(1) + 'L'
  if (num >= 1000) return '৳' + (num / 1000).toFixed(1) + 'K'
  return '৳' + num
}