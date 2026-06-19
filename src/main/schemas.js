const Realm = require('realm')

const UserSchema = {
  name: 'User',
  primaryKey: '_id',
  properties: {
    _id:           'string',
    name:          'string',
    username:      'string',
    passwordHash:  'string',
    role:          { type: 'string', default: 'cashier' },
    permissions:   'string[]',
    active:        { type: 'bool', default: true },
    employeeId:    { type: 'string', optional: true },
    createdAt:     'date'
  }
}

const ProductSchema = {
  name: 'Product',
  primaryKey: '_id',
  properties: {
    _id:            'string',
    sku:            'string',
    barcode:        { type: 'string', default: '' },
    name:           'string',
    category:       { type: 'string', default: '' },
    unit:           { type: 'string', default: '' },
    cost:           { type: 'double', default: 0 },
    priceRetail:    { type: 'double', default: 0 },
    priceHalfWholesale: { type: 'double', default: 0 },
    priceWholesale: { type: 'double', default: 0 },
    stock:          { type: 'double', default: 0 },
    reorderPoint:   { type: 'double', default: 0 },
    active:         { type: 'bool', default: true },
    image:          { type: 'string', default: '' },
    updatedAt:      'date'
  }
}

const SaleItemSchema = {
  name: 'SaleItem',
  embedded: true,
  properties: {
    productId: 'string',
    name:      'string',
    quantity:  'double',
    unitPrice: 'double',
    cost:      { type: 'double', default: 0 }
  }
}

const SaleSchema = {
  name: 'Sale',
  primaryKey: '_id',
  properties: {
    _id:           'string',
    invoiceNo:     'int',
    items:         { type: 'list', objectType: 'SaleItem' },
    subtotal:      'double',
    discount:      { type: 'double', default: 0 },
    tax:           { type: 'double', default: 0 },
    total:         'double',
    paymentMethod: { type: 'string', default: 'cash' },
    paid:          { type: 'double', default: 0 },
    cashierId:     'string',
    cashierName:   'string',
    customerName:  { type: 'string', default: '' },
    customerPhone: { type: 'string', default: '' },
    previousCredit: { type: 'double', default: 0 },
    previousDebt:   { type: 'double', default: 0 },
    employeeId:    { type: 'string', default: '' },
    note:          { type: 'string', default: '' },
    createdAt:     'date'
  }
}

const ExpenseSchema = {
  name: 'Expense',
  primaryKey: '_id',
  properties: {
    _id:           'string',
    amount:        'double',
    category:      'string',
    note:          { type: 'string', default: '' },
    date:          'date',
    paymentMethod: { type: 'string', default: 'cash' },
    shiftId:       { type: 'string', default: '' },
    createdAt:     'date'
  }
}

const BusinessSettingsSchema = {
  name: 'BusinessSettings',
  primaryKey: '_id',
  properties: {
    _id:                     'string',
    businessName:            { type: 'string', default: '' },
    logoDataUrl:             { type: 'string', default: '' },
    phone:                   { type: 'string', default: '' },
    email:                   { type: 'string', default: '' },
    address:                 { type: 'string', default: '' },
    commercialRegistration:  { type: 'string', default: '' },
    taxNumber:               { type: 'string', default: '' },
    currency:                { type: 'string', default: 'EGP' },
    taxEnabled:              { type: 'bool', default: true },
    calendarType:            { type: 'string', default: 'gregorian' },
    timeFormat:              { type: 'string', default: '24' },
    theme:                   { type: 'string', default: 'dark' },
    fontFamily:              { type: 'string', default: 'Cairo' },
    receiptFooter:           { type: 'string', default: '' },
    printAfterPayment:       { type: 'bool', default: true },
    taxRate:                 { type: 'float', default: 14 },
    printDefaultSize:        { type: 'string', default: 'receipt' },
    printColorMode:          { type: 'string', default: 'color' },
    printDirectly:           { type: 'bool', default: false },
    showCommercialReg:       { type: 'bool', default: true },
    showTaxReg:              { type: 'bool', default: true },
    showBusinessName:        { type: 'bool', default: true },
    showLogo:                { type: 'bool', default: true },
    showPhone:               { type: 'bool', default: true },
    showEmail:               { type: 'bool', default: true },
    showAddress:             { type: 'bool', default: true },
    showReceiptFooter:       { type: 'bool', default: true },
    showProductsTable:       { type: 'bool', default: true },
    showTotals:              { type: 'bool', default: true },
    showPaid:                { type: 'bool', default: true },
    showCashier:             { type: 'bool', default: true },
    showNotes:               { type: 'bool', default: true },
    showClientInfo:          { type: 'bool', default: true },
    showSupplierInfo:        { type: 'bool', default: true },
    autoBackup:              { type: 'bool', default: false },
    autoBackupInterval:      { type: 'string', default: 'weekly' },
    autoBackupLastDate:      { type: 'date', optional: true },
    autoBackupPath:          { type: 'string', default: '' },
    seeded:                  { type: 'bool', default: false }
  }
}

