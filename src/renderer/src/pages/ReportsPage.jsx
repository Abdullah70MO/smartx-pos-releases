import { useState, useEffect, useMemo } from 'preact/hooks'
import { useStore } from '../store'
import api from '../api'
import { formatDate } from '../utils/date'
import { formatMoney } from '../utils/money'
import { BackIcon, PrintIcon, DownloadIcon, PaymentIcon, WithdrawIcon, ReturnIcon, SalaryIcon, AdvanceIcon, DiscountIcon, HistoryIcon, ViewIcon, CheckIcon, AddIcon, BarcodeIcon, MoneyIcon, ShiftIcon, iconBtn } from '../components/ActionIcons'
import Pagination from '../components/Pagination'

const PERIODS = [
  { id: 'today', label: 'اليوم' },
  { id: 'week', label: 'هذا الأسبوع' },
  { id: 'month', label: 'هذا الشهر' },
  { id: 'year', label: 'السنة' },
  { id: 'all', label: 'الكل' }
]

function getPeriodRange(p) {
  const now = new Date()
  let from = '', to = now.toISOString().slice(0, 10)
  if (p === 'today') from = to
  else if (p === 'week') { const d = new Date(now); d.setDate(d.getDate() - d.getDay()); from = d.toISOString().slice(0, 10) }
  else if (p === 'month') { const d = new Date(now.getFullYear(), now.getMonth(), 1); from = d.toISOString().slice(0, 10) }
  else if (p === 'year') { const d = new Date(now.getFullYear(), 0, 1); from = d.toISOString().slice(0, 10) }
  else { from = ''; to = '' }
  return { dateFrom: from, dateTo: to }
}

