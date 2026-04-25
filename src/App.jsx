import { useState, useEffect } from 'react'
import { AppProvider, useApp } from './context'
import { firebaseReady } from './firebase'
import Sidebar from './components/Sidebar'
import MobileNav from './components/MobileNav'
import RightPanel from './components/RightPanel'
import Modal from './components/Modal'
import Toast from './components/Toast'
import Dashboard from './views/Dashboard'
import Matches from './views/Matches'
import MatchDetail from './views/MatchDetail'
import Wallet from './views/Wallet'
import Leaderboard from './views/Leaderboard'
import Notifications from './views/Notifications'
import Admin from './views/Admin'
import Login from './views/Login'
import Profile from './views/Profile'
import Settings from './views/Settings'

function LoadingSkeleton() {
  return (
    <div style={{ padding: 24 }}>
      <div className="skeleton" style={{ width: 220, height: 32, marginBottom: 24, borderRadius: 8 }}></div>
      <div className="skeleton" style={{ width: '100%', height: 280, marginBottom: 28, borderRadius: 12 }}></div>
      <div className="skeleton" style={{ width: 160, height: 22, marginBottom: 18, borderRadius: 6 }}></div>
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(2, 1fr)', gap: 12 }}>
        {[1, 2, 3, 4].map(i => (
          <div key={i} className="skeleton" style={{ height: 180, borderRadius: 12 }}></div>
        ))}
      </div>
    </div>
  )
}

function AuthGuard({ children }) {
  const { state } = useApp()

  if (!state.isLoggedIn) {
    const mode = state.currentView === 'admin-login' ? 'admin' : 'user'
    return <Login mode={mode} />
  }
  return children
}

function isAdminView(view) {
  return view && view.startsWith('admin')
}

function ViewRouter() {
  const { state, dispatch, isAdmin } = useApp()
  const { currentView, viewParam, loading, sidebarOpen } = state
  const admin = isAdminView(currentView)

  function renderView() {
    switch (currentView) {
      case 'dashboard':
        return <Dashboard />
      case 'matches':
        return <Matches />
      case 'match-detail':
        return <MatchDetail matchId={viewParam} />
      case 'wallet':
        return <Wallet />
      case 'leaderboard':
        return <Leaderboard />
      case 'notifications':
        return <Notifications />
      case 'profile':
        return <Profile />
      case 'settings':
        return <Settings />

      case 'admin-overview':
      case 'admin-create':
      case 'admin-rooms':
      case 'admin-results':
      case 'admin-users':
      case 'admin-finance':
      case 'admin-dashboard':
      case 'admin-matches':
      case 'admin-payments':
      case 'admin-owners':
      case 'admin-activity':
        if (!isAdmin) return <Dashboard />
        return <Admin />

      case 'login':
      case 'admin-login':
        return <Login mode={currentView === 'admin-login' ? 'admin' : 'user'} />

      default:
        return <Dashboard />
    }
  }

  if (loading) {
    return (
      <div style={{ display: 'flex', minHeight: '100dvh' }}>
        <Sidebar />
        <div style={{ flex: 1, minWidth: 0, padding: '0 16px', overflow: 'hidden' }}>
          <LoadingSkeleton />
        </div>
      </div>
    )
  }

  return (
    <div style={{
      display: 'flex',
      minHeight: '100dvh',
      position: 'relative',
    }}>
      <Sidebar />

      {sidebarOpen && (
        <div
          onClick={() => dispatch({ type: 'CLOSE_SIDEBAR' })}
          style={{
            position: 'fixed',
            inset: 0,
            zIndex: 1000,
            background: 'rgba(0,0,0,0.6)',
          }}
        />
      )}

      <main
        key={admin ? 'admin' : (currentView + viewParam)}
        style={{
          flex: 1,
          minWidth: 0,
          maxWidth: '100%',
          overflowX: 'hidden',
          overflowY: 'auto',
          WebkitOverflowScrolling: 'touch',
        }}
      >
        <div style={{
          padding: '16px',
          maxWidth: admin ? 1400 : 900,
          margin: '0 auto',
          width: '100%',
          boxSizing: 'border-box',
        }}>
          {renderView()}
        </div>
      </main>

      <RightPanel />
      <MobileNav />
      <Modal />
      <Toast />
    </div>
  )
}

export default function App() {
  const [ready, setReady] = useState(false)

  useEffect(() => {
    // ✅ KEY FIX: Wait for persistence to be ready BEFORE rendering anything
    // This guarantees onAuthStateChanged in context.jsx fires AFTER localStorage is enabled
    firebaseReady.then(() => {
      setReady(true)
    })
  }, [])

  if (!ready) {
    return (
      <div style={{ display: 'flex', minHeight: '100dvh', alignItems: 'center', justifyContent: 'center', background: '#0e0e10' }}>
        <div style={{ textAlign: 'center' }}>
          <div style={{ fontFamily: 'var(--font-display)', fontSize: 28, fontWeight: 900, color: '#00f0ff', letterSpacing: 3, marginBottom: 12 }}>CA</div>
          <div className="skeleton" style={{ width: 180, height: 6, margin: '0 auto 12px', borderRadius: 3 }}></div>
          <div style={{ fontSize: 12, color: '#555', fontFamily: 'var(--font-body)' }}>Checking session... v2</div>
        </div>
      </div>
    )
  }

  return (
    <AppProvider>
      <AuthGuard>
        <ViewRouter />
      </AuthGuard>
    </AppProvider>
  )
}