const SupplierPaymentSchema = {
  name: 'SupplierPayment',
  primaryKey: '_id',
  properties: {
    _id:         'string',
    supplierId:  'string',
    supplierName:'string',
    amount:      'double',
    paymentMethod: { type: 'string', default: 'cash' },
    note:        { type: 'string', default: '' },
    createdBy:   'string',
    createdAt:   'date'
  }
}

const CustomerPaymentSchema = {
  name: 'CustomerPayment',
  primaryKey: '_id',
  properties: {
    _id:         'string',
    customerId:  'string',
    customerName: 'string',
    amount:      'double',
    note:        { type: 'string', default: '' },
    paymentMethod: { type: 'string', default: 'cash' },
    createdBy:   'string',
    createdAt:   'date'
  }
}

const LicenseSchema = {
  name: 'License',
  primaryKey: '_id',
  properties: {
    _id:             'string',
    activatedKey:    { type: 'string', default: '' },
    activated:       { type: 'bool', default: false },
    activatedAt:     'date?',
    expiresAt:       'date?',
    licenseType:     { type: 'string', default: '' },
    trialStartedAt:  'date?',
    deviceHwid:      { type: 'string', default: '' },
    lastSeenDate:    'date?'
  }
}

const CounterSchema = {
  name: 'Counter',
  primaryKey: '_id',
  properties: {
    _id:   'string',
    value: 'int'
  }
}

const ReturnItemSchema = {
  name: 'ReturnItem',
  embedded: true,
  properties: {
    productId: 'string',
    name:      'string',
    quantity:  'double',
    unitPrice: 'double',
    cost:      { type: 'double', default: 0 }
  }
}

const ReturnSchema = {
  name: 'Return',
  primaryKey: '_id',
  properties: {
    _id:            'string',
    saleId:         'string',
    invoiceNo:      'int',
    items:          { type: 'list', objectType: 'ReturnItem' },
    subtotal:       'double',
    reason:         { type: 'string', default: '' },
    cashierId:      'string',
    cashierName:    'string',
    customerName:   { type: 'string', default: '' },
    isFullReturn:   { type: 'bool', default: false },
    paymentMethod:  { type: 'string', default: 'cash' },
    refundAmount:   { type: 'double', default: 0 },
    tax:            { type: 'double', default: 0 },
    createdAt:      'date'
  }
}

const ShiftSchema = {
  name: 'Shift',
  primaryKey: '_id',
  properties: {
    _id:             'string',
    cashierId:       'string',
    cashierName:     'string',
    startedAt:       'date',
    endedAt:         'date?',
    startingBalance: { type: 'double', default: 0 },
    endingBalance:   { type: 'double', default: 0 },
    totalSales:      { type: 'double', default: 0 },
    cashTotal:       { type: 'double', default: 0 },
    cardTotal:       { type: 'double', default: 0 },
    creditPaidTotal: { type: 'double', default: 0 },
    expensesTotal:   { type: 'double', default: 0 },
    withdrawalsTotal:{ type: 'double', default: 0 },
    cardWithdrawalsTotal: { type: 'double', default: 0 },
    invoiceCount:    { type: 'int', default: 0 },
    isActive:        { type: 'bool', default: true }
  }
}

const ActivityLogSchema = {
  name: 'ActivityLog',
  primaryKey: '_id',
  properties: {
    _id:        'string',
    userId:     'string',
    userName:   'string',
    action:     'string',
    details:    { type: 'string', default: '' },
    createdAt:  'date'
  }
}

const CreditCustomerSchema = {
  name: 'CreditCustomer',
  primaryKey: '_id',
  properties: {
    _id:           'string',
    name:          'string',
    phone:         { type: 'string', default: '' },
    commercialReg: { type: 'string', default: '' },
    taxReg:        { type: 'string', default: '' },
    address:       { type: 'string', default: '' },
    totalDebt:     { type: 'double', default: 0 },
    totalPaid:     { type: 'double', default: 0 },
    notes:         { type: 'string', default: '' },
    createdAt:     'date',
    updatedAt:     'date'
  }
}

