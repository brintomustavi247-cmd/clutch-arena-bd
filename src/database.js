import { db } from './firebase';
import { calculateELO } from './utils';
import { doc, getDoc, setDoc, updateDoc, onSnapshot, collection, getDocs, addDoc, query, where, writeBatch, orderBy, limit } from 'firebase/firestore';

// ══════════════════════════════════════
//  SECURITY: SANITIZATION & SAFE IDS
// ══════════════════════════════════════
function sanitize(str) {
  if (typeof str !== 'string') return str;
  return str.replace(/[<>"'&]/g, (c) => ({ '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;', '&': '&amp;' })[c]).trim().slice(0, 100);
}

function safeTxId(prefix) {
  return `${prefix}_${Date.now()}_${Math.random().toString(36).slice(2, 9)}`;
}

// ══════════════════════════════════════
//  USER DOCUMENTS
// ══════════════════════════════════════

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
    referralCode: uid.slice(0, 8).toUpperCase(),
    referredBy: null,
    referralCount: 0,
    referralEarnings: 0,
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

// ══════════════════════════════════════
//  MATCH DOCUMENTS
// ══════════════════════════════════════

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

// ══════════════════════════════════════
//  TRANSACTION LOG
// ══════════════════════════════════════

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

// ══════════════════════════════════════
//  PLATFORM SETTINGS
// ══════════════════════════════════════

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

// ══════════════════════════════════════
//  ADD MONEY REQUESTS (v4.0)
// ══════════════════════════════════════

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

// ══════════════════════════════════════
//  NOTIFICATIONS (v4.0)
// ══════════════════════════════════════

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

// ══════════════════════════════════════
//  PRIZE DISTRIBUTION + ELO + GAMIFICATION (v4.0)
// ══════════════════════════════════════

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
      // Gamification
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

  batch.update(matchRef, {
    result: { submittedAt: now, players: resultPlayers },
    prizeDistributed: (matchData.prizeDistributed || 0) + totalDistributed,
  });

  await batch.commit();

  return { totalDistributed, unclaimed: resultPlayers.length - Object.keys(userMap).length };
}

// ══════════════════════════════════════
//  MATCH CANCELLATION + REFUND
// ══════════════════════════════════════

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
  });

  await batch.commit();

  return { refunded: refundedTotal, count: refundCount };
}

// ══════════════════════════════════════
//  DUPLICATE TXID CHECK
// ══════════════════════════════════════

export async function checkDuplicateTXID(txId) {
  if (!txId || txId.trim().length < 4) return false;
  const col = collection(db, 'addMoneyRequests');
  const q = query(col, where('txId', '==', txId.trim().toUpperCase()));
  const snap = await getDocs(q);
  return !snap.empty;
}

// ══════════════════════════════════════
//  ADMIN BALANCE ADJUST + TX LOG
// ══════════════════════════════════════

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

// ══════════════════════════════════════
//  MULTI-DEVICE SYNC
// ══════════════════════════════════════

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

// ══════════════════════════════════════
//  REAL-TIME LISTENERS
// ══════════════════════════════════════

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