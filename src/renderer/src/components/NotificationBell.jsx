import { useState, useEffect, useRef } from 'preact/hooks'
import { useStore } from '../store'
import api from '../api'
import { useToast } from './Toast'
import { CheckIcon, DeleteIcon } from './ActionIcons'

const NOTIFICATION_ICONS = {
  low_stock: <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" width="18" height="18"><path d="M10.29 3.86L1.82 18a2 2 0 0 0 1.71 3h16.94a2 2 0 0 0 1.71-3L13.71 3.86a2 2 0 0 0-3.42 0z"/><line x1="12" y1="9" x2="12" y2="13"/><line x1="12" y1="17" x2="12.01" y2="17"/></svg>,
  info: <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" width="18" height="18"><circle cx="12" cy="12" r="10"/><line x1="12" y1="16" x2="12" y2="12"/><line x1="12" y1="8" x2="12.01" y2="8"/></svg>,
  success: <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" width="18" height="18"><path d="M22 11.08V12a10 10 0 1 1-5.93-9.14"/><polyline points="22 4 12 14.01 9 11.01"/></svg>,
  warning: <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" width="18" height="18"><path d="M10.29 3.86L1.82 18a2 2 0 0 0 1.71 3h16.94a2 2 0 0 0 1.71-3L13.71 3.86a2 2 0 0 0-3.42 0z"/><line x1="12" y1="9" x2="12" y2="13"/><line x1="12" y1="17" x2="12.01" y2="17"/></svg>,
  sale: <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" width="18" height="18"><line x1="12" y1="1" x2="12" y2="23"/><path d="M17 5H9.5a3.5 3.5 0 0 0 0 7h5a3.5 3.5 0 0 1 0 7H6"/></svg>,
  payment: <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" width="18" height="18"><rect x="1" y="4" width="22" height="16" rx="2" ry="2"/><line x1="1" y1="10" x2="23" y2="10"/></svg>,
  return: <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" width="18" height="18"><polyline points="1 4 1 10 7 10"/><path d="M3.51 15a9 9 0 1 0 2.13-9.36L1 10"/></svg>
}

function getIcon(type) {
  return NOTIFICATION_ICONS[type] || NOTIFICATION_ICONS.info
}

const S = {
  wrapper: { position: 'relative', display: 'flex', alignItems: 'center' },
  bellBtn: {
    background: 'none', border: 'none', cursor: 'pointer', padding: '6px',
    borderRadius: '8px', display: 'flex', alignItems: 'center', justifyContent: 'center',
    color: 'var(--text)', transition: 'background 0.15s, color 0.15s'
  },
  badge: {
    position: 'absolute', top: '2px', right: '2px',
    minWidth: '18px', height: '18px', borderRadius: '9px',
    background: 'var(--danger)', color: '#fff', fontSize: '10px',
    fontWeight: '700', display: 'flex', alignItems: 'center', justifyContent: 'center',
    padding: '0 4px', boxShadow: '0 0 0 2px var(--bg2)'
  },
  dropdown: {
    position: 'absolute', top: '100%', left: '50%', zIndex: 2000,
    width: '360px', maxWidth: 'calc(100vw - 32px)',
    background: 'var(--bg2)', border: '1px solid var(--outline)',
    borderRadius: '12px', boxShadow: 'var(--elevation-3)',
    display: 'flex', flexDirection: 'column', overflow: 'hidden',
    marginTop: '8px', transform: 'translateX(-50%)'
  },
  header: {
    display: 'flex', alignItems: 'center', justifyContent: 'space-between',
    padding: '12px 16px', borderBottom: '1px solid var(--outline)',
    background: 'var(--bg)'
  },
  headerTitle: { fontSize: '14px', fontWeight: '700', color: 'var(--text)' },
  headerActions: { display: 'flex', gap: '6px' },
  actionBtn: {
    background: 'none', border: 'none', color: 'var(--accent)',
    fontSize: '12px', fontWeight: '600', cursor: 'pointer',
    padding: '4px 8px', borderRadius: '6px',
    display: 'inline-flex', alignItems: 'center', gap: '4px'
  },
  list: { flex: 1, overflow: 'auto', maxHeight: '400px', padding: '4px' },
  item: {
    display: 'flex', gap: '10px', padding: '12px',
    borderRadius: '10px', background: 'var(--bg)',
    border: '1px solid var(--outline)', marginBottom: '8px',
    transition: 'background 0.15s'
  },
  itemIcon: {
    display: 'flex', alignItems: 'flex-start', marginTop: '2px', color: 'var(--accent)', flexShrink: 0
  },
  itemContent: { flex: 1, minWidth: 0 },
  itemTitle: { fontSize: '13px', fontWeight: '600', color: 'var(--text)', marginBottom: '4px' },
  itemMessage: { fontSize: '12px', color: 'var(--text2)', lineHeight: '1.5' },
  itemTime: { fontSize: '10px', color: 'var(--text2)', marginTop: '6px' },
  itemActions: { display: 'flex', gap: '6px', marginTop: '8px' },
  itemBtn: {
    background: 'var(--bg2)', border: '1px solid var(--outline)',
    color: 'var(--text)', fontSize: '11px', fontWeight: '600',
    padding: '4px 10px', borderRadius: '6px', cursor: 'pointer',
    display: 'inline-flex', alignItems: 'center', gap: '4px'
  },
  itemBtnDanger: { color: 'var(--danger)', borderColor: 'var(--danger)' },
  empty: { padding: '24px', textAlign: 'center', color: 'var(--text2)', fontSize: '13px' }
}

