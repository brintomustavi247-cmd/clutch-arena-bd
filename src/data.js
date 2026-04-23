// ============================
// 🔥 CLUTCH ARENA BD — MOCK DATA & CONFIGURATION v2.0
// ============================

// ===== FREE FIRE CONSTANTS =====
export const FF_MAPS = ['Bermuda', 'Purgatory', 'Kalahari', 'Alpine']

export const FF_MODES = [
  { value: 'Solo', label: 'Solo', playersNeeded: 1, maxSlots: 50 },
  { value: 'Duo', label: 'Duo', playersNeeded: 2, maxSlots: 25 },
  { value: 'Squad', label: 'Squad', playersNeeded: 4, maxSlots: 12 },
  { value: 'Clash Squad', label: 'Clash Squad (4v4)', playersNeeded: 4, maxSlots: 12 },
]

export const FF_GAME_TYPES = [
  { value: 'BR', label: 'Battle Royale (Free Fire)', modes: ['Solo', 'Duo', 'Squad'] },
  { value: 'CS', label: 'Clash Squad (4v4)', modes: ['Clash Squad'] },
]

// Per kill reward options
export const KILL_REWARDS = [0, 5, 10, 15, 20]

// ===== MATCH RULES (FF Themed — shown on match detail) =====
export const MATCH_RULES = [
  '🎮  Tournament is hosted via Free Fire Custom Room.',
  '🔑  Room ID & Password will be visible exactly 10 minutes before match start.',
  '⚠️  Join the room within 5 minutes after it appears. Late join = No entry.',
  '🎯  Use your EXACT registered in-game name. Wrong name = Disqualified.',
  '🚫  No teaming, hacking, or exploiting. Instant ban if caught.',
  '📱  Screenshot of result screen is mandatory for prize claims.',
  '⏱️  If server crashes, match will be rescheduled (no refund).',
  '💬  For any issue, contact admin via in-app notification — not in-game.',
  '🏆  Prize will be credited to your wallet within 30 minutes after result.',
  '📋  Admin decision is final in all disputes.',
]

// ===== NAVIGATION =====
export const NAV_ITEMS = [
  { id: 'dashboard', icon: 'fa-solid fa-gamepad', label: 'Dashboard' },
  { id: 'matches', icon: 'fa-solid fa-trophy', label: 'Matches' },
  { id: 'wallet', icon: 'fa-solid fa-wallet', label: 'Wallet' },
  { id: 'leaderboard', icon: 'fa-solid fa-ranking-star', label: 'Leaderboard' },
  { id: 'notifications', icon: 'fa-solid fa-bell', label: 'Notifications', badge: true },
  { id: 'profile', icon: 'fa-solid fa-user', label: 'Profile' },
  { id: 'settings', icon: 'fa-solid fa-gear', label: 'Settings' },
]

export const ADMIN_ITEMS = [
  { id: 'admin-overview', icon: 'fa-solid fa-chart-pie', label: 'Overview' },
  { id: 'admin-create', icon: 'fa-solid fa-circle-plus', label: 'Create Match' },
  { id: 'admin-rooms', icon: 'fa-solid fa-key', label: 'Rooms' },
  { id: 'admin-results', icon: 'fa-solid fa-clipboard-check', label: 'Results' },
  { id: 'admin-users', icon: 'fa-solid fa-users-gear', label: 'Users' },
  { id: 'admin-finance', icon: 'fa-solid fa-money-bill-transfer', label: 'Finance' },
]

export const MOBILE_ITEMS = [
  { id: 'dashboard', icon: 'fa-solid fa-gamepad', label: 'Home' },
  { id: 'matches', icon: 'fa-solid fa-trophy', label: 'Matches' },
  { id: 'wallet', icon: 'fa-solid fa-wallet', label: 'Wallet' },
  { id: 'leaderboard', icon: 'fa-solid fa-ranking-star', label: 'Rank' },
  { id: 'notifications', icon: 'fa-solid fa-bell', label: 'Alerts' },
]


// ===== MOCK USER =====
export const MOCK_USER = {
  id: 'u1',
  username: 'ShadowKiller',
  uid: '1234567890',
  avatar: null,
  email: 'shadow@clutcharena.bd',
  phone: '017XXXXXXXX',
  role: 'user', // 'user' | 'admin'
  wallet: 1250,
  totalMatches: 47,
  totalWins: 8,
  totalKills: 312,
  joinedMatches: ['m2', 'm5'],
  createdAt: '2025-10-15 10:00',
}

