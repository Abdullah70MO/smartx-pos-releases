const Realm = require('realm')
const crypto = require('node:crypto')
const { createNotification } = require('./notifications')

function updateTreasury(realm, amount, note, userId, refId, paymentMethod) {
  if (amount === 0) return
  const treasuryType = paymentMethod === 'card' ? 'bank' : 'main'
  const treasury = realm.objects('Treasury').filtered('type == $0', treasuryType)[0] || realm.objects('Treasury').filtered('type == "main"')[0]
  if (!treasury) return
  if (amount < 0) {
    const activeShift = realm.objects('Shift').filtered('cashierId == $0 AND isActive == true', userId || '')[0]
    if (activeShift) {
      const available = activeShift.startingBalance + (activeShift.cashTotal || 0) + (activeShift.creditPaidTotal || 0) - activeShift.expensesTotal - activeShift.withdrawalsTotal
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
    type: 'customerPayment',
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
    const activeShift = realm.objects('Shift').filtered('cashierId == $0 AND isActive == true', user.userId)[0]
    if (activeShift) {
      if (paymentMethod === 'card') {
        activeShift.cardTotal = (activeShift.cardTotal || 0) + Number(amount)
        updateTreasury(realm, Number(amount), 'تسديد من عميل - ' + (customerName || ''), user.name, payment._id, 'card')
      } else if (paymentMethod === 'credit') {
        activeShift.creditPaidTotal = (activeShift.creditPaidTotal || 0) + Number(amount)
      } else {
        activeShift.cashTotal = (activeShift.cashTotal || 0) + Number(amount)
        updateTreasury(realm, Number(amount), 'تسديد من عميل - ' + (customerName || ''), user.name, payment._id, 'cash')
      }
    } else {
      updateTreasury(realm, Number(amount), 'تسديد من عميل - ' + (customerName || ''), user.name, payment._id, paymentMethod)
    }
  })
  const settings = realm.objectForPrimaryKey('BusinessSettings', 'business')
  if (settings && settings.notificationPayments !== false) {
    createNotification(realm, {
      type: 'payment',
      title: 'سداد عميل',
      message: `تم سداد ${payment.amount} ج.م من ${payment.customerName || 'عميل'}`,
      referenceId: payment._id,
      referenceType: 'customerPayment'
    })
  }
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
      const activeShift = realm.objects('Shift').filtered('isActive == true').length > 0
        ? realm.objects('Shift').filtered('isActive == true').sorted('startedAt', true)[0]
        : null
      if (activeShift && payment.paymentMethod === 'card' && (activeShift.cardTotal || 0) >= payment.amount) {
        activeShift.cardTotal = (activeShift.cardTotal || 0) - payment.amount
        updateTreasury(realm, -payment.amount, 'إلغاء تسديد عميل - ' + (payment.customerName || ''), 'system', payment._id, 'card')
      } else if (activeShift && payment.paymentMethod === 'credit' && (activeShift.creditPaidTotal || 0) >= payment.amount) {
        activeShift.creditPaidTotal = (activeShift.creditPaidTotal || 0) - payment.amount
      } else if (activeShift && (activeShift.cashTotal || 0) >= payment.amount) {
        activeShift.cashTotal = (activeShift.cashTotal || 0) - payment.amount
        updateTreasury(realm, -payment.amount, 'إلغاء تسديد عميل - ' + (payment.customerName || ''), 'system', payment._id, 'cash')
      } else {
        updateTreasury(realm, -payment.amount, 'إلغاء تسديد عميل - ' + (payment.customerName || ''), 'system', payment._id, payment.paymentMethod || 'cash')
      }
      realm.delete(payment)
    }
  })
  return true
}

module.exports = { listCustomerPayments, createCustomerPayment, removeCustomerPayment }