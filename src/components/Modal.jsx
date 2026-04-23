import { useEffect } from 'react'
import { useApp } from '../context'
import { JoinMatchModal, AddMoneyModal, WithdrawModal, CreateMatchModal, RoomModal, ResultModal, AdjustBalanceModal } from '../modals/AllModals'

export default function Modal() {
  const { state, dispatch } = useApp()
  const { modal } = state

  const mobile = typeof window !== 'undefined' && window.innerWidth <= 768

  useEffect(() => {
    const handleKey = (e) => {
      if (e.key === 'Escape' && modal) dispatch({ type: 'CLOSE_MODAL' })
    }
    document.addEventListener('keydown', handleKey)
    return () => document.removeEventListener('keydown', handleKey)
  }, [modal, dispatch])

  useEffect(() => {
    if (modal) {
      document.body.style.overflow = 'hidden'
    } else {
      document.body.style.overflow = ''
    }
    return () => { document.body.style.overflow = '' }
  }, [modal])

  if (!modal) return null

  const close = () => dispatch({ type: 'CLOSE_MODAL' })

  const renderContent = () => {
    switch (modal.type) {
      case 'join-match':     return <JoinMatchModal matchId={modal.data?.matchId || modal.matchId} data={modal.data} />
      case 'add-money':      return <AddMoneyModal />
      case 'withdraw':       return <WithdrawModal />
      case 'create-match':   return <CreateMatchModal />
      case 'edit-match':     return <CreateMatchModal isEdit matchId={modal.matchId} />
      case 'room':           return <RoomModal matchId={modal.matchId} />
      case 'result':         return <ResultModal matchId={modal.matchId} />
      case 'adjust-balance': return <AdjustBalanceModal userId={modal.userId} />
      default: return null
    }
  }

  const titles = {
    'join-match': 'Confirmation',
    'add-money': 'Add Money',
    'withdraw': 'Withdraw',
    'create-match': 'Create Match',
    'edit-match': 'Edit Match',
    'room': 'Room Credentials',
    'result': 'Submit Result',
    'adjust-balance': 'Adjust Balance',
  }

  const title = titles[modal.type] || ''
  const isWide = modal.type === 'create-match' || modal.type === 'edit-match'

  return (
    <div
      onClick={(e) => { if (e.target === e.currentTarget) close() }}
      style={{
        position: 'fixed',
        inset: 0,
        zIndex: 2000,
        display: 'flex',
        alignItems: mobile ? 'flex-end' : 'center',
        justifyContent: 'center',
        background: 'rgba(0,0,0,0.70)',
        padding: mobile ? 0 : 16,
        animation: 'modalFadeIn 0.2s ease',
      }}
    >
      <div
        role="dialog"
        aria-modal="true"
        style={{
          position: 'relative',
          width: '100%',
          maxWidth: isWide ? 800 : 520,
          maxHeight: mobile ? '85vh' : '90vh',
          background: '#201f21',
          border: '1px solid #353437',
          borderRadius: mobile ? '0 0 12px 12px' : 12,
          overflow: 'hidden',
          display: 'flex',
          flexDirection: 'column',
          animation: mobile
            ? 'modalSlideUp 0.3s cubic-bezier(0.4,0,0.2,1)'
            : 'modalScaleIn 0.25s ease',
        }}
      >
        {title && (
          <div style={{
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            padding: '16px 20px',
            borderBottom: '1px solid #353437',
            flexShrink: 0,
          }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
              <div style={{
                width: 4,
                height: 16,
                borderRadius: 2,
                background: '#61cdff',
              }} />
              <h3 style={{
                fontFamily: 'Lexend',
                fontSize: 16,
                fontWeight: 700,
                color: '#e8e8e8',
                margin: 0,
              }}>
                {title}
              </h3>
            </div>
            <button
              onClick={close}
              aria-label="Close"
              style={{
                width: 32,
                height: 32,
                background: '#353437',
                border: 'none',
                borderRadius: 8,
                color: '#9ca3af',
                cursor: 'pointer',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                flexShrink: 0,
              }}
            >
              <i className="fa-solid fa-xmark" style={{ fontSize: 13 }} />
            </button>
          </div>
        )}

        <div style={{
          flex: 1,
          overflowY: 'auto',
          overflowX: 'hidden',
          padding: '20px',
        }}>
          {renderContent()}
        </div>
      </div>

      <style>{`
        @keyframes modalFadeIn {
          from { opacity: 0; }
          to   { opacity: 1; }
        }
        @keyframes modalSlideUp {
          from { transform: translateY(100%); }
          to   { transform: translateY(0); }
        }
        @keyframes modalScaleIn {
          from { opacity: 0; transform: scale(0.96); }
          to   { opacity: 1; transform: scale(1); }
        }
      `}</style>
    </div>
  )
}