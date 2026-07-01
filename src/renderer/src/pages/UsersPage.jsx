import { useState, useEffect } from 'preact/hooks'
import api from '../api'
import Modal from '../components/Modal'
import { useToast } from '../components/Toast'
import { useStore } from '../store'
import { useConfirm } from '../components/ConfirmModal'
import { iconBtn, headerBtn, modalPrimaryBtn, EditIcon, DeleteIcon, AddIcon, CheckIcon } from '../components/ActionIcons'

const SECTIONS = [
  { id: 'dashboard', label: 'لوحة التحكم' },
  { id: 'cashier', label: 'الكاشير' },
  { id: 'treasury', label: 'الخزينة' },
  { id: 'products', label: 'المنتجات' },
  { id: 'inventory', label: 'المخزون' },
  { id: 'returns', label: 'المرتجع' },
  { id: 'sales', label: 'المبيعات' },
  { id: 'purchases', label: 'المشتريات' },
  { id: 'expenses', label: 'المصروفات' },
  { id: 'customers', label: 'العملاء' },
  { id: 'suppliers', label: 'الموردين' },
  { id: 'reports', label: 'التقارير' },
  { id: 'aiAssistant', label: 'المساعد' },
  { id: 'shifts', label: 'الورديات' },
  { id: 'employees', label: 'الموظفين' },
  { id: 'employeeReports', label: 'تقارير الموظفين' },
  { id: 'activity', label: 'سجل النشاط' },
  { id: 'users', label: 'المستخدمين' },
  { id: 'settings', label: 'الإعدادات' }
]

// Permission mapping per section
function getViewPerm(sectionId) {
  if (sectionId === 'cashier') return 'cashier.access'
  if (sectionId === 'aiAssistant') return 'ai.assistant'
  return sectionId + '.view'
}
function getManagePerms(sectionId) {
  const map = {
    dashboard: ['dashboard.view'],
    cashier: ['cashier.access', 'cashier.return'],
    products: ['products.view', 'products.manage'],
    purchases: ['purchases.view', 'purchases.create', 'purchases.delete'],
    sales: ['sales.view', 'sales.create', 'sales.delete'],
    returns: ['returns.view', 'returns.create'],
    expenses: ['expenses.view', 'expenses.manage'],
    customers: ['customers.view', 'customers.manage', 'customers.payments'],
    suppliers: ['suppliers.view', 'suppliers.manage', 'suppliers.payments'],
    inventory: ['inventory.view', 'inventory.adjust'],
    treasury: ['treasury.view', 'treasury.manage', 'treasury.transfer'],
    reports: ['reports.view'],
    users: ['users.view', 'users.manage'],
    shifts: ['shifts.view', 'shifts.manage'],
    activity: ['activity.view'],
    employees: ['employees.view', 'employees.manage', 'employees.salaries'],
    employeeReports: ['employees.view'],
    aiAssistant: ['ai.assistant'],
    settings: ['settings.view', 'settings.manage']
  }
  return map[sectionId] || [sectionId + '.view']
}

const ALL_PERM_IDS = SECTIONS.flatMap(s => getManagePerms(s.id))

const ROLE_PRESETS = {
  admin: { label: 'مدير النظام' },
  general_manager: { label: 'مدير عام' },
  supervisor: { label: 'مشرف' },
  cashier: { label: 'كاشير' },
  employee: { label: 'موظف' }
}

// Define which permissions each role gets
function getRolePerms(role) {
  const r = {
    admin: SECTIONS.map(s => ({ section: s.id, level: 'manage' })),
    general_manager: SECTIONS.map(s => ({
      section: s.id,
      level: (s.id === 'users' || s.id === 'settings') ? 'view' : 'manage'
    })),
    supervisor: SECTIONS.map(s => ({
      section: s.id,
      level: (s.id === 'products' || s.id === 'expenses' || s.id === 'treasury') ? 'manage' : 'view'
    })),
    cashier: SECTIONS.map(s => {
      const levels = { cashier: 'manage', sales: 'view', returns: 'view', products: 'view', customers: 'view', expenses: 'manage', shifts: 'manage', dashboard: 'view', treasury: 'view' }
      return { section: s.id, level: levels[s.id] || 'hidden' }
    }),
    employee: SECTIONS.map(s => {
      const levels = { products: 'view', sales: 'view', returns: 'view', customers: 'view', dashboard: 'view' }
      return { section: s.id, level: levels[s.id] || 'hidden' }
    })
  }
  return r[role] || []
}

