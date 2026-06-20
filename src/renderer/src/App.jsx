import { useEffect, useState } from 'preact/hooks'
import { StoreProvider, useStore } from './store.jsx'
import { ToastProvider, useToast } from './components/Toast'
import Modal from './components/Modal'
import Sidebar from './components/Sidebar'
import NotificationBell from './components/NotificationBell'
import { formatDateTime } from './utils/date'
import LoginPage from './pages/LoginPage'
import LicensePage from './pages/LicensePage'
import DashboardPage from './pages/DashboardPage'
import CashierPage from './pages/CashierPage'
import TreasuryPage from './pages/TreasuryPage'
import ProductsPage from './pages/ProductsPage'
import InventoryPage from './pages/InventoryPage'
import ReturnsPage from './pages/ReturnsPage'
import SalesPage from './pages/SalesPage'
import PurchasesPage from './pages/PurchasesPage'
import ExpensesPage from './pages/ExpensesPage'
import CustomersPage from './pages/CustomersPage'
import SuppliersPage from './pages/SuppliersPage'
import ReportsPage from './pages/ReportsPage'
import ShiftsPage from './pages/ShiftsPage'
import ActivityLogPage from './pages/ActivityLogPage'
import UsersPage from './pages/UsersPage'
import SettingsPage from './pages/SettingsPage'
import EmployeesPage from './pages/EmployeesPage'
import EmployeeReportsPage from './pages/EmployeeReportsPage'

const PAGE_PERMS = {
  dashboard: ['dashboard.view'],
  cashier: ['cashier.access'],
  treasury: ['treasury.view', 'treasury.manage', 'treasury.transfer'],
  products: ['products.view', 'products.manage'],
  inventory: ['inventory.view', 'inventory.adjust'],
  returns: ['returns.view', 'returns.create'],
  sales: ['sales.view', 'sales.create', 'sales.delete'],
  purchases: ['purchases.view', 'purchases.create', 'purchases.delete'],
  expenses: ['expenses.view', 'expenses.manage'],
  customers: ['customers.view', 'customers.manage', 'customers.payments'],
  suppliers: ['suppliers.view', 'suppliers.manage', 'suppliers.payments'],
  reports: ['reports.view'],
  shifts: ['shifts.view'],
  activity: ['activity.view'],
  users: ['users.view', 'users.manage'],
  employees: ['employees.view'],
  employeeReports: ['employees.view'],
  settings: ['settings.view', 'settings.manage']
}

const PAGES = {
  dashboard: DashboardPage,
  cashier: CashierPage,
  treasury: TreasuryPage,
  products: ProductsPage,
  inventory: InventoryPage,
  returns: ReturnsPage,
  sales: SalesPage,
  purchases: PurchasesPage,
  expenses: ExpensesPage,
  customers: CustomersPage,
  suppliers: SuppliersPage,
  reports: ReportsPage,
  shifts: ShiftsPage,
  activity: ActivityLogPage,
  users: UsersPage,
  employees: EmployeesPage,
  employeeReports: EmployeeReportsPage,
  settings: SettingsPage
}