export const MOCK_ADMIN = {
  id: 'admin1',
  username: 'ClutchAdmin',
  uid: '0000000001',
  avatar: null,
  email: 'admin@clutcharena.bd',
  phone: '018XXXXXXXX',
  role: 'admin',
  wallet: 999999,
  totalMatches: 0,
  totalWins: 0,
  totalKills: 0,
  joinedMatches: [],
  createdAt: '2025-10-01 00:00',
}


// ===== MOCK MATCHES =====
function futureDate(minutesFromNow) {
  const d = new Date(Date.now() + minutesFromNow * 60000)
  return d.toISOString().slice(0, 16).replace('T', ' ')
}

export const MOCK_MATCHES = [
  // LIVE match — room visible (starts 5 min ago)
  {
    id: 'm1',
    title: 'Bermuda Rush Solo',
    gameType: 'BR',
    mode: 'Solo',
    map: 'Bermuda',
    entryFee: 30,
    maxSlots: 50,
    joinedCount: 50,
    perKill: 10,
    include4th: true,
    include5th: true,
    startTime: futureDate(-5), // started 5 min ago → room visible
    roomId: 'BRM15050A',
    roomPassword: 'br2025x',
    status: 'live',
    result: null,
    createdAt: '2025-01-10 08:00',
  },
  // UPCOMING — room NOT visible yet (starts 25 min from now)
  {
    id: 'm2',
    title: 'Purgatory Night Duo',
    gameType: 'BR',
    mode: 'Duo',
    map: 'Purgatory',
    entryFee: 40,
    maxSlots: 25,
    joinedCount: 18,
    perKill: 15,
    include4th: false,
    include5th: false,
    startTime: futureDate(25),
    roomId: '',
    roomPassword: '',
    status: 'upcoming',
    result: null,
    createdAt: '2025-01-11 14:00',
  },
  // UPCOMING — Clash Squad
  {
    id: 'm3',
    title: 'Kalahari Clash 4v4',
    gameType: 'CS',
    mode: 'Clash Squad',
    map: 'Kalahari',
    entryFee: 50,
    maxSlots: 12,
    joinedCount: 8,
    perKill: 0,
    include4th: false,
    include5th: false,
    startTime: futureDate(90),
    roomId: '',
    roomPassword: '',
    status: 'upcoming',
    result: null,
    createdAt: '2025-01-12 09:00',
  },
  // UPCOMING — Squad
  {
    id: 'm4',
    title: 'Alpine Squad Showdown',
    gameType: 'BR',
    mode: 'Squad',
    map: 'Alpine',
    entryFee: 150,
    maxSlots: 12,
    joinedCount: 5,
    perKill: 20,
    include4th: true,
    include5th: true,
    startTime: futureDate(180),
    roomId: '',
    roomPassword: '',
    status: 'upcoming',
    result: null,
    createdAt: '2025-01-12 12:00',
  },
  // COMPLETED — with result
  {
    id: 'm5',
    title: 'Bermuda Classic Solo',
    gameType: 'BR',
    mode: 'Solo',
    map: 'Bermuda',
    entryFee: 20,
    maxSlots: 50,
    joinedCount: 50,
    perKill: 10,
    include4th: true,
    include5th: false,
    startTime: futureDate(-180),
    roomId: 'BCS20500Z',
    roomPassword: 'classic1',
    status: 'completed',
    result: {
      submittedAt: futureDate(-150),
      method: 'manual', // 'manual' | 'screenshot'
      screenshotUrl: null,
      players: [
        { position: 1, ign: 'DragonBlaze', kills: 8 },
        { position: 2, ign: 'ShadowKiller', kills: 6 },
        { position: 3, ign: 'NightFuryBD', kills: 5 },
        { position: 4, ign: 'StormBreaker', kills: 4 },
      ],
    },
    createdAt: '2025-01-09 06:00',
  },
  // COMPLETED — Clash Squad with result
  {
    id: 'm6',
    title: 'Purgatory Clash Arena',
    gameType: 'CS',
    mode: 'Clash Squad',
    map: 'Purgatory',
    entryFee: 100,
    maxSlots: 12,
    joinedCount: 12,
    perKill: 0,
    include4th: false,
    include5th: false,
    startTime: futureDate(-300),
    roomId: 'PCA12100P',
    roomPassword: 'clash99',
    status: 'completed',
    result: {
      submittedAt: futureDate(-270),
      method: 'screenshot',
      screenshotUrl: '/mock-ss.jpg',
      players: [
        { position: 1, ign: 'Alpha Squad', kills: 18 },
        { position: 2, ign: 'Beta Warriors', kills: 12 },
      ],
    },
    createdAt: '2025-01-08 20:00',
  },
  // Another upcoming for variety
  {
    id: 'm7',
    title: 'Bermuda Dawn Solo',
    gameType: 'BR',
    mode: 'Solo',
    map: 'Bermuda',
    entryFee: 15,
    maxSlots: 50,
    joinedCount: 32,
    perKill: 5,
    include4th: false,
    include5th: false,
    startTime: futureDate(45),
    roomId: '',
    roomPassword: '',
    status: 'upcoming',
    result: null,
    createdAt: '2025-01-12 16:00',
  },
]


