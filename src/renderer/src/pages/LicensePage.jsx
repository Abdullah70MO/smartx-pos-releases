import { useState, useEffect } from 'preact/hooks'
import { useStore } from '../store'
import api from '../api'

export default function LicensePage() {
  const { license, setPage } = useStore()
  const [mode, setMode] = useState(license?.expired ? 'expired' : 'choose')
  const [key, setKey] = useState('')
  const [error, setError] = useState('')
  const [loading, setLoading] = useState(false)
  const [contact, setContact] = useState(null)
  const [showContact, setShowContact] = useState(false)

  useEffect(() => {
    api.getContactInfo().then(setContact).catch(() => {})
  }, [])

  async function handleStartTrial() {
    setLoading(true); setError('')
    try {
      await api.startTrial()
      setMode('trial-started')
    } catch (err) { setError(err.message) }
    setLoading(false)
  }

  async function handleActivate() {
    if (!key.trim()) { setError('الرجاء إدخال مفتاح التفعيل'); return }
    setLoading(true); setError('')
    try {
      const result = await api.activateLicense(key.trim())
      if (result?.activated) {
        setMode('activated')
      } else {
        setError(result?.message || 'فشل التفعيل')
      }
    } catch (err) { setError(err.message) }
    setLoading(false)
  }

  function goToLogin() {
    setPage('login')
  }

  return (
    <div style={{ display:'flex',flexDirection:'column',alignItems:'center',justifyContent:'center',height:'100vh',padding:'20px',gap:'20px' }}>
      <div style={{ fontSize:'28px',fontWeight:'bold',color:'var(--accent)' }}>SMART X</div>

      {mode === 'choose' && (
        <div style={{ display:'flex',flexDirection:'column',gap:'14px',width:'380px',background:'var(--bg2)',padding:'28px',borderRadius:'16px',textAlign:'center' }}>
          <h2 style={{ fontSize:'18px',marginBottom:'4px' }}>تفعيل البرنامج</h2>
          <p style={{ fontSize:'13px',color:'var(--text2)',lineHeight:1.8 }}>
            {license?.trialUsed && !license?.activated
              ? 'تم استخدام الفترة التجريبية من قبل. يرجى إدخال مفتاح التفعيل.'
              : 'يمكنك بدء الفترة التجريبية لمدة 14 يوماً أو إدخال مفتاح التفعيل الخاص بك'}
          </p>
          {(!license?.trialUsed || license?.activated) && (
            <button onClick={handleStartTrial} disabled={loading} style={{
              background:'var(--accent)',color:'#fff',padding:'12px',borderRadius:'8px',fontSize:'14px',fontWeight:'bold'
            }}>
              {loading ? 'جاري...' : 'بدء الفترة التجريبية (14 يوم)'}
            </button>
          )}
          {(!license?.trialUsed || license?.activated) && (
            <div style={{ position:'relative',margin:'8px 0' }}>
              <div style={{ borderTop:'1px solid var(--bg3)' }}></div>
              <div style={{ position:'absolute',top:'-8px',left:'50%',transform:'translateX(-50%)',background:'var(--bg2)',padding:'0 12px',color:'var(--text2)',fontSize:'12px' }}>أو</div>
            </div>
          )}
          <input value={key} onInput={e => setKey(e.target.value)} placeholder="مفتاح التفعيل" style={{ textAlign:'center',direction:'ltr' }} />
          <button onClick={handleActivate} disabled={loading} style={{
            background:'var(--success)',color:'#fff',padding:'12px',borderRadius:'8px',fontSize:'14px',fontWeight:'bold'
          }}>
            {loading ? 'جاري...' : 'تفعيل الترخيص'}
          </button>
          {error && <div style={{ color:'var(--danger)',fontSize:'13px' }}>{error}</div>}
        </div>
      )}

      {mode === 'expired' && (
        <div style={{ display:'flex',flexDirection:'column',gap:'14px',width:'380px',background:'var(--bg2)',padding:'28px',borderRadius:'16px',textAlign:'center' }}>
          <div style={{ fontSize:'40px' }}>⏰</div>
          <h2 style={{ fontSize:'18px',color:'var(--danger)' }}>انتهت صلاحية الترخيص</h2>
          <p style={{ fontSize:'13px',color:'var(--text2)',lineHeight:1.8 }}>
            {license?.trialUsed && !license?.activated
              ? 'انتهت الفترة التجريبية. يرجى تفعيل الترخيص للمتابعة.'
              : 'انتهت صلاحية الترخيص. يرجى تجديد الترخيص للمتابعة.'}
          </p>
          <button onClick={() => setMode('choose')} style={{ background:'var(--accent)',color:'#fff',padding:'12px',borderRadius:'8px',fontSize:'14px',fontWeight:'bold' }}>
            تفعيل الترخيص
          </button>
        </div>
      )}

      {mode === 'trial-started' && (
        <div style={{ display:'flex',flexDirection:'column',gap:'14px',width:'380px',background:'var(--bg2)',padding:'28px',borderRadius:'16px',textAlign:'center' }}>
          <div style={{ fontSize:'40px' }}>🎉</div>
          <h2 style={{ fontSize:'18px' }}>تم تفعيل الفترة التجريبية</h2>
          <p style={{ fontSize:'13px',color:'var(--text2)',lineHeight:1.8 }}>
            يمكنك استخدام البرنامج لمدة 14 يوماً. تفضل بتسجيل الدخول للبدء.
          </p>
          <button onClick={goToLogin} style={{ background:'var(--accent)',color:'#fff',padding:'12px',borderRadius:'8px',fontSize:'14px',fontWeight:'bold' }}>
            تسجيل الدخول
          </button>
        </div>
      )}

      {mode === 'activated' && (
        <div style={{ display:'flex',flexDirection:'column',gap:'14px',width:'380px',background:'var(--bg2)',padding:'28px',borderRadius:'16px',textAlign:'center' }}>
          <div style={{ fontSize:'40px' }}>✅</div>
          <h2 style={{ fontSize:'18px' }}>تم التفعيل بنجاح</h2>
          <p style={{ fontSize:'13px',color:'var(--text2)',lineHeight:1.8 }}>
            تم تفعيل الترخيص بنجاح. يمكنك الآن تسجيل الدخول.
          </p>
          <button onClick={goToLogin} style={{ background:'var(--accent)',color:'#fff',padding:'12px',borderRadius:'8px',fontSize:'14px',fontWeight:'bold' }}>
            تسجيل الدخول
          </button>
        </div>
      )}

      {contact && (
        <div style={{ width:'380px',textAlign:'center' }}>
          <button onClick={() => setShowContact(!showContact)} style={{ background:'var(--bg3)',color:'var(--text2)',padding:'10px 20px',borderRadius:'8px',fontSize:'13px',width:'100%' }}>
            {showContact ? 'إخفاء' : 'الدعم الفني'}
          </button>
          {showContact && (
            <div style={{ background:'var(--bg2)',padding:'20px',borderRadius:'16px',textAlign:'center',border:'1px solid var(--bg3)',marginTop:'8px' }}>
              {(Array.isArray(contact) ? contact : []).map((item, i) => (
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