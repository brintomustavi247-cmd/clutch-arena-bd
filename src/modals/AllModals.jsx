import { useState } from 'react'
import { useApp } from '../context'
import { formatTK, calculateJoinPreview, requiredNameInputs, maxSlotsForMode, showToast } from '../utils'
import { ADD_MONEY_METHODS, WITHDRAW_METHODS, ADD_AMOUNT_PRESETS, FF_MAPS, FF_GAME_TYPES, KILL_REWARDS } from '../data'

const BRAND = {
  bkash: {
    primary: '#E2136E',
    soft: 'rgba(226,19,110,0.08)',
    border: 'rgba(226,19,110,0.25)',
    gradient: 'linear-gradient(135deg, rgba(226,19,110,0.14) 0%, rgba(226,19,110,0.03) 70%)',
  },
  nagad: {
    primary: '#F36F21',
    soft: 'rgba(243,111,33,0.08)',
    border: 'rgba(243,111,33,0.25)',
    gradient: 'linear-gradient(135deg, rgba(243,111,33,0.14) 0%, rgba(243,111,33,0.03) 70%)',
  },
  rocket: {
    primary: '#4A00E0',
    soft: 'rgba(74,0,224,0.08)',
    border: 'rgba(74,0,224,0.25)',
    gradient: 'linear-gradient(135deg, rgba(74,0,224,0.14) 0%, rgba(74,0,224,0.03) 70%)',
  },
}
const brandOf = (id) => BRAND[id] || BRAND.bkash

const M = {
  label: {
    display: 'block', fontFamily: "'Plus Jakarta Sans', sans-serif",
    fontSize: 10, fontWeight: 700, color: '#555555',
    letterSpacing: '0.1em', textTransform: 'uppercase', marginBottom: 6,
  },
  input: {
    width: '100%', padding: '11px 14px', borderRadius: 10,
    border: '1px solid #353437', background: '#1c1b1d', color: '#e5e1e4',
    fontFamily: "'Plus Jakarta Sans', sans-serif", fontSize: 13, fontWeight: 500,
    outline: 'none', boxSizing: 'border-box', WebkitTapHighlightColor: 'transparent',
  },
  select: {
    width: '100%', padding: '11px 14px', borderRadius: 10,
    border: '1px solid #353437', background: '#1c1b1d', color: '#e5e1e4',
    fontFamily: "'Plus Jakarta Sans', sans-serif", fontSize: 13, fontWeight: 500,
    outline: 'none', boxSizing: 'border-box', WebkitTapHighlightColor: 'transparent',
  },
  btnPrimary: {
    padding: '12px 0', borderRadius: 10, border: 'none',
    fontFamily: "'Plus Jakarta Sans', sans-serif", fontSize: 12, fontWeight: 700,
    cursor: 'pointer', boxShadow: 'none', width: '100%',
    display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 8,
    letterSpacing: '0.1em', textTransform: 'uppercase',
    WebkitTapHighlightColor: 'transparent',
  },
  btnGhost: {
    padding: '12px 0', borderRadius: 10,
    border: '1px solid #353437', background: 'transparent', color: '#889299',
    fontFamily: "'Plus Jakarta Sans', sans-serif", fontSize: 12, fontWeight: 700,
    cursor: 'pointer', width: '100%',
    letterSpacing: '0.1em', textTransform: 'uppercase',
    WebkitTapHighlightColor: 'transparent',
  },
  row: { display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 10, marginBottom: 14 },
  fullRow: { marginBottom: 14 },
  card: {
    borderRadius: 10, background: '#1c1b1d',
    border: '1px solid rgba(255,255,255,0.06)',
    boxShadow: 'inset 0 1px 0 rgba(255,255,255,0.03)',
  },
  infoBox: {
    padding: '10px 12px', borderRadius: 10, fontSize: 11,
    fontFamily: "'Plus Jakarta Sans', sans-serif", fontWeight: 500,
    display: 'flex', alignItems: 'flex-start', gap: 6, lineHeight: 1.5,
  },
  methodBtn: {
    padding: '14px 6px', borderRadius: 12,
    cursor: 'pointer', textAlign: 'center',
    WebkitTapHighlightColor: 'transparent',
  },
}

function isTeamMode(mode) {
  return mode === 'Duo' || mode === 'Squad' || mode === 'Clash Squad'
}

/* ═══════════════════════════════════════
   1. JOIN MATCH MODAL
   ═══════════════════════════════════════ */