export default function ReportsPage() {
  const { reportTab, reportDateFrom, reportDateTo, clearReportNav, user, settings } = useStore()
  useEffect(() => { clearReportNav() }, [])
  const [summary, setSummary] = useState(null)
  const [sales, setSales] = useState([])
  const [expenses, setExpenses] = useState([])
  const [returns, setReturns] = useState([])
  const [purchaseReturns, setPurchaseReturns] = useState([])
  const [withdrawals, setWithdrawals] = useState([])
  const [customers, setCustomers] = useState([])
  const [suppliers, setSuppliers] = useState([])
  const [treasuries, setTreasuries] = useState([])
  const [employees, setEmployees] = useState([])
  const [employeeAdvances, setEmployeeAdvances] = useState([])
  const [salaryPayments, setSalaryPayments] = useState([])
  const [searchSales, setSearchSales] = useState({ q: '', dateFrom: reportDateFrom || '', dateTo: reportDateTo || '' })
  const [searchExpenses, setSearchExpenses] = useState({ q: '', dateFrom: reportDateFrom || '', dateTo: reportDateTo || '' })
  const [searchReturns, setSearchReturns] = useState({ q: '', dateFrom: '', dateTo: '' })
  const [searchWithdrawals, setSearchWithdrawals] = useState({ q: '', dateFrom: '', dateTo: '' })
  const [searchCustomers, setSearchCustomers] = useState('')
  const [searchSuppliers, setSearchSuppliers] = useState('')
  const [treasuryTxns, setTreasuryTxns] = useState([])
  const [searchTreasury, setSearchTreasury] = useState({ q: '', dateFrom: '', dateTo: '' })
  const [period, setPeriod] = useState('all')
  const [salesPeriod, setSalesPeriod] = useState('')
  const [expensesPeriod, setExpensesPeriod] = useState('')
  const [returnsPeriod, setReturnsPeriod] = useState('')
  const [withdrawalsPeriod, setWithdrawalsPeriod] = useState('')
  const [treasuryPeriod, setTreasuryPeriod] = useState('')
  const [filterDateFrom, setFilterDateFrom] = useState('')
  const [filterDateTo, setFilterDateTo] = useState('')
  const [selectedReport, setSelectedReport] = useState(null)
  const [customerFilter, setCustomerFilter] = useState('all')
  const [supplierFilter, setSupplierFilter] = useState('all')
  const [returnFilter, setReturnFilter] = useState('all')
  const [treasuryFilter, setTreasuryFilter] = useState('')
  const [employeeFilter, setEmployeeFilter] = useState('')
  const [shiftsData, setShiftsData] = useState([])
  const [allShiftsData, setAllShiftsData] = useState([])
  const [shiftsPage, setShiftsPage] = useState(0)
  const [shiftsTotal, setShiftsTotal] = useState(0)
  const [shiftsFilter, setShiftsFilter] = useState({ q: '', dateFrom: '', dateTo: '' })

  const reportCards = [
    { id: 'overview', title: 'نظرة عامة', description: 'إجمالي المبيعات، المصروفات، الأرباح، إحصائيات عامة' },
    { id: 'sales', title: 'المبيعات', description: 'قائمة فواتير المبيعات' },
    { id: 'expenses', title: 'المصروفات', description: 'قائمة المصروفات' },
    { id: 'withdrawals', title: 'المسحوبات الشخصية', description: 'قائمة المسحوبات الشخصية' },
    { id: 'returns', title: 'المرتجعات', description: 'مرتجعات البيع والشراء' },
    { id: 'inventory', title: 'المخزون', description: 'تكلفة المخزون وتفاصيل الكميات' },
    { id: 'customers', title: 'العملاء', description: 'أرصدة وديون العملاء' },
    { id: 'suppliers', title: 'الموردين', description: 'أرصدة وديون الموردين' },
    { id: 'treasury', title: 'الخزينة', description: 'حركات الخزينة' },
    { id: 'employees', title: 'الموظفين', description: 'السلف والخصومات وإحصائيات الموظفين' },
    { id: 'shifts', title: 'الورديات', description: 'تقارير الورديات وإغلاق الكاشير' }
  ]

  const reportColors = { overview: 'var(--accent)', sales: 'var(--success)', expenses: 'var(--danger)', withdrawals: 'var(--warning)', returns: 'var(--warning)', inventory: 'var(--secondary)', customers: 'var(--special)', suppliers: 'var(--teal)', treasury: 'var(--accent)', employees: '#8B5CF6', shifts: '#6366F1' }
  const reportIcons = {
    overview: <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" width="24" height="24"><path d="M18 20V10"/><path d="M12 20V4"/><path d="M6 20v-6"/></svg>,
    sales: <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" width="24" height="24"><path d="M6 2L3 6v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2V6l-3-4z"/><line x1="3" y1="6" x2="21" y2="6"/><path d="M16 10a4 4 0 0 1-8 0"/></svg>,
    expenses: <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" width="24" height="24"><polyline points="23 6 13.5 15.5 8.5 10.5 1 18"/><polyline points="17 6 23 6 23 12"/></svg>,
    withdrawals: <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" width="24" height="24"><circle cx="12" cy="12" r="10"/><polyline points="12 6 12 12 16 14"/></svg>,
    returns: <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" width="24" height="24"><polyline points="1 4 1 10 7 10"/><path d="M3.51 15a9 9 0 1 0 2.13-9.36L1 10"/></svg>,
    inventory: <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" width="24" height="24"><path d="M21 16V8a2 2 0 0 0-1-1.73l-7-4a2 2 0 0 0-2 0l-7 4A2 2 0 0 0 3 8v8a2 2 0 0 0 1 1.73l7 4a2 2 0 0 0 2 0l7-4A2 2 0 0 0 21 16z"/><polyline points="3.27 6.96 12 12.01 20.73 6.96"/><line x1="12" y1="22.08" x2="12" y2="12"/></svg>,
    customers: <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" width="24" height="24"><path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2"/><circle cx="9" cy="7" r="4"/><path d="M23 21v-2a4 4 0 0 0-3-3.87"/><path d="M16 3.13a4 4 0 0 1 0 7.75"/></svg>,
    suppliers: <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" width="24" height="24"><rect x="1" y="3" width="15" height="13"/><polygon points="16 8 20 8 23 11 23 16 16 16 16 8"/><circle cx="5.5" cy="18.5" r="2.5"/><circle cx="18.5" cy="18.5" r="2.5"/></svg>,
    treasury: <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" width="24" height="24"><rect x="2" y="4" width="20" height="16" rx="2"/><line x1="12" y1="4" x2="12" y2="20"/><path d="M2 8h20"/></svg>,
    employees: <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" width="24" height="24"><rect x="2" y="7" width="20" height="14" rx="2" ry="2"/><path d="M16 21V5a2 2 0 0 0-2-2h-4a2 2 0 0 0-2 2v16"/></svg>,
    shifts: <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" width="24" height="24"><circle cx="12" cy="12" r="10"/><polyline points="12 6 12 12 16 14"/><path d="M12 6v6l4 2"/></svg>
  }

  useEffect(() => {
    async function load() {
      const token = localStorage.getItem('token')
      try {
        const [s, salesData, expensesData, returnsData, txns, customersData, suppliersData, treasuriesData, pReturnsData] = await Promise.all([
          api.dashboardSummary(token),
          api.listSales(token),
          api.listExpenses(token),
          api.listReturns(token),
          api.listTreasuryTransactions(token, '', 0),
          api.listCustomers(token),
          api.listSuppliers(token),
          api.listTreasuries(token),
          api.listPurchaseReturns(token).catch(() => [])
        ])
        setSummary(s); setSales(salesData)
        setExpenses(expensesData); setReturns(returnsData)
        setPurchaseReturns(pReturnsData || [])
        setWithdrawals((txns || []).filter(t => t.type === 'personal_withdraw'))
        setTreasuryTxns(txns || [])
        setCustomers(customersData || [])
        setSuppliers(suppliersData || [])
        setTreasuries(treasuriesData || [])
        const [emps, advs, salaryPmts] = await Promise.all([
          api.listEmployees(token),
          api.listEmployeeAdvances(token, '').catch(() => []),
          api.listEmployeeSalaryPayments(token, '').catch(() => [])
        ])
        setEmployees(emps || [])
        setEmployeeAdvances(advs || [])
        setSalaryPayments(salaryPmts || [])
      } catch {}
    }
    load()
  }, [])

  useEffect(() => {
    if (selectedReport === 'shifts') {
      loadShifts(shiftsPage, shiftsFilter)
      loadAllShifts(shiftsFilter).then(all => setAllShiftsData(all))
    }
  }, [selectedReport, shiftsFilter, shiftsPage])

  function setPeriodFilter(p) {
    setPeriod(p)
    const range = getPeriodRange(p)
    setFilterDateFrom(range.dateFrom)
    setFilterDateTo(range.dateTo)
  }

  function inRange(dateStr) {
    if (!filterDateFrom && !filterDateTo) return true
    const d = dateStr ? dateStr.slice(0, 10) : ''
    if (!d) return true
    if (filterDateFrom && d < filterDateFrom) return false
    if (filterDateTo && d > filterDateTo) return false
    return true
  }

  async function loadShifts(page = 0, filter = {}) {
    const token = localStorage.getItem('token')
    const f = { ...shiftsFilter, ...filter }
    const result = await api.listShifts(token, f, page, 20)
    setShiftsData(result.data || [])
    setShiftsTotal(result.total || 0)
  }

  async function loadAllShifts(filter = {}) {
    const token = localStorage.getItem('token')
    const f = { ...shiftsFilter, ...filter }
    const result = await api.listShifts(token, f, 0, 1000)
    return result.data || []
  }

  async function handlePrintShiftReport(shift) {
    const { printA4, printThermal } = await import('../utils/print')
    const { formatMoney } = await import('../utils/money')
    const formatDT = (d) => d ? new Date(d).toLocaleString('en-GB', { day: '2-digit', month: '2-digit', year: 'numeric', hour: '2-digit', minute: '2-digit', hour12: false }) : ''
    const shiftData = {
      cashierName: shift.cashierName || '',
      startedAt: shift.startedAt ? formatDT(shift.startedAt) : '',
      endedAt: shift.endedAt ? formatDT(shift.endedAt) : 'نشطة',
      startingBalance: formatMoney(shift.startingBalance || 0),
      cashTotal: formatMoney(shift.cashTotal || 0),
      cardTotal: formatMoney(shift.cardTotal || 0),
      creditTotal: formatMoney(shift.creditPaidTotal || 0),
      expensesTotal: formatMoney(shift.expensesTotal || 0),
      withdrawalsTotal: formatMoney(shift.withdrawalsTotal || 0),
      cardWithdrawalsTotal: formatMoney(shift.cardWithdrawalsTotal || 0),
      returnsTotal: formatMoney(0),
      invoiceCount: shift.invoiceCount || 0,
      expectedCash: formatMoney((shift.startingBalance || 0) + (shift.cashTotal || 0) + (shift.creditPaidTotal || 0) - (shift.expensesTotal || 0) - (shift.withdrawalsTotal || 0)),
      actualCash: formatMoney(shift.endingBalance || 0),
      cashDiff: formatMoney((shift.endingBalance || 0) - ((shift.startingBalance || 0) + (shift.cashTotal || 0) + (shift.creditPaidTotal || 0) - (shift.expensesTotal || 0) - (shift.withdrawalsTotal || 0))),
      cashDiffLabel: Math.abs((shift.endingBalance || 0) - ((shift.startingBalance || 0) + (shift.cashTotal || 0) + (shift.creditPaidTotal || 0) - (shift.expensesTotal || 0) - (shift.withdrawalsTotal || 0))) < 0.005 ? 'مطابق' : ((shift.endingBalance || 0) - ((shift.startingBalance || 0) + (shift.cashTotal || 0) + (shift.creditPaidTotal || 0) - (shift.expensesTotal || 0) - (shift.withdrawalsTotal || 0))) < 0 ? 'عجز' : 'زيادة',
      expectedCard: formatMoney((shift.cardTotal || 0) - (shift.cardWithdrawalsTotal || 0)),
      actualCard: formatMoney(shift.cardEndingBalance || 0),
      cardDiff: formatMoney((shift.cardEndingBalance || 0) - ((shift.cardTotal || 0) - (shift.cardWithdrawalsTotal || 0))),
      cardDiffLabel: Math.abs((shift.cardEndingBalance || 0) - ((shift.cardTotal || 0) - (shift.cardWithdrawalsTotal || 0))) < 0.005 ? 'مطابق' : ((shift.cardEndingBalance || 0) - ((shift.cardTotal || 0) - (shift.cardWithdrawalsTotal || 0))) < 0 ? 'عجز' : 'زيادة',
    }
    if (settings?.printDefaultSize === 'a4') {
      const { default: PrintTemplateShift } = await import('../components/PrintTemplateShift')
      const element = (
        <PrintTemplateShift
          data={shiftData}
          businessName={user?.businessName || 'SMART X POS'}
          businessPhone={user?.businessPhone || ''}
          businessAddress={user?.businessAddress || ''}
          logoDataUrl={settings?.logoDataUrl}
          showLogo={settings?.showLogo}
        />
      )
      await printA4(element)
    } else {
      const { default: PrintTemplateShiftThermal } = await import('../components/PrintTemplateShiftThermal')
      const element = (
        <PrintTemplateShiftThermal
          data={shiftData}
          businessName={user?.businessName || 'SMART X POS'}
          businessPhone={user?.businessPhone || ''}
          businessAddress={user?.businessAddress || ''}
          logoDataUrl={settings?.logoDataUrl}
          showLogo={settings?.showLogo}
          paperWidth={Number((localStorage.getItem('thermalPaperSize') || '80mm') === 'custom' ? (localStorage.getItem('customPaperWidth') || '80') : (localStorage.getItem('thermalPaperSize') || '80mm').replace('mm', ''))}
        />
      )
      await printThermal(element)
    }
  }

  const filteredByDate = (arr, dateField) => arr.filter(x => inRange(x[dateField] || x.createdAt))

  const overviewData = useMemo(() => {
    const fsa = filteredByDate(sales, 'createdAt')
    const fea = filteredByDate(expenses, 'date')
    const fra = filteredByDate(returns, 'createdAt')
    const fwa = filteredByDate(withdrawals, 'createdAt')
    const ts = fsa.reduce((sum, s) => sum + s.total, 0)
    const tt = fsa.reduce((sum, s) => sum + (s.tax || 0), 0)
    const te = fea.reduce((sum, e) => sum + e.amount, 0)
    const tr = fra.reduce((sum, r) => sum + r.subtotal, 0)
    const tpr = purchaseReturns.filter(r => inRange(r.createdAt)).reduce((sum, r) => sum + r.subtotal, 0)
    const tw = fwa.reduce((sum, w) => sum + Math.abs(w.amount), 0)
    const tcogs = fsa.reduce((sum, s) => sum + s.items.reduce((c, item) => c + (item.cost * item.quantity), 0), 0)
    const trc = fra.reduce((sum, r) => sum + (r.items || []).reduce((c, item) => c + (item.cost * item.quantity), 0), 0)
    const expensesByCat = fea.reduce((map, e) => {
      map[e.category] = (map[e.category] || 0) + e.amount
      return map
    }, {})
    return {
      totalSales: ts, totalTax: tt, totalExpenses: te, totalReturns: tr,
      totalPurchaseReturns: tpr, totalWithdrawals: tw,
      totalCOGS: tcogs, totalReturnCost: trc,
      netProfit: (ts - tt - tcogs) + (trc - tr) - te - tw,
      filteredSalesAll: fsa, totalInvoiceCount: fsa.length,
      expensesByCat
    }
  }, [sales, expenses, returns, withdrawals, purchaseReturns, filterDateFrom, filterDateTo])

  const { totalSales, totalTax, totalExpenses, totalReturns, totalPurchaseReturns, totalWithdrawals, totalCOGS, totalReturnCost, netProfit, totalInvoiceCount, expensesByCat } = overviewData

  const totalTreasuryBalance = useMemo(() => treasuries.reduce((sum, t) => sum + (t.balance || 0), 0), [treasuries])
  const mainBalance = useMemo(() => treasuries.filter(t => t.type === 'main').reduce((sum, t) => sum + (t.balance || 0), 0), [treasuries])
  const bankBalance = useMemo(() => treasuries.filter(t => t.type === 'bank').reduce((sum, t) => sum + (t.balance || 0), 0), [treasuries])

  const filteredSales = useMemo(() => sales.filter(s => {
    if (searchSales.q && !String(s.invoiceNo).includes(searchSales.q) && !s.customerName?.includes(searchSales.q) && !s.cashierName?.includes(searchSales.q)) return false
    if (searchSales.dateFrom && s.createdAt && s.createdAt.slice(0, 10) < searchSales.dateFrom) return false
    if (searchSales.dateTo && s.createdAt && s.createdAt.slice(0, 10) > searchSales.dateTo) return false
    return true
  }), [sales, searchSales])

  const filteredExpenses = useMemo(() => expenses.filter(e => {
    const date = (e.date || e.createdAt || '')
    if (searchExpenses.q && !e.category?.includes(searchExpenses.q) && !e.note?.includes(searchExpenses.q)) return false
    if (searchExpenses.dateFrom && date && date.slice(0, 10) < searchExpenses.dateFrom) return false
    if (searchExpenses.dateTo && date && date.slice(0, 10) > searchExpenses.dateTo) return false
    return true
  }), [expenses, searchExpenses])

  const filteredReturns = useMemo(() => returns.filter(r => {
    if (searchReturns.q && !String(r.invoiceNo).includes(searchReturns.q) && !r.customerName?.includes(searchReturns.q)) return false
    if (searchReturns.dateFrom && r.createdAt && r.createdAt.slice(0, 10) < searchReturns.dateFrom) return false
    if (searchReturns.dateTo && r.createdAt && r.createdAt.slice(0, 10) > searchReturns.dateTo) return false
    return true
  }), [returns, searchReturns])

  const filteredPurchaseReturns = useMemo(() => purchaseReturns.filter(r => {
    if (searchReturns.q && !String(r.invoiceNo).includes(searchReturns.q) && !r.supplierName?.includes(searchReturns.q)) return false
    if (searchReturns.dateFrom && r.createdAt && r.createdAt.slice(0, 10) < searchReturns.dateFrom) return false
    if (searchReturns.dateTo && r.createdAt && r.createdAt.slice(0, 10) > searchReturns.dateTo) return false
    return true
  }), [purchaseReturns, searchReturns])

  const filteredWithdrawals = useMemo(() => withdrawals.filter(w => {
    if (searchWithdrawals.q && !w.personName?.includes(searchWithdrawals.q) && !w.note?.includes(searchWithdrawals.q)) return false
    if (searchWithdrawals.dateFrom && w.createdAt && w.createdAt.slice(0, 10) < searchWithdrawals.dateFrom) return false
    if (searchWithdrawals.dateTo && w.createdAt && w.createdAt.slice(0, 10) > searchWithdrawals.dateTo) return false
    return true
  }), [withdrawals, searchWithdrawals])

  const filteredCustomers = useMemo(() => customers, [customers])

  const filteredSuppliers = useMemo(() => suppliers, [suppliers])

  const filteredTreasury = useMemo(() => treasuryTxns.filter(t => {
    if (searchTreasury.q && !(t.createdBy || '').includes(searchTreasury.q) && !(t.personName || '').includes(searchTreasury.q) && !(t.note || '').includes(searchTreasury.q)) return false
    if (searchTreasury.dateFrom && t.createdAt && t.createdAt.slice(0, 10) < searchTreasury.dateFrom) return false
    if (searchTreasury.dateTo && t.createdAt && t.createdAt.slice(0, 10) > searchTreasury.dateTo) return false
    return true
  }), [treasuryTxns, searchTreasury])

  const [batchSearch, setBatchSearch] = useState('')
  const [batchData, setBatchData] = useState([])

  useEffect(() => {
    async function loadBatchReport() {
      try {
        const token = localStorage.getItem('token')
        const data = await api.getInventoryBatchReport(token, batchSearch || undefined)
        setBatchData(data || [])
      } catch {}
    }
    loadBatchReport()
  }, [batchSearch])

  const batchTotalValue = useMemo(() => batchData.reduce((s, p) => s + p.batches.reduce((ss, b) => ss + b.total, 0), 0), [batchData])

  const currentCard = reportCards.find(c => c.id === selectedReport)

  function PeriodPresets({ current, onChange, dateFrom, dateTo, onDateFrom, onDateTo }) {
    return (
      <div style={{ display: 'flex', gap: '6px', flexWrap: 'wrap', alignItems: 'center' }}>
        {PERIODS.map(p => (
          <button key={p.id} onClick={() => {
            const range = getPeriodRange(p.id)
            onChange(p.id); onDateFrom(range.dateFrom); onDateTo(range.dateTo)
          }}
            style={{ padding: '4px 10px', borderRadius: '6px', fontSize: '11px', background: current === p.id ? 'var(--accent)' : 'var(--bg3)', color: current === p.id ? '#fff' : 'var(--text2)', fontWeight: current === p.id ? 'bold' : 'normal', cursor: 'pointer', border: 'none' }}>
            {p.label}
          </button>
        ))}
        <input type="date" value={dateFrom} onInput={e => { onChange(''); onDateFrom(e.target.value) }} style={{ width: '120px', fontSize: '11px' }} title="من تاريخ" />
        <input type="date" value={dateTo} onInput={e => { onChange(''); onDateTo(e.target.value) }} style={{ width: '120px', fontSize: '11px' }} title="إلى تاريخ" />
      </div>
    )
  }

  return (
    <div style={{ padding: '20px', overflow: 'auto', height: '100%' }}>
      <div style={{ display: 'flex', alignItems: 'center', gap: '10px', marginBottom: '16px' }}>
        {selectedReport && (
          <button type="button" onClick={() => setSelectedReport(null)} style={{
            background: 'var(--bg3)', color: 'var(--text)', padding: '8px 14px', borderRadius: '10px', fontSize: '14px', fontWeight: '700',
            display: 'flex', alignItems: 'center', gap: '6px', cursor: 'pointer', border: 'none'
          }}>
            <BackIcon size={16} /> رجوع
          </button>
        )}
        <h1 style={{ fontSize: '20px' }}>
          {selectedReport && currentCard ? currentCard.title : 'التقارير'}
        </h1>
      </div>

      {/* Cards view */}
      {!selectedReport && (
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(240px, 1fr))', gap: '16px' }}>
          {reportCards.map(card => (
            <div key={card.id} onClick={() => setSelectedReport(card.id)}
              style={{
                background: 'var(--bg2)', borderRadius: '16px', padding: '24px',
                border: '1px solid var(--outline)', cursor: 'pointer',
                transition: 'all 0.25s cubic-bezier(0.4, 0, 0.2, 1)',
                boxShadow: 'var(--elevation-1)',
              }}
              onMouseEnter={e => { e.currentTarget.style.boxShadow = 'var(--elevation-2)'; e.currentTarget.style.borderColor = 'var(--accent)' }}
              onMouseLeave={e => { e.currentTarget.style.boxShadow = 'var(--elevation-1)'; e.currentTarget.style.borderColor = 'var(--outline)' }}
              role="button" tabIndex={0}
              onKeyDown={e => { if (e.key === 'Enter') setSelectedReport(card.id) }}
            >
              <div style={{
                width: '48px', height: '48px', borderRadius: '14px',
                background: reportColors[card.id],
                display: 'flex', alignItems: 'center', justifyContent: 'center',
                color: '#fff', fontWeight: '700', fontSize: '22px', marginBottom: '14px'
              }}>
                {reportIcons[card.id]}
              </div>
              <div style={{ fontSize: '15px', fontWeight: '700', color: 'var(--text)', marginBottom: '8px' }}>
                {card.title}
              </div>
              <div style={{ fontSize: '12px', color: 'var(--text2)', lineHeight: 1.6 }}>
                {card.description}
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Overview section */}
      {selectedReport === 'overview' && (
        <>
          <div style={{ marginBottom: '16px' }}>
            <PeriodPresets current={period} onChange={setPeriodFilter} dateFrom={filterDateFrom} dateTo={filterDateTo} onDateFrom={setFilterDateFrom} onDateTo={setFilterDateTo} />
          </div>

          {/* Summary cards - grouped */}
          <div style={{ display: 'flex', flexDirection: 'column', gap: '16px', marginBottom: '20px' }}>
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: '10px' }}>
              <OverviewCard icon={<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" width="18" height="18"><line x1="12" y1="1" x2="12" y2="23"/><path d="M17 5H9.5a3.5 3.5 0 0 0 0 7h5a3.5 3.5 0 0 1 0 7H6"/></svg>} label="صافي الربح" value={formatMoney(netProfit)} color={netProfit >= 0 ? 'var(--success)' : 'var(--danger)'} />
              <OverviewCard icon={<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" width="18" height="18"><polyline points="23 6 13.5 15.5 8.5 10.5 1 18"/><polyline points="17 6 23 6 23 12"/></svg>} label="إجمالي المبيعات" value={formatMoney(totalSales)} color="var(--success)" />
              <OverviewCard icon={<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" width="18" height="18"><path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"/><polyline points="14 2 14 8 20 8"/></svg>} label="عدد الفواتير" value={totalInvoiceCount} color="var(--accent)" />
              <OverviewCard icon={<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" width="18" height="18"><polyline points="23 6 13.5 15.5 8.5 10.5 1 18"/><polyline points="17 6 23 6 23 12"/></svg>} label="إجمالي المصروفات" value={formatMoney(totalExpenses)} color="var(--danger)" />
              <OverviewCard icon={<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" width="18" height="18"><circle cx="12" cy="12" r="10"/><polyline points="12 6 12 12 16 14"/></svg>} label="المسحوبات الشخصية" value={formatMoney(totalWithdrawals)} color="var(--warning)" />
            </div>
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: '10px' }}>
              <OverviewCard icon={<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" width="18" height="18"><polyline points="1 4 1 10 7 10"/><path d="M3.51 15a9 9 0 1 0 2.13-9.36L1 10"/></svg>} label="إجمالي مرتجعات البيع" value={formatMoney(totalReturns)} color="var(--warning)" />
              <OverviewCard icon={<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" width="18" height="18"><polyline points="1 4 1 10 7 10"/><path d="M3.51 15a9 9 0 1 0 2.13-9.36L1 10"/><line x1="23" y1="20" x2="17" y2="20"/></svg>} label="إجمالي مرتجعات الشراء" value={formatMoney(totalPurchaseReturns)} color="var(--warning)" />
              <OverviewCard icon={<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" width="18" height="18"><path d="M21 16V8a2 2 0 0 0-1-1.73l-7-4a2 2 0 0 0-2 0l-7 4A2 2 0 0 0 3 8v8a2 2 0 0 0 1 1.73l7 4a2 2 0 0 0 2 0l7-4A2 2 0 0 0 21 16z"/><polyline points="3.27 6.96 12 12.01 20.73 6.96"/><line x1="12" y1="22.08" x2="12" y2="12"/></svg>} label="إجمالي تكلفة المخزون" value={formatMoney(summary?.totalInventoryValue || 0)} color="var(--secondary)" />
              <OverviewCard icon={<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" width="18" height="18"><path d="M21 16V8a2 2 0 0 0-1-1.73l-7-4a2 2 0 0 0-2 0l-7 4A2 2 0 0 0 3 8v8a2 2 0 0 0 1 1.73l7 4a2 2 0 0 0 2 0l7-4A2 2 0 0 0 21 16z"/></svg>} label="عدد المنتجات" value={summary?.totalProducts || 0} color="var(--secondary)" />
              <OverviewCard icon={<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" width="18" height="18"><rect x="2" y="4" width="20" height="16" rx="2"/><line x1="12" y1="4" x2="12" y2="20"/><path d="M2 8h20"/></svg>} label="اجمالى رصيد الخزائن" value={formatMoney(totalTreasuryBalance)} color="var(--special)" />
              <OverviewCard icon={<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" width="18" height="18"><rect x="2" y="4" width="20" height="16" rx="2"/><line x1="12" y1="4" x2="12" y2="20"/></svg>} label="رصيد الخزينة الرئيسية" value={formatMoney(mainBalance)} color="var(--teal)" />
              <OverviewCard icon={<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" width="18" height="18"><rect x="2" y="4" width="20" height="16" rx="2"/><line x1="2" y1="12" x2="22" y2="12"/></svg>} label="رصيد البنك" value={formatMoney(bankBalance)} color="var(--accent)" />
            </div>
          </div>

          {/* Profit breakdown detail */}
          <div className="card" style={{ padding: '20px', marginBottom: '16px' }}>
            <h3 style={{ fontSize: '13px', color: 'var(--text2)', marginBottom: '16px', display: 'flex', alignItems: 'center', gap: '8px' }}>
              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" style={{ width: '16px', height: '16px' }}><line x1="12" y1="1" x2="12" y2="23"/><path d="M17 5H9.5a3.5 3.5 0 0 0 0 7h5a3.5 3.5 0 0 1 0 7H6"/></svg>
              تفاصيل صافي الربح
            </h3>
            <div style={{ display: 'flex', flexDirection: 'column', gap: '6px', fontSize: '13px' }}>
              <ProfitRow label="إجمالي المبيعات" value={totalSales} color="var(--success)" />
              <ProfitRow label="الضريبة" value={-totalTax} color="var(--danger)" indent />
              <ProfitRow label="تكلفة البضاعة (COGS)" value={-totalCOGS} color="var(--danger)" indent />
              <ProfitRow label="ربح إجمالي" value={totalSales - totalTax - totalCOGS} color="var(--accent)" bold total />
              <div style={{ borderTop: '1px dashed var(--bg3)', margin: '4px 0' }} />
              <ProfitRow label="مرتجعات البيع" value={-totalReturns} color="var(--warning)" indent />
              <ProfitRow label="تكلفة المرتجعات المستردة" value={totalReturnCost} color="var(--success)" indent />
              <ProfitRow label="صافي المرتجعات" value={totalReturnCost - totalReturns} color="var(--warning)" bold />
              <div style={{ borderTop: '1px dashed var(--bg3)', margin: '4px 0' }} />
              <ProfitRow label="المصروفات" value={-totalExpenses} color="var(--danger)" indent />
              {Object.entries(expensesByCat).sort((a, b) => b[1] - a[1]).map(([cat, amt]) => (
                <ProfitRow key={cat} label={`  • ${cat}`} value={-amt} color={cat === 'فروقات الجرد' ? '#f97316' : 'var(--text2)'} indent2 />
              ))}
              <ProfitRow label="المسحوبات الشخصية" value={-totalWithdrawals} color="var(--warning)" indent />
              <div style={{ borderTop: '2px solid var(--accent)', margin: '8px 0 4px' }} />
              <ProfitRow label="صافي الربح" value={netProfit} color={netProfit >= 0 ? 'var(--success)' : 'var(--danger)'} bold total large />
            </div>
          </div>

          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '16px' }}>
            <div className="card" style={{ padding: '16px' }}>
              <h3 style={{ fontSize: '13px', color: 'var(--text2)', marginBottom: '12px' }}>مبيعات اليوم</h3>
              <div style={{ fontSize: '28px', fontWeight: 'bold', color: 'var(--success)' }}>{formatMoney(summary?.todaySales)}</div>
              <div style={{ fontSize: '12px', color: 'var(--text2)' }}>عدد الفواتير: {summary?.todayInvoices}</div>
            </div>
            <div className="card" style={{ padding: '16px' }}>
              <h3 style={{ fontSize: '13px', color: 'var(--text2)', marginBottom: '12px' }}>الأكثر مبيعاً</h3>
              {summary?.topProducts?.length > 0 ? summary.topProducts.map((p, i) => (
                <div key={i} style={{ display: 'flex', justifyContent: 'space-between', fontSize: '13px', padding: '4px 0', borderBottom: '1px solid var(--bg3)' }}>
                  <span>{p.name}</span><span style={{ color: 'var(--success)' }}>{formatMoney(p.revenue)}</span>
                </div>
              )) : <div style={{ color: 'var(--text2)', fontSize: '13px' }}>لا توجد بيانات</div>}
            </div>
          </div>

          <div className="card" style={{ padding: '20px', marginTop: '16px' }}>
            <h3 style={{ fontSize: '13px', color: 'var(--text2)', marginBottom: '16px' }}>مقارنة الأداء المالي</h3>
            <SimpleBarChart
              data={[
                { label: 'إجمالي المبيعات', value: totalSales, color: 'var(--success)' },
                { label: 'إجمالي المصروفات', value: totalExpenses, color: 'var(--danger)' },
                { label: 'إجمالي المرتجعات', value: totalReturns + totalPurchaseReturns, color: 'var(--warning)' },
                { label: 'المسحوبات الشخصية', value: totalWithdrawals, color: 'var(--warning)' },
                { label: 'صافي الربح', value: Math.max(0, netProfit), color: 'var(--accent)' }
              ]}
            />
          </div>
        </>
      )}

      {selectedReport === 'sales' && (
        <div>
          <div style={{ display: 'flex', gap: '12px', marginBottom: '14px', flexWrap: 'wrap' }}>
            <SummaryCard icon={<PaymentIcon size={22} />} label="إجمالي المبيعات" value={formatMoney(filteredSales.reduce((s, x) => s + x.total, 0))} color="var(--success)" />
            <SummaryCard icon={<HistoryIcon size={22} />} label="عدد الفواتير" value={filteredSales.length} color="var(--accent)" />
            <SummaryCard icon={<DiscountIcon size={22} />} label="إجمالي الضرائب" value={formatMoney(filteredSales.reduce((s, x) => s + (x.tax || 0), 0))} color="var(--secondary)" />
          </div>
          <div style={{ marginBottom: '12px' }}>
            <PeriodPresets current={salesPeriod} onChange={setSalesPeriod}
              dateFrom={searchSales.dateFrom} dateTo={searchSales.dateTo}
              onDateFrom={v => setSearchSales(s => ({ ...s, dateFrom: v }))}
              onDateTo={v => setSearchSales(s => ({ ...s, dateTo: v }))} />
          </div>
          {/* Payment method breakdown */}
          {(() => {
            const cashTotal = filteredSales.filter(s => s.paymentMethod === 'cash').reduce((s, x) => s + x.total, 0)
            const cardTotal = filteredSales.filter(s => s.paymentMethod === 'card').reduce((s, x) => s + x.total, 0)
            const creditTotal = filteredSales.filter(s => s.paymentMethod === 'credit').reduce((s, x) => s + x.total, 0)
            const avgInvoice = filteredSales.length > 0 ? Math.round(filteredSales.reduce((s, x) => s + x.total, 0) / filteredSales.length) : 0
            return (
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(160px, 1fr))', gap: '8px', marginBottom: '12px' }}>
                <div className="card" style={{ padding: '10px', textAlign: 'center' }}>
                  <div style={{ fontSize: '11px', color: 'var(--text2)' }}>نقداً</div>
                  <div style={{ fontSize: '15px', fontWeight: 'bold', color: 'var(--success)' }}>{formatMoney(cashTotal)}</div>
                </div>
                <div className="card" style={{ padding: '10px', textAlign: 'center' }}>
                  <div style={{ fontSize: '11px', color: 'var(--text2)' }}>بطاقة</div>
                  <div style={{ fontSize: '15px', fontWeight: 'bold', color: 'var(--accent)' }}>{formatMoney(cardTotal)}</div>
                </div>
                <div className="card" style={{ padding: '10px', textAlign: 'center' }}>
                  <div style={{ fontSize: '11px', color: 'var(--text2)' }}>آجل</div>
                  <div style={{ fontSize: '15px', fontWeight: 'bold', color: 'var(--warning)' }}>{formatMoney(creditTotal)}</div>
                </div>
                <div className="card" style={{ padding: '10px', textAlign: 'center' }}>
                  <div style={{ fontSize: '11px', color: 'var(--text2)' }}>متوسط الفاتورة</div>
                  <div style={{ fontSize: '15px', fontWeight: 'bold', color: 'var(--secondary)' }}>{formatMoney(avgInvoice)}</div>
                </div>
              </div>
            )
          })()}
          <div style={{ display: 'flex', gap: '8px', marginBottom: '12px', flexWrap: 'wrap' }}>
            <input placeholder="بحث برقم الفاتورة أو العميل أو الكاشير..." value={searchSales.q}
              onInput={e => setSearchSales(s => ({ ...s, q: e.target.value }))}
              style={{ flex: 1, minWidth: '150px' }} />
          </div>
          <div className="table-card">
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
                {filteredSales.length === 0 && <tr><td colSpan="6" style={{ padding: '24px', color: 'var(--text2)', textAlign: 'center' }}>لا توجد مبيعات</td></tr>}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {selectedReport === 'expenses' && (
        <div>
          <div style={{ display: 'flex', gap: '12px', marginBottom: '14px', flexWrap: 'wrap' }}>
            <SummaryCard icon={<WithdrawIcon size={22} />} label="إجمالي المصروفات" value={formatMoney(filteredExpenses.reduce((s, x) => s + x.amount, 0))} color="var(--danger)" />
            <SummaryCard icon={<HistoryIcon size={22} />} label="عدد المصروفات" value={filteredExpenses.length} color="var(--accent)" />
          </div>
          <div style={{ marginBottom: '12px' }}>
            <PeriodPresets current={expensesPeriod} onChange={setExpensesPeriod}
              dateFrom={searchExpenses.dateFrom} dateTo={searchExpenses.dateTo}
              onDateFrom={v => setSearchExpenses(s => ({ ...s, dateFrom: v }))}
              onDateTo={v => setSearchExpenses(s => ({ ...s, dateTo: v }))} />
          </div>
          {/* Category breakdown */}
          {(() => {
            const cats = {}
            filteredExpenses.forEach(e => { const c = e.category || 'أخرى'; cats[c] = (cats[c] || 0) + e.amount })
            const topCats = Object.entries(cats).sort((a, b) => b[1] - a[1]).slice(0, 5)
            return topCats.length > 0 ? (
              <div className="card" style={{ padding: '12px', marginBottom: '12px' }}>
                <div style={{ fontSize: '12px', fontWeight: 'bold', color: 'var(--text2)', marginBottom: '8px' }}>أكثر التصنيفات إنفاقاً</div>
                {topCats.map(([cat, amt]) => (
                  <div key={cat} style={{ display: 'flex', justifyContent: 'space-between', fontSize: '13px', padding: '4px 0', borderBottom: '1px solid var(--bg3)' }}>
                    <span>{cat}</span><span style={{ color: 'var(--danger)', fontWeight: 'bold' }}>{formatMoney(amt)}</span>
                  </div>
                ))}
              </div>
            ) : null
          })()}
          <div style={{ display: 'flex', gap: '8px', marginBottom: '12px', flexWrap: 'wrap' }}>
            <input placeholder="بحث بالتصنيف أو البيان..." value={searchExpenses.q}
              onInput={e => setSearchExpenses(s => ({ ...s, q: e.target.value }))}
              style={{ flex: 1, minWidth: '150px' }} />
          </div>
          <div className="table-card">
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
                {filteredExpenses.length === 0 && <tr><td colSpan="4" style={{ padding: '24px', color: 'var(--text2)', textAlign: 'center' }}>لا توجد مصروفات</td></tr>}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {selectedReport === 'withdrawals' && (
        <div>
          <div style={{ display: 'flex', gap: '12px', marginBottom: '14px', flexWrap: 'wrap' }}>
            <SummaryCard icon={<WithdrawIcon size={22} />} label="إجمالي المسحوبات" value={formatMoney(filteredWithdrawals.reduce((s, x) => s + Math.abs(x.amount), 0))} color="var(--warning)" />
            <SummaryCard icon={<HistoryIcon size={22} />} label="عدد المسحوبات" value={filteredWithdrawals.length} color="var(--accent)" />
          </div>
          <div style={{ marginBottom: '12px' }}>
            <PeriodPresets current={withdrawalsPeriod} onChange={setWithdrawalsPeriod}
              dateFrom={searchWithdrawals.dateFrom} dateTo={searchWithdrawals.dateTo}
              onDateFrom={v => setSearchWithdrawals(s => ({ ...s, dateFrom: v }))}
              onDateTo={v => setSearchWithdrawals(s => ({ ...s, dateTo: v }))} />
          </div>
          <div style={{ display: 'flex', gap: '8px', marginBottom: '12px', flexWrap: 'wrap' }}>
            <input placeholder="بحث باسم الشخص أو البيان..." value={searchWithdrawals.q}
              onInput={e => setSearchWithdrawals(s => ({ ...s, q: e.target.value }))}
              style={{ flex: 1, minWidth: '150px' }} />
          </div>
          <div className="table-card">
            <table>
              <thead><tr><th>التاريخ</th><th>اسم الشخص</th><th>المبلغ</th><th>البيان</th><th>الخزينة</th></tr></thead>
              <tbody>
                {filteredWithdrawals.map(w => (
                  <tr key={w._id}>
                    <td style={{ fontSize: '12px', color: 'var(--text2)' }}>{formatDate(w.createdAt)}</td>
                    <td style={{ fontWeight: 'bold' }}>{w.personName || '-'}</td>
                    <td style={{ color: 'var(--warning)', fontWeight: 'bold' }}>{formatMoney(Math.abs(w.amount))}</td>
                    <td style={{ fontSize: '12px', color: 'var(--text2)' }}>{w.note || '-'}</td>
                    <td style={{ fontSize: '12px', color: 'var(--text2)' }}>{w.treasuryName}</td>
                  </tr>
                ))}
                {filteredWithdrawals.length === 0 && <tr><td colSpan="5" style={{ padding: '24px', color: 'var(--text2)', textAlign: 'center' }}>لا توجد مسحوبات شخصية</td></tr>}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {selectedReport === 'customers' && (
        <div>
          <div style={{ display: 'flex', gap: '12px', marginBottom: '14px', flexWrap: 'wrap' }}>
            <SummaryCard icon={<ViewIcon size={22} />} label="إجمالي العملاء" value={filteredCustomers.length} color="var(--special)" />
            <SummaryCard icon={<PaymentIcon size={22} />} label="إجمالي الديون" value={formatMoney(filteredCustomers.reduce((s, c) => s + (c.totalDebt || 0) - (c.totalPaid || 0), 0))} color="var(--danger)" />
            <SummaryCard icon={<MoneyIcon size={22} />} label="إجمالي المشتريات" value={formatMoney(filteredCustomers.reduce((s, c) => s + (c.totalDebt || 0), 0))} color="var(--accent)" />
            <SummaryCard icon={<CheckIcon size={22} />} label="إجمالي المدفوع" value={formatMoney(filteredCustomers.reduce((s, c) => s + (c.totalPaid || 0), 0))} color="var(--success)" />
          </div>
          {/* Debt grouping */}
          {(() => {
            const debtors = filteredCustomers.filter(c => (c.totalDebt || 0) > 0)
            const clean = filteredCustomers.filter(c => (c.totalDebt || 0) <= 0)
            return (
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '10px', marginBottom: '14px' }}>
                <div className="card" style={{
                  padding: '12px', cursor: 'pointer',
                  outline: customerFilter === 'debtors' ? '2px solid var(--danger)' : 'none',
                  transition: 'outline 0.2s'
                }} onClick={() => setCustomerFilter(customerFilter === 'debtors' ? 'all' : 'debtors')}>
                  <div style={{ fontSize: '12px', fontWeight: 'bold', color: 'var(--danger)', marginBottom: '8px' }}>عليهم ديون ({debtors.length})</div>
                  <div style={{ fontSize: '24px', fontWeight: 'bold', color: 'var(--danger)', textAlign: 'center' }}>{debtors.length}</div>
                </div>
                <div className="card" style={{
                  padding: '12px', cursor: 'pointer',
                  outline: customerFilter === 'clean' ? '2px solid var(--success)' : 'none',
                  transition: 'outline 0.2s'
                }} onClick={() => setCustomerFilter(customerFilter === 'clean' ? 'all' : 'clean')}>
                  <div style={{ fontSize: '12px', fontWeight: 'bold', color: 'var(--success)', marginBottom: '8px' }}>بدون ديون ({clean.length})</div>
                  <div style={{ fontSize: '24px', fontWeight: 'bold', color: 'var(--success)', textAlign: 'center' }}>{clean.length}</div>
                </div>
              </div>
            )
          })()}
          {customerFilter !== 'all' && (
            <div style={{ display: 'flex', alignItems: 'center', gap: '6px', marginBottom: '8px' }}>
              <span style={{ fontSize: '11px', padding: '3px 8px', borderRadius: '4px', background: customerFilter === 'debtors' ? 'rgba(239,68,68,0.15)' : 'rgba(34,197,94,0.15)', color: customerFilter === 'debtors' ? 'var(--danger)' : 'var(--success)', fontWeight: 'bold' }}>
                {customerFilter === 'debtors' ? 'عليهم ديون' : 'بدون ديون'}
              </span>
              <button type="button" onClick={() => setCustomerFilter('all')} style={{ background: 'none', border: 'none', color: 'var(--text2)', cursor: 'pointer', fontSize: '11px', textDecoration: 'underline' }}>إزالة الفلتر</button>
            </div>
          )}
          <div className="table-card">
            <table>
              <thead><tr><th>العميل</th><th>الهاتف</th><th>إجمالي المشتريات</th><th>المدفوع</th><th>المتبقي</th></tr></thead>
              <tbody>
                {(customerFilter === 'debtors' ? filteredCustomers.filter(c => (c.totalDebt || 0) > 0) :
                  customerFilter === 'clean' ? filteredCustomers.filter(c => (c.totalDebt || 0) <= 0) :
                  filteredCustomers).map(c => {
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
                {(customerFilter === 'debtors' ? filteredCustomers.filter(c => (c.totalDebt || 0) > 0).length === 0 :
                  customerFilter === 'clean' ? filteredCustomers.filter(c => (c.totalDebt || 0) <= 0).length === 0 :
                  filteredCustomers.length === 0) && <tr><td colSpan="5" style={{ padding: '24px', color: 'var(--text2)', textAlign: 'center' }}>لا توجد بيانات</td></tr>}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {selectedReport === 'suppliers' && (
        <div>
          <div style={{ display: 'flex', gap: '12px', marginBottom: '14px', flexWrap: 'wrap' }}>
            <SummaryCard icon={<ViewIcon size={22} />} label="إجمالي الموردين" value={filteredSuppliers.length} color="var(--special)" />
            <SummaryCard icon={<PaymentIcon size={22} />} label="إجمالي المشتريات" value={formatMoney(filteredSuppliers.reduce((s, sp) => s + (sp.totalPurchases || 0), 0))} color="var(--accent)" />
            <SummaryCard icon={<MoneyIcon size={22} />} label="إجمالي الديون" value={formatMoney(filteredSuppliers.reduce((s, sp) => s + Math.max(0, (sp.totalPurchases || 0) - (sp.totalPaid || 0)), 0))} color="var(--danger)" />
          </div>
          {/* Debt grouping */}
          {(() => {
            const debtors = filteredSuppliers.filter(s => (s.totalPurchases || 0) - (s.totalPaid || 0) > 0)
            const clean = filteredSuppliers.filter(s => (s.totalPurchases || 0) - (s.totalPaid || 0) <= 0)
            return (
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '10px', marginBottom: '14px' }}>
                <div className="card" style={{
                  padding: '12px', cursor: 'pointer',
                  outline: supplierFilter === 'debtors' ? '2px solid var(--danger)' : 'none',
                  transition: 'outline 0.2s'
                }} onClick={() => setSupplierFilter(supplierFilter === 'debtors' ? 'all' : 'debtors')}>
                  <div style={{ fontSize: '12px', fontWeight: 'bold', color: 'var(--danger)', marginBottom: '8px' }}>موردين مدين لهم ({debtors.length})</div>
                  <div style={{ fontSize: '24px', fontWeight: 'bold', color: 'var(--danger)', textAlign: 'center' }}>{debtors.length}</div>
                </div>
                <div className="card" style={{
                  padding: '12px', cursor: 'pointer',
                  outline: supplierFilter === 'clean' ? '2px solid var(--success)' : 'none',
                  transition: 'outline 0.2s'
                }} onClick={() => setSupplierFilter(supplierFilter === 'clean' ? 'all' : 'clean')}>
                  <div style={{ fontSize: '12px', fontWeight: 'bold', color: 'var(--success)', marginBottom: '8px' }}>مسدد ({clean.length})</div>
                  <div style={{ fontSize: '24px', fontWeight: 'bold', color: 'var(--success)', textAlign: 'center' }}>{clean.length}</div>
                </div>
              </div>
            )
          })()}
          {supplierFilter !== 'all' && (
            <div style={{ display: 'flex', alignItems: 'center', gap: '6px', marginBottom: '8px' }}>
              <span style={{ fontSize: '11px', padding: '3px 8px', borderRadius: '4px', background: supplierFilter === 'debtors' ? 'rgba(239,68,68,0.15)' : 'rgba(34,197,94,0.15)', color: supplierFilter === 'debtors' ? 'var(--danger)' : 'var(--success)', fontWeight: 'bold' }}>
                {supplierFilter === 'debtors' ? 'موردين مدين لهم' : 'مسدد'}
              </span>
              <button type="button" onClick={() => setSupplierFilter('all')} style={{ background: 'none', border: 'none', color: 'var(--text2)', cursor: 'pointer', fontSize: '11px', textDecoration: 'underline' }}>إزالة الفلتر</button>
            </div>
          )}
          <div className="table-card">
            <table>
              <thead><tr><th>المورد</th><th>الهاتف</th><th>إجمالي المشتريات</th><th>المدفوع</th><th>المتبقي</th></tr></thead>
              <tbody>
                {(supplierFilter === 'debtors' ? filteredSuppliers.filter(s => (s.totalPurchases || 0) - (s.totalPaid || 0) > 0) :
                  supplierFilter === 'clean' ? filteredSuppliers.filter(s => (s.totalPurchases || 0) - (s.totalPaid || 0) <= 0) :
                  filteredSuppliers).map(s => {
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
                {(supplierFilter === 'debtors' ? filteredSuppliers.filter(s => (s.totalPurchases || 0) - (s.totalPaid || 0) > 0).length === 0 :
                  supplierFilter === 'clean' ? filteredSuppliers.filter(s => (s.totalPurchases || 0) - (s.totalPaid || 0) <= 0).length === 0 :
                  filteredSuppliers.length === 0) && <tr><td colSpan="5" style={{ padding: '24px', color: 'var(--text2)', textAlign: 'center' }}>لا توجد بيانات</td></tr>}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {selectedReport === 'returns' && (
        <div>
          {(() => {
            const saleTotal = filteredReturns.reduce((s, x) => s + (x.subtotal || 0), 0)
            const purchaseTotal = filteredPurchaseReturns.reduce((s, x) => s + (x.subtotal || 0), 0)
            return (
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '10px', marginBottom: '14px' }}>
                <div className="card" style={{
                  padding: '12px', cursor: 'pointer',
                  outline: returnFilter === 'sale' ? '2px solid var(--success)' : 'none',
                  transition: 'outline 0.2s'
                }} onClick={() => setReturnFilter(returnFilter === 'sale' ? 'all' : 'sale')}>
                  <div style={{ fontSize: '12px', fontWeight: 'bold', color: 'var(--success)', marginBottom: '8px' }}>مرتجعات البيع ({filteredReturns.length})</div>
                  <div style={{ fontSize: '24px', fontWeight: 'bold', color: 'var(--success)', textAlign: 'center' }}>{formatMoney(saleTotal)}</div>
                </div>
                <div className="card" style={{
                  padding: '12px', cursor: 'pointer',
                  outline: returnFilter === 'purchase' ? '2px solid var(--danger)' : 'none',
                  transition: 'outline 0.2s'
                }} onClick={() => setReturnFilter(returnFilter === 'purchase' ? 'all' : 'purchase')}>
                  <div style={{ fontSize: '12px', fontWeight: 'bold', color: 'var(--danger)', marginBottom: '8px' }}>مرتجعات الشراء ({filteredPurchaseReturns.length})</div>
                  <div style={{ fontSize: '24px', fontWeight: 'bold', color: 'var(--danger)', textAlign: 'center' }}>{formatMoney(purchaseTotal)}</div>
                </div>
              </div>
            )
          })()}
          <div style={{ marginBottom: '12px' }}>
            <PeriodPresets current={returnsPeriod} onChange={setReturnsPeriod}
              dateFrom={searchReturns.dateFrom} dateTo={searchReturns.dateTo}
              onDateFrom={v => setSearchReturns(s => ({ ...s, dateFrom: v }))}
              onDateTo={v => setSearchReturns(s => ({ ...s, dateTo: v }))} />
          </div>
          {returnFilter !== 'all' && (
            <div style={{ display: 'flex', alignItems: 'center', gap: '6px', marginBottom: '8px' }}>
              <span style={{ fontSize: '11px', padding: '3px 8px', borderRadius: '4px', background: returnFilter === 'sale' ? 'rgba(34,197,94,0.15)' : 'rgba(239,68,68,0.15)', color: returnFilter === 'sale' ? 'var(--success)' : 'var(--danger)', fontWeight: 'bold' }}>
                {returnFilter === 'sale' ? 'مرتجعات البيع' : 'مرتجعات الشراء'}
              </span>
              <button type="button" onClick={() => setReturnFilter('all')} style={{ background: 'none', border: 'none', color: 'var(--text2)', cursor: 'pointer', fontSize: '11px', textDecoration: 'underline' }}>إزالة الفلتر</button>
            </div>
          )}
          <div className="table-card">
            <table>
              <thead><tr><th>النوع</th><th>الفاتورة</th><th>التاريخ</th><th>{returnFilter === 'purchase' ? 'المورد' : 'العميل'}</th><th>المبلغ</th><th>{returnFilter === 'purchase' ? 'طريقة الدفع' : 'نوع الإرجاع'}</th></tr></thead>
              <tbody>
                {(returnFilter === 'all' || returnFilter === 'sale') && filteredReturns.map(r => (
                  <tr key={r._id}>
                    <td><span style={{ fontSize: '11px', padding: '2px 6px', borderRadius: '4px', fontWeight: '600', background: 'rgba(34,197,94,0.15)', color: 'var(--success)' }}>بيع</span></td>
                    <td style={{ color: 'var(--accent)' }}>#{r.invoiceNo}</td>
                    <td style={{ fontSize: '12px', color: 'var(--text2)' }}>{formatDate(r.createdAt)}</td>
                    <td>{r.customerName || '-'}</td>
                    <td>{formatMoney(r.subtotal)}</td>
                    <td>{r.isFullReturn ? 'كامل' : 'جزئي'}</td>
                  </tr>
                ))}
                {(returnFilter === 'all' || returnFilter === 'purchase') && filteredPurchaseReturns.map(r => (
                  <tr key={r._id}>
                    <td><span style={{ fontSize: '11px', padding: '2px 6px', borderRadius: '4px', fontWeight: '600', background: 'rgba(239,68,68,0.15)', color: 'var(--danger)' }}>شراء</span></td>
                    <td style={{ color: 'var(--accent)' }}>#{r.invoiceNo}</td>
                    <td style={{ fontSize: '12px', color: 'var(--text2)' }}>{formatDate(r.createdAt)}</td>
                    <td>{r.supplierName || '-'}</td>
                    <td>{formatMoney(r.subtotal)}</td>
                    <td style={{ fontSize: '12px', color: 'var(--text2)' }}>{r.paymentMethod === 'card' ? 'بطاقة' : r.paymentMethod === 'credit' ? 'آجل' : 'نقداً'}</td>
                  </tr>
                ))}
                {((returnFilter === 'all' && filteredReturns.length === 0 && filteredPurchaseReturns.length === 0) ||
                  (returnFilter === 'sale' && filteredReturns.length === 0) ||
                  (returnFilter === 'purchase' && filteredPurchaseReturns.length === 0)) && (
                  <tr><td colSpan="6" style={{ padding: '24px', color: 'var(--text2)', textAlign: 'center' }}>لا توجد مرتجعات</td></tr>
                )}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {selectedReport === 'inventory' && (
        <div>
          <div style={{ display: 'flex', gap: '12px', marginBottom: '14px', flexWrap: 'wrap' }}>
            <SummaryCard icon={<BarcodeIcon size={22} />} label="قيمة المخزون" value={formatMoney(batchTotalValue)} color="var(--accent)" />
            <SummaryCard icon={<ViewIcon size={22} />} label="عدد الأصناف" value={batchData.length} color="var(--secondary)" />
            <SummaryCard icon={<MoneyIcon size={22} />} label="إجمالي الكميات" value={batchData.reduce((s, p) => s + (p.stock || p.batches?.reduce((ss, b) => ss + (b.quantity || 0), 0) || 0), 0)} color="var(--success)" />
          </div>
          <div style={{ display: 'flex', gap: '8px', marginBottom: '12px', flexWrap: 'wrap', alignItems: 'center' }}>
            <input placeholder="بحث باسم المنتج أو SKU أو الباركود..." value={batchSearch}
              onInput={e => setBatchSearch(e.target.value)}
              style={{ flex: 1, minWidth: '200px' }} />
            <span style={{ fontSize: '12px', color: 'var(--text2)', alignSelf: 'center' }}>{batchData.length} منتج</span>
          </div>
          <div style={{ background: 'var(--bg2)', borderRadius: '12px', padding: '16px', marginBottom: '16px', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            <span style={{ fontSize: '14px', fontWeight: 'bold' }}>إجمالي تكلفة المخزون (بالقيمة الحقيقية)</span>
            <span style={{ fontSize: '24px', fontWeight: 'bold', color: 'var(--success)' }}>{formatMoney(batchTotalValue)}</span>
          </div>
          {batchData.map(p => (
            <div key={p._id} style={{ background: 'var(--bg2)', borderRadius: '12px', padding: '12px', marginBottom: '12px' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '8px', flexWrap: 'wrap', gap: '4px' }}>
                <div>
                  <strong style={{ fontSize: '14px' }}>{p.name}</strong>
                  {p.sku && <span style={{ fontSize: '11px', color: 'var(--text2)', marginRight: '8px' }}>SKU: {p.sku}</span>}
                </div>
                <div style={{ display: 'flex', gap: '12px', fontSize: '12px', color: 'var(--text2)' }}>
                  <span>إجمالي المخزون: <strong style={{ color: 'var(--text)' }}>{p.stock} {p.unit}</strong></span>
                  <span>تكلفة الأقدم: <strong style={{ color: 'var(--accent)' }}>{formatMoney(p.cost)}</strong></span>
                </div>
              </div>
              {p.batches.length > 0 ? (
                <div style={{ overflow: 'auto' }}>
                  <table style={{ fontSize: '12px' }}>
                    <thead>
                      <tr>
                        <th>الكمية</th>
                        <th>تكلفة الوحدة</th>
                        <th>الإجمالي</th>
                        <th>تاريخ الشراء</th>
                      </tr>
                    </thead>
                    <tbody>
                      {p.batches.map((b, i) => (
                        <tr key={i}>
                          <td>{b.quantity} {p.unit}</td>
                          <td style={{ color: 'var(--accent)' }}>{formatMoney(b.cost)}</td>
                          <td style={{ fontWeight: 'bold' }}>{formatMoney(b.total)}</td>
                          <td style={{ fontSize: '11px', color: 'var(--text2)' }}>{formatDate(b.createdAt)}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              ) : (
                <div style={{ padding: '12px', color: 'var(--text2)', fontSize: '12px', textAlign: 'center' }}>لا توجد دفعات (المخزون صفر)</div>
              )}
            </div>
          ))}
          {batchData.length === 0 && (
            <div style={{ padding: '24px', color: 'var(--text2)', textAlign: 'center' }}>لا توجد منتجات</div>
          )}
        </div>
      )}

      {selectedReport === 'treasury' && (
        <div>
          {(() => {
            const displayTreasury = treasuryFilter ? filteredTreasury.filter(x => x.treasuryName === treasuryFilter) : filteredTreasury
            return (
              <div style={{ display: 'flex', gap: '12px', marginBottom: '14px', flexWrap: 'wrap' }}>
                <SummaryCard icon={<HistoryIcon size={22} />} label="إجمالي الحركات" value={displayTreasury.length} color="var(--accent)" />
                <SummaryCard icon={<PaymentIcon size={22} />} label="إجمالي الوارد" value={formatMoney(displayTreasury.filter(t => t.amount > 0).reduce((s, t) => s + t.amount, 0))} color="var(--success)" />
                <SummaryCard icon={<WithdrawIcon size={22} />} label="إجمالي المنصرف" value={formatMoney(displayTreasury.filter(t => t.amount < 0).reduce((s, t) => s + Math.abs(t.amount), 0))} color="var(--danger)" />
              </div>
            )
          })()}
          {/* Treasury balances */}
          <div style={{ display: 'flex', gap: '10px', flexWrap: 'wrap', marginBottom: '14px' }}>
            {treasuries.map(t => (
              <div key={t._id} className="card" style={{
                padding: '10px 16px', minWidth: '140px', textAlign: 'center', cursor: 'pointer',
                outline: treasuryFilter === t.name ? '2px solid var(--accent)' : 'none',
                transition: 'outline 0.2s'
              }} onClick={() => setTreasuryFilter(treasuryFilter === t.name ? '' : t.name)}>
                <div style={{ fontSize: '11px', color: 'var(--text2)' }}>{t.name}</div>
                <div style={{ fontSize: '16px', fontWeight: 'bold', color: (t.balance || 0) >= 0 ? 'var(--success)' : 'var(--danger)' }}>{formatMoney(t.balance || 0)}</div>
              </div>
            ))}
            {treasuries.length === 0 && <div style={{ fontSize: '12px', color: 'var(--text2)' }}>لا توجد خزائن</div>}
          </div>
          {treasuryFilter && (
            <div style={{ display: 'flex', alignItems: 'center', gap: '6px', marginBottom: '8px' }}>
              <span style={{ fontSize: '11px', padding: '3px 8px', borderRadius: '4px', background: 'rgba(59,106,181,0.15)', color: 'var(--accent)', fontWeight: 'bold' }}>
                {treasuryFilter}
              </span>
              <button type="button" onClick={() => setTreasuryFilter('')} style={{ background: 'none', border: 'none', color: 'var(--text2)', cursor: 'pointer', fontSize: '11px', textDecoration: 'underline' }}>إزالة الفلتر</button>
            </div>
          )}
          <div style={{ marginBottom: '12px' }}>
            <PeriodPresets current={treasuryPeriod} onChange={setTreasuryPeriod}
              dateFrom={searchTreasury.dateFrom} dateTo={searchTreasury.dateTo}
              onDateFrom={v => setSearchTreasury(s => ({ ...s, dateFrom: v }))}
              onDateTo={v => setSearchTreasury(s => ({ ...s, dateTo: v }))} />
          </div>
          <div style={{ display: 'flex', gap: '8px', marginBottom: '12px', flexWrap: 'wrap' }}>
            <input placeholder="بحث باسم المستخدم أو البيان أو الشخص..." value={searchTreasury.q}
              onInput={e => setSearchTreasury(s => ({ ...s, q: e.target.value }))}
              style={{ flex: 1, minWidth: '150px' }} />
          </div>
          <div className="table-card">
            <table>
              <thead><tr><th>التاريخ</th><th>الخزينة</th><th>النوع</th><th>المبلغ</th><th>البيان</th><th>الشخص</th><th>بواسطة</th></tr></thead>
              <tbody>
                {(treasuryFilter ? filteredTreasury.filter(x => x.treasuryName === treasuryFilter) : filteredTreasury).map(t => (
                  <tr key={t._id}>
                    <td style={{ fontSize: '11px', color: 'var(--text2)' }}>{formatDate(t.createdAt)}</td>
                    <td style={{ fontSize: '12px' }}>{t.treasuryName}</td>
                    <td>
                      <span style={{
                        fontSize: '11px', padding: '2px 6px', borderRadius: '4px', fontWeight: '600',
                        background: t.type === 'personal_withdraw' ? 'rgba(234,179,8,0.15)' :
                          t.amount > 0 ? 'rgba(34,197,94,0.15)' : 'rgba(239,68,68,0.15)',
                        color: t.type === 'personal_withdraw' ? 'var(--warning)' :
                          t.amount > 0 ? 'var(--success)' : 'var(--danger)'
                      }}>
                        {({deposit:'إيداع',expense:'مصروف',personal_withdraw:'سحب شخصي',operational_withdraw:'سحب تشغيلي',sale:'مبيعات',settlement:'تسوية',customerPayment:'تسديد عميل',supplierPayment:'تسديد مورد',purchase:'مشتريات',purchaseReturn:'مرتجع مشتريات',return:'مرتجع بيع',advance:'سلفة',salary:'راتب',transfer_in:'تحويل وارد',transfer_out:'تحويل صادر'})[t.type] || t.type}
                      </span>
                    </td>
                    <td style={{ fontWeight: 'bold', color: t.amount > 0 ? 'var(--success)' : 'var(--danger)' }}>{formatMoney(t.amount)}</td>
                    <td style={{ fontSize: '12px', color: 'var(--text2)' }}>{t.note || '-'}</td>
                    <td style={{ fontSize: '12px', color: 'var(--text2)' }}>{t.personName || '-'}</td>
                    <td style={{ fontSize: '12px', color: 'var(--text2)' }}>{t.createdBy || '-'}</td>
                  </tr>
                ))}
                {(treasuryFilter ? filteredTreasury.filter(x => x.treasuryName === treasuryFilter) : filteredTreasury).length === 0 && <tr><td colSpan="7" style={{ padding: '24px', color: 'var(--text2)', textAlign: 'center' }}>لا توجد حركات</td></tr>}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {selectedReport === 'employees' && (
        <div>
          {(() => {
            const filteredAdvances = employeeAdvances.filter(a => inRange(a.date || a.createdAt))
            const filteredSalaryPmts = salaryPayments.filter(p => inRange(p.date || p.createdAt))
            const totalSalaries = employees.reduce((s, e) => s + (e.salary || 0), 0)
            const advances = filteredAdvances.filter(a => a.type !== 'deduction')
            const deductions = filteredAdvances.filter(a => a.type === 'deduction')
            const pendingAdvances = advances.filter(a => !a.deducted)
            const totalAdvances = advances.reduce((s, a) => s + a.amount, 0)
            const totalDeductions = deductions.reduce((s, a) => s + a.amount, 0)
            const totalPending = pendingAdvances.reduce((s, a) => s + a.amount, 0)
            const totalAdditions = filteredSalaryPmts.reduce((s, p) => s + (p.totalAdditions || 0), 0)
            return (
              <>
                <div style={{ display: 'flex', gap: '12px', marginBottom: '14px', flexWrap: 'wrap' }}>
                  <SummaryCard icon={<ViewIcon size={22} />} label="إجمالي الموظفين" value={employees.length} color="#8B5CF6" />
                  <SummaryCard icon={<SalaryIcon size={22} />} label="إجمالي الرواتب" value={formatMoney(totalSalaries)} color="var(--accent)" />
                  <SummaryCard icon={<AdvanceIcon size={22} />} label="إجمالي السلف" value={formatMoney(totalAdvances)} color="var(--warning)" />
                  <SummaryCard icon={<DiscountIcon size={22} />} label="إجمالي الخصومات" value={formatMoney(totalDeductions)} color="var(--danger)" />
                  <SummaryCard icon={<HistoryIcon size={22} />} label="السلف المعلقة" value={formatMoney(totalPending)} color="var(--danger)" />
                  <SummaryCard icon={<AddIcon size={22} />} label="إجمالي الإضافات" value={formatMoney(totalAdditions)} color="var(--success)" />
                </div>
                {employees.length > 0 && (
                  <div className="card" style={{ padding: '12px', marginBottom: '14px' }}>
                    <div style={{ fontSize: '12px', fontWeight: 'bold', color: 'var(--text2)', marginBottom: '8px' }}>الموظفون ورواتبهم</div>
                    {(employeeFilter ? employees.filter(e => e.name?.includes(employeeFilter)) : employees).slice(0, 10).map(e => {
                      const empAdvances = employeeAdvances.filter(a => a.employeeId === e._id && a.type !== 'deduction')
                      const empPending = empAdvances.filter(a => !a.deducted)
                      const empTotal = empAdvances.reduce((s, a) => s + a.amount, 0)
                      const empPendingTotal = empPending.reduce((s, a) => s + a.amount, 0)
                      return (
                        <div key={e._id} onClick={() => setEmployeeFilter(employeeFilter === e.name ? '' : e.name)} style={{ display: 'flex', justifyContent: 'space-between', fontSize: '12px', borderBottom: '1px solid var(--bg3)', alignItems: 'center', cursor: 'pointer', background: employeeFilter === e.name ? 'var(--accent-container)' : 'transparent', borderRadius: '4px', padding: '4px 8px', margin: '0 -8px' }}>
                          <span style={{ fontWeight: 'bold' }}>{e.name}</span>
                          <span style={{ color: 'var(--text2)' }}>
                            الراتب: <strong style={{ color: 'var(--accent)' }}>{formatMoney(e.salary || 0)}</strong>
                            {empTotal > 0 && <> | سلف: <strong style={{ color: 'var(--warning)' }}>{formatMoney(empTotal)}</strong></>}
                            {empPendingTotal > 0 && <> | معلق: <strong style={{ color: 'var(--danger)' }}>{formatMoney(empPendingTotal)}</strong></>}
                          </span>
                        </div>
                      )
                    })}
                    {employees.length > 10 && <div style={{ fontSize: '11px', color: 'var(--text2)', marginTop: '6px' }}>و {employees.length - 10} موظفين آخرين</div>}
                  </div>
                )}
                <div style={{ display: 'flex', gap: '8px', marginBottom: '12px', flexWrap: 'wrap' }}>
                  <input placeholder="بحث باسم الموظف..." value={employeeFilter}
                    onInput={e => setEmployeeFilter(e.target.value)}
                    style={{ flex: 1, minWidth: '150px' }} />
                  {employeeFilter && <button onClick={() => setEmployeeFilter('')} style={{ fontSize: '11px', color: 'var(--danger)', fontWeight: '600', background: 'var(--bg3)', border: 'none', borderRadius: '6px', padding: '4px 10px', cursor: 'pointer' }}>إزالة التصفية</button>}
                </div>
                {filteredAdvances.length > 0 && (
                  <div className="table-card">
                    <table>
                      <thead><tr><th>التاريخ</th><th>الموظف</th><th>النوع</th><th>المبلغ</th><th>الحالة</th><th>البيان</th></tr></thead>
                      <tbody>
                        {(employeeFilter ? filteredAdvances.filter(a => a.employeeName?.includes(employeeFilter)) : filteredAdvances).slice(0, 50).map(a => (
                          <tr key={a._id}>
                            <td style={{ fontSize: '11px', color: 'var(--text2)' }}>{formatDate(a.date || a.createdAt)}</td>
                            <td style={{ fontWeight: 'bold' }}>{a.employeeName}</td>
                            <td>
                              <span style={{ fontSize: '11px', padding: '2px 6px', borderRadius: '4px', fontWeight: '600',
                                background: a.type === 'deduction' ? 'rgba(239,68,68,0.15)' : 'rgba(234,179,8,0.15)',
                                color: a.type === 'deduction' ? 'var(--danger)' : 'var(--warning)'
                              }}>
                                {a.type === 'deduction' ? 'خصم' : 'سلفة'}
                              </span>
                            </td>
                            <td style={{ fontWeight: 'bold', color: a.type === 'deduction' ? 'var(--danger)' : 'var(--warning)' }}>{formatMoney(a.amount)}</td>
                            <td>
                              <span style={{ fontSize: '11px', padding: '2px 6px', borderRadius: '4px', fontWeight: '600',
                                background: a.deducted ? 'rgba(34,197,94,0.15)' : 'rgba(239,68,68,0.15)',
                                color: a.deducted ? 'var(--success)' : 'var(--danger)'
                              }}>
                                {a.deducted ? 'مخصومة' : 'معلقة'}
                              </span>
                            </td>
                            <td style={{ fontSize: '12px', color: 'var(--text2)' }}>{a.note || '-'}</td>
                          </tr>
                        ))}
                        {(employeeFilter ? filteredAdvances.filter(a => a.employeeName?.includes(employeeFilter)) : filteredAdvances).length > 50 && <tr><td colSpan="6" style={{ padding: '8px', color: 'var(--text2)', textAlign: 'center', fontSize: '11px' }}>و {((employeeFilter ? filteredAdvances.filter(a => a.employeeName === employeeFilter) : filteredAdvances).length - 50)} حركة أخرى</td></tr>}
                      </tbody>
                    </table>
                  </div>
                )}
                {filteredAdvances.length === 0 && employees.length > 0 && <div style={{ padding: '24px', color: 'var(--text2)', textAlign: 'center' }}>لا توجد سلف أو خصومات في هذه الفترة</div>}
                {employees.length === 0 && <div style={{ padding: '24px', color: 'var(--text2)', textAlign: 'center' }}>لا توجد بيانات موظفين</div>}
              </>
            )
          })()}
        </div>
      )}

      {selectedReport === 'shifts' && (
        <div>
          <div style={{ display: 'flex', gap: '12px', marginBottom: '14px', flexWrap: 'wrap' }}>
            <SummaryCard icon={<ShiftIcon size={22} />} label="إجمالي الورديات" value={shiftsTotal} color="#6366F1" />
            <SummaryCard icon={<MoneyIcon size={22} />} label="إجمالي المبيعات" value={formatMoney(allShiftsData.reduce((s, e) => s + (e.totalSales || 0), 0))} color="var(--success)" />
            <SummaryCard icon={<PaymentIcon size={22} />} label="إجمالي الكاش" value={formatMoney(allShiftsData.reduce((s, e) => s + (e.cashTotal || 0), 0))} color="var(--accent)" />
            <SummaryCard icon={<MoneyIcon size={22} />} label="إجمالي البطاقة" value={formatMoney(allShiftsData.reduce((s, e) => s + (e.cardTotal || 0), 0))} color="var(--special)" />
            <SummaryCard icon={<WithdrawIcon size={22} />} label="إجمالي السحوبات" value={formatMoney(allShiftsData.reduce((s, e) => s + (e.withdrawalsTotal || 0) + (e.cardWithdrawalsTotal || 0), 0))} color="var(--warning)" />
            <SummaryCard icon={<CheckIcon size={22} />} label="إجمالي الفواتير" value={allShiftsData.reduce((s, e) => s + (e.invoiceCount || 0), 0)} color="var(--secondary)" />
          </div>
          <div style={{ display: 'flex', gap: '8px', marginBottom: '12px', flexWrap: 'wrap' }}>
            <input placeholder="بحث بالكاشير..." value={shiftsFilter.q}
              onInput={e => setShiftsFilter(f => ({ ...f, q: e.target.value }))}
              style={{ flex: 1, minWidth: '150px' }} />
            <input type="date" value={shiftsFilter.dateFrom} onInput={e => setShiftsFilter(f => ({ ...f, dateFrom: e.target.value }))} style={{ width: '150px' }} />
            <input type="date" value={shiftsFilter.dateTo} onInput={e => setShiftsFilter(f => ({ ...f, dateTo: e.target.value }))} style={{ width: '150px' }} />
            {shiftsFilter.q && <button onClick={() => setShiftsFilter(f => ({ ...f, q: '' }))} style={{ fontSize: '11px', color: 'var(--danger)', fontWeight: '600', background: 'var(--bg3)', border: 'none', borderRadius: '6px', padding: '4px 10px', cursor: 'pointer' }}>إزالة التصفية</button>}
          </div>
          <div className="table-card">
            <table>
              <thead><tr><th>التاريخ</th><th>الكاشير</th><th>البداية</th><th>النهاية</th><th>المبيعات</th><th>الكاش</th><th>البطاقة</th><th>السحوبات</th><th>الفواتير</th><th></th></tr></thead>
              <tbody>
                {shiftsData.map(s => (
                  <tr key={s._id}>
                    <td style={{ fontSize: '12px', color: 'var(--text2)' }}>{formatDate(s.startedAt)}</td>
                    <td style={{ fontWeight: 'bold' }}>{s.cashierName}</td>
                    <td style={{ fontSize: '12px' }}>{s.startedAt ? new Date(s.startedAt).toLocaleTimeString('ar-EG', { hour: '2-digit', minute: '2-digit' }) : '-'}</td>
                    <td style={{ fontSize: '12px' }}>{s.endedAt ? new Date(s.endedAt).toLocaleTimeString('ar-EG', { hour: '2-digit', minute: '2-digit' }) : 'نشطة'}</td>
                    <td style={{ color: 'var(--success)', fontWeight: 'bold' }}>{formatMoney(s.totalSales || 0)}</td>
                    <td style={{ color: 'var(--accent)', fontWeight: 'bold' }}>{formatMoney(s.cashTotal || 0)}</td>
                    <td style={{ color: 'var(--special)', fontWeight: 'bold' }}>{formatMoney(s.cardTotal || 0)}</td>
                    <td style={{ color: 'var(--warning)', fontWeight: 'bold' }}>{formatMoney((s.withdrawalsTotal || 0) + (s.cardWithdrawalsTotal || 0))}</td>
                    <td>{s.invoiceCount || 0}</td>
                    <td style={{ whiteSpace: 'nowrap' }}>
                      {s.endedAt && (
                        <button onClick={() => handlePrintShiftReport(s)} style={iconBtn('accent')} title={settings?.printDefaultSize === 'a4' ? 'طباعة A4' : 'طباعة حرارية'}>
                          <PrintIcon size={14} />
                        </button>
                      )}
                    </td>
                  </tr>
                ))}
                {shiftsData.length === 0 && <tr><td colSpan="10" style={{ padding: '24px', color: 'var(--text2)', textAlign: 'center' }}>لا توجد ورديات</td></tr>}
              </tbody>
            </table>
          </div>
          <Pagination page={shiftsPage} totalPages={Math.ceil(shiftsTotal / 20)} total={shiftsTotal} pageSize={20} onChange={setShiftsPage} />
        </div>
      )}
    </div>
  )
}

function OverviewCard({ icon, label, value, color }) {
  return (
    <div style={{ background: 'var(--bg2)', padding: '16px', borderRadius: '14px', border: '1px solid var(--outline)', boxShadow: 'var(--elevation-1)' }}>
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

function SummaryCard({ icon, label, value, color }) {
  return (
    <div style={{ background: 'var(--bg2)', padding: '16px', borderRadius: '14px', border: '1px solid var(--outline)', boxShadow: 'var(--elevation-1)' }}>
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

function ProfitRow({ label, value, color, bold, total, large, indent, indent2 }) {
  return (
    <div style={{
      display: 'flex', justifyContent: 'space-between', alignItems: 'center',
      padding: '3px 0', fontSize: large ? '16px' : '13px', fontWeight: bold ? '700' : '400',
      marginRight: indent2 ? '32px' : indent ? '16px' : '0'
    }}>
      <span style={{ color: 'var(--text2)', fontSize: large ? '14px' : total ? '13px' : '12px' }}>{label}</span>
      <span style={{ color, fontSize: large ? '18px' : total ? '14px' : '13px', fontWeight: bold ? '700' : '500', direction: 'ltr' }}>
        {formatMoney(value)}
      </span>
    </div>
  )
}

function SimpleBarChart({ data }) {
  const maxVal = Math.max(...data.map(d => d.value), 1)
  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
      {data.map((d, i) => (
        <div key={i} style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
          <span style={{ width: '100px', fontSize: '12px', color: 'var(--text2)', textAlign: 'left', flexShrink: 0 }}>{d.label}</span>
          <div style={{ flex: 1, height: '26px', background: 'var(--bg3)', borderRadius: '6px', overflow: 'hidden', position: 'relative' }}>
            <div style={{
              height: '100%', width: `${Math.max((d.value / maxVal) * 100, 2)}%`,
              background: d.color, borderRadius: '6px', opacity: '0.85',
              transition: 'width 0.4s ease'
            }} />
          </div>
          <span style={{ width: '100px', fontSize: '12px', fontWeight: '600', color: 'var(--text)', textAlign: 'right', flexShrink: 0, direction: 'ltr' }}>
            {formatMoney(d.value)}
          </span>
        </div>
      ))}
    </div>
  )
}