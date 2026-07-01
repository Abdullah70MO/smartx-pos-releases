import { useStore } from '../store'
import api from '../api'
import { useConfirm } from './ConfirmModal'

const SIDEBAR_ICONS = {
  dashboard: <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" width="18" height="18"><rect x="3" y="3" width="7" height="7"/><rect x="14" y="3" width="7" height="7"/><rect x="14" y="14" width="7" height="7"/><rect x="3" y="14" width="7" height="7"/></svg>,
  cashier: <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" width="18" height="18"><circle cx="9" cy="21" r="1"/><circle cx="20" cy="21" r="1"/><path d="M1 1h4l2.68 13.39a2 2 0 0 0 2 1.61h9.72a2 2 0 0 0 2-1.61L23 6H6"/></svg>,
  treasury: <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" width="18" height="18"><rect x="2" y="4" width="20" height="16" rx="2"/><line x1="12" y1="4" x2="12" y2="20"/><path d="M2 8h20"/></svg>,
  expenses: <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" width="18" height="18"><polyline points="23 6 13.5 15.5 8.5 10.5 1 18"/><polyline points="17 6 23 6 23 12"/></svg>,
  products: <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" width="18" height="18"><path d="M21 16V8a2 2 0 0 0-1-1.73l-7-4a2 2 0 0 0-2 0l-7 4A2 2 0 0 0 3 8v8a2 2 0 0 0 1 1.73l7 4a2 2 0 0 0 2 0l7-4A2 2 0 0 0 21 16z"/><polyline points="3.27 6.96 12 12.01 20.73 6.96"/><line x1="12" y1="22.08" x2="12" y2="12"/></svg>,
  sales: <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" width="18" height="18"><line x1="12" y1="1" x2="12" y2="23"/><path d="M17 5H9.5a3.5 3.5 0 0 0 0 7h5a3.5 3.5 0 0 1 0 7H6"/></svg>,
  purchases: <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" width="18" height="18"><polyline points="16 3 21 3 21 8"/><line x1="4" y1="20" x2="21" y2="3"/><polyline points="21 16 21 21 16 21"/><line x1="15" y1="15" x2="21" y2="21"/><line x1="4" y1="4" x2="9" y2="9"/></svg>,
  customers: <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" width="18" height="18"><path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2"/><circle cx="9" cy="7" r="4"/><path d="M23 21v-2a4 4 0 0 0-3-3.87"/><path d="M16 3.13a4 4 0 0 1 0 7.75"/></svg>,
  suppliers: <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" width="18" height="18"><rect x="1" y="3" width="15" height="13"/><polygon points="16 8 20 8 23 11 23 16 16 16 16 8"/><circle cx="5.5" cy="18.5" r="2.5"/><circle cx="18.5" cy="18.5" r="2.5"/></svg>,
  reports: <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" width="18" height="18"><path d="M18 20V10"/><path d="M12 20V4"/><path d="M6 20v-6"/></svg>,
  inventory: <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" width="18" height="18"><path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"/><polyline points="14 2 14 8 20 8"/><line x1="16" y1="13" x2="8" y2="13"/><line x1="16" y1="17" x2="8" y2="17"/><polyline points="10 9 9 9 8 9"/></svg>,
  returns: <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" width="18" height="18"><polyline points="1 4 1 10 7 10"/><path d="M3.51 15a9 9 0 1 0 2.13-9.36L1 10"/></svg>,
  shifts: <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" width="18" height="18"><polyline points="23 4 23 10 17 10"/><path d="M20.49 15a9 9 0 1 1-2.12-9.36L23 10"/></svg>,
  employees: <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" width="18" height="18"><rect x="2" y="7" width="20" height="14" rx="2" ry="2"/><path d="M16 21V5a2 2 0 0 0-2-2h-4a2 2 0 0 0-2 2v16"/></svg>,
  employeeReports: <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" width="18" height="18"><path d="M18 20V10"/><path d="M12 20V4"/><path d="M6 20v-6"/></svg>,
  activity: <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" width="18" height="18"><circle cx="12" cy="12" r="10"/><polyline points="12 6 12 12 16 14"/></svg>,
  aiAssistant: <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" width="18" height="18"><circle cx="12" cy="12" r="10"/><path d="M9.09 9a3 3 0 0 1 5.83 1c0 2-3 3-3 3"/><line x1="12" y1="17" x2="12.01" y2="17"/></svg>,
  users: <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" width="18" height="18"><rect x="3" y="11" width="18" height="11" rx="2" ry="2"/><path d="M7 11V7a5 5 0 0 1 10 0v4"/></svg>,
  settings: <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" width="18" height="18"><circle cx="12" cy="12" r="3"/><path d="M19.4 15a1.65 1.65 0 0 0 .33 1.82l.06.06a2 2 0 0 1 0 2.83 2 2 0 0 1-2.83 0l-.06-.06a1.65 1.65 0 0 0-1.82-.33 1.65 1.65 0 0 0-1 1.51V21a2 2 0 0 1-2 2 2 2 0 0 1-2-2v-.09A1.65 1.65 0 0 0 9 19.4a1.65 1.65 0 0 0-1.82.33l-.06.06a2 2 0 0 1-2.83 0 2 2 0 0 1 0-2.83l.06-.06A1.65 1.65 0 0 0 4.68 15a1.65 1.65 0 0 0-1.51-1H3a2 2 0 0 1-2-2 2 2 0 0 1 2-2h.09A1.65 1.65 0 0 0 4.6 9a1.65 1.65 0 0 0-.33-1.82l-.06-.06a2 2 0 0 1 0-2.83 2 2 0 0 1 2.83 0l.06.06A1.65 1.65 0 0 0 9 4.68a1.65 1.65 0 0 0 1-1.51V3a2 2 0 0 1 2-2 2 2 0 0 1 2 2v.09a1.65 1.65 0 0 0 1 1.51 1.65 1.65 0 0 0 1.82-.33l.06-.06a2 2 0 0 1 2.83 0 2 2 0 0 1 0 2.83l-.06.06a1.65 1.65 0 0 0-.33 1.82V9a1.65 1.65 0 0 0 1.51 1H21a2 2 0 0 1 2 2 2 2 0 0 1-2 2h-.09a1.65 1.65 0 0 0-1.51 1z"/></svg>
}

