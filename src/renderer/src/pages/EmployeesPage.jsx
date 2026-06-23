import { useState, useEffect, useRef } from 'preact/hooks'
import api from '../api'
import Modal from '../components/Modal'
import Pagination from '../components/Pagination'
import { useToast } from '../components/Toast'
import { useStore } from '../store'
import { formatDate } from '../utils/date'
import { formatMoney } from '../utils/money'
import { useConfirm } from '../components/ConfirmModal'
import { iconBtn, headerBtn, secondaryBtn, modalPrimaryBtn, modalSuccessBtn, modalWarningBtn, modalDangerBtn, EditIcon, DeleteIcon, AddIcon, CheckIcon, PaymentIcon, WithdrawIcon, SalaryIcon, HistoryIcon, AttendanceIcon, CloseIcon, AdvanceIcon } from '../components/ActionIcons'

export default function EmployeesPage() {
  const { user } = useStore()
  const toast = useToast()
  const { confirm, ConfirmDialog } = useConfirm()
  const canManage = user?.permissions?.includes('employees.manage')
  const canSalaries = user?.permissions?.includes('employees.salaries')
  const canView = user?.permissions?.includes('employees.view')

  const [employees, setEmployees] = useState([])
  const [search, setSearch] = useState('')
  const [page, setPage] = useState(0)
  const [totalPages, setTotalPages] = useState(0)
  const [total, setTotal] = useState(0)
  const pageSize = 20
  const [showModal, setShowModal] = useState(false)
  const [edit, setEdit] = useState(null)
  const [form, setForm] = useState({ name: '', phone: '', email: '', address: '', photo: '', idPhoto: '', idNumber: '', idExpiryDate: '', jobTitle: '', department: '', salary: '', salaryPeriod: 'شهري', hireDate: '', emergencyContact: '', emergencyPhone: '', notes: '' })
  const [viewEmployee, setViewEmployee] = useState(null)
  const [advances, setAdvances] = useState([])
  const [showAdvanceModal, setShowAdvanceModal] = useState(false)
  const [advanceForm, setAdvanceForm] = useState({ amount: '', note: '', paymentMethod: 'cash' })
  const [showSalaryModal, setShowSalaryModal] = useState(false)
  const [salaryData, setSalaryData] = useState({ baseSalary: 0, totalDeductions: 0, totalAdditions: 0, netAmount: 0, month: new Date().getMonth() + 1, year: new Date().getFullYear(), paymentMethod: 'cash', note: '' })
  const [salaryHistory, setSalaryHistory] = useState([])
  const [showSalaryHistory, setShowSalaryHistory] = useState(false)
  const [attendance, setAttendance] = useState([])
  const [attendanceMonth, setAttendanceMonth] = useState(new Date().getMonth() + 1)
  const [attendanceYear, setAttendanceYear] = useState(new Date().getFullYear())
  const [showAttendance, setShowAttendance] = useState(false)
  const [selectedAttDay, setSelectedAttDay] = useState(0)
  const [selectedEmp, setSelectedEmp] = useState(null)
  const [showDeductionModal, setShowDeductionModal] = useState(false)
  const [deductionForm, setDeductionForm] = useState({ amount: '', note: '' })
  const photoRef = useRef(null)
  const idPhotoRef = useRef(null)
  const nameRef = useRef(null)

  useEffect(() => { load() }, [page, search])
  useEffect(() => { if (viewEmployee) loadAttendance(viewEmployee._id) }, [attendanceMonth, attendanceYear])

  async function load() {
    const token = localStorage.getItem('token')
    const result = await api.listEmployees(token, search, page, pageSize)
    setEmployees(result.data)
    setTotal(result.total)
    setTotalPages(result.totalPages)
  }

  function openAdd() {
    setEdit(null)
    setForm({ name: '', phone: '', email: '', address: '', photo: '', idPhoto: '', idNumber: '', idExpiryDate: '', jobTitle: '', department: '', salary: '', salaryPeriod: 'شهري', hireDate: '', emergencyContact: '', emergencyPhone: '', notes: '', workHours: 12 })
    setShowModal(true)
    setTimeout(() => nameRef.current?.focus(), 50)
  }

  function openEdit(emp) {
    setEdit(emp)
    setForm({
      name: emp.name, phone: emp.phone || '', email: emp.email || '',
      address: emp.address || '', photo: emp.photo || '', idPhoto: emp.idPhoto || '',
      idNumber: emp.idNumber || '', idExpiryDate: emp.idExpiryDate ? emp.idExpiryDate.slice(0, 10) : '',
      jobTitle: emp.jobTitle || '', department: emp.department || '',
      salary: emp.salary || '', salaryPeriod: emp.salaryPeriod || 'شهري',
      hireDate: emp.hireDate ? emp.hireDate.slice(0, 10) : '',
      emergencyContact: emp.emergencyContact || '', emergencyPhone: emp.emergencyPhone || '',
      notes: emp.notes || '', workHours: emp.workHours || 12
    })
    setShowModal(true)
  }

  async function handleSave(e) {
    e.preventDefault()
    if (!form.name.trim()) { toast('الرجاء إدخال اسم الموظف', 'error'); return }
    if (!form.salary || Number(form.salary) <= 0) { toast('الرجاء إدخال الراتب', 'error'); return }
    const token = localStorage.getItem('token')
    try {
      await api.saveEmployee(token, { ...form, _id: edit?._id, salary: Number(form.salary) || 0 })
      toast(edit ? 'تم تحديث الموظف' : 'تمت إضافة الموظف', 'success')
      setShowModal(false)
      load()
      window.dispatchEvent(new Event('dataChanged'))
    } catch (err) { toast(err.message, 'error') }
  }

  async function handleRemove(emp) {
    if (!await confirm(`حذف "${emp.name}"؟`)) return
    const token = localStorage.getItem('token')
    try {
      await api.removeEmployee(token, emp._id)
      toast('تم حذف الموظف', 'success')
      load()
    } catch (err) { toast(err.message, 'error') }
  }

  function openView(emp) {
    setViewEmployee(emp)
    setSelectedEmp(emp)
    loadAdvances(emp._id)
    loadSalaryHistory(emp._id)
    setShowAttendance(false)
  }

  async function loadAdvances(empId) {
    const token = localStorage.getItem('token')
    const data = await api.listEmployeeAdvances(token, empId)
    setAdvances(data)
  }

  async function handleSaveAdvance(e) {
    e.preventDefault()
    if (!advanceForm.amount || Number(advanceForm.amount) <= 0) { toast('الرجاء إدخال مبلغ السلفة', 'error'); return }
    const token = localStorage.getItem('token')
    try {
      await api.saveEmployeeAdvance(token, {
        employeeId: selectedEmp._id,
        employeeName: selectedEmp.name,
        amount: Number(advanceForm.amount),
        type: 'advance',
        paymentMethod: advanceForm.paymentMethod,
        note: advanceForm.note
      })
      toast('تم تسجيل السلفة', 'success')
      setShowAdvanceModal(false)
      setAdvanceForm({ amount: '', note: '' })
      loadAdvances(selectedEmp._id)
    } catch (err) { toast(err.message, 'error') }
  }

  async function handleSaveDeduction(e) {
    e.preventDefault()
    if (!deductionForm.amount || Number(deductionForm.amount) <= 0) { toast('الرجاء إدخال مبلغ الخصم', 'error'); return }
    const token = localStorage.getItem('token')
    try {
      await api.saveEmployeeAdvance(token, {
        employeeId: selectedEmp._id,
        employeeName: selectedEmp.name,
        amount: Number(deductionForm.amount),
        type: 'deduction',
        note: deductionForm.note
      })
      toast('تم تسجيل الخصم', 'success')
      setShowDeductionModal(false)
      setDeductionForm({ amount: '', note: '' })
      loadAdvances(selectedEmp._id)
    } catch (err) { toast(err.message, 'error') }
  }

  async function openPaySalary(emp) {
    const token = localStorage.getItem('token')
    const att = await api.listEmployeeAttendance(token, emp._id, salaryData.month, salaryData.year)
    const absences = att.filter(a => a.status === 'absent').length
    const advances = await api.listEmployeeAdvances(token, emp._id)
    const undeducted = advances.filter(a => !a.deducted).reduce((s, a) => s + a.amount, 0)
    const dailyRate = emp.salaryPeriod === 'شهري' ? Math.round(emp.salary / 30) : emp.salaryPeriod === 'أسبوعي' ? Math.round(emp.salary / 7) : emp.salary
    const absenceDeduction = absences * dailyRate
    setSelectedEmp(emp)
    setSalaryData({
      baseSalary: emp.salary,
      totalDeductions: undeducted + absenceDeduction,
      totalAdditions: 0,
      netAmount: Math.max(0, emp.salary - undeducted - absenceDeduction),
      month: salaryData.month,
      year: salaryData.year,
      paymentMethod: 'cash',
      note: `راتب ${emp.salaryPeriod === 'شهري' ? 'شهر' : ''} ${salaryData.month}/${salaryData.year}` + (absences > 0 ? ` - غياب ${absences} يوم (${formatMoney(absenceDeduction)})` : '')
    })
    setShowSalaryModal(true)
  }

  async function handlePaySalary(e) {
    e.preventDefault()
    if (!salaryData.netAmount || Number(salaryData.netAmount) <= 0) { toast('صافي الراتب يجب أن يكون أكبر من صفر', 'error'); return }
    const token = localStorage.getItem('token')
    const existingPayments = await api.listEmployeeSalaryPayments(token, selectedEmp._id)
    const alreadyPaid = existingPayments.some(p => p.month === salaryData.month && p.year === salaryData.year)
    if (alreadyPaid) {
      if (!await confirm(`الموظف "${selectedEmp.name}" استلم راتبه بالفعل عن شهر ${salaryData.month}/${salaryData.year}\nهل تريد صرف الراتب مرة أخرى؟`)) return
    }
    try {
      await api.payEmployeeSalary(token, {
        employeeId: selectedEmp._id,
        employeeName: selectedEmp.name,
        ...salaryData
      })
      toast('تم صرف الراتب', 'success')
      setShowSalaryModal(false)
      loadAdvances(selectedEmp._id)
      loadSalaryHistory(selectedEmp._id)
    } catch (err) { toast(err.message, 'error') }
  }

  async function loadSalaryHistory(empId) {
    const token = localStorage.getItem('token')
    const data = await api.listEmployeeSalaryPayments(token, empId)
    setSalaryHistory(data)
  }

  async function loadAttendance(empId) {
    const token = localStorage.getItem('token')
    const data = await api.listEmployeeAttendance(token, empId, attendanceMonth, attendanceYear)
    setAttendance(data)
    setShowAttendance(true)
  }

  async function saveAttendanceStatus(empId, date, status) {
    const token = localStorage.getItem('token')
    try {
      await api.saveEmployeeAttendance(token, { employeeId: empId, date, status })
      setSelectedAttDay(0)
      await loadAttendance(empId)
    } catch (err) { toast(err.message, 'error') }
  }

  function handleSearch(v) { setSearch(v); setPage(0) }

  if (!canView) return <div style={{ padding: '20px', color: 'var(--text2)' }}>ليس لديك صلاحية</div>

  return (
    <div style={{ padding: '20px', overflow: 'auto', height: '100%' }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '16px' }}>
        <h1 style={{ fontSize: '20px' }}>الموظفون ({total})</h1>
        <div style={{ display: 'flex', gap: '8px' }}>
          <input placeholder="بحث..." value={search} onInput={e => handleSearch(e.target.value)}
            style={{ width: '250px' }} />
          {canManage && <button onClick={openAdd} style={headerBtn}><AddIcon size={16} /> إضافة موظف</button>}
        </div>
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(280px, 1fr))', gap: '12px' }}>
        {employees.map(emp => (
          <div key={emp._id} style={{
            background: 'var(--bg2)', borderRadius: '14px', padding: '16px',
            border: '1px solid var(--outline)', boxShadow: 'var(--elevation-1)',
            transition: 'all 0.2s', display: 'flex', flexDirection: 'column', gap: '10px', cursor: 'pointer'
          }}
            onClick={() => openView(emp)}
            onMouseEnter={e => { e.currentTarget.style.boxShadow = 'var(--elevation-2)'; e.currentTarget.style.borderColor = 'var(--accent)' }}
            onMouseLeave={e => { e.currentTarget.style.boxShadow = 'var(--elevation-1)'; e.currentTarget.style.borderColor = 'var(--outline)' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
              <div style={{ width: '44px', height: '44px', borderRadius: '50%', background: 'var(--bg3)', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0, overflow: 'hidden' }}>
                {emp.photo ? <img src={emp.photo} alt="" style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
                  : <svg viewBox="0 0 24 24" fill="none" stroke="var(--text2)" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" width="22" height="22"><path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2"/><circle cx="9" cy="7" r="4"/></svg>}
              </div>
              <div style={{ flex: 1 }}>
                <div style={{ fontSize: '14px', fontWeight: 'bold', color: 'var(--text)' }}>{emp.name}</div>
                <div style={{ fontSize: '12px', color: 'var(--text2)' }}>{emp.jobTitle || emp.phone || '-'}</div>
              </div>
            </div>
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '6px', background: 'var(--bg)', borderRadius: '10px', padding: '10px' }}>
              <div style={{ textAlign: 'center' }}>
                <div style={{ fontSize: '10px', color: 'var(--text2)' }}>الراتب</div>
                <div style={{ fontSize: '14px', fontWeight: 'bold', color: 'var(--success)' }}>{formatMoney(emp.salary)}</div>
              </div>
              <div style={{ textAlign: 'center' }}>
                <div style={{ fontSize: '10px', color: 'var(--text2)' }}>المدة</div>
                <div style={{ fontSize: '14px', fontWeight: 'bold', color: 'var(--accent)' }}>{emp.salaryPeriod}</div>
              </div>
            </div>
            <div style={{ display: 'flex', gap: '4px', justifyContent: 'center' }}>
              {canManage && <button onClick={e => { e.stopPropagation(); openEdit(emp) }} title="تعديل" style={iconBtn('warning')}><EditIcon size={13} /></button>}
              {canManage && <button onClick={e => { e.stopPropagation(); handleRemove(emp) }} title="حذف" style={iconBtn('danger')}><DeleteIcon size={13} /></button>}
            </div>
          </div>
        ))}
        {employees.length === 0 && (
          <div style={{ gridColumn: '1 / -1', padding: '32px', color: 'var(--text2)', textAlign: 'center' }}>لا يوجد موظفون</div>
        )}
      </div>
      <Pagination page={page} totalPages={totalPages} total={total} pageSize={pageSize} onChange={setPage} />

      {/* Add/Edit Modal */}
      <Modal open={showModal} onClose={() => setShowModal(false)} title={edit ? 'تعديل موظف' : 'إضافة موظف'} width="780px">
        <form onSubmit={handleSave} style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
          <div style={{ display: 'flex', gap: '12px', alignItems: 'start' }}>
            <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
              <div onClick={() => photoRef.current?.click()} style={{ width: '120px', height: '120px', borderRadius: '12px', border: '2px dashed var(--bg3)', display: 'flex', alignItems: 'center', justifyContent: 'center', cursor: 'pointer', overflow: 'hidden', background: 'var(--bg)', fontSize: '11px', color: 'var(--text2)', textAlign: 'center' }}>
                {form.photo ? <img src={form.photo} alt="" style={{ width: '100%', height: '100%', objectFit: 'cover' }} /> : 'صورة شخصية'}
                <input ref={photoRef} type="file" accept="image/*" style={{ display: 'none' }} onChange={e => { const f = e.target.files?.[0]; if (!f) return; const r = new FileReader(); r.onload = () => setForm(x => ({ ...x, photo: r.result })); r.readAsDataURL(f) }} />
              </div>
              <div onClick={() => idPhotoRef.current?.click()} style={{ width: '120px', height: '120px', borderRadius: '12px', border: '2px dashed var(--bg3)', display: 'flex', alignItems: 'center', justifyContent: 'center', cursor: 'pointer', overflow: 'hidden', background: 'var(--bg)', fontSize: '11px', color: 'var(--text2)', textAlign: 'center' }}>
                {form.idPhoto ? <img src={form.idPhoto} alt="" style={{ width: '100%', height: '100%', objectFit: 'cover' }} /> : 'صورة إثبات الشخصية'}
                <input ref={idPhotoRef} type="file" accept="image/*" style={{ display: 'none' }} onChange={e => { const f = e.target.files?.[0]; if (!f) return; const r = new FileReader(); r.onload = () => setForm(x => ({ ...x, idPhoto: r.result })); r.readAsDataURL(f) }} />
              </div>
            </div>
            <div style={{ flex: 1, display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '10px' }}>
              <div><label style={{ fontSize: '11px', color: 'var(--text2)', display: 'block', marginBottom: '4px' }}>الاسم *</label><input ref={nameRef} value={form.name} onInput={e => setForm(f => ({ ...f, name: e.target.value }))} required style={{ width: '100%' }} /></div>
              <div><label style={{ fontSize: '11px', color: 'var(--text2)', display: 'block', marginBottom: '4px' }}>التلفون</label><input value={form.phone} onInput={e => setForm(f => ({ ...f, phone: e.target.value }))} style={{ width: '100%' }} /></div>
              <div><label style={{ fontSize: '11px', color: 'var(--text2)', display: 'block', marginBottom: '4px' }}>البريد</label><input type="email" value={form.email} onInput={e => setForm(f => ({ ...f, email: e.target.value }))} style={{ width: '100%' }} /></div>
              <div><label style={{ fontSize: '11px', color: 'var(--text2)', display: 'block', marginBottom: '4px' }}>الوظيفة</label><input value={form.jobTitle} onInput={e => setForm(f => ({ ...f, jobTitle: e.target.value }))} style={{ width: '100%' }} /></div>
              <div><label style={{ fontSize: '11px', color: 'var(--text2)', display: 'block', marginBottom: '4px' }}>القسم</label><input value={form.department} onInput={e => setForm(f => ({ ...f, department: e.target.value }))} style={{ width: '100%' }} /></div>
              <div><label style={{ fontSize: '11px', color: 'var(--text2)', display: 'block', marginBottom: '4px' }}>الراتب *</label><input type="number" step="any" value={form.salary} onInput={e => setForm(f => ({ ...f, salary: e.target.value }))} style={{ width: '100%' }} /></div>
              <div><label style={{ fontSize: '11px', color: 'var(--text2)', display: 'block', marginBottom: '4px' }}>مدة الراتب</label><div style={{ display: 'flex', gap: '6px' }}>
                {['شهري','أسبوعي','يومي'].map(p => (
                  <button key={p} type="button" onClick={() => setForm(f => ({ ...f, salaryPeriod: p }))}
                    style={{
                      flex: 1, padding: '10px', borderRadius: '8px', fontSize: '13px', fontWeight: 'bold',
                      background: form.salaryPeriod === p ? 'var(--accent)' : 'var(--bg3)',
                      color: form.salaryPeriod === p ? '#fff' : 'var(--text)'
                    }}>{p}</button>
                ))}
              </div></div>
              <div><label style={{ fontSize: '11px', color: 'var(--text2)', display: 'block', marginBottom: '4px' }}>رقم إثبات الشخصية</label><input value={form.idNumber} onInput={e => setForm(f => ({ ...f, idNumber: e.target.value }))} style={{ width: '100%' }} /></div>
              <div><label style={{ fontSize: '11px', color: 'var(--text2)', display: 'block', marginBottom: '4px' }}>تاريخ انتهاء الإثبات</label><input type="date" value={form.idExpiryDate} onInput={e => setForm(f => ({ ...f, idExpiryDate: e.target.value }))} style={{ width: '100%' }} /></div>
              <div><label style={{ fontSize: '11px', color: 'var(--text2)', display: 'block', marginBottom: '4px' }}>تاريخ التعيين</label><input type="date" value={form.hireDate} onInput={e => setForm(f => ({ ...f, hireDate: e.target.value }))} style={{ width: '100%' }} /></div>
              <div><label style={{ fontSize: '11px', color: 'var(--text2)', display: 'block', marginBottom: '4px' }}>جهة الطوارئ</label><input value={form.emergencyContact} onInput={e => setForm(f => ({ ...f, emergencyContact: e.target.value }))} style={{ width: '100%' }} /></div>
              <div><label style={{ fontSize: '11px', color: 'var(--text2)', display: 'block', marginBottom: '4px' }}>تلفون الطوارئ</label><input value={form.emergencyPhone} onInput={e => setForm(f => ({ ...f, emergencyPhone: e.target.value }))} style={{ width: '100%' }} /></div>
              <div><label style={{ fontSize: '11px', color: 'var(--text2)', display: 'block', marginBottom: '4px' }}>العنوان</label><input value={form.address} onInput={e => setForm(f => ({ ...f, address: e.target.value }))} style={{ width: '100%' }} /></div>
              <div><label style={{ fontSize: '11px', color: 'var(--text2)', display: 'block', marginBottom: '4px' }}>ساعات العمل</label>
                <div style={{ display: 'flex', gap: '6px', flexWrap: 'wrap', alignItems: 'center' }}>
                  {[4,6,8,12].map(h => (
                    <button key={h} type="button" onClick={() => setForm(f => ({ ...f, workHours: h }))}
                      style={{
                        flex: 1, padding: '10px', borderRadius: '8px', fontSize: '13px', fontWeight: 'bold', minWidth: '60px',
                        background: form.workHours === h ? 'var(--accent)' : 'var(--bg3)',
                        color: form.workHours === h ? '#fff' : 'var(--text)',
                        border: 'none', cursor: 'pointer'
                      }}>
                      {h} ساعات
                    </button>
                  ))}
                  <button type="button" onClick={() => setForm(f => ({ ...f, workHours: '' }))}
                    style={{
                      flex: 1, padding: '10px', borderRadius: '8px', fontSize: '13px', fontWeight: 'bold', minWidth: '60px',
                      background: ![4,6,8,12].includes(form.workHours) && form.workHours !== '' ? 'var(--accent)' : 'var(--bg3)',
                      color: ![4,6,8,12].includes(form.workHours) && form.workHours !== '' ? '#fff' : 'var(--text)',
                      border: 'none', cursor: 'pointer'
                    }}>
                    أخرى
                  </button>
                  {![4,6,8,12].includes(form.workHours) && <input type="number" step="any" value={form.workHours} onInput={e => setForm(f => ({ ...f, workHours: Number(e.target.value) }))} style={{ width: '70px' }} />}
                </div>
              </div>
            </div>
          </div>
          <div style={{ display: 'flex', gap: '10px' }}>
            <div style={{ flex: 1 }}><label style={{ fontSize: '11px', color: 'var(--text2)', display: 'block', marginBottom: '4px' }}>ملاحظات</label><textarea value={form.notes} onInput={e => setForm(f => ({ ...f, notes: e.target.value }))} style={{ width: '100%', resize: 'vertical' }} rows="2" /></div>
          </div>
          <button type="submit" style={modalPrimaryBtn}><CheckIcon size={16} /> {edit ? 'تحديث' : 'إضافة'}</button>
        </form>
      </Modal>

      {/* View Employee Modal */}
      <Modal open={!!viewEmployee} onClose={() => setViewEmployee(null)} title={viewEmployee?.name || ''} width="650px">
        {viewEmployee && <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
          <div style={{ display: 'flex', gap: '16px', alignItems: 'start' }}>
            {viewEmployee.photo && <img src={viewEmployee.photo} alt="" style={{ width: '120px', height: '120px', borderRadius: '12px', objectFit: 'cover' }} />}
            {viewEmployee.idPhoto && <img src={viewEmployee.idPhoto} alt="" style={{ width: '120px', height: '120px', borderRadius: '12px', objectFit: 'cover' }} />}
          </div>
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '8px', fontSize: '13px' }}>
            <div><span style={{ color: 'var(--text2)' }}>الوظيفة: </span>{viewEmployee.jobTitle || '-'}</div>
            <div><span style={{ color: 'var(--text2)' }}>القسم: </span>{viewEmployee.department || '-'}</div>
            <div><span style={{ color: 'var(--text2)' }}>التلفون: </span>{viewEmployee.phone || '-'}</div>
            <div><span style={{ color: 'var(--text2)' }}>البريد: </span>{viewEmployee.email || '-'}</div>
            <div><span style={{ color: 'var(--text2)' }}>الراتب: </span><b style={{ color: 'var(--success)' }}>{formatMoney(viewEmployee.salary)}</b> / {viewEmployee.salaryPeriod}</div>
            <div><span style={{ color: 'var(--text2)' }}>تاريخ التعيين: </span>{viewEmployee.hireDate ? formatDate(viewEmployee.hireDate) : '-'}</div>
            <div><span style={{ color: 'var(--text2)' }}>رقم إثبات الشخصية: </span>{viewEmployee.idNumber || '-'}</div>
             <div><span style={{ color: 'var(--text2)' }}>انتهاء الإثبات: </span>{viewEmployee.idExpiryDate ? formatDate(viewEmployee.idExpiryDate) : '-'}</div>
            <div><span style={{ color: 'var(--text2)' }}>جهة الطوارئ: </span>{viewEmployee.emergencyContact || '-'}</div>
            <div><span style={{ color: 'var(--text2)' }}>تلفون الطوارئ: </span>{viewEmployee.emergencyPhone || '-'}</div>
            <div><span style={{ color: 'var(--text2)' }}>ساعات العمل: </span>{viewEmployee.workHours || 12} ساعة</div>
          </div>
          {viewEmployee.address && <div style={{ fontSize: '13px', color: 'var(--text2)' }}>العنوان: {viewEmployee.address}</div>}
          {viewEmployee.notes && <div style={{ fontSize: '13px', color: 'var(--text2)' }}>ملاحظات: {viewEmployee.notes}</div>}

          <div style={{ display: 'flex', gap: '8px', flexWrap: 'wrap' }}>
            {canManage && <button onClick={() => setShowAdvanceModal(true)} style={{ ...secondaryBtn, background: 'var(--warning)', color: '#fff', padding: '8px 16px', borderRadius: '8px', fontSize: '12px', fontWeight: 'bold' }}><AdvanceIcon size={14} /> سلفة</button>}
            {canManage && <button onClick={() => setShowDeductionModal(true)} style={{ ...secondaryBtn, background: 'var(--danger)', color: '#fff', padding: '8px 16px', borderRadius: '8px', fontSize: '12px', fontWeight: 'bold' }}><WithdrawIcon size={14} /> خصم</button>}
            {canSalaries && <button onClick={() => openPaySalary(viewEmployee)} style={{ ...secondaryBtn, background: 'var(--success)', color: '#fff', padding: '8px 16px', borderRadius: '8px', fontSize: '12px', fontWeight: 'bold' }}><SalaryIcon size={14} /> صرف راتب</button>}
            <button onClick={() => { loadSalaryHistory(viewEmployee._id); setShowSalaryHistory(true) }} style={secondaryBtn}><HistoryIcon size={14} /> سجل الرواتب</button>
            <button onClick={() => loadAttendance(viewEmployee._id)} style={secondaryBtn}><AttendanceIcon size={14} /> الحضور</button>
          </div>

          {/* Advances + Deductions List */}
          <div>
            <h3 style={{ fontSize: '14px', marginBottom: '8px' }}>السلف والخصومات</h3>
            <div style={{ maxHeight: '160px', overflow: 'auto' }}>
              <table style={{ fontSize: '12px' }}>
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
                  {advances.length === 0 && <tr><td colSpan="5" style={{ color: 'var(--text2)', textAlign: 'center' }}>لا توجد سلف أو خصومات</td></tr>}
                </tbody>
              </table>
            </div>
          </div>

          {/* Advance Modal */}
          <Modal open={showAdvanceModal} onClose={() => setShowAdvanceModal(false)} title="سلفة جديدة" width="350px">
            <form onSubmit={handleSaveAdvance} style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
              <div><label style={{ fontSize: '11px', color: 'var(--text2)', display: 'block', marginBottom: '4px' }}>المبلغ</label><input type="number" step="any" value={advanceForm.amount} onInput={e => setAdvanceForm(f => ({ ...f, amount: e.target.value }))} required style={{ width: '100%' }} /></div>
              <div><label style={{ fontSize: '11px', color: 'var(--text2)', display: 'block', marginBottom: '4px' }}>من الخزنة</label>
                <div style={{ display: 'flex', gap: '6px' }}>
                  {['cash','card'].map(m => (
                    <button key={m} type="button" onClick={() => setAdvanceForm(f => ({ ...f, paymentMethod: m }))}
                      style={{
                        flex: 1, padding: '10px', borderRadius: '8px', fontSize: '13px', fontWeight: 'bold',
                        background: advanceForm.paymentMethod === m
                          ? (m === 'cash' ? 'var(--success)' : 'var(--accent)')
                          : 'var(--bg3)',
                        color: advanceForm.paymentMethod === m ? '#fff' : 'var(--text)'
                      }}>
                      {m === 'cash' ? 'نقداً' : 'بطاقة'}
                    </button>
                  ))}
                </div></div>
              <div><label style={{ fontSize: '11px', color: 'var(--text2)', display: 'block', marginBottom: '4px' }}>البيان</label><input value={advanceForm.note} onInput={e => setAdvanceForm(f => ({ ...f, note: e.target.value }))} style={{ width: '100%' }} /></div>
              <button type="submit" style={modalWarningBtn}><AdvanceIcon size={16} /> تسجيل السلفة</button>
            </form>
          </Modal>

          {/* Deduction Modal */}
          <Modal open={showDeductionModal} onClose={() => setShowDeductionModal(false)} title="خصم جديد" width="350px">
            <form onSubmit={handleSaveDeduction} style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
              <div><label style={{ fontSize: '11px', color: 'var(--text2)', display: 'block', marginBottom: '4px' }}>المبلغ</label><input type="number" step="any" value={deductionForm.amount} onInput={e => setDeductionForm(f => ({ ...f, amount: e.target.value }))} required style={{ width: '100%' }} /></div>
              <div><label style={{ fontSize: '11px', color: 'var(--text2)', display: 'block', marginBottom: '4px' }}>السبب</label><input value={deductionForm.note} onInput={e => setDeductionForm(f => ({ ...f, note: e.target.value }))} style={{ width: '100%' }} /></div>
              <button type="submit" style={modalDangerBtn}><WithdrawIcon size={16} /> تسجيل الخصم</button>
            </form>
          </Modal>

          {/* Salary Payment Modal */}
          <Modal open={showSalaryModal} onClose={() => setShowSalaryModal(false)} title={`صرف راتب ${selectedEmp?.name}`} width="400px">
            <form onSubmit={handlePaySalary} style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '10px' }}>
                <div><label style={{ fontSize: '11px', color: 'var(--text2)', display: 'block', marginBottom: '4px' }}>الشهر</label>
                  <select value={salaryData.month} onChange={e => setSalaryData(f => ({ ...f, month: Number(e.target.value) }))} style={{ width: '100%', background: 'var(--bg)', color: 'var(--text)', border: '1px solid var(--bg3)', borderRadius: '8px', padding: '8px' }}>
                    {[1,2,3,4,5,6,7,8,9,10,11,12].map(m => <option key={m} value={m}>{m}</option>)}
                  </select></div>
                <div><label style={{ fontSize: '11px', color: 'var(--text2)', display: 'block', marginBottom: '4px' }}>السنة</label><input type="number" step="any" value={salaryData.year} onInput={e => setSalaryData(f => ({ ...f, year: Number(e.target.value) }))} style={{ width: '100%' }} /></div>
              </div>
              <div><label style={{ fontSize: '11px', color: 'var(--text2)', display: 'block', marginBottom: '4px' }}>الراتب الأساسي</label><input type="number" step="any" value={salaryData.baseSalary} onInput={e => setSalaryData(f => ({ ...f, baseSalary: Number(e.target.value), netAmount: Math.max(0, Number(e.target.value) - f.totalDeductions + f.totalAdditions) }))} style={{ width: '100%' }} /></div>
              <div><label style={{ fontSize: '11px', color: 'var(--text2)', display: 'block', marginBottom: '4px' }}>الخصومات (سلف + غياب + غيره)</label><input type="number" step="any" value={salaryData.totalDeductions} onInput={e => setSalaryData(f => ({ ...f, totalDeductions: Number(e.target.value), netAmount: Math.max(0, f.baseSalary - Number(e.target.value) + f.totalAdditions) }))} style={{ width: '100%' }} /></div>
              <div><label style={{ fontSize: '11px', color: 'var(--text2)', display: 'block', marginBottom: '4px' }}>الإضافات</label><input type="number" step="any" value={salaryData.totalAdditions} onInput={e => setSalaryData(f => ({ ...f, totalAdditions: Number(e.target.value), netAmount: Math.max(0, f.baseSalary - f.totalDeductions + Number(e.target.value)) }))} style={{ width: '100%' }} /></div>
              <div><label style={{ fontSize: '11px', color: 'var(--text2)', display: 'block', marginBottom: '4px' }}>الصافي</label><div style={{ fontSize: '18px', fontWeight: 'bold', color: 'var(--success)', padding: '8px', background: 'var(--bg)', borderRadius: '8px' }}>{formatMoney(salaryData.netAmount)}</div></div>
              <div><label style={{ fontSize: '11px', color: 'var(--text2)', display: 'block', marginBottom: '4px' }}>طريقة الدفع</label>
                <div style={{ display: 'flex', gap: '6px' }}>
                  {['cash','card'].map(m => (
                    <button key={m} type="button" onClick={() => setSalaryData(f => ({ ...f, paymentMethod: m }))}
                      style={{
                        flex: 1, padding: '10px', borderRadius: '8px', fontSize: '13px', fontWeight: 'bold',
                        background: salaryData.paymentMethod === m
                          ? (m === 'cash' ? 'var(--success)' : 'var(--accent)')
                          : 'var(--bg3)',
                        color: salaryData.paymentMethod === m ? '#fff' : 'var(--text)'
                      }}>
                      {m === 'cash' ? 'نقداً' : 'بطاقة'}
                    </button>
                  ))}
                </div></div>
              <div><label style={{ fontSize: '11px', color: 'var(--text2)', display: 'block', marginBottom: '4px' }}>البيان</label><input value={salaryData.note} onInput={e => setSalaryData(f => ({ ...f, note: e.target.value }))} style={{ width: '100%' }} /></div>
              <button type="submit" style={modalSuccessBtn}><SalaryIcon size={16} /> صرف الراتب</button>
            </form>
          </Modal>

          {/* Salary History Modal */}
          <Modal open={showSalaryHistory} onClose={() => setShowSalaryHistory(false)} title={`سجل رواتب ${viewEmployee?.name}`} width="700px">
            <div style={{ maxHeight: '300px', overflow: 'auto' }}>
              <table style={{ fontSize: '12px' }}>
                <thead><tr><th>الشهر</th><th>الأساسي</th><th>الخصومات</th><th>الإضافات</th><th>الصافي</th><th>طريقة الدفع</th><th>التاريخ</th></tr></thead>
                <tbody>
                  {salaryHistory.map(p => (
                    <tr key={p._id}>
                      <td>{p.month}/{p.year}</td>
                      <td>{formatMoney(p.baseSalary)}</td>
                      <td style={{ color: 'var(--danger)' }}>{formatMoney(p.totalDeductions)}</td>
                      <td style={{ color: 'var(--success)' }}>{formatMoney(p.totalAdditions)}</td>
                      <td style={{ fontWeight: 'bold' }}>{formatMoney(p.netAmount)}</td>
                      <td>{p.paymentMethod}</td>
                      <td>{formatDate(p.paymentDate)}</td>
                    </tr>
                  ))}
                  {salaryHistory.length === 0 && <tr><td colSpan="7" style={{ textAlign: 'center', color: 'var(--text2)' }}>لا توجد رواتب سابقة</td></tr>}
                </tbody>
              </table>
            </div>
          </Modal>

          {/* Attendance Modal */}
          <Modal open={showAttendance} onClose={() => { setShowAttendance(false); setSelectedAttDay(0) }} title={`سجل الحضور - ${viewEmployee?.name}`} width="620px">
            <div style={{ display: 'flex', gap: '8px', marginBottom: '10px' }}>
              <select value={attendanceMonth} onChange={e => { setAttendanceMonth(Number(e.target.value)); }} style={{ background: 'var(--bg)', color: 'var(--text)', border: '1px solid var(--bg3)', borderRadius: '8px', padding: '6px' }}>
                {[1,2,3,4,5,6,7,8,9,10,11,12].map(m => <option key={m} value={m}>{m}</option>)}
              </select>
              <input type="number" step="any" value={attendanceYear} onInput={e => { setAttendanceYear(Number(e.target.value)); }} style={{ width: '80px' }} />
            </div>
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(7, 1fr)', gap: '4px', direction: 'ltr' }}>
              {['ح', 'ن', 'ث', 'ر', 'خ', 'ج', 'س'].map(d => (
                <div key={d} style={{ textAlign: 'center', fontSize: '10px', color: 'var(--text2)', fontWeight: '600', padding: '4px 0' }}>{d}</div>
              ))}
              {(() => {
                const daysInMonth = new Date(attendanceYear, attendanceMonth, 0).getDate()
                const firstDay = new Date(attendanceYear, attendanceMonth - 1, 1).getDay()
                const days = []
                const attMap = {}
                const todayStr = new Date().toISOString().slice(0, 10)
                attendance.forEach(a => { const d = new Date(a.date).getUTCDate(); attMap[d] = a })
                for (let i = 0; i < firstDay; i++) days.push(<div key={`e${i}`} />)
                for (let d = 1; d <= daysInMonth; d++) {
                  const a = attMap[d]
                  const isSelected = selectedAttDay === d
                  const dateStr = `${attendanceYear}-${String(attendanceMonth).padStart(2,'0')}-${String(d).padStart(2,'0')}`
                  const isFuture = dateStr > todayStr
                  const bg = a ? (a.status === 'present' ? 'rgba(16,185,129,0.2)' : a.status === 'vacation' ? 'rgba(245,158,11,0.2)' : a.status === 'sick' ? 'rgba(239,68,68,0.2)' : 'rgba(239,68,68,0.15)') : isFuture ? 'var(--bg)' : 'var(--bg3)'
                  const color = a ? (a.status === 'present' ? 'var(--success)' : a.status === 'vacation' ? 'var(--warning)' : a.status === 'sick' ? 'var(--danger)' : 'var(--danger)') : isFuture ? 'var(--text3)' : 'var(--text2)'
                  days.push(
                    <div key={d} style={{ opacity: isFuture ? 0.4 : 1 }}>
                      <div onClick={() => canManage && !isFuture && setSelectedAttDay(isSelected ? 0 : d)}
                        style={{ width: '100%', aspectRatio: '1', borderRadius: '8px', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '12px', cursor: canManage && !isFuture ? 'pointer' : 'default', background: bg, color, fontWeight: a ? '700' : '400', outline: isSelected ? '2px solid var(--accent)' : 'none' }}>
                        {d}
                      </div>
                    </div>
                  )
                }
                return days
              })()}
            </div>
            {selectedAttDay > 0 && canManage && (() => {
              const monthStr = String(attendanceMonth).padStart(2, '0')
              const dayStr = String(selectedAttDay).padStart(2, '0')
              const dateStr = `${attendanceYear}-${monthStr}-${dayStr}`
              return (
                <div style={{ position: 'fixed', inset: 0, display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 1100 }}>
                  <div onClick={e => { e.stopPropagation(); setSelectedAttDay(0) }} style={{ position: 'absolute', inset: 0, background: 'rgba(0,0,0,0.3)' }} />
                  <div onClick={e => e.stopPropagation()} style={{ position: 'relative', background: 'var(--bg2)', border: '1px solid var(--outline)', borderRadius: '12px', padding: '20px', textAlign: 'center', boxShadow: '0 8px 32px rgba(0,0,0,0.4)', minWidth: '220px' }}>
                    <div style={{ fontSize: '14px', color: 'var(--text2)', marginBottom: '10px' }}>{dateStr}</div>
                    <div style={{ display: 'flex', gap: '8px', justifyContent: 'center', flexWrap: 'wrap' }}>
                      <button onClick={() => saveAttendanceStatus(viewEmployee._id, dateStr, 'present')} style={{ background: 'rgba(16,185,129,0.2)', color: 'var(--success)', padding: '8px 14px', borderRadius: '6px', fontSize: '12px', fontWeight: 'bold' }}>حاضر</button>
                      <button onClick={() => saveAttendanceStatus(viewEmployee._id, dateStr, 'absent')} style={{ background: 'rgba(239,68,68,0.15)', color: 'var(--danger)', padding: '8px 14px', borderRadius: '6px', fontSize: '12px', fontWeight: 'bold' }}>غائب</button>
                      <button onClick={() => saveAttendanceStatus(viewEmployee._id, dateStr, 'vacation')} style={{ background: 'rgba(245,158,11,0.2)', color: 'var(--warning)', padding: '8px 14px', borderRadius: '6px', fontSize: '12px', fontWeight: 'bold' }}>إجازة</button>
                      <button onClick={() => saveAttendanceStatus(viewEmployee._id, dateStr, 'sick')} style={{ background: 'rgba(239,68,68,0.2)', color: 'var(--warning)', padding: '8px 14px', borderRadius: '6px', fontSize: '12px', fontWeight: 'bold' }}>مرضى</button>
                      <button onClick={async () => { try { await api.removeEmployeeAttendance(localStorage.getItem('token'), { employeeId: viewEmployee._id, date: dateStr }); setSelectedAttDay(0); loadAttendance(viewEmployee._id) } catch (e) { toast(e.message, 'error') } }} style={{ background: 'transparent', color: 'var(--text2)', padding: '8px 14px', borderRadius: '6px', fontSize: '12px' }}>لا شئ</button>
                    </div>
                    <div style={{ marginTop: '10px' }}>
                      <button onClick={() => setSelectedAttDay(0)} style={secondaryBtn}><CloseIcon size={14} /> إغلاق</button>
                    </div>
                  </div>
                </div>
              )
            })()}
            <div style={{ display: 'flex', gap: '16px', marginTop: '12px', fontSize: '12px', justifyContent: 'center' }}>
              <span><span style={{ color: 'var(--success)' }}>●</span> حاضر ({attendance.filter(a => a.status === 'present').length})</span>
              <span><span style={{ color: 'var(--danger)' }}>●</span> غائب ({attendance.filter(a => a.status === 'absent').length})</span>
              <span><span style={{ color: 'var(--warning)' }}>●</span> إجازة ({attendance.filter(a => a.status === 'vacation').length})</span>
              <span><span style={{ color: 'var(--warning)' }}>●</span> مرضى ({attendance.filter(a => a.status === 'sick').length})</span>
            </div>
          </Modal>
        </div>}
      </Modal>

      <ConfirmDialog />
    </div>
  )
}
