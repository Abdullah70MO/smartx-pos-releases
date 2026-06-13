const { app, BrowserWindow, ipcMain, shell, nativeTheme, Menu } = require('electron')
const { autoUpdater } = require('electron-updater')
const path = require('path')
const { openRealm, closeRealm } = require('./database')
const { login, getSession, logout, requireUser } = require('./ipc/auth')
const bcrypt = require('bcryptjs')
const { listProducts, saveProduct, removeProduct } = require('./ipc/products')
const { listPurchases, createPurchase, savePurchase, removePurchase } = require('./ipc/purchases')
const { listAdjustments, createAdjustment, saveAdjustment, removeAdjustment, getLowStockProducts } = require('./ipc/inventory')
const { listSales, createSale, removeSale } = require('./ipc/sales')
const { listExpenses, saveExpense, removeExpense } = require('./ipc/expenses')
const { listUsers, saveUser, ROLES, ALL_PERMISSIONS } = require('./ipc/users')
const { getSettings, saveSettings } = require('./ipc/settings')
const { exportBackup, restoreBackup, autoBackup, resetDatabase } = require('./ipc/backup')
const { checkLicense, activateLicense, startTrial, periodicCheck, startPeriodicCheck, stopPeriodicCheck, getGraceWarning } = require('./ipc/license')
const { dashboardSummary } = require('./ipc/dashboard')
const { listReturns, createReturn, removeReturn } = require('./ipc/returns')
const { getActiveShift, startShift, endShift, listShifts, getShiftSales } = require('./ipc/shifts')
const { logActivity, listActivity } = require('./ipc/activity')
const { listCustomers, saveCustomer, removeCustomer } = require('./ipc/customers')
const { listSuppliers, saveSupplier, removeSupplier } = require('./ipc/suppliers')
const { listSupplierPayments, createSupplierPayment, removeSupplierPayment } = require('./ipc/supplierPayments')
const { listCustomerPayments, createCustomerPayment, removeCustomerPayment } = require('./ipc/customerPayments')
const { listTreasuries, saveTreasury, removeTreasury, addToTreasury, withdrawFromTreasury, transferBetweenTreasuries, listTransactions } = require('./ipc/treasury')
const { CONTACT_INFO } = require('./constants')

const ALL_ADMIN_PERMISSIONS = ROLES.admin.permissions

// Auto updater (manual only)
autoUpdater.autoDownload = false
autoUpdater.on('update-available', (info) => {
  BrowserWindow.getAllWindows().forEach(w => w.webContents.send('update-status', { type: 'available', info }))
})
autoUpdater.on('update-not-available', (info) => {
  BrowserWindow.getAllWindows().forEach(w => w.webContents.send('update-status', { type: 'not-available', info }))
})
autoUpdater.on('download-progress', (progress) => {
  BrowserWindow.getAllWindows().forEach(w => w.webContents.send('update-status', { type: 'progress', percent: progress.percent }))
})
autoUpdater.on('update-downloaded', (info) => {
  BrowserWindow.getAllWindows().forEach(w => w.webContents.send('update-status', { type: 'downloaded', info }))
})
autoUpdater.on('error', (err) => {
  BrowserWindow.getAllWindows().forEach(w => w.webContents.send('update-status', { type: 'error', message: err.message }))
})

function handle(channel, handler) {
  ipcMain.handle(channel, async (event, ...args) => {
    try {
      return await handler(...args)
    } catch (err) {
      throw new Error(err.message)
    }
  })
}

