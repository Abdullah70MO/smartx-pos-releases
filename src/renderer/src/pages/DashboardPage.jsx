import { useState, useEffect } from 'preact/hooks'
import { useStore } from '../store'
import api from '../api'
import { formatDateTime } from '../utils/date'
import { formatMoney } from '../utils/money'

export default function DashboardPage() {
  const { user, license, goToReports, setPage } = useStore()
  const [summary, setSummary] = useState(null)
  const [time, setTime] = useState(new Date())

  useEffect(() => {
    const interval = setInterval(() => setTime(new Date()), 1000)
    return () => clearInterval(interval)
  }, [])

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
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '20px' }}>
        <div>
          <div style={{ fontSize: '18px', fontWeight: 'bold', marginBottom: '4px' }}>لوحة التحكم</div>
          <div style={{ fontSize: '12px', color: 'var(--text2)' }}>{formatDateTime(time)}</div>
        </div>
        <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
          {license?.remainingText && (
            <span style={{
              fontSize: '12px', fontWeight: '600', padding: '4px 12px', borderRadius: '6px',
              background: license.remainingDays !== null && license.remainingDays <= 7 ? 'rgba(239,68,68,0.15)' : 'rgba(16,185,129,0.15)',
              color: license.remainingDays !== null && license.remainingDays <= 7 ? 'var(--danger)' : 'var(--success)'
            }}>
              {license.remainingText}
            </span>
          )}
          <span style={{ fontSize: '13px', color: 'var(--text2)' }}>{user?.name}</span>
        </div>
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: '12px', marginBottom: '24px' }}>
        <StatCard label="مبيعات اليوم" value={summary ? formatMoney(summary.todaySales) : '...'} color="#3b82f6" onClick={() => { const d = new Date().toISOString().slice(0,10); goToReports('sales', d, d) }} />
        <StatCard label="فواتير اليوم" value={summary?.todayInvoices ?? '...'} color="#22c55e" />
        <StatCard label="ربح اليوم" value={summary ? formatMoney(summary.grossProfit) : '...'} color="#f59e0b" />
        <StatCard label="مصروفات اليوم" value={summary ? formatMoney(summary.expensesToday) : '...'} color="#ef4444" onClick={() => { const d = new Date().toISOString().slice(0,10); goToReports('expenses', d, d) }} />
        <StatCard label="المنتجات" value={summary?.totalProducts ?? '...'} color="#8b5cf6" onClick={() => setPage('products')} />
        <StatCard label="منخفضة" value={summary?.lowStock ?? '...'} color="#f97316" />
      </div>

      <div style={{ display: 'grid', gap: '16px', gridTemplateColumns: '1fr 1fr' }}>
        <div style={{ background: 'var(--bg2)', borderRadius: '12px', padding: '16px' }}>
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

        <div style={{ background: 'var(--bg2)', borderRadius: '12px', padding: '16px' }}>
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

      <div style={{ background: 'var(--bg2)', borderRadius: '12px', padding: '16px', marginTop: '16px' }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '8px' }}>
          <span style={{ color: '#f97316', fontWeight: 'bold', fontSize: '13px' }}>تنبيهات المخزون المنخفض</span>
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

function StatCard({ label, value, color, onClick }) {
  return (
    <div onClick={onClick} style={{ background: 'var(--bg2)', padding: '16px', borderRadius: '12px', borderRight: `3px solid ${color}`, cursor: onClick ? 'pointer' : 'default', transition: '0.15s' }}
      onMouseEnter={e => { if (onClick) e.currentTarget.style.background = 'var(--bg3)' }}
      onMouseLeave={e => { if (onClick) e.currentTarget.style.background = 'var(--bg2)' }}>
      <div style={{ fontSize: '11px', color: 'var(--text2)', marginBottom: '4px' }}>{label}</div>
      <div style={{ fontSize: '20px', fontWeight: 'bold', color: 'var(--text)' }}>{value}</div>
    </div>
  )
}
