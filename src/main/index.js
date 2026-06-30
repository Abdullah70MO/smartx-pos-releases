const { app, BrowserWindow, ipcMain, shell, nativeTheme, Menu } = require('electron')
const { autoUpdater } = require('electron-updater')
const path = require('path')
const { openRealm, closeRealm } = require('./database')
const { login, getSession, logout, requireUser, getSecurityQuestion, verifySecurityAnswer, resetPassword } = require('./ipc/auth')
const bcrypt = require('bcryptjs')
const { listProducts, listProductMeta, saveProduct, removeProduct } = require('./ipc/products')
const { listPurchases, createPurchase, savePurchase, removePurchase } = require('./ipc/purchases')
const { listAdjustments, createAdjustment, saveAdjustment, removeAdjustment, getLowStockProducts, getInventoryBatchReport, getProductBatches, createInventory, listInventories, getInventory } = require('./ipc/inventory')
const { listSales, createSale, removeSale } = require('./ipc/sales')
const { listExpenses, saveExpense, removeExpense } = require('./ipc/expenses')
const { listUsers, saveUser, toggleUserActive, ROLES, ALL_PERMISSIONS } = require('./ipc/users')
const { getSettings, saveSettings } = require('./ipc/settings')
const { exportBackup, restoreBackup, autoBackup, resetDatabase } = require('./ipc/backup')
const { checkLicense, activateLicense, startTrial, periodicCheck, serverLicenseCheck, startPeriodicCheck, stopPeriodicCheck, getGraceWarning } = require('./ipc/license')
const { listNotifications, getUnreadCount, markAsRead, markAllAsRead, deleteNotification, clearAllNotifications, checkAndCreateLowStockNotifications, checkAndCreateExpiryNotifications } = require('./ipc/notifications')
const { dashboardSummary } = require('./ipc/dashboard')
const { listReturns, listReturnsByCustomer, createReturn, removeReturn } = require('./ipc/returns')
const { listPurchaseReturns, listPurchaseReturnsBySupplier, createPurchaseReturn } = require('./ipc/purchaseReturns')
const { getActiveShift, hasAnyActiveShift, startShift, endShift, listShifts, getShiftSales } = require('./ipc/shifts')
const { logActivity, listActivity } = require('./ipc/activity')
const { listCustomers, saveCustomer, removeCustomer } = require('./ipc/customers')
const { listSuppliers, saveSupplier, removeSupplier } = require('./ipc/suppliers')
const { listSupplierPayments, createSupplierPayment, removeSupplierPayment } = require('./ipc/supplierPayments')
const { listCustomerPayments, createCustomerPayment, removeCustomerPayment } = require('./ipc/customerPayments')
const { listTreasuries, saveTreasury, removeTreasury, addToTreasury, withdrawFromTreasury, transferBetweenTreasuries, listTransactions } = require('./ipc/treasury')
const { listEmployees, getEmployee, saveEmployee, removeEmployee, listAdvances, saveAdvance, listAttendance, saveAttendance, removeAttendance, paySalary, listSalaryPayments } = require('./ipc/employees')
const { CONTACT_INFO } = require('./constants')

