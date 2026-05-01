import { useApp } from '../context'

const NAV_ITEMS = [
  { id: 'dashboard', icon: 'fa-solid fa-house', label: 'Home' },
  { id: 'matches', icon: 'fa-solid fa-gamepad', label: 'Browse' },
  { id: 'agents', icon: 'fa-solid fa-users', label: 'Agents' },
  { id: 'weapons', icon: 'fa-solid fa-crosshairs', label: 'Weapons' },
  { id: 'maps', icon: 'fa-solid fa-map', label: 'Maps' },
]

const BOTTOM_ITEMS = [
  { id: 'settings', icon: 'fa-solid fa-gear', label: 'Settings' },
  { id: 'logout', icon: 'fa-solid fa-right-from-bracket', label: 'Logout' },
]

export default function Sidebar() {
  const { state, dispatch, navigate } = useApp()
  const { currentView, notifications } = state

  const handleNav = (view) => {
    if (view === 'logout') {
      dispatch({ type: 'LOGOUT' })
    } else {
      navigate(view)
    }
    dispatch({ type: 'CLOSE_SIDEBAR' })
  }

  return (
    <aside className="sidebar">
      <div className="sidebar-logo">CA</div>

      <nav className="sidebar-nav">
        {NAV_ITEMS.map(item => (
          <button
            key={item.id}
            className={`sidebar-item ${currentView === item.id ? 'active' : ''}`}
            onClick={() => handleNav(item.id)}
          >
            <i className={item.icon} />
            <span className="sidebar-label">{item.label}</span>
            {item.id === 'matches' && notifications?.matches > 0 && (
              <span className="sidebar-badge">{notifications.matches}</span>
            )}
          </button>
        ))}
      </nav>

      <div className="sidebar-footer">
        {BOTTOM_ITEMS.map(item => (
          <button
            key={item.id}
            className="sidebar-item"
            onClick={() => handleNav(item.id)}
          >
            <i className={item.icon} />
            <span className="sidebar-label">{item.label}</span>
          </button>
        ))}
      </div>
    </aside>
  )
}