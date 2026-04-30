import { db } from './firebase';
import { calculateELO } from './utils';
import {
  doc, getDoc, setDoc, updateDoc, onSnapshot,
  collection, getDocs, addDoc, query, where,
  writeBatch, orderBy, limit, Timestamp
} from 'firebase/firestore';

// ═══════════════════════════════════════════════════════════════════════
//  SECURITY: SANITIZATION & SAFE IDS
// ═══════════════════════════════════════════════════════════════════════
function sanitize(str) {
  if (typeof str !== 'string') return str;
  return str.replace(/[<>"'&]/g, (c) => ({ '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;', '&': '&amp;' })[c]).trim().slice(0, 100);
}

function safeTxId(prefix) {
  return `${prefix}_${Date.now()}_${Math.random().toString(36).slice(2, 9)}`;
}

// ═══════════════════════════════════════════════════════════════════════
//  DATE HELPERS (for profit calculations)
// ═══════════════════════════════════════════════════════════════════════
function getTodayStr() {
  return new Date().toISOString().split('T')[0];
}

function getMonthStr() {
  const d = new Date();
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`;
}

function startOfDay() {
  const d = new Date();
  d.setHours(0, 0, 0, 0);
  return d.toISOString();
}

function startOfMonth() {
  const d = new Date();
  d.setDate(1);
  d.setHours(0, 0, 0, 0);
  return d.toISOString();
}

// ═══════════════════════════════════════════════════════════════════════
//  USER DOCUMENTS
// ═══════════════════════════════════════════════════════════════════════

export async function fetchUser(uid) {
  const userRef = doc(db, 'users', uid);
  const userSnap = await getDoc(userRef);
  if (userSnap.exists()) return userSnap.data();
  return null;
}

export async function createUser(uid, data) {
  const userRef = doc(db, 'users', uid);
  await setDoc(userRef, {
    ...data,
    ign: sanitize(data.ign),
    displayName: sanitize(data.displayName),
    balance: 0,
    lockedBalance: 0,              // ═══ v5.0: Referral bonus (can join, can't withdraw)
    kills: 0,
    wins: 0,
    matchesPlayed: 0,
    earnings: 0,
    elo: 1000,
    banned: false,
    status: 'active',
    createdAt: new Date().toISOString(),
    // ═══ GAMIFICATION FIELDS (v4.0) ═══
    streak: 1,
    streakLastDate: new Date().toISOString().split('T')[0],
    level: 1,
    xp: 0,
    nextLevelXP: 100,
    rank: 'Unranked',
    dailyClaimed: false,
    totalMatchesPlayed: 0,
    totalWins: 0,
    totalKills: 0,
    totalEarnings: 0,
    achievements: [],
    // ═══ REFERRAL SYSTEM (v5.0) ═══
    referralCode: uid.slice(0, 8).toUpperCase(),
    referredBy: null,
    referralCount: 0,
    referralEarnings: 0,
    // ═══ SPIN SYSTEM (v5.0) ═══
    lastSpinDate: null,
    totalSpinWinnings: 0,
    // ═══ AD REWARD (v5.0) ═══
    lastAdWatch: null,
    totalAdRewards: 0,
  });
}

export async function updateUser(uid, data) {
  const userRef = doc(db, 'users', uid);
  await updateDoc(userRef, data);
}

export async function fetchUsersByIGNs(igns) {
  if (!igns || igns.length === 0) return [];
  const usersCol = collection(db, 'users');
  const q = query(usersCol, where('ign', 'in', igns));
  const snap = await getDocs(q);
  return snap.docs.map(d => ({ id: d.id, ...d.data() }));
}

export async function fetchUsersByIds(userIds) {
  if (!userIds || userIds.length === 0) return [];
  const refs = userIds.map(id => doc(db, 'users', id));
  const snaps = await Promise.all(refs.map(ref => getDoc(ref)));
  return snaps
    .filter(snap => snap.exists())
    .map(snap => ({ id: snap.id, ...snap.data() }));
}

// ═══════════════════════════════════════════════════════════════════════
//  MATCH DOCUMENTS
// ═══════════════════════════════════════════════════════════════════════

export async function fetchMatches() {
  const matchesCol = collection(db, 'matches');
  const matchesSnap = await getDocs(matchesCol);
  return matchesSnap.docs.map(d => ({ id: d.id, ...d.data() }));
}

export async function createMatchInDb(matchId, data) {
  const matchRef = doc(db, 'matches', matchId);
  await setDoc(matchRef, data);
}

export async function updateMatchInDb(matchId, data) {
  const matchRef = doc(db, 'matches', matchId);
  await updateDoc(matchRef, data);
}

// ═══════════════════════════════════════════════════════════════════════
//  TRANSACTION LOG
// ═══════════════════════════════════════════════════════════════════════

export async function addTransaction(txData) {
  const txRef = doc(db, 'transactions', txData.id);
  await setDoc(txRef, txData);
}

export async function fetchTransactions(uid) {
  const txCol = collection(db, 'transactions');
  const q = query(txCol, where('userId', '==', uid));
  const txSnap = await getDocs(q);
  return txSnap.docs.map(d => ({ id: d.id, ...d.data() }));
}

// ═══════════════════════════════════════════════════════════════════════
//  PLATFORM SETTINGS
// ═══════════════════════════════════════════════════════════════════════

export async function getSettings() {
  const settingsRef = doc(db, 'settings', 'global');
  const settingsSnap = await getDoc(settingsRef);
  if (settingsSnap.exists()) return settingsSnap.data();
  return null;
}

export async function saveSettings(data) {
  const settingsRef = doc(db, 'settings', 'global');
  const settingsSnap = await getDoc(settingsRef);
  if (settingsSnap.exists()) {
    await updateDoc(settingsRef, data);
  } else {
    await setDoc(settingsRef, data);
  }
}

// ═══════════════════════════════════════════════════════════════════════
//  ADD MONEY REQUESTS (v4.0)
// ═══════════════════════════════════════════════════════════════════════

export async function createAddMoneyRequest(data) {
  const reqRef = doc(db, 'addMoneyRequests', data.id);
  await setDoc(reqRef, {
    ...data,
    txId: (data.txId || '').trim().toUpperCase(),
    senderNumber: sanitize(data.senderNumber || ''),
    status: 'pending',
    createdAt: new Date().toISOString(),
  });
}

export async function fetchPendingAddMoneyRequests() {
  const col = collection(db, 'addMoneyRequests');
  const q = query(col, where('status', '==', 'pending'), orderBy('createdAt', 'desc'));
  const snap = await getDocs(q);
  return snap.docs.map(d => ({ id: d.id, ...d.data() }));
}

export function subscribeToAddMoneyRequests(onUpdate) {
  const col = collection(db, 'addMoneyRequests');
  const q = query(col, where('status', '==', 'pending'), orderBy('createdAt', 'desc'));
  const unsubscribe = onSnapshot(q, (snap) => {
    const results = snap.docs.map(d => ({ id: d.id, ...d.data() }));
    onUpdate(results);
  }, (error) => {
    console.error('[DB] Add money requests subscription error:', error);
    onUpdate([]);
  });
  return unsubscribe;
}

export async function approveAddMoneyRequest(requestId, userId, amount) {
  const reqRef = doc(db, 'addMoneyRequests', requestId);
  await updateDoc(reqRef, { status: 'approved', processedAt: new Date().toISOString() });

  const txRef = doc(db, 'transactions', requestId);
  await updateDoc(txRef, { status: 'completed' }).catch(() => {
    console.warn('[DB] Transaction doc not found for approval, skipping update.');
  });

  const userRef = doc(db, 'users', userId);
  const userSnap = await getDoc(userRef);
  if (userSnap.exists()) {
    const currentBalance = userSnap.data().balance || 0;
    await updateDoc(userRef, { balance: currentBalance + amount });
  }
}

export async function rejectAddMoneyRequest(requestId, userId) {
  const reqRef = doc(db, 'addMoneyRequests', requestId);
  await updateDoc(reqRef, { status: 'rejected', processedAt: new Date().toISOString() });

  const txRef = doc(db, 'transactions', requestId);
  await updateDoc(txRef, { status: 'rejected' }).catch(() => {
    console.warn('[DB] Transaction doc not found for rejection, skipping update.');
  });

  if (userId) {
    await addNotification(userId, {
      type: 'deposit_rejected',
      title: 'Deposit Rejected',
      body: 'Your deposit request was rejected. Please try again with correct information.'
    });
  }
}

// ═══════════════════════════════════════════════════════════════════════
//  NOTIFICATIONS (v4.0)
// ═══════════════════════════════════════════════════════════════════════

export async function addNotification(userId, notification) {
  const notifRef = doc(collection(db, 'users', userId, 'notifications'));
  await setDoc(notifRef, {
    ...notification,
    read: false,
    createdAt: new Date().toISOString(),
  });
}

export function subscribeToNotifications(userId, onUpdate) {
  const notifCol = collection(db, 'users', userId, 'notifications');
  const q = query(notifCol, orderBy('createdAt', 'desc'), limit(50));
  const unsubscribe = onSnapshot(q, (snap) => {
    const results = snap.docs.map(d => ({ id: d.id, ...d.data() }));
    onUpdate(results);
  }, (error) => {
    console.error('[DB] Notifications subscription error:', error);
    onUpdate([]);
  });
  return unsubscribe;
}

export async function markNotificationRead(userId, notifId) {
  const notifRef = doc(db, 'users', userId, 'notifications', notifId);
  await updateDoc(notifRef, { read: true });
}

// ═══════════════════════════════════════════════════════════════════════
//  ═══ V5.0: REFERRAL SYSTEM ═══
// ═══════════════════════════════════════════════════════════════════════

export async function processReferral(newUserId, referralCode) {
  if (!referralCode || !newUserId) return { success: false, error: 'Missing data' };

  // Find referrer by code
  const usersCol = collection(db, 'users');
  const q = query(usersCol, where('referralCode', '==', referralCode.toUpperCase().trim()));
  const snap = await getDocs(q);

  if (snap.empty) return { success: false, error: 'Invalid referral code' };

  const referrerDoc = snap.docs[0];
  const referrer = { id: referrerDoc.id, ...referrerDoc.data() };

  // Prevent self-referral
  if (referrer.id === newUserId) return { success: false, error: 'Cannot refer yourself' };

  const now = new Date().toISOString();
  const batch = writeBatch(db);

  // Give 20 TK LOCKED to new user (can join matches, can't withdraw)
  const newUserRef = doc(db, 'users', newUserId);
  batch.update(newUserRef, {
    referredBy: referrer.id,
    lockedBalance: 20,
    balance: 0, // They start with 0 withdrawable, 20 locked
  });

  // Give 20 TK LOCKED to referrer
  const referrerRef = doc(db, 'users', referrer.id);
  batch.update(referrerRef, {
    referralCount: (referrer.referralCount || 0) + 1,
    referralEarnings: (referrer.referralEarnings || 0) + 20,
    lockedBalance: (referrer.lockedBalance || 0) + 20,
  });

  // Log referral transaction
  const refTxId = safeTxId('tx_referral');
  batch.set(doc(db, 'transactions', refTxId), {
    id: refTxId,
    userId: newUserId,
    type: 'referral_bonus',
    amount: 20,
    desc: `Referral bonus: Joined using ${referrer.username || referrer.displayName || referrer.referralCode}'s code`,
    date: now,
    status: 'completed',
    referrerId: referrer.id,
    referrerCode: referralCode,
    locked: true, // Flag: this is locked balance
  });

  // Log referrer transaction
  const refTxId2 = safeTxId('tx_referral');
  batch.set(doc(db, 'transactions', refTxId2), {
    id: refTxId2,
    userId: referrer.id,
    type: 'referral_earn',
    amount: 20,
    desc: `Referral earn: ${newUserId.slice(0, 8)} joined using your code`,
    date: now,
    status: 'completed',
    referredUserId: newUserId,
    locked: true,
  });

  // Store referral record
  const referralRecordId = safeTxId('ref');
  batch.set(doc(db, 'referrals', referralRecordId), {
    id: referralRecordId,
    referrerId: referrer.id,
    referredId: newUserId,
    codeUsed: referralCode.toUpperCase(),
    amount: 20,
    status: 'pending_match', // Unlocked when referred user joins first match
    createdAt: now,
  });

  await batch.commit();
  return { success: true, referrerId: referrer.id, amount: 20 };
}

