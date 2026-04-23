import { useState } from 'react'
import { useApp } from '../context'
import { auth } from '../firebase'
import { signInWithPopup, GoogleAuthProvider, signInWithPhoneNumber, RecaptchaVerifier } from 'firebase/auth'

// ⚠️ YOUR OWNER PHONE NUMBER — When you login with this via OTP, you become Owner!
const OWNER_PHONE = '+8801871035221'

export default function Login({ mode: initialMode }) {
  const { dispatch } = useApp()
  const [tab, setTab] = useState('login')
  const [role, setRole] = useState(initialMode === 'admin' ? 'admin' : 'user')

  // --- Firebase Auth State ---
  const [authMethod, setAuthMethod] = useState('local')
  const [phoneStep, setPhoneStep] = useState('input')
  const [fbPhone, setFbPhone] = useState('')
  const [fbOtp, setFbOtp] = useState('')
  const [fbConfirmation, setFbConfirmation] = useState(null)
  const [googleLoading, setGoogleLoading] = useState(false)
  const [phoneLoading, setPhoneLoading] = useState(false)
  const [fbOtpLoading, setFbOtpLoading] = useState(false)
  const [fbError, setFbError] = useState('')

  // Login fields
  const [loginPhone, setLoginPhone] = useState('')
  const [loginPass, setLoginPass] = useState('')
  const [error, setError] = useState('')
  const [loading, setLoading] = useState(false)

  // Register fields
  const [regName, setRegName] = useState('')
  const [regUid, setRegUid] = useState('')
  const [regIgn, setRegIgn] = useState('')
  const [regPhone, setRegPhone] = useState('')
  const [regEmail, setRegEmail] = useState('')
  const [regPass, setRegPass] = useState('')
  const [regConfirm, setRegConfirm] = useState('')
  const [regError, setRegError] = useState('')

  // Forgot password / OTP fields
  const [showForgot, setShowForgot] = useState(false)
  const [forgotPhone, setForgotPhone] = useState('')
  const [forgotEmail, setForgotEmail] = useState('')
  const [otpSent, setOtpSent] = useState(false)
  const [otpCode, setOtpCode] = useState('')
  const [otpLoading, setOtpLoading] = useState(false)
  const [otpVerifyLoading, setOtpVerifyLoading] = useState(false)
  const [forgotError, setForgotError] = useState('')
  const [forgotStep, setForgotStep] = useState(1) // 1 = enter phone/email, 2 = enter OTP, 3 = new password
  const [newPass, setNewPass] = useState('')
  const [newPassConfirm, setNewPassConfirm] = useState('')

  const inputStyle = {
    width: '100%', padding: '12px 14px', borderRadius: 12,
    border: '1px solid rgba(255,255,255,0.08)',
    background: 'rgba(255,255,255,0.04)',
    color: '#fff', fontFamily: 'var(--font-body)', fontSize: 14,
    outline: 'none', boxSizing: 'border-box',
  }
  const inputFocus = (e) => { e.target.style.borderColor = 'rgba(0,240,255,0.3)' }
  const inputBlur = (e) => { e.target.style.borderColor = 'rgba(255,255,255,0.08)' }

  // --- Firebase Helpers ---
  const formatBDPhone = (phone) => {
    let p = phone.replace(/\s/g, '').replace(/^0/, '+880')
    if (!p.startsWith('+880')) p = '+880' + p.replace('+', '')
    return p
  }

  const processFirebaseUser = (firebaseUser, extraData = {}) => {
    const phone = firebaseUser.phoneNumber || ''
    const email = firebaseUser.email || ''
    const name = firebaseUser.displayName || extraData.name || 'Player'
    const isOwner = phone === OWNER_PHONE

    dispatch({
      type: 'LOGIN',
      payload: {
        id: firebaseUser.uid,
        username: name.toLowerCase().replace(/\s+/g, '_'),
        role: isOwner ? 'owner' : 'user',
        name: name,
        displayName: name,
        ign: extraData.ign || '',
        uid: extraData.uid || '',
        avatar: firebaseUser.photoURL || null,
        balance: 0, kills: 0, wins: 0, matchesPlayed: 0, earnings: 0,
        online: true, banned: false, status: 'active',
        forcePasswordChange: false, permissions: [],
        phone: phone.replace('+880', '0'),
        email: email,
        createdAt: new Date().toISOString().slice(0, 16).replace('T', ' '),
        firebaseUid: firebaseUser.uid,
      },
    })
  }

  const handleGoogleLogin = async () => {
    setFbError(''); setGoogleLoading(true)
    try {
      const result = await signInWithPopup(auth, new GoogleAuthProvider())
      processFirebaseUser(result.user)
    } catch (err) {
      console.error(err)
      setFbError(err.code === 'auth/popup-closed-by-user' ? 'Popup closed.' : 'Google login failed.')
    } finally { setGoogleLoading(false) }
  }

  const handleSendPhoneOtp = async (e) => {
    e?.preventDefault(); setFbError('')
    if (!/^01\d{9}$/.test(fbPhone.trim())) { setFbError('Enter valid BD number (01XXXXXXXXX)'); return }
    setPhoneLoading(true)
    try {
      if (window.recaptchaVerifier) window.recaptchaVerifier.clear()
      window.recaptchaVerifier = new RecaptchaVerifier(auth, 'recaptcha-container', { size: 'invisible', callback: () => {} })
      const confirmationResult = await signInWithPhoneNumber(auth, formatBDPhone(fbPhone.trim()), window.recaptchaVerifier)
      setFbConfirmation(confirmationResult); setPhoneStep('otp')
    } catch (err) {
      console.error(err); setFbError('Failed to send OTP.')
      if (window.recaptchaVerifier) { window.recaptchaVerifier.clear(); window.recaptchaVerifier = null }
    } finally { setPhoneLoading(false) }
  }

  const handleVerifyPhoneOtp = async (e) => {
    e?.preventDefault(); setFbError('')
    if (!fbOtp.trim()) { setFbError('Enter OTP code'); return }
    setFbOtpLoading(true)
    try {
      const result = await fbConfirmation.confirm(fbOtp.trim())
      processFirebaseUser(result.user)
    } catch (err) {
      console.error(err); setFbError('Invalid OTP.')
    } finally { setFbOtpLoading(false) }
  }

  const resetFb = () => {
    setAuthMethod('local'); setPhoneStep('input'); setFbPhone(''); setFbOtp(''); setFbConfirmation(null); setFbError('')
  }

  const handleLogin = (e) => {
    e.preventDefault()
    setError('')
    if (role === 'admin') {
      if (!loginPhone.trim() || !loginPass.trim()) {
        setError('Enter username and password')
        return
      }
    } else {
      if (!loginPhone.trim()) { setError('Enter your phone number'); return }
      if (!/^01\d{9}$/.test(loginPhone.trim())) { setError('Enter valid BD number (01XXXXXXXXX)'); return }
      if (!loginPass.trim()) { setError('Enter your password'); return }
    }

    setLoading(true)
    setTimeout(() => {
      const actionType = role === 'admin' ? 'LOGIN_ADMIN' : 'LOGIN_USER'
      dispatch({
        type: actionType,
        payload: role === 'admin'
          ? { username: loginPhone.trim(), password: loginPass }
          : { phone: loginPhone.trim(), password: loginPass },
      })
      setLoading(false)

      setTimeout(() => {
        try {
          const saved = JSON.parse(localStorage.getItem('clutch_arena_bd'))
          if (!saved?.isLoggedIn) {
            setError(role === 'admin' ? 'Access Denied — admin credentials required' : 'Invalid phone number or password')
          }
        } catch {
          setError('Login failed')
        }
      }, 50)
    }, 400)
  }

  const handleRegister = (e) => {
    e.preventDefault()
    setRegError('')
    if (!regName.trim()) { setRegError('Display name is required'); return }
    if (!regUid.trim()) { setRegError('Free Fire UID is required'); return }
    if (!regIgn.trim()) { setRegError('In-game name is required'); return }
    if (!regPhone.trim()) { setRegError('Phone number is required'); return }
    if (!/^01\d{9}$/.test(regPhone.trim())) { setRegError('Enter valid BD number (01XXXXXXXXX)'); return }
    if (regEmail && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(regEmail)) { setRegError('Enter valid email address'); return }
    if (!regPass.trim()) { setRegError('Password is required'); return }
    if (regPass.length < 4) { setRegError('Password must be at least 4 characters'); return }
    if (regPass !== regConfirm) { setRegError('Passwords do not match'); return }

    const username = regIgn.trim().toLowerCase().replace(/\s+/g, '_')
    dispatch({
      type: 'LOGIN',
      payload: {
        id: 'u_' + Date.now(),
        username: username,
        password: regPass,
        role: 'user',
        name: regName.trim(),
        displayName: regName.trim(),
        ign: regIgn.trim(),
        uid: regUid.trim(),
        avatar: null,
        balance: 0,
        kills: 0,
        wins: 0,
        matchesPlayed: 0,
        earnings: 0,
        online: true,
        banned: false,
        status: 'active',
        forcePasswordChange: false,
        permissions: [],
        phone: regPhone.trim(),
        email: regEmail.trim(),
        createdAt: new Date().toISOString().slice(0, 16).replace('T', ' '),
      },
    })
  }

  const handleSendOtp = (e) => {
    e.preventDefault()
    setForgotError('')
    if (!forgotPhone.trim() && !forgotEmail.trim()) {
      setForgotError('Enter phone number or email')
      return
    }
    if (forgotPhone.trim() && !/^01\d{9}$/.test(forgotPhone.trim())) {
      setForgotError('Enter valid BD number (01XXXXXXXXX)')
      return
    }
    if (forgotEmail.trim() && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(forgotEmail.trim())) {
      setForgotError('Enter valid email address')
      return
    }

    setOtpLoading(true)
    setTimeout(() => {
      setOtpLoading(false)
      setOtpSent(true)
      setForgotStep(2)
    }, 1200)
  }

  const handleVerifyOtp = (e) => {
    e.preventDefault()
    setForgotError('')
    if (!otpCode.trim()) { setForgotError('Enter OTP code'); return }
    if (otpCode.trim() !== '1234') { setForgotError('Invalid OTP — use 1234 for demo'); return }

    setOtpVerifyLoading(true)
    setTimeout(() => {
      setOtpVerifyLoading(false)
      setForgotStep(3)
    }, 600)
  }

  const handleResetPassword = (e) => {
    e.preventDefault()
    setForgotError('')
    if (!newPass.trim()) { setForgotError('Enter new password'); return }
    if (newPass.length < 4) { setForgotError('Password must be at least 4 characters'); return }
    if (newPass !== newPassConfirm) { setForgotError('Passwords do not match'); return }

    // Dispatch password update
    dispatch({
      type: 'RESET_PASSWORD',
      payload: {
        phone: forgotPhone.trim(),
        email: forgotEmail.trim(),
        newPassword: newPass,
      },
    })

    // Reset forgot flow and go to login
    setTimeout(() => {
      setShowForgot(false)
      setForgotStep(1)
      setForgotPhone('')
      setForgotEmail('')
      setOtpSent(false)
      setOtpCode('')
      setNewPass('')
      setNewPassConfirm('')
      setError('')
    }, 500)
  }

  const resetForgot = () => {
    setShowForgot(false)
    setForgotStep(1)
    setForgotPhone('')
    setForgotEmail('')
    setOtpSent(false)
    setOtpCode('')
    setNewPass('')
    setNewPassConfirm('')
    setForgotError('')
  }

  return (
    <div style={{
      minHeight: '100vh',
      display: 'flex', alignItems: 'center', justifyContent: 'center',
      padding: 20,
      position: 'relative', overflow: 'hidden',
    }}>
      {/* Firebase Invisible reCAPTCHA */}
      <div id="recaptcha-container"></div>

      {/* Background Effects */}
      <div style={{
        position: 'absolute', inset: 0,
        background: `
          radial-gradient(ellipse at 20% 50%, rgba(0,240,255,0.06) 0%, transparent 50%),
          radial-gradient(ellipse at 80% 50%, rgba(167,139,250,0.06) 0%, transparent 50%),
          radial-gradient(ellipse at 50% 100%, rgba(239,68,68,0.03) 0%, transparent 50%),
          linear-gradient(180deg, #0a0a1a, #080816)
        `,
        zIndex: 0,
      }}></div>

      {/* Floating particles */}
      <div style={{ position: 'absolute', inset: 0, zIndex: 0, overflow: 'hidden', pointerEvents: 'none' }}>
        {[...Array(6)].map((_, i) => (
          <div key={i} style={{
            position: 'absolute',
            width: 2 + i * 2, height: 2 + i * 2, borderRadius: '50%',
            background: i % 2 === 0 ? 'rgba(0,240,255,0.15)' : 'rgba(167,139,250,0.15)',
            left: `${15 + i * 15}%`,
            top: `${10 + i * 14}%`,
            animation: `float${i % 3} ${6 + i * 2}s ease-in-out infinite`,
          }}></div>
        ))}
      </div>

      {/* Login Card */}
      <div style={{
        position: 'relative', zIndex: 1,
        width: '100%', maxWidth: showForgot ? 440 : 420,
        borderRadius: 24, overflow: 'hidden',
        background: 'linear-gradient(180deg, rgba(18,18,42,0.95), rgba(12,12,28,0.98))',
        backdropFilter: 'blur(30px)',
        border: '1px solid rgba(255,255,255,0.06)',
        boxShadow: '0 25px 80px rgba(0,0,0,0.5), 0 0 1px rgba(255,255,255,0.1)',
      }}>
        {/* Top gradient line */}
        <div style={{
          height: 3,
          background: 'linear-gradient(90deg, #00f0ff, #a78bfa, #f87171, #a78bfa, #00f0ff)',
          backgroundSize: '300% 100%',
          animation: 'shimmer 4s linear infinite',
        }}></div>

        <div style={{ padding: showForgot ? '28px 28px 32px' : '36px 28px 32px' }}>

          {/* Logo */}
          <div style={{ textAlign: 'center', marginBottom: showForgot ? 20 : 28 }}>
            <div style={{
              display: 'inline-flex', alignItems: 'center', justifyContent: 'center',
              width: 64, height: 64, borderRadius: 18, marginBottom: 14,
              background: showForgot
                ? 'linear-gradient(135deg, rgba(251,191,36,0.12), rgba(239,68,68,0.08))'
                : 'linear-gradient(135deg, rgba(0,240,255,0.12), rgba(167,139,250,0.08))',
              border: `1px solid ${showForgot ? 'rgba(251,191,36,0.15)' : 'rgba(0,240,255,0.15)'}`,
              boxShadow: `0 8px 32px ${showForgot ? 'rgba(251,191,36,0.1)' : 'rgba(0,240,255,0.1)'}`,
            }}>
              <span style={{
                fontFamily: 'var(--font-display)', fontSize: 24, fontWeight: 900,
                color: showForgot ? '#fbbf24' : '#00f0ff', letterSpacing: 2,
                textShadow: `0 0 20px ${showForgot ? 'rgba(251,191,36,0.3)' : 'rgba(0,240,255,0.3)'}`,
              }}>
                CA
              </span>
            </div>
            <h1 style={{
              fontFamily: 'var(--font-heading)', fontSize: showForgot ? 20 : 24, fontWeight: 800,
              color: '#fff', margin: '0 0 4px', letterSpacing: 1,
            }}>
              {showForgot ? 'Reset Password' : 'Clutch Arena BD'}
            </h1>
            <p style={{
              fontSize: 12, color: 'var(--text-muted, #666)',
              fontFamily: 'var(--font-body)', margin: 0,
            }}>
              {showForgot
                ? (forgotStep === 1 ? 'Verify your identity' : forgotStep === 2 ? 'Enter the OTP sent to you' : 'Set your new password')
                : 'Free Fire Custom Tournament Platform'
              }
            </p>
          </div>

          {/* ===== FORGOT PASSWORD FLOW ===== */}
          {showForgot && (
            <>
              {/* Step indicators */}
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 0, marginBottom: 24 }}>
                {[1, 2, 3].map(step => (
                  <div key={step} style={{ display: 'flex', alignItems: 'center', gap: 0 }}>
                    <div style={{
                      width: 32, height: 32, borderRadius: '50%',
                      display: 'flex', alignItems: 'center', justifyContent: 'center',
                      fontSize: 12, fontWeight: 700, fontFamily: 'var(--font-heading)',
                      background: forgotStep >= step
                        ? 'linear-gradient(135deg, #fbbf24, #f59e0b)'
                        : 'rgba(255,255,255,0.05)',
                      color: forgotStep >= step ? '#000' : '#555',
                      border: forgotStep >= step ? 'none' : '1px solid rgba(255,255,255,0.1)',
                      boxShadow: forgotStep >= step ? '0 2px 12px rgba(251,191,36,0.2)' : 'none',
                      transition: 'all 0.3s',
                    }}>
                      {forgotStep > step ? <i className="fa-solid fa-check" style={{ fontSize: 11 }}></i> : step}
                    </div>
                    {step < 3 && (
                      <div style={{
                        width: 40, height: 2,
                        background: forgotStep > step ? '#fbbf24' : 'rgba(255,255,255,0.08)',
                        transition: 'background 0.3s',
                      }}></div>
                    )}
                  </div>
                ))}
              </div>

              {/* Step 1: Phone / Email */}
              {forgotStep === 1 && (
                <form onSubmit={handleSendOtp}>
                  <div style={{ marginBottom: 16 }}>
                    <label style={{
                      display: 'block', fontFamily: 'var(--font-heading)', fontSize: 11,
                      fontWeight: 700, color: 'var(--text-muted, #777)', letterSpacing: 0.5,
                      textTransform: 'uppercase', marginBottom: 6,
                    }}>
                      Phone Number
                    </label>
                    <div style={{ position: 'relative' }}>
                      <i className="fa-solid fa-phone" style={{
                        position: 'absolute', left: 14, top: '50%', transform: 'translateY(-50%)',
                        fontSize: 13, color: 'var(--text-muted, #555)',
                      }}></i>
                      <input
                        type="tel"
                        placeholder="01XXXXXXXXX"
                        value={forgotPhone}
                        onChange={e => { setForgotPhone(e.target.value); setForgotError('') }}
                        style={{ ...inputStyle, paddingLeft: 42, borderColor: forgotError ? 'rgba(239,68,68,0.4)' : undefined }}
                        onFocus={inputFocus}
                        onBlur={inputBlur}
                      />
                    </div>
                  </div>

                  <div style={{ marginBottom: 8 }}>
                    <label style={{
                      display: 'block', fontFamily: 'var(--font-heading)', fontSize: 11,
                      fontWeight: 700, color: 'var(--text-muted, #777)', letterSpacing: 0.5,
                      textTransform: 'uppercase', marginBottom: 6,
                    }}>
                      Email Address <span style={{ color: '#555', fontWeight: 400 }}>(optional)</span>
                    </label>
                    <div style={{ position: 'relative' }}>
                      <i className="fa-solid fa-envelope" style={{
                        position: 'absolute', left: 14, top: '50%', transform: 'translateY(-50%)',
                        fontSize: 13, color: 'var(--text-muted, #555)',
                      }}></i>
                      <input
                        type="email"
                        placeholder="your@email.com"
                        value={forgotEmail}
                        onChange={e => { setForgotEmail(e.target.value); setForgotError('') }}
                        style={{ ...inputStyle, paddingLeft: 42, borderColor: forgotError ? 'rgba(239,68,68,0.4)' : undefined }}
                        onFocus={inputFocus}
                        onBlur={inputBlur}
                      />
                    </div>
                  </div>

                  {forgotError && (
                    <div style={{
                      display: 'flex', alignItems: 'center', gap: 8,
                      padding: '10px 14px', marginBottom: 16,
                      background: 'rgba(239,68,68,0.08)',
                      border: '1px solid rgba(239,68,68,0.15)',
                      borderRadius: 10, animation: 'fadeIn 0.3s ease',
                    }}>
                      <i className="fa-solid fa-circle-exclamation" style={{ fontSize: 12, color: '#f87171', flexShrink: 0 }}></i>
                      <span style={{ fontSize: 12, color: '#f87171', fontFamily: 'var(--font-body)' }}>{forgotError}</span>
                    </div>
                  )}

                  <button type="submit" disabled={otpLoading} style={{
                    width: '100%', padding: '14px 0', borderRadius: 14, border: 'none',
                    fontFamily: 'var(--font-display)', fontSize: 15, fontWeight: 800,
                    letterSpacing: 1, cursor: otpLoading ? 'not-allowed' : 'pointer',
                    background: 'linear-gradient(135deg, #fbbf24, #f59e0b)',
                    color: '#fff', boxShadow: '0 6px 24px rgba(251,191,36,0.25)',
                    opacity: otpLoading ? 0.6 : 1,
                    display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 8,
                    transition: 'all 0.3s ease',
                  }}>
                    {otpLoading
                      ? <i className="fa-solid fa-spinner fa-spin" style={{ fontSize: 14 }}></i>
                      : <i className="fa-solid fa-paper-plane" style={{ fontSize: 14 }}></i>
                    }
                    {otpLoading ? 'SENDING...' : 'SEND OTP'}
                  </button>
                </form>
              )}

              {/* Step 2: Enter OTP */}
              {forgotStep === 2 && (
                <form onSubmit={handleVerifyOtp}>
                  <div style={{
                    textAlign: 'center', padding: '16px 0 8px', marginBottom: 16,
                    borderRadius: 12, background: 'rgba(251,191,36,0.06)',
                    border: '1px solid rgba(251,191,36,0.1)',
                  }}>
                    <i className="fa-solid fa-message" style={{ fontSize: 28, color: '#fbbf24', marginBottom: 8, display: 'block' }}></i>
                    <div style={{ fontSize: 12, color: '#fbbf24', fontFamily: 'var(--font-heading)', fontWeight: 600 }}>
                      OTP sent to {forgotPhone || forgotEmail}
                    </div>
                    <div style={{ fontSize: 11, color: 'var(--text-muted, #666)', fontFamily: 'var(--font-body)', marginTop: 4 }}>
                      Demo OTP: <span style={{ color: '#fbbf24', fontWeight: 700 }}>1234</span>
                    </div>
                  </div>

                  <div style={{ marginBottom: 8 }}>
                    <label style={{
                      display: 'block', fontFamily: 'var(--font-heading)', fontSize: 11,
                      fontWeight: 700, color: 'var(--text-muted, #777)', letterSpacing: 0.5,
                      textTransform: 'uppercase', marginBottom: 6,
                    }}>Enter OTP Code</label>
                    <input
                      type="text"
                      placeholder="Enter 4-digit OTP"
                      value={otpCode}
                      onChange={e => { setOtpCode(e.target.value); setForgotError('') }}
                      maxLength={6}
                      style={{ ...inputStyle, textAlign: 'center', fontSize: 22, fontFamily: 'var(--font-display)', letterSpacing: 8, borderColor: forgotError ? 'rgba(239,68,68,0.4)' : undefined }}
                      onFocus={inputFocus}
                      onBlur={inputBlur}
                    />
                  </div>

                  {forgotError && (
                    <div style={{
                      display: 'flex', alignItems: 'center', gap: 8,
                      padding: '10px 14px', marginBottom: 16,
                      background: 'rgba(239,68,68,0.08)',
                      border: '1px solid rgba(239,68,68,0.15)',
                      borderRadius: 10, animation: 'fadeIn 0.3s ease',
                    }}>
                      <i className="fa-solid fa-circle-exclamation" style={{ fontSize: 12, color: '#f87171', flexShrink: 0 }}></i>
                      <span style={{ fontSize: 12, color: '#f87171', fontFamily: 'var(--font-body)' }}>{forgotError}</span>
                    </div>
                  )}

                  <button type="submit" disabled={otpVerifyLoading} style={{
                    width: '100%', padding: '14px 0', borderRadius: 14, border: 'none',
                    fontFamily: 'var(--font-display)', fontSize: 15, fontWeight: 800,
                    letterSpacing: 1, cursor: otpVerifyLoading ? 'not-allowed' : 'pointer',
                    background: 'linear-gradient(135deg, #fbbf24, #f59e0b)',
                    color: '#fff', boxShadow: '0 6px 24px rgba(251,191,36,0.25)',
                    opacity: otpVerifyLoading ? 0.6 : 1,
                    display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 8,
                    transition: 'all 0.3s ease',
                  }}>
                    {otpVerifyLoading
                      ? <i className="fa-solid fa-spinner fa-spin" style={{ fontSize: 14 }}></i>
                      : <i className="fa-solid fa-shield-halved" style={{ fontSize: 14 }}></i>
                    }
                    {otpVerifyLoading ? 'VERIFYING...' : 'VERIFY OTP'}
                  </button>

                  <button type="button" onClick={handleSendOtp} style={{
                    width: '100%', padding: '10px 0', borderRadius: 10, border: 'none',
                    fontFamily: 'var(--font-heading)', fontSize: 12, fontWeight: 600,
                    cursor: 'pointer', background: 'transparent',
                    color: 'var(--text-muted, #888)', marginTop: 8,
                  }}>
                    <i className="fa-solid fa-rotate-right" style={{ marginRight: 4 }}></i> Resend OTP
                  </button>
                </form>
              )}

              {/* Step 3: New Password */}
              {forgotStep === 3 && (
                <form onSubmit={handleResetPassword}>
                  <div style={{ marginBottom: 16 }}>
                    <label style={{
                      display: 'block', fontFamily: 'var(--font-heading)', fontSize: 11,
                      fontWeight: 700, color: 'var(--text-muted, #777)', letterSpacing: 0.5,
                      textTransform: 'uppercase', marginBottom: 6,
                    }}>New Password</label>
                    <div style={{ position: 'relative' }}>
                      <i className="fa-solid fa-lock" style={{
                        position: 'absolute', left: 14, top: '50%', transform: 'translateY(-50%)',
                        fontSize: 13, color: 'var(--text-muted, #555)',
                      }}></i>
                      <input
                        type="password"
                        placeholder="Enter new password"
                        value={newPass}
                        onChange={e => { setNewPass(e.target.value); setForgotError('') }}
                        style={{ ...inputStyle, paddingLeft: 42, borderColor: forgotError ? 'rgba(239,68,68,0.4)' : undefined }}
                        onFocus={inputFocus}
                        onBlur={inputBlur}
                      />
                    </div>
                  </div>

                  <div style={{ marginBottom: 8 }}>
                    <label style={{
                      display: 'block', fontFamily: 'var(--font-heading)', fontSize: 11,
                      fontWeight: 700, color: 'var(--text-muted, #777)', letterSpacing: 0.5,
                      textTransform: 'uppercase', marginBottom: 6,
                    }}>Confirm New Password</label>
                    <div style={{ position: 'relative' }}>
                      <i className="fa-solid fa-lock" style={{
                        position: 'absolute', left: 14, top: '50%', transform: 'translateY(-50%)',
                        fontSize: 13, color: 'var(--text-muted, #555)',
                      }}></i>
                      <input
                        type="password"
                        placeholder="Confirm new password"
                        value={newPassConfirm}
                        onChange={e => { setNewPassConfirm(e.target.value); setForgotError('') }}
                        style={{ ...inputStyle, paddingLeft: 42, borderColor: forgotError ? 'rgba(239,68,68,0.4)' : undefined }}
                        onFocus={inputFocus}
                        onBlur={inputBlur}
                      />
                    </div>
                    {newPassConfirm && newPass !== newPassConfirm && (
                      <div style={{ fontSize: 11, color: '#ef4444', fontFamily: 'var(--font-body)', marginTop: 6 }}>
                        <i className="fa-solid fa-xmark" style={{ marginRight: 4 }}></i>Passwords don't match
                      </div>
                    )}
                  </div>

                  {forgotError && (
                    <div style={{
                      display: 'flex', alignItems: 'center', gap: 8,
                      padding: '10px 14px', marginBottom: 16,
                      background: 'rgba(239,68,68,0.08)',
                      border: '1px solid rgba(239,68,68,0.15)',
                      borderRadius: 10, animation: 'fadeIn 0.3s ease',
                    }}>
                      <i className="fa-solid fa-circle-exclamation" style={{ fontSize: 12, color: '#f87171', flexShrink: 0 }}></i>
                      <span style={{ fontSize: 12, color: '#f87171', fontFamily: 'var(--font-body)' }}>{forgotError}</span>
                    </div>
                  )}

                  <button type="submit" style={{
                    width: '100%', padding: '14px 0', borderRadius: 14, border: 'none',
                    fontFamily: 'var(--font-display)', fontSize: 15, fontWeight: 800,
                    letterSpacing: 1, cursor: 'pointer',
                    background: 'linear-gradient(135deg, #22c55e, #16a34a)',
                    color: '#fff', boxShadow: '0 6px 24px rgba(34,197,94,0.25)',
                    display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 8,
                    transition: 'all 0.3s ease',
                  }}>
                    <i className="fa-solid fa-check"></i> RESET PASSWORD
                  </button>
                </form>
              )}

              {/* Back to login */}
              <button onClick={resetForgot} style={{
                width: '100%', padding: '10px 0', borderRadius: 10, border: 'none',
                fontFamily: 'var(--font-heading)', fontSize: 12, fontWeight: 600,
                cursor: 'pointer', background: 'transparent',
                color: 'var(--text-muted, #888)', marginTop: 12,
              }}>
                <i className="fa-solid fa-arrow-left" style={{ marginRight: 4 }}></i> Back to Login
              </button>
            </>
          )}

          {/* ===== NORMAL LOGIN/REGISTER ===== */}
          {!showForgot && (
            <>
              {/* ===== FIREBASE AUTH SECTION ===== */}
              <div style={{ marginBottom: 16 }}>
                <button onClick={handleGoogleLogin} disabled={googleLoading} style={{ width: '100%', padding: '12px 0', borderRadius: 12, border: '1px solid rgba(255,255,255,0.1)', background: 'rgba(255,255,255,0.04)', color: '#fff', fontFamily: 'var(--font-heading)', fontSize: 13, fontWeight: 700, cursor: googleLoading ? 'not-allowed' : 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 10, opacity: googleLoading ? 0.6 : 1, transition: 'all 0.3s ease' }}>
                  {googleLoading ? <i className="fa-solid fa-spinner fa-spin"></i> : <i className="fa-brands fa-google" style={{ color: '#ea4335' }}></i>}
                  {googleLoading ? 'CONNECTING...' : 'CONTINUE WITH GOOGLE'}
                </button>

                {authMethod === 'local' && (
                  <button onClick={() => { setAuthMethod('phone'); setFbError('') }} style={{ width: '100%', padding: '12px 0', borderRadius: 12, border: 'none', background: 'linear-gradient(135deg, #00f0ff, #a78bfa)', color: '#fff', fontFamily: 'var(--font-heading)', fontSize: 13, fontWeight: 700, cursor: 'pointer', marginTop: 8, display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 10, boxShadow: '0 4px 16px rgba(0,240,255,0.2)', transition: 'all 0.3s ease' }}>
                    <i className="fa-solid fa-phone"></i> CONTINUE WITH PHONE OTP
                  </button>
                )}

                {authMethod === 'phone' && phoneStep === 'input' && (
                  <form onSubmit={handleSendPhoneOtp} style={{ marginTop: 8 }}>
                    <div style={{ display: 'flex', gap: 8 }}>
                      <div style={{ position: 'relative', flex: 1 }}><i className="fa-solid fa-phone" style={{ position: 'absolute', left: 14, top: '50%', transform: 'translateY(-50%)', fontSize: 13, color: '#555' }}></i><input type="tel" placeholder="01XXXXXXXXX" value={fbPhone} onChange={e => { setFbPhone(e.target.value); setFbError('') }} style={{ ...inputStyle, paddingLeft: 42, fontFamily: 'var(--font-display)', letterSpacing: 2, borderColor: fbError ? 'rgba(239,68,68,0.4)' : undefined }} onFocus={inputFocus} onBlur={inputBlur} /></div>
                      <button type="submit" disabled={phoneLoading} style={{ padding: '0 20px', borderRadius: 12, border: 'none', background: 'linear-gradient(135deg, #00f0ff, #a78bfa)', color: '#fff', fontFamily: 'var(--font-heading)', fontSize: 13, fontWeight: 700, cursor: phoneLoading ? 'not-allowed' : 'pointer', opacity: phoneLoading ? 0.6 : 1, display: 'flex', alignItems: 'center', gap: 6 }}>{phoneLoading ? <i className="fa-solid fa-spinner fa-spin"></i> : <i className="fa-solid fa-paper-plane"></i>}{phoneLoading ? '...' : 'SEND'}</button>
                    </div>
                    <button type="button" onClick={resetFb} style={{ width: '100%', padding: '8px 0', borderRadius: 8, border: 'none', background: 'transparent', color: '#666', fontFamily: 'var(--font-heading)', fontSize: 11, fontWeight: 600, cursor: 'pointer', marginTop: 8 }}><i className="fa-solid fa-arrow-left" style={{ marginRight: 4 }}></i> Back</button>
                  </form>
                )}

                {authMethod === 'phone' && phoneStep === 'otp' && (
                  <form onSubmit={handleVerifyPhoneOtp} style={{ marginTop: 8 }}>
                    <div style={{ textAlign: 'center', padding: '12px 0 8px', marginBottom: 12, borderRadius: 10, background: 'rgba(0,240,255,0.06)', border: '1px solid rgba(0,240,255,0.1)' }}>
                      <div style={{ fontSize: 11, color: '#00f0ff', fontFamily: 'var(--font-heading)', fontWeight: 600 }}>Real OTP sent to {fbPhone}</div>
                    </div>
                    <div style={{ display: 'flex', gap: 8 }}>
                      <input type="text" placeholder="6-digit OTP" value={fbOtp} onChange={e => { setFbOtp(e.target.value); setFbError('') }} maxLength={6} style={{ ...inputStyle, flex: 1, textAlign: 'center', fontSize: 20, fontFamily: 'var(--font-display)', letterSpacing: 6, borderColor: fbError ? 'rgba(239,68,68,0.4)' : undefined }} onFocus={inputFocus} onBlur={inputBlur} />
                      <button type="submit" disabled={fbOtpLoading} style={{ padding: '0 20px', borderRadius: 12, border: 'none', background: 'linear-gradient(135deg, #22c55e, #16a34a)', color: '#fff', fontFamily: 'var(--font-heading)', fontSize: 13, fontWeight: 700, cursor: fbOtpLoading ? 'not-allowed' : 'pointer', opacity: fbOtpLoading ? 0.6 : 1, display: 'flex', alignItems: 'center', gap: 6 }}>{fbOtpLoading ? <i className="fa-solid fa-spinner fa-spin"></i> : <i className="fa-solid fa-check"></i>}{fbOtpLoading ? '...' : 'VERIFY'}</button>
                    </div>
                    <button type="button" onClick={resetFb} style={{ width: '100%', padding: '8px 0', borderRadius: 8, border: 'none', background: 'transparent', color: '#666', fontFamily: 'var(--font-heading)', fontSize: 11, fontWeight: 600, cursor: 'pointer', marginTop: 8 }}><i className="fa-solid fa-arrow-left" style={{ marginRight: 4 }}></i> Back</button>
                  </form>
                )}

                {fbError && (<div style={{ display: 'flex', alignItems: 'center', gap: 8, padding: '10px 14px', marginTop: 8, background: 'rgba(239,68,68,0.08)', border: '1px solid rgba(239,68,68,0.15)', borderRadius: 10, animation: 'fadeIn 0.3s ease' }}><i className="fa-solid fa-circle-exclamation" style={{ fontSize: 12, color: '#f87171', flexShrink: 0 }}></i><span style={{ fontSize: 12, color: '#f87171' }}>{fbError}</span></div>)}
              </div>

              {/* Divider */}
              <div style={{ display: 'flex', alignItems: 'center', gap: 12, marginBottom: 20 }}>
                <div style={{ flex: 1, height: 1, background: 'rgba(255,255,255,0.06)' }}></div>
                <span style={{ fontSize: 10, color: '#555', fontFamily: 'var(--font-heading)', fontWeight: 600, textTransform: 'uppercase', letterSpacing: 1 }}>Or local account</span>
                <div style={{ flex: 1, height: 1, background: 'rgba(255,255,255,0.06)' }}></div>
              </div>

              {/* Login / Register Tabs */}
              <div style={{
                display: 'flex', gap: 4, padding: 4,
                borderRadius: 12, marginBottom: 24,
                background: 'rgba(255,255,255,0.03)',
                border: '1px solid rgba(255,255,255,0.05)',
              }}>
                {['login', 'register'].map(t => (
                  <button
                    key={t}
                    onClick={() => { setTab(t); setError(''); setRegError('') }}
                    style={{
                      flex: 1, padding: '10px 0', borderRadius: 10, border: 'none',
                      fontFamily: 'var(--font-heading)', fontSize: 13, fontWeight: 700,
                      cursor: 'pointer', transition: 'all 0.3s ease',
                      background: tab === t
                        ? 'linear-gradient(135deg, rgba(0,240,255,0.15), rgba(167,139,250,0.1))'
                        : 'transparent',
                      color: tab === t ? '#00f0ff' : 'var(--text-muted, #666)',
                      boxShadow: tab === t ? '0 2px 12px rgba(0,240,255,0.1)' : 'none',
                    }}
                  >
                    {t === 'login' ? '🔑 Login' : '📝 Register'}
                  </button>
                ))}
              </div>

              {/* Role Selector (Login only) */}
              {tab === 'login' && (
                <div style={{ marginBottom: 20 }}>
                  <label style={{
                    display: 'block', fontFamily: 'var(--font-heading)', fontSize: 10,
                    fontWeight: 700, color: 'var(--text-muted, #666)', letterSpacing: 1,
                    textTransform: 'uppercase', marginBottom: 8,
                  }}>Login As</label>
                  <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 8 }}>
                    {[
                      { key: 'user', label: '🎮 Player', desc: 'Phone + password' },
                      { key: 'admin', label: '👑 Admin', desc: 'Username + password' },
                    ].map(r => (
                      <button
                        key={r.key}
                        onClick={() => { setRole(r.key); setError('') }}
                        style={{
                          padding: '12px 10px', borderRadius: 12,
                          border: `1px solid ${role === r.key
                            ? (r.key === 'admin' ? 'rgba(251,191,36,0.3)' : 'rgba(0,240,255,0.3)')
                            : 'rgba(255,255,255,0.05)'}`,
                          background: role === r.key
                            ? (r.key === 'admin' ? 'rgba(251,191,36,0.08)' : 'rgba(0,240,255,0.08)')
                            : 'rgba(255,255,255,0.02)',
                          cursor: 'pointer', textAlign: 'center', transition: 'all 0.3s ease',
                        }}
                      >
                        <div style={{ fontSize: 18, marginBottom: 4 }}>{r.label.split(' ')[0]}</div>
                        <div style={{
                          fontSize: 11, fontWeight: 700, fontFamily: 'var(--font-heading)',
                          color: role === r.key
                            ? (r.key === 'admin' ? '#fbbf24' : '#00f0ff')
                            : 'var(--text-muted, #555)',
                        }}>
                          {r.label.split(' ')[1]}
                        </div>
                        <div style={{ fontSize: 9, color: 'var(--text-muted, #555)', fontFamily: 'var(--font-body)', marginTop: 2 }}>
                          {r.desc}
                        </div>
                      </button>
                    ))}
                  </div>
                </div>
              )}

              {/* ===== LOGIN FORM ===== */}
              {tab === 'login' && (
                <form onSubmit={handleLogin}>
                  <div style={{ marginBottom: 16 }}>
                    <label style={{
                      display: 'block', fontFamily: 'var(--font-heading)', fontSize: 11,
                      fontWeight: 700, color: 'var(--text-muted, #777)', letterSpacing: 0.5,
                      textTransform: 'uppercase', marginBottom: 6,
                    }}>
                      {role === 'admin' ? 'Username' : 'Phone Number'}
                    </label>
                    <div style={{ position: 'relative' }}>
                      <i className={`fa-solid ${role === 'admin' ? 'fa-user' : 'fa-phone'}`} style={{
                        position: 'absolute', left: 14, top: '50%', transform: 'translateY(-50%)',
                        fontSize: 13, color: 'var(--text-muted, #555)',
                      }}></i>
                      <input
                        type={role === 'admin' ? 'text' : 'tel'}
                        placeholder={role === 'admin' ? 'Enter username' : '01XXXXXXXXX'}
                        value={loginPhone}
                        onChange={e => { setLoginPhone(e.target.value); setError('') }}
                        autoComplete={role === 'admin' ? 'username' : 'tel'}
                        style={{
                          ...inputStyle, paddingLeft: 42,
                          borderColor: error ? 'rgba(239,68,68,0.4)' : undefined,
                          fontFamily: role === 'admin' ? 'var(--font-body)' : 'var(--font-display)',
                          letterSpacing: role === 'admin' ? 0 : 2,
                        }}
                        onFocus={inputFocus}
                        onBlur={inputBlur}
                      />
                    </div>
                  </div>

                  <div style={{ marginBottom: error ? 8 : 24 }}>
                    <label style={{
                      display: 'block', fontFamily: 'var(--font-heading)', fontSize: 11,
                      fontWeight: 700, color: 'var(--text-muted, #777)', letterSpacing: 0.5,
                      textTransform: 'uppercase', marginBottom: 6,
                    }}>Password</label>
                    <div style={{ position: 'relative' }}>
                      <i className="fa-solid fa-lock" style={{
                        position: 'absolute', left: 14, top: '50%', transform: 'translateY(-50%)',
                        fontSize: 13, color: 'var(--text-muted, #555)',
                      }}></i>
                      <input
                        type="password"
                        placeholder="Enter password"
                        value={loginPass}
                        onChange={e => { setLoginPass(e.target.value); setError('') }}
                        autoComplete="current-password"
                        style={{
                          ...inputStyle, paddingLeft: 42,
                          borderColor: error ? 'rgba(239,68,68,0.4)' : undefined,
                        }}
                        onFocus={inputFocus}
                        onBlur={inputBlur}
                      />
                    </div>
                  </div>

                  {/* Forgot password link (player only) */}
                  {role === 'user' && (
                    <div style={{ textAlign: 'right', marginBottom: 20 }}>
                      <button type="button" onClick={() => setShowForgot(true)} style={{
                        background: 'none', border: 'none', padding: 0,
                        fontFamily: 'var(--font-heading)', fontSize: 11, fontWeight: 600,
                        color: '#fbbf24', cursor: 'pointer',
                      }}>
                        <i className="fa-solid fa-key" style={{ marginRight: 4, fontSize: 10 }}></i>Forgot Password?
                      </button>
                    </div>
                  )}

                  {error && (
                    <div style={{
                      display: 'flex', alignItems: 'center', gap: 8,
                      padding: '10px 14px', marginBottom: 16,
                      background: 'rgba(239,68,68,0.08)',
                      border: '1px solid rgba(239,68,68,0.15)',
                      borderRadius: 10, animation: 'fadeIn 0.3s ease',
                    }}>
                      <i className="fa-solid fa-circle-exclamation" style={{ fontSize: 12, color: '#f87171', flexShrink: 0 }}></i>
                      <span style={{ fontSize: 12, color: '#f87171', fontFamily: 'var(--font-body)' }}>{error}</span>
                    </div>
                  )}

                  <button
                    type="submit"
                    disabled={loading}
                    style={{
                      width: '100%', padding: '14px 0', borderRadius: 14, border: 'none',
                      fontFamily: 'var(--font-display)', fontSize: 15, fontWeight: 800,
                      letterSpacing: 1, cursor: loading ? 'not-allowed' : 'pointer',
                      background: role === 'admin'
                        ? 'linear-gradient(135deg, #fbbf24, #f59e0b)'
                        : 'linear-gradient(135deg, #00f0ff, #a78bfa)',
                      color: '#fff',
                      boxShadow: role === 'admin'
                        ? '0 6px 24px rgba(251,191,36,0.25)'
                        : '0 6px 24px rgba(0,240,255,0.25)',
                      transition: 'all 0.3s ease',
                      opacity: loading ? 0.6 : 1,
                      display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 8,
                    }}
                    onMouseEnter={e => {
                      if (!loading) {
                        e.currentTarget.style.transform = 'translateY(-2px)'
                        e.currentTarget.style.boxShadow = role === 'admin'
                          ? '0 8px 32px rgba(251,191,36,0.35)'
                          : '0 8px 32px rgba(0,240,255,0.35)'
                      }
                    }}
                    onMouseLeave={e => {
                      e.currentTarget.style.transform = 'translateY(0)'
                      e.currentTarget.style.boxShadow = role === 'admin'
                        ? '0 6px 24px rgba(251,191,36,0.25)'
                        : '0 6px 24px rgba(0,240,255,0.25)'
                    }}
                  >
                    {loading
                      ? <i className="fa-solid fa-spinner fa-spin" style={{ fontSize: 14 }}></i>
                      : <i className="fa-solid fa-bolt" style={{ fontSize: 14 }}></i>
                    }
                    {loading ? 'VERIFYING...' : `LOGIN ${role === 'admin' ? 'AS ADMIN' : 'NOW'}`}
                  </button>

                  {/* Credential hints */}
                  <div style={{
                    marginTop: 20, padding: '12px 14px', borderRadius: 10,
                    background: 'rgba(255,255,255,0.02)', border: '1px solid rgba(255,255,255,0.04)',
                  }}>
                    <div style={{
                      fontSize: 10, fontWeight: 700, fontFamily: 'var(--font-heading)',
                      color: 'var(--text-muted, #555)', letterSpacing: 0.5, marginBottom: 6,
                      textTransform: 'uppercase',
                    }}>
                      <i className="fa-solid fa-key" style={{ marginRight: 4, color: role === 'admin' ? 'rgba(251,191,36,0.5)' : 'rgba(0,240,255,0.4)' }}></i>
                      {role === 'admin' ? 'Admin Credentials' : 'Player Credentials'}
                    </div>
                    {role === 'user' ? (
                      <p style={{ fontSize: 10, color: 'var(--text-muted, #555)', fontFamily: 'var(--font-body)', margin: 0, lineHeight: 1.7 }}>
                        Phone: <span style={{ color: '#00f0ff' }}>01700000001</span> &nbsp;|&nbsp; Password: <span style={{ color: '#00f0ff' }}>1234</span>
                      </p>
                    ) : (
                      <p style={{ fontSize: 10, color: 'var(--text-muted, #555)', fontFamily: 'var(--font-body)', margin: 0, lineHeight: 1.7 }}>
                        Admin: <span style={{ color: '#fbbf24' }}>admin1</span> / <span style={{ color: '#fbbf24' }}>admin123</span> &nbsp;|&nbsp;
                        Owner: <span style={{ color: '#fbbf24' }}>owner</span> / <span style={{ color: '#fbbf24' }}>owner123</span>
                      </p>
                    )}
                  </div>
                </form>
              )}

              {/* ===== REGISTER FORM ===== */}
              {tab === 'register' && (
                <form onSubmit={handleRegister}>
                  <div style={{ marginBottom: 14 }}>
                    <label style={{
                      display: 'block', fontFamily: 'var(--font-heading)', fontSize: 11,
                      fontWeight: 700, color: 'var(--text-muted, #777)', letterSpacing: 0.5,
                      textTransform: 'uppercase', marginBottom: 6,
                    }}>Display Name *</label>
                    <input
                      type="text" placeholder="Your display name"
                      value={regName} onChange={e => { setRegName(e.target.value); setRegError('') }}
                      style={inputStyle} onFocus={inputFocus} onBlur={inputBlur}
                    />
                  </div>

                  {/* ★ NEW: Free Fire UID */}
                  <div style={{ marginBottom: 14 }}>
                    <label style={{
                      display: 'block', fontFamily: 'var(--font-heading)', fontSize: 11,
                      fontWeight: 700, color: 'var(--text-muted, #777)', letterSpacing: 0.5,
                      textTransform: 'uppercase', marginBottom: 6,
                    }}>Free Fire UID *</label>
                    <div style={{ position: 'relative' }}>
                      <i className="fa-solid fa-id-badge" style={{
                        position: 'absolute', left: 14, top: '50%', transform: 'translateY(-50%)',
                        fontSize: 13, color: 'var(--text-muted, #555)',
                      }}></i>
                      <input
                        type="text" placeholder="e.g., 1234567890"
                        value={regUid} onChange={e => { setRegUid(e.target.value); setRegError('') }}
                        style={{ ...inputStyle, paddingLeft: 42, fontFamily: 'var(--font-display)', letterSpacing: 1 }}
                        onFocus={inputFocus} onBlur={inputBlur}
                      />
                    </div>
                  </div>

                  <div style={{ marginBottom: 14 }}>
                    <label style={{
                      display: 'block', fontFamily: 'var(--font-heading)', fontSize: 11,
                      fontWeight: 700, color: 'var(--text-muted, #777)', letterSpacing: 0.5,
                      textTransform: 'uppercase', marginBottom: 6,
                    }}>In-Game Name (IGN) *</label>
                    <input
                      type="text" placeholder="Your Free Fire IGN"
                      value={regIgn} onChange={e => { setRegIgn(e.target.value); setRegError('') }}
                      style={inputStyle} onFocus={inputFocus} onBlur={inputBlur}
                    />
                  </div>

                  <div style={{ marginBottom: 14 }}>
                    <label style={{
                      display: 'block', fontFamily: 'var(--font-heading)', fontSize: 11,
                      fontWeight: 700, color: 'var(--text-muted, #777)', letterSpacing: 0.5,
                      textTransform: 'uppercase', marginBottom: 6,
                    }}>Phone Number *</label>
                    <div style={{ position: 'relative' }}>
                      <i className="fa-solid fa-phone" style={{
                        position: 'absolute', left: 14, top: '50%', transform: 'translateY(-50%)',
                        fontSize: 13, color: 'var(--text-muted, #555)',
                      }}></i>
                      <input
                        type="tel" placeholder="01XXXXXXXXX"
                        value={regPhone} onChange={e => { setRegPhone(e.target.value); setRegError('') }}
                        style={{ ...inputStyle, paddingLeft: 42, fontFamily: 'var(--font-display)', letterSpacing: 2 }}
                        onFocus={inputFocus} onBlur={inputBlur}
                      />
                    </div>
                  </div>

                  <div style={{ marginBottom: 14 }}>
                    <label style={{
                      display: 'block', fontFamily: 'var(--font-heading)', fontSize: 11,
                      fontWeight: 700, color: 'var(--text-muted, #777)', letterSpacing: 0.5,
                      textTransform: 'uppercase', marginBottom: 6,
                    }}>Email Address <span style={{ color: '#555', fontWeight: 400 }}>(optional)</span></label>
                    <div style={{ position: 'relative' }}>
                      <i className="fa-solid fa-envelope" style={{
                        position: 'absolute', left: 14, top: '50%', transform: 'translateY(-50%)',
                        fontSize: 13, color: 'var(--text-muted, #555)',
                      }}></i>
                      <input
                        type="email" placeholder="your@email.com"
                        value={regEmail} onChange={e => { setRegEmail(e.target.value); setRegError('') }}
                        style={{ ...inputStyle, paddingLeft: 42 }}
                        onFocus={inputFocus} onBlur={inputBlur}
                      />
                    </div>
                  </div>

                  <div style={{ marginBottom: 14 }}>
                    <label style={{
                      display: 'block', fontFamily: 'var(--font-heading)', fontSize: 11,
                      fontWeight: 700, color: 'var(--text-muted, #777)', letterSpacing: 0.5,
                      textTransform: 'uppercase', marginBottom: 6,
                    }}>Password *</label>
                    <input
                      type="password" placeholder="Create a password"
                      value={regPass} onChange={e => { setRegPass(e.target.value); setRegError('') }}
                      style={inputStyle} onFocus={inputFocus} onBlur={inputBlur}
                    />
                  </div>

                  <div style={{ marginBottom: 8 }}>
                    <label style={{
                      display: 'block', fontFamily: 'var(--font-heading)', fontSize: 11,
                      fontWeight: 700, color: 'var(--text-muted, #777)', letterSpacing: 0.5,
                      textTransform: 'uppercase', marginBottom: 6,
                    }}>Confirm Password *</label>
                    <input
                      type="password" placeholder="Confirm your password"
                      value={regConfirm} onChange={e => { setRegConfirm(e.target.value); setRegError('') }}
                      style={{
                        ...inputStyle,
                        borderColor: regConfirm && regPass !== regConfirm ? 'rgba(239,68,68,0.3)' : undefined,
                      }}
                      onFocus={inputFocus}
                      onBlur={e => { e.target.style.borderColor = regConfirm && regPass !== regConfirm ? 'rgba(239,68,68,0.3)' : 'rgba(255,255,255,0.08)' }}
                    />
                    {regConfirm && regPass !== regConfirm && (
                      <div style={{ fontSize: 11, color: '#ef4444', fontFamily: 'var(--font-body)', marginTop: 6 }}>
                        <i className="fa-solid fa-xmark" style={{ marginRight: 4 }}></i>Passwords don't match
                      </div>
                    )}
                  </div>

                  {regError && (
                    <div style={{
                      display: 'flex', alignItems: 'center', gap: 8,
                      padding: '10px 14px', marginBottom: 16,
                      background: 'rgba(239,68,68,0.08)',
                      border: '1px solid rgba(239,68,68,0.15)',
                      borderRadius: 10, animation: 'fadeIn 0.3s ease',
                    }}>
                      <i className="fa-solid fa-circle-exclamation" style={{ fontSize: 12, color: '#f87171', flexShrink: 0 }}></i>
                      <span style={{ fontSize: 12, color: '#f87171', fontFamily: 'var(--font-body)' }}>{regError}</span>
                    </div>
                  )}

                  <button
                    type="submit"
                    style={{
                      width: '100%', padding: '14px 0', borderRadius: 14, border: 'none',
                      fontFamily: 'var(--font-display)', fontSize: 15, fontWeight: 800,
                      letterSpacing: 1, cursor: 'pointer',
                      background: 'linear-gradient(135deg, #22c55e, #16a34a)',
                      color: '#fff', boxShadow: '0 6px 24px rgba(34,197,94,0.25)',
                      transition: 'all 0.3s ease',
                      display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 8,
                    }}
                    onMouseEnter={e => { e.currentTarget.style.transform = 'translateY(-2px)'; e.currentTarget.style.boxShadow = '0 8px 32px rgba(34,197,94,0.35)' }}
                    onMouseLeave={e => { e.currentTarget.style.transform = 'translateY(0)'; e.currentTarget.style.boxShadow = '0 6px 24px rgba(34,197,94,0.25)' }}
                  >
                    <i className="fa-solid fa-user-plus"></i>
                    CREATE ACCOUNT
                  </button>
                </form>
              )}

              {/* Bottom text */}
              <div style={{
                marginTop: 24, textAlign: 'center',
                borderTop: '1px solid rgba(255,255,255,0.04)', paddingTop: 20,
              }}>
                <p style={{ fontSize: 11, color: 'var(--text-muted, #555)', fontFamily: 'var(--font-body)', margin: '0 0 6px' }}>
                  🔥 Powered by Clutch Arena BD
                </p>
                <p style={{ fontSize: 10, color: 'var(--text-muted, #444)', fontFamily: 'var(--font-body)', margin: 0 }}>
                  Free Fire is a trademark of Garena. Not affiliated.
                </p>
              </div>
            </>
          )}
        </div>
      </div>

      <style>{`
        @keyframes float0 {
          0%, 100% { transform: translateY(0) translateX(0); opacity: 0.3; }
          50% { transform: translateY(-30px) translateX(10px); opacity: 0.6; }
        }
        @keyframes float1 {
          0%, 100% { transform: translateY(0) translateX(0); opacity: 0.4; }
          50% { transform: translateY(-40px) translateX(-15px); opacity: 0.7; }
        }
        @keyframes float2 {
          0%, 100% { transform: translateY(0) translateX(0); opacity: 0.2; }
          50% { transform: translateY(-20px) translateX(20px); opacity: 0.5; }
        }
        @keyframes shimmer {
          0% { background-position: 0% 50%; }
          100% { background-position: 300% 50%; }
        }
        @keyframes fadeIn {
          from { opacity: 0; transform: translateY(-6px); }
          to { opacity: 1; transform: translateY(0); }
        }
      `}</style>
    </div>
  )
}