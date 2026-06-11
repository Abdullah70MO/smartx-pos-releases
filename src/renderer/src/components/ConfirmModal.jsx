import { useState, useCallback, useRef } from 'preact/hooks'
import Modal from './Modal'

export function useConfirm() {
  const [open, setOpen] = useState(false)
  const [message, setMessage] = useState('')
  const [mode, setMode] = useState('confirm')
  const resolveRef = useRef(null)

  const confirm = useCallback((msg) => {
    setMode('confirm')
    setMessage(msg)
    setOpen(true)
    return new Promise(resolve => {
      resolveRef.current = resolve
    })
  }, [])

  const showAlert = useCallback((msg) => {
    setMode('alert')
    setMessage(msg)
    setOpen(true)
    return new Promise(resolve => {
      resolveRef.current = resolve
    })
  }, [])

  const handleConfirm = useCallback(() => {
    setOpen(false)
    resolveRef.current?.(true)
  }, [])

  const handleCancel = useCallback(() => {
    setOpen(false)
    resolveRef.current?.(false)
  }, [])

  const ConfirmDialog = () => open ? (
    <Modal open={true} onClose={mode === 'alert' ? handleConfirm : handleCancel} title={mode === 'alert' ? 'تنبيه' : 'تأكيد'} width="400px">
      <div style={{ display: 'flex', flexDirection: 'column', gap: '16px', alignItems: 'center', padding: '8px 0' }}>
        <div style={{ fontSize: '14px', color: 'var(--text)', textAlign: 'center' }}>{message}</div>
        <div style={{ display: 'flex', gap: '12px' }}>
          {mode === 'alert' ? (
            <button onClick={handleConfirm}
              style={{ background: 'var(--accent)', color: '#fff', padding: '10px 24px', borderRadius: '8px', fontSize: '14px', fontWeight: 'bold' }}>
              حسناً
            </button>
          ) : (
            <>
              <button onClick={handleConfirm}
                style={{ background: 'var(--danger)', color: '#fff', padding: '10px 24px', borderRadius: '8px', fontSize: '14px', fontWeight: 'bold' }}>
                تأكيد
              </button>
              <button onClick={handleCancel}
                style={{ background: 'var(--bg3)', color: 'var(--text)', padding: '10px 24px', borderRadius: '8px', fontSize: '14px', fontWeight: 'bold' }}>
                إلغاء
              </button>
            </>
          )}
        </div>
      </div>
    </Modal>
  ) : null

  return { confirm, showAlert, ConfirmDialog }
}
