const Realm = require('realm')
const crypto = require('node:crypto')

const TYPE_ICONS = {
  low_stock: '⚠️',
  expiry: '📅',
  info: 'ℹ️',
  success: '✅',
  warning: '⚠️',
  sale: '💰',
  payment: '💵',
  return: '🔄'
}

function createNotification(realm, data) {
  let notification
  realm.write(() => {
    notification = realm.create('Notification', {
      _id: crypto.randomUUID(),
      type: data.type || 'info',
      title: data.title || '',
      message: data.message || '',
      referenceId: data.referenceId || '',
      referenceType: data.referenceType || '',
      read: false,
      createdAt: new Date()
    })
  })
  return {
    _id: notification._id,
    type: notification.type,
    title: notification.title,
    message: notification.message,
    referenceId: notification.referenceId,
    referenceType: notification.referenceType,
    read: notification.read,
    createdAt: notification.createdAt?.toISOString()
  }
}

function listNotifications(realm, { unreadOnly, limit, offset } = {}) {
  let notifications = realm.objects('Notification').sorted('createdAt', true)
  if (unreadOnly) notifications = notifications.filtered('read == false')
  if (offset) notifications = notifications.slice(offset)
  if (limit) notifications = notifications.slice(0, limit)
  return Array.from(notifications).map(n => ({
    _id: n._id,
    type: n.type,
    title: n.title,
    message: n.message,
    referenceId: n.referenceId,
    referenceType: n.referenceType,
    read: n.read,
    createdAt: n.createdAt?.toISOString(),
    icon: TYPE_ICONS[n.type] || 'ℹ️'
  }))
}

function getUnreadCount(realm) {
  return realm.objects('Notification').filtered('read == false').length
}

function markAsRead(realm, id) {
  realm.write(() => {
    const n = realm.objectForPrimaryKey('Notification', id)
    if (n) n.read = true
  })
  return true
}

function markAllAsRead(realm) {
  realm.write(() => {
    const unread = realm.objects('Notification').filtered('read == false')
    for (const n of unread) n.read = true
  })
  return true
}

function deleteNotification(realm, id) {
  realm.write(() => {
    const n = realm.objectForPrimaryKey('Notification', id)
    if (n) realm.delete(n)
  })
  return true
}

function clearAllNotifications(realm) {
  realm.write(() => {
    const all = realm.objects('Notification')
    realm.delete(all)
  })
  return true
}

function checkAndCreateLowStockNotifications(realm) {
  const settings = realm.objectForPrimaryKey('BusinessSettings', 'business')
  if (!settings || settings.notificationLowStock === false) return
  const products = realm.objects('Product').filtered('reorderPoint > 0')
  for (const p of products) {
    if ((p.stock || 0) <= p.reorderPoint) {
      const existing = realm.objects('Notification')
        .filtered('type == "low_stock" AND referenceId == $0 AND read == false', p._id)[0]
      if (!existing) {
        createNotification(realm, {
          type: 'low_stock',
          title: 'تنبيه مخزون منخفض',
          message: `المنتج "${p.name}" - الكمية المتبقية: ${p.stock || 0} (حد التنبيه: ${p.reorderPoint})`,
          referenceId: p._id,
          referenceType: 'product'
        })
      }
    }
  }
}

function checkAndCreateExpiryNotifications(realm) {
  const settings = realm.objectForPrimaryKey('BusinessSettings', 'business')
  if (!settings || settings.notificationExpiry === false) return
  const now = new Date()
  const thirtyDaysFromNow = new Date(now.getFullYear(), now.getMonth(), now.getDate() + 30)
  const products = realm.objects('Product').filtered('active == true AND expiryDate != ""')
  for (const p of products) {
    const d = new Date(p.expiryDate + 'T23:59:59')
    if (d > now && d <= thirtyDaysFromNow) {
      const existing = realm.objects('Notification')
        .filtered('type == "expiry" AND referenceId == $0 AND read == false', p._id)[0]
      if (!existing) {
        const daysLeft = Math.ceil((d - now) / (1000 * 60 * 60 * 24))
        createNotification(realm, {
          type: 'expiry',
          title: 'تنبيه انتهاء صلاحية',
          message: `المنتج "${p.name}" - ستنتهي صلاحيته بعد ${daysLeft} يوم (${p.expiryDate})`,
          referenceId: p._id,
          referenceType: 'product'
        })
      }
    }
  }
}

module.exports = {
  listNotifications,
  getUnreadCount,
  markAsRead,
  markAllAsRead,
  deleteNotification,
  clearAllNotifications,
  createNotification,
  checkAndCreateLowStockNotifications,
  checkAndCreateExpiryNotifications
}