function AppContent() {
  const { page, setPage, user, license, settings, leaveSettingsPrompt, confirmLeaveSettings, closeSettingsPrompt, updateAvailable, toggleTheme } = useStore()
  const [sidebarOpen, setSidebarOpen] = useState(false)
  const [currentTime, setCurrentTime] = useState(new Date())
  useEffect(() => { const id = setInterval(() => setCurrentTime(new Date()), 1000); return () => clearInterval(id) }, [])
  const toast = useToast()

  useEffect(() => {
    if (updateAvailable && page !== 'settings') {
      toast(`يتوفر إصدار جديد ${updateAvailable} — افتح الإعدادات للتحميل`, 'info', 6000)
    }
  }, [updateAvailable, page])

  if (page === 'loading') {
    return <div style={{ display:'flex',alignItems:'center',justifyContent:'center',height:'100vh',fontSize:'18px',color:'var(--text2)' }}>جاري التحميل...</div>
  }

  if (page === 'login' || page === 'license') {
    return (
      <>
        {page === 'login' && <LoginPage />}
        {page === 'license' && <LicensePage />}
      </>
    )
  }

  // Permission gate - redirect to first accessible page if user lacks access
  const pagePerms = PAGE_PERMS[page]
  const userPerms = user?.permissions || []
  const hasAccess = !pagePerms || pagePerms.some(p => userPerms.includes(p))
  const firstAccessible = Object.entries(PAGE_PERMS).find(([, perms]) => perms.some(p => userPerms.includes(p)))?.[0]
  const safePage = hasAccess ? page : (firstAccessible || 'settings')
  const PageComponent = PAGES[safePage]
  useEffect(() => { if (safePage !== page) setPage(safePage) }, [safePage, page])

  return (
    <>
      <div style={{ display: 'flex', height: '100vh' }}>
        {sidebarOpen && <div onClick={() => setSidebarOpen(false)} style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.5)', zIndex: 999 }} />}
        <Sidebar currentPage={safePage} onNavigate={(p) => { setPage(p); setSidebarOpen(false) }} open={sidebarOpen} onClose={() => setSidebarOpen(false)} />
        <div style={{ flex: 1, overflow: 'hidden', display: 'flex', flexDirection: 'column' }}>
          <div style={{ display: 'flex', alignItems: 'center', padding: '6px 12px', background: 'var(--bg2)', borderBottom: '1px solid var(--outline)', minHeight: '40px', flexShrink: 0, gap: '8px' }}>
            <button onClick={() => setSidebarOpen(!sidebarOpen)} style={{ background: 'none', color: 'var(--text)', fontSize: '20px', cursor: 'pointer', padding: '4px' }}>
              ☰
            </button>
            <span style={{ fontSize: '14px', fontWeight: '600', color: 'var(--accent)' }}>{settings?.businessName || 'SMART X'}</span>
            <span style={{ fontSize: '11px', color: 'var(--text2)', marginRight: '12px' }}>{formatDateTime(currentTime)}</span>
            <div style={{ flex: 1 }} />
            <NotificationBell />
            <button onClick={toggleTheme} title="تبديل الوضع الداكن/الفاتح" style={{ background: 'none', border: 'none', color: 'var(--text2)', cursor: 'pointer', padding: '4px 8px', borderRadius: '6px', display: 'flex', alignItems: 'center', fontSize: '16px' }}>
              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" style={{ width: '17px', height: '17px' }}>
                {(settings?.theme || localStorage.getItem('theme') || 'dark') === 'dark' ? (
                  <path d="M21 12.79A9 9 0 1 1 11.21 3 7 7 0 0 0 21 12.79z" />
                ) : (
                  <><circle cx="12" cy="12" r="5" /><line x1="12" y1="1" x2="12" y2="3" /><line x1="12" y1="21" x2="12" y2="23" /><line x1="4.22" y1="4.22" x2="5.64" y2="5.64" /><line x1="18.36" y1="18.36" x2="19.78" y2="19.78" /><line x1="1" y1="12" x2="3" y2="12" /><line x1="21" y1="12" x2="23" y2="12" /><line x1="4.22" y1="19.78" x2="5.64" y2="18.36" /><line x1="18.36" y1="5.64" x2="19.78" y2="4.22" /></>
                )}
              </svg>
            </button>
            <span style={{ fontSize: '12px', color: 'var(--text)', fontWeight: '500', marginLeft: '8px' }}>{user?.name}</span>
            {license?.remainingText && (
              <span style={{
                fontSize: '11px', fontWeight: '600', padding: '2px 10px', borderRadius: '4px',
                background: license.remainingDays !== null && license.remainingDays <= 7 ? 'rgba(239,68,68,0.15)' : 'rgba(16,185,129,0.15)',
                color: license.remainingDays !== null && license.remainingDays <= 7 ? 'var(--danger)' : 'var(--success)'
              }}>
                {license.remainingText}
              </span>
            )}
          </div>
          {license?.graceWarning && (
            <div style={{
              background: 'var(--warning)', color: '#fff', padding: '8px 16px',
              fontSize: '13px', fontWeight: '600', textAlign: 'center'
            }}>
              سيتم تعطيل التطبيق خلال يومين بسبب انقطاع الإنترنت - يرجى الاتصال بالإنترنت لتجديد الترخيص
            </div>
          )}
          <div style={{ flex: 1, height: 0 }}><PageComponent /></div>
        </div>
      </div>

      <Modal
        open={leaveSettingsPrompt.open}
        onClose={() => closeSettingsPrompt()}
        title="تغييرات غير محفوظة"
        width="420px"
      >
        <div style={{ display: 'flex', flexDirection: 'column', gap: '14px' }}>
          <div style={{ color: 'var(--text2)', fontSize: '14px', lineHeight: '1.8' }}>
            لديك تغييرات لم يتم حفظها في صفحة الإعدادات. هل تريد حفظها قبل الانتقال؟
          </div>
          <div style={{ display: 'flex', gap: '10px', flexWrap: 'wrap' }}>
            <button onClick={() => confirmLeaveSettings('save')} style={{ flex: 1, minWidth: '110px', background: 'var(--accent)', color: '#fff', padding: '10px 14px', borderRadius: '10px', fontSize: '13px', fontWeight: '600' }}>
              حفظ والخروج
            </button>
            <button onClick={() => confirmLeaveSettings('discard')} style={{ flex: 1, minWidth: '110px', background: 'var(--danger)', color: '#fff', padding: '10px 14px', borderRadius: '10px', fontSize: '13px', fontWeight: '600' }}>
              تجاهل التغييرات
            </button>
            <button onClick={() => confirmLeaveSettings('cancel')} style={{ flexBasis: '100%', background: 'var(--bg3)', color: 'var(--text)', padding: '10px 14px', borderRadius: '10px', fontSize: '13px', fontWeight: '600' }}>
              إلغاء
            </button>
          </div>
        </div>
      </Modal>

    </>
  )
}

export default function App() {
  return (
    <StoreProvider>
      <ToastProvider>
        <AppContent />
      </ToastProvider>
    </StoreProvider>
  )
}