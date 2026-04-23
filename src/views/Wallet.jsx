import { useState } from 'react'
import { useApp } from '../context'
import { formatTK } from '../utils'

export default function Wallet() {
  const { state, dispatch } = useApp()
  const { currentUser, transactions } = state

  if (!currentUser) return null

  const balance = currentUser.balance || 0
  const totalWon = transactions.filter(t => t.type === 'win').reduce((s, t) => s + t.amount, 0)
  const totalPending = transactions.filter(t => t.status === 'pending').reduce((s, t) => s + t.amount, 0)
  const totalSpent = transactions.filter(t => t.type === 'join').reduce((s, t) => s + t.amount, 0)
  const totalAdded = transactions.filter(t => t.type === 'add').reduce((s, t) => s + t.amount, 0)

  const txIcon = (type) => {
    switch (type) {
      case 'add': return { icon: 'fa-solid fa-plus', bg: 'rgba(186,195,255,0.12)', color: '#bac3ff' }
      case 'win': return { icon: 'fa-solid fa-trophy', bg: 'rgba(186,195,255,0.12)', color: '#bac3ff' }
      case 'join': return { icon: 'fa-solid fa-crosshairs', bg: '#2a2a2c', color: '#889299' }
      case 'withdraw': return { icon: 'fa-solid fa-arrow-up-from-bracket', bg: '#2a2a2c', color: '#889299' }
      default: return { icon: 'fa-solid fa-arrow-right-arrow-left', bg: '#2a2c', color: '#889299' }
    }
  }

  return (
    <div style={{ padding: '0 0 100px 0' }}>

      {/* ═══ PAGE HEADER ═══ */}
      <div style={{ marginBottom: 28 }}>
        <h1 style={{
          fontFamily: "'Lexend', sans-serif", fontSize: 28, fontWeight: 700,
          color: '#e5e1e4', margin: '0 0 6px',
          letterSpacing: '-0.025em', textTransform: 'uppercase',
        }}>
          Wallet
        </h1>
        <p style={{
          fontFamily: "'Plus Jakarta Sans', sans-serif", fontSize: 13,
          color: '#889299', margin: 0, fontWeight: 500,
        }}>
          Manage your funds, deposits and withdrawals
        </p>
      </div>

      {/* ═══ BALANCE HERO CARD ═══ */}
      <div style={{
        position: 'relative', borderRadius: 16, overflow: 'hidden',
        background: '#1c1b1d',
        border: '1px solid rgba(255,255,255,0.06)',
        padding: '32px 24px 28px',
        marginBottom: 20,
      }}>
        {/* Subtle glow */}
        <div style={{
          position: 'absolute', top: -40, right: -40,
          width: 200, height: 200,
          background: 'rgba(186,195,255,0.06)',
          borderRadius: '50%',
          filter: 'blur(80px)',
          pointerEvents: 'none',
        }} />
        <div style={{ position: 'relative', zIndex: 1, textAlign: 'center' }}>
          <span style={{
            fontSize: 12, fontWeight: 700, textTransform: 'uppercase',
            letterSpacing: '0.1em', color: '#889299',
            fontFamily: "'Plus Jakarta Sans', sans-serif",
          }}>
            Available Balance
          </span>
          <div style={{ margin: '8px 0 20px' }}>
            <span style={{
              fontFamily: "'Inter', sans-serif", fontSize: 48, fontWeight: 700,
              color: '#e5e1e4', letterSpacing: '-0.02em',
            }}>
              {formatTK(balance)}
            </span>
            <span style={{
              fontSize: 22, fontWeight: 700, color: '#a78bfa',
              fontFamily: "'Plus Jakarta Sans', sans-serif",
              textTransform: 'uppercase', letterSpacing: '0.05em',
              marginLeft: 6,
            }}>
              TK
            </span>
          </div>
          <div style={{
            display: 'flex', gap: 12, maxWidth: 340, margin: '0 auto',
          }}>
            <button
              onClick={(e) => { e.stopPropagation(); dispatch({ type: 'SHOW_MODAL', payload: { type: 'add-money' } }) }}
              style={{
                flex: 1, padding: '14px 0', borderRadius: 12, border: 'none',
                background: '#61cdff', color: '#005572',
                fontFamily: "'Plus Jakarta Sans', sans-serif",
                fontSize: 13, fontWeight: 700,
                letterSpacing: '0.08em', textTransform: 'uppercase',
                cursor: 'pointer',
                display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 6,
                WebkitTapHighlightColor: 'transparent',
              }}
            >
              <i className="fa-solid fa-plus-circle" style={{ fontSize: 13 }} />
              Deposit
            </button>
            <button
              onClick={(e) => { e.stopPropagation(); dispatch({ type: 'SHOW_MODAL', payload: { type: 'withdraw' } }) }}
              style={{
                flex: 1, padding: '14px 0', borderRadius: 12,
                background: 'transparent',
                border: '1px solid rgba(255,255,255,0.08)',
                color: '#e5e1e4',
                fontFamily: "'Plus Jakarta Sans', sans-serif",
                fontSize: 13, fontWeight: 700,
                letterSpacing: '0.08em', textTransform: 'uppercase',
                cursor: 'pointer',
                display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 6,
                WebkitTapHighlightColor: 'transparent',
              }}
            >
              <i className="fa-solid fa-arrow-up-from-bracket" style={{ fontSize: 13 }} />
              Withdraw
            </button>
          </div>
        </div>
      </div>

      {/* ═══ QUICK STATS — 2x2 Grid ═══ */}
      <div style={{
        display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12, marginBottom: 24,
      }}>
        {/* Total Winnings */}
        <div style={{
          position: 'relative', borderRadius: 12, overflow: 'hidden',
          background: '#1c1b1d',
          border: '1px solid rgba(255,255,255,0.05)',
          padding: '18px 16px',
        }}>
          <div style={{
            position: 'absolute', top: -20, right: -20,
            width: 80, height: 80,
            background: 'rgba(186,195,255,0.06)',
            borderRadius: '50%',
            filter: 'blur(30px)', pointerEvents: 'none',
          }} />
          <span style={{
            fontSize: 11, fontWeight: 700, color: '#889299',
            fontFamily: "'Plus Jakarta Sans', sans-serif",
            textTransform: 'uppercase', letterSpacing: '0.1em',
            display: 'block', marginBottom: 6,
          }}>
            Total Winnings
          </span>
          <span style={{
            fontFamily: "'Inter', sans-serif", fontSize: 22, fontWeight: 700,
            color: '#e5e1e4',
            letterSpacing: '-0.01em',
          }}>
            {formatTK(totalWon)}
          </span>
        </div>

        {/* Pending */}
        <div style={{
          position: 'relative', borderRadius: 12, overflow: 'hidden',
          background: '#1c1b1d',
          border: '1px solid rgba(255,255,255,0.05)',
          padding: '18px 16px',
        }}>
          <div style={{
            position: 'absolute', top: -20, right: -20,
            width: 80, height: 80,
            background: 'rgba(248,113,113,0.06)',
            borderRadius: '50%',
            filter: 'blur(30px)', pointerEvents: 'none',
          }} />
          <span style={{
            fontSize: 11, fontWeight: 700, color: '#889299',
            fontFamily: "'Plus Jakarta Sans', sans-serif",
            textTransform: 'uppercase', letterSpacing: '0.1em',
            display: 'block', marginBottom: 6,
          }}>
            Pending
          </span>
          <span style={{
            fontFamily: "'Inter', sans-serif", fontSize: 22, fontWeight: 700,
            color: '#e5e1e4',
            letterSpacing: '-0.01em',
          }}>
            {formatTK(totalPending)}
          </span>
        </div>

        {/* Total Spent */}
        <div style={{
          borderRadius: 12,
          background: '#1c1b1d',
          border: '1px solid rgba(255,255,255,0.05)',
          padding: '18px 16px',
        }}>
          <span style={{
            fontSize: 11, fontWeight: 700, color: '#889299',
            fontFamily: "'Plus Jakarta Sans', sans-serif",
            textTransform: 'uppercase', letterSpacing: '0.1em',
            display: 'block', marginBottom: 6,
          }}>
            Total Spent
          </span>
          <span style={{
            fontFamily: "'Inter', sans-serif", fontSize: 22, fontWeight: 700,
            color: '#e5e1e4',
            letterSpacing: '-0.01em',
          }}>
            {formatTK(totalSpent)}
          </span>
        </div>

        {/* Total Added */}
        <div style={{
          position: 'relative', borderRadius: 12, overflow: 'hidden',
          background: '#1c1b1d',
          border: '1px solid rgba(255,255,255,0.05)',
          padding: '18px 16px',
        }}>
          <div style={{
            position: 'absolute', top: -20, left: -20,
            width: 80, height: 80,
            background: 'rgba(74,222,128,0.06)',
            borderRadius: '50%',
            filter: 'blur(30px)', pointerEvents: 'none',
          }} />
          <span style={{
            fontSize: 11, fontWeight: 700, color: '#889299',
            fontFamily: "'Plus Jakarta Sans', sans-serif",
            textTransform: 'uppercase', letterSpacing: '0.1em',
            display: 'block', marginBottom: 6,
          }}>
            Total Added
          </span>
          <span style={{
            fontFamily: "'Inter', sans-serif", fontSize: 22, fontWeight: 700,
            color: '#e5e1e4',
            letterSpacing: '-0.01em',
          }}>
            {formatTK(totalAdded)}
          </span>
        </div>
      </div>

      {/* ═══ RECENT ACTIVITY ═══ */}
      <div style={{ marginBottom: 16 }}>
        <div style={{
          display: 'flex', justifyContent: 'space-between', alignItems: 'center',
          marginBottom: 14,
          borderBottom: '1px solid rgba(255,255,255,0.04)', paddingBottom: 12,
        }}>
          <h3 style={{
            fontFamily: "'Lexend', sans-serif", fontSize: 16, fontWeight: 700,
            color: '#e5e1e4', margin: 0,
            textTransform: 'uppercase', letterSpacing: '-0.025em',
          }}>
            Recent Activity
          </h3>
          <span style={{
            fontSize: 12, fontWeight: 600, color: '#889299',
            fontFamily: "'Plus Jakarta Sans', sans-serif",
            cursor: 'pointer',
          }}>
            View All
          </span>
        </div>

        {/* Transaction List — rounded-xl items with gap-2, NO divider lines */}
        <div style={{
          display: 'flex', flexDirection: 'column', gap: 8,
        }}>
          {transactions.slice(0, 10).map(tx => {
            const isPositive = tx.type === 'win' || tx.type === 'add'
            const icon = txIcon(tx.type)
            const amtColor = isPositive ? '#e5e1e4' : '#f87171'
            const prefix = isPositive ? '+ ' : '- '
            return (
              <div
                key={tx.id}
                style={{
                  background: '#131315',
                  borderRadius: 12, padding: '14px 16px',
                  display: 'flex', justifyContent: 'space-between', alignItems: 'center',
                  WebkitTapHighlightColor: 'transparent',
                }}
              >
                <div style={{ display: 'flex', alignItems: 'center', gap: 14, flex: 1, minWidth: 0 }}>
                  <div style={{
                    width: 40, height: 40, borderRadius: '50%',
                    background: icon.bg,
                    display: 'flex', alignItems: 'center', justifyContent: 'center',
                    flexShrink: 0,
                  }}>
                    <i className={icon.icon} style={{ fontSize: 15, color: icon.color }} />
                  </div>
                  <div style={{ flex: 1, minWidth: 0 }}>
                    <div style={{
                      fontFamily: "'Plus Jakarta Sans', sans-serif", fontSize: 13, fontWeight: 600,
                      color: '#e5e1e4', lineHeight: 1.3,
                      overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap',
                    }}>
                      {tx.desc}
                    </div>
                    <div style={{
                      fontSize: 11, color: '#555555',
                      fontFamily: "'Plus Jakarta Sans', sans-serif", fontWeight: 500,
                      marginTop: 1,
                    }}>
                      {tx.date || 'Just now'}
                    </div>
                  </div>
                </div>
                <div style={{ textAlign: 'right', flexShrink: 0 }}>
                  <div style={{
                    fontFamily: "'Inter', sans-serif", fontSize: 14, fontWeight: 700,
                    color: amtColor, letterSpacing: '-0.01em',
                  }}>
                    {prefix}{formatTK(tx.amount)}
                  </div>
                  {tx.status === 'pending' && (
                    <div style={{
                      fontSize: 9, fontWeight: 700, color: '#f87171',
                      fontFamily: "'Plus Jakarta Sans', sans-serif",
                      textTransform: 'uppercase', letterSpacing: '0.05em',
                      marginTop: 2,
                    }}>
                      Pending
                    </div>
                  )}
                </div>
              </div>
            )
          })}
        </div>

        {/* View All button */}
        <div style={{ textAlign: 'center', padding: '12px 0' }}>
          <span style={{
            fontFamily: "'Lexend', sans-serif", fontSize: 14, fontWeight: 600, color: '#61cdff',
            cursor: 'pointer',
            WebkitTapHighlightColor: 'transparent',
          }}>
            Load More
          </span>
        </div>
      </div>
    </div>
  )
}