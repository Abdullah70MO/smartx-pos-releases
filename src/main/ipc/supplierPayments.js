const Realm = require('realm')
const crypto = require('node:crypto')

function updateTreasury(realm, amount, note, userId, refId, paymentMethod) {
  if (amount === 0) return
  const treasuryType = paymentMethod === 'card' ? 'bank' : 'main'
  const treasury = realm.objects('Treasury').filtered('type == $0', treasuryType)[0] || realm.objects('Treasury').filtered('type == "main"')[0]
  if (!treasury) return
  if (amount < 0) {
    const activeShift = realm.objects('Shift').filtered('isActive == true')[0]
    if (activeShift) {
      const available = activeShift.startingBalance + activeShift.totalSales - activeShift.expensesTotal - activeShift.withdrawalsTotal
      if (available + amount < 0) throw new Error('الرصيد غير كافٍ في الوردية')
    } else if (treasury.balance + amount < 0) {
      throw new Error('الرصيد غير كافٍ في الخزينة')
    }
  }
  treasury.balance += amount
  treasury.updatedAt = new Date()
  realm.create('TreasuryTransaction', {
    _id: crypto.randomUUID(),
    treasuryId: treasury._id, treasuryName: treasury.name,
    type: amount > 0 ? 'deposit' : 'withdraw',
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

function createSupplierPayment(realm, user, { supplierId, supplierName, amount, note, paymentMethod }) {
  let payment
  realm.write(() => {
    payment = realm.create('SupplierPayment', {
      _id: crypto.randomUUID(),
      supplierId, supplierName: supplierName || '', amount: Number(amount),
      note: note || '', paymentMethod: paymentMethod || 'cash',
      createdBy: user.name, createdAt: new Date()
    })
    const supplier = realm.objectForPrimaryKey('Supplier', supplierId)
    if (supplier) {
      supplier.totalPaid = (supplier.totalPaid || 0) + Number(amount)
      supplier.updatedAt = new Date()
    }
    updateTreasury(realm, -Number(amount), 'تسديد لمورد - ' + (supplierName || ''), user.name, payment._id, paymentMethod)
  })
  return { _id: payment._id, supplierId: payment.supplierId, supplierName: payment.supplierName, amount: payment.amount, note: payment.note, paymentMethod: payment.paymentMethod, createdBy: payment.createdBy, createdAt: payment.createdAt?.toISOString() }
}

function removeSupplierPayment(realm, id) {
  realm.write(() => {
    const payment = realm.objectForPrimaryKey('SupplierPayment', id)
    if (payment) {
      const supplier = realm.objectForPrimaryKey('Supplier', payment.supplierId)
      if (supplier) {
        supplier.totalPaid = Math.max(0, (supplier.totalPaid || 0) - payment.amount)
        supplier.updatedAt = new Date()
      }
      updateTreasury(realm, payment.amount, 'إلغاء تسديد مورد - ' + (payment.supplierName || ''), 'system', payment._id, payment.paymentMethod || 'cash')
      realm.delete(payment)
    }
  })
  return true
}

module.exports = { listSupplierPayments, createSupplierPayment, removeSupplierPayment }