function permsFromLevels(levels) {
  const perms = []
  levels.forEach(l => {
    if (l.level === 'view') perms.push(getViewPerm(l.section))
    else if (l.level === 'manage') getManagePerms(l.section).forEach(p => { if (!perms.includes(p)) perms.push(p) })
  })
  return perms
}

function levelsFromPerms(permissions) {
  if (!permissions || !Array.isArray(permissions)) return []
  const permSet = new Set(permissions)
  return SECTIONS.map(s => {
    const viewPerm = getViewPerm(s.id)
    const managePerms = getManagePerms(s.id)
    const hasView = permSet.has(viewPerm)
    const hasManage = managePerms.every(p => permSet.has(p))
    if (hasManage) return { section: s.id, level: 'manage' }
    if (hasView) return { section: s.id, level: 'view' }
    return { section: s.id, level: 'hidden' }
  })
}

const ROLE_NAMES = { admin: 'مدير النظام', general_manager: 'مدير عام', supervisor: 'مشرف', cashier: 'كاشير', employee: 'موظف' }
const ROLE_COLORS = { admin: 'var(--accent)', general_manager: 'var(--special)', supervisor: 'var(--warning)', cashier: 'var(--success)', employee: 'var(--text2)' }

export default function UsersPage() {
  const { user } = useStore()
  const toast = useToast()
  const { confirm: showConfirm, ConfirmDialog } = useConfirm()
  const canManage = user?.permissions?.includes('users.manage')
  const [users, setUsers] = useState([])
  const [showModal, setShowModal] = useState(false)
  const [edit, setEdit] = useState(null)
  const [form, setForm] = useState({ name: '', username: '', password: '', role: 'cashier', levels: [], employeeId: '', securityQuestion: '', securityAnswer: '', passwordHint: '' })
  const [employees, setEmployees] = useState([])

  useEffect(() => { load() }, [])

  async function load() {
    const token = localStorage.getItem('token')
    try {
      setUsers(await api.listUsers(token))
      setEmployees(await api.listEmployees(token))
    } catch {}
  }

  async function handleToggleActive(u) {
    const confirmed = await showConfirm(`هل أنت متأكد من ${u.active ? 'تعطيل' : 'تفعيل'} المستخدم "${u.name}"؟`)
    if (!confirmed) return
    const token = localStorage.getItem('token')
    try { await api.toggleUserActive(token, u._id); load(); toast(`${u.active ? 'تم التعطيل' : 'تم التفعيل'}`, 'success') } catch (e) { toast(e.message, 'error') }
  }

  function openEdit(u) {
    const levels = levelsFromPerms(u.permissions)
    setEdit(u)
    setForm({ name: u.name, username: u.username, password: '', role: u.role, levels, employeeId: u.employeeId || '', securityQuestion: u.securityQuestion || '', securityAnswer: '', passwordHint: u.passwordHint || '' })
    setShowModal(true)
  }

  function handleRoleChange(role) {
    const levels = getRolePerms(role)
    setForm(f => ({ ...f, role, levels }))
  }

  function setSectionLevel(sectionId, level) {
    setForm(f => ({
      ...f,
      levels: f.levels.map(l => l.section === sectionId ? { ...l, level } : l)
    }))
  }

  async function handleSave(e) {
    e.preventDefault()
    const token = localStorage.getItem('token')
    try {
      const permissions = form.role === 'admin' ? ALL_PERM_IDS : permsFromLevels(form.levels)
      await api.saveUser(token, { _id: edit?._id, name: form.name, username: form.username, password: form.password, role: form.role, permissions, employeeId: form.employeeId, securityQuestion: form.securityQuestion, securityAnswer: form.securityAnswer || undefined, passwordHint: form.passwordHint })
      toast(edit ? 'تم تحديث المستخدم' : 'تمت إضافة المستخدم', 'success')
      setShowModal(false); load()
    } catch (err) { toast(err.message, 'error') }
  }

  const roleKeys = ['admin', 'general_manager', 'supervisor', 'cashier', 'employee']

  return (
    <div style={{ padding: '20px', overflow: 'auto', height: '100%' }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '16px' }}>
        <h1 style={{ fontSize: '20px' }}>المستخدمين</h1>
        {canManage && <button onClick={() => {
          const levels = getRolePerms('cashier')
          setEdit(null)
          setForm({ name: '', username: '', password: '', role: 'cashier', levels, employeeId: '', securityQuestion: '', securityAnswer: '', passwordHint: '' })
          setShowModal(true)
        }} style={headerBtn}><AddIcon size={16} /> إضافة مستخدم</button>}
      </div>

      <div className="table-card">
        <table>
          <thead><tr><th>الاسم</th><th>اسم المستخدم</th><th>الدور</th><th>نشط</th><th></th></tr></thead>
          <tbody>
            {users.map(u => (
              <tr key={u._id}>
                <td style={{ fontWeight: 'bold' }}>{u.name}</td>
                <td style={{ color: 'var(--text2)' }}>{u.username}</td>
                <td>
                  <span style={{ background: ROLE_COLORS[u.role] || 'var(--bg3)', color: '#fff', padding: '2px 10px', borderRadius: '4px', fontSize: '12px', fontWeight: '600' }}>
                    {ROLE_NAMES[u.role] || u.role}
                  </span>
                </td>
                <td>{u.active ? <span style={{ color: 'var(--success)' }}>نشط</span> : <span style={{ color: 'var(--danger)' }}>غير نشط</span>}</td>
                <td>
                  {canManage && <>
                    <button onClick={() => openEdit(u)} title="تعديل" style={iconBtn('warning')}><EditIcon size={14} /></button>
                    <button onClick={() => handleToggleActive(u)} title="حذف" style={iconBtn('danger')}><DeleteIcon size={14} /></button>
                  </>}
                </td>
              </tr>
            ))}
            {users.length === 0 && <tr><td colSpan="5" style={{ padding: '24px', color: 'var(--text2)', textAlign: 'center' }}>لا يوجد مستخدمين</td></tr>}
          </tbody>
        </table>
      </div>

      <Modal open={showModal} onClose={() => setShowModal(false)} title={edit ? 'تعديل مستخدم' : 'إضافة مستخدم'} width="650px">
        <form onSubmit={handleSave} style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '10px' }}>
            <input placeholder="الاسم" value={form.name} onInput={e => setForm(f => ({ ...f, name: e.target.value }))} required style={{ width: '100%' }} />
            <input placeholder="اسم المستخدم" value={form.username} onInput={e => setForm(f => ({ ...f, username: e.target.value }))} required style={{ width: '100%' }} />
          </div>
          <input type="password" placeholder={edit ? 'اتركه فارغاً إذا لم ترد التغيير' : 'كلمة المرور'} value={form.password} onInput={e => setForm(f => ({ ...f, password: e.target.value }))} required={!edit} style={{ width: '100%' }} />

          <div style={{ fontSize: '13px', color: 'var(--text2)', fontWeight: '600', marginTop: '4px' }}>سؤال الأمان (لاستعادة كلمة السر):</div>
          <select value={form.securityQuestion} onChange={e => setForm(f => ({ ...f, securityQuestion: e.target.value }))} style={{ width: '100%', background: 'var(--bg)', color: 'var(--text)', border: '1px solid var(--bg3)', borderRadius: '8px', padding: '8px', fontSize: '13px' }}>
            <option value="">-- اختر سؤال الأمان --</option>
            <option value="ما هو اسم حيوانك الأليف المفضل؟">ما هو اسم حيوانك الأليف المفضل؟</option>
            <option value="ما هي المدينة التي ولدت فيها؟">ما هي المدينة التي ولدت فيها؟</option>
            <option value="ما هو اسم والدتك؟">ما هو اسم والدتك؟</option>
            <option value="ما هو اسم معلمك المفضل؟">ما هو اسم معلمك المفضل؟</option>
            <option value="ما هو طبقك المفضل؟">ما هو طبقك المفضل؟</option>
            <option value="ما هي هوايتك المفضلة؟">ما هي هوايتك المفضلة؟</option>
          </select>
          <input type="text" placeholder="إجابة سؤال الأمان" value={form.securityAnswer} onInput={e => setForm(f => ({ ...f, securityAnswer: e.target.value }))} style={{ width: '100%' }} />
          <input type="text" placeholder="تلميح لكلمة السر (اختياري)" value={form.passwordHint} onInput={e => setForm(f => ({ ...f, passwordHint: e.target.value }))} style={{ width: '100%' }} />

          <div style={{ fontSize: '13px', color: 'var(--text2)', fontWeight: '600', marginTop: '4px' }}>ربط الموظف (اختياري):</div>
          <select value={form.employeeId} onChange={e => setForm(f => ({ ...f, employeeId: e.target.value }))} style={{ width: '100%', background: 'var(--bg)', color: 'var(--text)', border: '1px solid var(--bg3)', borderRadius: '8px', padding: '8px', fontSize: '13px' }}>
            <option value="">-- اختر موظفاً --</option>
            {employees.map(emp => <option key={emp._id} value={emp._id}>{emp.name} {emp.jobTitle ? `(${emp.jobTitle})` : ''}</option>)}
          </select>

          <div style={{ fontSize: '13px', color: 'var(--text2)', fontWeight: '600', marginTop: '4px' }}>الدور:</div>
          <div style={{ display: 'flex', gap: '6px', flexWrap: 'wrap' }}>
            {roleKeys.map(key => (
              <button key={key} type="button" onClick={() => handleRoleChange(key)}
                style={{
                  padding: '10px 18px', borderRadius: '10px', fontSize: '13px', fontWeight: '700',
                  background: form.role === key ? ROLE_COLORS[key] : 'var(--bg3)',
                  color: form.role === key ? '#fff' : 'var(--text)',
                  border: form.role === key ? '2px solid var(--text)' : '2px solid transparent',
                  flex: 1, minWidth: '90px'
                }}>
                {ROLE_NAMES[key]}
              </button>
            ))}
          </div>

          <div style={{ fontSize: '13px', color: 'var(--text2)', fontWeight: '600', marginTop: '8px' }}>صلاحيات الأقسام:</div>
          {form.role === 'admin' ? (
            <div style={{ padding: '12px', background: 'var(--bg)', borderRadius: '10px', color: 'var(--text2)', fontSize: '13px', textAlign: 'center' }}>
              الأدمن لديه صلاحية إدارة كاملة على جميع الأقسام
            </div>
          ) : (
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(200px, 1fr))', gap: '6px', maxHeight: '300px', overflow: 'auto', padding: '4px' }}>
              {form.levels.map(l => {
                const section = SECTIONS.find(s => s.id === l.section)
                if (!section) return null
                return (
                  <div key={l.section} style={{
                    padding: '10px 12px', borderRadius: '10px',
                    background: l.level === 'hidden' ? 'var(--bg)' : l.level === 'manage' ? 'rgba(var(--accent-rgb), 0.1)' : 'transparent',
                    border: '1px solid var(--outline)',
                    opacity: l.level === 'hidden' ? 0.5 : 1
                  }}>
                    <div style={{ fontSize: '13px', fontWeight: '600', marginBottom: '8px', color: 'var(--text)' }}>{section.label}</div>
                    <div style={{ display: 'flex', gap: '8px' }}>
                      <label style={{ display: 'flex', alignItems: 'center', gap: '4px', cursor: 'pointer', fontSize: '12px', color: l.level === 'view' ? 'var(--accent)' : 'var(--text2)' }}>
                        <input type="radio" name={'perm-' + l.section} checked={l.level === 'view'} onChange={() => setSectionLevel(l.section, 'view')} />
                        عرض
                      </label>
                      <label style={{ display: 'flex', alignItems: 'center', gap: '4px', cursor: 'pointer', fontSize: '12px', color: l.level === 'manage' ? 'var(--accent)' : 'var(--text2)' }}>
                        <input type="radio" name={'perm-' + l.section} checked={l.level === 'manage'} onChange={() => setSectionLevel(l.section, 'manage')} />
                        إدارة
                      </label>
                      <label style={{ display: 'flex', alignItems: 'center', gap: '4px', cursor: 'pointer', fontSize: '12px', color: 'var(--text2)' }}>
                        <input type="radio" name={'perm-' + l.section} checked={l.level === 'hidden'} onChange={() => setSectionLevel(l.section, 'hidden')} />
                        إخفاء
                      </label>
                    </div>
                  </div>
                )
              })}
            </div>
          )}

          {canManage && <button type="submit" style={modalPrimaryBtn}><CheckIcon size={16} /> {edit ? 'تحديث' : 'إضافة'}</button>}
        </form>
      </Modal>
      <ConfirmDialog />
    </div>
  )
}