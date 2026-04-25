import { doc, getDoc, setDoc, updateDoc, collection, getDocs } from 'firebase/firestore';
import { db } from './firebase';

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
    balance: 0, kills: 0, wins: 0, matchesPlayed: 0, earnings: 0,
    banned: false, status: 'active', createdAt: new Date().toISOString()
  });
}

export async function updateUser(uid, data) {
  const userRef = doc(db, 'users', uid);
  await updateDoc(userRef, data);
}

// ══════════════════════════════════════
//  MATCH DOCUMENTS
// ══════════════════════════════════════

export async function fetchMatches() {
  const matchesCol = collection(db, 'matches');
  const matchesSnap = await getDocs(matchesCol);
  return matchesSnap.docs.map(doc => ({ id: doc.id, ...doc.data() }));
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
//  TRANSACTION LOG (Optional, for admin tracking)
// ══════════════════════════════════════

export async function addTransaction(txData) {
  const txRef = doc(db, 'transactions', txData.id);
  await setDoc(txRef, txData);
}

export async function fetchTransactions(uid) {
  const txCol = collection(db, 'transactions');
  const q = txCol.where('userId', '==', uid);
  const txSnap = await getDocs(q);
  return txSnap.docs.map(doc => ({ id: doc.id, ...doc.data() }));
}