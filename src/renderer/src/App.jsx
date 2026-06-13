import { StoreProvider, useStore } from './store.jsx'
import { ToastProvider } from './components/Toast'
import Modal from './components/Modal'
import Sidebar from './components/Sidebar'
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

const PAGE_PERMS = {
  dashboard: ['dashboard.view'],
  cashier: ['cashier.access', 'cashier.return'],
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
  settings: SettingsPage
}

function AppContent() {
  const { page, setPage, user, license, leaveSettingsPrompt, confirmLeaveSettings, closeSettingsPrompt, updateAvailable, clearUpdate } = useStore()

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

  // Permission gate - redirect to dashboard if user lacks access to this page
  const pagePerms = PAGE_PERMS[page]
  const userPerms = user?.permissions || []
  const hasAccess = !pagePerms || pagePerms.some(p => userPerms.includes(p))
  const safePage = hasAccess ? page : 'dashboard'
  const PageComponent = PAGES[safePage] || DashboardPage

  return (
    <>
      <div style={{ display: 'flex', height: '100vh' }}>
        <Sidebar currentPage={safePage} onNavigate={setPage} />
        <div style={{ flex: 1, overflow: 'hidden' }}>
          {license?.graceWarning && (
            <div style={{
              background: '#f97316', color: '#fff', padding: '8px 16px',
              fontSize: '13px', fontWeight: '600', textAlign: 'center'
            }}>
              سيتم تعطيل التطبيق خلال يومين بسبب انقطاع الإنترنت - يرجى الاتصال بالإنترنت لتجديد الترخيص
            </div>
          )}
          <PageComponent />
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
      <Modal
        open={showUpdateNotif}
        onClose={() => setShowUpdateNotif(false)}
        title="????? ????"
        width='420px'
      >
        <div style={{ display:'flex',flexDirection:'column',gap:'14px',alignItems:'center' }}>
          <div style={{ fontSize:'32px' }}>??</div>
          <div style={{ fontSize:'16px',fontWeight:'bold',color:'var(--text)' }}>
            ????? {updateAvailable}
          </div>
          <div style={{ color:'var(--text2)',fontSize:'14px',lineHeight:'1.8',textAlign:'center' }}>
            ????? ????? ???? ???????. ????? ?????? ?? ???? ?????????.
          </div>
          <div style={{ display:'flex',gap:'10px',width:'100%' }}>
            <button onClick={() => { setShowUpdateNotif(false); window.smartx?.openReleasesPage?.() }} style={{ flex:1,background:'var(--accent)',color:'#fff',padding:'10px 14px',borderRadius:'10px',fontSize:'13px',fontWeight:'600' }}>
              ??? ???? ???????
            </button>
            <button onClick={() => setShowUpdateNotif(false)} style={{ flex:1,background:'var(--bg3)',color:'var(--text)',padding:'10px 14px',borderRadius:'10px',fontSize:'13px',fontWeight:'600' }}>
              ??????
            </button>
          </div>
        </div>
      </Modal>

      <Modal
        open={leaveSettingsPrompt.open}