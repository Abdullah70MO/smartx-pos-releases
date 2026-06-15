const { contextBridge, ipcRenderer } = require('electron')

const api = {
  // Auth
  login: (username, password) => ipcRenderer.invoke('auth:login', { username, password }),
  getSession: (token) => ipcRenderer.invoke('auth:session', token),
  logout: (token) => ipcRenderer.invoke('auth:logout', token),

  // License
  checkLicense: () => ipcRenderer.invoke('license:check'),
  activateLicense: (key) => ipcRenderer.invoke('license:activate', { key }),
  startTrial: () => ipcRenderer.invoke('license:startTrial'),
  periodicCheck: () => ipcRenderer.invoke('license:periodicCheck'),
  serverCheckLicense: () => ipcRenderer.invoke('license:serverCheck'),

  // Products
  listProducts: (token, query) => ipcRenderer.invoke('products:list', { token, query }),
  saveProduct: (token, product) => ipcRenderer.invoke('products:save', { token, product }),
  removeProduct: (token, id) => ipcRenderer.invoke('products:remove', { token, id }),

  // Sales
  listSales: (token, filter) => ipcRenderer.invoke('sales:list', { token, filter }),
  createSale: (token, sale) => ipcRenderer.invoke('sales:create', { token, sale }),
  removeSale: (token, id) => ipcRenderer.invoke('sales:remove', { token, id }),

  // Expenses
  listExpenses: (token) => ipcRenderer.invoke('expenses:list', { token }),
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

  // Returns
  listReturns: (token, saleId) => ipcRenderer.invoke('returns:list', { token, saleId }),
  createReturn: (token, ret) => ipcRenderer.invoke('returns:create', { token, ret }),
  removeReturn: (token, id) => ipcRenderer.invoke('returns:remove', { token, id }),

  listPurchaseReturns: (token) => ipcRenderer.invoke('purchaseReturns:list', { token }),
  createPurchaseReturn: (token, ret) => ipcRenderer.invoke('purchaseReturns:create', { token, ret }),
  removePurchaseReturn: (token, id) => ipcRenderer.invoke('purchaseReturns:remove', { token, id }),

  // Shifts
  getActiveShift: (token) => ipcRenderer.invoke('shifts:getActive', { token }),
  startShift: (token, startingBalance) => ipcRenderer.invoke('shifts:start', { token, startingBalance }),
  endShift: (token, endingBalance) => ipcRenderer.invoke('shifts:end', { token, endingBalance }),
  listShifts: (token) => ipcRenderer.invoke('shifts:list', { token }),
  getShiftSales: (token) => ipcRenderer.invoke('shifts:sales', { token }),

  // Activity
  listActivity: (token) => ipcRenderer.invoke('activity:list', { token }),
  logActivity: (token, action, details) => ipcRenderer.invoke('activity:log', { token, action, details }),

  // Customers
  listCustomers: (token) => ipcRenderer.invoke('customers:list', { token }),
  saveCustomer: (token, customer) => ipcRenderer.invoke('customers:save', { token, customer }),
  removeCustomer: (token, id) => ipcRenderer.invoke('customers:remove', { token, id }),

  // Suppliers
  listSuppliers: (token) => ipcRenderer.invoke('suppliers:list', { token }),
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

  // Purchases
  listPurchases: (token) => ipcRenderer.invoke('purchases:list', { token }),
  createPurchase: (token, purchase) => ipcRenderer.invoke('purchases:create', { token, purchase }),
  savePurchase: (token, purchase) => ipcRenderer.invoke('purchases:save', { token, purchase }),
  removePurchase: (token, id) => ipcRenderer.invoke('purchases:remove', { token, id }),

  // Inventory
  listAdjustments: (token) => ipcRenderer.invoke('inventory:adjustments', { token }),
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
  printA4: (token, html) => ipcRenderer.invoke('print:a4', { token, html })
}

contextBridge.exposeInMainWorld('smartx', api)