const PAGES = [
  { id: 'dashboard', label: 'لوحة التحكم', icon: 'dashboard', perms: ['dashboard.view'] },
  { id: 'cashier',   label: 'الكاشير',     icon: 'cashier', perms: ['cashier.access'] },
  { id: 'treasury',  label: 'الخزينة',     icon: 'treasury', perms: ['treasury.view', 'treasury.manage', 'treasury.transfer'] },
  { id: 'expenses',  label: 'المصروفات',   icon: 'expenses', perms: ['expenses.view', 'expenses.manage'] },
  { id: 'products',  label: 'المنتجات',    icon: 'products', perms: ['products.view', 'products.manage'] },
  { id: 'sales',     label: 'المبيعات',    icon: 'sales', perms: ['sales.view', 'sales.create', 'sales.delete'] },
  { id: 'purchases', label: 'المشتريات',   icon: 'purchases', perms: ['purchases.view', 'purchases.create', 'purchases.delete'] },
  { id: 'customers', label: 'العملاء',     icon: 'customers', perms: ['customers.view', 'customers.manage', 'customers.payments'] },
  { id: 'suppliers', label: 'الموردين',    icon: 'suppliers', perms: ['suppliers.view', 'suppliers.manage', 'suppliers.payments'] },
  { id: 'reports',   label: 'التقارير',    icon: 'reports', perms: ['reports.view'] },
  { id: 'aiAssistant', label: 'المساعد', icon: 'aiAssistant', perms: ['ai.assistant'] },
  { id: 'inventory', label: 'المخزون',     icon: 'inventory', perms: ['inventory.view', 'inventory.adjust'] },
  { id: 'returns',   label: 'المرتجع',     icon: 'returns', perms: ['returns.view', 'returns.create'] },
  { id: 'shifts',    label: 'الورديات',    icon: 'shifts', perms: ['shifts.view'] },
  { id: 'employees', label: 'الموظفين',    icon: 'employees', perms: ['employees.view', 'employees.manage', 'employees.salaries'] },
  { id: 'employeeReports', label: 'تقارير الموظفين', icon: 'employeeReports', perms: ['employees.view'] },
  { id: 'activity',  label: 'سجل النشاط',  icon: 'activity', perms: ['activity.view'] },
  { id: 'users',     label: 'المستخدمين',  icon: 'users', perms: ['users.view', 'users.manage'] },
  { id: 'settings',  label: 'الإعدادات',   icon: 'settings', perms: ['settings.view', 'settings.manage'] }
]