export default function NotificationBell() {
  const { user } = useStore()
  const toast = useToast()
  const [open, setOpen] = useState(false)
  const [notifications, setNotifications] = useState([])
  const [unreadCount, setUnreadCount] = useState(0)
  const [loading, setLoading] = useState(false)
  const wrapperRef = useRef(null)

  useEffect(() => {
    load()
    const interval = setInterval(load, 30000)
    return () => clearInterval(interval)
  }, [])

  useEffect(() => {
    function handleClickOutside(e) {
      if (wrapperRef.current && !wrapperRef.current.contains(e.target)) {
        setOpen(false)
      }
    }
    if (open) {
      document.addEventListener('mousedown', handleClickOutside)
    }
    return () => document.removeEventListener('mousedown', handleClickOutside)
  }, [open])

  async function load() {
    if (!user) return
    try {
      const token = localStorage.getItem('token')
      const [list, count] = await Promise.all([
        api.listNotifications(token, { limit: 50 }),
        api.getUnreadCount(token)
      ])
      setNotifications(list)
      setUnreadCount(count)
    } catch {}
  }

  async function handleMarkRead(id) {
    try {
      const token = localStorage.getItem('token')
      await api.markNotificationRead(token, id)
      setNotifications(prev => prev.map(n => n._id === id ? { ...n, read: true } : n))
      setUnreadCount(c => Math.max(0, c - 1))
    } catch (e) { toast(e.message, 'error') }
  }

  async function handleMarkAllRead() {
    try {
      const token = localStorage.getItem('token')
      await api.markAllNotificationsRead(token)
      setNotifications(prev => prev.map(n => ({ ...n, read: true })))
      setUnreadCount(0)
      toast('تم تعليم الكل كمقروء', 'success')
    } catch (e) { toast(e.message, 'error') }
  }

  async function handleDelete(id) {
    try {
      const token = localStorage.getItem('token')
      await api.deleteNotification(token, id)
      setNotifications(prev => prev.filter(n => n._id !== id))
      const wasUnread = notifications.find(n => n._id === id)?.read === false
      if (wasUnread) setUnreadCount(c => Math.max(0, c - 1))
      toast('تم الحذف', 'success')
    } catch (e) { toast(e.message, 'error') }
  }

  async function handleClearAll() {
    try {
      const token = localStorage.getItem('token')
      await api.clearAllNotifications(token)
      setNotifications([])
      setUnreadCount(0)
      toast('تم مسح كل الإشعارات', 'success')
    } catch (e) { toast(e.message, 'error') }
  }

  function formatTime(dateStr) {
    const d = new Date(dateStr)
    const now = new Date()
    const diff = (now - d) / 1000
    if (diff < 60) return 'الآن'
    if (diff < 3600) return `قبل ${Math.floor(diff / 60)} دقيقة`
    if (diff < 86400) return `قبل ${Math.floor(diff / 3600)} ساعة`
    return d.toLocaleDateString('ar-EG', { day: 'numeric', month: 'short', hour: '2-digit', minute: '2-digit' })
  }

  return (
    <>
      <div ref={wrapperRef} style={S.wrapper}>
        <button
          onClick={() => setOpen(!open)}
          style={S.bellBtn}
          onMouseEnter={e => e.target.style.background = 'var(--bg3)'}
          onMouseLeave={e => e.target.style.background = 'none'}
          title="الإشعارات"
        >
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" style={{ width: '18px', height: '18px', display: 'block' }}>
            <path d="M18 8A6 6 0 0 0 6 8c0 7-3 9-3 9h18s-3-2-3-9" />
            <path d="M13.73 21a2 2 0 0 1-3.46 0" />
          </svg>
          {unreadCount > 0 && <span style={S.badge}>{unreadCount > 99 ? '99+' : unreadCount}</span>}
        </button>

        {open && (
          <div style={S.dropdown} onClick={e => e.stopPropagation()}>
            <div style={S.header}>
              <span style={S.headerTitle}>الإشعارات</span>
              <div style={S.headerActions}>
                {unreadCount > 0 && (
                  <button onClick={handleMarkAllRead} style={S.actionBtn} title="تعليم الكل كمقروء">
<CheckIcon size={14} /> الكل
                  </button>
                )}
                {notifications.length > 0 && (
                  <button onClick={handleClearAll} style={{ ...S.actionBtn, color: 'var(--danger)' }} title="مسح الكل">
                    <DeleteIcon size={14} />
                  </button>
                )}
              </div>
            </div>

            <div style={S.list}>
              {notifications.length === 0 ? (
                <div style={S.empty}>لا توجد إشعارات</div>
              ) : (
                notifications.map(n => (
                  <div key={n._id} style={S.item}>
                    <div style={S.itemIcon}>{getIcon(n.type)}</div>
                    <div style={S.itemContent}>
                      <div style={S.itemTitle}>{n.title}</div>
                      <div style={S.itemMessage}>{n.message}</div>
                      <div style={S.itemTime}>{formatTime(n.createdAt)}</div>
                      <div style={S.itemActions}>
                        {!n.read && (
                          <button onClick={() => handleMarkRead(n._id)} style={S.itemBtn} title="تعليم كمقروء">
<CheckIcon size={14} /> مقروء
                          </button>
                        )}
                        <button onClick={() => handleDelete(n._id)} style={{ ...S.itemBtn, ...S.itemBtnDanger }} title="حذف">
                          <DeleteIcon size={14} />
                        </button>
                      </div>
                    </div>
                  </div>
                ))
              )}
            </div>
          </div>
        )}
      </div>
    </>
  )
}