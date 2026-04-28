import { fetchUser, createUser, createMatchInDb, updateMatchInDb, getSettings, saveSettings, createAddMoneyRequest, fetchPendingAddMoneyRequests, approveAddMoneyRequest, rejectAddMoneyRequest, distributePrizes, cancelMatchAndRefund, checkDuplicateTXID, adminAdjustBalance, addJoinToMatch, addWithdrawalToCloud, logActivityToCloud, addTransactionToCloud, subscribeToMatches, subscribeToSettings, subscribeToUser, subscribeToWithdrawals, approveWithdrawalInCloud, rejectWithdrawalInCloud, subscribeToUserTransactions, updateUser } from './db'
import { createContext, useContext, useReducer, useEffect, useCallback, useRef } from 'react'
import { calculateMatchEconomics, calculateJoinCost, showToast } from './utils'
import { auth } from './firebase'
import { onAuthStateChanged } from 'firebase/auth'
const AppContext = createContext(null)

const LS_KEY = 'clutch_arena_bd'
// NUKE old format data — prevents ghost balance, mock withdrawals, stale users
;(function clearOldLS() {
  try {
    const raw = localStorage.getItem(LS_KEY)
    if (raw) {
      const parsed = JSON.parse(raw)
      if (parsed?.currentUser && (parsed.currentUser.balance !== undefined || parsed.currentUser.role !== undefined)) {
        localStorage.removeItem(LS_KEY)
      }
    }
  } catch {}
})()
function loadFromLS() {
  try { const raw = localStorage.getItem(LS_KEY); return raw ? JSON.parse(raw) : null } catch { return null }
}
function saveToLS(data) {
  try { localStorage.setItem(LS_KEY, JSON.stringify(data)) } catch {}
}

const getTimeStr = (msOffset) => new Date(Date.now() + msOffset).toISOString().slice(0, 16).replace('T', ' ')

// ===== OWNER PHONE — kept in sync with Login.jsx =====
const OWNER_PHONE = '+8801871035221'
const OWNER_EMAIL = 'brintomustavi247@gmail.com'

function parseHash() {
  const hash = window.location.hash.slice(1) || 'login'
  const parts = hash.split('/')
  return { view: parts[0], param: parts[1] || null }
}

const saved = loadFromLS()

const initialState = {
  isLoggedIn: saved?.isLoggedIn || false,
  currentUser: saved?.currentUser || null,
  users: [],
  matches: [],
  notifications: [],
  transactions: [],
  standings: [],
  adminPayments: { bKash: '', Nagad: '', Rocket: '' },
  pendingWithdrawals: [],
  pendingAddMoneyRequests: [],
  activityLog: [],
  currentView: saved?.isLoggedIn ? 'dashboard' : 'login',
  viewParam: null,
  matchFilter: 'all',
  adminTab: 'admin-overview',
  rightPanelOpen: false,
  modal: null,
  toasts: [],
  now: Date.now(),
  loading: false,
  sidebarOpen: false,
  language: saved?.language || 'en',
  // Phase 1: Pending async operations
  pendingPrizeDistribution: null,
  pendingCancelMatch: null,
  pendingBalanceAdjust: null,
  rateLimited: false,
  requireIGN: false,
  joinBlocked: null,
}