export async function unlockReferralBonus(userId) {
  // Called when user joins their FIRST match
  // Unlocks both referrer and referred user's locked balance
  const referralsCol = collection(db, 'referrals');
  const q = query(referralsCol, where('referredId', '==', userId), where('status', '==', 'pending_match'));
  const snap = await getDocs(q);

  if (snap.empty) return { unlocked: false };

  const batch = writeBatch(db);
  let totalUnlocked = 0;

  snap.docs.forEach(docSnap => {
    const refData = docSnap.data();

    // Unlock referred user's locked balance -> regular balance
    const referredRef = doc(db, 'users', refData.referredId);
    batch.update(referredRef, {
      lockedBalance: 0,
      balance: 20, // Move from locked to regular
    });

    // Unlock referrer's locked balance -> regular balance
    const referrerRef = doc(db, 'users', refData.referrerId);
    batch.update(referrerRef, {
      lockedBalance: 0, // Will be recalculated, but for simplicity
      balance: 20,
    });

    // Update referral record
    batch.update(doc(db, 'referrals', docSnap.id), {
      status: 'unlocked',
      unlockedAt: new Date().toISOString(),
    });

    totalUnlocked += 40; // 20 + 20
  });

  await batch.commit();
  return { unlocked: true, totalUnlocked };
}

