const { contextBridge, ipcRenderer } = require('electron')

const api = {
  // Auth
  login: (username, password) => ipcRenderer.invoke('auth:login', { username, password }),
  getSession: (token) => ipcRenderer.invoke('auth:session', token),
  logout: (token) => ipcRenderer.invoke('auth:logout', token),
  getSecurityQuestion: (username) => ipcRenderer.invoke('auth:getSecurityQuestion', { username }),
  verifySecurityAnswer: (username, answer) => ipcRenderer.invoke('auth:verifySecurityAnswer', { username, answer }),
  resetPassword: (username, newPassword, answer) => ipcRenderer.invoke('auth:resetPassword', { username, newPassword, answer }),

  // License
  checkLicense: () => ipcRenderer.invoke('license:check'),
  activateLicense: (key) => ipcRenderer.invoke('license:activate', { key }),
  startTrial: () => ipcRenderer.invoke('license:startTrial'),
  periodicCheck: () => ipcRenderer.invoke('license:periodicCheck'),
  serverCheckLicense: () => ipcRenderer.invoke('license:serverCheck'),

  // Products
  listProducts: (token, query, limit, page, pageSize) => ipcRenderer.invoke('products:list', { token, query, limit, page, pageSize }),
  listProductMeta: (token) => ipcRenderer.invoke('products:meta', { token }),
  saveProduct: (token, product) => ipcRenderer.invoke('products:save', { token, product }),
  removeProduct: (token, id) => ipcRenderer.invoke('products:remove', { token, id }),

  // Sales
  listSales: (token, filter, page, pageSize) => ipcRenderer.invoke('sales:list', { token, filter, page, pageSize }),
  createSale: (token, sale) => ipcRenderer.invoke('sales:create', { token, sale }),
  removeSale: (token, id) => ipcRenderer.invoke('sales:remove', { token, id }),
  getSalePaidAmount: (token, saleId) => ipcRenderer.invoke('sales:paidForSale', { token, saleId }),

  // Expenses
  listExpenses: (token, filter, page, pageSize) => ipcRenderer.invoke('expenses:list', { token, filter, page, pageSize }),
  saveExpense: (token, expense) => ipcRenderer.invoke('expenses:save', { token, expense }),
  removeExpense: (token, id) => ipcRenderer.invoke('expenses:remove', { token, id }),

  // Users
  listUsers: (token) => ipcRenderer.invoke('users:list', { token }),
  saveUser: (token, user) => ipcRenderer.invoke('users:save', { token, user }),
  toggleUserActive: (token, id) => ipcRenderer.invoke('users:toggleActive', { token, id }),

  // Settings
  getSettings: (token) => ipcRenderer.invoke('settings:get', { token }),
  saveSettings: (token, settings) => ipcRenderer.invoke('settings:save', { token, settings }),
  selectFolder: () => ipcRenderer.invoke('dialog:selectFolder'),

  // Dashboard
  dashboardSummary: (token) => ipcRenderer.invoke('dashboard:summary', { token }),

  // Backup
  exportBackup: (token) => ipcRenderer.invoke('backup:export', { token }),
  restoreBackup: (token) => ipcRenderer.invoke('backup:restore', { token }),
  autoBackup: (token, path) => ipcRenderer.invoke('backup:auto', { token, path }),
  resetDatabase: (token) => ipcRenderer.invoke('backup:reset', { token }),

  // Notifications
  listNotifications: (token, options) => ipcRenderer.invoke('notifications:list', { token, ...options }),
  getUnreadCount: (token) => ipcRenderer.invoke('notifications:unreadCount', { token }),
  markNotificationRead: (token, id) => ipcRenderer.invoke('notifications:markRead', { token, id }),
  markAllNotificationsRead: (token) => ipcRenderer.invoke('notifications:markAllRead', { token }),
  deleteNotification: (token, id) => ipcRenderer.invoke('notifications:delete', { token, id }),
  clearAllNotifications: (token) => ipcRenderer.invoke('notifications:clearAll', { token }),

  // Returns
  listReturns: (token, filter, page, pageSize) => ipcRenderer.invoke('returns:list', { token, filter, page, pageSize }),
listReturnsByCustomer: (token, customerName, page, pageSize) => ipcRenderer.invoke('returns:listByCustomer', { token, customerName, page, pageSize }),
  createReturn: (token, ret) => ipcRenderer.invoke('returns:create', { token, ret }),
  removeReturn: (token, id) => ipcRenderer.invoke('returns:remove', { token, id }),

  listPurchaseReturns: (token, filter, page, pageSize) => ipcRenderer.invoke('purchaseReturns:list', { token, filter, page, pageSize }),
listPurchaseReturnsBySupplier: (token, supplierName, page, pageSize) => ipcRenderer.invoke('purchaseReturns:listBySupplier', { token, supplierName, page, pageSize }),
  createPurchaseReturn: (token, ret) => ipcRenderer.invoke('purchaseReturns:create', { token, ret }),

  // Shifts
  getActiveShift: (token) => ipcRenderer.invoke('shifts:getActive', { token }),
  startShift: (token, startingBalance) => ipcRenderer.invoke('shifts:start', { token, startingBalance }),
  endShift: (token, endingCashBalance, endingCardBalance) => ipcRenderer.invoke('shifts:end', { token, endingCashBalance, endingCardBalance }),
  listShifts: (token, filter, page, pageSize) => ipcRenderer.invoke('shifts:list', { token, filter, page, pageSize }),
  getShiftSales: (token) => ipcRenderer.invoke('shifts:sales', { token }),

  // Activity
  listActivity: (token, filter, page, pageSize) => ipcRenderer.invoke('activity:list', { token, filter, page, pageSize }),
  logActivity: (token, action, details) => ipcRenderer.invoke('activity:log', { token, action, details }),

  // Customers
  listCustomers: (token, query, page, pageSize) => ipcRenderer.invoke('customers:list', { token, query, page, pageSize }),
  saveCustomer: (token, customer) => ipcRenderer.invoke('customers:save', { token, customer }),
  removeCustomer: (token, id) => ipcRenderer.invoke('customers:remove', { token, id }),

  // Suppliers
  listSuppliers: (token, query, page, pageSize) => ipcRenderer.invoke('suppliers:list', { token, query, page, pageSize }),
  saveSupplier: (token, supplier) => ipcRenderer.invoke('suppliers:save', { token, supplier }),
  removeSupplier: (token, id) => ipcRenderer.invoke('suppliers:remove', { token, id }),

  // Supplier Payments
  listSupplierPayments: (token, supplierId) => ipcRenderer.invoke('supplierPayments:list', { token, supplierId }),
  createSupplierPayment: (token, payment) => ipcRenderer.invoke('supplierPayments:create', { token, payment }),
  removeSupplierPayment: (token, id) => ipcRenderer.invoke('supplierPayments:remove', { token, id }),

  // Customer Payments
  listCustomerPayments: (token, customerId) => ipcRenderer.invoke('customerPayments:list', { token, customerId }),
  createCustomerPayment: (token, payment) => ipcRenderer.invoke('customerPayments:create', { token, payment }),
  removeCustomerPayment: (token, id) => ipcRenderer.invoke('customerPayments:remove', { token, id }),

  // Employees
  listEmployees: (token, query, page, pageSize) => ipcRenderer.invoke('employees:list', { token, query, page, pageSize }),
  getEmployee: (token, id) => ipcRenderer.invoke('employees:get', { token, id }),
  saveEmployee: (token, employee) => ipcRenderer.invoke('employees:save', { token, employee }),
  removeEmployee: (token, id) => ipcRenderer.invoke('employees:remove', { token, id }),
  listEmployeeAdvances: (token, employeeId) => ipcRenderer.invoke('employees:advances', { token, employeeId }),
  saveEmployeeAdvance: (token, advance) => ipcRenderer.invoke('employees:saveAdvance', { token, advance }),
  listEmployeeAttendance: (token, employeeId, month, year) => ipcRenderer.invoke('employees:attendance', { token, employeeId, month, year }),
  saveEmployeeAttendance: (token, data) => ipcRenderer.invoke('employees:saveAttendance', { token, data }),
  removeEmployeeAttendance: (token, data) => ipcRenderer.invoke('employees:removeAttendance', { token, data }),
  payEmployeeSalary: (token, data) => ipcRenderer.invoke('employees:paySalary', { token, data }),
  listEmployeeSalaryPayments: (token, employeeId) => ipcRenderer.invoke('employees:salaryPayments', { token, employeeId }),

  // Purchases
  listPurchases: (token, filter, page, pageSize) => ipcRenderer.invoke('purchases:list', { token, filter, page, pageSize }),
  createPurchase: (token, purchase) => ipcRenderer.invoke('purchases:create', { token, purchase }),
  savePurchase: (token, purchase) => ipcRenderer.invoke('purchases:save', { token, purchase }),
  removePurchase: (token, id) => ipcRenderer.invoke('purchases:remove', { token, id }),

  // Inventory
  listAdjustments: (token, filter, page, pageSize) => ipcRenderer.invoke('inventory:adjustments', { token, filter, page, pageSize }),
  createAdjustment: (token, adjustment) => ipcRenderer.invoke('inventory:createAdjustment', { token, adjustment }),
  saveAdjustment: (token, adjustment) => ipcRenderer.invoke('inventory:saveAdjustment', { token, adjustment }),
  removeAdjustment: (token, id) => ipcRenderer.invoke('inventory:removeAdjustment', { token, id }),
  getLowStockProducts: (token) => ipcRenderer.invoke('inventory:lowStock', { token }),
  getInventoryBatchReport: (token, query) => ipcRenderer.invoke('inventory:batchReport', { token, query }),
  getProductBatches: (token, productId) => ipcRenderer.invoke('inventory:productBatches', { token, productId }),

  // Treasury
  listTreasuries: (token) => ipcRenderer.invoke('treasury:list', { token }),
  saveTreasury: (token, treasury) => ipcRenderer.invoke('treasury:save', { token, treasury }),
  removeTreasury: (token, id) => ipcRenderer.invoke('treasury:remove', { token, id }),
  addToTreasury: (token, data) => ipcRenderer.invoke('treasury:add', { token, data }),
  withdrawFromTreasury: (token, data) => ipcRenderer.invoke('treasury:withdraw', { token, data }),
  transferBetweenTreasuries: (token, data) => ipcRenderer.invoke('treasury:transfer', { token, data }),
  listTreasuryTransactions: (token, treasuryId, limit) => ipcRenderer.invoke('treasury:transactions', { token, treasuryId, limit }),

  // Contact
  getContactInfo: () => ipcRenderer.invoke('contact:getInfo'),
  openExternal: (url) => ipcRenderer.invoke('open-external', url),

  // App
  closeApp: () => ipcRenderer.invoke('app:close'),
  getAppVersion: () => ipcRenderer.invoke('get-app-version'),
  checkForUpdates: () => ipcRenderer.invoke('check-for-updates-now'),
  downloadUpdate: () => ipcRenderer.invoke('download-update-now'),
  installUpdate: () => ipcRenderer.invoke('install-update-now'),
  openReleasesPage: () => ipcRenderer.invoke('open-releases-page'),
  onUpdateStatus: (callback) => {
    const handler = (_event, status) => callback(status)
    ipcRenderer.on('update-status', handler)
    return () => ipcRenderer.removeListener('update-status', handler)
  },
  onGraceWarning: (callback) => {
    const handler = (_event, data) => callback(data)
    ipcRenderer.on('license:grace-warning', handler)
    return () => ipcRenderer.removeListener('license:grace-warning', handler)
  },
  getGraceWarning: () => ipcRenderer.invoke('license:getGraceWarning'),
  onLicenseRevoked: (callback) => {
    const handler = (_event, data) => callback(data)
    ipcRenderer.on('license:revoked', handler)
    return () => ipcRenderer.removeListener('license:revoked', handler)
  },

  // Print
  printA4: (token, html, silent, deviceName, pageSize) => ipcRenderer.invoke('print:a4', { token, html, silent, deviceName, pageSize }),
  listPrinters: () => ipcRenderer.invoke('printers:list')
}

contextBridge.exposeInMainWorld('smartx', api)