// ===== REDUCER =====
function reducer(state, action) {
  switch (action.type) {

    case 'TICK':
      return { ...state, now: Date.now() }

    case 'NAVIGATE':
      return { ...state, currentView: action.payload.view, viewParam: action.payload.param, sidebarOpen: false }
    case 'SET_FILTER':
      return { ...state, matchFilter: action.payload }
    case 'SET_ADMIN_TAB':
      return { ...state, adminTab: action.payload }
    case 'TOGGLE_SIDEBAR':
      return { ...state, sidebarOpen: !state.sidebarOpen }
    case 'CLOSE_SIDEBAR':
      return { ...state, sidebarOpen: false }

    // ══════════════════════════════════════════
    //  AUTH — supports username OR phone login
    // ══════════════════════════════════════════
    case 'LOGIN_USER': {
      const { username, phone, password } = action.payload
      const user = state.users.find(u => {
        if (u.role !== 'user') return false
        if (u.password !== password) return false
        if (username && u.username === username) return true
        if (phone && u.phone === phone) return true
        return false
      })
      if (!user) return { ...state, loading: false }
      if (user.status === 'banned') return { ...state, loading: false }
      return {
        ...state,
        isLoggedIn: true,
        currentUser: { ...user },
        currentView: 'dashboard',
        loading: false,
        modal: null,
      }
    }

    case 'LOGIN_ADMIN': {
      const { username, password } = action.payload
      const user = state.users.find(
        u => u.username === username && u.password === password
          && (u.role === 'admin' || u.role === 'owner')
      )
      if (!user) return { ...state, loading: false }
      if (user.status === 'banned') return { ...state, loading: false }
      return {
        ...state,
        isLoggedIn: true,
        currentUser: { ...user },
        currentView: 'admin-overview',
        loading: false,
        modal: null,
      }
    }

    // ════════════════════════════════════════
    //  FIREBASE AUTH
    // ════════════════════════════════════════
    case 'FIREBASE_LOGIN': {
      const payload = action.payload
      if (!payload) {
        if (state.currentUser?.firebaseUid) {
          return { ...state, isLoggedIn: false, currentUser: null, currentView: 'login', viewParam: null, modal: null }
        }
        return state
      }

      const authUser = payload.dbData ? payload : payload
      const dbData = payload.dbData || null

      const phone = authUser.phoneNumber?.replace('+880', '0') || ''
      const email = authUser.email || ''

      const isOwner = (phone === OWNER_PHONE) || (email === OWNER_EMAIL)
      const role = isOwner ? 'owner' : (dbData?.role || 'user')

      return {
        ...state,
        isLoggedIn: true,
        currentUser: {
          id: authUser.uid,
          username: dbData?.username || authUser.displayName?.toLowerCase().replace(/\s+/g, '_') || 'user_' + authUser.uid.slice(0, 8),
          name: dbData?.name || authUser.displayName || 'Firebase User',
          displayName: dbData?.displayName || authUser.displayName || 'Firebase User',
          ign: dbData?.ign || state.currentUser?.ign || '',
          avatar: dbData?.avatar || authUser.photoURL || null,
          role: role,
          phone: dbData?.phone || phone,
          email: dbData?.email || email,
          firebaseUid: authUser.uid,
          balance: dbData?.balance ?? 0,
          kills: dbData?.kills ?? 0,
          wins: dbData?.wins ?? 0,
          matchesPlayed: dbData?.matchesPlayed ?? 0,
          earnings: dbData?.earnings ?? 0,
          banned: dbData?.banned || false,
          status: dbData?.status || 'active',
          permissions: dbData?.permissions || state.currentUser?.permissions || [],
          teamName: dbData?.teamName || state.currentUser?.teamName || '',
          createdAt: dbData?.createdAt || state.currentUser?.createdAt || new Date().toISOString()
        },
          currentView: state.isLoggedIn ? state.currentView : (role === 'owner' ? 'admin-overview' : 'dashboard'),
        requireIGN: (!dbData?.ign || !dbData?.ign.trim()) && role !== 'owner',
        loading: false,
        modal: null,
      }
    }
    case 'FIREBASE_USER_UPDATE': {
      if (!state.currentUser) return state
      // ═══ PHASE 4.10: Banned user = immediate logout ═══
      if (action.payload?.banned === true) {
        return {
          ...state, isLoggedIn: false, currentUser: null,
          currentView: 'login', viewParam: null, modal: null,
          toasts: [...state.toasts, {
            id: 'banned_' + Date.now(), type: 'error',
            text: 'Your account has been banned by admin.',
            removing: false,
          }],
          sidebarOpen: false,
        }
      }
      // ═══ PHASE 4.1: If user just set IGN, clear requireIGN flag ═══
      const newState = {
        ...state,
        currentUser: { ...state.currentUser, ...action.payload },
      }
      if (state.requireIGN && action.payload?.ign?.trim()) {
        newState.requireIGN = false
      }
      return newState
    }

    case 'FIREBASE_LOGOUT':
      if (state.currentUser?.firebaseUid) {
        return { ...state, isLoggedIn: false, currentUser: null, currentView: 'login', viewParam: null, modal: null, toasts: [], sidebarOpen: false }
      }
      return state

    // ════════════════════════════════════════
    //  RESET PASSWORD
    // ════════════════════════════════════════
    case 'RESET_PASSWORD': {
      const { phone, email, newPassword } = action.payload
      const idx = state.users.findIndex(u => {
        if (phone && u.phone === phone) return true
        if (email && u.email && u.email.toLowerCase() === email.toLowerCase()) return true
        return false
      })
      if (idx === -1) return state
      return {
        ...state,
        users: state.users.map((u, i) =>
          i === idx ? { ...u, password: newPassword, forcePasswordChange: false } : u
        ),
      }
    }

    case 'LOGOUT':
      return {
        ...state,
        isLoggedIn: false,
        currentUser: null,
        currentView: 'login',
        viewParam: null,
        modal: null,
        toasts: [],
        sidebarOpen: false,
      }

    // ════════════════════════════════════════
    //  PROFILE
    // ════════════════════════════════════════
    case 'UPDATE_PROFILE': {
      const updated = { ...state.currentUser, ...action.payload }
      return {
        ...state,
        currentUser: updated,
        users: state.users.map(u => u.id === updated.id ? { ...u, ...action.payload } : u),
      }
    }
    case 'SET_AVATAR': {
      const updated = { ...state.currentUser, avatar: action.payload }
      return {
        ...state,
        currentUser: updated,
        users: state.users.map(u => u.id === updated.id ? { ...u, avatar: action.payload } : u),
      }
    }
    case 'CHANGE_PASSWORD': {
      const { userId, newPassword } = action.payload
      return {
        ...state,
        currentUser: state.currentUser?.id === userId
          ? { ...state.currentUser, password: newPassword, forcePasswordChange: false }
          : state.currentUser,
        users: state.users.map(u =>
          u.id === userId ? { ...u, password: newPassword, forcePasswordChange: false } : u
        ),
      }
    }

    // ════════════════════════════════════════
    //  MATCH: CREATE
    // ════════════════════════════════════════
    case 'CREATE_MATCH': {
      const fd = action.payload
      const eco = calculateMatchEconomics(fd.entryFee, fd.maxSlots, fd.gameType, fd.include4th, fd.include5th)
      const newMatchId = 'm' + Date.now()
      const newMatch = {
        id: newMatchId,
        title: fd.title, mode: fd.mode, map: fd.map, gameType: fd.gameType,
        entryFee: Number(fd.entryFee), maxSlots: Number(fd.maxSlots),
        joinedCount: 0, perKill: Number(fd.perKill) || 0,
        include4th: !!fd.include4th, include5th: !!fd.include5th,
        status: 'upcoming', startTime: fd.startTime || '',
        roomId: '', roomPassword: '', image: fd.image || '',
        participants: [], prizePool: eco.prizePool, prizes: eco.prizes,
        createdBy: state.currentUser?.id, createdAt: new Date().toISOString(),
        // ═══ PHASE 1.3: Escrow tracking fields ═══
        escrow: { collected: 0, refunded: 0, distributed: 0 },
        // ═══ PHASE 1.5: Min player threshold ═══
        minPlayers: Number(fd.minPlayers) || 10,
        // ═══ PHASE 1.6: Joined array for team name → user mapping ═══
        joined: [],
        // ═══ END PHASE 1.3 + 1.5 + 1.6 ═══
      }

      createMatchInDb(newMatchId, newMatch).catch(err => console.error("Cloud save failed:", err))

      return { ...state, matches: [newMatch, ...state.matches] }
    }

    case 'UPDATE_MATCH':
      return { ...state, matches: state.matches.map(m => m.id === action.payload.id ? { ...m, ...action.payload } : m) }

    case 'DELETE_MATCH':
      return { ...state, matches: state.matches.filter(m => m.id !== action.payload) }

    // ════════════════════════════════════════
    //  MATCH: JOIN
    // ════════════════════════════════════════
    case 'JOIN_MATCH': {
      const { matchId, teamName } = action.payload
      const match = state.matches.find(m => m.id === matchId)
      if (!match || match.status === 'completed' || match.status === 'cancelled' || match.joinedCount >= match.maxSlots) return state
       if (match.participants?.includes(state.currentUser?.id)) return state
      // ═══ PHASE 4.5: Match overlap prevention — one active match at a time ═══
      const alreadyActive = state.matches.some(m =>
        (m.status === 'upcoming' || m.status === 'live') &&
        m.participants?.includes(state.currentUser?.id)
      )
      if (alreadyActive) return { ...state, joinBlocked: 'You already have an active match. Wait for it to finish before joining another.' }
      // ═══ END PHASE 4.5 ═══
      const cost = calculateJoinCost(match.mode, match.entryFee)
      if ((state.currentUser?.balance || 0) < cost) return state

      const updatedUser = {
        ...state.currentUser,
        balance: state.currentUser.balance - cost,
        matchesPlayed: state.currentUser.matchesPlayed + 1,
        teamName: teamName || state.currentUser.teamName || '',
      }

      // ═══ PHASE 1.6: Build joined entry for team name → user ID mapping ═══
      const joinedEntry = {
        userId: state.currentUser.id,
        ign: state.currentUser.ign || '',
        username: state.currentUser.username || '',
        name: state.currentUser.name || state.currentUser.displayName || '',
        teamName: teamName || '',
        joinedAt: new Date().toISOString(),
      }
      // ═══ END PHASE 1.6 ═══

      const updatedMatch = {
        ...match,
        joinedCount: match.joinedCount + 1,
        participants: [...(match.participants || []), state.currentUser.id],
        // ═══ PHASE 1.6: Push to joined array ═══
        joined: [...(match.joined || []), joinedEntry],
        // ═══ PHASE 1.3: Update escrow collected ═══
        escrow: {
          ...(match.escrow || { collected: 0, refunded: 0, distributed: 0 }),
          collected: (match.escrow?.collected || 0) + cost,
        },
        // ═══ END PHASE 1.3 + 1.6 ═══
      }
        addJoinToMatch(matchId, joinedEntry).catch(err => console.error("Cloud join sync failed:", err))
      addTransactionToCloud({ id: 'tx' + Date.now(), type: 'join', amount: cost, desc: teamName ? `Joined ${match.title} (Team: ${teamName})` : `Joined ${match.title}`, date: getTimeStr(0), status: 'completed', userId: state.currentUser.id, username: state.currentUser.name || state.currentUser.displayName, ign: state.currentUser.ign || '' }).catch(() => {})

      return {
        ...state,
         joinBlocked: null,
        matches: state.matches.map(m => m.id === matchId ? updatedMatch : m),
        currentUser: updatedUser,
        users: state.users.map(u => u.id === updatedUser.id ? updatedUser : u),
        transactions: [{
          id: 'tx' + Date.now(), type: 'join', amount: cost,
          desc: teamName
            ? `Joined ${match.title} (Team: ${teamName})`
            : `Joined ${match.title}`,
          date: getTimeStr(0), status: 'completed'
        }, ...state.transactions],
      }
    }

    case 'SET_ROOM_CREDENTIALS': {
      const match = state.matches.find(m => m.id === action.payload.matchId)
      if (!match) return state

      // ═══ PHASE 1.5: Use minPlayers from match object instead of hardcoded 60% ═══
      const minRequired = match.minPlayers || Math.ceil(match.maxSlots * 0.6)
      if (match.joinedCount < minRequired) {
        return { ...state } // Silently block
      }
      // ═══ END PHASE 1.5 ═══

      return {
        ...state,
        matches: state.matches.map(m => m.id === action.payload.matchId
          ? { ...m, roomId: action.payload.roomId.trim(), roomPassword: action.payload.roomPassword.trim() }
          : m),
      }
    }

    // ════════════════════════════════════════
    //  PHASE 1.1+1.2: RESULT → PRIZE DISTRIBUTION
    // ════════════════════════════════════════
    case 'SUBMIT_RESULT': {
      const match = state.matches.find(m => m.id === action.payload.matchId)
      if (!match) return state

      const updatingMatches = state.matches.map(m =>
        m.id === action.payload.matchId ? { ...m, status: 'completing' } : m
      )

      return {
        ...state,
        matches: updatingMatches,
        pendingPrizeDistribution: {
          matchId: action.payload.matchId,
          matchData: { ...match },
          resultPlayers: action.payload.players,
          perKill: match.perKill || 0,
          method: action.payload.method,
          screenshotUrl: action.payload.screenshotUrl || null,
        },
        loading: true,
      }
    }

    case 'PRIZE_DISTRIBUTION_SUCCESS': {
      const { matchId, updatedMatch, totalDistributed, unclaimed } = action.payload
      const updatedMatches = state.matches.map(m =>
        m.id === matchId ? { ...m, ...updatedMatch, status: 'completed' } : m
      )
      return {
        ...state,
        matches: updatedMatches,
        loading: false,
        pendingPrizeDistribution: null,
      }
    }

    case 'PRIZE_DISTRIBUTION_ERROR': {
      return { ...state, loading: false, pendingPrizeDistribution: null }
    }

    // ════════════════════════════════════════
    //  PHASE 1.4: MATCH CANCELLATION + REFUND
    // ════════════════════════════════════════
    case 'CANCEL_MATCH': {
      // ═══ PHASE 1.4 FIX: Handle both string payload (from Admin.jsx) and object payload ═══
      const matchId = typeof action.payload === 'string' ? action.payload : action.payload.matchId
      const match = state.matches.find(m => m.id === matchId)
      if (!match) return state
      // ═══ END PHASE 1.4 FIX ═══

      const updatingMatches = state.matches.map(m =>
        m.id === matchId ? { ...m, status: 'cancelling' } : m
      )

      return {
        ...state,
        matches: updatingMatches,
        pendingCancelMatch: {
          matchId: matchId,
          matchData: { ...match },
          adminName: state.currentUser?.displayName || 'Admin',
        },
        loading: true,
      }
    }

    case 'CANCEL_MATCH_SUCCESS': {
      const { matchId, result } = action.payload
      const updatedMatches = state.matches.map(m =>
        m.id === matchId ? {
          ...m,
          status: 'cancelled',
          cancelledAt: result.refundedAt,
          refundCount: result.count,
          refundTotal: result.refunded,
          // ═══ PHASE 1.3: Update escrow refunded field ═══
          escrow: {
            ...(m.escrow || { collected: 0, refunded: 0, distributed: 0 }),
            refunded: result.refunded,
          },
          // ═══ END PHASE 1.3 ═══
        } : m
      )
      return { ...state, matches: updatedMatches, loading: false, pendingCancelMatch: null }
    }

    case 'CANCEL_MATCH_ERROR': {
      return { ...state, loading: false, pendingCancelMatch: null }
    }

    case 'BATCH_MATCH_UPDATE':
      return { ...state, matches: action.payload }

    // ════════════════════════════════════════
    //  WALLET — ADD MONEY (Pending Approval)
    // ════════════════════════════════════════
    case 'ADD_MONEY': {
      const { amount, method, txId } = action.payload
      const rateKey = `clutch_deposit_${state.currentUser?.id}`
      const lastDeposit = localStorage.getItem(rateKey)
      if (lastDeposit) {
        const elapsed = Date.now() - parseInt(lastDeposit)
        if (elapsed < 120000) {
          return { ...state, rateLimited: true }
        }
      }
      localStorage.setItem(rateKey, Date.now().toString())

      const requestId = 'amr_' + Date.now()

      const pendingTx = {
        id: requestId,
        type: 'add',
        amount: Number(amount),
        desc: `Add ৳${amount} via ${method} — TXID: ${txId} (Pending)`,
        date: getTimeStr(0),
        status: 'pending',
        userId: state.currentUser.id,
        username: state.currentUser.name || state.currentUser.displayName,
        method: method,
        txId: txId,
                senderNumber: action.payload.senderNumber || '',
      }

      const firestoreReq = {
        id: requestId,
        userId: state.currentUser.id,
        username: state.currentUser.name || state.currentUser.displayName,
        ign: state.currentUser.ign || '',
        phone: state.currentUser.phone || '',
        senderNumber: action.payload.senderNumber || '',
        amount: Number(amount),
        method: method,
        txId: txId,
        status: 'pending',
        createdAt: new Date().toISOString(),
      }
      createAddMoneyRequest(firestoreReq).catch(err => console.error("Failed to submit add money request:", err))

      return {
        ...state,
        transactions: [pendingTx, ...state.transactions],
        rateLimited: false,
      }
    }

    case 'CLEAR_RATE_LIMIT':
      return { ...state, rateLimited: false }
    case 'CLEAR_REQUIRE_IGN':
      return { ...state, requireIGN: false }
    case 'CLEAR_JOIN_BLOCKED':
      return { ...state, joinBlocked: null }

    // Admin approves add money request
    case 'APPROVE_ADD_MONEY': {
      const { requestId, userId, amount } = action.payload

      const updatedTx = state.transactions.map(tx =>
        tx.id === requestId ? { ...tx, status: 'completed', desc: tx.desc.replace('(Pending)', '(Approved)') } : tx
      )

      const updatedUsers = state.users.map(u =>
        u.id === userId ? { ...u, balance: u.balance + amount } : u
      )
      let updatedCurrentUser = state.currentUser
      if (updatedCurrentUser && updatedCurrentUser.id === userId) {
        updatedCurrentUser = { ...updatedCurrentUser, balance: updatedCurrentUser.balance + amount }
      }

      const updatedPending = state.pendingAddMoneyRequests.filter(r => r.id !== requestId)

      return {
        ...state,
        transactions: updatedTx,
        users: updatedUsers,
        currentUser: updatedCurrentUser,
        pendingAddMoneyRequests: updatedPending,
      }
    }

    // Admin rejects add money request
    case 'REJECT_ADD_MONEY': {
      const { requestId } = action.payload

      const updatedTx = state.transactions.map(tx =>
        tx.id === requestId ? { ...tx, status: 'rejected', desc: tx.desc.replace('(Pending)', '(Rejected)') } : tx
      )
      const updatedPending = state.pendingAddMoneyRequests.filter(r => r.id !== requestId)

      return {
        ...state,
        transactions: updatedTx,
        pendingAddMoneyRequests: updatedPending,
      }
    }

    // Load pending requests from Firestore (admin only)
    case 'LOAD_PENDING_REQUESTS':
      return { ...state, pendingAddMoneyRequests: action.payload }
          case 'LOAD_WITHDRAWALS':
      return { ...state, pendingWithdrawals: (action.payload || []).filter(w => w.status === 'pending') }
          case 'LOAD_TRANSACTIONS':
      return { ...state, transactions: action.payload }

    case 'WITHDRAW': {
      if (state.currentUser.balance < action.payload.amount) return state
      const wd = {
        id: 'w' + Date.now(),
        userId: state.currentUser.id,
        username: state.currentUser.name || state.currentUser.displayName,
        amount: action.payload.amount, method: action.payload.method, account: action.payload.account,
        createdAt: getTimeStr(0), status: 'pending',
      }
      addWithdrawalToCloud(wd).catch(err => console.error("Cloud withdraw sync failed:", err))
      addTransactionToCloud({ id: 'tx' + Date.now(), type: 'withdraw', amount: action.payload.amount, desc: `Withdrawal to ${action.payload.method}`, date: getTimeStr(0), status: 'pending', userId: state.currentUser.id, username: state.currentUser.name || state.currentUser.displayName, ign: state.currentUser.ign || '' }).catch(() => {})
      // Deduct balance in Firestore so subscribeToUser doesn't reset it
      updateUser(state.currentUser.id, { balance: state.currentUser.balance - action.payload.amount }).catch(err => console.error("Failed to deduct balance in Firestore:", err))
      return {
        ...state,
        currentUser: { ...state.currentUser, balance: state.currentUser.balance - action.payload.amount },
        transactions: [{
          id: 'tx' + Date.now(), type: 'withdraw', amount: action.payload.amount,
          desc: `Withdrawal to ${action.payload.method}`, date: getTimeStr(0), status: 'pending'
        }, ...state.transactions],
        pendingWithdrawals: [wd, ...state.pendingWithdrawals],
      }
    }

    case 'MARK_NOTIFICATIONS_READ':
      return { ...state, notifications: state.notifications.map(n => ({ ...n, read: true })) }
    case 'MARK_NOTIFICATION_READ':
      return { ...state, notifications: state.notifications.map(n => n.id === action.payload ? { ...n, read: true } : n) }

    case 'TOGGLE_BAN': {
      const userId = action.payload
      const user = state.users.find(u => u.id === userId)
      if (!user) return state
      const newBanned = !user.banned
      const newStatus = newBanned ? 'banned' : 'active'
      return {
        ...state,
        users: state.users.map(u =>
          u.id === userId ? { ...u, banned: newBanned, status: newStatus } : u
        ),
      }
    }

    case 'PROMOTE_TO_ADMIN': {
      const userId = action.payload
      return {
        ...state,
        users: state.users.map(u =>
          u.id === userId ? { ...u, role: 'admin', permissions: [] } : u
        ),
      }
    }

    case 'DEMOTE_TO_USER': {
      const userId = action.payload
      return {
        ...state,
        users: state.users.map(u =>
          u.id === userId ? { ...u, role: 'user', permissions: [] } : u
        ),
      }
    }

    case 'FORCE_PASSWORD_CHANGE': {
      const userId = action.payload
      return {
        ...state,
        users: state.users.map(u =>
          u.id === userId ? { ...u, forcePasswordChange: true } : u
        ),
      }
    }

    // ════════════════════════════════════════
    //  PHASE 1.9 + 1.10: ADJUST BALANCE
    // ════════════════════════════════════════
    case 'ADJUST_BALANCE': {
      const { userId, action: act, amount } = action.payload

      // 🔒 BLOCK: Admin cannot adjust own balance
      if (userId === state.currentUser?.id) {
        return { ...state }
      }

      return {
        ...state,
        pendingBalanceAdjust: { userId, action: act, amount, reason: action.payload.reason || 'Balance adjustment' },
        loading: true,
      }
    }

    case 'BALANCE_ADJUST_SUCCESS': {
      const { userId, newBalance } = action.payload
      const pending = state.pendingBalanceAdjust
      const updatedUsers = state.users.map(u =>
        u.id === userId ? { ...u, balance: newBalance } : u
      )
      const updatedCurrentUser = state.currentUser?.id === userId
        ? { ...state.currentUser, balance: newBalance }
        : state.currentUser

      // ═══ PHASE 1.10: Create a transaction record for this adjustment ═══
      const adjustTx = {
        id: 'tx_adj_' + Date.now(),
        type: pending?.action === 'add' ? 'adjust_add' : 'adjust_deduct',
        amount: pending?.amount || 0,
        desc: `Admin ${pending?.action === 'add' ? 'added' : 'deducted'} ${pending?.amount || 0} TK — ${pending?.reason || 'No reason'}`,
        date: getTimeStr(0),
        status: 'completed',
        userId: userId,
        adminId: state.currentUser?.id,
        adminName: state.currentUser?.displayName || state.currentUser?.name,
      }
      // ═══ END PHASE 1.10 ═══

      return {
        ...state,
        users: updatedUsers,
        currentUser: updatedCurrentUser,
        loading: false,
        pendingBalanceAdjust: null,
        // ═══ PHASE 1.10: Add transaction to history ═══
        transactions: [adjustTx, ...state.transactions],
        // ═══ END PHASE 1.10 ═══
      }
    }

    case 'BALANCE_ADJUST_ERROR': {
      return { ...state, loading: false, pendingBalanceAdjust: null }
    }

    case 'ASSIGN_PERMISSIONS': {
      const { userId, permissions } = action.payload
      return {
        ...state,
        users: state.users.map(u =>
          u.id === userId ? { ...u, permissions } : u
        ),
        currentUser: state.currentUser?.id === userId
          ? { ...state.currentUser, permissions }
          : state.currentUser,
      }
    }
    case 'APPROVE_WITHDRAW': {
      const wd = state.pendingWithdrawals.find(w => w.id === action.payload)
      if (wd) {
        approveWithdrawalInCloud(wd.id, wd.userId, wd.amount).catch(err =>
          console.error("Cloud approve failed:", err)
        )
      }
      return { ...state }
    }
    case 'REJECT_WITHDRAW': {
      const wd = state.pendingWithdrawals.find(w => w.id === action.payload)
      if (wd) {
        rejectWithdrawalInCloud(wd.id, wd.userId, wd.amount).catch(err =>
          console.error("Cloud reject failed:", err)
        )
      }
      return { ...state }
    }

    // ════════════════════════════════════════
    //  SETTINGS
    // ════════════════════════════════════════
    case 'LOAD_SETTINGS':
      return { ...state, adminPayments: action.payload }

    case 'SAVE_ADMIN_PAYMENTS':
      saveSettings(action.payload).catch(err => console.error('Settings cloud save failed:', err))
      return { ...state, adminPayments: { ...state.adminPayments, ...action.payload } }

    case 'UPDATE_ADMIN_PAYMENTS':
      saveSettings(action.payload).catch(err => console.error('Settings cloud save failed:', err))
      return { ...state, adminPayments: { ...state.adminPayments, ...action.payload } }

    case 'LOG_ACTION': {
      const entry = {
        id: 'log_' + Date.now(),
        adminId: state.currentUser?.id,
        adminName: state.currentUser?.displayName || state.currentUser?.name,
        adminRole: state.currentUser?.role,
        action: action.payload.action,
        target: action.payload.target || null,
        details: action.payload.details || null,
        createdAt: getTimeStr(0),
      }
            logActivityToCloud(entry).catch(err => console.error("Cloud log sync failed:", err))
      return {
        ...state,
        activityLog: [entry, ...state.activityLog].slice(0, 200),
      }
    }

    case 'SET_LANGUAGE':
      return { ...state, language: action.payload }

    case 'TOGGLE_RIGHT_PANEL':
      return { ...state, rightPanelOpen: !state.rightPanelOpen }
    case 'SHOW_MODAL':
      return { ...state, modal: action.payload }
    case 'CLOSE_MODAL':
      return { ...state, modal: null }
    case 'SET_LOADING':
      return { ...state, loading: action.payload }

    case 'SHOW_TOAST':
      return { ...state, toasts: [...state.toasts, action.payload] }
    case 'TOAST_REMOVING':
      return { ...state, toasts: state.toasts.map(t => t.id === action.payload ? { ...t, removing: true } : t) }
    case 'REMOVE_TOAST':
      return { ...state, toasts: state.toasts.filter(t => t.id !== action.payload) }
    case 'LOGIN':
      return { ...state, isLoggedIn: true, currentUser: action.payload, currentView: 'dashboard', loading: false, modal: null }
    default:
      return state
  }
}