export async function fetchReferralStats(userId) {
  const userRef = doc(db, 'users', userId);
  const userSnap = await getDoc(userRef);
  if (!userSnap.exists()) return null;

  const userData = userSnap.data();

  // Count successful referrals
  const referralsCol = collection(db, 'referrals');
  const q = query(referralsCol, where('referrerId', '==', userId));
  const snap = await getDocs(q);

  const referrals = snap.docs.map(d => d.data());
  const pending = referrals.filter(r => r.status === 'pending_match').length;
  const unlocked = referrals.filter(r => r.status === 'unlocked').length;

  return {
    code: userData.referralCode,
    totalReferrals: referrals.length,
    pendingMatch: pending,
    unlocked: unlocked,
    earnings: userData.referralEarnings || 0,
    lockedBalance: userData.lockedBalance || 0,
  };
}

// ═══════════════════════════════════════════════════════════════════════
//  ═══ V5.0: AD REWARD SYSTEM ═══
// ═══════════════════════════════════════════════════════════════════════

const AD_REWARD_AMOUNT = 5;
const AD_COOLDOWN_MS = 5 * 60 * 1000; // 5 minutes between ads

export async function watchAdReward(userId) {
  const userRef = doc(db, 'users', userId);
  const userSnap = await getDoc(userRef);
  if (!userSnap.exists()) throw new Error('User not found');

  const userData = userSnap.data();
  const lastAd = userData.lastAdWatch ? new Date(userData.lastAdWatch).getTime() : 0;
  const now = Date.now();

  if (now - lastAd < AD_COOLDOWN_MS) {
    const waitSec = Math.ceil((AD_COOLDOWN_MS - (now - lastAd)) / 1000);
    return { success: false, cooldown: waitSec };
  }

  const nowISO = new Date().toISOString();
  const batch = writeBatch(db);

  // Add 5 TK to balance
  batch.update(userRef, {
    balance: (userData.balance || 0) + AD_REWARD_AMOUNT,
    lastAdWatch: nowISO,
    totalAdRewards: (userData.totalAdRewards || 0) + AD_REWARD_AMOUNT,
  });

  // Log transaction
  const txId = safeTxId('tx_ad');
  batch.set(doc(db, 'transactions', txId), {
    id: txId,
    userId: userId,
    type: 'ad_reward',
    amount: AD_REWARD_AMOUNT,
    desc: `Watched ad +${AD_REWARD_AMOUNT} TK reward`,
    date: nowISO,
    status: 'completed',
  });

  // Log for profit tracking
  const adLogId = safeTxId('ad');
  batch.set(doc(db, 'adRewards', adLogId), {
    id: adLogId,
    userId: userId,
    amount: AD_REWARD_AMOUNT,
    createdAt: nowISO,
    dateStr: getTodayStr(),
    monthStr: getMonthStr(),
  });

  await batch.commit();
  return { success: true, amount: AD_REWARD_AMOUNT, newBalance: (userData.balance || 0) + AD_REWARD_AMOUNT };
}