export function JoinMatchModal({ matchId, data }) {
  const { state, dispatch, navigate } = useApp()
  const { currentUser, matches } = state
  const match = matches.find(m => m.id === matchId)
  const [names, setNames] = useState([''])
  const [teamName, setTeamName] = useState('')

  const team = match ? isTeamMode(match.mode) : false

  if (!match || !currentUser) return null

  const playersNeeded = requiredNameInputs(match.mode)
  const preview = calculateJoinPreview(currentUser.balance, match.mode, match.entryFee)

  if (names.length !== playersNeeded) {
    const arr = Array(playersNeeded).fill('')
    arr[0] = currentUser.ign || ''
    setNames(arr)
  }

  const updateName = (i, val) => setNames(prev => prev.map((n, idx) => idx === i ? val : n))

  const handleConfirm = () => {
    if (!preview.canAfford) return showToast(dispatch, 'Insufficient balance!', 'error')
    if (!names.every(n => n.trim())) return showToast(dispatch, 'Fill all player names!', 'error')
    if (team && !teamName.trim()) return showToast(dispatch, 'Team name is required!', 'error')
    dispatch({
      type: 'JOIN_MATCH',
      payload: { matchId: match.id, teamNames: names, teamName: teamName || '' },
    })
    dispatch({ type: 'CLOSE_MODAL' })
    showToast(dispatch, `Joined ${match.title}!`, 'success')
    navigate(`match-detail/${match.id}`)
  }

  return (
    <div>
      <div style={{
        ...M.card, padding: '14px 16px', marginBottom: 14,
        borderLeft: '4px solid #61cdff',
        background: 'linear-gradient(135deg, rgba(97,205,255,0.08) 0%, rgba(97,205,255,0.01) 70%), #1c1b1d',
      }}>
        <div style={{
          fontFamily: "'Lexend', sans-serif", fontSize: 15, fontWeight: 700, color: '#e5e1e4', marginBottom: 8,
          fontStyle: 'italic', textTransform: 'uppercase', letterSpacing: '-0.025em',
        }}>
          {match.title}
        </div>
        <div style={{ display: 'flex', gap: 14, flexWrap: 'wrap' }}>
          {[
            { label: 'Mode', value: match.mode, color: '#a78bfa' },
            { label: 'Map', value: match.map, color: '#61cdff' },
            { label: 'Entry', value: formatTK(match.entryFee), color: '#facc15' },
            { label: 'Slots', value: `${match.maxSlots - (match.joinedCount || 0)}`, color: '#4ade80' },
          ].map(item => (
            <div key={item.label} style={{
              fontSize: 11, color: '#555555',
              fontFamily: "'Plus Jakarta Sans', sans-serif", fontWeight: 600,
              textTransform: 'uppercase', letterSpacing: '0.06em',
            }}>
              {item.label}{' '}
              <span style={{
                fontWeight: 700, color: item.color,
                fontFamily: "'Inter', sans-serif", fontSize: 12,
              }}>
                {item.value}
              </span>
            </div>
          ))}
        </div>
      </div>

      {team && (
        <div style={M.fullRow}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 6 }}>
            <div style={{ width: 4, height: 16, background: '#FFC857', borderRadius: 2 }} />
            <label style={{ ...M.label, marginBottom: 0 }}>Team Name *</label>
          </div>
          <input
            style={{
              ...M.input,
              border: '1px solid rgba(255,200,87,0.3)',
              background: 'linear-gradient(135deg, rgba(255,200,87,0.05) 0%, rgba(255,200,87,0.01) 70%), #1c1b1d',
              color: '#FFC857',
              fontFamily: "'Inter', sans-serif", fontSize: 15, fontWeight: 700,
            }}
            placeholder="Enter your team name"
            value={teamName}
            onChange={e => setTeamName(e.target.value)}
          />
        </div>
      )}

      <div style={{
        ...M.infoBox, marginBottom: 14,
        background: 'linear-gradient(135deg, rgba(167,139,250,0.08) 0%, rgba(167,139,250,0.02) 60%), #2a2a2c',
        border: '1px solid rgba(167,139,250,0.12)',
        color: '#bdc8cf',
      }}>
        <i className="fa-solid fa-users" style={{ color: '#a78bfa', fontSize: 11, marginTop: 2, flexShrink: 0 }} />
        <span>{match.mode} — {playersNeeded} Player{playersNeeded > 1 ? 's' : ''} Required</span>
      </div>

      <div style={{ marginBottom: 14 }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 10 }}>
          <div style={{ width: 4, height: 16, background: '#61cdff', borderRadius: 2 }} />
          <label style={{ ...M.label, marginBottom: 0 }}>Player Names (IGN)</label>
        </div>
        {names.map((name, i) => (
          <div key={i} style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 8 }}>
            <div style={{
              width: 30, height: 30, borderRadius: 8, flexShrink: 0,
              background: i === 0 ? '#2a2a2c' : '#201f21',
              border: `1px solid ${i === 0 ? '#353437' : '#2a2a2c'}`,
              display: 'flex', alignItems: 'center', justifyContent: 'center',
              fontFamily: "'Inter', sans-serif", fontSize: 11, fontWeight: 700,
              color: i === 0 ? '#61cdff' : '#555555',
            }}>
              {i + 1}
            </div>
            <input
              style={M.input}
              placeholder={i === 0 ? 'Your IGN (auto-filled)' : `Player ${i + 1} IGN`}
              value={name}
              onChange={e => updateName(i, e.target.value)}
              readOnly={i === 0}
            />
            {i === 0 && (
              <span style={{
                fontSize: 9, fontFamily: "'Plus Jakarta Sans', sans-serif", fontWeight: 700,
                color: '#61cdff', padding: '5px 10px', borderRadius: 8,
                background: 'linear-gradient(135deg, rgba(97,205,255,0.12) 0%, rgba(97,205,255,0.03) 70%), #2a2a2c',
                whiteSpace: 'nowrap', flexShrink: 0,
                letterSpacing: '0.1em', textTransform: 'uppercase',
              }}>
                YOU
              </span>
            )}
          </div>
        ))}
      </div>

      <div style={{ borderRadius: 10, overflow: 'hidden', marginBottom: 14, border: '1px solid rgba(255,255,255,0.06)' }}>
        <div style={{
          padding: '8px 14px',
          background: 'linear-gradient(135deg, rgba(74,222,128,0.08) 0%, rgba(74,222,128,0.02) 60%), #1c1b1d',
          borderBottom: '1px solid rgba(255,255,255,0.04)',
          borderLeft: `3px solid ${preview.canAfford ? '#4ade80' : '#f87171'}`,
        }}>
          <span style={{
            fontSize: 10, fontWeight: 700, fontFamily: "'Plus Jakarta Sans', sans-serif",
            letterSpacing: '0.1em', textTransform: 'uppercase',
            color: preview.canAfford ? '#4ade80' : '#f87171',
          }}>
            Balance Calculation
          </span>
        </div>
        <div style={{ padding: '12px 14px', display: 'flex', flexDirection: 'column', gap: 8 }}>
          <div style={{ display: 'flex', justifyContent: 'space-between' }}>
            <span style={{ fontSize: 12, color: '#889299', fontFamily: "'Plus Jakarta Sans', sans-serif", fontWeight: 500 }}>Current Balance</span>
            <span style={{ fontFamily: "'Inter', sans-serif", fontSize: 13, fontWeight: 700, color: '#e5e1e4' }}>{formatTK(preview.currentBalance)}</span>
          </div>
          <div style={{ display: 'flex', justifyContent: 'space-between' }}>
            <span style={{ fontSize: 12, color: '#889299', fontFamily: "'Plus Jakarta Sans', sans-serif", fontWeight: 500 }}>Entry x {playersNeeded}</span>
            <span style={{ fontFamily: "'Inter', sans-serif", fontSize: 13, fontWeight: 700, color: '#f87171' }}>-{formatTK(preview.totalCost)}</span>
          </div>
          <div style={{ height: 1, background: '#2a2a2c' }} />
          {preview.canAfford ? (
            <div style={{ display: 'flex', justifyContent: 'space-between' }}>
              <span style={{ fontSize: 12, fontWeight: 600, color: '#4ade80', fontFamily: "'Plus Jakarta Sans', sans-serif" }}>After Join</span>
              <span style={{ fontFamily: "'Inter', sans-serif", fontSize: 15, fontWeight: 700, color: '#4ade80' }}>{formatTK(preview.remainingBalance)}</span>
            </div>
          ) : (
            <>
              <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                <span style={{ fontSize: 12, fontWeight: 600, color: '#f87171', fontFamily: "'Plus Jakarta Sans', sans-serif" }}>Shortage</span>
                <span style={{ fontFamily: "'Inter', sans-serif", fontSize: 15, fontWeight: 700, color: '#f87171' }}>{formatTK(preview.shortage)}</span>
              </div>
              <div style={{
                padding: '8px 10px', borderRadius: 8,
                background: 'linear-gradient(135deg, rgba(248,113,113,0.1) 0%, rgba(248,113,113,0.02) 60%), #201f21',
                border: '1px solid rgba(248,113,113,0.15)',
                fontSize: 11, color: '#f87171',
                fontFamily: "'Plus Jakarta Sans', sans-serif", fontWeight: 500, textAlign: 'center',
              }}>
                Insufficient balance. Add money first.
              </div>
            </>
          )}
        </div>
      </div>

      {/* ═══ PHASE 4.2: NO REFUND WARNING ═══ */}
      <div style={{
        borderRadius: 10, overflow: 'hidden', marginBottom: 14,
        border: '2px solid #f87171',
        background: 'linear-gradient(135deg, rgba(248,113,113,0.12) 0%, rgba(248,113,113,0.03) 60%), #1c1b1d',
        boxShadow: '0 0 20px rgba(248,113,113,0.08)',
      }}>
        <div style={{
          padding: '10px 14px',
          background: 'linear-gradient(135deg, rgba(248,113,113,0.15) 0%, rgba(248,113,113,0.05) 100%)',
          borderBottom: '1px solid rgba(248,113,113,0.2)',
          display: 'flex', alignItems: 'center', gap: 8,
        }}>
          <i className="fa-solid fa-shield-halved" style={{ color: '#f87171', fontSize: 14 }} />
          <span style={{
            fontFamily: "'Lexend', sans-serif", fontSize: 13, fontWeight: 700,
            color: '#f87171', letterSpacing: '0.06em', textTransform: 'uppercase',
          }}>
            No Refund Policy
          </span>
        </div>
        <div style={{ padding: '12px 14px' }}>
          <p style={{
            fontFamily: "'Plus Jakarta Sans', sans-serif", fontSize: 12,
            color: '#f87171', fontWeight: 700, margin: '0 0 8px 0', lineHeight: 1.4,
          }}>
            Entry fee is NON-REFUNDABLE once you join.
          </p>
          <ul style={{
            margin: 0, paddingLeft: 16,
            fontFamily: "'Plus Jakarta Sans', sans-serif", fontSize: 11,
            color: '#bdc8cf', fontWeight: 500, lineHeight: 1.8,
          }}>
            <li>No-show = No refund</li>
            <li>Disconnect / lag = No refund</li>
            <li>Match lost = No refund</li>
            <li>You <strong style={{ color: '#f87171' }}>cannot</strong> leave or cancel after joining</li>
          </ul>
          <p style={{
            fontFamily: "'Plus Jakarta Sans', sans-serif", fontSize: 11,
            color: '#4ade80', fontWeight: 600, margin: '10px 0 0 0',
            display: 'flex', alignItems: 'center', gap: 6,
          }}>
            <i className="fa-solid fa-circle-info" style={{ fontSize: 10 }} />
            Only admin-cancelled matches get full refund
          </p>
        </div>
      </div>
      {/* ═══ END PHASE 4.2 ═══ */}

      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 10 }}>
        <button style={M.btnGhost} onClick={() => dispatch({ type: 'CLOSE_MODAL' })}>Cancel</button>
        <button
          style={{
            ...M.btnPrimary,
            background: preview.canAfford ? '#61cdff' : '#201f21',
            color: preview.canAfford ? '#005572' : '#555555',
            border: preview.canAfford ? 'none' : '1px solid #2a2a2c',
            cursor: preview.canAfford ? 'pointer' : 'not-allowed',
          }}
          onClick={handleConfirm}
          disabled={!preview.canAfford}
        >
          <i className="fa-solid fa-bolt" /> Confirm
        </button>
      </div>
    </div>
  )
}

