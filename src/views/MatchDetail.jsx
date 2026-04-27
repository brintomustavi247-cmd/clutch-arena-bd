import { useMemo, useState } from 'react'
import { useApp } from '../context'
import { formatTK, calculateMatchEconomics, getRoomUnlockCountdown, showToast } from '../utils'

/* ── helpers ── */

const pad = n => String(n).padStart(2, '0')

function scheduledTime(ts) {
  if (!ts) return { time: 'TBA', date: '' }
  const d = new Date(ts)
  let h = d.getHours()
  const m = pad(d.getMinutes())
  const ap = h >= 12 ? 'PM' : 'AM'
  h = h % 12 || 12
  const day = d.getDate()
  const mons = ['Jan','Feb','Mar','Apr','May','Jun','Jul','Aug','Sep','Oct','Nov','Dec']
  return { time: `${h}:${m} ${ap}`, date: `${day} ${mons[d.getMonth()]}` }
}

function cdFormat(ms) {
  if (ms <= 0) return null
  const h = Math.floor(ms / 3600000)
  const m = Math.floor((ms % 3600000) / 60000)
  const s = Math.floor((ms % 60000) / 1000)
  return `${pad(h)}:${pad(m)}:${pad(s)}`
}

function ordinal(n) {
  const s = ['th','st','nd','rd']
  const v = n % 100
  return n + (s[(v - 20) % 10] || s[v] || s[0])
}

const MAP_IMAGES = {
  Bermuda: 'https://images.unsplash.com/photo-1542751371-adc38448a05e?w=800&q=80',
  Purgatory: 'https://images.unsplash.com/photo-1511512578047-dfb367046420?w=800&q=80',
  Kalahari: 'https://images.unsplash.com/photo-1552820728-8b83bb6b2b28?w=800&q=80',
  Alpine: 'https://images.unsplash.com/photo-1506905925346-21bda4d32df4?w=800&q=80',
}

const esportsCard = {
  background: 'linear-gradient(145deg, #1b1b1d, #131315)',
  boxShadow: 'inset 0 1px 0 rgba(255,255,255,0.03)',
  border: '1px solid rgba(62,72,78,0.15)',
  borderRadius: 14,
}

function SectionHead({ label }) {
  return (
    <div style={{
      fontFamily: 'Lexend', fontWeight: 700, fontSize: 12, color: '#e8e8e8',
      textTransform: 'uppercase', fontStyle: 'italic', letterSpacing: 0.5,
      marginBottom: 12, paddingLeft: 4,
    }}>{label}</div>
  )
}

const RANK_CFG = {
  1: {
    badgeBg: 'linear-gradient(135deg, #FFD700, #FFB800)', badgeTxt: '#503E00',
    barBg: 'linear-gradient(to bottom, #FFD700, #FFB800)',
    amtBg: 'linear-gradient(135deg, #FFD700, #FFB800)',
    glow: '0 0 12px rgba(255,215,0,0.15)',
  },
  2: {
    badgeBg: 'linear-gradient(135deg, #C0C6D9, #8F9BB3)', badgeTxt: '#2D3342',
    barBg: 'linear-gradient(to bottom, #C0C6D9, #8F9BB3)',
    amtBg: 'linear-gradient(135deg, #C0C6D9, #8F9BB3)',
    glow: '0 0 12px rgba(192,198,217,0.10)',
  },
  3: {
    badgeBg: 'linear-gradient(135deg, #FF8A3D, #C76B2F)', badgeTxt: '#4A1D00',
    barBg: 'linear-gradient(to bottom, #FF8A3D, #C76B2F)',
    amtBg: 'linear-gradient(135deg, #FF8A3D, #C76B2F)',
    glow: '0 0 12px rgba(255,138,61,0.10)',
  },
}

function rankColor(rank) {
  if (rank === 1) return '#FFD700'
  if (rank === 2) return '#C0C6D9'
  if (rank === 3) return '#FF8A3D'
  return null
}

function gradientText(bg, fontSize, fontWeight) {
  return {
    background: bg,
    WebkitBackgroundClip: 'text',
    WebkitTextFillColor: 'transparent',
    backgroundClip: 'text',
    fontFamily: 'Inter', fontSize, fontWeight: fontWeight || 700,
  }
}

function isTeamMode(mode) {
  return mode === 'Duo' || mode === 'Squad' || mode === 'Clash Squad'
}

/* ── bilingual rules — your exact 15 rules ── */

const RULES_EN = [
  { e: '🔒', t: 'Room ID and Password will be shared 10 minutes before the match starts.' },
  { e: '🎮', t: 'Verify your Game ID correctly when joining the match. Joining with anything other than the correct Game ID will not be allowed.' },
  { e: '📊', t: 'The playing account must be at least Level 40. Lower level accounts will not be permitted.' },
  { e: '📷', t: 'For any match or app issues, always save video or clear proof. Complaints without evidence will not be accepted.' },
  { e: '⏰', t: 'If you enter on time but find 48 spots full or the match already started, record a short video with your phone\'s current time. This video is required for verification. No refund after time passes.' },
  { e: '📱', t: 'After joining the Custom Room, if you cannot enter the match when it starts, CLUTCH ARENA BD will not be responsible. This usually happens due to network issues.' },
  { e: '⚠️', t: 'Bringing outside players into your joined match and killing them yourself will result in full balance deduction from your account.' },
  { e: '🎯', t: 'Sniper guns are not allowed during the match.' },
  { e: '🛡️', t: 'Victor guns are not allowed during the match.' },
  { e: '💀', t: 'In BR matches, players getting more than 7 kills will only be paid for 7 kills.' },
  { e: '🚗', t: 'No vehicles are allowed during the match. However, if stuck in a difficult zone where running out is impossible, vehicle use is permitted, but you must exit the vehicle before entering the zone.' },
  { e: '🛡️', t: 'If someone kills you by breaking rules, send the video (in-game or recorder) to Support Helpline. Your issue will be resolved.' },
  { e: '🤝', t: 'Teaming up with anyone during the match will result in all involved accounts having zero balance.' },
  { e: '⚒️', t: 'Any player caught using hacks or unfair methods will have their account and all balance banned.' },
  { e: '💰', t: 'Rewards will be added to your account within 10-20 minutes after the match ends.' },
]

