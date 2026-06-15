import { useState, useEffect } from 'preact/hooks'
import { useStore } from '../store'
import api from '../api'
import ActivateLicenseModal from '../components/ActivateLicenseModal'

export default function LoginPage() {
  const { login, license, setPage, refreshLicense } = useStore()
  const [username, setUsername] = useState('')
  const [password, setPassword] = useState('')
  const [showPassword, setShowPassword] = useState(false)
  const [error, setError] = useState('')
  const [loading, setLoading] = useState(false)
  const [contact, setContact] = useState(null)
  const [showContact, setShowContact] = useState(false)
  const [showLicenseModal, setShowLicenseModal] = useState(false)

  useEffect(() => {
    api.getContactInfo().then(setContact).catch(() => {})
  }, [])

  async function handleLogin(e) {
    e.preventDefault()
    setError('')
    setLoading(true)
    try {
      await login(username, password)
    } catch (err) {
      setError(err.message)
    } finally {
      setLoading(false)
    }
  }

  async function handleClose() {
    try { await api.closeApp() } catch {}
    window.close()
  }

  return (
    <div style={{ display:'flex',flexDirection:'column',alignItems:'center',justifyContent:'center',height:'100vh',gap:'24px',padding:'20px' }}>
      <div style={{ fontSize:'28px',fontWeight:'bold',color:'var(--accent)' }}>SMART X</div>

      {license?.remainingText && (
        <div style={{
          padding: '8px 16px', borderRadius: '8px', fontSize: '13px', fontWeight: '600',
          background: license.remainingDays !== null && license.remainingDays <= 7 ? 'rgba(239,68,68,0.15)' : 'rgba(16,185,129,0.15)',
          color: license.remainingDays !== null && license.remainingDays <= 7 ? 'var(--danger)' : 'var(--success)',
          textAlign: 'center', maxWidth: '320px', width: '100%'
        }}>
          {license.remainingText}
        </div>
      )}

      <form onSubmit={handleLogin} style={{ display:'flex',flexDirection:'column',gap:'12px',width:'320px',background:'var(--bg2)',padding:'24px',borderRadius:'16px' }}>
        <h2 style={{ fontSize:'18px',textAlign:'center',marginBottom:'8px' }}>تسجيل الدخول</h2>

        <input
          type="text"
          placeholder="اسم المستخدم"
          value={username}
          onInput={e => setUsername(e.target.value)}
          required
        />
        <div style={{ position: 'relative' }}>
          <input
            type={showPassword ? 'text' : 'password'}
            placeholder="كلمة المرور"
            value={password}
            onInput={e => setPassword(e.target.value)}
            required
            style={{ width: '100%' }}
          />
          <button
            type="button"
            onClick={() => setShowPassword(!showPassword)}
            style={{
              position: 'absolute', left: '8px', top: '50%', transform: 'translateY(-50%)',
              background: 'none', color: 'var(--text2)', fontSize: '14px', cursor: 'pointer',
              padding: '4px'
            }}
          >
            {showPassword ? '👁️' : '👁️‍🗨️'}
          </button>
        </div>

        {error && <div style={{ color:'var(--danger)',fontSize:'13px',textAlign:'center' }}>{error}</div>}

        <button
          type="submit"
          disabled={loading}
          style={{
            background:'var(--accent)',color:'#fff',padding:'10px',borderRadius:'8px',
            fontSize:'15px',fontWeight:'bold',opacity:loading?0.6:1
          }}
        >
          {loading ? 'جاري تسجيل الدخول...' : 'دخول'}
        </button>
      </form>

      <div style={{ display: 'flex', gap: '10px', maxWidth: '320px', width: '100%' }}>
        <button onClick={handleClose} style={{ flex: 1, background:'var(--bg3)',color:'var(--danger)',padding:'10px',borderRadius:'8px',fontSize:'13px',fontWeight:'600' }}>
          إغلاق التطبيق
        </button>
        <button onClick={() => setShowLicenseModal(true)} style={{ flex: 1, background:'var(--bg3)',color:'var(--accent)',padding:'10px',borderRadius:'8px',fontSize:'13px',fontWeight:'600' }}>
          الترخيص
        </button>
      </div>

      <ActivateLicenseModal
        open={showLicenseModal}
        onClose={() => setShowLicenseModal(false)}
        onActivated={() => refreshLicense()}
      />

      {contact && (
        <div style={{ maxWidth:'320px',width:'100%' }}>
          <button onClick={() => setShowContact(!showContact)} style={{ background:'var(--bg3)',color:'var(--text2)',padding:'10px 20px',borderRadius:'8px',fontSize:'13px',width:'100%' }}>
            {showContact ? 'إخفاء' : 'الدعم الفني'}
          </button>
          {showContact && (
            <div style={{ background:'var(--bg2)',padding:'20px',borderRadius:'16px',textAlign:'center',border:'1px solid var(--bg3)',marginTop:'8px' }}>
        {(Array.isArray(contact) ? contact : []).filter(i => i.label !== 'WhatsApp' && i.label !== 'Email').map((item, i) => (
          <div key={i} style={{ fontSize:'12px',color:'var(--text2)',marginBottom:'4px' }}>
            {item.label}: {item.link ? <a href={item.link} target="_blank" rel="noopener noreferrer" style={{ color:'var(--accent)' }}>{item.value}</a> : item.value}
          </div>
        ))}
            </div>
          )}
        </div>
      )}
    </div>
  )
}
