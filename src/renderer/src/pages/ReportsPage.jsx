import { useState, useEffect } from 'preact/hooks'
import { useStore } from '../store'
import api from '../api'
import { formatDate } from '../utils/date'
import { formatMoney } from '../utils/money'

export default function ReportsPage() {
  const { reportTab, reportDateFrom, reportDateTo, clearReportNav } = useStore()
  useEffect(() => { clearReportNav() }, [])
  const [summary, setSummary] = useState(null)
  const [sales, setSales] = useState([])
  const [expenses, setExpenses] = useState([])
  const [returns, setReturns] = useState([])
  const [withdrawals, setWithdrawals] = useState([])
  const [customers, setCustomers] = useState([])
  const [suppliers, setSuppliers] = useState([])
  const [treasuries, setTreasuries] = useState([])
  const [tab, setTab] = useState(reportTab || 'overview')
  const [searchSales, setSearchSales] = useState({ q: '', dateFrom: reportDateFrom || '', dateTo: reportDateTo || '' })
  const [searchExpenses, setSearchExpenses] = useState({ q: '', dateFrom: reportDateFrom || '', dateTo: reportDateTo || '' })
  const [searchReturns, setSearchReturns] = useState({ q: '', dateFrom: '', dateTo: '' })
  const [searchWithdrawals, setSearchWithdrawals] = useState({ q: '', dateFrom: '', dateTo: '' })
  const [searchCustomers, setSearchCustomers] = useState('')
  const [searchSuppliers, setSearchSuppliers] = useState('')
  const [treasuryTxns, setTreasuryTxns] = useState([])
  const [searchTreasury, setSearchTreasury] = useState({ q: '', dateFrom: '', dateTo: '' })
  const [period, setPeriod] = useState('all')
  const [filterDateFrom, setFilterDateFrom] = useState('')
  const [filterDateTo, setFilterDateTo] = useState('')

  useEffect(() => {
    async function load() {
      const token = localStorage.getItem('token')
      try {
        const [s, salesData, expensesData, returnsData, txns, customersData, suppliersData, treasuriesData] = await Promise.all([
          api.dashboardSummary(token),
          api.listSales(token),
          api.listExpenses(token),
          api.listReturns(token),
          api.listTreasuryTransactions(token, '', 0),
          api.listCustomers(token),
          api.listSuppliers(token),
          api.listTreasuries(token)
        ])
        setSummary(s); setSales(salesData)
        setExpenses(expensesData); setReturns(returnsData)
        setWithdrawals((txns || []).filter(t => t.type === 'personal_withdraw'))
        setTreasuryTxns(txns || [])
        setCustomers(customersData || [])
        setSuppliers(suppliersData || [])
        setTreasuries(treasuriesData || [])
      } catch {}
    }
    load()
  }, [])

  function setPeriodFilter(p) {
    setPeriod(p)
    const now = new Date()
    let from = '', to = now.toISOString().slice(0, 10)
    if (p === 'today') from = to
    else if (p === 'month') { const d = new Date(now.getFullYear(), now.getMonth(), 1); from = d.toISOString().slice(0, 10) }
    else if (p === '3months') { const d = new Date(now); d.setMonth(d.getMonth() - 3); from = d.toISOString().slice(0, 10) }
    else if (p === '6months') { const d = new Date(now); d.setMonth(d.getMonth() - 6); from = d.toISOString().slice(0, 10) }
    else if (p === 'year') { const d = new Date(now.getFullYear(), 0, 1); from = d.toISOString().slice(0, 10) }
    else { from = ''; to = '' }
    setFilterDateFrom(from)
    setFilterDateTo(to)
  }

  function inRange(dateStr) {
    if (!filterDateFrom && !filterDateTo) return true
    const d = dateStr ? dateStr.slice(0, 10) : ''
    if (!d) return true
    if (filterDateFrom && d < filterDateFrom) return false
    if (filterDateTo && d > filterDateTo) return false
    return true
  }

  const filteredByDate = (arr, dateField) => arr.filter(x => inRange(x[dateField] || x.createdAt))

  const filteredSalesAll = filteredByDate(sales, 'createdAt')
  const filteredExpensesAll = filteredByDate(expenses, 'date')
  const filteredReturnsAll = filteredByDate(returns, 'createdAt')
  const filteredWithdrawalsAll = filteredByDate(withdrawals, 'createdAt')

  const totalSales = filteredSalesAll.reduce((sum, s) => sum + s.total, 0)
  const totalTax = filteredSalesAll.reduce((sum, s) => sum + (s.tax || 0), 0)
  const totalExpenses = filteredExpensesAll.reduce((sum, e) => sum + e.amount, 0)
  const totalReturns = filteredReturnsAll.reduce((sum, r) => sum + r.subtotal, 0)
  const totalWithdrawals = filteredWithdrawalsAll.reduce((sum, w) => sum + Math.abs(w.amount), 0)
  const totalCOGS = filteredSalesAll.reduce((sum, s) => sum + s.items.reduce((c, item) => c + (item.cost * item.quantity), 0), 0)
  const totalReturnCost = filteredReturnsAll.reduce((sum, r) => sum + (r.items || []).reduce((c, item) => c + (item.cost * item.quantity), 0), 0)
  const netProfit = (totalSales - totalTax - totalCOGS) + (totalReturnCost - totalReturns) - totalExpenses - totalWithdrawals
  const totalTreasuryBalance = treasuries.reduce((sum, t) => sum + (t.balance || 0), 0)

  const PERIODS = [
    { id: 'today', label: 'اليوم' },
    { id: 'month', label: 'هذا الشهر' },
    { id: '3months', label: 'آخر 3 شهور' },
    { id: '6months', label: 'آخر 6 شهور' },
    { id: 'year', label: 'السنة' },
    { id: 'all', label: 'الكل' }
  ]

  const filteredSales = sales.filter(s => {
    if (searchSales.q && !String(s.invoiceNo).includes(searchSales.q) && !s.customerName?.includes(searchSales.q) && !s.cashierName?.includes(searchSales.q)) return false
    if (searchSales.dateFrom && s.createdAt && s.createdAt.slice(0, 10) < searchSales.dateFrom) return false
    if (searchSales.dateTo && s.createdAt && s.createdAt.slice(0, 10) > searchSales.dateTo) return false
    return true
  })

  const filteredExpenses = expenses.filter(e => {
    const date = (e.date || e.createdAt || '')
    if (searchExpenses.q && !e.category?.includes(searchExpenses.q) && !e.note?.includes(searchExpenses.q)) return false
    if (searchExpenses.dateFrom && date && date.slice(0, 10) < searchExpenses.dateFrom) return false
    if (searchExpenses.dateTo && date && date.slice(0, 10) > searchExpenses.dateTo) return false
    return true
  })

  const filteredReturns = returns.filter(r => {
    if (searchReturns.q && !String(r.invoiceNo).includes(searchReturns.q) && !r.customerName?.includes(searchReturns.q)) return false
    if (searchReturns.dateFrom && r.createdAt && r.createdAt.slice(0, 10) < searchReturns.dateFrom) return false
    if (searchReturns.dateTo && r.createdAt && r.createdAt.slice(0, 10) > searchReturns.dateTo) return false
    return true
  })

  const filteredWithdrawals = withdrawals.filter(w => {
    if (searchWithdrawals.q && !w.personName?.includes(searchWithdrawals.q) && !w.note?.includes(searchWithdrawals.q)) return false
    if (searchWithdrawals.dateFrom && w.createdAt && w.createdAt.slice(0, 10) < searchWithdrawals.dateFrom) return false
    if (searchWithdrawals.dateTo && w.createdAt && w.createdAt.slice(0, 10) > searchWithdrawals.dateTo) return false
    return true
  })

  const filteredCustomers = customers.filter(c =>
    !searchCustomers || c.name?.includes(searchCustomers) || c.phone?.includes(searchCustomers)
  )

  const filteredSuppliers = suppliers.filter(s =>
    !searchSuppliers || s.name?.includes(searchSuppliers) || s.phone?.includes(searchSuppliers)
  )

  const filteredTreasury = treasuryTxns.filter(t => {
    if (searchTreasury.q && !(t.createdBy || '').includes(searchTreasury.q) && !(t.personName || '').includes(searchTreasury.q) && !(t.note || '').includes(searchTreasury.q)) return false
    if (searchTreasury.dateFrom && t.createdAt && t.createdAt.slice(0, 10) < searchTreasury.dateFrom) return false
    if (searchTreasury.dateTo && t.createdAt && t.createdAt.slice(0, 10) > searchTreasury.dateTo) return false
    return true
  })

  const TABS = [
    { id: 'overview', label: 'نظرة عامة' },
    { id: 'sales', label: 'المبيعات' },
    { id: 'expenses', label: 'المصروفات' },
    { id: 'withdrawals', label: 'المسحوبات الشخصية' },
    { id: 'returns', label: 'المرتجعات' },
    { id: 'customers', label: 'العملاء' },
    { id: 'suppliers', label: 'الموردين' },
    { id: 'treasury', label: 'الخزينة' }
  ]

  return (
    <div style={{ padding: '20px', overflow: 'auto', height: '100vh' }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '12px', flexWrap: 'wrap', gap: '8px' }}>
        <h1 style={{ fontSize: '20px' }}>التقارير</h1>
        <div style={{ display: 'flex', gap: '6px', flexWrap: 'wrap', alignItems: 'center' }}>
          {PERIODS.map(p => (
            <button key={p.id} onClick={() => setPeriodFilter(p.id)}
              style={{ padding: '4px 10px', borderRadius: '6px', fontSize: '11px', background: period === p.id ? 'var(--accent)' : 'var(--bg3)', color: period === p.id ? '#fff' : 'var(--text2)', fontWeight: period === p.id ? 'bold' : 'normal' }}>
              {p.label}
            </button>
          ))}
          <input type="date" value={filterDateFrom} onInput={e => { setFilterDateFrom(e.target.value); setPeriod('') }} style={{ width: '120px', fontSize: '11px' }} title="من تاريخ" />
          <input type="date" value={filterDateTo} onInput={e => { setFilterDateTo(e.target.value); setPeriod('') }} style={{ width: '120px', fontSize: '11px' }} title="إلى تاريخ" />
        </div>
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(170px, 1fr))', gap: '10px', marginBottom: '20px' }}>
        <SummaryCard label="إجمالي المبيعات" value={formatMoney(totalSales)} color="#22c55e" />
        <SummaryCard label="إجمالي المصروفات" value={formatMoney(totalExpenses)} color="#ef4444" />
        <SummaryCard label="المسحوبات الشخصية" value={formatMoney(totalWithdrawals)} color="#eab308" />
        <SummaryCard label="إجمالي المرتجعات" value={formatMoney(totalReturns)} color="#f59e0b" />
        <SummaryCard label="صافي الربح" value={formatMoney(netProfit)} color={netProfit >= 0 ? '#22c55e' : '#ef4444'} />
        <SummaryCard label="عدد الفواتير" value={filteredSalesAll.length} color="#3b82f6" />
        <SummaryCard label="عدد المنتجات" value={summary?.totalProducts || 0} color="#8b5cf6" />
        <SummaryCard label="رصيد الخزينة" value={formatMoney(totalTreasuryBalance)} color="#06b6d4" />
      </div>

      <div style={{ display: 'flex', gap: '4px', marginBottom: '16px', background: 'var(--bg2)', padding: '4px', borderRadius: '10px', width: 'fit-content' }}>
        {TABS.map(t => (
          <button key={t.id} onClick={() => setTab(t.id)}
            style={{ padding: '8px 16px', borderRadius: '8px', fontSize: '13px', background: tab === t.id ? 'var(--bg3)' : 'transparent', color: tab === t.id ? 'var(--text)' : 'var(--text2)', whiteSpace: 'nowrap' }}>
            {t.label}
          </button>
        ))}
      </div>

      {tab === 'overview' && (
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '16px' }}>
          <div style={{ background: 'var(--bg2)', borderRadius: '12px', padding: '16px' }}>
            <h3 style={{ fontSize: '13px', color: 'var(--text2)', marginBottom: '12px' }}>مبيعات اليوم</h3>
            <div style={{ fontSize: '28px', fontWeight: 'bold', color: 'var(--success)' }}>{formatMoney(summary?.todaySales)}</div>
            <div style={{ fontSize: '12px', color: 'var(--text2)' }}>عدد الفواتير: {summary?.todayInvoices}</div>
          </div>
          <div style={{ background: 'var(--bg2)', borderRadius: '12px', padding: '16px' }}>
            <h3 style={{ fontSize: '13px', color: 'var(--text2)', marginBottom: '12px' }}>الأكثر مبيعاً</h3>
            {summary?.topProducts?.length > 0 ? summary.topProducts.map((p, i) => (
              <div key={i} style={{ display: 'flex', justifyContent: 'space-between', fontSize: '13px', padding: '4px 0', borderBottom: '1px solid var(--bg3)' }}>
                <span>{p.name}</span><span style={{ color: 'var(--success)' }}>{formatMoney(p.revenue)}</span>
              </div>
            )) : <div style={{ color: '#475569', fontSize: '13px' }}>لا توجد بيانات</div>}
          </div>
        </div>
      )}

      {tab === 'sales' && (
        <div>
          <div style={{ display: 'flex', gap: '8px', marginBottom: '12px', flexWrap: 'wrap' }}>
            <input placeholder="بحث برقم الفاتورة أو العميل أو الكاشير..." value={searchSales.q}
              onInput={e => setSearchSales(s => ({ ...s, q: e.target.value }))}
              style={{ flex: 1, minWidth: '150px' }} />
            <input type="date" value={searchSales.dateFrom} onInput={e => setSearchSales(s => ({ ...s, dateFrom: e.target.value }))} style={{ width: '140px' }} />
            <input type="date" value={searchSales.dateTo} onInput={e => setSearchSales(s => ({ ...s, dateTo: e.target.value }))} style={{ width: '140px' }} />
          </div>
          <div style={{ background: 'var(--bg2)', borderRadius: '12px', overflow: 'auto' }}>
            <table>
              <thead><tr><th>#</th><th>التاريخ</th><th>العميل</th><th>الإجمالي</th><th>طريقة الدفع</th><th>الكاشير</th></tr></thead>
              <tbody>
                {filteredSales.map(s => (
                  <tr key={s._id}>
                    <td style={{ color: 'var(--accent)' }}>#{s.invoiceNo}</td>
                    <td style={{ fontSize: '12px', color: 'var(--text2)' }}>{formatDate(s.createdAt)}</td>
                    <td>{s.customerName || '-'}</td>
                    <td style={{ fontWeight: 'bold' }}>{formatMoney(s.total)}</td>
                    <td style={{ fontSize: '12px', color: 'var(--text2)' }}>{s.paymentMethod === 'card' ? 'بطاقة' : s.paymentMethod === 'credit' ? 'آجل' : 'نقداً'}</td>
                    <td style={{ fontSize: '12px', color: 'var(--text2)' }}>{s.cashierName}</td>
                  </tr>
                ))}
                {filteredSales.length === 0 && <tr><td colSpan="6" style={{ padding: '24px', color: '#475569', textAlign: 'center' }}>لا توجد مبيعات</td></tr>}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {tab === 'expenses' && (
        <div>
          <div style={{ display: 'flex', gap: '8px', marginBottom: '12px', flexWrap: 'wrap' }}>
            <input placeholder="بحث بالتصنيف أو البيان..." value={searchExpenses.q}
              onInput={e => setSearchExpenses(s => ({ ...s, q: e.target.value }))}
              style={{ flex: 1, minWidth: '150px' }} />
            <input type="date" value={searchExpenses.dateFrom} onInput={e => setSearchExpenses(s => ({ ...s, dateFrom: e.target.value }))} style={{ width: '140px' }} />
            <input type="date" value={searchExpenses.dateTo} onInput={e => setSearchExpenses(s => ({ ...s, dateTo: e.target.value }))} style={{ width: '140px' }} />
          </div>
          <div style={{ background: 'var(--bg2)', borderRadius: '12px', overflow: 'auto' }}>
            <table>
              <thead><tr><th>التاريخ</th><th>التصنيف</th><th>المبلغ</th><th>البيان</th></tr></thead>
              <tbody>
                {filteredExpenses.map(e => (
                  <tr key={e._id}>
                    <td style={{ fontSize: '12px', color: 'var(--text2)' }}>{formatDate(e.date || e.createdAt)}</td>
                    <td>{e.category || '-'}</td>
                    <td style={{ color: 'var(--danger)' }}>{formatMoney(e.amount)}</td>
                    <td style={{ fontSize: '12px', color: 'var(--text2)' }}>{e.note || '-'}</td>
                  </tr>
                ))}
                {filteredExpenses.length === 0 && <tr><td colSpan="4" style={{ padding: '24px', color: '#475569', textAlign: 'center' }}>لا توجد مصروفات</td></tr>}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {tab === 'withdrawals' && (
        <div>
          <div style={{ display: 'flex', gap: '8px', marginBottom: '12px', flexWrap: 'wrap' }}>
            <input placeholder="بحث باسم الشخص أو البيان..." value={searchWithdrawals.q}
              onInput={e => setSearchWithdrawals(s => ({ ...s, q: e.target.value }))}
              style={{ flex: 1, minWidth: '150px' }} />
            <input type="date" value={searchWithdrawals.dateFrom} onInput={e => setSearchWithdrawals(s => ({ ...s, dateFrom: e.target.value }))} style={{ width: '140px' }} />
            <input type="date" value={searchWithdrawals.dateTo} onInput={e => setSearchWithdrawals(s => ({ ...s, dateTo: e.target.value }))} style={{ width: '140px' }} />
          </div>
          <div style={{ background: 'var(--bg2)', borderRadius: '12px', overflow: 'auto' }}>
            <table>
              <thead><tr><th>التاريخ</th><th>اسم الشخص</th><th>المبلغ</th><th>البيان</th><th>الخزينة</th></tr></thead>
              <tbody>
                {filteredWithdrawals.map(w => (
                  <tr key={w._id}>
                    <td style={{ fontSize: '12px', color: 'var(--text2)' }}>{formatDate(w.createdAt)}</td>
                    <td style={{ fontWeight: 'bold' }}>{w.personName || '-'}</td>
                    <td style={{ color: '#eab308', fontWeight: 'bold' }}>{formatMoney(Math.abs(w.amount))}</td>
                    <td style={{ fontSize: '12px', color: 'var(--text2)' }}>{w.note || '-'}</td>
                    <td style={{ fontSize: '12px', color: 'var(--text2)' }}>{w.treasuryName}</td>
                  </tr>
                ))}
                {filteredWithdrawals.length === 0 && <tr><td colSpan="5" style={{ padding: '24px', color: '#475569', textAlign: 'center' }}>لا توجد مسحوبات شخصية</td></tr>}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {tab === 'customers' && (
        <div>
          <div style={{ display: 'flex', gap: '8px', marginBottom: '12px', flexWrap: 'wrap' }}>
            <input placeholder="بحث باسم العميل أو رقم الهاتف..." value={searchCustomers}
              onInput={e => setSearchCustomers(e.target.value)}
              style={{ flex: 1, minWidth: '150px' }} />
          </div>
          <div style={{ background: 'var(--bg2)', borderRadius: '12px', overflow: 'auto' }}>
            <table>
              <thead><tr><th>العميل</th><th>الهاتف</th><th>إجمالي المشتريات</th><th>المدفوع</th><th>المتبقي</th></tr></thead>
              <tbody>
                {filteredCustomers.map(c => {
                  const remaining = (c.totalDebt || 0) - (c.totalPaid || 0)
                  return (
                    <tr key={c._id}>
                      <td style={{ fontWeight: 'bold' }}>{c.name}</td>
                      <td style={{ fontSize: '12px', color: 'var(--text2)' }}>{c.phone || '-'}</td>
                      <td>{formatMoney(c.totalDebt || 0)}</td>
                      <td>{formatMoney(c.totalPaid || 0)}</td>
                      <td style={{ color: remaining > 0 ? 'var(--danger)' : 'var(--success)', fontWeight: 'bold' }}>{formatMoney(remaining)}</td>
                    </tr>
                  )
                })}
                {filteredCustomers.length === 0 && <tr><td colSpan="5" style={{ padding: '24px', color: '#475569', textAlign: 'center' }}>لا توجد بيانات عملاء</td></tr>}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {tab === 'suppliers' && (
        <div>
          <div style={{ display: 'flex', gap: '8px', marginBottom: '12px', flexWrap: 'wrap' }}>
            <input placeholder="بحث باسم المورد أو رقم الهاتف..." value={searchSuppliers}
              onInput={e => setSearchSuppliers(e.target.value)}
              style={{ flex: 1, minWidth: '150px' }} />
          </div>
          <div style={{ background: 'var(--bg2)', borderRadius: '12px', overflow: 'auto' }}>
            <table>
              <thead><tr><th>المورد</th><th>الهاتف</th><th>إجمالي المشتريات</th><th>المدفوع</th><th>المتبقي</th></tr></thead>
              <tbody>
                {filteredSuppliers.map(s => {
                  const remaining = (s.totalPurchases || 0) - (s.totalPaid || 0)
                  return (
                    <tr key={s._id}>
                      <td style={{ fontWeight: 'bold' }}>{s.name}</td>
                      <td style={{ fontSize: '12px', color: 'var(--text2)' }}>{s.phone || '-'}</td>
                      <td>{formatMoney(s.totalPurchases || 0)}</td>
                      <td>{formatMoney(s.totalPaid || 0)}</td>
                      <td style={{ color: remaining > 0 ? 'var(--danger)' : 'var(--success)', fontWeight: 'bold' }}>{formatMoney(remaining)}</td>
                    </tr>
                  )
                })}
                {filteredSuppliers.length === 0 && <tr><td colSpan="5" style={{ padding: '24px', color: '#475569', textAlign: 'center' }}>لا توجد بيانات موردين</td></tr>}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {tab === 'returns' && (
        <div>
          <div style={{ display: 'flex', gap: '8px', marginBottom: '12px', flexWrap: 'wrap' }}>
            <input placeholder="بحث برقم الفاتورة أو العميل..." value={searchReturns.q}
              onInput={e => setSearchReturns(s => ({ ...s, q: e.target.value }))}
              style={{ flex: 1, minWidth: '150px' }} />
            <input type="date" value={searchReturns.dateFrom} onInput={e => setSearchReturns(s => ({ ...s, dateFrom: e.target.value }))} style={{ width: '140px' }} />
            <input type="date" value={searchReturns.dateTo} onInput={e => setSearchReturns(s => ({ ...s, dateTo: e.target.value }))} style={{ width: '140px' }} />
          </div>
          <div style={{ background: 'var(--bg2)', borderRadius: '12px', overflow: 'auto' }}>
            <table>
              <thead><tr><th>الفاتورة</th><th>التاريخ</th><th>العميل</th><th>المبلغ</th><th>نوع الإرجاع</th></tr></thead>
              <tbody>
                {filteredReturns.map(r => (
                  <tr key={r._id}>
                    <td style={{ color: 'var(--accent)' }}>#{r.invoiceNo}</td>
                    <td style={{ fontSize: '12px', color: 'var(--text2)' }}>{formatDate(r.createdAt)}</td>
                    <td>{r.customerName || '-'}</td>
                    <td>{formatMoney(r.subtotal)}</td>
                    <td>{r.isFullReturn ? 'كامل' : 'جزئي'}</td>
                  </tr>
                ))}
                {filteredReturns.length === 0 && <tr><td colSpan="5" style={{ padding: '24px', color: '#475569', textAlign: 'center' }}>لا توجد مرتجعات</td></tr>}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {tab === 'treasury' && (
        <div>
          <div style={{ display: 'flex', gap: '8px', marginBottom: '12px', flexWrap: 'wrap' }}>
            <input placeholder="بحث باسم المستخدم أو البيان أو الشخص..." value={searchTreasury.q}
              onInput={e => setSearchTreasury(s => ({ ...s, q: e.target.value }))}
              style={{ flex: 1, minWidth: '150px' }} />
            <input type="date" value={searchTreasury.dateFrom} onInput={e => setSearchTreasury(s => ({ ...s, dateFrom: e.target.value }))} style={{ width: '140px' }} />
            <input type="date" value={searchTreasury.dateTo} onInput={e => setSearchTreasury(s => ({ ...s, dateTo: e.target.value }))} style={{ width: '140px' }} />
          </div>
          <div style={{ background: 'var(--bg2)', borderRadius: '12px', overflow: 'auto' }}>
            <table>
              <thead><tr><th>التاريخ</th><th>الخزينة</th><th>النوع</th><th>المبلغ</th><th>البيان</th><th>الشخص</th><th>بواسطة</th></tr></thead>
              <tbody>
                {filteredTreasury.map(t => (
                  <tr key={t._id}>
                    <td style={{ fontSize: '11px', color: 'var(--text2)' }}>{formatDate(t.createdAt)}</td>
                    <td style={{ fontSize: '12px' }}>{t.treasuryName}</td>
                    <td>
                      <span style={{
                        fontSize: '11px', padding: '2px 6px', borderRadius: '4px', fontWeight: '600',
                        background: t.type === 'deposit' || t.type === 'transfer_in' ? 'rgba(34,197,94,0.15)' :
                          t.type === 'personal_withdraw' ? 'rgba(234,179,8,0.15)' : 'rgba(239,68,68,0.15)',
                        color: t.type === 'deposit' || t.type === 'transfer_in' ? '#22c55e' :
                          t.type === 'personal_withdraw' ? '#eab308' : '#ef4444'
                      }}>
                        {t.type === 'deposit' ? 'إيداع' : t.type === 'withdraw' ? 'سحب' : t.type === 'personal_withdraw' ? 'سحب شخصي' : t.type === 'transfer_in' ? 'تحويل وارد' : t.type === 'transfer_out' ? 'تحويل صادر' : t.type}
                      </span>
                    </td>
                    <td style={{ fontWeight: 'bold', color: t.amount > 0 ? 'var(--success)' : 'var(--danger)' }}>{formatMoney(t.amount)}</td>
                    <td style={{ fontSize: '12px', color: 'var(--text2)' }}>{t.note || '-'}</td>
                    <td style={{ fontSize: '12px', color: 'var(--text2)' }}>{t.personName || '-'}</td>
                    <td style={{ fontSize: '12px', color: 'var(--text2)' }}>{t.createdBy || '-'}</td>
                  </tr>
                ))}
                {filteredTreasury.length === 0 && <tr><td colSpan="7" style={{ padding: '24px', color: '#475569', textAlign: 'center' }}>لا توجد حركات</td></tr>}
              </tbody>
            </table>
          </div>
        </div>
      )}
    </div>
  )
}

function SummaryCard({ label, value, color }) {
  return (
    <div style={{ background: 'var(--bg2)', padding: '14px', borderRadius: '10px', borderRight: `3px solid ${color}` }}>
      <div style={{ fontSize: '11px', color: 'var(--text2)', marginBottom: '4px' }}>{label}</div>
      <div style={{ fontSize: '18px', fontWeight: 'bold', color }}>{value}</div>
    </div>
  )
}