const RULES_BN = [
  { e: '🔒', t: 'ম্যাচ শুরু হওয়ার ১০ মিনিট আগে রুম আইডি ও পাসওয়ার্ড দেওয়া হবে।' },
  { e: '🎮', t: 'ম্যাচে যোগ দেওয়ার সময় আপনার গেম আইডি সঠিকভাবে যাচাই করে নিন। গেম আইডির পরিবর্তে অন্য কিছু লিখে যোগ দিলে ম্যাচে অংশগ্রহণ করতে পারবেন না।' },
  { e: '📊', t: 'খেলার জন্য ব্যবহৃত আইডির লেভেল কমপক্ষে ৪০ হতে হবে। এর নিচে লেভেল থাকলে ম্যাচে প্রবেশের অনুমতি দেওয়া হবে না।' },
  { e: '📷', t: 'ম্যাচ বা অ্যাপ সংক্রান্ত যেকোনো সমস্যায় সর্বদা ভিডিও বা স্পষ্ট প্রমাণ সংরক্ষণ করে রাখবেন। প্রমাণ ছাড়া কোনো অভিযোগ গ্রহণ করা হবে না।' },
  { e: '⏰', t: 'নির্ধারিত সময়ের মধ্যে ম্যাচে ঢোকার পর যদি ৪৮ স্পট পূর্ণ বা ম্যাচ ইতিমধ্যে শুরু হয়ে যায়, তাহলে ফোনের বর্তমান সময়সহ একটি ছোট ভিডিও রেকর্ড করুন। এই ভিডিও যাচাইয়ের জন্য প্রয়োজনীয়। সময় পার হয়ে গেলে রিফান্ড দেওয়া হবে না।' },
  { e: '📱', t: 'কাস্টম রুমে যোগ দেওয়ার পর ম্যাচ শুরু হওয়ার সময় কোনো কারণে ম্যাচে প্রবেশ করতে না পারলে CLUTCH ARENA BD দায়ী থাকবে না। এটি সাধারণত নেটওয়ার্ক সমস্যার কারণে হয়।' },
  { e: '⚠️', t: 'নিজের জয়েন করা ম্যাচে বাইরের প্লেয়ার ঢুকিয়ে নিজে কিল করলে আপনার অ্যাকাউন্টের সমস্ত ব্যালেন্স কেটে নেওয়া হবে।' },
  { e: '🎯', t: 'ম্যাচের মধ্যে কোনো ধরনের Sniper Gun ব্যবহার করা যাবে না।' },
  { e: '🛡️', t: 'ম্যাচের মধ্যে কোনো ধরনের Victor Gun ব্যবহার করা যাবে না।' },
  { e: '💀', t: 'BR ম্যাচে কোনো প্লেয়ার ৭টির বেশি কিল করলে শুধুমাত্র ৭ কিলের পুরস্কার দেওয়া হবে।' },
  { e: '🚗', t: 'ম্যাচ চলাকালীন কোনো ধরনের গাড়ি ব্যবহার করা যাবে না। তবে খুব কঠিন জোনে আটকে পড়ে দৌড়ে বের হওয়া অসম্ভব হলে, সেক্ষেত্রে গাড়ি ব্যবহার করা যাবে, কিন্তু জোনে প্রবেশের আগেই গাড়ি থেকে নেমে যেতে হবে।' },
  { e: '🛡️', t: 'ম্যাচ চলার সময় কেউ নিয়ম ভঙ্গ করে আপনাকে কিল করলে ইন-গেম বা রেকর্ডারের ভিডিও সাপোর্ট হেল্পলাইনে পাঠাবেন। আপনার সমস্যার সমাধান করা হবে।' },
  { e: '🤝', t: 'ম্যাচের মধ্যে কাউ বা সাথে টিম আপ করলে সংশ্লিষ্ট সব অ্যাকাউন্টের ব্যালেন্স শূন্য করে দেওয়া হবে।' },
  { e: '⚒️', t: 'ম্যাচ চলাকালীন কেউ হ্যাক বা অসাধু পদ্ধতি ব্যবহার করে ধরা পড়লে তার অ্যাকাউন্টসহ সমস্ত ব্যালেন্স ব্যান করা হবে।' },
  { e: '💰', t: 'একটি ম্যাচ শেষ হওয়ার ১০-২০ মিনিটের মধ্যে রিওয়ার্ড আপনার অ্যাকাউন্টে যোগ হয়ে যাবে।' },
]

/* ── main ── */

