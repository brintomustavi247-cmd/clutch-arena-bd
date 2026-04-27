import { fetchUser, createUser, createMatchInDb, updateMatchInDb, getSettings, saveSettings, createAddMoneyRequest, fetchPendingAddMoneyRequests, approveAddMoneyRequest, rejectAddMoneyRequest, distributePrizes, cancelMatchAndRefund, checkDuplicateTXID, adminAdjustBalance, addJoinToMatch, addWithdrawalToCloud, logActivityToCloud, addTransactionToCloud, subscribeToMatches, subscribeToSettings } from './db'
import { createContext, useContext, useReducer, useEffect, useCallback, useRef } from 'react'
import { calculateMatchEconomics, calculateJoinCost } from './utils'
import { auth } from './firebase'
import { onAuthStateChanged } from 'firebase/auth'
const AppContext = createContext(null)

const LS_KEY = 'clutch_arena_bd'
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

// ===== USER DATABASE — with phone, email, teamName =====
const INITIAL_USERS = [
  { id:'u1', username:'player1', password:'1234', role:'user', name:'ShadowKiller', ign:'SK•DRAGON', displayName:'ShadowKiller', avatar:null, balance:1250, kills:342, wins:28, matchesPlayed:95, earnings:8750, online:true, banned:false, status:'active', forcePasswordChange:false, phone:'01700000001', email:'shadow@clutcharena.bd', teamName:'', createdAt:'2025-10-15 10:00' },
  { id:'u2', username:'player2', password:'1234', role:'user', name:'DragonBlaze', ign:'DB•FIRE', displayName:'DragonBlaze', avatar:null, balance:890, kills:278, wins:22, matchesPlayed:80, earnings:6200, online:true, banned:false, status:'active', forcePasswordChange:false, phone:'01800000002', email:'dragon@clutcharena.bd', teamName:'', createdAt:'2025-10-20 14:00' },
  { id:'u3', username:'player3', password:'1234', role:'user', name:'NightFuryBD', ign:'NF•STORM', displayName:'NightFuryBD', avatar:null, balance:2100, kills:456, wins:22, matchesPlayed:110, earnings:12300, online:true, banned:false, status:'active', forcePasswordChange:false, phone:'01900000003', email:'nightfury@clutcharena.bd', teamName:'', createdAt:'2025-11-01 09:00' },
  { id:'u4', username:'player4', password:'1234', role:'user', name:'StormBreaker', ign:'SB•THUNDER', displayName:'StormBreaker', avatar:null, balance:340, kills:89, wins:8, matchesPlayed:30, earnings:1800, online:false, banned:false, status:'active', forcePasswordChange:false, phone:'01600000004', email:'storm@clutcharena.bd', teamName:'', createdAt:'2025-11-05 18:00' },
  { id:'u5', username:'player5', password:'1234', role:'user', name:'PhantomX', ign:'PX•GHOST', displayName:'PhantomX', avatar:null, balance:4500, kills:612, wins:48, matchesPlayed:150, earnings:22400, online:true, banned:false, status:'active', forcePasswordChange:false, phone:'01500000005', email:'phantom@clutcharena.bd', teamName:'', createdAt:'2025-10-10 08:00' },
  { id:'u6', username:'player6', password:'1234', role:'user', name:'SilentWolf', ign:'SW•HUNT', displayName:'SilentWolf', avatar:null, balance:120, kills:45, wins:3, matchesPlayed:15, earnings:500, online:false, banned:false, status:'active', forcePasswordChange:false, phone:'01400000006', email:'silent@clutcharena.bd', teamName:'', createdAt:'2025-11-10 12:00' },
  { id:'u7', username:'player7', password:'1234', role:'user', name:'BlazeKing', ign:'BK•FLAME', displayName:'BlazeKing', avatar:null, balance:780, kills:198, wins:15, matchesPlayed:55, earnings:4200, online:true, banned:false, status:'active', forcePasswordChange:false, phone:'01300000007', email:'blaze@clutcharena.bd', teamName:'', createdAt:'2025-10-25 16:00' },
  { id:'u8', username:'player8', password:'1234', role:'user', name:'IceBreaker', ign:'IB•FROST', displayName:'IceBreaker', avatar:null, balance:3200, kills:534, wins:42, matchesPlayed:130, earnings:18700, online:false, banned:false, status:'active', forcePasswordChange:false, phone:'01700000008', email:'ice@clutcharena.bd', teamName:'', createdAt:'2025-10-12 11:00' },
  { id:'u9', username:'banned_user', password:'1234', role:'user', name:'DarkViper', ign:'DV•VENOM', displayName:'DarkViper', avatar:null, balance:560, kills:167, wins:12, matchesPlayed:45, earnings:2900, online:true, banned:true, status:'banned', forcePasswordChange:false, phone:'01800000009', email:'viper@clutcharena.bd', teamName:'', createdAt:'2025-11-02 20:00' },
  { id:'u10', username:'player10', password:'1234', role:'user', name:'TurboRider', ign:'TR•SPEED', displayName:'TurboRider', avatar:null, balance:1900, kills:389, wins:31, matchesPlayed:100, earnings:10500, online:true, banned:false, status:'active', forcePasswordChange:false, phone:'01900000010', email:'turbo@clutcharena.bd', teamName:'', createdAt:'2025-10-18 07:00' },
  // ── Admin accounts ──
  { id:'admin1', username:'admin1', password:'admin123', role:'admin', name:'Admin Rahim', displayName:'Admin Rahim', avatar:null, balance:50000, kills:0, wins:0, matchesPlayed:0, earnings:0, online:true, banned:false, status:'active', forcePasswordChange:false, phone:'01700000011', email:'admin@clutcharena.bd', teamName:'', createdAt:'2025-10-01 08:00', permissions:['matches','rooms','results','users','finance','payments'] },
  { id:'admin2', username:'admin2', password:'admin456', role:'admin', name:'Admin Karim', displayName:'Admin Karim', avatar:null, balance:30000, kills:0, wins:0, matchesPlayed:0, earnings:0, online:false, banned:false, status:'active', forcePasswordChange:false, phone:'01800000012', email:'admin2@clutcharena.bd', teamName:'', createdAt:'2025-10-05 09:00', permissions:[] },
  // ── Owner account ──
  { id:'owner1', username:'owner', password:'owner123', role:'owner', name:'Owner', displayName:'Owner', avatar:null, balance:999999, kills:0, wins:0, matchesPlayed:0, earnings:0, online:true, banned:false, status:'active', forcePasswordChange:false, phone:'01900000000', email:'owner@clutcharena.bd', teamName:'', createdAt:'2025-09-01 08:00' },
]

