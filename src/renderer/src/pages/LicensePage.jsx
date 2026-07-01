import { useState, useEffect } from 'preact/hooks'
import { useStore } from '../store'
import api from '../api'

export default function LicensePage() {
  const { license, setPage, refreshLicense } = useStore()
  const [mode, setMode] = useState(() => {
    if (license?.expired) return 'expired'
    if (license?.activated) return 'activated'
    if (license?.trialUsed) return 'trial-already'
    return 'choose'
  })
  const [key, setKey] = useState('')
  const [error, setError] = useState('')
  const [loading, setLoading] = useState(false)
  const [contact, setContact] = useState(null)
  const [showContact, setShowContact] = useState(false)

  useEffect(() => {
    api.getContactInfo().then(setContact).catch(() => {})
  }, [])

  const trialAvailable = !license?.wasEverActivated && !license?.trialUsed && !license?.activated
  const statusTone = license?.remainingDays !== null && license?.remainingDays <= 7 ? 'var(--danger)' : 'var(--success)'
  const statusBg = license?.remainingDays !== null && license?.remainingDays <= 7 ? 'rgba(239,68,68,0.14)' : 'rgba(16,185,129,0.14)'

  async function handleStartTrial() {
    setLoading(true); setError('')
    try {
      const result = await api.startTrial()
      if (result?.alreadyActivated) {
        await refreshLicense()
        setMode('trial-already')
      } else {
        await refreshLicense()
        goToLogin()
      }
    } catch (err) { setError(err.message) }
    setLoading(false)
  }

  async function handleActivate() {
    if (!key.trim()) { setError('الرجاء إدخال مفتاح التفعيل'); return }
    setLoading(true); setError('')
    try {
      const result = await api.activateLicense(key.trim())
      if (result?.success) {
        await refreshLicense()
        setMode('activated')
      } else {
        setError(result?.message || 'فشل التفعيل')
      }
    } catch (err) { setError(err.message) }
    setLoading(false)
  }

  async function goToLogin() {
    await refreshLicense()
    setPage('login')
  }

  return (
    <div style={{ minHeight:'100vh', display:'flex', alignItems:'center', justifyContent:'center', padding:'24px', background:'var(--bg)', direction:'rtl' }}>
      <div style={{ width:'100%', maxWidth:'460px', display:'flex', flexDirection:'column', gap:'16px', alignItems:'center' }}>
        <div style={{ display:'flex', alignItems:'center', gap:'12px', padding:'10px 16px', borderRadius:'999px', background:'rgba(255,255,255,0.05)', border:'1px solid var(--outline)' }}>
          <div style={{ width:'40px', height:'40px', borderRadius:'50%', display:'flex', alignItems:'center', justifyContent:'center', background:'linear-gradient(135deg, var(--accent), var(--secondary))', color:'#fff', fontSize:'20px', fontWeight:'800' }}>S</div>
          <div>
            <div style={{ fontSize:'18px', fontWeight:'800', color:'var(--text)' }}>SMART X</div>
            <div style={{ fontSize:'12px', color:'var(--text2)' }}>نظام إدارة المبيعات والمخزون</div>
          </div>
        </div>

        {mode === 'choose' && (
          <div style={{ width:'100%', display:'flex', flexDirection:'column', gap:'14px', background:'var(--bg2)', padding:'28px', borderRadius:'24px', border:'1px solid var(--outline)', boxShadow:'0 24px 60px rgba(0,0,0,0.22)' }}>
            <div style={{ textAlign:'center', display:'flex', flexDirection:'column', gap:'6px' }}>
              <div style={{ fontSize:'22px', fontWeight:'800', color:'var(--text)' }}>تفعيل البرنامج</div>
              <div style={{ fontSize:'13px', color:'var(--text2)', lineHeight:1.7 }}>
                {license?.trialUsed && !license?.activated || license?.wasEverActivated
                  ? 'تم استخدام الفترة التجريبية من قبل. يرجى إدخال مفتاح التفعيل.'
                  : 'ابدأ تجربة مجانية أو أدخل مفتاح تفعيلك لاستكمال الوصول.'}
              </div>
            </div>

            {license?.remainingText && (
              <div style={{ padding:'10px 12px', borderRadius:'12px', fontSize:'13px', fontWeight:'700', background:statusBg, color:statusTone, textAlign:'center' }}>
                {license.remainingText}
              </div>
            )}

            {trialAvailable && (
              <button type="button" onClick={handleStartTrial} disabled={loading} style={{ background:'var(--accent)', color:'#fff', border:'none', padding:'12px 14px', borderRadius:'12px', fontSize:'14px', fontWeight:'700', cursor:loading ? 'wait' : 'pointer', opacity:loading ? 0.72 : 1 }}>
                {loading ? 'جاري الإعداد...' : 'بدء الفترة التجريبية (14 يوم)'}
              </button>
            )}

            {trialAvailable && (
              <div style={{ position:'relative', margin:'4px 0' }}>
                <div style={{ borderTop:'1px solid var(--bg3)' }} />
                <div style={{ position:'absolute', top:'-8px', left:'50%', transform:'translateX(-50%)', background:'var(--bg2)', padding:'0 10px', color:'var(--text2)', fontSize:'12px' }}>أو</div>
              </div>
            )}

            <div style={{ display:'flex', flexDirection:'column', gap:'6px', textAlign:'right' }}>
              <label style={{ fontSize:'13px', color:'var(--text2)', fontWeight:'700' }}>مفتاح التفعيل</label>
              <input
                value={key}
                onInput={e => setKey(e.target.value)}
                onKeyDown={e => { if (e.key === 'Enter') handleActivate() }}
                placeholder="أدخل المفتاح هنا"
                style={{ width:'100%', padding:'12px 14px', borderRadius:'12px', border:'1px solid var(--outline)', background:'var(--bg)', color:'var(--text)', textAlign:'center', direction:'ltr', outline:'none' }}
              />
            </div>

            <button type="button" onClick={handleActivate} disabled={loading} style={{ background:'var(--success)', color:'#fff', border:'none', padding:'12px 14px', borderRadius:'12px', fontSize:'14px', fontWeight:'700', cursor:loading ? 'wait' : 'pointer', opacity:loading ? 0.72 : 1 }}>
              {loading ? 'جاري التفعيل...' : 'تفعيل الترخيص'}
            </button>

            {error && <div style={{ color:'var(--danger)', fontSize:'13px', textAlign:'center' }}>{error}</div>}

            {(license?.trialUsed || license?.activated) && !license?.expired && (
              <button type="button" onClick={goToLogin} style={{ background:'transparent', color:'var(--text2)', border:'none', padding:'6px', borderRadius:'8px', fontSize:'13px', cursor:'pointer', textDecoration:'underline' }}>
                الرجوع إلى تسجيل الدخول
              </button>
            )}
          </div>
        )}

        {mode === 'expired' && (
          <div style={{ width:'100%', display:'flex', flexDirection:'column', gap:'14px', background:'var(--bg2)', padding:'28px', borderRadius:'24px', border:'1px solid rgba(239,68,68,0.24)', boxShadow:'0 24px 60px rgba(0,0,0,0.22)', textAlign:'center' }}>
            <div style={{ fontSize:'44px' }}>⏰</div>
            <div style={{ fontSize:'22px', fontWeight:'800', color:'var(--danger)' }}>انتهت صلاحية الترخيص</div>
            {license?.remainingText && <div style={{ padding:'10px 12px', borderRadius:'12px', fontSize:'13px', fontWeight:'700', color:'var(--danger)', background:'rgba(239,68,68,0.14)' }}>{license.remainingText}</div>}
            <div style={{ fontSize:'13px', color:'var(--text2)', lineHeight:1.8 }}>
              {license?.trialUsed && !license?.activated || license?.wasEverActivated
                ? 'انتهت الفترة التجريبية. يرجى تفعيل الترخيص للمتابعة.'
                : 'انتهت صلاحية الترخيص. يرجى تجديد الترخيص للمتابعة.'}
            </div>
            <button type="button" onClick={() => setMode('choose')} style={{ background:'var(--accent)', color:'#fff', border:'none', padding:'12px 14px', borderRadius:'12px', fontSize:'14px', fontWeight:'700' }}>
              تفعيل الترخيص
            </button>
          </div>
        )}

        {mode === 'trial-started' && (
          <div style={{ width:'100%', display:'flex', flexDirection:'column', gap:'14px', background:'var(--bg2)', padding:'28px', borderRadius:'24px', border:'1px solid var(--outline)', boxShadow:'0 24px 60px rgba(0,0,0,0.22)', textAlign:'center' }}>
            <div style={{ fontSize:'44px' }}>🎉</div>
            <div style={{ fontSize:'22px', fontWeight:'800', color:'var(--text)' }}>تم تفعيل الفترة التجريبية</div>
            <div style={{ fontSize:'13px', color:'var(--text2)', lineHeight:1.8 }}>
              يمكنك استخدام البرنامج لمدة 14 يوماً. تفضل بتسجيل الدخول للبدء.
            </div>
            <button type="button" onClick={goToLogin} style={{ background:'var(--accent)', color:'#fff', border:'none', padding:'12px 14px', borderRadius:'12px', fontSize:'14px', fontWeight:'700' }}>
              تسجيل الدخول
            </button>
          </div>
        )}

        {mode === 'trial-already' && (
          <div style={{ width:'100%', display:'flex', flexDirection:'column', gap:'14px', background:'var(--bg2)', padding:'28px', borderRadius:'24px', border:'1px solid var(--outline)', boxShadow:'0 24px 60px rgba(0,0,0,0.22)', textAlign:'center' }}>
            <div style={{ fontSize:'44px' }}>⏳</div>
            <div style={{ fontSize:'22px', fontWeight:'800', color:'var(--text)' }}>الفترة التجريبية مفعلة مسبقاً</div>
            <div style={{ fontSize:'13px', color:'var(--text2)', lineHeight:1.8 }}>
              {license?.remainingText
                ? `باقي من الفترة التجريبية: ${license.remainingText}`
                : 'لقد بدأت الفترة التجريبية من قبل. يمكنك تسجيل الدخول للمتابعة.'}
            </div>
            <button type="button" onClick={goToLogin} style={{ background:'var(--accent)', color:'#fff', border:'none', padding:'12px 14px', borderRadius:'12px', fontSize:'14px', fontWeight:'700' }}>
              تسجيل الدخول
            </button>
          </div>
        )}

        {mode === 'activated' && (
          <div style={{ width:'100%', display:'flex', flexDirection:'column', gap:'14px', background:'var(--bg2)', padding:'28px', borderRadius:'24px', border:'1px solid rgba(16,185,129,0.24)', boxShadow:'0 24px 60px rgba(0,0,0,0.22)', textAlign:'center' }}>
            <div style={{ fontSize:'44px' }}>✅</div>
            <div style={{ fontSize:'22px', fontWeight:'800', color:'var(--text)' }}>تم التفعيل بنجاح</div>
            <div style={{ fontSize:'13px', color:'var(--text2)', lineHeight:1.8 }}>
              تم تفعيل الترخيص بنجاح. يمكنك الآن تسجيل الدخول.
            </div>
            <button type="button" onClick={goToLogin} style={{ background:'var(--accent)', color:'#fff', border:'none', padding:'12px 14px', borderRadius:'12px', fontSize:'14px', fontWeight:'700' }}>
              تسجيل الدخول
            </button>
          </div>
        )}

        {contact && (
          <div style={{ width:'100%', textAlign:'center' }}>
            <button type="button" onClick={() => setShowContact(!showContact)} style={{ background:'var(--bg3)', color:'var(--text2)', border:'1px solid var(--outline)', padding:'10px 16px', borderRadius:'999px', fontSize:'13px', width:'100%', fontWeight:'700' }}>
              {showContact ? 'إخفاء الدعم الفني' : 'الدعم الفني'}
            </button>
            {showContact && (
              <div style={{ background:'var(--bg2)', padding:'18px', borderRadius:'16px', textAlign:'center', border:'1px solid var(--outline)', marginTop:'8px' }}>
                {(Array.isArray(contact) ? contact : []).filter(i => i.label !== 'واتساب' && i.label !== 'البريد الإلكتروني').map((item, i) => (
                  <div key={i} style={{ fontSize:'12px', color:'var(--text2)', marginBottom:'6px' }}>
                    {item.label}: {item.link ? <a href={item.link} target="_blank" rel="noopener noreferrer" style={{ color:'var(--accent)' }}>{item.value}</a> : item.value}
                  </div>
                ))}
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  )
}