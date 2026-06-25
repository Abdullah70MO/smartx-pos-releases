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
    <Modal open={open} onClose={handleClose} title="تفعيل الترخيص" width="440px">
      <div style={{ display: 'flex', flexDirection: 'column', gap: '14px', padding: '6px 0 4px' }}>
        <div style={{ display: 'flex', flexDirection: 'column', gap: '6px', padding: '14px 16px', borderRadius: '16px', background: 'rgba(255,255,255,0.04)', border: '1px solid var(--outline)' }}>
          <div style={{ fontSize: '18px', fontWeight: '800', color: 'var(--text)' }}>أدخل مفتاح التفعيل</div>
          <div style={{ fontSize: '13px', color: 'var(--text2)', lineHeight: 1.7 }}>
            أدخل المفتاح المكوّن من 16 خانة أو أكثر لاستعادة الوصول إلى البرنامج.
          </div>
        </div>

        <div style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
          <label style={{ fontSize: '13px', fontWeight: '700', color: 'var(--text2)' }}>مفتاح التفعيل</label>
          <input
            value={key}
            onInput={e => setKey(e.target.value)}
            placeholder="أدخل المفتاح هنا"
            style={{ width: '100%', padding: '12px 14px', borderRadius: '12px', border: '1px solid var(--outline)', background: 'var(--bg)', color: 'var(--text)', textAlign: 'center', direction: 'ltr', outline: 'none' }}
            onKeyDown={e => { if (e.key === 'Enter') handleActivate() }}
          />
        </div>

        {error && <div style={{ color: 'var(--danger)', fontSize: '13px', textAlign: 'center' }}>{error}</div>}

        <button
          type="button"
          onClick={handleActivate}
          disabled={loading}
          style={{
            background: 'var(--success)', color: '#fff', padding: '12px 14px', borderRadius: '12px',
            fontSize: '14px', fontWeight: '700', opacity: loading ? 0.72 : 1, border: 'none', cursor: loading ? 'wait' : 'pointer'
          }}
        >
          {loading ? 'جاري التفعيل...' : 'تفعيل الترخيص'}
        </button>
      </div>
    </Modal>
  )
}
