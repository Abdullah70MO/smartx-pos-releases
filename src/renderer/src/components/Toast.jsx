import { useState, useEffect, useCallback, useContext } from 'preact/hooks'
import { createContext } from 'preact'

const ToastCtx = createContext(null)

export function ToastProvider({ children }) {
  const [toast, setToast] = useState(null)

  const show = useCallback((msg, type = 'info', duration = 3000) => {
    setToast({ msg, type })
    if (duration > 0) setTimeout(() => setToast(null), duration)
  }, [])

  return (
    <ToastCtx.Provider value={show}>
      {children}
      {toast && (
        <div style={{
          position: 'fixed', bottom: '40px', left: '50%', transform: 'translateX(-50%)',
          zIndex: 99999, 
          background: toast.type === 'error' ? 'var(--danger)' : toast.type === 'success' ? 'var(--success)' : 'var(--bg3)',
          color: 'var(--text)', 
          padding: '12px 28px', 
          borderRadius: '12px', 
          fontSize: '13.5px',
          fontWeight: '600',
          boxShadow: '0 8px 32px rgba(0,0,0,0.25)', 
          direction: 'rtl',
          border: '1px solid var(--outline)',
          animation: 'slideUp 0.2s ease-out'
        }}>
          {toast.msg}
        </div>
      )}
    </ToastCtx.Provider>
  )
}

export function useToast() {
  return useContext(ToastCtx)
}