export function getAdCooldownRemaining(userData) {
  if (!userData.lastAdWatch) return 0;
  const lastAd = new Date(userData.lastAdWatch).getTime();
  const elapsed = Date.now() - lastAd;
  if (elapsed >= AD_COOLDOWN_MS) return 0;
  return Math.ceil((AD_COOLDOWN_MS - elapsed) / 1000);
}

// ═══════════════════════════════════════════════════════════════════════
//  ═══ V5.0: CLUTCH SPIN (DAILY LOTTERY) ═══
// ═══════════════════════════════════════════════════════════════════════

const SPIN_PAYOUTS = [
  { amount: 5, chance: 0.50, label: '5 TK' },
  { amount: 10, chance: 0.30, label: '10 TK' },
  { amount: 15, chance: 0.15, label: '15 TK' },
  { amount: 25, chance: 0.04, label: '25 TK' },
  { amount: 0, chance: 0.01, label: 'Free Match Entry', isFreeEntry: true },
];

export function getSpinPayouts() {
  return SPIN_PAYOUTS;
}

export async function spinClutchWheel(userId) {
  const userRef = doc(db, 'users', userId);
  const userSnap = await getDoc(userRef);
  if (!userSnap.exists()) throw new Error('User not found');

  const userData = userSnap.data();
  const today = getTodayStr();

  // Check if already spun today
  if (userData.lastSpinDate === today) {
    return { success: false, error: 'Already spun today. Come back tomorrow!' };
  }

  // Weighted random selection
  const rand = Math.random();
  let cumulative = 0;
  let selected = SPIN_PAYOUTS[0];

  for (const payout of SPIN_PAYOUTS) {
    cumulative += payout.chance;
    if (rand <= cumulative) {
      selected = payout;
      break;
    }
  }

  const nowISO = new Date().toISOString();
  const batch = writeBatch(db);

  if (selected.isFreeEntry) {
    // Free match entry token
    batch.update(userRef, {
      lastSpinDate: today,
      freeMatchEntry: true,
      freeMatchEntryExpiry: new Date(Date.now() + 24 * 60 * 60 * 1000).toISOString(), // 24h expiry
    });
  } else {
    // Add TK to balance
    batch.update(userRef, {
      lastSpinDate: today,
      balance: (userData.balance || 0) + selected.amount,
      totalSpinWinnings: (userData.totalSpinWinnings || 0) + selected.amount,
    });
  }

  // Log spin
  const spinId = safeTxId('spin');
  batch.set(doc(db, 'spinLog', spinId), {
    id: spinId,
    userId: userId,
    amount: selected.amount,
    isFreeEntry: selected.isFreeEntry || false,
    createdAt: nowISO,
    dateStr: today,
    monthStr: getMonthStr(),
  });

  // Log transaction
  const txId = safeTxId('tx_spin');
  batch.set(doc(db, 'transactions', txId), {
    id: txId,
    userId: userId,
    type: 'spin_reward',
    amount: selected.amount,
    desc: selected.isFreeEntry ? '🎰 Clutch Spin: Free Match Entry!' : `🎰 Clutch Spin: ${selected.label}`,
    date: nowISO,
    status: 'completed',
  });

  await batch.commit();
  return { success: true, result: selected };
}

export function canSpinToday(userData) {
  if (!userData.lastSpinDate) return true;
  return userData.lastSpinDate !== getTodayStr();
}

// ═══════════════════════════════════════════════════════════════════════
//  ═══ V5.0: PLATFORM PROFIT & SPENDING TRACKER ═══
// ═══════════════════════════════════════════════════════════════════════