// ===== PROVIDER =====
export function AppProvider({ children }) {
  const [state, dispatch] = useReducer(reducer, initialState)

  const isAdmin = state.currentUser?.role === 'admin' || state.currentUser?.role === 'owner'
  const isOwner = state.currentUser?.role === 'owner'

  const t = useCallback((key) => key, [state.language])

  // Firebase Auth Listener — Syncs with Firestore
  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, async (firebaseUser) => {
      if (firebaseUser) {
        let dbUser = await fetchUser(firebaseUser.uid)

        if (!dbUser) {
          const phone = firebaseUser.phoneNumber?.replace('+880', '0') || ''
          const newUser = {
            username: firebaseUser.displayName?.toLowerCase().replace(/\s+/g, '_') || 'user_' + firebaseUser.uid.slice(0, 8),
            name: firebaseUser.displayName || 'Firebase User',
            displayName: firebaseUser.displayName || 'Firebase User',
            ign: '',
            role: (phone === OWNER_PHONE || firebaseUser.email === OWNER_EMAIL) ? 'owner' : 'user',
            phone: phone,
            email: firebaseUser.email || '',
            firebaseUid: firebaseUser.uid,
          }
          await createUser(firebaseUser.uid, newUser)
          dbUser = newUser
        }

        dispatch({ type: 'FIREBASE_LOGIN', payload: { ...firebaseUser, dbData: dbUser } })
      }
    })
    return () => unsubscribe()
  }, [dispatch])

  // 🚀 PHASE 3.1: Real-time settings listener — fixes "Not set by admin" bug
  useEffect(() => {
    const unsubscribe = subscribeToSettings((settings) => {
      if (settings) {
        dispatch({ type: 'LOAD_SETTINGS', payload: settings })
      }
    })
    return () => unsubscribe()
  }, [])
    // 🚀 PHASE 3.4: Real-time user listener — instant balance update after admin approval
  useEffect(() => {
    const uid = state.currentUser?.firebaseUid
    if (!uid) return
    const unsubscribe = subscribeToUser(uid, (data) => {
      dispatch({ type: 'FIREBASE_USER_UPDATE', payload: data })
    })
    return () => unsubscribe()
  }, [state.currentUser?.firebaseUid])

  // 🚀 Load pending add money requests (admin/owner only)
  useEffect(() => {
    if (!isAdmin) return
    async function loadPending() {
      try {
        const requests = await fetchPendingAddMoneyRequests()
        dispatch({ type: 'LOAD_PENDING_REQUESTS', payload: requests })
      } catch (err) {
        console.error("Failed to load pending add money requests:", err)
      }
    }
    loadPending()
    const interval = setInterval(loadPending, 5000)
    return () => clearInterval(interval)
  }, [isAdmin])

  // 🚀 REAL-TIME: Withdrawal requests — instant sync to admin panel
  useEffect(() => {
    if (!isAdmin) return
    const unsubscribe = subscribeToWithdrawals((withdrawals) => {
      dispatch({ type: 'LOAD_WITHDRAWALS', payload: withdrawals })
    })
    return () => unsubscribe()
  }, [isAdmin])
    // 🚀 REAL-TIME: User transaction history — instant sync to wallet
  useEffect(() => {
    const uid = state.currentUser?.firebaseUid
    if (!uid) return
    const unsubscribe = subscribeToUserTransactions(uid, (txs) => {
      dispatch({ type: 'LOAD_TRANSACTIONS', payload: txs })
    })
    return () => unsubscribe()
  }, [state.currentUser?.firebaseUid])

  // 🚀 PHASE 2.7: Real-time match listener
  useEffect(() => {
    const unsubscribe = subscribeToMatches((cloudMatches) => {
      dispatch({ type: 'BATCH_MATCH_UPDATE', payload: cloudMatches })
    })
    return () => unsubscribe()
  }, [])

  // ══════════════════════════════════════════
  //  PHASE 1: ASYNC OPERATIONS
  // ══════════════════════════════════════════
  useEffect(() => {
    if (!state.pendingPrizeDistribution) return
    const { matchId, matchData, resultPlayers, perKill, method, screenshotUrl } = state.pendingPrizeDistribution

    distributePrizes(matchId, matchData, resultPlayers, perKill)
      .then(result => {
        const updatedMatch = {
          ...matchData,
          status: 'completed',
          result: {
            submittedAt: new Date().toISOString(),
            method: method,
            screenshotUrl: screenshotUrl,
            players: resultPlayers,
          },
        }
        dispatch({ type: 'PRIZE_DISTRIBUTION_SUCCESS', payload: { matchId, updatedMatch, ...result } })
      })
      .catch(err => {
        console.error("Prize distribution failed:", err)
        dispatch({ type: 'PRIZE_DISTRIBUTION_ERROR', payload: { matchId } })
        dispatch({ type: 'BATCH_MATCH_UPDATE', payload: state.matches.map(m => m.id === matchId ? { ...m, status: 'live' } : m) })
      })
  }, [state.pendingPrizeDistribution])

  useEffect(() => {
    if (!state.pendingCancelMatch) return
    const { matchId, matchData, adminName } = state.pendingCancelMatch

    cancelMatchAndRefund(matchId, matchData, adminName)
      .then(result => {
        const updatedMatch = {
          ...matchData,
          status: 'cancelled',
          cancelledAt: result.refundedAt,
          refundCount: result.count,
          refundTotal: result.refunded,
        }
        dispatch({ type: 'CANCEL_MATCH_SUCCESS', payload: { matchId, updatedMatch, result } })
      })
      .catch(err => {
        console.error("Cancel match failed:", err)
        dispatch({ type: 'CANCEL_MATCH_ERROR', payload: { matchId } })
      })
  }, [state.pendingCancelMatch])

  useEffect(() => {
    if (!state.pendingBalanceAdjust) return
    const { userId, action, amount, reason } = state.pendingBalanceAdjust

    adminAdjustBalance(userId, amount, reason)
      .then(newBalance => {
        dispatch({ type: 'BALANCE_ADJUST_SUCCESS', payload: { userId, newBalance } })
      })
      .catch(err => {
        console.error("Balance adjust failed:", err)
        dispatch({ type: 'BALANCE_ADJUST_ERROR', payload: { userId } })
      })
  }, [state.pendingBalanceAdjust])
  // ═══ PHASE 4.5: Show toast when join is blocked ═══
  useEffect(() => {
    if (state.joinBlocked) {
      showToast(dispatch, state.joinBlocked, 'error')
      dispatch({ type: 'CLEAR_JOIN_BLOCKED' })
    }
  }, [state.joinBlocked])
  // ═══ END PHASE 4.5 ═══

  // 1-second tick
  // 1-second tick
  useEffect(() => {
    const i = setInterval(() => dispatch({ type: 'TICK' }), 1000)
    return () => clearInterval(i)
  }, [])

  // Hash routing
  useEffect(() => {
    const h = () => {
      const { view, param } = parseHash()
      if ((view === 'login' || view === 'admin-login') && saved?.isLoggedIn) return
      dispatch({ type: 'NAVIGATE', payload: { view, param } })
    }
    const { view, param } = parseHash()
    if ((view === 'login' || view === 'admin-login') && saved?.isLoggedIn) {
      // skip
    } else {
      dispatch({ type: 'NAVIGATE', payload: { view, param } })
    }
    window.addEventListener('hashchange', h)
    return () => window.removeEventListener('hashchange', h)
  }, [])

  // Sync hash after login/logout
  useEffect(() => {
    const expected = state.currentView + (state.viewParam ? '/' + state.viewParam : '')
    if (window.location.hash.slice(1) !== expected) {
      window.location.hash = expected
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [state.isLoggedIn])

  // Persist to localStorage — ONLY auth state, NOT balance/data
  useEffect(() => {
    saveToLS({
      isLoggedIn: state.isLoggedIn,
      currentUser: state.isLoggedIn ? { id: state.currentUser?.id, firebaseUid: state.currentUser?.firebaseUid } : null,
      language: state.language,
    })
  }, [state.isLoggedIn, state.currentUser?.id, state.currentUser?.firebaseUid, state.language])
  // Auto phase detection
  useEffect(() => {
    const now = Date.now()
    let changed = false
    const updated = state.matches.map(m => {
      if (!m.startTime) return m
      const start = new Date(m.startTime.replace(' ', 'T')).getTime()
      if (isNaN(start)) return m
      // 🔒 Guard: Don't auto-change cancelled, completing, or cancelling matches
      if (m.status === 'cancelled' || m.status === 'completing' || m.status === 'cancelling') return m
      const duration = m.gameType === 'CS' ? 15 * 60000 : 25 * 60000
      let newStatus = m.status
      if (m.status === 'upcoming' && now >= start) newStatus = 'live'
      if (m.status === 'live' && now >= start + duration) newStatus = 'completed'
      if (newStatus !== m.status) {
        changed = true
        return { ...m, status: newStatus }
      }
      return m
    })
    if (changed) {
      dispatch({ type: 'BATCH_MATCH_UPDATE', payload: updated })
    }
  }, [state.now])

  // Auto-dismiss toasts
  const toastTimers = useRef({})

  useEffect(() => {
    state.toasts.forEach(toast => {
      if (toast.removing) return
      if (toastTimers.current[toast.id]) return
      toastTimers.current[toast.id] = true
      setTimeout(() => {
        dispatch({ type: 'TOAST_REMOVING', payload: toast.id })
      }, 2500)
      setTimeout(() => {
        dispatch({ type: 'REMOVE_TOAST', payload: toast.id })
        delete toastTimers.current[toast.id]
      }, 3000)
    })
  }, [state.toasts])

  const navigate = useCallback((path) => { window.location.hash = path }, [])

  return (
    <AppContext.Provider value={{ state, dispatch, navigate, isAdmin, isOwner, t }}>
      {children}
    </AppContext.Provider>
  )
}

export function useApp() {
  const ctx = useContext(AppContext)
  if (!ctx) throw new Error('useApp must be used within AppProvider')
  return ctx
}

export function useTick() {
  const { dispatch } = useApp()
  useEffect(() => {
    const interval = setInterval(() => {
      dispatch({ type: 'TICK' })
    }, 1000)
    return () => clearInterval(interval)
  }, [dispatch])
}