/* ═══════════════════════════════════════
   2. ADD MONEY MODAL
   ═══════════════════════════════════════ */
export function AddMoneyModal() {
  const { state, dispatch } = useApp()
  const { adminPayments, currentUser, pendingAddMoneyRequests, transactions } = state
  const [amount, setAmount] = useState('')
  const [method, setMethod] = useState('bkash')
  const [txId, setTxId] = useState('')
   const [copied, setCopied] = useState(false)
  const [senderNumber, setSenderNumber] = useState(currentUser?.phone || '')

  const brand = brandOf(method)
  const selectedMethod = ADD_MONEY_METHODS.find(m => m.id === method)
  const PAY_KEY = { bkash: 'bKash', nagad: 'Nagad', rocket: 'Rocket' }
  const adminNumber = adminPayments?.[PAY_KEY[method]] || ''

  const isNumberSet = adminNumber && adminNumber !== '' && adminNumber !== 'Not set by admin'

  const handleCopy = () => {
    const num = adminPayments?.[method] || ''
    if (!num || num === 'Not set by admin' || num === '') return
    if (navigator.clipboard) {
      navigator.clipboard.writeText(num).then(() => {
        setCopied(true)
        setTimeout(() => setCopied(false), 1500)
      })
    } else {
      const ta = document.createElement('textarea')
      ta.value = num
      ta.style.position = 'fixed'
      ta.style.opacity = '0'
      document.body.appendChild(ta)
      ta.select()
      document.execCommand('copy')
      document.body.removeChild(ta)
      setCopied(true)
      setTimeout(() => setCopied(false), 1500)
    }
  }

  // ═══ PHASE 1.7: Duplicate TXID check ═══
  const isTxIdDuplicate = (id) => {
    if (!id || id.trim().length < 6) return false
    const normalized = id.trim().toUpperCase()
    const inPending = (pendingAddMoneyRequests || []).some(
      r => r.txId && r.txId.toUpperCase() === normalized && r.status === 'pending'
    )
    if (inPending) return true
    const inTx = (transactions || []).some(
      t => t.txId && t.txId.toUpperCase() === normalized
    )
    return inTx
  }
  // ═══ END PHASE 1.7 ═══

  // ═══ PHASE 1.8: Deposit rate limiting (1 per 2 min) ═══
  const getRateLimitInfo = () => {
    if (state.rateLimited) {
      // Fallback to global state flag if context sets it
      return { blocked: true, waitSeconds: 120 }
    }
    const now = Date.now()
    const RATE_LIMIT_MS = 2 * 60 * 1000 // 2 minutes
    const myRequests = (pendingAddMoneyRequests || []).filter(
      r => r.userId === currentUser?.id && r.status === 'pending'
    )
    if (myRequests.length === 0) return { blocked: false, waitSeconds: 0 }
    const sorted = [...myRequests].sort((a, b) => {
      const tA = a.createdAt ? new Date(a.createdAt).getTime() : 0
      const tB = b.createdAt ? new Date(b.createdAt).getTime() : 0
      return tB - tA
    })
    const latest = sorted[0]
    const latestTime = latest?.createdAt ? new Date(latest.createdAt).getTime() : 0
    const elapsed = now - latestTime
    if (elapsed >= RATE_LIMIT_MS) return { blocked: false, waitSeconds: 0 }
    const remaining = Math.ceil((RATE_LIMIT_MS - elapsed) / 1000)
    return { blocked: true, waitSeconds: remaining }
  }
  const rateLimit = getRateLimitInfo()
  // ═══ END PHASE 1.8 ═══

  const handleSubmit = () => {
    if (!isNumberSet) return showToast(dispatch, 'Admin has not set payment number yet. Contact admin.', 'error')
    const amt = parseFloat(amount)
    if (!amt || amt < 10) return showToast(dispatch, 'Minimum amount is 10 TK', 'error')
      if (!senderNumber.trim() || senderNumber.trim().length < 11) return showToast(dispatch, 'Enter the number you sent money from', 'error')
    if (!txId.trim()) return showToast(dispatch, 'Enter transaction ID (TrxID) from your payment app', 'error')
    if (txId.trim().length < 6) return showToast(dispatch, 'Transaction ID seems too short', 'error')

    // ═══ PHASE 1.8: Rate limit check ═══
    if (rateLimit.blocked) {
      return showToast(dispatch, `Please wait ${rateLimit.waitSeconds}s before submitting another request`, 'error')
    }
    // ═══ END PHASE 1.8 ═══

    // ═══ PHASE 1.7: Duplicate TXID check ═══
    if (isTxIdDuplicate(txId)) {
      return showToast(dispatch, 'This Transaction ID has already been used! Check your payment history.', 'error')
    }
    // ═══ END PHASE 1.7 ═══

    dispatch({
      type: 'ADD_MONEY',
      payload: {
        amount: amt,
        method: method.toUpperCase(),
        txId: txId.trim(),
        senderNumber: senderNumber.trim(),
      }
    })
    dispatch({ type: 'CLOSE_MODAL' })
    showToast(dispatch, `${formatTK(amt)} request submitted! Wait for admin approval.`, 'success')
  }

  const SectionHead = ({ children }) => (
    <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 12 }}>
      <div style={{ width: 4, height: 12, background: '#61cdff', borderRadius: 9999, flexShrink: 0 }} />
      <h2 style={{
        fontFamily: "'Lexend', sans-serif", fontSize: 12, fontWeight: 600,
        letterSpacing: '0.08em', textTransform: 'uppercase', color: '#c6c6c6', margin: 0,
      }}>
        {children}
      </h2>
    </div>
  )

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 24 }}>

      <section>
        <SectionHead>Payment Method</SectionHead>
        <div style={{ display: 'flex', gap: 8 }}>
          {ADD_MONEY_METHODS.map(m => {
            const b = brandOf(m.id)
            const active = method === m.id
            return (
              <button
                key={m.id}
                onClick={() => setMethod(m.id)}
                style={{
                  flex: 1, height: 56, borderRadius: 12,
                  background: active ? b.primary : '#1b1b1d',
                  border: 'none',
                  display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 8,
                  cursor: 'pointer', WebkitTapHighlightColor: 'transparent',
                  minWidth: 0,
                }}
              >
                <i className={m.icon} style={{ fontSize: 20, color: active ? '#ffffff' : '#555555' }} />
                <span style={{
                  fontSize: 14, fontWeight: active ? 700 : 600,
                  fontFamily: "'Plus Jakarta Sans', sans-serif",
                  color: active ? '#ffffff' : '#555555',
                  whiteSpace: 'nowrap',
                }}>
                  {m.label}
                </span>
              </button>
            )
          })}
        </div>
      </section>

      <section style={{
        position: 'relative', borderRadius: 12, overflow: 'hidden',
        background: '#1b1b1d',
        borderLeft: `4px solid ${isNumberSet ? brand.primary : '#f87171'}`,
        boxShadow: '0 10px 25px rgba(0,0,0,0.3)',
      }}>
        <div style={{
          position: 'absolute', inset: 0,
          background: `linear-gradient(135deg, ${isNumberSet ? brand.primary : '#f87171'}26 0%, ${isNumberSet ? brand.primary : '#f87171'}00 100%)`,
          pointerEvents: 'none',
        }} />
        <div style={{ padding: 16, position: 'relative', zIndex: 1 }}>
          <p style={{
            fontFamily: "'Lexend', sans-serif", fontSize: 10, fontWeight: 600,
            letterSpacing: '0.12em', textTransform: 'uppercase',
            color: '#c6c6c6', marginBottom: 4, margin: '0 0 4px 0',
          }}>
            Send Money To
          </p>
          {isNumberSet ? (
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
              <p style={{
                fontFamily: "'Inter', sans-serif", fontSize: 22, fontWeight: 700,
                color: brand.primary, letterSpacing: '-0.01em', margin: 0,
                wordBreak: 'break-all',
              }}>
                {adminNumber}
              </p>
              <button
                onClick={handleCopy}
                style={{
                  padding: 8, borderRadius: 8,
                  background: 'rgba(53,52,55,0.5)',
                  border: 'none', cursor: 'pointer',
                  display: 'flex', alignItems: 'center', justifyContent: 'center',
                  WebkitTapHighlightColor: 'transparent', flexShrink: 0, marginLeft: 12,
                }}
              >
                <i
                  className={copied ? 'fa-solid fa-check' : 'fa-regular fa-copy'}
                  style={{ fontSize: 14, color: copied ? '#4ade80' : '#c6c6c6' }}
                />
              </button>
            </div>
          ) : (
            <p style={{
              fontFamily: "'Plus Jakarta Sans', sans-serif", fontSize: 14, fontWeight: 600,
              color: '#f87171', margin: 0,
            }}>
              <i className="fa-solid fa-triangle-exclamation" style={{ marginRight: 6 }} />
              Not set by admin
            </p>
          )}
        </div>
      </section>

      {!isNumberSet && (
        <section style={{
          background: 'linear-gradient(135deg, rgba(248,113,113,0.08) 0%, rgba(248,113,113,0.02) 60%), #1b1b1d',
          borderLeft: '3px solid #f87171',
          padding: 12, borderRadius: 8,
          display: 'flex', gap: 10, alignItems: 'flex-start',
        }}>
          <i className="fa-solid fa-circle-exclamation" style={{
            color: '#f87171', fontSize: 16, flexShrink: 0, marginTop: 1,
          }} />
          <p style={{
            fontFamily: "'Plus Jakarta Sans', sans-serif",
            fontSize: 12, color: '#f87171', lineHeight: 1.6, margin: 0,
          }}>
            Admin has not set a {selectedMethod?.label || method.toUpperCase()} number yet. You cannot add money right now. Please contact admin to set the payment number first.
          </p>
        </section>
      )}

      {/* ═══ PHASE 1.8: Rate limit warning banner ═══ */}
      {rateLimit.blocked && (
        <section style={{
          background: 'linear-gradient(135deg, rgba(248,113,113,0.08) 0%, rgba(248,113,113,0.02) 60%), #1b1b1d',
          borderLeft: '3px solid #f87171',
          padding: 12, borderRadius: 8,
          display: 'flex', gap: 10, alignItems: 'flex-start',
        }}>
          <i className="fa-solid fa-clock" style={{
            color: '#f87171', fontSize: 16, flexShrink: 0, marginTop: 1,
          }} />
          <p style={{
            fontFamily: "'Plus Jakarta Sans', sans-serif",
            fontSize: 12, color: '#f87171', lineHeight: 1.6, margin: 0,
          }}>
            <strong>Slow down!</strong> You can only submit one add money request every 2 minutes. Please wait <strong>{rateLimit.waitSeconds}s</strong> before submitting again.
          </p>
        </section>
      )}
      {/* ═══ END PHASE 1.8 ═══ */}

            <section>
        <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 8 }}>
          <div style={{ width: 4, height: 12, background: brand.primary, borderRadius: 9999, flexShrink: 0 }} />
          <label style={{
            fontFamily: "'Lexend', sans-serif", fontSize: 10, fontWeight: 600,
            letterSpacing: '0.12em', textTransform: 'uppercase', color: '#c6c6c6', margin: 0,
          }}>
            Your {selectedMethod?.label || method.toUpperCase()} Number *
          </label>
        </div>
        <input
          style={{
            width: '100%', height: 52,
            borderRadius: 12,
            border: `1px solid ${brand.primary}33`,
            background: `${brand.primary}08`,
            padding: '0 16px',
            fontFamily: "'Inter', sans-serif", fontSize: 16, fontWeight: 700,
            color: brand.primary,
            outline: 'none', boxSizing: 'border-box',
            WebkitTapHighlightColor: 'transparent',
          }}
          placeholder="01XXXXXXXXX"
          type="tel"
          value={senderNumber}
          onChange={e => setSenderNumber(e.target.value)}
          maxLength={14}
        />
        <p style={{
          fontFamily: "'Plus Jakarta Sans', sans-serif",
          fontSize: 10, color: '#555555', margin: '6px 0 0 0',
          fontWeight: 500,
        }}>
          <i className="fa-solid fa-circle-info" style={{ marginRight: 4 }} />
          The number you used to send money (so admin can verify)
        </p>
      </section>

      <section>
        <SectionHead>Select Amount</SectionHead>
        <div style={{
          display: 'flex', gap: 8, overflowX: 'auto',
          paddingBottom: 4,
          msOverflowStyle: 'none', scrollbarWidth: 'none',
        }}>
          <style>{`.am-scroll::-webkit-scrollbar{display:none}`}</style>
          <div className="am-scroll" style={{ display: 'flex', gap: 8 }}>
            {ADD_AMOUNT_PRESETS.map(p => {
              const active = String(amount) === String(p)
              return (
                <button
                  key={p}
                  onClick={() => setAmount(String(p))}
                  style={{
                    width: 60, height: 40, borderRadius: 10, flexShrink: 0,
                    border: active ? `1px solid ${brand.primary}` : 'none',
                    background: active ? `${brand.primary}1a` : '#1b1b1d',
                    color: active ? brand.primary : '#555555',
                    fontFamily: "'Inter', sans-serif", fontSize: 14, fontWeight: 700,
                    cursor: 'pointer', WebkitTapHighlightColor: 'transparent',
                  }}
                >
                  {p}
                </button>
              )
            })}
          </div>
        </div>
      </section>

      <section>
        <label style={{
          display: 'block', fontFamily: "'Lexend', sans-serif",
          fontSize: 10, fontWeight: 600, letterSpacing: '0.12em',
          textTransform: 'uppercase', color: '#c6c6c6', marginBottom: 8,
        }}>
          Custom Amount (TK)
        </label>
        <div style={{ position: 'relative', background: '#1b1b1d', borderRadius: 12 }}>
          <span style={{
            position: 'absolute', left: 16, top: '50%', transform: 'translateY(-50%)',
            fontFamily: "'Inter', sans-serif", fontSize: 18, fontWeight: 700,
            color: '#c6c6c6', pointerEvents: 'none', zIndex: 1,
          }}>৳</span>
          <input
            style={{
              width: '100%', height: 56,
              borderRadius: 12, border: '1px solid #353437',
              background: 'transparent',
              paddingLeft: 40, paddingRight: 16,
              fontFamily: "'Inter', sans-serif", fontSize: 18, fontWeight: 700,
              color: '#e5e1e4',
              outline: 'none', boxSizing: 'border-box',
              WebkitTapHighlightColor: 'transparent',
            }}
            placeholder="0"
            type="number"
            value={amount}
            onChange={e => setAmount(e.target.value)}
          />
        </div>
      </section>

      <section>
        <label style={{
          display: 'block', fontFamily: "'Lexend', sans-serif",
          fontSize: 10, fontWeight: 600, letterSpacing: '0.12em',
          textTransform: 'uppercase', color: '#c6c6c6', marginBottom: 8,
        }}>
          Transaction ID (TrxID) *
        </label>
        <div style={{ background: '#1b1b1d', borderRadius: 12 }}>
          <input
            style={{
              width: '100%', height: 56,
              borderRadius: 12,
              border: isTxIdDuplicate(txId) ? '1px solid #f87171' : '1px solid #353437',
              background: isTxIdDuplicate(txId) ? 'rgba(248,113,113,0.04)' : 'transparent',
              padding: '0 16px',
              fontFamily: "'Plus Jakarta Sans', sans-serif", fontSize: 14, fontWeight: 700,
              color: '#e5e1e4',
              textTransform: 'uppercase',
              outline: 'none', boxSizing: 'border-box',
              WebkitTapHighlightColor: 'transparent',
            }}
            placeholder="e.g. N123456789"
            type="text"
            value={txId}
            onChange={e => setTxId(e.target.value)}
          />
        </div>
        {isTxIdDuplicate(txId) && (
          <p style={{
            fontFamily: "'Plus Jakarta Sans', sans-serif",
            fontSize: 11, color: '#f87171', margin: '6px 0 0 0',
            fontWeight: 600, display: 'flex', alignItems: 'center', gap: 4,
          }}>
            <i className="fa-solid fa-triangle-exclamation" />
            This TXID is already used! You cannot reuse a transaction ID.
          </p>
        )}
        <p style={{
          fontFamily: "'Plus Jakarta Sans', sans-serif",
          fontSize: 10, color: '#555555', margin: '6px 0 0 0',
          fontWeight: 500,
        }}>
          <i className="fa-solid fa-circle-info" style={{ marginRight: 4 }} />
          Find this in your {selectedMethod?.label || method.toUpperCase()} payment history/sms
        </p>
      </section>

      <section style={{
        background: '#1b1b1d',
        borderLeft: '2px solid #facc15',
        padding: 12, borderRadius: 8,
        display: 'flex', gap: 12, alignItems: 'flex-start',
      }}>
        <i className="fa-solid fa-circle-info" style={{
          color: '#facc15', fontSize: 18, flexShrink: 0, marginTop: 1,
        }} />
        <p style={{
          fontFamily: "'Plus Jakarta Sans', sans-serif",
          fontSize: 12, color: '#c6c6c6', lineHeight: 1.6, margin: 0,
        }}>
          <strong style={{ color: '#e5e1e4' }}>Step 1:</strong> Send {amount || '___'} TK to the number above via {selectedMethod?.label || method.toUpperCase()}.<br />
          <strong style={{ color: '#e5e1e4' }}>Step 2:</strong> Enter YOUR number (the one you sent from).<br />
          <strong style={{ color: '#e5e1e4' }}>Step 3:</strong> Copy the TrxID from your payment app.<br />
          <strong style={{ color: '#e5e1e4' }}>Step 4:</strong> Paste it below and submit.<br />
          <strong style={{ color: '#facc15' }}>Note:</strong> Balance will update only after admin verifies your payment.
        </p>
      </section>

      <div style={{ display: 'flex', gap: 12 }}>
        <button
          style={{
            flex: 1, height: 56, borderRadius: 12,
            border: '1px solid #353437',
            background: 'transparent',
            color: '#e5e1e4',
            fontFamily: "'Lexend', sans-serif", fontSize: 14, fontWeight: 700,
            letterSpacing: '0.08em', textTransform: 'uppercase',
            cursor: 'pointer', WebkitTapHighlightColor: 'transparent',
            minWidth: 0,
          }}
          onClick={() => dispatch({ type: 'CLOSE_MODAL' })}
        >
          Cancel
        </button>
        <button
          style={{
            flex: 1, height: 56, borderRadius: 12,
            border: 'none',
            background: (isNumberSet && !isTxIdDuplicate(txId) && !rateLimit.blocked) ? brand.primary : '#2a2a2c',
            color: (isNumberSet && !isTxIdDuplicate(txId) && !rateLimit.blocked) ? '#ffffff' : '#555555',
            fontFamily: "'Lexend', sans-serif", fontSize: 14, fontWeight: 700,
            letterSpacing: '0.08em', textTransform: 'uppercase',
            cursor: (isNumberSet && !isTxIdDuplicate(txId) && !rateLimit.blocked) ? 'pointer' : 'not-allowed',
            display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 8,
            WebkitTapHighlightColor: 'transparent',
            minWidth: 0,
          }}
          onClick={handleSubmit}
          disabled={!isNumberSet || isTxIdDuplicate(txId) || rateLimit.blocked}
        >
          <i className="fa-solid fa-paper-plane" style={{ fontSize: 16 }} />
          Submit Request
        </button>
      </div>
    </div>
  )
}

