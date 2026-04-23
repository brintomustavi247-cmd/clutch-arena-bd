import { useState } from 'react'
import { useApp } from '../context'

export default function Settings() {
  const { state, dispatch, navigate } = useApp()
  const { currentUser } = state

  const [notifEnabled, setNotifEnabled] = useState(true)
  const [showOnline, setShowOnline] = useState(true)
  const [soundEnabled, setSoundEnabled] = useState(true)
  const [darkMode, setDarkMode] = useState(true)
  const [language, setLanguage] = useState('en')

  if (!currentUser) return null

  const Toggle = ({ enabled, onToggle, color = '#00f0ff' }) => (
    <div
      onClick={onToggle}
      style={{
        width: 48, height: 26, borderRadius: 13,
        background: enabled
          ? `linear-gradient(135deg, ${color}, ${color}cc)`
          : 'rgba(255,255,255,0.1)',
        position: 'relative', cursor: 'pointer',
        transition: 'all 0.3s ease',
        flexShrink: 0,
        boxShadow: enabled ? `0 0 16px ${color}33` : 'none',
      }}
    >
      <div style={{
        width: 20, height: 20, borderRadius: '50%',
        background: '#fff',
        position: 'absolute', top: 3,
        left: enabled ? 25 : 3,
        transition: 'left 0.3s cubic-bezier(0.4, 0, 0.2, 1)',
        boxShadow: '0 2px 6px rgba(0,0,0,0.3)',
      }}></div>
    </div>
  )

  const SettingRow = ({ icon, iconColor, label, description, children }) => (
    <div style={{
      display: 'flex', alignItems: 'center', gap: 14,
      padding: '16px 18px',
      borderBottom: '1px solid rgba(255,255,255,0.04)',
      transition: 'background 0.2s ease',
    }}
    onMouseEnter={e => e.currentTarget.style.background = 'rgba(255,255,255,0.02)'}
    onMouseLeave={e => e.currentTarget.style.background = 'transparent'}
    >
      <div style={{
        width: 38, height: 38, borderRadius: 10,
        background: iconColor + '12',
        border: `1px solid ${iconColor}20`,
        display: 'flex', alignItems: 'center', justifyContent: 'center',
        flexShrink: 0,
      }}>
        <i className={icon} style={{ fontSize: 15, color: iconColor }}></i>
      </div>
      <div style={{ flex: 1, minWidth: 0 }}>
        <div style={{
          fontFamily: 'var(--font-heading)', fontSize: 14, fontWeight: 600,
          color: '#fff', marginBottom: 2,
        }}>
          {label}
        </div>
        {description && (
          <div style={{ fontSize: 11, color: 'var(--text-muted, #666)', fontFamily: 'var(--font-body)' }}>
            {description}
          </div>
        )}
      </div>
      {children}
    </div>
  )

  const SettingSection = ({ title, icon, iconColor, children }) => (
    <div style={{
      borderRadius: 18, overflow: 'hidden', marginBottom: 20,
      background: 'rgba(255,255,255,0.02)',
      border: '1px solid rgba(255,255,255,0.05)',
    }}>
      <div style={{
        display: 'flex', alignItems: 'center', gap: 10,
        padding: '14px 18px',
        borderBottom: '1px solid rgba(255,255,255,0.04)',
        background: iconColor + '04',
      }}>
        <div style={{
          width: 32, height: 32, borderRadius: 8,
          background: iconColor + '15',
          display: 'flex', alignItems: 'center', justifyContent: 'center',
        }}>
          <i className={icon} style={{ fontSize: 14, color: iconColor }}></i>
        </div>
        <h3 style={{ fontFamily: 'var(--font-heading)', fontSize: 14, fontWeight: 700, color: '#fff', margin: 0 }}>
          {title}
        </h3>
      </div>
      {children}
    </div>
  )

  const handleLogout = () => {
    dispatch({ type: 'LOGOUT' })
    window.location.hash = 'login'
  }

  const handleClearData = () => {
    if (confirm('This will delete all your saved data. Continue?')) {
      localStorage.removeItem('clutch_arena_bd')
      window.location.reload()
    }
  }

  return (
    <div style={{ padding: '0 0 80px 0' }}>

      {/* ===== PAGE HEADER ===== */}
      <div style={{ marginBottom: 24 }}>
        <h1 style={{
          fontFamily: 'var(--font-heading)', fontSize: 26, fontWeight: 800,
          color: '#fff', margin: '0 0 4px', lineHeight: 1.2,
        }}>
          <i className="fa-solid fa-gear" style={{ marginRight: 10, color: '#64748b' }}></i>
          Settings
        </h1>
        <p style={{ fontSize: 13, color: 'var(--text-muted, #777)', fontFamily: 'var(--font-body)', margin: 0 }}>
          Manage your account preferences
        </p>
      </div>

      {/* ===== PRIVACY ===== */}
      <SettingSection title="Privacy" icon="fa-solid fa-shield-halved" iconColor="#a78bfa">
        <SettingRow
          icon="fa-solid fa-eye"
          iconColor="#a78bfa"
          label="Show Online Status"
          description="Let others see when you're online"
        >
          <Toggle enabled={showOnline} onToggle={() => setShowOnline(!showOnline)} color="#a78bfa" />
        </SettingRow>
        <SettingRow
          icon="fa-solid fa-user-group"
          iconColor="#a78bfa"
          label="Public Profile"
          description="Allow others to view your profile"
        >
          <Toggle enabled={true} onToggle={() => {}} color="#a78bfa" />
        </SettingRow>
        <SettingRow
          icon="fa-solid fa-chart-bar"
          iconColor="#a78bfa"
          label="Show Match History"
          description="Display your joined matches on profile"
        >
          <Toggle enabled={true} onToggle={() => {}} color="#a78bfa" />
        </SettingRow>
      </SettingSection>

      {/* ===== NOTIFICATIONS ===== */}
      <SettingSection title="Notifications" icon="fa-solid fa-bell" iconColor="#fbbf24">
        <SettingRow
          icon="fa-solid fa-bell"
          iconColor="#fbbf24"
          label="Push Notifications"
          description="Get notified about matches and results"
        >
          <Toggle enabled={notifEnabled} onToggle={() => setNotifEnabled(!notifEnabled)} color="#fbbf24" />
        </SettingRow>
        <SettingRow
          icon="fa-solid fa-key"
          iconColor="#fbbf24"
          label="Room Unlock Alerts"
          description="Alert when room credentials become visible"
        >
          <Toggle enabled={true} onToggle={() => {}} color="#fbbf24" />
        </SettingRow>
        <SettingRow
          icon="fa-solid fa-trophy"
          iconColor="#fbbf24"
          label="Result Notifications"
          description="Get notified when match results are published"
        >
          <Toggle enabled={true} onToggle={() => {}} color="#fbbf24" />
        </SettingRow>
      </SettingSection>

      {/* ===== APPEARANCE ===== */}
      <SettingSection title="Appearance" icon="fa-solid fa-palette" iconColor="#00f0ff">
        <SettingRow
          icon="fa-solid fa-volume-high"
          iconColor="#00f0ff"
          label="Sound Effects"
          description="Play sounds for actions"
        >
          <Toggle enabled={soundEnabled} onToggle={() => setSoundEnabled(!soundEnabled)} color="#00f0ff" />
        </SettingRow>
        <SettingRow
          icon="fa-solid fa-moon"
          iconColor="#00f0ff"
          label="Dark Mode"
          description="Always dark theme for gaming"
        >
          <Toggle enabled={darkMode} onToggle={() => setDarkMode(!darkMode)} color="#00f0ff" />
        </SettingRow>
        <SettingRow
          icon="fa-solid fa-language"
          iconColor="#00f0ff"
          label="Language"
          description="App display language"
        >
          <div style={{
            padding: '7px 14px', borderRadius: 8,
            border: '1px solid rgba(0,240,255,0.2)',
            background: 'rgba(0,240,255,0.06)',
            fontFamily: 'var(--font-heading)', fontSize: 12, fontWeight: 700,
            color: '#00f0ff',
          }}>
            English
          </div>
        </SettingRow>
      </SettingSection>

      {/* ===== SECURITY ===== */}
      <SettingSection title="Security" icon="fa-solid fa-lock" iconColor="#22c55e">
        <SettingRow
          icon="fa-solid fa-key"
          iconColor="#22c55e"
          label="Change Password"
          description="Update your account password"
        >
          <button style={{
            padding: '7px 16px', borderRadius: 8,
            border: '1px solid rgba(34,197,94,0.2)',
            background: 'rgba(34,197,94,0.08)',
            color: '#22c55e', fontFamily: 'var(--font-display)', fontSize: 11,
            fontWeight: 700, cursor: 'pointer',
          }}>
            Change
          </button>
        </SettingRow>
        <SettingRow
          icon="fa-solid fa-shield-halved"
          iconColor="#22c55e"
          label="Two-Factor Auth"
          description="Add extra security to your account"
        >
          <span style={{
            padding: '7px 16px', borderRadius: 8,
            border: '1px solid rgba(255,255,255,0.06)',
            background: 'rgba(255,255,255,0.03)',
            color: 'var(--text-muted, #666)', fontFamily: 'var(--font-display)', fontSize: 11,
            fontWeight: 600,
          }}>
            Coming Soon
          </span>
        </SettingRow>
        <SettingRow
          icon="fa-solid fa-clock-rotate-left"
          iconColor="#22c55e"
          label="Login History"
          description="View recent login activity"
        >
          <button style={{
            padding: '7px 16px', borderRadius: 8,
            border: '1px solid rgba(34,197,94,0.2)',
            background: 'rgba(34,197,94,0.08)',
            color: '#22c55e', fontFamily: 'var(--font-display)', fontSize: 11,
            fontWeight: 700, cursor: 'pointer',
          }}>
            View
          </button>
        </SettingRow>
      </SettingSection>

      {/* ===== ACCOUNT ===== */}
      <SettingSection title="Account" icon="fa-solid fa-user-gear" iconColor="#6c8cff">
        <SettingRow
          icon="fa-solid fa-user-pen"
          iconColor="#6c8cff"
          label="Edit Profile"
          description="Change your name, IGN, and avatar"
        >
          <button
            onClick={() => navigate('profile')}
            style={{
              padding: '7px 16px', borderRadius: 8,
              border: '1px solid rgba(108,140,255,0.2)',
              background: 'rgba(108,140,255,0.08)',
              color: '#6c8cff', fontFamily: 'var(--font-display)', fontSize: 11,
              fontWeight: 700, cursor: 'pointer',
            }}
          >
            Edit
          </button>
        </SettingRow>
        <SettingRow
          icon="fa-solid fa-wallet"
          iconColor="#6c8cff"
          label="Wallet"
          description="Manage your balance and transactions"
        >
          <button
            onClick={() => navigate('wallet')}
            style={{
              padding: '7px 16px', borderRadius: 8,
              border: '1px solid rgba(108,140,255,0.2)',
              background: 'rgba(108,140,255,0.08)',
              color: '#6c8cff', fontFamily: 'var(--font-display)', fontSize: 11,
              fontWeight: 700, cursor: 'pointer',
            }}
          >
            Open
          </button>
        </SettingRow>
      </SettingSection>

      {/* ===== DANGER ZONE ===== */}
      <SettingSection title="Danger Zone" icon="fa-solid fa-triangle-exclamation" iconColor="#ef4444">
        <SettingRow
          icon="fa-solid fa-trash-can"
          iconColor="#ef4444"
          label="Clear App Data"
          description="Delete all locally saved data including login"
        >
          <button
            onClick={handleClearData}
            style={{
              padding: '7px 16px', borderRadius: 8,
              border: '1px solid rgba(239,68,68,0.2)',
              background: 'rgba(239,68,68,0.08)',
              color: '#ef4444', fontFamily: 'var(--font-display)', fontSize: 11,
              fontWeight: 700, cursor: 'pointer',
            }}
          >
            Clear
          </button>
        </SettingRow>
        <SettingRow
          icon="fa-solid fa-right-from-bracket"
          iconColor="#ef4444"
          label="Logout"
          description={`Sign out of ${currentUser.name}`}
        >
          <button
            onClick={handleLogout}
            style={{
              padding: '7px 16px', borderRadius: 8,
              border: '1px solid rgba(239,68,68,0.25)',
              background: 'rgba(239,68,68,0.1)',
              color: '#ef4444', fontFamily: 'var(--font-display)', fontSize: 11,
              fontWeight: 700, cursor: 'pointer',
              boxShadow: '0 2px 12px rgba(239,68,68,0.1)',
            }}
          >
            Logout
          </button>
        </SettingRow>
      </SettingSection>

      {/* ===== APP INFO ===== */}
      <div style={{
        borderRadius: 18, overflow: 'hidden',
        background: 'rgba(255,255,255,0.02)',
        border: '1px solid rgba(255,255,255,0.05)',
      }}>
        <div style={{ padding: '20px 22px', textAlign: 'center' }}>
          <div style={{
            display: 'inline-flex', alignItems: 'center', justifyContent: 'center',
            width: 48, height: 48, borderRadius: 14, marginBottom: 12,
            background: 'linear-gradient(135deg, rgba(0,240,255,0.1), rgba(167,139,250,0.06))',
            border: '1px solid rgba(0,240,255,0.12)',
          }}>
            <span style={{
              fontFamily: 'var(--font-display)', fontSize: 18, fontWeight: 900,
              color: '#00f0ff', letterSpacing: 1,
            }}>
              CA
            </span>
          </div>
          <h3 style={{
            fontFamily: 'var(--font-heading)', fontSize: 16, fontWeight: 700,
            color: '#fff', margin: '0 0 4px',
          }}>
            Clutch Arena BD
          </h3>
          <p style={{
            fontSize: 11, color: 'var(--text-muted, #555)',
            fontFamily: 'var(--font-display)', letterSpacing: 1,
            margin: '0 0 14px',
          }}>
            VERSION 2.0.0 — BUILD 2025
          </p>

          <div style={{
            display: 'flex', justifyContent: 'center', gap: 16,
            flexWrap: 'wrap',
          }}>
            {[
              { label: 'Platform', value: 'Free Fire' },
              { label: 'Engine', value: 'React + Vite' },
              { label: 'Storage', value: 'localStorage' },
            ].map(info => (
              <div key={info.label} style={{ textAlign: 'center' }}>
                <div style={{
                  fontSize: 9, color: 'var(--text-muted, #555)',
                  fontFamily: 'var(--font-heading)', letterSpacing: 0.5,
                  textTransform: 'uppercase', marginBottom: 2,
                }}>
                  {info.label}
                </div>
                <div style={{
                  fontSize: 11, color: '#fff',
                  fontFamily: 'var(--font-body)', fontWeight: 600,
                }}>
                  {info.value}
                </div>
              </div>
            ))}
          </div>

          <div style={{
            marginTop: 16, paddingTop: 14,
            borderTop: '1px solid rgba(255,255,255,0.04)',
            fontSize: 10, color: 'var(--text-muted, #444)',
            fontFamily: 'var(--font-body)', lineHeight: 1.6,
          }}>
            <p style={{ margin: '0 0 4px' }}>🔥 Built for esports tournament management</p>
            <p style={{ margin: '0 0 4px' }}>📱 Mobile-first design for on-the-go admin control</p>
            <p style={{ margin: 0 }}>© 2025 Clutch Arena BD. All rights reserved.</p>
          </div>
        </div>
      </div>
    </div>
  )
}