// ===== MOCK STANDINGS DATA =====
export const MOCK_STANDINGS = [
  { teamName: 'A4x', played: 3, wins: 2, kills: 28, points: 38 },
  { teamName: 'CN ESPORTS', played: 3, wins: 1, kills: 25, points: 30 },
  { teamName: 'NXT Official', played: 3, wins: 1, kills: 22, points: 27 },
  { teamName: 'TFG Legends', played: 3, wins: 1, kills: 19, points: 24 },
  { teamName: 'Phoenix BD', played: 3, wins: 0, kills: 20, points: 22 },
  { teamName: 'Shadow Killers', played: 3, wins: 0, kills: 16, points: 18 },
  { teamName: 'Dark Falcons', played: 3, wins: 0, kills: 14, points: 15 },
  { teamName: 'Venom Squad', played: 3, wins: 0, kills: 11, points: 12 },
  { teamName: 'Ice Breakers', played: 3, wins: 0, kills: 8, points: 8 },
  { teamName: 'Rising Stars', played: 3, wins: 0, kills: 5, points: 5 },
]


// ===== MOCK TRANSACTIONS =====
export const MOCK_TRANSACTIONS = [
  { id: 't1', type: 'credit', amount: 200, method: 'bkash', description: 'Added via bKash', date: futureDate(-30), status: 'completed' },
  { id: 't2', type: 'debit', amount: 30, method: 'match', description: 'Joined: Bermuda Rush Solo', date: futureDate(-60), status: 'completed' },
  { id: 't3', type: 'credit', amount: 150, method: 'prize', description: 'Prize: Bermuda Classic Solo (2nd)', date: futureDate(-180), status: 'completed' },
  { id: 't4', type: 'debit', amount: 80, method: 'match', description: 'Joined: Purgatory Night Duo', date: futureDate(-240), status: 'completed' },
  { id: 't5', type: 'credit', amount: 500, method: 'bkash', description: 'Added via bKash', date: futureDate(-500), status: 'completed' },
  { id: 't6', type: 'debit', amount: 500, method: 'withdraw', description: 'Withdrawn to bKash', date: futureDate(-600), status: 'completed' },
  { id: 't7', type: 'debit', amount: 200, method: 'withdraw', description: 'Withdrawn to Nagad', date: futureDate(-700), status: 'pending' },
]


// ===== MOCK NOTIFICATIONS =====
export const INITIAL_NOTIFICATIONS = [
  { id: 'n1', type: 'room', text: 'Room ID & Password unlocked for Bermuda Rush Solo — Check now!', time: futureDate(-30), read: false },
  { id: 'n2', type: 'result', text: 'Results out for Bermuda Classic Solo — You earned 150 TK!', time: futureDate(-180), read: false },
  { id: 'n3', type: 'match', text: 'Purgatory Night Duo starts in 25 minutes. Get ready!', time: futureDate(-60), read: false },
  { id: 'n4', type: 'wallet', text: 'Withdrawal of 500 TK approved via bKash.', time: futureDate(-600), read: true },
  { id: 'n5', type: 'system', text: 'Platform maintenance scheduled for tonight 2:00 AM.', time: futureDate(-1440), read: true },
  { id: 'n6', type: 'match', text: 'Kalahari Clash 4v4 registration is now open!', time: futureDate(-120), read: true },
]


