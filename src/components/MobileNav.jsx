import { useApp } from '../context'

const NAV_ITEMS = [
  { id: 'dashboard', label: 'Home', icon: 'fa-solid fa-house' },
  { id: 'matches', label: 'Matches', icon: 'fa-solid fa-gamepad' },
  { id: 'wallet', label: 'Wallet', icon: 'fa-solid fa-wallet' },
  { id: 'leaderboard', label: 'Rank', icon: 'fa-solid fa-ranking-star' },
  { id: 'profile', label: 'Profile', icon: 'fa-solid fa-user' },
]

const ADMIN_NAV_ITEMS = [
  { id: 'admin-overview', label: 'Overview', icon: 'fa-solid fa-chart-pie', color: '#00f0ff' },
  { id: 'admin-create', label: 'Create', icon: 'fa-solid fa-circle-plus', color: '#a78bfa' },
  { id: 'admin-rooms', label: 'Rooms', icon: 'fa-solid fa-key', color: '#fbbf24' },
  { id: 'admin-results', label: 'Results', icon: 'fa-solid fa-clipboard-check', color: '#22c55e' },
  { id: 'admin-users', label: 'Users', icon: 'fa-solid fa-users-gear', color: '#6c8cff' },
  { id: 'admin-finance', label: 'Finance', icon: 'fa-solid fa-money-bill-transfer', color: '#ef4444' },
  { id: 'admin-payments', label: 'Payments', icon: 'fa-solid fa-credit-card', color: '#f59e0b' },
  { id: 'admin-owners', label: 'Owner', icon: 'fa-solid fa-crown', color: '#fbbf24' },
  { id: 'admin-activity', label: 'Activity', icon: 'fa-solid fa-clock-rotate-left', color: '#6c8cff' },
]

export default function MobileNav() {
  const { state, navigate, isAdmin } = useApp()
  const { currentView } = state
    const pendingFinance = (state.pendingWithdrawals?.length || 0) + (state.pendingAddMoneyRequests?.length || 0)
    

  // ═══ ADMIN MOBILE NAV — horizontal scroll (your old slide system) ═══
  if (isAdmin) {
    return (
      <nav style={{
        position: 'fixed',
        bottom: 0,
        left: 0,
        right: 0,
        zIndex: 1000,
        background: 'rgba(8,8,22,0.96)',
        backdropFilter: 'blur(24px)',
        WebkitBackdropFilter: 'blur(24px)',
        borderTop: '1px solid rgba(255,255,255,0.06)',
        paddingBottom: 'env(safe-area-inset-bottom, 0px)',
      }}>
        <div style={{
          display: 'flex',
          alignItems: 'center',
          gap: 0,
          padding: '6px 2px 8px',
          overflowX: 'auto',
          scrollbarWidth: 'none',
          WebkitOverflowScrolling: 'touch',
        }}>
          {ADMIN_NAV_ITEMS.map(item => {
            const on = currentView === item.id
            const col = on ? item.color : '#3a3f52'

            return (
              <button
                key={item.id}
                onClick={() => navigate(item.id)}
                style={{
                  position: 'relative',
                  display: 'flex',
                  flexDirection: 'column',
                  alignItems: 'center',
                  gap: 3,
                  padding: '6px 12px 4px',
                  border: 'none',
                  borderRadius: 10,
                  background: on ? item.color + '15' : 'transparent',
                  cursor: 'pointer',
                  WebkitTapHighlightColor: 'transparent',
                  minWidth: 'fit-content',
                  flexShrink: 0,
                  transition: 'background 0.2s',
                }}
              >
                {on && (
                  <div style={{
                    position: 'absolute',
                    top: 0,
                    left: '50%',
                    transform: 'translateX(-50%)',
                    width: 22,
                    height: 2.5,
                    borderRadius: '0 0 3px 3px',
                    background: item.color,
                    boxShadow: `0 2px 12px ${item.color}60`,
                  }} />
                )}
                <i
                  className={item.icon}
                  style={{
                    fontSize: on ? 17 : 15,
                    color: col,
                    filter: on ? `drop-shadow(0 0 6px ${item.color}50)` : 'none',
                    transition: 'all 0.2s',
                  }}
                />
                <span style={{
                  fontSize: on ? 10 : 9,
                  fontWeight: on ? 700 : 400,
                  fontFamily: "'Rajdhani', sans-serif",
                  color: col,
                  letterSpacing: 0.3,
                  whiteSpace: 'nowrap',
                  transition: 'color 0.2s',
                }}>
                  {item.label}
                </span>                {item.id === 'admin-finance' && pendingFinance > 0 && (
                  <span style={{
                    position: 'absolute',
                    top: 2,
                    right: 6,
                    minWidth: 16,
                    height: 16,
                    borderRadius: 8,
                    background: '#ef4444',
                    color: '#fff',
                    fontSize: 9,
                    fontWeight: 700,
                    fontFamily: "'Inter', sans-serif",
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    padding: '0 4px',
                    boxShadow: '0 2px 6px rgba(239,68,68,0.4)',
                  }}>
                    {pendingFinance > 9 ? '9+' : pendingFinance}
                  </span>
                )}
              </button>
            )
          })}
        </div>
        <style>{`nav>div::-webkit-scrollbar{display:none}`}</style>
      </nav>
    )
  }

  // ═══ USER MOBILE NAV ═══
  const active = (id) => currentView === id

  return (
    <nav style={{
      position: 'fixed',
      bottom: 0,
      left: 0,
      right: 0,
      zIndex: 1000,
      background: 'rgba(8,8,22,0.92)',
      backdropFilter: 'blur(20px)',
      WebkitBackdropFilter: 'blur(20px)',
      borderTop: '1px solid rgba(255,255,255,0.06)',
      paddingBottom: 'env(safe-area-inset-bottom, 0px)',
    }}>
      <div style={{
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'space-around',
        padding: '6px 2px 8px',
        maxWidth: 500,
        margin: '0 auto',
      }}>
        {NAV_ITEMS.map(item => {
          const on = active(item.id)
          const col = on ? '#06d6f0' : '#475569'

          return (
            <button
              key={item.id}
              onClick={() => navigate(item.id)}
              aria-label={item.label}
              style={{
                position: 'relative',
                display: 'flex',
                flexDirection: 'column',
                alignItems: 'center',
                gap: 3,
                padding: '6px 0 4px',
                border: 'none',
                borderRadius: 10,
                background: on ? 'rgba(6,214,240,0.08)' : 'transparent',
                cursor: 'pointer',
                WebkitTapHighlightColor: 'transparent',
                minWidth: 0,
                flex: 1,
              }}
            >
              {on && (
                <div style={{
                  position: 'absolute',
                  top: 0,
                  left: '50%',
                  transform: 'translateX(-50%)',
                  width: 20,
                  height: 2.5,
                  borderRadius: '0 0 3px 3px',
                  background: '#06d6f0',
                  boxShadow: '0 2px 10px rgba(6,214,240,0.5)',
                }} />
              )}
              <div style={{ position: 'relative', lineHeight: 1 }}>
                <i
                  className={item.icon}
                  style={{
                    fontSize: on ? 18 : 16,
                    color: col,
                    filter: on ? 'drop-shadow(0 0 6px rgba(6,214,240,0.4))' : 'none',
                  }}
                />
              </div>
              <span style={{
                fontSize: on ? 10 : 9,
                fontWeight: on ? 600 : 400,
                fontFamily: "'Rajdhani', sans-serif",
                color: col,
                letterSpacing: 0.2,
              }}>
                {item.label}
              </span>
            </button>
          )
        })}
      </div>
    </nav>
  )
}