export default function Sidebar({ currentPage, onNavigate, open, onClose }) {
  const { user, logout, settings, updateAvailable } = useStore()
  const { showAlert, ConfirmDialog } = useConfirm()
  const userPerms = user?.permissions || []

  const visiblePages = PAGES.filter(page =>
    page.perms.some(p => userPerms.includes(p))
  )

  return (
    <>
      <div style={{
        position: 'fixed', top: 0, right: open ? '0' : '-260px',
        width: '240px', height: '100vh',
        background: 'var(--bg2)', display: 'flex', flexDirection: 'column',
        borderLeft: '1px solid var(--outline)',
        zIndex: 1001, transition: 'right 0.3s ease',
        boxShadow: open ? '-4px 0 20px rgba(0,0,0,0.4)' : 'none'
      }}>
        <div style={{ padding: '20px 16px', borderBottom: '1px solid var(--outline)', textAlign: 'center' }}>
          {settings?.logoDataUrl ? (
            <div style={{ display: 'flex', justifyContent: 'center', marginBottom: '8px' }}>
              <img
                src={settings.logoDataUrl}
                alt="شعار المتجر"
                style={{ width: '52px', height: '52px', objectFit: 'cover', borderRadius: '14px', border: '1px solid var(--outline)', background: 'var(--bg)' }}
              />
            </div>
          ) : null}
          <div style={{ fontSize: '20px', fontWeight: '800', color: 'var(--accent)', letterSpacing: '0.5px' }}>{settings?.businessName || 'SMART X'}</div>
          <div style={{ fontSize: '12px', color: 'var(--text2)', marginTop: '4px', fontWeight: '500' }}>{user?.name}</div>
        </div>

        <div style={{ flex: 1, overflow: 'auto', padding: '12px 8px' }}>
          {visiblePages.map(page => {
            const isActive = currentPage === page.id
            return (
              <button
                key={page.id}
                onClick={() => onNavigate(page.id)}
                style={{
                  display: 'flex', alignItems: 'center', gap: '10px', width: '100%',
                  padding: '10px 16px', borderRadius: '12px', fontSize: '13.5px',
                  background: isActive ? 'var(--accent-container)' : 'transparent',
                  color: isActive ? 'var(--on-accent-container)' : 'var(--text)',
                  fontWeight: isActive ? '700' : '500',
                  textAlign: 'right', marginBottom: '4px', transition: 'all 0.2s ease'
                }}
                className={isActive ? "" : "sidebar-btn"}
              >
                <span style={{ position: 'relative', display: 'flex' }}>
                  {SIDEBAR_ICONS[page.icon]}
                  {page.id === 'settings' && updateAvailable && (
                    <span style={{ position: 'absolute', top: '-4px', right: '-6px', width: '10px', height: '10px', background: 'var(--danger)', borderRadius: '50%', border: '2px solid var(--bg2)' }}></span>
                  )}
                </span>
                <span>{page.label}</span>
              </button>
            )
          })}
        </div>

        <div style={{ padding: '12px', borderTop: '1px solid var(--outline)' }}>
          <button
            onClick={async () => {
              const token = localStorage.getItem('token')
              try {
                const shift = await api.getActiveShift(token)
                if (shift) { await showAlert('يجب إنهاء الوردية أولاً قبل تسجيل الخروج'); return }
              } catch {}
              logout()
            }}
            style={{
              width: '100%', padding: '10px', borderRadius: '12px', fontSize: '13px',
              background: 'transparent', color: 'var(--danger)', textAlign: 'center',
              fontWeight: '600', transition: 'all 0.2s'
            }}
          >
            تسجيل خروج
          </button>
          <ConfirmDialog />
        </div>
      </div>
    </>
  )
}