/* ═══════════════════════════════════════
   3. WITHDRAW MODAL
   ═══════════════════════════════════════ */
export function WithdrawModal() {
  const { state, dispatch } = useApp()
  const { currentUser } = state
  const [amount, setAmount] = useState('')
  const [method, setMethod] = useState('bkash')
  const [number, setNumber] = useState(currentUser?.phone || '')

  if (!currentUser) return null

  const handleSubmit = () => {
    const amt = parseFloat(amount)
    if (!amt || amt < 50) return showToast(dispatch, 'Minimum withdrawal is 50 TK', 'error')
    if (amt > currentUser.balance) return showToast(dispatch, 'Insufficient balance', 'error')
    if (!number.trim() || number.trim().length < 11) return showToast(dispatch, 'Enter valid account number', 'error')
    dispatch({ type: 'WITHDRAW', payload: { amount: amt, method: method.toUpperCase(), account: number.trim() } })
    dispatch({ type: 'CLOSE_MODAL' })
    showToast(dispatch, `Withdrawal of ${formatTK(amt)} requested`, 'success')
  }

  const brand = brandOf(method)

  return (
    <div>
      <div style={{
        borderRadius: 10, padding: '18px 16px', marginBottom: 14, textAlign: 'center',
        background: 'linear-gradient(135deg, rgba(250,204,21,0.08) 0%, rgba(250,204,21,0.02) 60%), #1c1b1d',
        border: '1px solid rgba(250,204,21,0.15)',
        borderLeft: '4px solid #facc15',
        boxShadow: 'inset 0 1px 0 rgba(255,255,255,0.04)',
      }}>
        <div style={{
          fontSize: 10, color: '#555555',
          fontFamily: "'Plus Jakarta Sans', sans-serif",
          letterSpacing: '0.12em', textTransform: 'uppercase', marginBottom: 6, fontWeight: 700,
        }}>
          Available Balance
        </div>
        <div style={{
          fontFamily: "'Inter', sans-serif", fontSize: 30, fontWeight: 700, color: '#e5e1e4',
        }}>
          {formatTK(currentUser.balance)}{' '}
          <span style={{ fontSize: 15, color: '#facc15', fontWeight: 700 }}>TK</span>
        </div>
      </div>

      <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 10 }}>
        <div style={{ width: 4, height: 16, background: '#61cdff', borderRadius: 2 }} />
        <label style={{ ...M.label, marginBottom: 0 }}>Withdraw Method</label>
      </div>

      <div style={{
        display: 'grid',
        gridTemplateColumns: `repeat(${WITHDRAW_METHODS.length}, 1fr)`,
        gap: 8, marginBottom: 14,
      }}>
        {WITHDRAW_METHODS.map(m => {
          const b = brandOf(m.id)
          const active = method === m.id
          return (
            <button
              key={m.id}
              onClick={() => setMethod(m.id)}
              style={{
                ...M.methodBtn,
                border: `1px solid ${active ? b.primary : '#353437'}`,
                background: active ? b.primary : '#1c1b1d',
              }}
            >
              <i className={m.icon} style={{
                fontSize: 20, color: active ? '#fff' : '#555555',
                display: 'block', marginBottom: 5,
              }} />
              <span style={{
                fontSize: 10, fontWeight: 700,
                fontFamily: "'Plus Jakarta Sans', sans-serif",
                color: active ? '#fff' : '#555555',
                letterSpacing: '0.08em', textTransform: 'uppercase',
              }}>
                {m.label}
              </span>
            </button>
          )
        })}
      </div>

      <div style={M.fullRow}>
        <label style={M.label}>Amount (TK) — Min 50</label>
        <input style={M.input} type="number" placeholder="Enter amount" min="50" max={currentUser.balance} value={amount} onChange={e => setAmount(e.target.value)} />
      </div>

      <div style={M.fullRow}>
        <label style={M.label}>Account Number</label>
        <input style={M.input} placeholder="01XXXXXXXXX" value={number} onChange={e => setNumber(e.target.value)} />
      </div>

      {currentUser.phone && (
        <div style={{
          ...M.infoBox, marginBottom: 14,
          background: 'linear-gradient(135deg, rgba(74,222,128,0.06) 0%, rgba(74,222,128,0.01) 60%), #201f21',
          border: '1px solid rgba(74,222,128,0.1)', color: '#889299',
        }}>
          <i className="fa-solid fa-circle-check" style={{ fontSize: 10, marginTop: 2, flexShrink: 0, color: '#4ade80' }} />
          Your registered number: <strong style={{ color: '#4ade80' }}>{currentUser.phone}</strong>
        </div>
      )}

      <div style={{
        ...M.infoBox, marginBottom: 16,
        background: 'linear-gradient(135deg, rgba(250,204,21,0.06) 0%, rgba(250,204,21,0.01) 60%), #201f21',
        border: '1px solid rgba(250,204,21,0.1)', color: '#facc15',
      }}>
        <i className="fa-solid fa-triangle-exclamation" style={{ fontSize: 10, marginTop: 2, flexShrink: 0 }} />
        Withdrawal will be reviewed by admin before processing. Usually takes 1-24 hours.
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 10 }}>
        <button style={M.btnGhost} onClick={() => dispatch({ type: 'CLOSE_MODAL' })}>Cancel</button>
        <button style={{
          ...M.btnPrimary, background: brand.primary, color: '#fff',
        }} onClick={handleSubmit}>
          <i className="fa-solid fa-arrow-up-from-bracket" /> Withdraw
        </button>
      </div>
    </div>
  )
}

