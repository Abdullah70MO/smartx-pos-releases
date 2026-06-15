const Realm = require('realm')
const crypto = require('node:crypto')

function updateTreasury(realm, amount, note, userId, refId, paymentMethod) {
  if (amount === 0) return
  const treasuryType = paymentMethod === 'card' ? 'bank' : 'main'
  const treasury = realm.objects('Treasury').filtered('type == $0', treasuryType)[0] || realm.objects('Treasury').filtered('type == "main"')[0]
  if (!treasury) return
  if (amount < 0) {
    const activeShift = realm.objects('Shift').filtered('cashierId == $0 AND isActive == true', userId || '')[0]
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
    amount, note: note || '', refType: 'customerPayment', refId: refId || '',
    paymentMethod: paymentMethod || 'cash',
    createdBy: userId, createdAt: new Date()
  })
}

function listCustomerPayments(realm, customerId) {
  return Array.from(realm.objects('CustomerPayment').filtered('customerId == $0', customerId).sorted('createdAt', true)).map(p => ({
    _id: p._id, customerId: p.customerId, customerName: p.customerName,
    amount: p.amount, note: p.note, paymentMethod: p.paymentMethod,
    createdBy: p.createdBy, createdAt: p.createdAt?.toISOString()
  }))
}

function createCustomerPayment(realm, user, { customerId, customerName, amount, note, paymentMethod }) {
  let payment
  realm.write(() => {
    payment = realm.create('CustomerPayment', {
      _id: crypto.randomUUID(),
      customerId, customerName: customerName || '', amount: Number(amount),
      note: note || '', paymentMethod: paymentMethod || 'cash',
      createdBy: user.name, createdAt: new Date()
    })
    const customer = realm.objectForPrimaryKey('CreditCustomer', customerId)
    if (customer) {
      customer.totalPaid = (customer.totalPaid || 0) + Number(amount)
      customer.updatedAt = new Date()
    }
    updateTreasury(realm, Number(amount), 'تسديد من عميل - ' + (customerName || ''), user.name, payment._id, paymentMethod)
  })
  return { _id: payment._id, customerId: payment.customerId, customerName: payment.customerName, amount: payment.amount, note: payment.note, paymentMethod: payment.paymentMethod, createdBy: payment.createdBy, createdAt: payment.createdAt?.toISOString() }
}

function removeCustomerPayment(realm, id) {
  realm.write(() => {
    const payment = realm.objectForPrimaryKey('CustomerPayment', id)
    if (payment) {
      const customer = realm.objectForPrimaryKey('CreditCustomer', payment.customerId)
      if (customer) {
        customer.totalPaid = Math.max(0, (customer.totalPaid || 0) - payment.amount)
        customer.updatedAt = new Date()
      }
      updateTreasury(realm, -payment.amount, 'إلغاء تسديد عميل - ' + (payment.customerName || ''), 'system', payment._id, payment.paymentMethod || 'cash')
      realm.delete(payment)
    }
  })
  return true
}

module.exports = { listCustomerPayments, createCustomerPayment, removeCustomerPayment }