const { addBatch } = require('./ipc/inventoryHelpers')
const { getSalePaidAmount } = require('./ipc/getSalePaidAmount')

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
      throw typeof err === 'object' && err ? err : new Error(String(err))
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
  handle('auth:getSecurityQuestion', async ({ username }) => getSecurityQuestion(await openRealm(), username))
  handle('auth:verifySecurityAnswer', async ({ username, answer }) => verifySecurityAnswer(await openRealm(), username, answer))
  handle('auth:resetPassword', async ({ username, newPassword, answer }) => resetPassword(await openRealm(), username, newPassword, answer))

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
  handle('license:serverCheck', async () => serverLicenseCheck(await openRealm()))

  // Print
  handle('print:a4', async ({ token, html, silent, deviceName, pageSize }) => {
    if (!html) return
    requireUser(token, 'sales.view')
    const printWin = new BrowserWindow({
      show: false,
      width: 1200,
      height: 900,
      webPreferences: {
        sandbox: false,
        contextIsolation: true,
        nodeIntegration: false,
        offscreen: true
      }
    })
    const isCustomSize = pageSize && typeof pageSize === 'string' && pageSize.includes('mm')
    const opts = { silent: !!silent, margins: { marginType: isCustomSize ? 'none' : 'default' } }
    if (deviceName) opts.deviceName = deviceName
    if (isCustomSize) {
      const parts = pageSize.replace('mm', '').trim().split(/\s+/)
      const w = parseInt(parts[0])
      const h = parts[1] ? parseInt(parts[1]) : w * 1.5
      if (w > 0) opts.pageSize = { width: w * 1000, height: (h > 0 ? h : w * 1.5) * 1000 }
    } else if (pageSize && typeof pageSize === 'string') {
      opts.pageSize = pageSize
    }
    return new Promise((resolve, reject) => {
      let done = false
      function cleanup(err) {
        if (done) return
        done = true
        if (err) reject(err)
        else resolve()
        setTimeout(() => { try { if (!printWin.isDestroyed()) printWin.destroy() } catch {} }, 300)
      }
      const timeout = setTimeout(() => cleanup(new Error('انتهت مهلة الطباعة')), 30000)
      printWin.webContents.on('did-finish-load', () => {
        if (done) return
        printWin.webContents.print(opts, (success, reason) => {
          clearTimeout(timeout)
          cleanup(success ? null : new Error(reason || 'فشلت الطباعة'))
        })
      })
      printWin.webContents.on('did-fail-load', (_event, _errorCode, errorDescription) => {
        clearTimeout(timeout)
        cleanup(new Error(errorDescription || 'فشل تحميل صفحة الطباعة'))
      })
      printWin.loadURL(`data:text/html;charset=utf-8,${encodeURIComponent(html)}`).catch(err => {
        if (done) return
        done = true
        reject(err)
        try { printWin.destroy() } catch {}
      })
    })
  })
  handle('printers:list', async () => {
    const wins = BrowserWindow.getAllWindows()
    if (wins.length > 0) {
      return wins[0].webContents.getPrintersAsync()
    }
    return []
  })

  // Products
  handle('products:list', async ({ token, query, limit, page, pageSize }) => (requireUser(token, ['products.view', 'cashier.access']), listProducts(await openRealm(), query, limit, page, pageSize)))
  handle('products:meta', async ({ token }) => (requireUser(token, 'products.view'), listProductMeta(await openRealm())))
  handle('products:save', async ({ token, product }) => {
    const r = await openRealm(); const session = requireUser(token, 'products.manage', r)
    const result = saveProduct(r, product)
    try { logActivity(r, session, { action: product._id ? 'تعديل منتج' : 'إضافة منتج', details: product.name }) } catch {}
    return result
  })
  handle('products:remove', async ({ token, id }) => {
    const r = await openRealm(); const session = requireUser(token, 'products.manage', r)
    const result = removeProduct(r, id)
    try { logActivity(r, session, { action: 'حذف منتج', details: id }) } catch {}
    return result
  })

  // Sales
  handle('sales:list', async ({ token, filter, page, pageSize }) => (requireUser(token, ['sales.view', 'cashier.access']), listSales(await openRealm(), filter, page, pageSize)))
  handle('sales:create', async ({ token, sale }) => {
    const r = await openRealm(); const session = requireUser(token, ['sales.create', 'cashier.access'], r)
    const result = createSale(r, session, sale)
    try { logActivity(r, session, { action: 'إضافة فاتورة', details: '#' + result.invoiceNo + ' - ' + result.total }) } catch {}
    return result
  })
  handle('sales:remove', async ({ token, id }) => {
    const r = await openRealm(); const session = requireUser(token, 'sales.delete', r)
    const result = removeSale(r, id)
    try { logActivity(r, session, { action: 'حذف فاتورة', details: id }) } catch {}
    return result
  })
  handle('sales:paidForSale', async ({ token, saleId }) => (requireUser(token, ['sales.view', 'cashier.access']), getSalePaidAmount(await openRealm(), saleId)))

  // Expenses
  handle('expenses:list', async ({ token, filter, page, pageSize }) => (requireUser(token, 'expenses.view'), listExpenses(await openRealm(), filter, page, pageSize)))
  handle('expenses:save', async ({ token, expense }) => {
    const r = await openRealm(); const session = requireUser(token, ['expenses.manage', 'cashier.access'], r)
    const result = saveExpense(r, session, expense)
    try { logActivity(r, session, { action: expense._id ? 'تعديل مصروف' : 'إضافة مصروف', details: String(expense.amount) }) } catch {}
    return result
  })
  handle('expenses:remove', async ({ token, id }) => {
    const r = await openRealm(); const session = requireUser(token, ['expenses.manage', 'cashier.access'], r)
    const result = removeExpense(r, id)
    try { logActivity(r, session, { action: 'حذف مصروف', details: id }) } catch {}
    return result
  })

  // Users
  handle('users:list', async ({ token }) => (requireUser(token, 'users.view'), listUsers(await openRealm())))
  handle('users:save', async ({ token, user }) => {
    const r = await openRealm(); const session = requireUser(token, 'users.manage', r)
    const result = saveUser(r, user)
    try { logActivity(r, session, { action: user._id ? 'تعديل مستخدم' : 'إضافة مستخدم', details: user.username }) } catch {}
    return result
  })
  handle('users:toggleActive', async ({ token, id }) => { const r = await openRealm(); requireUser(token, 'users.manage', r); return toggleUserActive(r, id) })

  // Settings
  handle('settings:get', async ({ token }) => (requireUser(token, ['settings.view', 'cashier.access']), getSettings(await openRealm())))
  handle('settings:save', async ({ token, settings }) => (requireUser(token, 'settings.manage'), saveSettings(await openRealm(), settings)))

  // Dashboard
  handle('dashboard:summary', async ({ token }) => (requireUser(token, 'dashboard.view'), dashboardSummary(await openRealm())))

  // Backup
  handle('backup:export', async ({ token }) => (requireUser(token, 'backup.manage'), exportBackup()))
  handle('backup:restore', async ({ token }) => (requireUser(token, 'backup.manage'), restoreBackup()))
  handle('backup:auto', async ({ token, path }) => (requireUser(token, 'backup.manage'), autoBackup(path)))
  handle('backup:reset', async ({ token }) => (requireUser(token, 'backup.manage'), resetDatabase()))

  // Notifications
  handle('notifications:list', async ({ token, unreadOnly, limit, offset }) => (requireUser(token, 'dashboard.view'), listNotifications(await openRealm(), { unreadOnly, limit, offset })))
  handle('notifications:unreadCount', async ({ token }) => (requireUser(token, 'dashboard.view'), getUnreadCount(await openRealm())))
  handle('notifications:markRead', async ({ token, id }) => (requireUser(token, 'dashboard.view'), markAsRead(await openRealm(), id)))
  handle('notifications:markAllRead', async ({ token }) => (requireUser(token, 'dashboard.view'), markAllAsRead(await openRealm())))
  handle('notifications:delete', async ({ token, id }) => (requireUser(token, 'dashboard.view'), deleteNotification(await openRealm(), id)))
  handle('notifications:clearAll', async ({ token }) => (requireUser(token, 'dashboard.view'), clearAllNotifications(await openRealm())))

  // Returns
  handle('returns:list', async ({ token, filter, page, pageSize }) => (requireUser(token, ['returns.view', 'cashier.access']), listReturns(await openRealm(), filter, page, pageSize)))
  handle('returns:listByCustomer', async ({ token, customerName, page, pageSize }) => (requireUser(token, ['returns.view', 'cashier.access']), listReturnsByCustomer(await openRealm(), customerName, page, pageSize)))
  handle('returns:create', async ({ token, ret }) => {
    const r = await openRealm(); const session = requireUser(token, ['returns.create', 'cashier.access'], r)
    const result = createReturn(r, session, ret)
    try { logActivity(r, session, { action: 'إرجاع منتجات', details: '#' + result.invoiceNo }) } catch {}
    return result
  })
  handle('returns:remove', async ({ token, id }) => {
    const r = await openRealm(); const session = requireUser(token, ['returns.create', 'cashier.access'], r)
    removeReturn(r, id, session)
    try { logActivity(r, session, { action: 'حذف مرتجع', details: id }) } catch {}
    return true
  })

  // Purchase Returns
  handle('purchaseReturns:list', async ({ token, filter, page, pageSize }) => (requireUser(token, 'returns.view'), listPurchaseReturns(await openRealm(), filter, page, pageSize)))
  handle('purchaseReturns:listBySupplier', async ({ token, supplierName, page, pageSize }) => (requireUser(token, 'returns.view'), listPurchaseReturnsBySupplier(await openRealm(), supplierName, page, pageSize)))
  handle('purchaseReturns:create', async ({ token, ret }) => {
    const r = await openRealm(); const session = requireUser(token, 'returns.create', r)
    const result = createPurchaseReturn(r, session, ret)
    try { logActivity(r, session, { action: 'مرتجع مشتريات', details: '#' + result.invoiceNo + ' - ' + result.supplierName }) } catch {}
    return result
  })

  // Shifts
  handle('shifts:getActive', async ({ token }) => { const session = requireUser(token, ['shifts.view', 'cashier.access']); return getActiveShift(await openRealm(), session.userId) })
  handle('shifts:hasActive', async ({ token }) => (requireUser(token, ['shifts.view', 'inventory.view']), hasAnyActiveShift(await openRealm())))
  handle('shifts:start', async ({ token, startingBalance }) => startShift(await openRealm(), requireUser(token, ['shifts.manage', 'cashier.access']), startingBalance))
  handle('shifts:end', async ({ token, endingCashBalance, endingCardBalance }) => {
    const r = await openRealm(); const session = requireUser(token, ['shifts.manage', 'cashier.access'], r)
    const result = endShift(r, session, endingCashBalance, endingCardBalance)
    return result
  })
  handle('shifts:list', async ({ token, filter, page, pageSize }) => (requireUser(token, ['shifts.view', 'cashier.access']), listShifts(await openRealm(), filter, page, pageSize)))
  handle('shifts:sales', async ({ token }) => { const session = requireUser(token, ['shifts.view', 'cashier.access']); return getShiftSales(await openRealm(), session.userId) })

  // Activity
  handle('activity:list', async ({ token, filter, page, pageSize }) => (requireUser(token, 'activity.view'), listActivity(await openRealm(), filter, page, pageSize)))
  handle('activity:log', async ({ token, action, details }) => { const session = requireUser(token, 'activity.view'); logActivity(await openRealm(), session, { action, details }) })

  // Customers
  handle('customers:list', async ({ token, query, page, pageSize }) => (requireUser(token, ['customers.view', 'cashier.access']), listCustomers(await openRealm(), query, page, pageSize)))
  handle('customers:save', async ({ token, customer }) => {
    const r = await openRealm(); const session = requireUser(token, 'customers.manage', r)
    const result = saveCustomer(r, customer)
    try { logActivity(r, session, { action: customer._id ? 'تعديل عميل' : 'إضافة عميل', details: customer.name }) } catch {}
    return result
  })
  handle('customers:remove', async ({ token, id }) => {
    const r = await openRealm(); const session = requireUser(token, 'customers.manage', r)
    const result = removeCustomer(r, id)
    try { logActivity(r, session, { action: 'حذف عميل', details: id }) } catch {}
    return result
  })

  // Suppliers
  handle('suppliers:list', async ({ token, query, page, pageSize }) => (requireUser(token, 'suppliers.view'), listSuppliers(await openRealm(), query, page, pageSize)))
  handle('suppliers:save', async ({ token, supplier }) => {
    const r = await openRealm(); const session = requireUser(token, 'suppliers.manage', r)
    const result = saveSupplier(r, supplier)
    try { logActivity(r, session, { action: supplier._id ? 'تعديل مورد' : 'إضافة مورد', details: supplier.name }) } catch {}
    return result
  })
  handle('suppliers:remove', async ({ token, id }) => {
    const r = await openRealm(); const session = requireUser(token, 'suppliers.manage', r)
    const result = removeSupplier(r, id)
    try { logActivity(r, session, { action: 'حذف مورد', details: id }) } catch {}
    return result
  })

  // Supplier Payments
  handle('supplierPayments:list', async ({ token, supplierId }) => (requireUser(token, 'suppliers.payments'), listSupplierPayments(await openRealm(), supplierId)))
  handle('supplierPayments:create', async ({ token, payment }) => {
    const r = await openRealm(); const session = requireUser(token, 'suppliers.payments', r)
    const result = createSupplierPayment(r, session, payment)
    try { logActivity(r, session, { action: 'دفعة مورد', details: payment.supplierName + ' - ' + payment.amount }) } catch {}
    return result
  })
  handle('supplierPayments:remove', async ({ token, id }) => (requireUser(token, 'suppliers.payments'), removeSupplierPayment(await openRealm(), id)))

  // Customer Payments
  handle('customerPayments:list', async ({ token, customerId }) => (requireUser(token, 'customers.payments'), listCustomerPayments(await openRealm(), customerId)))
  handle('customerPayments:create', async ({ token, payment }) => {
    const r = await openRealm(); const session = requireUser(token, 'customers.payments', r)
    const result = createCustomerPayment(r, session, payment)
    try { logActivity(r, session, { action: 'دفعة عميل', details: payment.customerName + ' - ' + payment.amount }) } catch {}
    return result
  })
  handle('customerPayments:remove', async ({ token, id }) => (requireUser(token, 'customers.payments'), removeCustomerPayment(await openRealm(), id)))

  // Employees
  handle('employees:list', async ({ token, query, page, pageSize }) => (requireUser(token, 'employees.view'), listEmployees(await openRealm(), query, page, pageSize)))
  handle('employees:get', async ({ token, id }) => (requireUser(token, 'employees.view'), getEmployee(await openRealm(), id)))
  handle('employees:save', async ({ token, employee }) => {
    const r = await openRealm(); const session = requireUser(token, 'employees.manage', r)
    const result = saveEmployee(r, employee)
    try { logActivity(r, session, { action: employee._id ? 'تعديل موظف' : 'إضافة موظف', details: employee.name }) } catch {}
    return result
  })
  handle('employees:remove', async ({ token, id }) => {
    const r = await openRealm(); const session = requireUser(token, 'employees.manage', r)
    const result = removeEmployee(r, id)
    try { logActivity(r, session, { action: 'حذف موظف', details: id }) } catch {}
    return result
  })
  handle('employees:advances', async ({ token, employeeId }) => (requireUser(token, 'employees.view'), listAdvances(await openRealm(), employeeId)))
  handle('employees:saveAdvance', async ({ token, advance }) => {
    const r = await openRealm(); const session = requireUser(token, 'employees.manage', r)
    return saveAdvance(r, advance, session)
  })
  handle('employees:attendance', async ({ token, employeeId, month, year }) => (requireUser(token, 'employees.view'), listAttendance(await openRealm(), employeeId, month, year)))
  handle('employees:saveAttendance', async ({ token, data }) => (requireUser(token, 'employees.manage'), saveAttendance(await openRealm(), data)))
  handle('employees:removeAttendance', async ({ token, data }) => (requireUser(token, 'employees.manage'), removeAttendance(await openRealm(), data)))
  handle('employees:paySalary', async ({ token, data }) => {
    const r = await openRealm(); const session = requireUser(token, 'employees.salaries', r)
    return paySalary(r, data, session)
  })
  handle('employees:salaryPayments', async ({ token, employeeId }) => (requireUser(token, 'employees.view'), listSalaryPayments(await openRealm(), employeeId)))

  // Purchases
  handle('purchases:list', async ({ token, filter, page, pageSize }) => (requireUser(token, 'purchases.view'), listPurchases(await openRealm(), filter, page, pageSize)))
  handle('purchases:create', async ({ token, purchase }) => {
    const r = await openRealm(); const session = requireUser(token, 'purchases.create', r)
    const result = createPurchase(r, session, purchase)
    try { logActivity(r, session, { action: 'فاتورة شراء', details: '#' + result.invoiceNo }) } catch {}
    return result
  })
  handle('purchases:save', async ({ token, purchase }) => {
    const r = await openRealm(); const session = requireUser(token, 'purchases.create', r)
    const result = savePurchase(r, session, purchase)
    try { logActivity(r, session, { action: 'تحديث فاتورة شراء', details: '#' + result.invoiceNo }) } catch {}
    return result
  })
  handle('purchases:remove', async ({ token, id }) => {
    const r = await openRealm(); const session = requireUser(token, 'purchases.delete', r)
    const result = removePurchase(r, id)
    try { logActivity(r, session, { action: 'حذف فاتورة شراء', details: id }) } catch {}
    return result
  })

  // Inventory Adjustments
  handle('inventory:adjustments', async ({ token, filter, page, pageSize }) => (requireUser(token, 'inventory.view'), listAdjustments(await openRealm(), filter, page, pageSize)))
  handle('inventory:createAdjustment', async ({ token, adjustment }) => createAdjustment(await openRealm(), requireUser(token, 'inventory.adjust'), adjustment))
  handle('inventory:saveAdjustment', async ({ token, adjustment }) => saveAdjustment(await openRealm(), requireUser(token, 'inventory.adjust'), adjustment))
  handle('inventory:removeAdjustment', async ({ token, id }) => (requireUser(token, 'inventory.adjust'), removeAdjustment(await openRealm(), id)))
  handle('inventory:lowStock', async ({ token }) => (requireUser(token, 'inventory.view'), getLowStockProducts(await openRealm())))
  handle('inventory:batchReport', async ({ token, query }) => (requireUser(token, 'inventory.view'), getInventoryBatchReport(await openRealm(), query)))
  handle('inventory:productBatches', async ({ token, productId }) => (requireUser(token, 'inventory.view'), getProductBatches(await openRealm(), productId)))
  handle('inventory:createInventory', async ({ token, data }) => createInventory(await openRealm(), requireUser(token, 'inventory.adjust'), data))
  handle('inventory:listInventories', async ({ token, filter, page, pageSize }) => (requireUser(token, 'inventory.view'), listInventories(await openRealm(), filter, page, pageSize)))
  handle('inventory:getInventory', async ({ token, id }) => (requireUser(token, 'inventory.view'), getInventory(await openRealm(), id)))

  // Treasury
  handle('treasury:list', async ({ token }) => (requireUser(token, 'treasury.view'), listTreasuries(await openRealm())))
  handle('treasury:save', async ({ token, treasury }) => {
    const r = await openRealm(); const session = requireUser(token, 'treasury.manage', r)
    const result = saveTreasury(r, treasury, session)
    try { logActivity(r, session, { action: 'إضافة خزينة', details: treasury.name }) } catch {}
    return result
  })
  handle('treasury:remove', async ({ token, id }) => {
    const r = await openRealm(); const session = requireUser(token, 'treasury.manage', r)
    const result = removeTreasury(r, id)
    try { logActivity(r, session, { action: 'حذف خزينة', details: id }) } catch {}
    return result
  })
  handle('treasury:add', async ({ token, data }) => {
    const r = await openRealm(); const session = requireUser(token, 'treasury.manage', r)
    const result = addToTreasury(r, data, session)
    try { logActivity(r, session, { action: 'إضافة أموال للخزينة', details: data.amount + ' - ' + (data.personName || '') }) } catch {}
    return result
  })
  handle('treasury:withdraw', async ({ token, data }) => {
    const r = await openRealm(); const session = requireUser(token, 'treasury.manage', r)
    const result = withdrawFromTreasury(r, data, session)
    try { logActivity(r, session, { action: data.category ? 'سحب تشغيلي' : 'سحب شخصي', details: data.amount + ' - ' + data.personName }) } catch {}
    return result
  })
  handle('treasury:transfer', async ({ token, data }) => {
    const r = await openRealm(); const session = requireUser(token, 'treasury.transfer', r)
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
    show: false,
    width: 1440, height: 900,
    minWidth: 1024, minHeight: 760,
    title: 'SMART X',
    icon: path.join(__dirname, '..', '..', 'resources', 'icon.ico'),
    backgroundColor: nativeTheme.shouldUseDarkColors ? '#0f172a' : '#f8fafc',
    titleBarStyle: process.platform === 'darwin' ? 'hiddenInset' : 'default',
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

  win.webContents.on('did-fail-load', (_e, code, desc) => {
    console.error('Page load failed:', code, desc)
  })

  win.on('ready-to-show', () => {
    win.show()
    console.log('Window shown')
  })

  // Open DevTools in dev mode only
  if (process.env.ELECTRON_RENDERER_URL) {
    win.webContents.openDevTools()
    console.log('Dev mode - loading from:', process.env.ELECTRON_RENDERER_URL)
  }

  if (process.env.ELECTRON_RENDERER_URL) {
    win.loadURL(process.env.ELECTRON_RENDERER_URL)
  } else {
    win.loadFile(path.join(__dirname, '..', '..', 'dist', 'index.html'))
  }

  console.log('createWindow done')
}

async function seedDatabase() {
  try {
    const r = await openRealm()
    const settings = r.objectForPrimaryKey('BusinessSettings', 'business')

    r.write(() => {
      if (!settings) {
        r.create('BusinessSettings', {
          _id: 'business', currency: 'EGP', taxEnabled: true,
          calendarType: 'gregorian', timeFormat: '24', theme: 'dark', fontFamily: 'Cairo',
          printAfterPayment: true, seeded: true
        })
      } else if (!settings.seeded) {
        settings.seeded = true
      }

      if (!r.objectForPrimaryKey('Counter', 'invoice')) {
        r.create('Counter', { _id: 'invoice', value: 1000 })
      }
      if (!r.objectForPrimaryKey('Counter', 'purchase')) {
        r.create('Counter', { _id: 'purchase', value: 1 })
      }

      if (!r.objectForPrimaryKey('Treasury', 'bank')) {
        r.create('Treasury', { _id: 'bank', name: 'البنك', type: 'bank', balance: 0, createdAt: new Date(), updatedAt: new Date() })
      }
      if (!r.objectForPrimaryKey('Treasury', 'main')) {
        r.create('Treasury', { _id: 'main', name: 'الخزينة الرئيسية', type: 'main', balance: 0, createdAt: new Date(), updatedAt: new Date() })
      }

      if (r.objects('User').length === 0) {
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
      }
      // FIFO migration: create StockBatch for existing products
      const existingBatches = r.objects('StockBatch')
      if (existingBatches.length === 0) {
        const products = r.objects('Product')
        products.forEach(p => {
          const stock = p.stock || 0
          const cost = p.cost || 0
          if (stock > 0 && cost > 0) {
            addBatch(r, p._id, stock, cost)
          }
        })
      }
    })
  } catch (e) {
    console.error('Seed error:', e)
  }
}

app.commandLine.appendSwitch('no-sandbox')
app.whenReady().then(async () => {
  Menu.setApplicationMenu(null)
  // Pre-migration: ensure Realm database is at current schema version before
  // the obfuscated openRealm tries to open it (handles new fields with defaults)
  try {
    const Realm = require('realm')
    const { SCHEMAS, SCHEMA_VERSION } = require('./schemas')
    const pre = await Realm.open({ schema: SCHEMAS, schemaVersion: SCHEMA_VERSION, migration: () => {} })
    pre.close()
  } catch (e) {
    // First run or migration already handled — proceed normally
  }
  registerIpc()
  await seedDatabase()
  createWindow()
  startPeriodicCheck()
  // Auto check for updates on startup (after 5s delay) - event listener handles the response
  setTimeout(async () => { try { await autoUpdater.checkForUpdates() } catch {} }, 5000)
  app.on('activate', () => {
    if (BrowserWindow.getAllWindows().length === 0) createWindow()
  })
})

app.on('window-all-closed', () => {
  if (process.platform !== 'darwin') {
    openRealm().then(r => {
      const activeShifts = r.objects('Shift').filtered('isActive == true')
      r.write(() => { activeShifts.forEach(s => { s.isActive = false; s.endedAt = new Date() }) })
      closeRealm()
    }).catch(() => {})
    stopPeriodicCheck()
    app.quit()
  }
})