/* ═══════════════════════════════════════
   4. CREATE MATCH MODAL
   ═══════════════════════════════════════ */
export function CreateMatchModal({ isEdit, matchId }) {
  const { state, dispatch } = useApp()
  const editMatch = isEdit ? state.matches.find(m => m.id === matchId) : null

  const [form, setForm] = useState({
    title: editMatch?.title || '',
    gameType: editMatch?.gameType || 'BR',
    mode: editMatch?.mode || 'Solo',
    map: editMatch?.map || 'Bermuda',
    entryFee: editMatch?.entryFee?.toString() || '30',
    maxSlots: editMatch?.maxSlots?.toString() || '50',
    perKill: editMatch?.perKill?.toString() || '10',
    include4th: editMatch?.include4th ?? true,
    include5th: editMatch?.include5th ?? true,
    startTime: editMatch?.startTime || '',
  })

  const update = (k, v) => {
    const next = { ...form, [k]: v }
    if (k === 'gameType' && v === 'CS') { next.mode = 'Clash Squad'; next.maxSlots = '12' }
    if (k === 'gameType' && v === 'BR') { next.mode = 'Solo'; next.maxSlots = '50' }
    if (k === 'mode') { next.maxSlots = String(maxSlotsForMode(v)) }
    setForm(next)
  }
  const toggle = (k) => setForm(p => ({ ...p, [k]: !p[k] }))

  const fee = parseFloat(form.entryFee) || 0
  const slots = parseInt(form.maxSlots) || 0
  const collection = fee * slots
  const profit = Math.round(collection * 0.20)
  const pool = collection - profit
  const availableModes = FF_GAME_TYPES.find(g => g.value === form.gameType)?.modes || []

  const handleSubmit = () => {
    if (!form.title.trim()) return showToast(dispatch, 'Enter match title', 'error')
    if (!fee || fee < 10) return showToast(dispatch, 'Min fee 10 TK', 'error')
    if (!slots || slots < 2) return showToast(dispatch, 'Min 2 slots', 'error')
    const payload = {
      ...form, entryFee: fee, maxSlots: slots, perKill: Number(form.perKill),
      startTime: form.startTime || new Date(Date.now() + 7200000).toISOString().slice(0, 16).replace('T', ' '),
    }
    if (isEdit && editMatch) {
      dispatch({ type: 'UPDATE_MATCH', payload: { id: editMatch.id, ...payload } })
      showToast(dispatch, `"${form.title}" updated!`, 'success')
    } else {
      dispatch({ type: 'CREATE_MATCH', payload })
      showToast(dispatch, `"${form.title}" created!`, 'success')
    }
    dispatch({ type: 'CLOSE_MODAL' })
  }

  return (
    <div>
      <div style={{
        borderRadius: 10, marginBottom: 14,
        background: 'linear-gradient(135deg, rgba(250,204,21,0.08) 0%, rgba(250,204,21,0.02) 60%), #1c1b1d',
        border: '1px solid rgba(250,204,21,0.12)',
        borderLeft: '4px solid #facc15',
        overflow: 'hidden',
        boxShadow: 'inset 0 1px 0 rgba(255,255,255,0.04)',
      }}>
        <div style={{ padding: '8px 14px', borderBottom: '1px solid rgba(255,255,255,0.04)' }}>
          <span style={{
            fontSize: 10, fontWeight: 700, fontFamily: "'Plus Jakarta Sans', sans-serif",
            letterSpacing: '0.1em', textTransform: 'uppercase', color: '#555555',
          }}>
            <i className="fa-solid fa-eye" style={{ marginRight: 6 }} />Live Calculation
          </span>
        </div>
        <div style={{ padding: '12px 14px', display: 'flex', flexDirection: 'column', gap: 8 }}>
          {[
            { label: 'Total Collection', value: formatTK(collection), color: '#e5e1e4' },
            ...(state.isAdmin ? [{ label: 'Admin Profit (20%)', value: formatTK(profit), color: '#4ade80' }] : []),
          ].map(r => (
            <div key={r.label} style={{ display: 'flex', justifyContent: 'space-between' }}>
              <span style={{ fontSize: 12, color: '#889299', fontFamily: "'Plus Jakarta Sans', sans-serif", fontWeight: 500 }}>{r.label}</span>
              <span style={{ fontFamily: "'Inter', sans-serif", fontSize: 13, fontWeight: 700, color: r.color }}>{r.value}</span>
            </div>
          ))}
          <div style={{ height: 1, background: '#2a2a2c' }} />
          <div style={{ display: 'flex', justifyContent: 'space-between' }}>
            <span style={{ fontSize: 12, fontWeight: 600, color: '#facc15', fontFamily: "'Plus Jakarta Sans', sans-serif" }}>Prize Pool</span>
            <span style={{ fontFamily: "'Inter', sans-serif", fontSize: 18, fontWeight: 700, color: '#facc15' }}>
              {formatTK(pool)}
            </span>
          </div>
        </div>
      </div>

      <div style={M.fullRow}>
        <label style={M.label}>Match Title *</label>
        <input style={M.input} placeholder="e.g. Bermuda Rush Solo" value={form.title} onChange={e => update('title', e.target.value)} />
      </div>

      <div style={M.row}>
        <div>
          <label style={M.label}>Game Type</label>
          <select style={M.select} value={form.gameType} onChange={e => update('gameType', e.target.value)}>
            {FF_GAME_TYPES.map(g => <option key={g.value} value={g.value}>{g.label}</option>)}
          </select>
        </div>
        <div>
          <label style={M.label}>Mode</label>
          <select style={M.select} value={form.mode} onChange={e => update('mode', e.target.value)}>
            {availableModes.map(m => <option key={m} value={m}>{m}</option>)}
          </select>
        </div>
      </div>

      <div style={M.row}>
        <div>
          <label style={M.label}>Map</label>
          <select style={M.select} value={form.map} onChange={e => update('map', e.target.value)}>
            {FF_MAPS.map(m => <option key={m} value={m}>{m}</option>)}
          </select>
        </div>
        <div>
          <label style={M.label}>Start Time</label>
          <input style={{ ...M.input, colorScheme: 'dark' }} type="datetime-local" value={form.startTime} onChange={e => update('startTime', e.target.value)} />
        </div>
      </div>

      <div style={M.row}>
        <div>
          <label style={M.label}>Entry Fee (TK) *</label>
          <input style={M.input} type="number" min="10" value={form.entryFee} onChange={e => update('entryFee', e.target.value)} />
        </div>
        <div>
          <label style={M.label}>Max Slots *</label>
          <input style={M.input} type="number" min="2" value={form.maxSlots} onChange={e => update('maxSlots', e.target.value)} />
        </div>
      </div>

      <div style={M.row}>
        <div>
          <label style={M.label}>Per Kill (TK)</label>
          <select style={M.select} value={form.perKill} onChange={e => update('perKill', e.target.value)}>
            {KILL_REWARDS.map(k => <option key={k} value={k}>{k} TK</option>)}
          </select>
        </div>
        <div style={{ display: 'flex', alignItems: 'flex-end', paddingBottom: 2 }}>
          <span style={{ fontSize: 11, color: '#555555', fontFamily: "'Plus Jakarta Sans', sans-serif", fontWeight: 600 }}>
            Auto slots: {maxSlotsForMode(form.mode)}
          </span>
        </div>
      </div>

      {form.gameType === 'BR' && (
        <div style={{ display: 'flex', gap: 20, marginBottom: 14 }}>
          {['include4th', 'include5th'].map(key => (
            <div key={key} onClick={() => toggle(key)} style={{ display: 'flex', alignItems: 'center', gap: 8, cursor: 'pointer', WebkitTapHighlightColor: 'transparent' }}>
              <div style={{
                width: 38, height: 22, borderRadius: 11,
                background: form[key] ? '#61cdff' : '#2a2a2c',
                border: form[key] ? 'none' : '1px solid #353437',
                position: 'relative',
              }}>
                <div style={{
                  width: 16, height: 16, borderRadius: 8, background: form[key] ? '#005572' : '#555555',
                  position: 'absolute', top: 3, left: form[key] ? 19 : 3,
                }} />
              </div>
              <span style={{
                fontSize: 12, color: form[key] ? '#e5e1e4' : '#555555',
                fontFamily: "'Plus Jakarta Sans', sans-serif", fontWeight: 600,
              }}>
                {key === 'include4th' ? '4th (10%)' : '5th (5%)'}
              </span>
            </div>
          ))}
        </div>
      )}

      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 10 }}>
        <button style={M.btnGhost} onClick={() => dispatch({ type: 'CLOSE_MODAL' })}>Cancel</button>
        <button style={{ ...M.btnPrimary, background: '#61cdff', color: '#005572' }} onClick={handleSubmit}>
          <i className="fa-solid fa-plus" /> {isEdit ? 'Update' : 'Create'} Match
        </button>
      </div>
    </div>
  )
}