function registerIpc() {
  // Auth
  handle('auth:login', async ({ username, password }) => {
    const r = await openRealm()
    const result = login(r, { username, password })
    try { logActivity(r, { userId: result.user._id, name: result.user.name }, { action: 'تسجيل دخول', details: username }) } catch {}
    return result
  })
  handle('auth:session', (token) => getSession(token))
  handle('auth:logout', (token) => logout(token))

  // License
  handle('license:check', async () => checkLicense(await openRealm()))
  handle('license:activate', async ({ key }) => {
    const r = await openRealm()
    const result = await activateLicense(r, key)
    startPeriodicCheck(r)
    return result
  })
  handle('license:startTrial', async () => startTrial(await openRealm()))
  handle('license:periodicCheck', async () => periodicCheck(await openRealm()))
  handle('license:getGraceWarning', async () => getGraceWarning(await openRealm()))

  // Print
  handle('print:a4', async (html) => {
    const printWin = new BrowserWindow({ show: false, width: 800, height: 600, webPreferences: { sandbox: false, contextIsolation: true, nodeIntegration: false } })
    await printWin.loadURL(`data:text/html;charset=utf-8,${encodeURIComponent(html)}`)
    printWin.webContents.on('did-finish-load', () => {
      printWin.webContents.print({}, () => printWin.destroy())
    })
  })

  // Products
  handle('products:list', async ({ token, query }) => (requireUser(token, 'products.view'), listProducts(await openRealm(), query)))
  handle('products:save', async ({ token, product }) => {
    const r = await openRealm(); const session = requireUser(token, 'products.manage')
    const result = saveProduct(r, product)
    try { logActivity(r, session, { action: product._id ? 'تعديل منتج' : 'إضافة منتج', details: product.name }) } catch {}
    return result
  })
  handle('products:remove', async ({ token, id }) => {
    const r = await openRealm(); const session = requireUser(token, 'products.manage')
    const result = removeProduct(r, id)
    try { logActivity(r, session, { action: 'حذف منتج', details: id }) } catch {}
    return result
  })

  // Sales
  handle('sales:list', async ({ token }) => (requireUser(token, 'sales.view'), listSales(await openRealm())))
  handle('sales:create', async ({ token, sale }) => {
    const r = await openRealm(); const session = requireUser(token, 'sales.create')
    const result = createSale(r, session, sale)
    try { logActivity(r, session, { action: 'إضافة فاتورة', details: '#' + result.invoiceNo + ' - ' + result.total }) } catch {}
    return result
  })
  handle('sales:remove', async ({ token, id }) => {
    const r = await openRealm(); const session = requireUser(token, 'sales.delete')
    const result = removeSale(r, id)
    try { logActivity(r, session, { action: 'حذف فاتورة', details: id }) } catch {}
    return result
  })

  // Expenses
  handle('expenses:list', async ({ token }) => (requireUser(token, 'expenses.view'), listExpenses(await openRealm())))
  handle('expenses:save', async ({ token, expense }) => {
    const r = await openRealm(); const session = requireUser(token, 'expenses.manage')
    const result = saveExpense(r, session, expense)
    try { logActivity(r, session, { action: expense._id ? 'تعديل مصروف' : 'إضافة مصروف', details: String(expense.amount) }) } catch {}
    return result
  })
  handle('expenses:remove', async ({ token, id }) => {
    const r = await openRealm(); const session = requireUser(token, 'expenses.manage')
    const result = removeExpense(r, id)
    try { logActivity(r, session, { action: 'حذف مصروف', details: id }) } catch {}
    return result
  })

  // Users
  handle('users:list', async ({ token }) => (requireUser(token, 'users.view'), listUsers(await openRealm())))
  handle('users:save', async ({ token, user }) => {
    const r = await openRealm(); const session = requireUser(token, 'users.manage')
    const result = saveUser(r, user)
    try { logActivity(r, session, { action: user._id ? 'تعديل مستخدم' : 'إضافة مستخدم', details: user.username }) } catch {}
    return result
  })

  // Settings
  handle('settings:get', async ({ token }) => (requireUser(token, 'settings.view'), getSettings(await openRealm())))
  handle('settings:save', async ({ token, settings }) => (requireUser(token, 'settings.manage'), saveSettings(await openRealm(), settings)))

  // Dashboard
  handle('dashboard:summary', async ({ token }) => (requireUser(token, 'dashboard.view'), dashboardSummary(await openRealm())))

  // Backup
  handle('backup:export', async ({ token }) => (requireUser(token, 'backup.manage'), exportBackup()))
  handle('backup:restore', async ({ token }) => (requireUser(token, 'backup.manage'), restoreBackup()))
  handle('backup:auto', async ({ token, path }) => (requireUser(token, 'backup.manage'), autoBackup(path)))
  handle('backup:reset', async ({ token }) => (requireUser(token, 'backup.manage'), resetDatabase()))

  // Returns
  handle('returns:list', async ({ token }) => (requireUser(token, 'returns.view'), listReturns(await openRealm())))
  handle('returns:create', async ({ token, ret }) => {
    const r = await openRealm(); const session = requireUser(token, 'returns.create')
    const result = createReturn(r, session, ret)
    try { logActivity(r, session, { action: 'إرجاع منتجات', details: '#' + result.invoiceNo }) } catch {}
    return result
  })
  handle('returns:remove', async ({ token, id }) => {
    const r = await openRealm(); const session = requireUser(token)
    removeReturn(r, id)
    try { logActivity(r, session, { action: 'حذف مرتجع', details: id }) } catch {}
    return true
  })

  // Shifts
  handle('shifts:getActive', async ({ token }) => (requireUser(token), getActiveShift(await openRealm(), requireUser(token).userId)))
  handle('shifts:start', async ({ token, startingBalance }) => startShift(await openRealm(), requireUser(token), startingBalance))
  handle('shifts:end', async ({ token, endingBalance }) => {
    const r = await openRealm(); const session = requireUser(token)
    const result = endShift(r, session, endingBalance)
    const diff = result.endingBalance - result.startingBalance - result.totalSales
    if (diff < 0) {
      saveExpense(r, session, { amount: Math.abs(diff), category: 'عجز وردية', note: 'عجز - ' + result.cashierName, date: new Date().toISOString() })
    } else if (diff > 0) {
      const mainTreasury = r.objects('Treasury').filtered('type == "main"')[0]
      if (mainTreasury) {
        addToTreasury(r, { treasuryId: mainTreasury._id, amount: diff, note: 'زيادة - ' + result.cashierName, paymentMethod: 'cash', personName: result.cashierName, refType: 'shift', refId: result._id }, session)
      }
    }
    return result
  })
  handle('shifts:list', async ({ token }) => (requireUser(token, 'shifts.view'), listShifts(await openRealm())))
  handle('shifts:sales', async ({ token }) => (requireUser(token, 'shifts.view'), getShiftSales(await openRealm(), requireUser(token).userId)))

  // Activity
  handle('activity:list', async ({ token }) => (requireUser(token, 'activity.view'), listActivity(await openRealm())))
  handle('activity:log', async ({ token, action, details }) => { const session = requireUser(token); logActivity(await openRealm(), session, { action, details }) })

  // Customers
  handle('customers:list', async ({ token }) => (requireUser(token, 'customers.view'), listCustomers(await openRealm())))
  handle('customers:save', async ({ token, customer }) => {
    const r = await openRealm(); const session = requireUser(token, 'customers.manage')
    const result = saveCustomer(r, customer)
    try { logActivity(r, session, { action: customer._id ? 'تعديل عميل' : 'إضافة عميل', details: customer.name }) } catch {}
    return result
  })
  handle('customers:remove', async ({ token, id }) => {
    const r = await openRealm(); const session = requireUser(token, 'customers.manage')
    const result = removeCustomer(r, id)
    try { logActivity(r, session, { action: 'حذف عميل', details: id }) } catch {}
    return result
  })

  // Suppliers
  handle('suppliers:list', async ({ token }) => (requireUser(token, 'suppliers.view'), listSuppliers(await openRealm())))
  handle('suppliers:save', async ({ token, supplier }) => {
    const r = await openRealm(); const session = requireUser(token, 'suppliers.manage')
    const result = saveSupplier(r, supplier)
    try { logActivity(r, session, { action: supplier._id ? 'تعديل مورد' : 'إضافة مورد', details: supplier.name }) } catch {}
    return result
  })
  handle('suppliers:remove', async ({ token, id }) => {
    const r = await openRealm(); const session = requireUser(token, 'suppliers.manage')
    const result = removeSupplier(r, id)
    try { logActivity(r, session, { action: 'حذف مورد', details: id }) } catch {}
    return result
  })

  // Supplier Payments
  handle('supplierPayments:list', async ({ token, supplierId }) => (requireUser(token, 'suppliers.payments'), listSupplierPayments(await openRealm(), supplierId)))
  handle('supplierPayments:create', async ({ token, payment }) => {
    const r = await openRealm(); const session = requireUser(token, 'suppliers.payments')
    const result = createSupplierPayment(r, session, payment)
    try { logActivity(r, session, { action: 'دفعة مورد', details: payment.supplierName + ' - ' + payment.amount }) } catch {}
    return result
  })
  handle('supplierPayments:remove', async ({ token, id }) => (requireUser(token, 'suppliers.payments'), removeSupplierPayment(await openRealm(), id)))

  // Customer Payments
  handle('customerPayments:list', async ({ token, customerId }) => (requireUser(token, 'customers.payments'), listCustomerPayments(await openRealm(), customerId)))
  handle('customerPayments:create', async ({ token, payment }) => {
    const r = await openRealm(); const session = requireUser(token, 'customers.payments')
    const result = createCustomerPayment(r, session, payment)
    try { logActivity(r, session, { action: 'دفعة عميل', details: payment.customerName + ' - ' + payment.amount }) } catch {}
    return result
  })
  handle('customerPayments:remove', async ({ token, id }) => (requireUser(token, 'customers.payments'), removeCustomerPayment(await openRealm(), id)))

  // Purchases
  handle('purchases:list', async ({ token }) => (requireUser(token, 'purchases.view'), listPurchases(await openRealm())))
  handle('purchases:create', async ({ token, purchase }) => {
    const r = await openRealm(); const session = requireUser(token, 'purchases.create')
    const result = createPurchase(r, session, purchase)
    try { logActivity(r, session, { action: 'فاتورة شراء', details: '#' + result.invoiceNo }) } catch {}
    return result
  })
  handle('purchases:save', async ({ token, purchase }) => {
    const r = await openRealm(); const session = requireUser(token, 'purchases.create')
    const result = savePurchase(r, session, purchase)
    try { logActivity(r, session, { action: 'تحديث فاتورة شراء', details: '#' + result.invoiceNo }) } catch {}
    return result
  })
  handle('purchases:remove', async ({ token, id }) => {
    const r = await openRealm(); const session = requireUser(token, 'purchases.delete')
    const result = removePurchase(r, id)
    try { logActivity(r, session, { action: 'حذف فاتورة شراء', details: id }) } catch {}
    return result
  })

  // Inventory Adjustments
  handle('inventory:adjustments', async ({ token }) => (requireUser(token, 'inventory.view'), listAdjustments(await openRealm())))
  handle('inventory:createAdjustment', async ({ token, adjustment }) => createAdjustment(await openRealm(), requireUser(token, 'inventory.adjust'), adjustment))
  handle('inventory:saveAdjustment', async ({ token, adjustment }) => saveAdjustment(await openRealm(), requireUser(token, 'inventory.adjust'), adjustment))
  handle('inventory:removeAdjustment', async ({ token, id }) => (requireUser(token, 'inventory.adjust'), removeAdjustment(await openRealm(), id)))
  handle('inventory:lowStock', async ({ token }) => (requireUser(token), getLowStockProducts(await openRealm())))

  // Treasury
  handle('treasury:list', async ({ token }) => (requireUser(token, 'treasury.view'), listTreasuries(await openRealm())))
  handle('treasury:save', async ({ token, treasury }) => {
    const r = await openRealm(); const session = requireUser(token, 'treasury.manage')
    const result = saveTreasury(r, treasury, session)
    try { logActivity(r, session, { action: 'إضافة خزينة', details: treasury.name }) } catch {}
    return result
  })
  handle('treasury:remove', async ({ token, id }) => {
    const r = await openRealm(); const session = requireUser(token, 'treasury.manage')
    const result = removeTreasury(r, id)
    try { logActivity(r, session, { action: 'حذف خزينة', details: id }) } catch {}
    return result
  })
  handle('treasury:add', async ({ token, data }) => {
    const r = await openRealm(); const session = requireUser(token, 'treasury.manage')
    const result = addToTreasury(r, data, session)
    try { logActivity(r, session, { action: 'إضافة أموال للخزينة', details: data.amount + ' - ' + (data.personName || '') }) } catch {}
    return result
  })
  handle('treasury:withdraw', async ({ token, data }) => {
    const r = await openRealm(); const session = requireUser(token, 'treasury.manage')
    const result = withdrawFromTreasury(r, data, session)
    try { logActivity(r, session, { action: data.category ? 'سحب تشغيلي' : 'سحب شخصي', details: data.amount + ' - ' + data.personName }) } catch {}
    return result
  })
  handle('treasury:transfer', async ({ token, data }) => {
    const r = await openRealm(); const session = requireUser(token, 'treasury.transfer')
    const result = transferBetweenTreasuries(r, data, session)
    try { logActivity(r, session, { action: 'تحويل خزينة', details: data.amount }) } catch {}
    return result
  })
  handle('treasury:transactions', async ({ token, treasuryId, limit }) => (requireUser(token, 'treasury.view'), listTransactions(await openRealm(), { treasuryId, limit })))

  // Contact
  handle('contact:getInfo', () => CONTACT_INFO)
  handle('open-external', (_, url) => { shell.openExternal(url); return true })

  // App
  handle('app:close', () => app.quit())
  handle('get-app-version', () => app.getVersion())
  handle('check-for-updates-now', async () => { try { await autoUpdater.checkForUpdates() } catch(e) { BrowserWindow.getAllWindows().forEach(w => w.webContents.send('update-status', { type: 'error', message: e.message })) }; return true })
  handle('download-update-now', async () => { try { await autoUpdater.downloadUpdate() } catch(e) { BrowserWindow.getAllWindows().forEach(w => w.webContents.send('update-status', { type: 'error', message: e.message })) }; return true })
  handle('install-update-now', () => { autoUpdater.quitAndInstall(); return true })
  handle('dialog:selectFolder', async () => {
    const { dialog } = require('electron')
    const result = await dialog.showOpenDialog({
      properties: ['openDirectory']
    })
    if (result.canceled) return null
    return result.filePaths[0]
  })
  handle('open-releases-page', () => shell.openExternal('https://github.com/Abdullah70MO/smartx-pos-releases/releases'))
}

