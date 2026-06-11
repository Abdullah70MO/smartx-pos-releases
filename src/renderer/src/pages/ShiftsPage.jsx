import { useState, useEffect } from 'preact/hooks'
import { useStore } from '../store'
import api from '../api'
import { useToast } from '../components/Toast'
import Modal from '../components/Modal'
import { formatDateTime, formatTime } from '../utils/date'
import { formatMoney } from '../utils/money'

export default function ShiftsPage() {
  const toast = useToast()
  const { user } = useStore()
  const [activeShift, setActiveShift] = useState(null)
  const [shifts, setShifts] = useState([])
  const [showEndModal, setShowEndModal] = useState(false)
  const [endingBalance, setEndingBalance] = useState(0)
  const [startingBalance, setStartingBalance] = useState(0)
  const [showStartModal, setShowStartModal] = useState(false)
  const [elapsed, setElapsed] = useState('')

  useEffect(() => { load() }, [])

  useEffect(() => {
    if (!activeShift) return
    const start = new Date(activeShift.startedAt)
    const interval = setInterval(() => {
      const diff = Math.floor((Date.now() - start.getTime()) / 1000)
      const h = Math.floor(diff / 3600)
      const m = Math.floor((diff % 3600) / 60)
      const s = diff % 60
      setElapsed(`${String(h).padStart(2, '0')}:${String(m).padStart(2, '0')}:${String(s).padStart(2, '0')}`)
    }, 1000)
    return () => clearInterval(interval)
  }, [activeShift])

  async function load() {
    const token = localStorage.getItem('token')
    try {
      const [active, all] = await Promise.all([api.getActiveShift(token), api.listShifts(token)])
      setActiveShift(active)
      setShifts(all)
      if (active) setEndingBalance(active.endingBalance)
    } catch {}
  }

  async function handleStart() {
    const token = localStorage.getItem('token')
    try {
      await api.startShift(token, Number(startingBalance) || 0)
      toast('تم بدء الوردية', 'success')
      setShowStartModal(false); load()
    } catch (err) { toast(err.message, 'error') }
  }

  async function handleEnd() {
    const token = localStorage.getItem('token')
    try {
      const ended = await api.endShift(token, Number(endingBalance) || 0)
      toast(`تم إنهاء الوردية - المبيعات: ${ended.totalSales?.toFixed(2)}`, 'success')
      setShowEndModal(false); load()
    } catch (err) { toast(err.message, 'error') }
  }

  return (
    <div style={{ padding: '20px', overflow: 'auto', height: '100vh' }}>
      <h1 style={{ fontSize: '20px', marginBottom: '16px' }}>الورديات</h1>

      {/* Active shift */}
      {activeShift ? (
        <div style={{ background: 'linear-gradient(135deg, var(--bg2), var(--bg))', borderRadius: '12px', padding: '20px', marginBottom: '16px', border: '1px solid var(--success)' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            <div>
              <div style={{ fontSize: '12px', color: 'var(--success)', marginBottom: '4px' }}>● الوردية نشطة</div>
              <div style={{ fontSize: '24px', fontWeight: 'bold', fontFamily: 'monospace' }}>{elapsed}</div>
              <div style={{ fontSize: '12px', color: 'var(--text2)', marginTop: '4px' }}>بدأت: {formatDateTime(activeShift.startedAt)}</div>
            </div>
            <div style={{ textAlign: 'left' }}>
              <div style={{ fontSize: '13px', color: 'var(--text2)' }}>مبيعات الوردية</div>
              <div style={{ fontSize: '22px', fontWeight: 'bold', color: 'var(--success)' }}>{formatMoney(activeShift.totalSales)}</div>
              <button onClick={() => setShowEndModal(true)}
                style={{ marginTop: '8px', background: 'var(--danger)', color: '#fff', padding: '8px 16px', borderRadius: '8px', fontSize: '12px' }}>
                إنهاء الوردية
              </button>
            </div>
          </div>
        </div>
      ) : (
        <div style={{ background: 'var(--bg2)', borderRadius: '12px', padding: '20px', marginBottom: '16px', textAlign: 'center' }}>
          <div style={{ color: 'var(--text2)', fontSize: '14px', marginBottom: '12px' }}>لا توجد وردية نشطة</div>
          <button onClick={() => setShowStartModal(true)} style={{ background: 'var(--success)', color: '#fff', padding: '10px 20px', borderRadius: '8px', fontSize: '14px', fontWeight: 'bold' }}>
            بدء وردية
          </button>
        </div>
      )}

      <h3 style={{ fontSize: '13px', color: 'var(--text2)', marginBottom: '8px' }}>سجل الورديات</h3>
      <div style={{ background: 'var(--bg2)', borderRadius: '12px', overflow: 'auto' }}>
        <table>
          <thead><tr><th>الكاشير</th><th>البداية</th><th>النهاية</th><th>المدة</th><th>بداية الرصيد</th><th>المبيعات</th><th>نهاية الرصيد</th></tr></thead>
          <tbody>
            {shifts.map(s => {
              const start = new Date(s.startedAt)
              const end = s.endedAt ? new Date(s.endedAt) : new Date()
              const diff = Math.floor((end - start) / 1000)
              const h = Math.floor(diff / 3600)
              const m = Math.floor((diff % 3600) / 60)
              return (
                <tr key={s._id}>
                  <td style={{ fontWeight: 'bold' }}>{s.cashierName}</td>
                  <td style={{ fontSize: '12px', color: 'var(--text2)' }}>{formatTime(start)}</td>
                  <td style={{ fontSize: '12px', color: 'var(--text2)' }}>{s.endedAt ? formatTime(end) : '-'}</td>
                  <td style={{ fontSize: '12px', color: 'var(--text2)' }}>{h}:{String(m).padStart(2, '0')}</td>
                  <td>{formatMoney(s.startingBalance)}</td>
                  <td style={{ color: 'var(--success)', fontWeight: 'bold' }}>{formatMoney(s.totalSales)}</td>
                  <td>{formatMoney(s.endingBalance)}</td>
                </tr>
              )
            })}
            {shifts.length === 0 && <tr><td colSpan="7" style={{ padding: '24px', color: '#475569', textAlign: 'center' }}>لا توجد ورديات</td></tr>}
          </tbody>
        </table>
      </div>

      {/* Start modal */}
      <Modal open={showStartModal} onClose={() => setShowStartModal(false)} title="بدء وردية جديدة">
        <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
          <input type="number" placeholder="رصيد البداية" value={startingBalance} onInput={e => setStartingBalance(e.target.value)} />
          <button onClick={handleStart} style={{ background: 'var(--success)', color: '#fff', padding: '10px', borderRadius: '8px', fontSize: '14px', fontWeight: 'bold' }}>بدء الوردية</button>
        </div>
      </Modal>

      {/* End modal */}
      <Modal open={showEndModal} onClose={() => setShowEndModal(false)} title="إنهاء الوردية">
        <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
          <div style={{ fontSize: '13px', color: 'var(--text2)', marginBottom: '8px' }}>
            مبيعات الوردية: <span style={{ color: 'var(--success)', fontWeight: 'bold' }}>{formatMoney(activeShift?.totalSales)}</span>
          </div>
          <input type="number" placeholder="رصيد النهاية" value={endingBalance} onInput={e => setEndingBalance(e.target.value)} />
          <button onClick={handleEnd} style={{ background: 'var(--danger)', color: '#fff', padding: '10px', borderRadius: '8px', fontSize: '14px', fontWeight: 'bold' }}>إنهاء الوردية</button>
        </div>
      </Modal>
    </div>
  )
}