/* ═══════════════════════════════════════
   5. ROOM MODAL
   ═══════════════════════════════════════ */
export function RoomModal({ matchId }) {
  const { state, dispatch } = useApp()
  const match = state.matches.find(m => m.id === matchId)
  const [roomId, setRoomId] = useState(match?.roomId || '')
  const [password, setPassword] = useState(match?.roomPassword || '')

  if (!match) return null

  const handleSave = () => {
    dispatch({ type: 'SET_ROOM_CREDENTIALS', payload: { matchId: match.id, roomId: roomId.trim(), roomPassword: password.trim() } })
    dispatch({ type: 'CLOSE_MODAL' })
    showToast(dispatch, 'Room credentials saved!', 'success')
  }

  return (
    <div>
      <div style={{
        borderRadius: 10, padding: '14px 16px', marginBottom: 14,
        background: 'linear-gradient(135deg, rgba(250,204,21,0.08) 0%, rgba(250,204,21,0.02) 60%), #1c1b1d',
        border: '1px solid rgba(250,204,21,0.12)',
        borderLeft: '4px solid #facc15',
        boxShadow: 'inset 0 1px 0 rgba(255,255,255,0.04)',
      }}>
        <div style={{
          fontFamily: "'Lexend', sans-serif", fontSize: 15, fontWeight: 700,
          color: '#e5e1e4', marginBottom: 4,
          fontStyle: 'italic', textTransform: 'uppercase', letterSpacing: '-0.025em',
        }}>
          {match.title}
        </div>
        <div style={{ fontSize: 12, color: '#555555', fontFamily: "'Plus Jakarta Sans', sans-serif", fontWeight: 600 }}>
          {match.mode} • {match.map}
        </div>
      </div>

      <div style={M.fullRow}>
        <label style={{ ...M.label, display: 'flex', alignItems: 'center', gap: 6 }}>
          <i className="fa-solid fa-key" style={{ color: '#61cdff', fontSize: 10 }} /> Room ID
        </label>
        <input
          style={{ ...M.input, fontFamily: "'Inter', sans-serif", fontSize: 20, fontWeight: 700, letterSpacing: '0.05em', textAlign: 'center', color: '#61cdff' }}
          placeholder="Type Room ID here"
          value={roomId}
          onChange={e => setRoomId(e.target.value)}
        />
      </div>

      <div style={M.fullRow}>
        <label style={{ ...M.label, display: 'flex', alignItems: 'center', gap: 6 }}>
          <i className="fa-solid fa-shield-halved" style={{ color: '#4ade80', fontSize: 10 }} /> Password
        </label>
        <input
          style={{ ...M.input, fontFamily: "'Inter', sans-serif", fontSize: 20, fontWeight: 700, letterSpacing: '0.05em', textAlign: 'center', color: '#4ade80' }}
          placeholder="Type Password here"
          value={password}
          onChange={e => setPassword(e.target.value)}
        />
      </div>

      <div style={{
        ...M.infoBox, marginBottom: 14,
        background: 'linear-gradient(135deg, rgba(248,113,113,0.06) 0%, rgba(248,113,113,0.01) 60%), #201f21',
        border: '1px solid rgba(248,113,113,0.1)', color: '#f87171',
      }}>
        <i className="fa-solid fa-ban" style={{ fontSize: 10, marginTop: 2, flexShrink: 0 }} />
        No copy button. Users see these 10 minutes before match.
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 10 }}>
        <button style={M.btnGhost} onClick={() => dispatch({ type: 'CLOSE_MODAL' })}>Cancel</button>
        <button style={{ ...M.btnPrimary, background: '#4ade80', color: '#052e16' }} onClick={handleSave}>
          <i className="fa-solid fa-save" /> Save
        </button>
      </div>
    </div>
  )
}