export async function getPlatformProfitStats() {
  const now = new Date().toISOString();
  const todayStart = startOfDay();
  const monthStart = startOfMonth();

  // ── TODAY'S DATA ──
  const matchesCol = collection(db, 'matches');
  const todayMatchesSnap = await getDocs(query(matchesCol, where('createdAt', '>=', todayStart)));
  const todayMatches = todayMatchesSnap.docs.map(d => d.data());

  const matchesCreatedToday = todayMatches.length;
  const fullMatchesToday = todayMatches.filter(m => m.joinedCount >= m.maxSlots).length;
  const totalEntryFeesToday = todayMatches.reduce((s, m) => s + (m.entryFee || 0) * (m.joinedCount || 0), 0);
  const adminProfitToday = Math.round(totalEntryFeesToday * 0.20);
  const prizePoolPaidToday = todayMatches.reduce((s, m) => s + (m.escrow?.distributed || 0), 0);
  const cancellationRefundsToday = todayMatches
    .filter(m => m.status === 'cancelled')
    .reduce((s, m) => s + (m.escrow?.refunded || 0), 0);

  // ── MONTHLY DATA ──
  const monthMatchesSnap = await getDocs(query(matchesCol, where('createdAt', '>=', monthStart)));
  const monthMatches = monthMatchesSnap.docs.map(d => d.data());
  const totalRevenueMonth = monthMatches.reduce((s, m) => s + (m.entryFee || 0) * (m.joinedCount || 0), 0);
  const adminProfitMonth = Math.round(totalRevenueMonth * 0.20);

  // ── SPENDING TRACKER ──
  // Referral payouts
  const referralsCol = collection(db, 'referrals');
  const todayReferralsSnap = await getDocs(query(referralsCol, where('createdAt', '>=', todayStart)));
  const referralPayoutsToday = todayReferralsSnap.docs.length * 40; // 20 + 20 per referral

  const monthReferralsSnap = await getDocs(query(referralsCol, where('createdAt', '>=', monthStart)));
  const referralPayoutsMonth = monthReferralsSnap.docs.length * 40;

  // Ad rewards
  const adCol = collection(db, 'adRewards');
  const todayAdSnap = await getDocs(query(adCol, where('createdAt', '>=', todayStart)));
  const adRewardsToday = todayAdSnap.docs.reduce((s, d) => s + (d.data().amount || 0), 0);

  const monthAdSnap = await getDocs(query(adCol, where('createdAt', '>=', monthStart)));
  const adRewardsMonth = monthAdSnap.docs.reduce((s, d) => s + (d.data().amount || 0), 0);

  // Spin payouts
  const spinCol = collection(db, 'spinLog');
  const todaySpinSnap = await getDocs(query(spinCol, where('createdAt', '>=', todayStart)));
  const spinPayoutsToday = todaySpinSnap.docs.reduce((s, d) => s + (d.data().amount || 0), 0);

  const monthSpinSnap = await getDocs(query(spinCol, where('createdAt', '>=', monthStart)));
  const spinPayoutsMonth = monthSpinSnap.docs.reduce((s, d) => s + (d.data().amount || 0), 0);

  // ── TOTALS ──
  const totalSpendingsToday = referralPayoutsToday + adRewardsToday + spinPayoutsToday;
  const netProfitToday = adminProfitToday - totalSpendingsToday;

  const totalSpendingsMonth = referralPayoutsMonth + adRewardsMonth + spinPayoutsMonth;
  const netProfitMonth = adminProfitMonth - totalSpendingsMonth;

  // ── FUND STATUS ──
  const usersCol = collection(db, 'users');
  const allUsersSnap = await getDocs(usersCol);
  const allUsers = allUsersSnap.docs.map(d => d.data());

  const totalUserBalance = allUsers.reduce((s, u) => s + (u.balance || 0), 0);
  const totalLockedBalance = allUsers.reduce((s, u) => s + (u.lockedBalance || 0), 0);

  const withdrawalsCol = collection(db, 'withdrawals');
  const pendingWdSnap = await getDocs(query(withdrawalsCol, where('status', '==', 'pending')));
  const pendingWithdrawals = pendingWdSnap.docs.reduce((s, d) => s + (d.data().amount || 0), 0);

  const totalEscrow = allUsersSnap.docs
    .map(() => 0)
    .reduce((a, b) => a + b, 0); // Placeholder - calculated from matches

  // Calculate active escrow from matches
  const activeMatchesSnap = await getDocs(query(matchesCol, where('status', 'in', ['upcoming', 'live'])));
  const activeEscrow = activeMatchesSnap.docs.reduce((s, d) => {
    const m = d.data();
    return s + (m.entryFee || 0) * (m.joinedCount || 0);
  }, 0);

  // ── ALERTS ──
  const alerts = [];
  const lowPlayerMatches = todayMatches.filter(m => m.status === 'upcoming' && (m.joinedCount || 0) < (m.minPlayers || 10));
  if (lowPlayerMatches.length > 0) {
    alerts.push({ type: 'warning', message: `${lowPlayerMatches.length} match(es) below minimum players` });
  }
  const cancelledToday = todayMatches.filter(m => m.status === 'cancelled').length;
  if (cancelledToday > 0) {
    alerts.push({ type: 'error', message: `${cancelledToday} match(es) cancelled today (${formatTK(cancellationRefundsToday)} refunded)` });
  }
  if (totalSpendingsToday > adminProfitToday * 0.15) {
    alerts.push({ type: 'warning', message: 'Referral + ad costs exceed 15% of profit' });
  }

  return {
    today: {
      matchesCreated: matchesCreatedToday,
      fullMatches: fullMatchesToday,
      totalEntryFees: totalEntryFeesToday,
      adminProfit: adminProfitToday,
      prizePoolPaid: prizePoolPaidToday,
      cancellationRefunds: cancellationRefundsToday,
      referralPayouts: referralPayoutsToday,
      adRewards: adRewardsToday,
      spinPayouts: spinPayoutsToday,
      totalSpendings: totalSpendingsToday,
      netProfit: netProfitToday,
    },
    month: {
      totalRevenue: totalRevenueMonth,
      totalSpendings: totalSpendingsMonth,
      netProfit: netProfitMonth,
      adRevenueEstimate: Math.round(totalRevenueMonth * 0.002), // Rough estimate: $0.20 per 1000 views equivalent
    },
    funds: {
      totalUserBalance,
      totalLockedBalance,
      activeEscrow,
      pendingWithdrawals,
      totalPlatformValue: totalUserBalance + totalLockedBalance + activeEscrow,
    },
    alerts,
  };
}