// ===== MOCK ONLINE USERS =====
export const ONLINE_USERS = [
  { id: 'u2', username: 'DragonBlaze', status: 'in-match' },
  { id: 'u3', username: 'NightFuryBD', status: 'online' },
  { id: 'u4', username: 'StormBreaker', status: 'online' },
  { id: 'u5', username: 'AlphaClash', status: 'in-match' },
  { id: 'u6', username: 'VenomStrike', status: 'away' },
  { id: 'u7', username: 'IceFragBD', status: 'online' },
]


// ===== MOCK ADMIN USERS LIST =====
export const ADMIN_USER_LIST = [
  { id: 'u1', username: 'ShadowKiller', uid: '1234567890', wallet: 1250, matches: 47, wins: 8, status: 'active' },
  { id: 'u2', username: 'DragonBlaze', uid: '9876543210', wallet: 3200, matches: 92, wins: 23, status: 'active' },
  { id: 'u3', username: 'NightFuryBD', uid: '5555666677', wallet: 80, matches: 15, wins: 2, status: 'active' },
  { id: 'u4', username: 'StormBreaker', uid: '1111222233', wallet: 0, matches: 8, wins: 0, status: 'banned' },
  { id: 'u5', username: 'AlphaClash', uid: '4444555566', wallet: 560, matches: 31, wins: 7, status: 'active' },
]


// ===== PENDING WITHDRAWALS =====
export const PENDING_WITHDRAWALS = [
  { id: 'w1', user: 'DragonBlaze', amount: 500, method: 'bKash', date: futureDate(-60) },
  { id: 'w2', user: 'NightFuryBD', amount: 200, method: 'Nagad', date: futureDate(-120) },
  { id: 'w3', user: 'StormBreaker', amount: 75, method: 'bKash', date: futureDate(-300) },
]


// ===== WALLET ADD METHODS =====
export const ADD_MONEY_METHODS = [
  { id: 'bkash', label: 'bKash', icon: 'fa-solid fa-mobile-screen', color: '#E2136E' },
  { id: 'nagad', label: 'Nagad', icon: 'fa-solid fa-mobile-screen', color: '#F6921E' },
  { id: 'rocket', label: 'Rocket', icon: 'fa-solid fa-mobile-screen', color: '#8C3494' },
]


// ===== WITHDRAW METHODS =====
export const WITHDRAW_METHODS = [
  { id: 'bkash', label: 'bKash', icon: 'fa-solid fa-mobile-screen', color: '#E2136E' },
  { id: 'nagad', label: 'Nagad', icon: 'fa-solid fa-mobile-screen', color: '#F6921E' },
]


// ===== ADD MONEY AMOUNT PRESETS =====
export const ADD_AMOUNT_PRESETS = [50, 100, 200, 500, 1000]


// ===== DASHBOARD STATS (computed from matches in real app) =====
export const DASHBOARD_STAT_CARDS = [
  { id: 'live', label: 'Live Now', icon: 'fa-solid fa-circle-play', color: '#22c55e' },
  { id: 'upcoming', label: 'Upcoming', icon: 'fa-solid fa-clock', color: '#6c8cff' },
  { id: 'joined', label: 'My Matches', icon: 'fa-solid fa-user-check', color: '#a78bfa' },
  { id: 'wallet', label: 'Balance', icon: 'fa-solid fa-wallet', color: '#fbbf24' },
]


// ===== MATCH FILTER TABS =====
export const MATCH_FILTER_TABS = [
  { id: 'all', label: 'All' },
  { id: 'Solo', label: 'Solo' },
  { id: 'Duo', label: 'Duo' },
  { id: 'Squad', label: 'Squad' },
  { id: 'Clash Squad', label: 'Clash Squad' },
]


// ===== RESULT SUBMISSION METHODS =====
export const RESULT_METHODS = [
  { id: 'manual', label: 'Manual Entry', icon: 'fa-solid fa-keyboard', description: 'Type player names, kills & positions manually' },
  { id: 'screenshot', label: 'Screenshot Upload', icon: 'fa-solid fa-camera', description: 'Upload Free Fire result screen screenshot' },
]