/* ═══════════════════════════════════════
   6. RESULT MODAL
   ═══════════════════════════════════════ */
export function ResultModal({ matchId }) {
  const { state, dispatch } = useApp()
  const match = state.matches.find(m => m.id === matchId)

  if (!match) return null

  const team = isTeamMode(match.mode)

  return (
    <div>
      <div style={{
        borderRadius: 10, padding: '14px 16px', marginBottom: 14, textAlign: 'center',
        background: 'linear-gradient(135deg, rgba(74,222,128,0.08) 0%, rgba(74,222,128,0.02) 60%), #1c1b1d',
        border: '1px solid rgba(74,222,128,0.12)',
        borderLeft: '4px solid #4ade80',
        boxShadow: 'inset 0 1px 0 rgba(255,255,255,0.04)',
      }}>
        <div style={{
          fontFamily: "'Lexend', sans-serif", fontSize: 15, fontWeight: 700,
          color: '#e5e1e4', marginBottom: 4,
          fontStyle: 'italic', textTransform: 'uppercase', letterSpacing: '-0.025em',
        }}>
          {match.title}
        </div>
        <div style={{
          fontSize: 11, color: '#555555',
          fontFamily: "'Plus Jakarta Sans', sans-serif", fontWeight: 600,
          textTransform: 'uppercase', letterSpacing: '0.06em',
        }}>
          {match.mode} • {match.map} • {match.result?.method === 'screenshot' ? 'Screenshot' : 'Manual'}
        </div>
      </div>

      {match.result?.players?.length > 0 ? (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 4, marginBottom: 14 }}>
          <div style={{
            display: 'grid',
            gridTemplateColumns: team ? '36px 1fr 50px' : '36px 1fr 50px',
            gap: 8,
            padding: '8px 14px', borderRadius: 10, background: '#201f21',
          }}>
            <span style={{ ...M.label, marginBottom: 0 }}>#</span>
            <span style={{ ...M.label, marginBottom: 0 }}>{team ? 'Team' : 'Player'}</span>
            <span style={{ ...M.label, marginBottom: 0, textAlign: 'center' }}>{team ? 'Pts' : 'Kills'}</span>
          </div>
          {match.result.players.map((p, i) => {
            const colors = ['#facc15', '#bdc8cf', '#cd7f32', '#889299', '#555555']
            return (
              <div key={i} style={{
                display: 'grid',
                gridTemplateColumns: team ? '36px 1fr 50px' : '36px 1fr 50px',
                gap: 8,
                padding: '10px 14px', borderRadius: 10,
                background: i === 0 ? '#1c1b1d' : '#131315',
              }}>
                <span style={{ fontSize: 14, fontFamily: "'Inter', sans-serif", fontWeight: 700, color: colors[i] || '#555555' }}>{p.position}</span>
                <span style={{
                  fontFamily: "'Plus Jakarta Sans', sans-serif", fontSize: 13, fontWeight: 600, color: colors[i] || '#555555',
                  overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap',
                }}>
                  {p.teamName && team ? (
                    <span style={{ color: '#FFC857' }}>{p.teamName}</span>
                  ) : null}
                  {p.teamName && p.ign ? ' — ' : ''}{p.ign}
                </span>
                <span style={{
                  fontFamily: "'Inter', sans-serif", fontSize: 13, fontWeight: 700, color: colors[i] || '#555555', textAlign: 'center',
                }}>
                  {team ? (p.points != null ? p.points : p.kills) : p.kills}
                </span>
              </div>
            )
          })}
        </div>
      ) : (
        <div style={{
          textAlign: 'center', padding: '30px 0', color: '#555555',
          fontFamily: "'Plus Jakarta Sans', sans-serif", fontWeight: 500, fontSize: 13,
        }}>
          No result data available
        </div>
      )}

      <button style={{ ...M.btnPrimary, background: '#61cdff', color: '#005572' }} onClick={() => dispatch({ type: 'CLOSE_MODAL' })}>
        <i className="fa-solid fa-check" /> Close
      </button>
    </div>
  )
}

