import { useStore } from '../store'
import api from '../api'
import { useConfirm } from './ConfirmModal'

const PAGES = [
  { id: 'dashboard', label: 'لوحة التحكم', icon: '📊', perms: ['dashboard.view'] },
  { id: 'cashier',   label: 'الكاشير',     icon: '🛒', perms: ['cashier.access', 'cashier.return'] },
  { id: 'treasury',  label: 'الخزينة',     icon: '🏦', perms: ['treasury.view', 'treasury.manage', 'treasury.transfer'] },
  { id: 'expenses',  label: 'المصروفات',   icon: '💸', perms: ['expenses.view', 'expenses.manage'] },
  { id: 'products',  label: 'المنتجات',    icon: '📦', perms: ['products.view', 'products.manage'] },
  { id: 'sales',     label: 'المبيعات',    icon: '💰', perms: ['sales.view', 'sales.create', 'sales.delete'] },
  { id: 'purchases', label: 'المشتريات',   icon: '📥', perms: ['purchases.view', 'purchases.create', 'purchases.delete'] },
  { id: 'customers', label: 'العملاء',     icon: '👥', perms: ['customers.view', 'customers.manage', 'customers.payments'] },
  { id: 'suppliers', label: 'الموردين',    icon: '🏭', perms: ['suppliers.view', 'suppliers.manage', 'suppliers.payments'] },
  { id: 'reports',   label: 'التقارير',    icon: '📈', perms: ['reports.view'] },
  { id: 'inventory', label: 'المخزون',     icon: '📋', perms: ['inventory.view', 'inventory.adjust'] },
  { id: 'returns',   label: 'المرتجع',     icon: '↩️', perms: ['returns.view', 'returns.create'] },
  { id: 'shifts',    label: 'الورديات',    icon: '🔄', perms: ['shifts.view'] },
  { id: 'activity',  label: 'سجل النشاط',  icon: '📋', perms: ['activity.view'] },
  { id: 'users',     label: 'المستخدمين',  icon: '🔐', perms: ['users.view', 'users.manage'] },
  { id: 'settings',  label: 'الإعدادات',   icon: '⚙️', perms: ['settings.view', 'settings.manage'] }
]

export default function Sidebar({ currentPage, onNavigate }) {
  const { user, logout, settings } = useStore()
  const { showAlert, ConfirmDialog } = useConfirm()
  const userPerms = user?.permissions || []

  const visiblePages = PAGES.filter(page =>
    page.perms.some(p => userPerms.includes(p))
  )

  return (
    <div style={{
      width: '220px', background: 'var(--bg2)', display: 'flex', flexDirection: 'column',
      borderLeft: '1px solid var(--outline)', height: '100vh', flexShrink: 0
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
        <div style={{ fontSize: '20px', fontWeight: '800', color: 'var(--accent)', letterSpacing: '0.5px' }}>SMART X</div>
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
              <span style={{ fontSize: '16px' }}>{page.icon}</span>
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
  )
}