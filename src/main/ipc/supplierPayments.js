const Realm = require('realm')
const crypto = require('node:crypto')
const { createNotification } = require('./notifications')

function updateTreasury(realm, amount, note, userId, refId, paymentMethod) {
  if (amount === 0) return
  const treasuryType = paymentMethod === 'card' ? 'bank' : 'main'
  const treasury = realm.objects('Treasury').filtered('type == $0', treasuryType)[0] || realm.objects('Treasury').filtered('type == "main"')[0]
  if (!treasury) return
  if (amount < 0 && treasury.balance + amount < 0) {
    throw new Error('الرصيد غير كافٍ في الخزينة')
  }
  treasury.balance += amount
  treasury.updatedAt = new Date()
  realm.create('TreasuryTransaction', {
    _id: crypto.randomUUID(),
    treasuryId: treasury._id, treasuryName: treasury.name,
    type: 'supplierPayment',
    amount, note: note || '', refType: 'supplierPayment', refId: refId || '',
    paymentMethod: paymentMethod || 'cash',
    createdBy: userId, createdAt: new Date()
  })
}

function listSupplierPayments(realm, supplierId) {
  return Array.from(realm.objects('SupplierPayment').filtered('supplierId == $0', supplierId).sorted('createdAt', true)).map(p => ({
    _id: p._id, supplierId: p.supplierId, supplierName: p.supplierName,
    amount: p.amount, note: p.note, paymentMethod: p.paymentMethod,
    createdBy: p.createdBy, createdAt: p.createdAt?.toISOString()
  }))
}

function createSupplierPayment(realm, user, { supplierId, supplierName, amount, note, paymentMethod, source }) {
  const parsedAmount = Number(amount)
  if (isNaN(parsedAmount) || parsedAmount <= 0) throw new Error('مبلغ غير صالح')
  let payment
  realm.write(() => {
    payment = realm.create('SupplierPayment', {
      _id: crypto.randomUUID(),
      supplierId, supplierName: supplierName || '', amount: parsedAmount,
      note: note || '', paymentMethod: paymentMethod || 'cash',
      createdBy: user.name, createdAt: new Date()
    })
    const supplier = realm.objectForPrimaryKey('Supplier', supplierId)
    if (supplier) {
      supplier.totalPaid = (supplier.totalPaid || 0) + parsedAmount
      supplier.updatedAt = new Date()
    }
    const activeShift = realm.objects('Shift').filtered('cashierId == $0 AND isActive == true', user.userId)[0]
    if (activeShift && source === 'shift') {
      if (paymentMethod === 'card') {
        const cardAvailable = (activeShift.cardTotal || 0) - (activeShift.cardWithdrawalsTotal || 0)
        if (cardAvailable < parsedAmount) throw new Error('الرصيد غير كافٍ في رصيد البطاقة')
        activeShift.cardWithdrawalsTotal = (activeShift.cardWithdrawalsTotal || 0) + parsedAmount
      } else {
        const available = (activeShift.startingBalance || 0) + (activeShift.cashTotal || 0) + (activeShift.creditPaidTotal || 0) - (activeShift.expensesTotal || 0) - (activeShift.withdrawalsTotal || 0)
        if (available < parsedAmount) throw new Error('الرصيد غير كافٍ في الوردية')
        activeShift.withdrawalsTotal = (activeShift.withdrawalsTotal || 0) + parsedAmount
      }
    } else {
      updateTreasury(realm, -parsedAmount, 'تسديد لمورد - ' + (supplierName || ''), user.name, payment._id, paymentMethod)
    }
  })
  const settings = realm.objectForPrimaryKey('BusinessSettings', 'business')
  if (settings && settings.notificationPayments !== false) {
    createNotification(realm, {
      type: 'payment',
      title: 'سداد مورد',
      message: `تم سداد ${payment.amount} ج.م للمورد ${payment.supplierName || 'مورد'}`,
      referenceId: payment._id,
      referenceType: 'supplierPayment'
    })
  }
  return { _id: payment._id, supplierId: payment.supplierId, supplierName: payment.supplierName, amount: payment.amount, note: payment.note, paymentMethod: payment.paymentMethod, createdBy: payment.createdBy, createdAt: payment.createdAt?.toISOString() }
}

function removeSupplierPayment(realm, user, id) {
  realm.write(() => {
    const payment = realm.objectForPrimaryKey('SupplierPayment', id)
    if (payment) {
      const supplier = realm.objectForPrimaryKey('Supplier', payment.supplierId)
      if (supplier) {
        supplier.totalPaid = Math.max(0, (supplier.totalPaid || 0) - payment.amount)
        supplier.updatedAt = new Date()
      }
      const activeShift = realm.objects('Shift').filtered('cashierId == $0 AND isActive == true', user?.userId || '')[0]
      if (activeShift && payment.paymentMethod === 'card' && (activeShift.cardWithdrawalsTotal || 0) >= payment.amount) {
        activeShift.cardWithdrawalsTotal = Math.max(0, (activeShift.cardWithdrawalsTotal || 0) - payment.amount)
      } else if (activeShift && (activeShift.withdrawalsTotal || 0) >= payment.amount) {
        activeShift.withdrawalsTotal = Math.max(0, (activeShift.withdrawalsTotal || 0) - payment.amount)
      } else {
        updateTreasury(realm, payment.amount, 'إلغاء تسديد مورد - ' + (payment.supplierName || ''), 'system', payment._id, payment.paymentMethod || 'cash')
      }
      realm.delete(payment)
    }
  })
  return true
}

module.exports = { listSupplierPayments, createSupplierPayment, removeSupplierPayment }