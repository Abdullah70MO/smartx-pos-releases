import { useState } from 'preact/hooks'
import Modal from './Modal'
import { useToast } from './Toast'
import api from '../api'

export default function ActivateLicenseModal({ open, onClose, onActivated }) {
  const toast = useToast()
  const [key, setKey] = useState('')
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')

  async function handleActivate() {
    if (!key.trim()) { setError('الرجاء إدخال مفتاح التفعيل'); return }
    setLoading(true); setError('')
    try {
      const result = await api.activateLicense(key.trim())
      if (result?.success) {
        toast('تم التفعيل بنجاح')
        setKey('')
        onActivated?.()
        onClose()
      } else {
        setError(result?.message || 'فشل التفعيل')
      }
    } catch (err) { setError(err.message) }
    setLoading(false)
  }

  function handleClose() {
    setKey(''); setError('')
    onClose()
  }

  return (
    <Modal open={open} onClose={handleClose} title="تفعيل الترخيص" width="380px">
      <div style={{ display: 'flex', flexDirection: 'column', gap: '14px', padding: '8px 0' }}>
        <input
          value={key}
          onInput={e => setKey(e.target.value)}
          placeholder="مفتاح التفعيل"
          style={{ textAlign: 'center', direction: 'ltr' }}
          onKeyDown={e => { if (e.key === 'Enter') handleActivate() }}
        />
        {error && <div style={{ color: 'var(--danger)', fontSize: '13px', textAlign: 'center' }}>{error}</div>}
        <button
          onClick={handleActivate}
          disabled={loading}
          style={{
            background: 'var(--success)', color: '#fff', padding: '12px', borderRadius: '8px',
            fontSize: '14px', fontWeight: 'bold', opacity: loading ? 0.6 : 1
          }}
        >
          {loading ? 'جاري التفعيل...' : 'تفعيل'}
        </button>
      </div>
    </Modal>
  )
}