// Helper for formatting in profit stats
function formatTK(amount) {
  return amount.toLocaleString('en-BD') + ' TK';
}

// ═══════════════════════════════════════════════════════════════════════
//  PRIZE DISTRIBUTION + ELO + GAMIFICATION (v4.0)
// ═══════════════════════════════════════════════════════════════════════

export async function distributePrizes(matchId, matchData, resultPlayers, perKill) {
  const matchRef = doc(db, 'matches', matchId);
  const pk = Number(perKill) || 0;
  const now = new Date().toISOString();

  const ignList = resultPlayers.map(p => (p.ign || '').trim()).filter(Boolean);
  const userMap = {};

  if (ignList.length > 0) {
    const users = await fetchUsersByIGNs(ignList);
    users.forEach(u => {
      userMap[(u.ign || '').toLowerCase()] = u;
    });
  }

  const allPlayerElos = resultPlayers.map(p => userMap[(p.ign || '').trim().toLowerCase()]?.elo || 1000);
  const avgMatchElo = allPlayerElos.length > 0 ? (allPlayerElos.reduce((a, b) => a + b, 0) / allPlayerElos.length) : 1000;

  const batch = writeBatch(db);
  let totalDistributed = 0;

  for (const player of resultPlayers) {
    const positionPrize = Number(player.prize) || Number(player.positionPrize) || 0;
    const kills = Number(player.kills) || 0;
    const killPrize = pk * kills;
    const totalPrize = positionPrize + killPrize;

    if (totalPrize <= 0) continue;

    totalDistributed += totalPrize;

    const user = userMap[(player.ign || '').trim().toLowerCase()];

    if (!user) {
      const txId = safeTxId('tx_unclaimed');
      batch.set(doc(db, 'transactions', txId), {
        id: txId,
        userId: 'unknown',
        username: player.ign || 'Unknown',
        ign: player.ign || '',
        type: 'win',
        amount: totalPrize,
        desc: `Prize: ${sanitize(matchData.title)} (#${player.position}) — UNCLAIMED (User not registered)`,
        matchId: matchId,
        date: now,
        status: 'completed',
        position: player.position,
        kills: kills,
        positionPrize: positionPrize,
        killPrize: killPrize,
      });
      continue;
    }

    const currentBalance = user.balance || 0;
    const currentElo = user.elo || 1000;
    const eloChange = calculateELO(currentElo, avgMatchElo, player.position, resultPlayers.length);
    const newElo = currentElo + eloChange;

    // ═══ GAMIFICATION: Update stats ═══
    const newTotalKills = (user.totalKills || 0) + kills;
    const newTotalWins = (user.totalWins || 0) + (player.position === 1 ? 1 : 0);
    const newTotalEarnings = (user.totalEarnings || 0) + totalPrize;
    const newMatchesPlayed = (user.totalMatchesPlayed || 0) + 1;

    // Check achievements to unlock
    const newAchievements = [...(user.achievements || [])];
    const checkAch = (id, condition) => {
      if (condition && !newAchievements.includes(id)) newAchievements.push(id);
    };
    checkAch('first_match', newMatchesPlayed >= 1);
    checkAch('first_win', newTotalWins >= 1);
    checkAch('kill_10', newTotalKills >= 10);
    checkAch('kill_50', newTotalKills >= 50);
    checkAch('kill_100', newTotalKills >= 100);
    checkAch('win_5', newTotalWins >= 5);
    checkAch('win_10', newTotalWins >= 10);

    batch.update(doc(db, 'users', user.id), {
      balance: currentBalance + totalPrize,
      wins: (user.wins || 0) + (player.position === 1 ? 1 : 0),
      earnings: (user.earnings || 0) + totalPrize,
      elo: newElo,
      totalMatchesPlayed: newMatchesPlayed,
      totalKills: newTotalKills,
      totalWins: newTotalWins,
      totalEarnings: newTotalEarnings,
      achievements: newAchievements,
    });

    const txId = safeTxId('tx_win');

    let desc = `Prize: ${sanitize(matchData.title)}`;
    if (player.position === 1) desc += ' (🥇 1st Place)';
    else if (player.position === 2) desc += ' (🥈 2nd Place)';
    else if (player.position === 3) desc += ' (🥉 3rd Place)';
    else desc += ` (#${player.position} Place)`;
    if (killPrize > 0) desc += ` + ${kills} kills (${killPrize} TK)`;
    desc += ` [ELO ${eloChange >= 0 ? '+' : ''}${eloChange}]`;

    batch.set(doc(db, 'transactions', txId), {
      id: txId,
      userId: user.id,
      username: user.name || user.displayName || user.ign,
      ign: user.ign || '',
      type: 'win',
      amount: totalPrize,
      desc: desc,
      matchId: matchId,
      date: now,
      status: 'completed',
      position: player.position,
      kills: kills,
      positionPrize: positionPrize,
      killPrize: killPrize,
      eloChange: eloChange,
    });
  }

  // Update match escrow distributed
  batch.update(matchRef, {
    result: { submittedAt: now, players: resultPlayers },
    prizeDistributed: (matchData.prizeDistributed || 0) + totalDistributed,
    'escrow.distributed': (matchData.escrow?.distributed || 0) + totalDistributed,
  });

  await batch.commit();

  return { totalDistributed, unclaimed: resultPlayers.length - Object.keys(userMap).length };
}