const SupplierSchema = {
  name: 'Supplier',
  primaryKey: '_id',
  properties: {
    _id:             'string',
    name:            'string',
    phone:           { type: 'string', default: '' },
    email:           { type: 'string', default: '' },
    commercialReg:   { type: 'string', default: '' },
    taxReg:          { type: 'string', default: '' },
    address:         { type: 'string', default: '' },
    notes:           { type: 'string', default: '' },
    totalPurchases:  { type: 'double', default: 0 },
    totalPaid:       { type: 'double', default: 0 },
    createdAt:       'date',
    updatedAt:       'date'
  }
}

const PurchaseItemSchema = {
  name: 'PurchaseItem',
  embedded: true,
  properties: {
    productId: 'string',
    name:      'string',
    quantity:  'double',
    cost:      'double',
    subtotal:  'double'
  }
}

const PurchaseReturnItemSchema = {
  name: 'PurchaseReturnItem',
  embedded: true,
  properties: {
    productId:  'string',
    name:       'string',
    quantity:   'double',
    unitPrice:  'double',
    cost:       'double'
  }
}

const PurchaseReturnSchema = {
  name: 'PurchaseReturn',
  primaryKey: '_id',
  properties: {
    _id:          'string',
    purchaseId:   'string',
    invoiceNo:    'int',
    supplierId:   'string',
    supplierName: 'string',
    items:        { type: 'list', objectType: 'PurchaseReturnItem' },
    subtotal:     'double',
    reason:       { type: 'string', default: '' },
    refundAmount: { type: 'double', default: 0 },
    paymentMethod: { type: 'string', default: 'cash' },
    createdBy:    'string',
    createdAt:    'date'
  }
}

const PurchaseSchema = {
  name: 'Purchase',
  primaryKey: '_id',
  properties: {
    _id:           'string',
    invoiceNo:     'int',
    supplierId:    { type: 'string', default: '' },
    supplierName:  { type: 'string', default: '' },
    supplierPhone: { type: 'string', default: '' },
    items:         { type: 'list', objectType: 'PurchaseItem' },
    totalCost:     'double',
    discount:      { type: 'double', default: 0 },
    netCost:       'double',
    paid:          { type: 'double', default: 0 },
    previousCredit: { type: 'double', default: 0 },
    previousDebt:   { type: 'double', default: 0 },
    paymentMethod: { type: 'string', default: 'credit' },
    paymentStatus: { type: 'string', default: 'credit' },
    note:          { type: 'string', default: '' },
    createdBy:     'string',
    createdAt:     'date'
  }
}

const StockBatchSchema = {
  name: 'StockBatch',
  primaryKey: '_id',
  properties: {
    _id:        'string',
    productId:  'string',
    quantity:   'double',
    cost:       'double',
    refId:      { type: 'string', default: '' },
    createdAt:  'date'
  }
}

const InventoryAdjustmentSchema = {
  name: 'InventoryAdjustment',
  primaryKey: '_id',
  properties: {
    _id:        'string',
    productId:  'string',
    productName:'string',
    type:       'string',
    quantity:   'double',
    oldStock:   'double',
    newStock:   'double',
    reason:     { type: 'string', default: '' },
    createdBy:   'string',
    createdAt:   'date'
  }
}

const TreasurySchema = {
  name: 'Treasury',
  primaryKey: '_id',
  properties: {
    _id:       'string',
    name:      'string',
    type:      { type: 'string', default: 'main' },
    balance:   { type: 'double', default: 0 },
    createdAt: 'date',
    updatedAt: 'date'
  }
}

const TreasuryTransactionSchema = {
  name: 'TreasuryTransaction',
  primaryKey: '_id',
  properties: {
    _id:               'string',
    treasuryId:        'string',
    treasuryName:      'string',
    type:              'string',
    amount:            'double',
    note:              { type: 'string', default: '' },
    personName:        { type: 'string', default: '' },
    relatedTreasuryId: { type: 'string', default: '' },
    relatedTreasuryName: { type: 'string', default: '' },
    refType:           { type: 'string', default: '' },
    refId:             { type: 'string', default: '' },
    paymentMethod:     { type: 'string', default: 'cash' },
    createdBy:         'string',
    createdAt:         'date'
  }
}