// ===== MOCK MATCHES — with team names in results =====
const INITIAL_MATCHES = [
  { id:'m1', title:'Bermuda Rush Solo', mode:'Solo', map:'Bermuda', gameType:'BR', entryFee:30, maxSlots:50, joinedCount:50, perKill:10, include4th:true, include5th:true, startTime:getTimeStr(-300000), roomId:'BRS15050A', roomPassword:'br2025x', status:'live', result:null, createdAt:getTimeStr(-86400000), participants:[], image:'https://images.unsplash.com/photo-1542751371-adc38448a05e?w=800&q=80' },
  { id:'m5', title:'Purgatory Night Squad', mode:'Squad', map:'Purgatory', gameType:'BR', entryFee:150, maxSlots:12, joinedCount:12, perKill:20, include4th:true, include5th:true, startTime:getTimeStr(-600000), roomId:'PNS12150P', roomPassword:'squad25', status:'live', result:null, createdAt:getTimeStr(-43200000), participants:[], image:'https://images.unsplash.com/photo-1511512578047-dfb367046420?w=800&q=80' },
  { id:'m2', title:'Purgatory Duo Clash', mode:'Duo', map:'Purgatory', gameType:'BR', entryFee:40, maxSlots:25, joinedCount:18, perKill:15, include4th:false, include5th:false, startTime:getTimeStr(1500000), roomId:'', roomPassword:'', status:'upcoming', result:null, createdAt:getTimeStr(-7200000), participants:[], image:'https://images.unsplash.com/photo-1542751371-adc38448a05e?w=800&q=80' },
  { id:'m3', title:'Kalahari Clash 4v4', mode:'Clash Squad', map:'Kalahari', gameType:'CS', entryFee:50, maxSlots:12, joinedCount:8, perKill:0, include4th:false, include5th:false, startTime:getTimeStr(5400000), roomId:'', roomPassword:'', status:'upcoming', result:null, createdAt:getTimeStr(-3600000), participants:[], image:'https://images.unsplash.com/photo-1542751371-adc38448a05e?w=800&q=80' },
  { id:'m4', title:'Alpine Squad Showdown', mode:'Squad', map:'Alpine', gameType:'BR', entryFee:150, maxSlots:12, joinedCount:5, perKill:20, include4th:true, include5th:true, startTime:getTimeStr(10800000), roomId:'', roomPassword:'', status:'upcoming', result:null, createdAt:getTimeStr(-1800000), participants:[], image:'https://images.unsplash.com/photo-1542751371-adc38448a05e?w=800&q=80' },
  { id:'m7', title:'Bermuda Dawn Solo', mode:'Solo', map:'Bermuda', gameType:'BR', entryFee:15, maxSlots:50, joinedCount:32, perKill:5, include4th:false, include5th:false, startTime:getTimeStr(2700000), roomId:'', roomPassword:'', status:'upcoming', result:null, createdAt:getTimeStr(-900000), participants:[], image:'https://images.unsplash.com/photo-1542751371-adc38448a05e?w=800&q=80' },
  { id:'m6', title:'Bermuda Classic Solo', mode:'Solo', map:'Bermuda', gameType:'BR', entryFee:20, maxSlots:50, joinedCount:50, perKill:10, include4th:true, include5th:false, startTime:getTimeStr(-10800000), roomId:'BCS20500Z', roomPassword:'classic1', status:'completed', result:{ submittedAt:getTimeStr(-9000000), method:'manual', screenshotUrl:null, players:[ { position:1, ign:'DragonBlaze', kills:8, prize:150 }, { position:2, ign:'ShadowKiller', kills:6, prize:80 }, { position:3, ign:'NightFuryBD', kills:5, prize:50 }, { position:4, ign:'StormBreaker', kills:4, prize:30 }, ] }, createdAt:getTimeStr(-86400000), participants:[], image:'https://images.unsplash.com/photo-1542751371-adc38448a05e?w=800&q=80' },
  { id:'m10', title:'Purgatory Clash Arena', mode:'Clash Squad', map:'Purgatory', gameType:'CS', entryFee:100, maxSlots:12, joinedCount:12, perKill:0, include4th:false, include5th:false, startTime:getTimeStr(-30000000), roomId:'PCA12100P', roomPassword:'clash99', status:'completed', result:{ submittedAt:getTimeStr(-27000000), method:'screenshot', screenshotUrl:null, players:[ { position:1, ign:'Alpha Squad', teamName:'Alpha Squad', kills:18, points:42, prize:600 }, { position:2, ign:'Beta Warriors', teamName:'Beta Warriors', kills:12, points:30, prize:360 }, ] }, createdAt:getTimeStr(-172800000), participants:[], image:'https://images.unsplash.com/photo-1542751371-adc38448a05e?w=800&q=80' },
  { id:'m11', title:'Kalahari Duo Night', mode:'Duo', map:'Kalahari', gameType:'BR', entryFee:80, maxSlots:25, joinedCount:25, perKill:15, include4th:false, include5th:false, startTime:getTimeStr(-25200000), roomId:'KDN25080K', roomPassword:'dn2025', status:'completed', result:{ submittedAt:getTimeStr(-23400000), method:'manual', screenshotUrl:null, players:[ { position:1, ign:'PhantomX', teamName:'Ghost Riders', kills:9, points:25, prize:500 }, { position:2, ign:'ShadowKiller', teamName:'Dragon Duo', kills:7, points:19, prize:300 }, { position:3, ign:'BlazeKing', teamName:'Fire Hawks', kills:5, points:15, prize:180 }, ] }, createdAt:getTimeStr(-259200000), participants:[], image:'https://images.unsplash.com/photo-1542751371-adc38448a05e?w=800&q=80' },
]