// ═══════════════════════════════════════════════════════════════════════
//  MATCH CANCELLATION + REFUND
// ═══════════════════════════════════════════════════════════════════════

export async function cancelMatchAndRefund(matchId, matchData, adminName) {
  const matchRef = doc(db, 'matches', matchId);
  const participants = matchData.participants || [];
  const entryFee = Number(matchData.entryFee) || 0;
  const now = new Date().toISOString();

  if (participants.length === 0) {
    await updateDoc(matchRef, { status: 'cancelled', cancelledAt: now });
    return { refunded: 0, count: 0 };
  }

  const users = await fetchUsersByIds(participants);

  const batch = writeBatch(db);
  let refundedTotal = 0;
  let refundCount = 0;

  for (const user of users) {
    const newBalance = (user.balance || 0) + entryFee;
    batch.update(doc(db, 'users', user.id), { balance: newBalance });
    refundedTotal += entryFee;
    refundCount++;

    const txId = safeTxId('tx_refund');
    batch.set(doc(db, 'transactions', txId), {
      id: txId,
      userId: user.id,
      username: user.name || user.displayName || 'Unknown',
      ign: user.ign || '',
      type: 'refund',
      amount: entryFee,
      desc: `Refund: ${sanitize(matchData.title)} (Match cancelled by ${sanitize(adminName) || 'Admin'})`,
      matchId: matchId,
      date: now,
      status: 'completed',
    });
  }

  batch.update(matchRef, {
    status: 'cancelled',
    cancelledAt: now,
    cancelledBy: adminName || 'Admin',
    refundCount: refundCount,
    refundTotal: refundedTotal,
    'escrow.refunded': refundedTotal,
  });

  await batch.commit();

  return { refunded: refundedTotal, count: refundCount };
}

// ═══════════════════════════════════════════════════════════════════════
//  DUPLICATE TXID CHECK
// ═══════════════════════════════════════════════════════════════════════

export async function checkDuplicateTXID(txId) {
  if (!txId || txId.trim().length < 4) return false;
  const col = collection(db, 'addMoneyRequests');
  const q = query(col, where('txId', '==', txId.trim().toUpperCase()));
  const snap = await getDocs(q);
  return !snap.empty;
}

// ═══════════════════════════════════════════════════════════════════════
//  ADMIN BALANCE ADJUST + TX LOG
// ═══════════════════════════════════════════════════════════════════════

export async function adminAdjustBalance(userId, amount, reason, adminName) {
  const userRef = doc(db, 'users', userId);
  const userSnap = await getDoc(userRef);
  if (!userSnap.exists()) throw new Error('User not found');

  const userData = userSnap.data();
  const admin = adminName || 'Admin';
  const now = new Date().toISOString();

  await updateDoc(userRef, { balance: Math.max(0, (userData.balance || 0) + amount) });

  const txId = safeTxId('tx_admin');
  await setDoc(doc(db, 'transactions', txId), {
    id: txId,
    userId: userId,
    username: userData.name || userData.displayName || 'Unknown',
    ign: userData.ign || '',
    type: amount >= 0 ? 'admin_add' : 'admin_deduct',
    amount: Math.abs(amount),
    desc: `Admin ${sanitize(admin)}: ${sanitize(reason) || 'Balance adjustment'} (${amount >= 0 ? 'Added' : 'Deducted'})`,
    date: now,
    status: 'completed',
    adminName: admin,
  });

  return Math.max(0, (userData.balance || 0) + amount);
}

// ═══════════════════════════════════════════════════════════════════════
//  MULTI-DEVICE SYNC
// ═══════════════════════════════════════════════════════════════════════

export async function addJoinToMatch(matchId, joinEntry) {
  const matchRef = doc(db, 'matches', matchId);
  const matchSnap = await getDoc(matchRef);
  if (!matchSnap.exists()) return;
  const existing = matchSnap.data().joined || [];
  const safeEntry = { ...joinEntry, teamName: sanitize(joinEntry.teamName) };

  await updateDoc(matchRef, {
    joined: [...existing, safeEntry],
    joinedCount: (matchSnap.data().joinedCount || 0) + 1,
  });
}

