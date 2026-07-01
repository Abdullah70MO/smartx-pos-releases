import { useState, useEffect } from 'preact/hooks'
import { useStore } from '../store'
import api from '../api'
import ActivateLicenseModal from '../components/ActivateLicenseModal'

const S = {
  page: {
    position: 'fixed', inset: 0,
    display: 'flex', alignItems: 'center', justifyContent: 'center',
    background: 'var(--bg)',
    overflow: 'hidden'
  },
  bgDecor: {
    position: 'absolute', borderRadius: '50%', pointerEvents: 'none',
    filter: 'blur(100px)', opacity: 0.12
  },
  card: {
    position: 'relative',
    display: 'flex', flexDirection: 'column', gap: '20px',
    width: '380px', maxWidth: 'calc(100vw - 40px)',
    background: 'var(--bg2)',
    borderRadius: '20px',
    padding: '40px 32px 32px',
    boxShadow: 'var(--elevation-3), 0 0 0 1px var(--outline)',
    zIndex: 1
  },
  logo: {
    textAlign: 'center', marginBottom: '4px'
  },
  logoIcon: {
    display: 'inline-flex', alignItems: 'center', justifyContent: 'center',
    width: '56px', height: '56px',
    background: 'linear-gradient(135deg, var(--accent) 0%, var(--special) 100%)',
    borderRadius: '16px',
    fontSize: '28px', fontWeight: '800', color: '#fff',
    marginBottom: '12px',
    boxShadow: '0 4px 16px rgba(var(--accent-rgb), 0.35)'
  },
  logoText: {
    fontSize: '24px', fontWeight: '800',
    background: 'linear-gradient(135deg, var(--accent) 0%, var(--special) 100%)',
    WebkitBackgroundClip: 'text',
    WebkitTextFillColor: 'transparent',
    letterSpacing: '-0.5px'
  },
  subtitle: {
    fontSize: '13px', color: 'var(--text2)', marginTop: '2px', letterSpacing: '0.3px'
  },
  inputGroup: {
    display: 'flex', flexDirection: 'column', gap: '6px'
  },
  inputLabel: {
    fontSize: '12px', fontWeight: '600', color: 'var(--text2)', paddingRight: '4px'
  },
  input: {
    width: '100%', height: '44px',
    background: 'var(--bg)',
    border: '1px solid var(--outline)',
    borderRadius: '12px',
    padding: '0 14px',
    fontSize: '14px', color: 'var(--text)',
    outline: 'none',
    transition: 'border-color 0.15s, box-shadow 0.15s'
  },
  inputFocus: {
    borderColor: 'var(--accent)',
    boxShadow: '0 0 0 3px rgba(var(--accent-rgb), 0.12)'
  },
  passwordWrap: {
    position: 'relative', width: '100%'
  },
  togglePass: {
    position: 'absolute', left: '10px', top: '50%', transform: 'translateY(-50%)',
    background: 'none', border: 'none',
    color: 'var(--text2)', fontSize: '16px', cursor: 'pointer',
    padding: '4px', lineHeight: 1,
    opacity: 0.6, transition: 'opacity 0.15s'
  },
  btnPrimary: {
    width: '100%', height: '46px',
    background: 'linear-gradient(135deg, var(--accent) 0%, var(--special) 100%)',
    color: '#fff',
    border: 'none', borderRadius: '12px',
    fontSize: '15px', fontWeight: '700',
    cursor: 'pointer',
    transition: 'opacity 0.2s, transform 0.15s',
    display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '8px'
  },
  btnSecondary: {
    width: '100%', height: '42px',
    background: 'transparent',
    color: 'var(--text2)',
    border: '1px solid var(--outline)',
    borderRadius: '12px',
    fontSize: '13px', fontWeight: '600',
    cursor: 'pointer',
    transition: 'background 0.15s, color 0.15s'
  },
  linkBtn: {
    background: 'none', border: 'none',
    color: 'var(--accent)', fontSize: '13px', fontWeight: '600',
    cursor: 'pointer', padding: '4px',
    transition: 'opacity 0.15s'
  },
  divider: {
    height: '1px', background: 'var(--outline)', flex: 1
  },
  footerBtn: {
    flex: 1, height: '40px',
    background: 'var(--bg)',
    border: '1px solid var(--outline)',
    borderRadius: '11px',
    color: 'var(--text2)', fontSize: '12px', fontWeight: '600',
    cursor: 'pointer',
    transition: 'background 0.15s, border-color 0.15s, color 0.15s',
    display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '6px'
  },
  errorBox: {
    padding: '10px 14px',
    background: 'rgba(var(--danger-rgb), 0.08)',
    border: '1px solid rgba(var(--danger-rgb), 0.2)',
    borderRadius: '10px',
    color: 'var(--danger)',
    fontSize: '13px', fontWeight: '500',
    textAlign: 'center'
  },
  licenseBadge: {
    padding: '8px 16px', borderRadius: '10px',
    fontSize: '12px', fontWeight: '600',
    textAlign: 'center'
  },
  contactPanel: {
    background: 'var(--bg)', padding: '16px',
    borderRadius: '12px', textAlign: 'center',
    border: '1px solid var(--outline)'
  }
}