const INITIAL_NOTIFICATIONS = [
  { id:'n1', type:'room', text:'Room ID & Password unlocked for Bermuda Rush Solo — Check now!', time:getTimeStr(-1800000), read:false },
  { id:'n2', type:'result', text:'Results out for Bermuda Classic Solo — You earned 150 TK!', time:getTimeStr(-3600000), read:false },
  { id:'n3', type:'match', text:'Purgatory Duo Clash starts in 25 minutes. Get ready!', time:getTimeStr(-3600000), read:false },
  { id:'n4', type:'wallet', text:'Withdrawal of 500 TK approved via bKash.', time:getTimeStr(-600000), read:true },
  { id:'n5', type:'system', text:'Platform maintenance scheduled for tonight 2:00 AM.', time:getTimeStr(-86400000), read:true },
  { id:'n6', type:'match', text:'Kalahari Clash 4v4 registration is now open!', time:getTimeStr(-1200000), read:true },
]

const INITIAL_TRANSACTIONS = [
  { id:'tx1', type:'add', amount:200, desc:'Added via bKash', date:getTimeStr(-30), status:'completed' },
  { id:'tx2', type:'join', amount:30, desc:'Joined Bermuda Rush Solo', date:getTimeStr(-60), status:'completed' },
  { id:'tx3', type:'win', amount:150, desc:'Prize: Bermuda Classic Solo (2nd Place)', date:getTimeStr(-180), status:'completed' },
  { id:'tx4', type:'join', amount:80, desc:'Joined Purgatory Night Duo (Team: Ghost Riders)', date:getTimeStr(-240), status:'completed' },
  { id:'tx5', type:'add', amount:500, desc:'Added via Nagad', date:getTimeStr(-500), status:'completed' },
  { id:'tx6', type:'withdraw', amount:500, desc:'Withdrawn to bKash', date:getTimeStr(-600), status:'completed' },
  { id:'tx7', type:'withdraw', amount:200, desc:'Withdrawn to Nagad (Pending)', date:getTimeStr(-700), status:'pending' },
]

