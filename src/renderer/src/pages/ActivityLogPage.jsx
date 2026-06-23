import { useState, useEffect } from 'preact/hooks'
import api from '../api'
import Pagination from '../components/Pagination'
import { formatDateTime } from '../utils/date'

const USER_COLORS = ['var(--accent)', 'var(--success)', 'var(--danger)', 'var(--warning)', 'var(--special)', 'var(--teal)', 'var(--secondary)']
function userColor(id) { let h = 0; for (let i = 0; i < id.length; i++) h = ((h << 5) - h) + id.charCodeAt(i); return USER_COLORS[Math.abs(h) % USER_COLORS.length] }
function userInitial(name) { return (name || '?').charAt(0) }

export default function ActivityLogPage() {
  const [logs, setLogs] = useState([])
  const [search, setSearch] = useState({ q: '', dateFrom: '', dateTo: '' })
  const [page, setPage] = useState(0)
  const [totalPages, setTotalPages] = useState(0)
  const [total, setTotal] = useState(0)
  const pageSize = 30

  useEffect(() => { load() }, [page, search.q, search.dateFrom, search.dateTo])

  async function load() {
    const token = localStorage.getItem('token')
    try {
      const filter = { query: search.q, from: search.dateFrom, to: search.dateTo }
      const result = await api.listActivity(token, filter, page, pageSize)
      setLogs(result.data)
      setTotal(result.total)
      setTotalPages(result.totalPages)
    } catch {}
  }

  function handleSearch(key, value) {
    setSearch(s => ({ ...s, [key]: value }))
    setPage(0)
  }

  return (
    <div style={{ padding: '20px', overflow: 'auto', height: '100%' }}>
      <h1 style={{ fontSize: '20px', marginBottom: '16px' }}>سجل النشاط</h1>

      <div style={{ display: 'flex', gap: '8px', marginBottom: '12px', flexWrap: 'wrap' }}>
        <input placeholder="بحث باسم المستخدم أو الإجراء..." value={search.q}
          onInput={e => handleSearch('q', e.target.value)}
          style={{ flex: 1, minWidth: '200px' }} />
        <input type="date" value={search.dateFrom} onInput={e => handleSearch('dateFrom', e.target.value)}
          style={{ width: '140px' }} />
        <input type="date" value={search.dateTo} onInput={e => handleSearch('dateTo', e.target.value)}
          style={{ width: '140px' }} />
      </div>

      <div className="table-card">
        <table>
          <thead><tr><th>التاريخ والوقت</th><th>المستخدم</th><th>الإجراء</th><th>التفاصيل</th></tr></thead>
          <tbody>
            {logs.map(l => (
              <tr key={l._id}>
                <td style={{ fontSize: '12px', color: 'var(--text2)' }}>{formatDateTime(l.createdAt)}</td>
                <td style={{ fontWeight: 'bold' }}>
                  <span style={{
                    width: '24px', height: '24px', borderRadius: '7px',
                    background: userColor(l.userId || l.userName),
                    color: '#fff', fontSize: '11px', fontWeight: '700',
                    display: 'inline-flex', alignItems: 'center', justifyContent: 'center',
                    marginLeft: '8px', verticalAlign: 'middle'
                  }}>{userInitial(l.userName)}</span>
                  <span style={{ verticalAlign: 'middle' }}>{l.userName}</span>
                </td>
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
            {logs.length === 0 && <tr><td colSpan="4" style={{ padding: '24px', color: 'var(--text2)', textAlign: 'center' }}>لا توجد نشاطات</td></tr>}
          </tbody>
        </table>
      </div>
      <Pagination page={page} totalPages={totalPages} total={total} pageSize={pageSize} onChange={setPage} />
    </div>
  )
}