const EmployeeSchema = {
  name: 'Employee',
  primaryKey: '_id',
  properties: {
    _id:              'string',
    name:             'string',
    phone:            { type: 'string', default: '' },
    email:            { type: 'string', default: '' },
    address:          { type: 'string', default: '' },
    photo:            { type: 'string', default: '' },
    idPhoto:          { type: 'string', default: '' },
    idNumber:         { type: 'string', default: '' },
    idExpiryDate:     { type: 'date', optional: true },
    jobTitle:         { type: 'string', default: '' },
    department:       { type: 'string', default: '' },
    salary:           { type: 'double', default: 0 },
    salaryPeriod:     { type: 'string', default: 'شهري' },
    hireDate:         { type: 'date', optional: true },
    emergencyContact: { type: 'string', default: '' },
    emergencyPhone:   { type: 'string', default: '' },
    notes:            { type: 'string', default: '' },
    workHours:        { type: 'int', default: 12 },
    active:           { type: 'bool', default: true },
    createdAt:        'date',
    updatedAt:        'date'
  }
}

const AdvanceSchema = {
  name: 'Advance',
  primaryKey: '_id',
  properties: {
    _id:         'string',
    employeeId:  'string',
    employeeName: 'string',
    amount:      'double',
    type:        { type: 'string', default: 'advance' },
    date:        'date',
    note:        { type: 'string', default: '' },
    deducted:    { type: 'bool', default: false },
    createdBy:   'string',
    createdAt:   'date'
  }
}

const AttendanceLogSchema = {
  name: 'AttendanceLog',
  primaryKey: '_id',
  properties: {
    _id:        'string',
    employeeId: 'string',
    date:       'date',
    status:     { type: 'string', default: 'absent' },
    loginTime:  { type: 'date', optional: true },
    source:     { type: 'string', default: 'auto' },
    note:       { type: 'string', default: '' }
  }
}

const SalaryPaymentSchema = {
  name: 'SalaryPayment',
  primaryKey: '_id',
  properties: {
    _id:            'string',
    employeeId:     'string',
    employeeName:   'string',
    baseSalary:     'double',
    totalDeductions: 'double',
    totalAdditions: 'double',
    netAmount:      'double',
    month:          'int',
    year:           'int',
    paymentDate:    'date',
    paymentMethod:  { type: 'string', default: 'cash' },
    note:           { type: 'string', default: '' },
    createdBy:      'string',
    createdAt:      'date'
  }
}

const SCHEMAS = [
  UserSchema,
  ProductSchema,
  StockBatchSchema,
  SaleItemSchema,
  SaleSchema,
  PurchaseItemSchema,
  PurchaseSchema,
  InventoryAdjustmentSchema,
  ReturnItemSchema,
  ReturnSchema,
  ExpenseSchema,
  ShiftSchema,
  ActivityLogSchema,
  CreditCustomerSchema,
  SupplierSchema,
  SupplierPaymentSchema,
  CustomerPaymentSchema,
  BusinessSettingsSchema,
  LicenseSchema,
  CounterSchema,
  TreasurySchema,
  TreasuryTransactionSchema,
  PurchaseReturnItemSchema,
  PurchaseReturnSchema,
  EmployeeSchema,
  AdvanceSchema,
  AttendanceLogSchema,
  SalaryPaymentSchema
]

// SCHEMA_VERSION changelog:
//   1-23  Historical versions (additive changes only)
//   24    Added Shift.expensesTotal/withdrawalsTotal, Expense.shiftId, Return.paymentMethod
//   25    Added BusinessSettings.showCommercialReg/showTaxReg, PurchaseReturn.refundAmount
//   26    Added BusinessSettings.showBusinessName..showSupplierInfo, defaults true for show fields
//   27    Added Shift.cashTotal/cardTotal
//   28    CreditCustomer.totalDebt changed from (total - paid) to total (fix remaining calc)
//   29    Added Shift.creditPaidTotal
//   30    Added Return.tax
//   31    Added BusinessSettings.printDirectly
//   32    Added Sale.previousCredit
//   33    Added Purchase.previousCredit
//   34    Added Shift.cardWithdrawalsTotal
//   35    Added Employee, Advance, AttendanceLog, SalaryPayment schemas
//         Added User.employeeId (optional)
//   36    Added Advance.type ('advance' | 'deduction')
//   37    Added Employee.workHours (default 12)
//   38    Added Employee.autoAttendance (default true)
// When adding a breaking change (rename/type change/delete field):
//   1. Increment SCHEMA_VERSION
//   2. Add a case in the migration function in database.js
const SCHEMA_VERSION = 38

module.exports = { SCHEMAS, SCHEMA_VERSION }