function createWindow() {
  const win = new BrowserWindow({
    fullscreen: true,
    width: 1440, height: 900,
    minWidth: 1024, minHeight: 760,
    title: 'SMART X',
    icon: path.join(__dirname, '..', '..', 'resources', 'icon.ico'),
    backgroundColor: nativeTheme.shouldUseDarkColors ? '#0f172a' : '#f8fafc',
    titleBarStyle: 'hiddenInset',
    webPreferences: {
      preload: path.join(__dirname, '..', 'preload', 'index.js'),
      sandbox: false,
      contextIsolation: true,
      nodeIntegration: false
    }
  })

  win.webContents.setWindowOpenHandler(({ url }) => {
    shell.openExternal(url)
    return { action: 'deny' }
  })

  // Open DevTools in dev mode only
  if (process.env.ELECTRON_RENDERER_URL) win.webContents.openDevTools()

  if (process.env.ELECTRON_RENDERER_URL) {
    win.loadURL(process.env.ELECTRON_RENDERER_URL)
  } else {
    win.loadFile(path.join(__dirname, '..', '..', 'dist', 'index.html'))
  }
}

async function seedDatabase() {
  try {
    const r = await openRealm()
    const settings = r.objectForPrimaryKey('BusinessSettings', 'business')

    r.write(() => {
      if (!settings) {
        r.create('BusinessSettings', {
          _id: 'business', currency: 'EGP', taxEnabled: true,
          calendarType: 'gregorian', timeFormat: '24', theme: 'dark', fontFamily: 'dark',
          printAfterPayment: true, seeded: true
        })
      } else if (!settings.seeded) {
        settings.seeded = true
      }

      if (!r.objectForPrimaryKey('Counter', 'invoice')) {
        r.create('Counter', { _id: 'invoice', value: 1000 })
      }

      if (!r.objectForPrimaryKey('Treasury', 'bank')) {
        r.create('Treasury', { _id: 'bank', name: 'البنك', type: 'bank', balance: 0, createdAt: new Date(), updatedAt: new Date() })
      }
      if (!r.objectForPrimaryKey('Treasury', 'main')) {
        r.create('Treasury', { _id: 'main', name: 'الخزينة الرئيسية', type: 'main', balance: 0, createdAt: new Date(), updatedAt: new Date() })
      }

      const existingAdmin = r.objects('User').filtered('username == "admin"')[0]
      if (!existingAdmin) {
        r.create('User', {
          _id: require('node:crypto').randomUUID(),
          name: 'مدير النظام',
          username: 'admin',
          passwordHash: bcrypt.hashSync('admin', 12),
          role: 'admin',
          permissions: [...ALL_ADMIN_PERMISSIONS],
          active: true,
          createdAt: new Date()
        })
      } else if (existingAdmin.role === 'admin') {
        existingAdmin.permissions = [...ALL_ADMIN_PERMISSIONS]
      }
    })
  } catch (e) {
    console.error('Seed failed:', e.message)
  }
}

app.commandLine.appendSwitch('no-sandbox')
app.whenReady().then(async () => {
  Menu.setApplicationMenu(null)
  registerIpc()
  await seedDatabase()
  createWindow()
  startPeriodicCheck(await openRealm())
  app.on('activate', () => {
    if (BrowserWindow.getAllWindows().length === 0) createWindow()
  })
})

app.on('window-all-closed', () => {
  if (process.platform !== 'darwin') {
    try {
      openRealm().then(r => {
        const activeShifts = r.objects('Shift').filtered('isActive == true')
        r.write(() => {
          activeShifts.forEach(s => { s.isActive = false; s.endedAt = new Date() })
        })
        closeRealm()
      })
    } catch(e) {}
    stopPeriodicCheck()
    app.quit()
  }
})
