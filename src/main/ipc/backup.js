const fs = require('node:fs/promises')
const path = require('node:path')
const Realm = require('realm')
const { app, dialog } = require('electron')
const { getRealmPath, closeRealm, openRealm } = require('../database')

async function exportBackup() {
  const { filePath, canceled } = await dialog.showSaveDialog({
    title: 'نسخ احتياطي SMART X',
    defaultPath: 'smart-x-backup-' + new Date().toISOString().slice(0, 10) + '.realm',
    filters: [{ name: 'قاعدة بيانات Realm', extensions: ['realm'] }]
  })
  if (canceled || !filePath) return null

  await closeRealm()
  await fs.copyFile(getRealmPath(), filePath)
  await openRealm()
  return filePath
}

async function restoreBackup() {
  const { canceled, filePaths } = await dialog.showOpenDialog({
    title: 'استعادة نسخة احتياطية',
    filters: [{ name: 'قاعدة بيانات Realm', extensions: ['realm', 'backup'] }],
    properties: ['openFile']
  })
  if (canceled || filePaths.length === 0) return false

  await closeRealm()
  await fs.copyFile(filePaths[0], getRealmPath())
  await openRealm()
  return true
}

async function autoBackup(backupDir) {
  if (!backupDir) {
    backupDir = path.join(app.getPath('documents'), 'SMART X Backups')
  }
  await fs.mkdir(backupDir, { recursive: true })
  const dateStr = new Date().toISOString().slice(0, 10)
  const timeStr = new Date().toTimeString().slice(0, 8).replace(/:/g, '-')
  const filePath = path.join(backupDir, `auto-backup-${dateStr}_${timeStr}.realm`)
  await closeRealm()
  await fs.copyFile(getRealmPath(), filePath)
  await openRealm()
  return filePath
}

async function resetDatabase() {
  const { response } = await dialog.showMessageBox({
    type: 'warning',
    buttons: ['إلغاء', 'تأكيد الحذف'],
    defaultId: 0, cancelId: 0,
    title: 'مسح قاعدة البيانات',
    message: 'هل أنت متأكد من مسح جميع البيانات؟ هذا الإجراء لا يمكن التراجع عنه!'
  })
  if (response === 1) {
    const r = await openRealm()
    r.write(() => {
      r.delete(r.objects('Sale'))
      r.delete(r.objects('Return'))
      r.delete(r.objects('Product'))
      r.delete(r.objects('Expense'))
      r.delete(r.objects('Shift'))
      r.delete(r.objects('ActivityLog'))
      r.delete(r.objects('CreditCustomer'))
      r.delete(r.objects('Supplier'))
      r.delete(r.objects('Purchase'))
      r.delete(r.objects('InventoryAdjustment'))
      r.delete(r.objects('SupplierPayment'))
      r.delete(r.objects('CustomerPayment'))
      r.delete(r.objects('TreasuryTransaction'))
      r.delete(r.objects('Treasury'))
      r.delete(r.objects('BusinessSettings'))
      r.delete(r.objects('Counter'))
      r.delete(r.objects('License'))
      r.delete(r.objects('User').filtered('username != "admin"'))
      const admin = r.objects('User').filtered('username == "admin"')[0]
      if (admin) admin.passwordHash = require('bcryptjs').hashSync('admin', 12)
      r.create('BusinessSettings', {
        _id: 'business', currency: 'SAR', taxEnabled: true,
        calendarType: 'gregorian', timeFormat: '24', theme: 'dark',
        fontFamily: 'Cairo', printAfterPayment: true, seeded: false
      }, Realm.UpdateMode.Modified)
      r.create('Counter', { _id: 'invoice', value: 1000 }, Realm.UpdateMode.Modified)
      r.create('Counter', { _id: 'purchase', value: 1 }, Realm.UpdateMode.Modified)
      r.create('Treasury', { _id: 'main', name: 'الخزينة الرئيسية', type: 'main', balance: 0, createdAt: new Date(), updatedAt: new Date() })
      r.create('Treasury', { _id: 'bank', name: 'البنك', type: 'bank', balance: 0, createdAt: new Date(), updatedAt: new Date() })
    })
    return true
  }
  return false
}

module.exports = { exportBackup, restoreBackup, autoBackup, resetDatabase }
