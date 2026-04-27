import { useApp } from '../context'
import { NAV_ITEMS, ADMIN_ITEMS } from '../data'

export default function Sidebar() {
  const { state, dispatch, isAdmin } = useApp()
  const { currentView, currentUser } = state

  const unreadCount = state.notifications.filter(n => !n.read).length
    const pendingFinance = (state.pendingWithdrawals?.length || 0) + (state.pendingAddMoneyRequests?.length || 0)

  const handleNav = (id) => {
    // Safeguard: redirect broken 'payments' id to 'wallet'
    const view = id === 'payments' ? 'wallet' : id
    dispatch({ type: 'NAVIGATE', payload: { view, param: null } })
  }

  const isActive = (id) => {
    const v = id === 'payments' ? 'wallet' : id
    return currentView === v || currentView?.startsWith(v)
  }

  return (
    <>
      {/* ===== SIDEBAR — Desktop only, hidden on mobile via CSS ===== */}
      <aside className="sidebar">
        {/* Logo */}
        <div className="sidebar-logo" onClick={() => handleNav('dashboard')}>
          <span className="sidebar-logo-text">CA</span>
          <span className="sidebar-logo-glow"></span>
        </div>

        {/* Navigation */}
        <nav className="sidebar-nav">
          {NAV_ITEMS.map(item => (
            <button
              key={item.id}
              className={`sidebar-item${isActive(item.id) ? ' active' : ''}`}
              onClick={() => handleNav(item.id)}
              title={item.label}
              aria-label={item.label}
            >
              <i className={item.icon}></i>
              {isActive(item.id) && <span className="sidebar-item-glow"></span>}
              {item.id === 'notifications' && unreadCount > 0 && (
                <span className="sidebar-badge">{unreadCount > 9 ? '9+' : unreadCount}</span>
              )}
            </button>
          ))}

          {isAdmin && (
            <>
              <div className="sidebar-divider">
                <span>ADMIN</span>
              </div>
              {ADMIN_ITEMS.map(item => (
                <button
                  key={item.id}
                  className={`sidebar-item${isActive(item.id) ? ' active' : ''}`}
                  onClick={() => handleNav(item.id)}
                  title={item.label}
                  aria-label={item.label}
                >
                  <i className={item.icon}></i>
                  {isActive(item.id) && <span className="sidebar-item-glow"></span>}
                </button>
              ))}
            </>
          )}
        </nav>

        {/* Bottom Section */}
        <div className="sidebar-bottom">
          <div
            className="sidebar-avatar"
            onClick={() => handleNav('profile')}
          >
            {currentUser?.avatar ? (
              <img src={currentUser.avatar} alt="Avatar" loading="lazy" />
            ) : (
              <div className="sidebar-avatar-fallback">
                {(currentUser?.displayName || 'U').charAt(0).toUpperCase()}
              </div>
            )}
            {isAdmin && <span className="admin-crown"><i className="fa-solid fa-crown"></i></span>}
          </div>
        </div>
      </aside>
    </>
  )
}