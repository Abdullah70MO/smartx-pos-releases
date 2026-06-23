import { useState, useEffect } from 'preact/hooks'
import { useStore } from '../store'
import api from '../api'
import { formatMoney } from '../utils/money'
import { formatDateTime } from '../utils/date'

export default function DashboardPage() {
  const { goToReports, setPage } = useStore()
  const [summary, setSummary] = useState(null)

  useEffect(() => {
    load()
  }, [])

  async function load() {
    try {
      const token = localStorage.getItem('token')
      const data = await api.dashboardSummary(token)
      setSummary(data)
    } catch {}
  }

  return (
    <div style={{ padding: '20px', overflow: 'auto', height: '100%' }}>
      <div style={{ fontSize: '18px', fontWeight: 'bold', marginBottom: '20px' }}>لوحة التحكم</div>

      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))', gap: '12px', marginBottom: '24px' }}>
        <StatCard icon={<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" width="18" height="18"><polyline points="23 6 13.5 15.5 8.5 10.5 1 18"/><polyline points="17 6 23 6 23 12"/></svg>} label="مبيعات اليوم" value={summary ? formatMoney(summary.todaySales) : '...'} color={'var(--accent)'} onClick={() => { const d = new Date().toISOString().slice(0,10); goToReports('sales', d, d) }} />
        <StatCard icon={<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" width="18" height="18"><path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"/><polyline points="14 2 14 8 20 8"/></svg>} label="فواتير اليوم" value={summary?.todayInvoices ?? '...'} color={'var(--success)'} />
        <StatCard icon={<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" width="18" height="18"><line x1="12" y1="1" x2="12" y2="23"/><path d="M17 5H9.5a3.5 3.5 0 0 0 0 7h5a3.5 3.5 0 0 1 0 7H6"/></svg>} label="ربح اليوم" value={summary ? formatMoney(summary.grossProfit) : '...'} color={'var(--warning)'} />
        <StatCard icon={<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" width="18" height="18"><polyline points="23 6 13.5 15.5 8.5 10.5 1 18"/><polyline points="17 6 23 6 23 12"/></svg>} label="مصروفات اليوم" value={summary ? formatMoney(summary.expensesToday) : '...'} color={'var(--danger)'} onClick={() => { const d = new Date().toISOString().slice(0,10); goToReports('expenses', d, d) }} />
        <StatCard icon={<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" width="18" height="18"><path d="M21 16V8a2 2 0 0 0-1-1.73l-7-4a2 2 0 0 0-2 0l-7 4A2 2 0 0 0 3 8v8a2 2 0 0 0 1 1.73l7 4a2 2 0 0 0 2 0l7-4A2 2 0 0 0 21 16z"/><polyline points="3.27 6.96 12 12.01 20.73 6.96"/><line x1="12" y1="22.08" x2="12" y2="12"/></svg>} label="المنتجات" value={summary?.totalProducts ?? '...'} color={'var(--secondary)'} onClick={() => setPage('products')} />
        <StatCard icon={<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" width="18" height="18"><circle cx="12" cy="12" r="10"/><line x1="12" y1="8" x2="12" y2="12"/><line x1="12" y1="16" x2="12.01" y2="16"/></svg>} label="منخفضة" value={summary?.lowStock ?? '...'} color={'var(--warning)'} />
      </div>

      <div style={{ display: 'grid', gap: '16px', gridTemplateColumns: '1fr 1fr' }}>
        <div className="card" style={{ padding: '16px' }}>
          <h3 style={{ fontSize: '13px', color: 'var(--text2)', marginBottom: '12px' }}>آخر المبيعات</h3>
          {summary?.recentSales?.length > 0 ? (
            <table>
              <thead>
                <tr>
                  <th>الفاتورة</th><th>المبلغ</th><th>الكاشير</th><th>الوقت</th>
                </tr>
              </thead>
              <tbody>
                {summary.recentSales.map(s => (
                  <tr key={s._id}>
                    <td>{s.invoiceNo}</td>
                    <td>{formatMoney(s.total)}</td>
                    <td style={{ color: 'var(--text2)' }}>{s.cashierName}</td>
                    <td style={{ fontSize: '11px', color: 'var(--text2)' }}>{formatDateTime(s.createdAt)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          ) : <div style={{ color: 'var(--text2)', fontSize: '13px' }}>لا توجد مبيعات اليوم</div>}
        </div>

        <div className="card" style={{ padding: '16px' }}>
          <h3 style={{ fontSize: '13px', color: 'var(--text2)', marginBottom: '12px' }}>الأكثر مبيعاً</h3>
          {summary?.topProducts?.length > 0 ? (
            <table>
              <thead><tr><th>المنتج</th><th>الكمية</th><th>الإيراد</th></tr></thead>
              <tbody>
                {summary.topProducts.map((p, i) => (
                  <tr key={i}>
                    <td>{p.name}</td>
                    <td>{p.quantity}</td>
                    <td>{formatMoney(p.revenue)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          ) : <div style={{ color: 'var(--text2)', fontSize: '13px' }}>لا توجد بيانات كافية</div>}
        </div>
      </div>

      <div className="card" style={{ padding: '16px', marginTop: '16px' }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '8px' }}>
          <span style={{ color: 'var(--warning)', fontWeight: 'bold', fontSize: '13px' }}>تنبيهات المخزون المنخفض</span>
          {summary?.lowStock > 0 && <span style={{ background: 'var(--danger)', color: '#fff', fontSize: '11px', padding: '2px 8px', borderRadius: '10px' }}>{summary.lowStock}</span>}
        </div>
        {summary?.lowStockProducts?.length > 0 ? (
          summary.lowStockProducts.map(p => (
            <div key={p._id} style={{ display: 'flex', justifyContent: 'space-between', fontSize: '12px', color: '#fdba74', padding: '4px 0', borderBottom: '1px solid var(--bg3)' }}>
              <span>{p.name}</span>
              <span>المتبقي: {p.stock} / الحد: {p.reorderPoint}</span>
            </div>
          ))
        ) : (
          <div style={{ color: 'var(--success)', fontSize: '12px' }}>جميع المنتجات متوفرة بكميات كافية</div>
        )}
      </div>
    </div>
  )
}

function StatCard({ icon, label, value, color, onClick }) {
  return (
    <div onClick={onClick} style={{ background: 'var(--bg2)', padding: '16px', borderRadius: '14px', border: '1px solid var(--outline)', cursor: onClick ? 'pointer' : 'default', transition: 'all 0.2s', boxShadow: 'var(--elevation-1)' }}
      onMouseEnter={e => { if (onClick) { e.currentTarget.style.boxShadow = 'var(--elevation-2)'; e.currentTarget.style.borderColor = color } }}
      onMouseLeave={e => { if (onClick) { e.currentTarget.style.boxShadow = 'var(--elevation-1)'; e.currentTarget.style.borderColor = 'var(--outline)' } }}>
      <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
        <div style={{ width: '40px', height: '40px', borderRadius: '10px', background: `${color}20`, display: 'flex', alignItems: 'center', justifyContent: 'center', color, flexShrink: 0 }}>
          {icon}
        </div>
        <div>
          <div style={{ fontSize: '11px', color: 'var(--text2)', marginBottom: '2px' }}>{label}</div>
          <div style={{ fontSize: '20px', fontWeight: 'bold', color: 'var(--text)' }}>{value}</div>
        </div>
      </div>
    </div>
  )
}
