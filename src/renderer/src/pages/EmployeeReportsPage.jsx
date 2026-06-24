import { useState, useEffect } from 'preact/hooks'
import api from '../api'
import { useStore } from '../store'
import { formatDate } from '../utils/date'
import { formatMoney } from '../utils/money'
import { PrintIcon, iconBtn } from '../components/ActionIcons'

export default function EmployeeReportsPage() {
  const { user, settings } = useStore()
  const canView = user?.permissions?.includes('employees.view')
  const [employees, setEmployees] = useState([])
  const [selectedEmp, setSelectedEmp] = useState(null)
  const [month, setMonth] = useState(new Date().getMonth() + 1)
  const [year, setYear] = useState(new Date().getFullYear())
  const [attendance, setAttendance] = useState([])
  const [salaryPayments, setSalaryPayments] = useState([])
  const [advances, setAdvances] = useState([])
  const [sales, setSales] = useState([])
  const [tab, setTab] = useState('attendance')

  useEffect(() => { load() }, [])

  async function load() {
    const token = localStorage.getItem('token')
    const data = await api.listEmployees(token)
    setEmployees(data)
  }

  async function loadReport(empId) {
    const token = localStorage.getItem('token')
    const [att, sal, adv, allSales] = await Promise.all([
      api.listEmployeeAttendance(token, empId, month, year),
      api.listEmployeeSalaryPayments(token, empId),
      api.listEmployeeAdvances(token, empId),
      api.listSales(token)
    ])
    setAttendance(att)
    setSalaryPayments(sal)
    setAdvances(adv)
    setSales(allSales.filter(s => s.employeeId === empId))
  }

  function selectEmployee(emp) {
    setSelectedEmp(emp)
    loadReport(emp._id)
  }

  async function handlePrintSalary(payment) {
    const { printA4 } = await import('../utils/print')
    const { default: PrintTemplateSalary } = await import('../components/PrintTemplateSalary')
    const element = (
      <PrintTemplateSalary
        employee={selectedEmp}
        payment={payment}
        advances={advances}
        attendance={attendance}
        businessName={user?.businessName || 'SMART X POS'}
        businessPhone={user?.businessPhone || ''}
        businessAddress={user?.businessAddress || ''}
        logoDataUrl={settings?.logoDataUrl}
        showLogo={settings?.showLogo}
      />
    )
    await printA4(element)
  }

  if (!canView) return <div style={{ padding: '20px', color: 'var(--text2)' }}>ليس لديك صلاحية</div>

  const empSales = sales.filter(s => s.employeeId === selectedEmp?._id)
  const totalSales = empSales.reduce((s, i) => s + (i.paid || 0), 0)

  return (
    <div style={{ padding: '20px', overflow: 'auto', height: '100%' }}>
      <h1 style={{ fontSize: '20px', marginBottom: '16px' }}>تقارير الموظفين</h1>
      <div style={{ display: 'flex', gap: '16px' }}>
        {/* Side list */}
        <div style={{ width: '250px', flexShrink: 0, background: 'var(--bg2)', borderRadius: '12px', overflow: 'auto', maxHeight: 'calc(100vh - 120px)', boxShadow: 'var(--elevation-1)' }}>
          {employees.map(emp => (
            <div key={emp._id} onClick={() => selectEmployee(emp)}
              style={{ padding: '10px 14px', cursor: 'pointer', borderBottom: '1px solid var(--outline)',
                background: selectedEmp?._id === emp._id ? 'var(--accent-container)' : 'transparent',
                color: selectedEmp?._id === emp._id ? 'var(--on-accent-container)' : 'var(--text)', fontWeight: selectedEmp?._id === emp._id ? 'bold' : 'normal' }}>
              {emp.photo && <img src={emp.photo} alt="" style={{ width: '28px', height: '28px', borderRadius: '50%', objectFit: 'cover', verticalAlign: 'middle', marginLeft: '8px' }} />}
              {emp.name}
              <div style={{ fontSize: '11px', color: 'var(--text2)' }}>{emp.jobTitle}{emp.workHours ? ` · ${emp.workHours}س` : ''}</div>
            </div>
          ))}
        </div>
        {/* Report content */}
        <div style={{ flex: 1, background: 'var(--bg2)', borderRadius: '12px', padding: '16px', boxShadow: 'var(--elevation-1)' }}>
          {!selectedEmp ? <div style={{ color: 'var(--text2)', textAlign: 'center', padding: '40px' }}>اختر موظفاً من القائمة</div> : <>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '12px' }}>
              <h2 style={{ fontSize: '16px' }}>{selectedEmp.name}</h2>
              <div style={{ fontSize: '12px', color: 'var(--text2)', marginLeft: '12px' }}>{selectedEmp.jobTitle}{selectedEmp.workHours ? ` · ${selectedEmp.workHours} ساعة` : ''}</div>
              <div style={{ display: 'flex', gap: '8px', alignItems: 'center' }}>
                <select value={month} onChange={e => { setMonth(Number(e.target.value)); loadReport(selectedEmp._id) }} style={{ background: 'var(--bg)', color: 'var(--text)', border: '1px solid var(--bg3)', borderRadius: '8px', padding: '6px' }}>
                  {[1,2,3,4,5,6,7,8,9,10,11,12].map(m => <option key={m} value={m}>{m}</option>)}
                </select>
                <input type="number" step="any" value={year} onInput={e => { setYear(Number(e.target.value)); loadReport(selectedEmp._id) }} style={{ width: '80px' }} />
              </div>
            </div>
            <div style={{ display: 'flex', gap: '8px', marginBottom: '12px' }}>
              {['attendance','salary','advances','sales'].map(t => (
                <button key={t} onClick={() => setTab(t)} style={{ padding: '6px 14px', borderRadius: '6px', fontSize: '12px', fontWeight: tab === t ? 'bold' : 'normal',
                  background: tab === t ? 'var(--accent)' : 'var(--bg3)', color: tab === t ? '#fff' : 'var(--text)' }}>
                  {t === 'attendance' ? 'الحضور' : t === 'salary' ? 'الرواتب' : t === 'advances' ? 'السلف والخصومات' : 'المبيعات'}
                </button>
              ))}
            </div>
            {tab === 'attendance' && <div>
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(7, 1fr)', gap: '4px', direction: 'ltr' }}>
                {['ح', 'ن', 'ث', 'ر', 'خ', 'ج', 'س'].map(d => (
                  <div key={d} style={{ textAlign: 'center', fontSize: '10px', color: 'var(--text2)', fontWeight: '600', padding: '4px 0' }}>{d}</div>
                ))}
                {(() => {
                  const daysInMonth = new Date(year, month, 0).getDate()
                  const firstDay = new Date(year, month - 1, 1).getDay()
                  const days = []
                  const attMap = {}
                  attendance.forEach(a => { const d = new Date(a.date).getUTCDate(); attMap[d] = a })
                  for (let i = 0; i < firstDay; i++) days.push(<div key={`e${i}`} />)
                  for (let d = 1; d <= daysInMonth; d++) {
                    const a = attMap[d]
                    days.push(
                      <div key={d} style={{ width: '100%', aspectRatio: '1', borderRadius: '8px', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '12px',
                        background: a ? (a.status === 'present' ? 'rgba(16,185,129,0.2)' : a.status === 'vacation' ? 'rgba(245,158,11,0.2)' : a.status === 'sick' ? 'rgba(239,68,68,0.2)' : 'rgba(239,68,68,0.15)') : 'var(--bg3)',
                        color: a ? (a.status === 'present' ? 'var(--success)' : a.status === 'vacation' ? 'var(--warning)' : a.status === 'sick' ? 'var(--danger)' : 'var(--danger)') : 'var(--text2)',
                        fontWeight: a ? '700' : '400' }}>
                        {d}
                      </div>
                    )
                  }
                  return days
                })()}
              </div>
              <div style={{ display: 'flex', gap: '16px', marginTop: '12px', fontSize: '13px', justifyContent: 'center' }}>
                <span><span style={{ color: 'var(--success)' }}>●</span> حاضر: {attendance.filter(a => a.status === 'present').length}</span>
                <span><span style={{ color: 'var(--danger)' }}>●</span> غائب: {attendance.filter(a => a.status === 'absent').length}</span>
                <span><span style={{ color: 'var(--warning)' }}>●</span> إجازة: {attendance.filter(a => a.status === 'vacation').length}</span>
                <span><span style={{ color: 'var(--warning)' }}>●</span> مرضى: {attendance.filter(a => a.status === 'sick').length}</span>
              </div>
            </div>}
            {tab === 'salary' && <div>
              <table style={{ fontSize: '13px' }}>
                <thead><tr><th>الشهر</th><th>الأساسي</th><th>الخصومات</th><th>الإضافات</th><th>الصافي</th><th>التاريخ</th><th></th></tr></thead>
                <tbody>
                  {salaryPayments.map(p => (
                    <tr key={p._id}>
                      <td>{p.month}/{p.year}</td><td>{formatMoney(p.baseSalary)}</td>
                      <td style={{ color: 'var(--danger)' }}>{formatMoney(p.totalDeductions)}</td>
                      <td style={{ color: 'var(--success)' }}>{formatMoney(p.totalAdditions)}</td>
                      <td style={{ fontWeight: 'bold' }}>{formatMoney(p.netAmount)}</td>
                      <td>{formatDate(p.paymentDate)}</td>
                      <td><button onClick={() => handlePrintSalary(p)} style={iconBtn('accent')} title="طباعة سند راتب"><PrintIcon size={13} /></button></td>
                    </tr>
                  ))}
                  {salaryPayments.length === 0 && <tr><td colSpan="7" style={{ textAlign: 'center', color: 'var(--text2)' }}>لا توجد رواتب</td></tr>}
                </tbody>
              </table>
            </div>}
            {tab === 'advances' && <div>
              <div style={{ display: 'flex', gap: '16px', marginBottom: '10px', fontSize: '13px', flexWrap: 'wrap' }}>
                <span>إجمالي السلف: <b style={{ color: 'var(--warning)' }}>{formatMoney(advances.filter(a => a.type !== 'deduction').reduce((s, a) => s + a.amount, 0))}</b></span>
                <span>إجمالي الخصومات: <b style={{ color: 'var(--danger)' }}>{formatMoney(advances.filter(a => a.type === 'deduction').reduce((s, a) => s + a.amount, 0))}</b></span>
                <span>إجمالي الإضافات: <b style={{ color: 'var(--success)' }}>{formatMoney(salaryPayments.reduce((s, p) => s + (p.totalAdditions || 0), 0))}</b></span>
              </div>
              <table style={{ fontSize: '13px' }}>
                <thead><tr><th>النوع</th><th>المبلغ</th><th>التاريخ</th><th>البيان</th><th>الحالة</th></tr></thead>
                <tbody>
                  {advances.map(a => (
                    <tr key={a._id}>
                      <td style={{ color: a.type === 'deduction' ? 'var(--danger)' : 'var(--warning)', fontWeight: '600' }}>{a.type === 'deduction' ? 'خصم' : 'سلفة'}</td>
                      <td style={{ color: 'var(--danger)' }}>{formatMoney(a.amount)}</td>
                      <td>{formatDate(a.date)}</td>
                      <td>{a.note || '-'}</td>
                      <td>{a.deducted ? <span style={{ color: 'var(--success)' }}>مخصومة</span> : <span style={{ color: 'var(--text2)' }}>معلقة</span>}</td>
                    </tr>
                  ))}
                  {advances.length === 0 && <tr><td colSpan="5" style={{ textAlign: 'center', color: 'var(--text2)' }}>لا توجد سلف أو خصومات</td></tr>}
                </tbody>
              </table>
            </div>}
            {tab === 'sales' && <div>
              <div style={{ fontSize: '14px', marginBottom: '8px' }}>إجمالي المبيعات: <b style={{ color: 'var(--success)' }}>{formatMoney(totalSales)}</b></div>
              <table style={{ fontSize: '13px' }}>
                <thead><tr><th>رقم الفاتورة</th><th>المبلغ</th><th>طريقة الدفع</th><th>التاريخ</th></tr></thead>
                <tbody>
                  {empSales.slice(0, 50).map(s => (
                    <tr key={s._id}>
                      <td>#{s.invoiceNo}</td><td>{formatMoney(s.paid || s.total)}</td>
                      <td>{s.paymentMethod}</td><td>{formatDate(s.createdAt)}</td>
                    </tr>
                  ))}
                  {empSales.length === 0 && <tr><td colSpan="4" style={{ textAlign: 'center', color: 'var(--text2)' }}>لا توجد مبيعات</td></tr>}
                </tbody>
              </table>
            </div>}
          </>}
        </div>
      </div>
    </div>
  )
}
