import { useState, useEffect } from 'preact/hooks'
import api from '../api'
import { formatDateTime } from '../utils/date'

export default function ActivityLogPage() {
  const [logs, setLogs] = useState([])
  const [search, setSearch] = useState({ q: '', dateFrom: '', dateTo: '' })

  useEffect(() => {
    async function load() {
      const token = localStorage.getItem('token')
      try {
        const data = await api.listActivity(token)
        setLogs(data)
      } catch {}
    }
    load()
  }, [])

  const filtered = logs.filter(l => {
    const q = search.q
    const matchQ = !q ||
      l.userName?.includes(q) || l.action?.includes(q) || l.details?.includes(q)
    const matchDate = (!search.dateFrom || new Date(l.createdAt) >= new Date(search.dateFrom)) &&
      (!search.dateTo || new Date(l.createdAt) <= new Date(search.dateTo + 'T23:59:59'))
    return matchQ && matchDate
  })

  return (
    <div style={{ padding: '20px', overflow: 'auto', height: '100vh' }}>
      <h1 style={{ fontSize: '20px', marginBottom: '16px' }}>سجل النشاط</h1>

      <div style={{ display: 'flex', gap: '8px', marginBottom: '12px', flexWrap: 'wrap' }}>
        <input placeholder="بحث باسم المستخدم أو الإجراء..." value={search.q}
          onInput={e => setSearch(s => ({ ...s, q: e.target.value }))}
          style={{ flex: 1, minWidth: '200px' }} />
        <input type="date" value={search.dateFrom} onInput={e => setSearch(s => ({ ...s, dateFrom: e.target.value }))}
          style={{ width: '140px' }} />
        <input type="date" value={search.dateTo} onInput={e => setSearch(s => ({ ...s, dateTo: e.target.value }))}
          style={{ width: '140px' }} />
      </div>

      <div style={{ background: 'var(--bg2)', borderRadius: '12px', overflow: 'auto' }}>
        <table>
          <thead><tr><th>التاريخ والوقت</th><th>المستخدم</th><th>الإجراء</th><th>التفاصيل</th></tr></thead>
          <tbody>
            {filtered.map(l => (
              <tr key={l._id}>
                <td style={{ fontSize: '12px', color: 'var(--text2)' }}>{formatDateTime(l.createdAt)}</td>
                <td style={{ fontWeight: 'bold' }}>{l.userName}</td>
                <td>
                  <span style={{
                    background: 'var(--bg2)', padding: '2px 8px', borderRadius: '4px', fontSize: '12px',
                    color: l.action?.includes('حذف') ? 'var(--danger)' : l.action?.includes('إضافة') ? 'var(--success)' : 'var(--accent)'
                  }}>
                    {l.action}
                  </span>
                </td>
                <td style={{ fontSize: '12px', color: 'var(--text2)' }}>{l.details || '-'}</td>
              </tr>
            ))}
            {filtered.length === 0 && <tr><td colSpan="4" style={{ padding: '24px', color: '#475569', textAlign: 'center' }}>لا توجد نشاطات مطابقة</td></tr>}
          </tbody>
        </table>
      </div>
    </div>
  )
}
