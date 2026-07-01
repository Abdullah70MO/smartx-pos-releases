import { useState, useRef, useEffect } from 'preact/hooks'
import api from '../api'

const WELCOME_MSG = { role: 'assistant', content: '👋 مرحباً! أنا مساعد SMART X. أسألني عن أي شيء في التطبيق:\n\n• إزاي أضيف منتج جديد؟\n• إزاي أعمل فاتورة بيع؟\n• أرباح النهاردة كام؟\n• عندي منتجات قربت تخلص؟\n• إزاي أفتح وردية؟' }

export default function AiAssistantPage() {
  const [messages, setMessages] = useState([WELCOME_MSG])
  const [input, setInput] = useState('')
  const [loading, setLoading] = useState(false)
  const endRef = useRef(null)

  useEffect(() => { endRef.current?.scrollIntoView({ behavior: 'smooth' }) }, [messages])

  async function handleSend(e) {
    e.preventDefault()
    const text = input.trim()
    if (!text || loading) return
    setInput('')
    const userMsg = { role: 'user', content: text }
    const updated = [...messages, userMsg]
    setMessages(updated)
    setLoading(true)
    try {
      const token = localStorage.getItem('token')
      const reply = await api.aiChat(token, updated.filter(m => m !== WELCOME_MSG))
      setMessages(prev => [...prev, { role: 'assistant', content: reply || 'عذراً، لم أستطع الإجابة' }])
    } catch (err) {
      setMessages(prev => [...prev, { role: 'assistant', content: '⚠️ خطأ: ' + (err.message || 'تعذر الاتصال بالمساعد') }])
    }
    setLoading(false)
  }

  function handleKeyDown(e) {
    if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); handleSend(e) }
  }

  return (
    <div style={{ height: '100%', display: 'flex', flexDirection: 'column', background: 'var(--bg)' }}>
      <div style={{ padding: '16px 24px', borderBottom: '1px solid var(--outline)', background: 'var(--bg2)', display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
        <h1 style={{ fontSize: '18px', fontWeight: '700', color: 'var(--text)', display: 'flex', alignItems: 'center', gap: '8px' }}>
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" style={{ width: '22px', height: '22px', color: 'var(--accent)' }}>
            <circle cx="12" cy="12" r="10"/><path d="M9.09 9a3 3 0 0 1 5.83 1c0 2-3 3-3 3"/><line x1="12" y1="17" x2="12.01" y2="17"/>
          </svg>
          المساعد الشخصي
        </h1>
        <button onClick={() => setMessages([WELCOME_MSG])} title="مسح المحادثة" style={{
          background: 'var(--bg3)', color: 'var(--text2)', border: 'none', borderRadius: '8px',
          padding: '6px 12px', fontSize: '12px', cursor: 'pointer', display: 'flex', alignItems: 'center', gap: '4px'
        }}>
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" style={{ width: '14px', height: '14px' }}>
            <polyline points="3 6 5 6 21 6"/><path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2"/>
          </svg>
          مسح
        </button>
      </div>

      <div style={{ flex: 1, overflow: 'auto', padding: '16px 24px', display: 'flex', flexDirection: 'column', gap: '12px' }}>
        {messages.map((msg, i) => (
          <div key={i} style={{
            display: 'flex', justifyContent: msg.role === 'user' ? 'flex-start' : 'flex-end',
            maxWidth: '85%', alignSelf: msg.role === 'user' ? 'flex-end' : 'flex-start'
          }}>
            <div style={{
              padding: '10px 16px', borderRadius: msg.role === 'user' ? '16px 16px 4px 16px' : '16px 16px 16px 4px',
              background: msg.role === 'user' ? 'var(--accent)' : 'var(--bg2)',
              color: msg.role === 'user' ? '#fff' : 'var(--text)',
              fontSize: '13.5px', lineHeight: '1.7', whiteSpace: 'pre-wrap',
              border: msg.role === 'user' ? 'none' : '1px solid var(--outline)',
              boxShadow: 'var(--elevation-1)'
            }}>
              {msg.content}
            </div>
          </div>
        ))}
        {loading && (
          <div style={{ display: 'flex', justifyContent: 'flex-end', maxWidth: '85%', alignSelf: 'flex-start' }}>
            <div style={{
              padding: '10px 16px', borderRadius: '16px 16px 16px 4px',
              background: 'var(--bg2)', color: 'var(--text2)', fontSize: '13px',
              border: '1px solid var(--outline)'
            }}>
              جاري الكتابة...
            </div>
          </div>
        )}
        <div ref={endRef} />
      </div>

      <form onSubmit={handleSend} style={{
        padding: '12px 24px', borderTop: '1px solid var(--outline)', background: 'var(--bg2)',
        display: 'flex', gap: '8px'
      }}>
        <input
          value={input} onInput={e => setInput(e.target.value)} onKeyDown={handleKeyDown}
          placeholder="اسأل المساعد..."
          disabled={loading}
          style={{ flex: 1, padding: '10px 14px', borderRadius: '12px', fontSize: '13.5px' }}
        />
        <button type="submit" disabled={loading || !input.trim()} style={{
          background: 'var(--accent)', color: '#fff', padding: '10px 18px',
          borderRadius: '12px', fontSize: '14px', fontWeight: '700',
          opacity: loading || !input.trim() ? 0.5 : 1
        }}>
          إرسال
        </button>
      </form>
    </div>
  )
}