export default function MatchDetail() {
  const { state, dispatch, navigate, isAdmin } = useApp()
  const [showPlayers, setShowPlayers] = useState(false)
  const [rulesLang, setRulesLang] = useState('en')
  const [hoveredSlot, setHoveredSlot] = useState(null)
  const [teamName, setTeamName] = useState('')
  const [teamNameError, setTeamNameError] = useState('')

  const match = state.matches.find(m => m.id === state.viewParam)
  const cu = state.currentUser
  const team = isTeamMode(match?.mode)

  if (!match) {
    return (
      <div style={{ textAlign: 'center', padding: '60px 20px' }}>
        <i className="fa-solid fa-ghost" style={{ fontSize: 44, color: '#353437', marginBottom: 16, display: 'block' }} />
        <p style={{ color: '#e8e8e8', fontFamily: 'Plus Jakarta Sans', fontSize: 15, marginBottom: 24 }}>Match not found</p>
        <div onClick={() => navigate('matches')} style={{
          display: 'inline-block', height: 56, padding: '0 32px', borderRadius: 10,
          background: 'linear-gradient(135deg, #61cdff, #a78bfa)', color: '#0e0e10',
          fontFamily: 'Plus Jakarta Sans', fontSize: 13, fontWeight: 700, cursor: 'pointer',
          letterSpacing: '0.1em', textTransform: 'uppercase', lineHeight: '56px',
        }}>
          <i className="fa-solid fa-arrow-left" style={{ marginRight: 8 }} />Back to Matches
        </div>
      </div>
    )
  }

  const eco = useMemo(() => {
    try { return calculateMatchEconomics(match.entryFee, match.maxSlots, match.gameType, match.include4th, match.include5th) }
    catch(e) { return calculateMatchEconomics(match) }
  }, [match])

  const startMs = new Date(match.startTime).getTime()
  const now = state.now
  const dur = match.gameType === 'BR' ? 25 * 60000 : 15 * 60000

  let phase = match.status
  if (phase === 'upcoming' && now >= startMs) phase = 'live'
  if (phase === 'live' && now >= startMs + dur) phase = 'completed'

  const cdStart = startMs - now
  const cdEnd = startMs + dur - now
  const joined = cu && match.participants?.includes(cu.id)
  const joinCount = match.participants?.length || match.joinedCount || 0
  const full = joinCount >= match.maxSlots
  const pct = Math.round((joinCount / match.maxSlots) * 100)
  const roomUnlockMs = startMs - 10 * 60000
  const roomVisible = (isAdmin || joined) && now >= roomUnlockMs && match.roomId
  const roomCd = getRoomUnlockCountdown(match)
  const st = scheduledTime(match.startTime)
  const bannerImg = match.image || MAP_IMAGES[match.map] || MAP_IMAGES.Bermuda

  const userById = id => state.users.find(u => u.id === id)
  const rules = rulesLang === 'bn' ? RULES_BN : RULES_EN

  const slotItems = Array.from({ length: match.maxSlots }, (_, i) => {
    const pId = match.participants?.[i]
    if (pId === cu?.id) return { key: i, type: 'me' }
    if (pId) return { key: i, type: 'filled', user: userById(pId) }
    return { key: i, type: 'empty' }
  })

  const copy = txt => {
    if (navigator.clipboard) {
      navigator.clipboard.writeText(txt)
        .then(() => showToast('Copied to clipboard!', 'success'))
        .catch(() => showToast('Failed to copy', 'error'))
    }
  }

  const handleJoin = () => {
    if (!cu) { navigate('login'); return }
    if (joined || full || phase === 'completed') return
    if (team && !teamName.trim()) {
      setTeamNameError(`Enter your ${match.mode} team name to join`)
      return
    }
    dispatch({ type: 'SHOW_MODAL', payload: { type: 'join-match', data: { matchId: match.id, teamName: team ? teamName.trim() : '' } } })
  }

  const phasePillBg = phase === 'live' ? 'rgba(230,57,70,0.85)' : phase === 'upcoming' ? 'rgba(255,209,102,0.15)' : '#201f21'
  const phasePillFg = phase === 'live' ? '#ffffff' : phase === 'upcoming' ? '#ffd166' : '#9ca3af'
  const phasePillBrd = phase === 'live' ? 'transparent' : (phasePillFg + '50')

  const slotTooltip = hoveredSlot !== null ? slotItems[hoveredSlot] : null

  return (
    <div style={{ padding: '0 0 100px 0', WebkitTapHighlightColor: 'transparent' }}>

      <button onClick={() => navigate('matches')} style={{
        display: 'inline-flex', alignItems: 'center', gap: 8,
        padding: '8px 16px', borderRadius: 10,
        background: 'transparent', border: '1px solid rgba(62,72,78,0.15)',
        color: '#61cdff', cursor: 'pointer',
        fontFamily: 'Plus Jakarta Sans', fontSize: 13, fontWeight: 600,
        marginBottom: 14, WebkitTapHighlightColor: 'transparent',
      }}>
        <i className="fa-solid fa-arrow-left" style={{ fontSize: 11 }} />
        Back
      </button>

      {/* BANNER */}
      <div style={{
        position: 'relative', borderRadius: 16, overflow: 'hidden',
        height: 200, marginBottom: 0,
        boxShadow: '0 8px 30px rgba(0,0,0,0.3)',
        outline: '1px solid rgba(62,72,78,0.15)', outlineOffset: '-1px',
      }}>
        <img src={bannerImg} alt={match.map}
          style={{ width: '100%', height: '100%', objectFit: 'cover', display: 'block',
            filter: 'saturate(0.2) brightness(0.8)', opacity: 0.7 }}
          onError={e => { e.target.style.display = 'none' }}
        />
        <div style={{
          position: 'absolute', inset: 0,
          background: 'linear-gradient(180deg, rgba(14,14,16,0.10) 0%, rgba(14,14,16,0.40) 50%, rgba(14,14,16,0.95) 100%)',
        }} />
        {phase === 'live' && (
          <div style={{
            position: 'absolute', inset: '-4px',
            background: 'radial-gradient(ellipse at center, rgba(230,57,70,0.15) 0%, transparent 70%)',
            filter: 'blur(20px)', pointerEvents: 'none',
          }} />
        )}
        <div style={{ position: 'absolute', top: 14, left: 14, right: 14, display: 'flex', gap: 6, flexWrap: 'wrap', justifyContent: 'flex-end' }}>
          <span style={{
            display: 'inline-flex', alignItems: 'center', gap: 5,
            padding: '4px 10px', borderRadius: 8, fontSize: 10, fontWeight: 700,
            fontFamily: 'Plus Jakarta Sans', letterSpacing: '0.05em',
            background: phasePillBg, color: phasePillFg,
            border: `1px solid ${phasePillBrd}`,
          }}>
            {phase === 'live' && <span style={{ width: 5, height: 5, borderRadius: '50%', background: '#fff', flexShrink: 0 }} />}
            {phase === 'upcoming' ? 'UPCOMING' : phase === 'live' ? 'LIVE' : 'COMPLETED'}
          </span>
          <span style={{
            display: 'inline-flex', alignItems: 'center', gap: 4,
            padding: '4px 10px', borderRadius: 8, fontSize: 10, fontWeight: 700,
            fontFamily: 'Plus Jakarta Sans',
            background: '#201f21', color: '#e8e8e8',
            border: '1px solid rgba(62,72,78,0.15)',
          }}>{match.mode}</span>
          <span style={{
            display: 'inline-flex', alignItems: 'center', gap: 4,
            padding: '4px 10px', borderRadius: 8, fontSize: 10, fontWeight: 600,
            fontFamily: 'Plus Jakarta Sans',
            background: '#201f21', color: '#e8e8e8',
            border: '1px solid rgba(62,72,78,0.15)',
          }}>{match.map}</span>
        </div>
        <div style={{ position: 'absolute', bottom: 14, left: 14, right: 14 }}>
          <h1 style={{
            fontFamily: 'Lexend', fontSize: 24, fontWeight: 900,
            color: '#ffffff', margin: '0 0 6px', lineHeight: 1.15,
            fontStyle: 'italic', textTransform: 'uppercase', letterSpacing: '0.02em',
            textShadow: '0 2px 4px rgba(0,0,0,0.8)',
          }}>{match.title}</h1>
          {st.date && (
            <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
              <i className="fa-regular fa-calendar" style={{ fontSize: 11, color: '#bdc8cf' }} />
              <span style={{
                fontSize: 12, color: '#bdc8cf', fontFamily: 'Plus Jakarta Sans', fontWeight: 500,
                textShadow: '0 1px 3px rgba(0,0,0,0.6)',
              }}>
                {phase === 'upcoming' && cdStart > 0
                  ? `Starts in ${cdFormat(cdStart)}`
                  : phase === 'live' && cdEnd > 0
                    ? `Live — ends in ${cdFormat(cdEnd)}`
                    : `${st.date} · ${st.time}`}
              </span>
            </div>
          )}
        </div>
      </div>

      {/* CONTENT WRAPPER */}
      <div style={{
        background: 'linear-gradient(145deg, #1b1b1d, #131315)',
        borderRadius: '0 0 16px 16px',
        padding: '18px 16px',
        marginBottom: 20,
        boxShadow: 'inset 0 4px 16px rgba(0,0,0,0.2)',
        border: '1px solid rgba(62,72,78,0.15)', borderTop: 'none',
      }}>
        {phase === 'upcoming' && cdStart > 0 && (
          <div style={{
            display: 'flex', alignItems: 'center', gap: 14,
            background: '#201f21', border: '1px solid rgba(62,72,78,0.15)',
            borderRadius: 12, padding: '12px 16px', marginBottom: 16,
          }}>
            <i className="fa-solid fa-clock" style={{ color: '#61cdff', fontSize: 16 }} />
            <div style={{ minWidth: 0 }}>
              <div style={{ fontSize: 9, color: '#bdc8cf', fontFamily: 'Plus Jakarta Sans', letterSpacing: '0.15em', textTransform: 'uppercase', marginBottom: 2 }}>Starts in</div>
              <div style={{ fontFamily: 'Inter', fontSize: 24, fontWeight: 700, color: '#61cdff', letterSpacing: 1, lineHeight: 1 }}>{cdFormat(cdStart)}</div>
            </div>
          </div>
        )}
        {phase === 'live' && (
          <div style={{
            display: 'inline-flex', alignItems: 'center', gap: 8,
            background: 'rgba(230,57,70,0.12)', border: '1px solid rgba(230,57,70,0.3)',
            borderRadius: 10, padding: '10px 18px', marginBottom: 16,
          }}>
            <span style={{ width: 8, height: 8, borderRadius: '50%', background: '#e63946' }} />
            <span style={{ fontFamily: 'Plus Jakarta Sans', fontSize: 13, fontWeight: 700, color: '#e63946', letterSpacing: '0.1em', textTransform: 'uppercase' }}>Match is Live</span>
          </div>
        )}

        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12, marginBottom: 16 }}>
          {[
            { ico: 'fa-solid fa-coins', lbl: 'Entry Fee', val: formatTK(match.entryFee), clr: '#FFC857' },
            { ico: 'fa-solid fa-trophy', lbl: 'Prize Pool', val: formatTK(eco.prizePool), clr: '#a78bfa' },
            { ico: 'fa-solid fa-crosshairs', lbl: 'Per Kill', val: formatTK(match.perKill || 0), clr: '#06d6a0' },
            { ico: 'fa-solid fa-users', lbl: 'Slots Open', val: `${match.maxSlots - joinCount} / ${match.maxSlots}`, clr: '#61cdff', valClr: '#61cdff' },
          ].map((s, i) => (
            <div key={i} style={{ ...esportsCard, padding: 16, position: 'relative', overflow: 'hidden' }}>
              <div style={{ position: 'absolute', left: 0, top: 0, bottom: 0, width: 3, background: s.clr }} />
              <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 8, paddingLeft: 6 }}>
                <i className={s.ico} style={{ color: s.clr, fontSize: 14 }} />
                <span style={{ fontSize: 10, color: '#bdc8cf', fontFamily: 'Plus Jakarta Sans', fontWeight: 700, letterSpacing: '0.1em', textTransform: 'uppercase' }}>{s.lbl}</span>
              </div>
              <span style={{ fontFamily: 'Inter', fontSize: 22, fontWeight: 900, paddingLeft: 6, color: s.valClr || '#ffffff' }}>{s.val}</span>
            </div>
          ))}
        </div>

        <div style={{ marginBottom: 4 }}>
          <div style={{ width: '100%', height: 6, borderRadius: 999, background: '#353437', boxShadow: 'inset 0 1px 3px rgba(0,0,0,0.4)', overflow: 'hidden' }}>
            <div style={{ width: pct + '%', height: '100%', borderRadius: 999, background: full ? '#06d6a0' : 'linear-gradient(90deg, #61cdff, #a78bfa)', transition: 'width 0.3s' }} />
          </div>
          <div style={{ display: 'flex', justifyContent: 'space-between', marginTop: 6 }}>
            <span style={{ fontSize: 11, color: '#bdc8cf', fontFamily: 'Plus Jakarta Sans', fontWeight: 500 }}>{joinCount}/{match.maxSlots} joined</span>
            <span style={{ fontSize: 11, fontWeight: 700, fontFamily: 'Inter', color: '#61cdff' }}>{pct}%</span>
          </div>
        </div>
      </div>

      {/* VIEW JOINED PLAYERS */}
      <div onClick={() => { setShowPlayers(!showPlayers); setHoveredSlot(null) }} style={{
        width: '100%', marginTop: 2, marginBottom: 20,
        display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 8,
        padding: '14px 0', borderRadius: 10, cursor: 'pointer',
        background: 'linear-gradient(135deg, #1A222D, #131315)',
        border: '1px solid rgba(79,209,255,0.2)',
        WebkitTapHighlightColor: 'transparent',
      }}>
        <i className="fa-solid fa-users" style={{ color: '#61cdff', fontSize: 16 }} />
        <span style={{ fontFamily: 'Plus Jakarta Sans', fontWeight: 700, fontSize: 13, color: '#61cdff', letterSpacing: '0.1em', textTransform: 'uppercase' }}>
          {showPlayers ? 'HIDE JOINED PLAYERS' : 'VIEW JOINED PLAYERS'}
        </span>
      </div>

      {/* PLAYER SLOTS */}
      {showPlayers && (
        <div style={{ marginBottom: 20 }}>
          <SectionHead label={`Player Slots — ${joinCount}/${match.maxSlots}`} />
          <div style={{ ...esportsCard, padding: 14 }}>
            <div style={{
              display: 'grid',
              gridTemplateColumns: `repeat(${Math.min(match.maxSlots, 10)}, 1fr)`,
              gap: 6,
            }}>
              {slotItems.map(s => {
                const isHovered = hoveredSlot === s.key
                return (
                  <div key={s.key}
                    onClick={() => setHoveredSlot(isHovered ? null : s.key)}
                    style={{
                      aspectRatio: '1', borderRadius: 6,
                      display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center',
                      fontFamily: 'Inter', fontSize: s.type === 'empty' ? 11 : 9, fontWeight: 700,
                      cursor: s.type !== 'empty' ? 'pointer' : 'default',
                      position: 'relative',
                      overflow: 'hidden',
                      transition: 'transform 0.1s',
                      transform: isHovered ? 'scale(1.08)' : 'scale(1)',
                      ...(s.type === 'me'
                        ? { background: 'rgba(97,205,255,0.15)', border: '1px solid rgba(97,205,255,0.35)', color: '#61cdff' }
                        : s.type === 'filled'
                          ? { background: 'rgba(167,139,250,0.10)', border: isHovered ? '1px solid rgba(167,139,250,0.5)' : '1px solid rgba(167,139,250,0.20)', color: '#a78bfa' }
                          : { background: '#201f21', border: '1px solid rgba(62,72,78,0.15)', color: '#555555' }),
                    }}
                  >
                    {s.type === 'me' ? 'YOU' : s.type === 'filled' ? (s.user?.ign?.substring(0, 5) || '#') : (s.key + 1)}
                  </div>
                )
              })}
            </div>

            {slotTooltip && slotTooltip.type !== 'empty' && (
              <div style={{
                marginTop: 12, padding: '12px 14px',
                background: '#201f21', border: '1px solid rgba(62,72,78,0.15)',
                borderRadius: 10, display: 'flex', alignItems: 'center', gap: 12,
              }}>
                <div style={{
                  width: 36, height: 36, borderRadius: 8,
                  background: slotTooltip.type === 'me' ? 'rgba(97,205,255,0.15)' : 'rgba(167,139,250,0.10)',
                  display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0,
                }}>
                  <i className="fa-solid fa-user" style={{
                    color: slotTooltip.type === 'me' ? '#61cdff' : '#a78bfa', fontSize: 14,
                  }} />
                </div>
                <div style={{ minWidth: 0, flex: 1 }}>
                  <div style={{
                    fontFamily: 'Plus Jakarta Sans', fontWeight: 700, fontSize: 14,
                    color: slotTooltip.type === 'me' ? '#61cdff' : '#e8e8e8',
                    overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap',
                  }}>
                    {slotTooltip.type === 'me'
                      ? (cu?.displayName || cu?.ign || 'You')
                      : (slotTooltip.user?.displayName || slotTooltip.user?.ign || 'Player')}
                  </div>
                  <div style={{ fontSize: 11, color: '#555555', fontFamily: 'Plus Jakarta Sans', marginTop: 2, display: 'flex', alignItems: 'center', gap: 8 }}>
                    {slotTooltip.type === 'me' ? (
                      <span>Slot #{slotTooltip.key + 1} — Joined</span>
                    ) : (
                      <>
                        <span>IGN: {slotTooltip.user?.ign || 'N/A'}</span>
                        {team && <span style={{ color: '#444444' }}>|</span>}
                        {team && <span style={{ color: '#FFC857' }}>Team: {slotTooltip.user?.teamName || 'N/A'}</span>}
                      </>
                    )}
                  </div>
                </div>
                <div onClick={(e) => { e.stopPropagation(); setHoveredSlot(null) }} style={{
                  width: 28, height: 28, borderRadius: 6,
                  background: 'rgba(255,255,255,0.04)',
                  display: 'flex', alignItems: 'center', justifyContent: 'center',
                  cursor: 'pointer', flexShrink: 0,
                }}>
                  <i className="fa-solid fa-xmark" style={{ color: '#555555', fontSize: 11 }} />
                </div>
              </div>
            )}

            <div style={{ display: 'flex', gap: 16, marginTop: 12 }}>
              {[
                { bg: 'rgba(97,205,255,0.15)', bd: 'rgba(97,205,255,0.35)', label: 'You' },
                { bg: 'rgba(167,139,250,0.10)', bd: 'rgba(167,139,250,0.20)', label: 'Filled' },
                { bg: '#201f21', bd: 'rgba(62,72,78,0.15)', label: 'Open' },
              ].map(l => (
                <div key={l.label} style={{ display: 'flex', alignItems: 'center', gap: 5 }}>
                  <div style={{ width: 10, height: 10, borderRadius: 0, background: l.bg, border: `1px solid ${l.bd}` }} />
                  <span style={{ fontSize: 10, color: '#bdc8cf', fontFamily: 'Plus Jakarta Sans' }}>{l.label}</span>
                </div>
              ))}
            </div>
          </div>
        </div>
      )}

      {/* ROOM CREDENTIALS */}
      {joined && (
        <div style={{ marginBottom: 20 }}>
          <SectionHead label="Room Credentials" />
          <div style={{ ...esportsCard, padding: 0, overflow: 'hidden', borderLeft: '4px solid ' + (roomVisible ? '#06d6a0' : '#FFC857') }}>
            {roomVisible ? (
              <div style={{ padding: 16 }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: 12, padding: 12, background: '#201f21', borderLeft: '2px solid #06d6a0', marginBottom: 14 }}>
                  <i className="fa-solid fa-lock-open" style={{ color: '#06d6a0', fontSize: 18, flexShrink: 0 }} />
                  <span style={{ fontSize: 12, color: '#e8e8e8', lineHeight: 1.6, fontFamily: 'Plus Jakarta Sans', fontWeight: 500 }}>Unlocked — Join in Free Fire now</span>
                </div>
                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 10 }}>
                  {[
                    { lbl: 'Room ID', val: match.roomId, clr: '#61cdff' },
                    { lbl: 'Password', val: match.roomPassword, clr: '#06d6a0' },
                  ].map((item, idx) => (
                    <div key={idx} style={{ padding: 12, background: '#201f21', border: '1px solid rgba(62,72,78,0.15)', borderRadius: 8 }}>
                      <div style={{ fontSize: 9, color: '#bdc8cf', fontFamily: 'Plus Jakarta Sans', fontWeight: 600, letterSpacing: '0.15em', textTransform: 'uppercase', marginBottom: 6 }}>{item.lbl}</div>
                      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 8 }}>
                        <span style={{ fontFamily: 'Inter', fontSize: 18, fontWeight: 700, color: item.clr, letterSpacing: 0.5, wordBreak: 'break-all' }}>{item.val || 'Not set'}</span>
                        <div onClick={() => copy(item.val)} style={{
                          width: 30, height: 30, background: 'rgba(97,205,255,0.08)',
                          display: 'flex', alignItems: 'center', justifyContent: 'center',
                          cursor: 'pointer', borderRadius: 6, flexShrink: 0,
                        }}>
                          <i className="fa-regular fa-copy" style={{ color: '#61cdff', fontSize: 11 }} />
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            ) : (
              <div style={{ textAlign: 'center', padding: '24px 16px' }}>
                <i className="fa-solid fa-hourglass-half" style={{ fontSize: 28, color: '#889299', marginBottom: 10, display: 'block' }} />
                <div style={{ fontSize: 9, color: '#bdc8cf', fontFamily: 'Plus Jakarta Sans', letterSpacing: '0.15em', textTransform: 'uppercase', marginBottom: 8 }}>Unlocks 10 min before match</div>
                {roomCd && roomCd !== 'UNLOCKED' && (
                  <div style={{ fontFamily: 'Inter', fontSize: 22, fontWeight: 700, color: '#FFC857', letterSpacing: 1, lineHeight: 1 }}>
                    {roomCd.replace('Unlocks in ', '')}
                  </div>
                )}
                <div style={{ fontSize: 11, color: '#555555', fontFamily: 'Plus Jakarta Sans', marginTop: 8 }}>Stay on this page — credentials appear automatically</div>
              </div>
            )}
          </div>
        </div>
      )}

      {/* PRIZE DISTRIBUTION */}
      <div style={{ marginBottom: 20 }}>
        <SectionHead label="Prize Distribution" />
        {eco.prizes && eco.prizes.length > 0 ? (
          <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
            {eco.prizes.map((p) => {
              const cfg = RANK_CFG[p.rank]
              const isTop3 = !!cfg
              if (isTop3) {
                return (
                  <div key={p.rank} style={{ ...esportsCard, padding: '12px 14px', position: 'relative', overflow: 'hidden', boxShadow: cfg.glow }}>
                    <div style={{ position: 'absolute', left: 0, top: 0, bottom: 0, width: 4, background: cfg.barBg }} />
                    <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                      <div style={{ display: 'flex', alignItems: 'center', gap: 12, paddingLeft: 6 }}>
                        <span style={{ fontFamily: 'Inter', fontWeight: 900, fontSize: 14, width: 32, height: 32, borderRadius: 8, background: cfg.badgeBg, color: cfg.badgeTxt, display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>{p.rank}</span>
                        <span style={{ fontFamily: 'Plus Jakarta Sans', fontWeight: 700, fontSize: 14, color: '#ffffff', letterSpacing: '0.03em' }}>Place</span>
                      </div>
                      <span style={{ ...gradientText(cfg.amtBg, 18, 900) }}>{formatTK(p.amount)}</span>
                    </div>
                  </div>
                )
              }
              return (
                <div key={p.rank} style={{ background: '#201f21', border: '1px solid rgba(62,72,78,0.15)', borderRadius: 14, padding: '12px 14px', display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
                    <span style={{ fontFamily: 'Inter', fontWeight: 700, fontSize: 14, width: 32, height: 32, borderRadius: 8, background: '#1b1b1d', border: '1px solid rgba(62,72,78,0.15)', color: '#bdc8cf', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>{p.rank}</span>
                    <span style={{ fontFamily: 'Plus Jakarta Sans', fontWeight: 500, fontSize: 14, color: '#bdc8cf', letterSpacing: '0.03em' }}>Place</span>
                  </div>
                  <span style={{ fontFamily: 'Inter', fontWeight: 700, fontSize: 16, color: '#bdc8cf' }}>{formatTK(p.amount)}</span>
                </div>
              )
            })}
            {match.perKill > 0 && (
              <div style={{ background: '#201f21', border: '1px solid rgba(62,72,78,0.15)', borderRadius: 14, padding: '12px 14px', display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginTop: 4 }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
                  <span style={{ width: 32, height: 32, borderRadius: 8, background: 'rgba(97,205,255,0.08)', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
                    <i className="fa-solid fa-crosshairs" style={{ color: '#61cdff', fontSize: 14 }} />
                  </span>
                  <span style={{ fontFamily: 'Plus Jakarta Sans', fontWeight: 500, fontSize: 14, color: '#bdc8cf' }}>Per Kill</span>
                </div>
                <span style={{ fontFamily: 'Inter', fontWeight: 700, fontSize: 16, color: '#61cdff' }}>{formatTK(match.perKill)}</span>
              </div>
            )}
          </div>
        ) : (
          <div style={{ ...esportsCard, padding: '28px 16px', textAlign: 'center' }}>
            <i className="fa-solid fa-users-slash" style={{ fontSize: 22, color: '#555555', display: 'block', marginBottom: 8 }} />
            <div style={{ fontSize: 13, color: '#bdc8cf', fontFamily: 'Plus Jakarta Sans' }}>Prize breakdown updates when players join</div>
          </div>
        )}
      </div>

      {/* RESULTS — with team names for squad/duo */}
      {phase === 'completed' && match.result && match.result.players && (
        <div style={{ marginBottom: 20 }}>
          <SectionHead label="Match Results" />
          <div style={{ ...esportsCard, padding: 0, overflow: 'hidden' }}>
            {match.result.players.map((p, i) => {
              const rc = rankColor(p.rank || p.position)
              const isTop3 = !!rc
              const isMe = cu && p.ign === cu.ign
              const last = i === match.result.players.length - 1
              return (
                <div key={i} style={{
                  display: 'flex', alignItems: 'center', justifyContent: 'space-between',
                  padding: '13px 16px',
                  borderBottom: last ? 'none' : '1px solid rgba(62,72,78,0.15)',
                  background: isMe ? 'rgba(97,205,255,0.06)' : 'transparent',
                  borderLeft: isTop3 ? `3px solid ${rc}` : (isMe ? '3px solid #61cdff' : '3px solid transparent'),
                }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 12, minWidth: 0, flex: 1 }}>
                    <span style={{
                      fontFamily: 'Inter', fontWeight: 900, fontSize: 13,
                      width: 32, height: 32, borderRadius: 8,
                      background: isTop3 ? (RANK_CFG[p.rank || p.position]?.badgeBg || '#201f21') : '#201f21',
                      border: isTop3 ? 'none' : '1px solid rgba(62,72,78,0.15)',
                      color: isTop3 ? (RANK_CFG[p.rank || p.position]?.badgeTxt || '#bdc8cf') : '#bdc8cf',
                      display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0,
                    }}>{p.rank || p.position}</span>
                    <div style={{ minWidth: 0 }}>
                      <div style={{ fontFamily: 'Plus Jakarta Sans', fontWeight: 600, fontSize: 14, color: isMe ? '#61cdff' : '#e8e8e8', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                        {p.teamName ? (
                          <span style={{ color: '#FFC857' }}>{p.teamName}</span>
                        ) : null}
                        {p.teamName && p.ign ? ' — ' : ''}
                        {p.ign}{isMe ? ' (You)' : ''}
                      </div>
                      <div style={{ fontSize: 11, color: '#555555', fontFamily: 'Plus Jakarta Sans', marginTop: 1, display: 'flex', alignItems: 'center', gap: 5 }}>
                        {team ? (
                          <>
                            <i className="fa-solid fa-star" style={{ fontSize: 9, color: '#FFC857' }} />
                            <span>{p.points != null ? p.points : p.kills} pts</span>
                          </>
                        ) : (
                          <>
                            <i className="fa-solid fa-crosshairs" style={{ fontSize: 9 }} />
                            <span>{p.kills} kills</span>
                          </>
                        )}
                      </div>
                    </div>
                  </div>
                  {p.prize != null && (
                    <span style={{ fontFamily: 'Inter', fontWeight: 700, fontSize: 16, color: isTop3 ? rc : '#bdc8cf', flexShrink: 0, marginLeft: 12 }}>{formatTK(p.prize)}</span>
                  )}
                </div>
              )
            })}
          </div>
          {match.result.submittedAt && (
            <div style={{ marginTop: 8, fontSize: 11, color: '#555555', fontFamily: 'Plus Jakarta Sans', textAlign: 'right' }}>
              Submitted {match.result.submittedAt}{match.result.method === 'screenshot' ? ' via screenshot' : ' manually'}
            </div>
          )}
        </div>
      )}

      {phase === 'completed' && (!match.result || !match.result.players) && (
        <div style={{ marginBottom: 20, ...esportsCard, padding: '32px 16px', textAlign: 'center' }}>
          <i className="fa-solid fa-hourglass-half" style={{ fontSize: 24, color: '#555555', display: 'block', marginBottom: 10 }} />
          <div style={{ fontSize: 14, fontWeight: 600, color: '#bdc8cf', fontFamily: 'Plus Jakarta Sans' }}>Results Pending</div>
          <div style={{ fontSize: 12, color: '#555555', fontFamily: 'Plus Jakarta Sans', marginTop: 4 }}>Admin hasn&#39;t submitted results yet.</div>
        </div>
      )}

      {/* ADMIN BUTTONS */}
      {isAdmin && phase !== 'completed' && (
        <div style={{ display: 'flex', gap: 10, marginBottom: 20 }}>
          {[
            { lbl: 'Set Room', ico: 'fa-solid fa-key', clr: '#61cdff', bg: 'rgba(97,205,255,0.08)', brd: 'rgba(97,205,255,0.2)', act: () => dispatch({ type: 'SHOW_MODAL', payload: { type: 'room', data: { matchId: match.id } } }) },
            { lbl: 'Submit Result', ico: 'fa-solid fa-trophy', clr: '#06d6a0', bg: 'rgba(6,214,160,0.08)', brd: 'rgba(6,214,160,0.2)', act: () => dispatch({ type: 'SHOW_MODAL', payload: { type: 'result', data: { matchId: match.id } } }) },
          ].map((b, i) => (
            <div key={i} onClick={b.act} style={{ flex: 1, height: 48, background: b.bg, border: `1px solid ${b.brd}`, display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 8, cursor: 'pointer', borderRadius: 10 }}>
              <i className={b.ico} style={{ color: b.clr, fontSize: 13 }} />
              <span style={{ fontSize: 13, fontWeight: 700, color: b.clr, fontFamily: 'Lexend' }}>{b.lbl}</span>
            </div>
          ))}
        </div>
      )}
      {isAdmin && phase === 'completed' && !match.result && (
        <div onClick={() => dispatch({ type: 'SHOW_MODAL', payload: { type: 'result', data: { matchId: match.id } } })} style={{ marginBottom: 20, height: 48, background: 'rgba(6,214,160,0.08)', border: '1px solid rgba(6,214,160,0.2)', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 8, cursor: 'pointer', borderRadius: 10 }}>
          <i className="fa-solid fa-trophy" style={{ color: '#06d6a0', fontSize: 13 }} />
          <span style={{ fontSize: 13, fontWeight: 700, color: '#06d6a0', fontFamily: 'Lexend' }}>Submit Result</span>
        </div>
      )}

      {/* RULES — EN/BN toggle with your exact 15 rules */}
      <div style={{ marginBottom: 20 }}>
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 12, paddingLeft: 4, paddingRight: 4 }}>
          <div style={{
            fontFamily: 'Lexend', fontWeight: 700, fontSize: 12, color: '#e8e8e8',
            textTransform: 'uppercase', fontStyle: 'italic', letterSpacing: 0.5,
          }}>
            {rulesLang === 'bn' ? 'ম্যাচ নিয়ম' : 'Match Rules'}
          </div>
          <div style={{ display: 'flex', borderRadius: 8, overflow: 'hidden', border: '1px solid rgba(62,72,78,0.15)' }}>
            {[
              { code: 'en', label: 'EN' },
              { code: 'bn', label: 'বা' },
            ].map(l => (
              <div key={l.code} onClick={() => setRulesLang(l.code)} style={{
                padding: '5px 14px', fontSize: 11, fontWeight: 700,
                fontFamily: 'Inter', cursor: 'pointer',
                background: rulesLang === l.code ? 'rgba(97,205,255,0.15)' : 'transparent',
                color: rulesLang === l.code ? '#61cdff' : '#555555',
                borderRight: l.code === 'en' ? '1px solid rgba(62,72,78,0.15)' : 'none',
                letterSpacing: 0.5,
              }}>{l.label}</div>
            ))}
          </div>
        </div>
        <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
          {rules.map((r, i) => (
            <div key={i} style={{ ...esportsCard, padding: '14px 14px', display: 'flex', alignItems: 'flex-start', gap: 12 }}>
              <span style={{ fontSize: 15, marginTop: 1, flexShrink: 0, opacity: 0.8 }}>{r.e}</span>
              <span style={{ fontSize: 13, color: '#bdc8cf', lineHeight: 1.6, fontFamily: 'Plus Jakarta Sans', fontWeight: 500 }}>{r.t}</span>
            </div>
          ))}
        </div>
      </div>

      {/* TEAM NAME INPUT — only for Squad/Duo */}
      {team && !joined && phase !== 'completed' && !full && cu && (
        <div style={{ marginBottom: 16 }}>
          <SectionHead label={`${match.mode} Team Name — Required`} />
          <div style={{ ...esportsCard, padding: '16px 14px', borderLeft: '3px solid #FFC857' }}>
            <div style={{
              fontSize: 11, color: '#bdc8cf', fontFamily: 'Plus Jakarta Sans', fontWeight: 500,
              marginBottom: 10, lineHeight: 1.5,
            }}>
              <i className="fa-solid fa-people-group" style={{ color: '#FFC857', marginRight: 6 }}></i>
              Enter your {match.mode} team name before joining. This will be shown in match results.
            </div>
            <div style={{ position: 'relative' }}>
              <i className="fa-solid fa-shield-halved" style={{
                position: 'absolute', left: 14, top: '50%', transform: 'translateY(-50%)',
                fontSize: 13, color: '#FFC857',
              }}></i>
              <input
                type="text"
                placeholder={`e.g. ${match.mode === 'Squad' ? 'Dragon Squad' : 'Duo Kings'}`}
                value={teamName}
                onChange={e => { setTeamName(e.target.value); setTeamNameError('') }}
                maxLength={30}
                style={{
                  width: '100%', padding: '14px 14px 14px 42px', borderRadius: 10,
                  border: `1px solid ${teamNameError ? 'rgba(230,57,70,0.5)' : 'rgba(62,72,78,0.15)'}`,
                  background: '#201f21',
                  color: '#ffffff', fontFamily: 'Inter', fontSize: 15, fontWeight: 700,
                  letterSpacing: 0.5, outline: 'none', boxSizing: 'border-box',
                  transition: 'border-color 0.2s',
                }}
                onFocus={e => { if (!teamNameError) e.target.style.borderColor = 'rgba(255,200,87,0.4)' }}
                onBlur={e => { if (!teamNameError) e.target.style.borderColor = 'rgba(62,72,78,0.15)' }}
              />
              {teamName && (
                <div onClick={() => setTeamName('')} style={{
                  position: 'absolute', right: 12, top: '50%', transform: 'translateY(-50%)',
                  width: 24, height: 24, borderRadius: 6,
                  background: 'rgba(255,255,255,0.06)', display: 'flex', alignItems: 'center', justifyContent: 'center',
                  cursor: 'pointer',
                }}>
                  <i className="fa-solid fa-xmark" style={{ color: '#555', fontSize: 10 }}></i>
                </div>
              )}
            </div>
            {teamNameError && (
              <div style={{
                display: 'flex', alignItems: 'center', gap: 6,
                padding: '8px 12px', marginTop: 8,
                background: 'rgba(230,57,70,0.08)',
                border: '1px solid rgba(230,57,70,0.15)',
                borderRadius: 8,
              }}>
                <i className="fa-solid fa-circle-exclamation" style={{ fontSize: 11, color: '#e63946', flexShrink: 0 }}></i>
                <span style={{ fontSize: 12, color: '#e63946', fontFamily: 'Plus Jakarta Sans', fontWeight: 500 }}>{teamNameError}</span>
              </div>
            )}
            {teamName.trim() && (
              <div style={{
                marginTop: 8, padding: '8px 12px',
                background: 'rgba(255,200,87,0.06)', border: '1px solid rgba(255,200,87,0.15)',
                borderRadius: 8, display: 'flex', alignItems: 'center', gap: 8,
              }}>
                <i className="fa-solid fa-check-circle" style={{ color: '#FFC857', fontSize: 12 }}></i>
                <span style={{ fontSize: 12, color: '#FFC857', fontFamily: 'Plus Jakarta Sans', fontWeight: 600 }}>
                  Team: <strong>"{teamName.trim()}"</strong>
                </span>
              </div>
            )}
          </div>
        </div>
      )}

      {/* ═══ PHASE 4.4: NO REFUND WARNING — shown before join button ═══ */}
      {cu && !joined && !full && phase !== 'completed' && (
        <div style={{
          borderRadius: 10, overflow: 'hidden', marginBottom: 14,
          border: '2px solid #f87171',
          background: 'linear-gradient(135deg, rgba(248,113,113,0.10) 0%, rgba(248,113,113,0.02) 60%), #1c1b1d',
          boxShadow: '0 0 16px rgba(248,113,113,0.06)',
        }}>
          <div style={{
            padding: '10px 14px',
            background: 'linear-gradient(135deg, rgba(248,113,113,0.12) 0%, rgba(248,113,113,0.04) 100%)',
            borderBottom: '1px solid rgba(248,113,113,0.15)',
            display: 'flex', alignItems: 'center', gap: 8,
          }}>
            <i className="fa-solid fa-shield-halved" style={{ color: '#f87171', fontSize: 13 }} />
            <span style={{
              fontFamily: "'Lexend', sans-serif", fontSize: 12, fontWeight: 700,
              color: '#f87171', letterSpacing: '0.06em', textTransform: 'uppercase',
            }}>
              No Refund Policy
            </span>
          </div>
          <div style={{ padding: '10px 14px' }}>
            <p style={{
              fontFamily: "'Plus Jakarta Sans', sans-serif", fontSize: 11,
              color: '#f87171', fontWeight: 700, margin: '0 0 6px 0', lineHeight: 1.4,
            }}>
              Entry fee is NON-REFUNDABLE once you join this match.
            </p>
            <div style={{
              display: 'flex', flexWrap: 'wrap', gap: '4px 12px',
              fontFamily: "'Plus Jakarta Sans', sans-serif", fontSize: 10,
              color: '#bdc8cf', fontWeight: 500,
            }}>
              <span style={{ display: 'flex', alignItems: 'center', gap: 4 }}>
                <i className="fa-solid fa-xmark" style={{ color: '#f87171', fontSize: 9 }} /> No-show
              </span>
              <span style={{ display: 'flex', alignItems: 'center', gap: 4 }}>
                <i className="fa-solid fa-xmark" style={{ color: '#f87171', fontSize: 9 }} /> Disconnect
              </span>
              <span style={{ display: 'flex', alignItems: 'center', gap: 4 }}>
                <i className="fa-solid fa-xmark" style={{ color: '#f87171', fontSize: 9 }} /> Match lost
              </span>
              <span style={{ display: 'flex', alignItems: 'center', gap: 4 }}>
                <i className="fa-solid fa-xmark" style={{ color: '#f87171', fontSize: 9 }} /> Cannot leave
              </span>
            </div>
            <p style={{
              fontFamily: "'Plus Jakarta Sans', sans-serif", fontSize: 10,
              color: '#4ade80', fontWeight: 600, margin: '8px 0 0 0',
              display: 'flex', alignItems: 'center', gap: 5,
            }}>
              <i className="fa-solid fa-circle-info" style={{ fontSize: 9 }} />
              Only admin-cancelled matches get full refund
            </p>
          </div>
        </div>
      )}
      {/* ═══ END PHASE 4.4 ═══ */}

      {/* ACTION BAR */}
      <div>
        {!cu ? (
          <div onClick={() => navigate('login')} style={{
            width: '100%', height: 56, borderRadius: 10,
            background: 'linear-gradient(135deg, #61cdff, #a78bfa)',
            color: '#0e0e10', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 10,
            fontFamily: 'Plus Jakarta Sans', fontSize: 14, fontWeight: 700,
            letterSpacing: '0.1em', textTransform: 'uppercase', cursor: 'pointer',
          }}>
            <i className="fa-solid fa-right-to-bracket" style={{ fontSize: 16 }} />
            Login to Join
          </div>
        ) : joined ? (
          <div style={{
            width: '100%', height: 56, borderRadius: 10,
            background: '#1b1b1d', border: '1px solid rgba(6,214,160,0.2)',
            display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 10,
            fontFamily: 'Plus Jakarta Sans', fontSize: 13, fontWeight: 700,
            color: '#06d6a0', letterSpacing: '0.1em', textTransform: 'uppercase',
          }}>
            <i className="fa-solid fa-circle-check" />
            You have joined{team && cu?.teamName ? ` — ${cu.teamName}` : ''}
          </div>
        ) : full ? (
          <div style={{
            width: '100%', height: 56, borderRadius: 10,
            background: '#1b1b1d', border: '1px solid rgba(62,72,78,0.15)',
            display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 10,
            fontFamily: 'Plus Jakarta Sans', fontSize: 13, fontWeight: 700,
            color: '#889299', letterSpacing: '0.1em', textTransform: 'uppercase',
          }}>
            <i className="fa-solid fa-ban" />
            Slots Full
          </div>
        ) : phase === 'completed' ? (
          <div style={{
            width: '100%', height: 56, borderRadius: 10,
            background: '#1b1b1d', border: '1px solid rgba(62,72,78,0.15)',
            display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 10,
            fontFamily: 'Plus Jakarta Sans', fontSize: 13, fontWeight: 700,
            color: '#555555', letterSpacing: '0.1em', textTransform: 'uppercase',
          }}>
            <i className="fa-solid fa-flag-checkered" />
            Completed
          </div>
        ) : (
          <div onClick={handleJoin} style={{
            width: '100%', height: 56, borderRadius: 10,
            background: 'linear-gradient(135deg, #61cdff, #a78bfa)',
            color: '#0e0e10', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 10,
            fontFamily: 'Plus Jakarta Sans', fontSize: 14, fontWeight: 700,
            letterSpacing: '0.1em', textTransform: 'uppercase', cursor: 'pointer',
            WebkitTapHighlightColor: 'transparent',
          }}>
            <i className="fa-solid fa-bolt" style={{ fontSize: 16 }} />
            Join Battle — {formatTK(match.entryFee)}
          </div>
        )}
      </div>
    </div>
  )
}