/* ═══════════════════════════════════════
   7. ADJUST BALANCE MODAL
   ═══════════════════════════════════════ */
export function AdjustBalanceModal({ userId }) {
  const { state, dispatch } = useApp()
  const user = state.users.find(u => u.id === userId)
  const [action, setAction] = useState('add')
  const [amount, setAmount] = useState('')
  const [reason, setReason] = useState('')

  if (!user) return null

  const handleSubmit = () => {
    const amt = parseFloat(amount)
    if (!amt || amt <= 0) return showToast(dispatch, 'Enter a valid amount', 'error')
    // ═══ PHASE 1.10: Reason is required — every balance change must be logged ═══
    if (!reason.trim()) return showToast(dispatch, 'Reason is required for all balance adjustments', 'error')
    // ═══ END PHASE 1.10 ═══
    
    dispatch({
      type: 'ADJUST_BALANCE',
      payload: {
        userId,
        action,
        amount: amt,
        reason: reason.trim(),
      },
    })
    dispatch({ type: 'CLOSE_MODAL' })
    showToast(dispatch, `Balance ${action === 'add' ? 'added' : 'deducted'} for ${user.name}`, 'success')
  }

  return (
    <div>
      <div style={{
        borderRadius: 10, padding: '18px 16px', marginBottom: 14, textAlign: 'center',
        background: 'linear-gradient(135deg, rgba(97,205,255,0.08) 0%, rgba(97,205,255,0.02) 60%), #1c1b1d',
        border: '1px solid rgba(97,205,255,0.12)',
        borderLeft: '4px solid #61cdff',
        boxShadow: 'inset 0 1px 0 rgba(255,255,255,0.04)',
      }}>
        <div style={{
          fontSize: 10, color: '#555555',
          fontFamily: "'Plus Jakarta Sans', sans-serif",
          letterSpacing: '0.12em', textTransform: 'uppercase', marginBottom: 6, fontWeight: 700,
        }}>
          {user.name} — Current Balance
        </div>
        <div style={{ fontFamily: "'Inter', sans-serif", fontSize: 28, fontWeight: 700, color: '#61cdff' }}>
          {formatTK(user.balance)}
        </div>
      </div>

      <div style={M.fullRow}>
        <label style={M.label}>Action</label>
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 8 }}>
          {['add', 'deduct'].map(a => {
            const active = action === a
            const c = a === 'add' ? '#4ade80' : '#f87171'
            return (
              <button
                key={a}
                onClick={() => setAction(a)}
                style={{
                  padding: '12px 0', borderRadius: 10,
                  border: `1px solid ${active ? c : '#353437'}`,
                  background: active ? c : '#1c1b1d',
                  fontFamily: "'Plus Jakarta Sans', sans-serif", fontSize: 12, fontWeight: 700,
                  color: active ? '#fff' : '#555555',
                  cursor: 'pointer', letterSpacing: '0.08em', textTransform: 'uppercase',
                  WebkitTapHighlightColor: 'transparent',
                }}
              >
                <i className={`fa-solid ${a === 'add' ? 'fa-plus' : 'fa-minus'}`} style={{ marginRight: 6 }} />
                {a === 'add' ? 'Add' : 'Deduct'}
              </button>
            )
          })}
        </div>
      </div>

      <div style={M.fullRow}>
        <label style={M.label}>Amount (TK)</label>
        <input style={M.input} type="number" placeholder="0" min="1" value={amount} onChange={e => setAmount(e.target.value)} />
      </div>

      <div style={M.fullRow}>
        {/* ═══ PHASE 1.10: Reason field now marked required ═══ */}
        <label style={{ ...M.label, color: reason.trim() ? '#555555' : '#f87171' }}>
          Reason *
        </label>
        <input
          style={{
            ...M.input,
            border: reason.trim() ? '1px solid #353437' : '1px solid rgba(248,113,113,0.3)',
          }}
          placeholder="Bonus / Correction / Penalty"
          value={reason}
          onChange={e => setReason(e.target.value)}
        />
        {/* ═══ END PHASE 1.10 ═══ */}
      </div>

      {/* ═══ PHASE 1.10: Required reason reminder ═══ */}
      {!reason.trim() && (
        <div style={{
          ...M.infoBox, marginBottom: 14,
          background: 'linear-gradient(135deg, rgba(248,113,113,0.06) 0%, rgba(248,113,113,0.01) 60%), #201f21',
          border: '1px solid rgba(248,113,113,0.1)', color: '#f87171',
        }}>
          <i className="fa-solid fa-pen" style={{ fontSize: 10, marginTop: 2, flexShrink: 0 }} />
          Reason is mandatory — this creates a transaction record visible in Finance.
        </div>
      )}
      {/* ═══ END PHASE 1.10 ═══ */}

      {amount && parseFloat(amount) > 0 && (
        <div style={{
          ...M.infoBox, marginBottom: 14,
          background: `linear-gradient(135deg, ${action === 'add' ? 'rgba(74,222,128,0.06)' : 'rgba(248,113,113,0.06)'} 0%, ${action === 'add' ? 'rgba(74,222,128,0.01)' : 'rgba(248,113,113,0.01)'} 60%), #201f21`,
          border: `1px solid ${action === 'add' ? 'rgba(74,222,128,0.1)' : 'rgba(248,113,113,0.1)'}`,
          color: action === 'add' ? '#4ade80' : '#f87171',
          textAlign: 'center',
        }}>
          New Balance: <strong style={{ fontFamily: "'Inter', sans-serif", fontSize: 14 }}>
            {formatTK(action === 'add' ? user.balance + parseFloat(amount) : user.balance - parseFloat(amount))}
          </strong>
        </div>
      )}

      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 10 }}>
        <button style={M.btnGhost} onClick={() => dispatch({ type: 'CLOSE_MODAL' })}>Cancel</button>
        <button style={{
          ...M.btnPrimary,
          background: action === 'add' ? '#4ade80' : '#f87171',
          color: action === 'add' ? '#052e16' : '#450a0a',
        }} onClick={handleSubmit}>
          <i className="fa-solid fa-check" /> Update
        </button>
      </div>
    </div>
  )
}