export async function addWithdrawalToCloud(withdrawalData) {
  const wdRef = doc(db, 'withdrawals', withdrawalData.id);
  await setDoc(wdRef, withdrawalData);
}

export async function logActivityToCloud(logEntry) {
  const logRef = doc(db, 'activityLog', logEntry.id);
  await setDoc(logRef, logEntry);
}

export async function addTransactionToCloud(txData) {
  const txRef = doc(db, 'transactions', txData.id);
  await setDoc(txRef, txData);
}

export function subscribeToMatches(onUpdate) {
  const matchesCol = collection(db, 'matches');
  const q = query(matchesCol, orderBy('createdAt', 'desc'));
  const unsubscribe = onSnapshot(q, (snap) => {
    const results = snap.docs.map(d => ({ id: d.id, ...d.data() }));
    onUpdate(results);
  });
  return unsubscribe;
}

// ═══════════════════════════════════════════════════════════════════════
//  REAL-TIME LISTENERS
// ═══════════════════════════════════════════════════════════════════════

export function subscribeToSettings(onUpdate) {
  const settingsRef = doc(db, 'settings', 'global');
  const unsubscribe = onSnapshot(settingsRef, (snap) => {
    if (snap.exists()) onUpdate(snap.data());
  });
  return unsubscribe;
}

export function subscribeToUser(uid, onUpdate) {
  const userRef = doc(db, 'users', uid);
  const unsubscribe = onSnapshot(userRef, (snap) => {
    if (snap.exists()) onUpdate(snap.data());
  });
  return unsubscribe;
}

export function subscribeToWithdrawals(onUpdate) {
  const wdCol = collection(db, 'withdrawals');
  const q = query(wdCol, orderBy('createdAt', 'desc'));
  const unsubscribe = onSnapshot(q, (snap) => {
    const results = snap.docs.map(d => ({ id: d.id, ...d.data() }));
    onUpdate(results);
  });
  return unsubscribe;
}

export async function approveWithdrawalInCloud(wdId, userId, amount) {
  const now = new Date().toISOString();
  const wdRef = doc(db, 'withdrawals', wdId);
  await updateDoc(wdRef, { status: 'approved', processedAt: now });

  const txId = safeTxId('tx_wd_ok');
  await setDoc(doc(db, 'transactions', txId), {
    id: txId,
    userId,
    amount,
    type: 'withdraw',
    status: 'completed',
    desc: `Withdrawal of ${amount} TK approved and processed`,
    date: now,
    createdAt: now,
  });
}

export async function rejectWithdrawalInCloud(wdId, userId, amount) {
  const now = new Date().toISOString();
  const wdRef = doc(db, 'withdrawals', wdId);
  await updateDoc(wdRef, { status: 'rejected', processedAt: now });

  const userRef = doc(db, 'users', userId);
  const userSnap = await getDoc(userRef);
  if (userSnap.exists()) {
    const userData = userSnap.data();
    await updateDoc(userRef, { balance: (userData.balance || 0) + amount });
  }

  const txId = safeTxId('tx_wd_rj');
  await setDoc(doc(db, 'transactions', txId), {
    id: txId,
    userId,
    amount,
    type: 'refund',
    status: 'completed',
    desc: `Withdrawal of ${amount} TK rejected — Amount refunded to balance`,
    date: now,
    createdAt: now,
  });
}

export function subscribeToAllUsers(onUpdate) {
  const usersCol = collection(db, 'users');
  const q = query(usersCol, orderBy('earnings', 'desc'));
  const unsubscribe = onSnapshot(q, (snap) => {
    const results = snap.docs.map(d => ({ id: d.id, ...d.data() }));
    onUpdate(results);
  });
  return unsubscribe;
}

export function subscribeToUserTransactions(uid, onUpdate) {
  const txCol = collection(db, 'transactions');
  const q = query(txCol, where('userId', '==', uid));
  const unsubscribe = onSnapshot(q, (snap) => {
    const results = snap.docs.map(d => ({ id: d.id, ...d.data() }));
    results.sort((a, b) => {
      const dateA = new Date(a.date || 0).getTime();
      const dateB = new Date(b.date || 0).getTime();
      return dateB - dateA;
    });
    onUpdate(results);
  }, (error) => {
    console.error('[DB] Transaction subscription error:', error);
    onUpdate([]);
  });
  return unsubscribe;
}

// ═══════════════════════════════════════════════════════════════════════
//  ═══ V5.0: REAL-TIME PROFIT SUBSCRIPTION ═══
// ═══════════════════════════════════════════════════════════════════════

export function subscribeToProfitStats(onUpdate) {
  // Returns a function that refreshes profit stats every 30 seconds
  const refresh = async () => {
    try {
      const stats = await getPlatformProfitStats();
      onUpdate(stats);
    } catch (err) {
      console.error('[DB] Profit stats refresh error:', err);
    }
  };

  refresh(); // Initial load
  const interval = setInterval(refresh, 30000); // Refresh every 30s
  return () => clearInterval(interval);
}