export default function LoginPage() {
  const { login, license, setPage, refreshLicense } = useStore()
  const [username, setUsername] = useState('')
  const [password, setPassword] = useState('')
  const [showPassword, setShowPassword] = useState(false)
  const [error, setError] = useState('')
  const [loading, setLoading] = useState(false)
  const [focusedField, setFocusedField] = useState(null)
  const [contact, setContact] = useState(null)
  const [showContact, setShowContact] = useState(false)
  const [showLicenseModal, setShowLicenseModal] = useState(false)

  const [forgotMode, setForgotMode] = useState(false)
  const [forgotStep, setForgotStep] = useState(1)
  const [forgotUsername, setForgotUsername] = useState('')
  const [securityQuestion, setSecurityQuestion] = useState(null)
  const [securityAnswer, setSecurityAnswer] = useState('')
  const [newPassword, setNewPassword] = useState('')
  const [forgotMsg, setForgotMsg] = useState('')

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
      const msg = (err && err.message) || String(err || '')
      setError(msg.replace(/^(Error|Unhandled Error):\s*/i, ''))
    } finally {
      setLoading(false)
    }
  }

  async function handleClose() {
    try { await api.closeApp() } catch {}
    window.close()
  }

  function resetForgot() {
    setForgotMode(false)
    setForgotStep(1)
    setForgotUsername('')
    setSecurityQuestion(null)
    setSecurityAnswer('')
    setNewPassword('')
    setForgotMsg('')
    setError('')
  }

  async function checkQuestion() {
    setForgotMsg('')
    try {
      const q = await api.getSecurityQuestion(forgotUsername)
      if (!q) {
        setForgotMsg('لم يتم إعداد سؤال أمان لهذا الحساب')
        return
      }
      setSecurityQuestion(q)
      setForgotStep(2)
    } catch (err) {
      setForgotMsg((err && err.message) || String(err || ''))
    }
  }

  async function handleVerifyAnswer() {
    setForgotMsg('')
    if (!securityAnswer.trim()) {
      setForgotMsg('يرجى إدخال الإجابة')
      return
    }
    try {
      const valid = await api.verifySecurityAnswer(forgotUsername, securityAnswer)
      if (!valid) {
        setForgotMsg('الإجابة غير صحيحة')
        return
      }
      setForgotStep(3)
    } catch (err) {
      setForgotMsg((err && err.message) || String(err || ''))
    }
  }

  async function handleResetPassword() {
    setForgotMsg('')
    if (newPassword.length < 4) {
      setForgotMsg('كلمة المرور الجديدة يجب أن تكون 4 أحرف على الأقل')
      return
    }
    try {
      await api.resetPassword(forgotUsername, newPassword, securityAnswer)
      setForgotMsg('✅ تم إعادة تعيين كلمة المرور بنجاح')
      setTimeout(() => resetForgot(), 2000)
    } catch (err) {
      setForgotMsg((err && err.message) || String(err || ''))
    }
  }

  function inputStyle(field) {
    return { ...S.input, ...(focusedField === field ? S.inputFocus : {}) }
  }

  const isDanger = license?.remainingDays !== null && license?.remainingDays <= 7
  const licStyle = {
    ...S.licenseBadge,
    background: isDanger ? 'rgba(var(--danger-rgb), 0.1)' : 'rgba(var(--success-rgb), 0.1)',
    color: isDanger ? 'var(--danger)' : 'var(--success)'
  }

  return (
    <div style={S.page}>
      {/* background decoration */}
      <div style={{ ...S.bgDecor, width: '400px', height: '400px', top: '-80px', right: '-60px', background: 'var(--accent)' }} />
      <div style={{ ...S.bgDecor, width: '300px', height: '300px', bottom: '-40px', left: '-60px', background: 'var(--special)' }} />
      <div style={{ ...S.bgDecor, width: '200px', height: '200px', bottom: '30%', right: '15%', background: 'var(--teal)' }} />

      {!forgotMode ? (
        <form onSubmit={handleLogin} style={S.card}>
          <div style={S.logo}>
            <div style={S.logoIcon}>SX</div>
            <div style={S.logoText}>SMART X</div>
            <div style={S.subtitle}>نظام إدارة نقاط البيع</div>
          </div>

          {license?.remainingText && <div style={licStyle}>{license.remainingText}</div>}

          <div style={S.inputGroup}>
            <label style={S.inputLabel}>اسم المستخدم</label>
            <input type="text" placeholder="أدخل اسم المستخدم"
              value={username}
              onInput={e => setUsername(e.target.value)}
              onFocus={() => setFocusedField('user')}
              onBlur={() => setFocusedField(null)}
              required
              style={inputStyle('user')} />
          </div>

          <div style={S.inputGroup}>
            <label style={S.inputLabel}>كلمة المرور</label>
            <div style={S.passwordWrap}>
              <input type={showPassword ? 'text' : 'password'} placeholder="أدخل كلمة المرور"
                value={password}
                onInput={e => setPassword(e.target.value)}
                onFocus={() => setFocusedField('pass')}
                onBlur={() => setFocusedField(null)}
                required
                style={inputStyle('pass')} />
              <button type="button" onClick={() => setShowPassword(p => !p)}
                style={S.togglePass}>
                {showPassword ? '\u{1F441}' : '\u{1F441}\u200D\u{1F5E8}'}
              </button>
            </div>
          </div>

          {error && <div style={S.errorBox}>{error}</div>}

          <button type="submit" disabled={loading}
            style={{ ...S.btnPrimary, opacity: loading ? 0.6 : 1, cursor: loading ? 'not-allowed' : 'pointer' }}>
            {loading ? (
              <><span style={{ display:'inline-block',animation:'spin 0.8s linear infinite' }}>&#x21bb;</span> جاري تسجيل الدخول...</>
            ) : 'تسجيل الدخول'}
          </button>

          <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
            <div style={S.divider} />
            <button type="button" onClick={() => { setForgotUsername(username); setForgotMode(true) }}
              style={S.linkBtn}>
              نسيت كلمة السر؟
            </button>
            <div style={S.divider} />
          </div>

          <div style={{ display: 'flex', gap: '8px' }}>
            <button type="button" onClick={handleClose} style={S.footerBtn}>
              &#x2716; إغلاق
            </button>
            <button type="button" onClick={() => setShowLicenseModal(true)} style={S.footerBtn}>
              &#x2699; الترخيص
            </button>
          </div>
        </form>
      ) : (
        <div style={S.card}>
          <div style={S.logo}>
            <div style={{ ...S.logoIcon, fontSize: '22px' }}>&#x1F512;</div>
            <div style={S.logoText}>
              {forgotStep === 1 ? 'استعادة كلمة السر' : forgotStep === 2 ? 'تأكيد الهوية' : 'تعيين كلمة سر جديدة'}
            </div>
            <div style={S.subtitle}>
              {forgotStep === 1 ? 'أدخل اسم المستخدم للبدء' : forgotStep === 2 ? 'أجب على سؤال الأمان' : 'اختر كلمة سر جديدة'}
            </div>
          </div>

          {forgotStep === 1 && (
            <>
              <div style={S.inputGroup}>
                <label style={S.inputLabel}>اسم المستخدم</label>
                <input type="text" placeholder="أدخل اسم المستخدم"
                  value={forgotUsername}
                  onInput={e => setForgotUsername(e.target.value)}
                  style={S.input} />
              </div>
              {forgotMsg && <div style={S.errorBox}>{forgotMsg}</div>}
              <button onClick={checkQuestion} style={S.btnPrimary}>&#x2190; التالي</button>
            </>
          )}

          {forgotStep === 2 && securityQuestion && (
            <>
              <div style={{
                padding: '16px', background: 'var(--bg)',
                borderRadius: '12px', textAlign: 'center',
                border: '1px solid var(--outline)',
                fontSize: '14px', fontWeight: '600', color: 'var(--text)',
                lineHeight: 1.6
              }}>
                {securityQuestion.question}
              </div>
              <div style={S.inputGroup}>
                <label style={S.inputLabel}>الإجابة</label>
                <input type="text" placeholder="أدخل الإجابة"
                  value={securityAnswer}
                  onInput={e => setSecurityAnswer(e.target.value)}
                  style={S.input} />
              </div>
              {securityQuestion.hasHint && (
                <div style={{ fontSize: '12px', color: 'var(--text2)', textAlign: 'center' }}>
                  &#x1F4A1; تلميح: {securityQuestion.hint}
                </div>
              )}
              {forgotMsg && !forgotMsg.includes('\u2705') && <div style={S.errorBox}>{forgotMsg}</div>}
              <button onClick={handleVerifyAnswer} style={S.btnPrimary}>&#x2190; التالي</button>
            </>
          )}

          {forgotStep === 3 && (
            <>
              <div style={S.inputGroup}>
                <label style={S.inputLabel}>كلمة السر الجديدة</label>
                <input type="password" placeholder="أدخل كلمة السر الجديدة"
                  value={newPassword}
                  onInput={e => setNewPassword(e.target.value)}
                  style={S.input} />
              </div>
              {forgotMsg && (
                <div style={{
                  ...S.errorBox,
                  color: forgotMsg.includes('\u2705') ? 'var(--success)' : 'var(--danger)',
                  borderColor: forgotMsg.includes('\u2705') ? 'rgba(var(--success-rgb), 0.2)' : 'rgba(var(--danger-rgb), 0.2)',
                  background: forgotMsg.includes('\u2705') ? 'rgba(var(--success-rgb), 0.08)' : 'rgba(var(--danger-rgb), 0.08)'
                }}>
                  {forgotMsg}
                </div>
              )}
              <button onClick={handleResetPassword} style={S.btnPrimary}>&#x1F512; تعيين كلمة السر</button>
            </>
          )}

          <button onClick={resetForgot} style={S.btnSecondary}>&#x2192; رجوع</button>
        </div>
      )}

      {contact && (
        <div style={{ position: 'fixed', bottom: '20px', left: '50%', transform: 'translateX(-50%)', zIndex: 2, width: '380px', maxWidth: 'calc(100vw - 40px)' }}>
          <button onClick={() => setShowContact(p => !p)}
            style={{
              ...S.footerBtn, margin: '0 auto',
              background: showContact ? 'var(--bg2)' : 'transparent',
              borderColor: 'var(--outline)',
              width: '140px'
            }}>
            &#x1F4DE; {showContact ? 'إخفاء' : 'الدعم الفني'}
          </button>
          {showContact && (
            <div style={S.contactPanel}>
              {(Array.isArray(contact) ? contact : []).filter(i => i.label !== 'واتساب' && i.label !== 'البريد الإلكتروني').map((item, i) => (
                <div key={i} style={{ fontSize: '12px', color: 'var(--text2)', marginBottom: i < contact.length - 1 ? '6px' : 0 }}>
                  {item.label}: {item.link
                    ? <a href={item.link} target="_blank" rel="noopener noreferrer" style={{ color: 'var(--accent)', fontWeight: '600' }}>{item.value}</a>
                    : <span style={{ fontWeight: '500' }}>{item.value}</span>}
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      <ActivateLicenseModal
        open={showLicenseModal}
        onClose={() => setShowLicenseModal(false)}
        onActivated={() => refreshLicense()}
      />

      <style>{`
        @keyframes spin { to { transform: rotate(360deg); } }
        input::placeholder { color: var(--text2); opacity: 0.5; }
        button:hover:not(:disabled) { opacity: 0.85; }
        button:active:not(:disabled) { transform: scale(0.98); }
      `}</style>
    </div>
  )
}