const INITIAL_STANDINGS = [
  { teamName:'A4x', played:3, wins:2, kills:28, points:38 },
  { teamName:'CN ESPORTS', played:3, wins:1, kills:25, points:30 },
  { teamName:'NXT Official', played:3, wins:1, kills:22, points:27 },
  { teamName:'TFG Legends', played:3, wins:1, kills:19, points:24 },
  { teamName:'Phoenix BD', played:3, wins:0, kills:20, points:22 },
  { teamName:'Shadow Killers', played:3, wins:0, kills:16, points:18 },
  { teamName:'Dark Falcons', played:3, wins:0, kills:14, points:15 },
  { teamName:'Venom Squad', played:3, wins:0, kills:11, points:12 },
  { teamName:'Ice Breakers', played:3, wins:0, kills:8, points:8 },
  { teamName:'Rising Stars', played:3, wins:0, kills:5, points:5 },
]

const INITIAL_ADMIN_PAYMENTS = {
  bKash: '',
  Nagad: '',
  Rocket: '',
}

const INITIAL_PENDING_WITHDRAWALS = [
  { id:'w1', userId:'u4', username:'StormBreaker', amount:200, method:'Nagad', account:'01600000004', createdAt:getTimeStr(-3600000), status:'pending' },
  { id:'w2', userId:'u6', username:'SilentWolf', amount:100, method:'bKash', account:'01400000006', createdAt:getTimeStr(-7200000), status:'pending' },
]

function parseHash() {
  const hash = window.location.hash.slice(1) || 'login'
  const parts = hash.split('/')
  return { view: parts[0], param: parts[1] || null }
}

const saved = loadFromLS()

const initialState = {
  isLoggedIn: saved?.isLoggedIn || false,
  currentUser: saved?.currentUser || null,
  users: saved?.users || INITIAL_USERS,
  matches: saved?.matches || INITIAL_MATCHES,
  notifications: saved?.notifications || INITIAL_NOTIFICATIONS,
  transactions: saved?.transactions || INITIAL_TRANSACTIONS,
  standings: saved?.standings || INITIAL_STANDINGS,
  adminPayments: saved?.adminPayments || INITIAL_ADMIN_PAYMENTS,
  pendingWithdrawals: saved?.pendingWithdrawals || INITIAL_PENDING_WITHDRAWALS,
  pendingAddMoneyRequests: [],
  activityLog: saved?.activityLog || [],
  currentView: (saved?.isLoggedIn && saved?.currentUser) ? (saved.currentUser.role === 'owner' ? 'admin-overview' : 'dashboard') : 'login',
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
          balance: dbData?.balance ?? state.currentUser?.balance ?? 0,
          kills: dbData?.kills ?? state.currentUser?.kills ?? 0,
          wins: dbData?.wins ?? state.currentUser?.wins ?? 0,
          matchesPlayed: dbData?.matchesPlayed ?? state.currentUser?.matchesPlayed ?? 0,
          earnings: dbData?.earnings ?? state.currentUser?.earnings ?? 0,
          banned: dbData?.banned || false,
          status: dbData?.status || 'active',
          permissions: dbData?.permissions || state.currentUser?.permissions || [],
          teamName: dbData?.teamName || state.currentUser?.teamName || '',
          createdAt: dbData?.createdAt || state.currentUser?.createdAt || new Date().toISOString()
        },
        currentView: state.isLoggedIn ? state.currentView : (role === 'owner' ? 'admin-overview' : 'dashboard'),
        loading: false,
        modal: null,
      }
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

    case 'APPROVE_WITHDRAW':
      return {
        ...state,
        pendingWithdrawals: state.pendingWithdrawals.filter(w => w.id !== action.payload),
        transactions: state.transactions.map(tx =>
          tx.id === action.payload ? { ...tx, status: 'completed' } : tx
        ),
      }
    case 'REJECT_WITHDRAW':
      return {
        ...state,
        pendingWithdrawals: state.pendingWithdrawals.filter(w => w.id !== action.payload),
        transactions: state.transactions.map(tx =>
          tx.id === action.payload ? { ...tx, status: 'rejected', desc: tx.desc + ' (Rejected)' } : tx
        ),
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

  // Persist to localStorage
  useEffect(() => {
       saveToLS({
      isLoggedIn: state.isLoggedIn,
      currentUser: state.currentUser,
      language: state.language,
    })
 }, [state.isLoggedIn, state.currentUser, state.language])
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