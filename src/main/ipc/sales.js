const Realm = require('realm')
const crypto = require('node:crypto')
const { deductFromFifo, addBatch } = require('./inventoryHelpers')
const { checkAndCreateLowStockNotifications, checkAndCreateExpiryNotifications, createNotification } = require('./notifications')
const { paginate } = require('../database')

function updateTreasury(realm, amount, note, session, refId, refType, paymentMethod) {
  if (amount === 0) return
  const treasuryType = paymentMethod === 'card' ? 'bank' : 'main'
  const treasury = realm.objects('Treasury').filtered('type == $0', treasuryType)[0] || realm.objects('Treasury').filtered('type == "main"')[0]
  if (!treasury) return
  if (amount < 0) {
    const activeShift = realm.objects('Shift').filtered('cashierId == $0 AND isActive == true', session?.userId || '')[0]
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
    type: 'sale',
    amount, note: note || '',
    refType, refId: refId || '',
    paymentMethod: paymentMethod || 'cash',
    createdBy: session.name || session.userId || 'system', createdAt: new Date()
  })
}

function listSales(realm, filter, page, pageSize) {
  let results
  if (filter?.query) {
    const q = filter.query
    results = realm.objects('Sale').filtered(
      'invoiceNo == $0 OR customerName CONTAINS[c] $1 OR cashierName CONTAINS[c] $1 OR note CONTAINS[c] $1',
      Number(q) || 0, q
    ).sorted('createdAt', true)
  } else if (filter?.paidOnly) {
    results = realm.objects('Sale').filtered('paymentMethod != "credit" AND paid > 0').sorted('createdAt', true)
  } else {
    results = realm.objects('Sale').sorted('createdAt', true)
  }
  if (filter?.from) {
    const from = new Date(filter.from)
    if (!isNaN(from)) results = results.filtered('createdAt >= $0', from)
  }
  if (filter?.to) {
    const to = new Date(filter.to + 'T23:59:59')
    if (!isNaN(to)) results = results.filtered('createdAt <= $0', to)
  }
  const mapSale = s => ({
    _id: s._id, invoiceNo: s.invoiceNo,
    items: Array.from(s.items).map(item => ({
      productId: item.productId, name: item.name,
      quantity: item.quantity, unitPrice: item.unitPrice, cost: item.cost
    })),
    subtotal: s.subtotal, discount: s.discount, tax: s.tax, total: s.total,
    paymentMethod: s.paymentMethod, paid: s.paid,
    cashierId: s.cashierId, cashierName: s.cashierName,
    customerName: s.customerName, customerPhone: s.customerPhone,
    previousCredit: s.previousCredit, previousDebt: s.previousDebt,
    employeeId: s.employeeId,
    note: s.note, createdAt: s.createdAt?.toISOString()
  })
  if (page != null) {
    const result = paginate(results, page, pageSize || 20)
    return { ...result, data: result.data.map(mapSale) }
  }
  return Array.from(results).map(mapSale)
}

function createSale(realm, session, data) {
  let counter = realm.objectForPrimaryKey('Counter', 'invoice')
  if (!counter) {
    realm.write(() => {
      realm.create('Counter', { _id: 'invoice', value: 1000 })
    })
    counter = realm.objectForPrimaryKey('Counter', 'invoice')
  }

  const invoiceNo = counter.value + 1
  const subtotal = data.items.reduce((sum, item) => sum + (item.unitPrice * item.quantity), 0)
  const discount = Number(data.discount) || 0
  const tax = Number(data.tax) || 0
  const total = subtotal - discount + tax

  let sale
  realm.write(() => {
    counter.value = invoiceNo

    const fifoItems = data.items.map(item => {
      const qty = Number(item.quantity) || 0
      const fifoCost = item.productId && !String(item.productId).startsWith('custom_') ? (deductFromFifo(realm, item.productId, qty) || 0) : 0
      return {
        productId: item.productId,
        name: item.name,
        quantity: qty,
        unitPrice: Number(item.unitPrice) || 0,
        cost: item.productId && qty > 0 ? fifoCost / qty : 0
      }
    })

    let previousDebt = 0
    if (data.customerName) {
      const existing = realm.objects('CreditCustomer').filtered('name == $0', data.customerName)[0]
      if (existing) {
        const balance = existing.totalDebt - existing.totalPaid
        previousDebt = Math.max(0, balance)
      }
    }

    sale = realm.create('Sale', {
      _id: crypto.randomUUID(),
      invoiceNo,
      items: fifoItems,
      subtotal, discount, tax, total,
      paymentMethod: data.paymentMethod || 'cash',
      paid: data.paid != null ? (Number(data.paid) || total) : total,
      cashierId: session.userId,
      cashierName: session.name,
      customerName: data.customerName || '',
      customerPhone: data.customerPhone || '',
      previousCredit: Number(data.previousCredit || 0),
      previousDebt,
      employeeId: session.employeeId || '',
      note: data.note || '',
      createdAt: new Date()
    })

    if (data.paymentMethod === 'credit' && data.customerName) {
      const existing = realm.objects('CreditCustomer').filtered('name == $0', data.customerName)[0]
      if (existing) {
        existing.totalDebt += total
        existing.totalPaid += (Number(data.paid || 0) + Number(data.previousCredit || 0))
        existing.updatedAt = new Date()
      } else {
        realm.create('CreditCustomer', {
          _id: crypto.randomUUID(),
          name: data.customerName,
          phone: data.customerPhone || '',
          totalDebt: total,
          totalPaid: Number(data.paid || 0) + Number(data.previousCredit || 0),
          createdAt: new Date(),
          updatedAt: new Date()
        })
      }
    }

    const paidVal = Number(data.paid || 0)
    if (total > 0 || paidVal > 0) {
      const amount = data.paymentMethod === 'credit' ? paidVal : Math.min(paidVal, total)
      if (amount > 0) {
        const pm = data.paymentMethod === 'card' ? 'card' : 'cash'
        updateTreasury(realm, amount, 'مبيعات فاتورة #' + invoiceNo, session, sale._id, 'sale', pm)
      }
    }

    const activeShift = realm.objects('Shift').filtered('cashierId == $0 AND isActive == true', session.userId)[0]
    if (activeShift) {
      activeShift.totalSales += total
      activeShift.cashTotal += data.cashAmount || 0
      activeShift.cardTotal += data.cardAmount || 0
      activeShift.creditPaidTotal += data.creditAmount || 0
      activeShift.invoiceCount += 1
    }
  })
  checkAndCreateLowStockNotifications(realm)
  checkAndCreateExpiryNotifications(realm)
  const settings = realm.objectForPrimaryKey('BusinessSettings', 'business')
  if (settings && settings.notificationSales !== false) {
    createNotification(realm, {
      type: 'sale',
      title: 'تم البيع',
      message: `فاتورة #${invoiceNo} - ${total} ج.م`,
      referenceId: sale._id,
      referenceType: 'sale'
    })
  }
  return {
    _id: sale._id, invoiceNo: sale.invoiceNo, total: sale.total,
    paid: sale.paid, paymentMethod: sale.paymentMethod,
    customerName: sale.customerName, customerPhone: sale.customerPhone,
    previousCredit: sale.previousCredit, previousDebt: sale.previousDebt,
    note: sale.note, createdAt: sale.createdAt?.toISOString()
  }
}

function removeSale(realm, id) {
  realm.write(() => {
    const sale = realm.objectForPrimaryKey('Sale', id)
    if (sale) {
      sale.items.forEach(item => {
        const returns = realm.objects('Return').filtered('saleId == $0', sale._id)
        let returnedQty = 0
        returns.forEach(r => {
          r.items.forEach(ri => {
            if (ri.productId === item.productId) returnedQty += ri.quantity
          })
        })
        const remaining = item.quantity - returnedQty
        if (remaining > 0 && !String(item.productId).startsWith('custom_')) {
          const cost = item.cost || 0
          addBatch(realm, item.productId, remaining, cost)
        }
      })
      if ((sale.paid || 0) > 0 && sale.paymentMethod !== 'credit') {
        const pm = sale.paymentMethod === 'card' ? 'card' : 'cash'
        const reversalAmount = Math.min(sale.paid || 0, sale.total || 0)
        if (reversalAmount > 0) {
          updateTreasury(realm, -reversalAmount, 'إلغاء فاتورة #' + sale.invoiceNo, { userId: 'system' }, sale._id, 'sale', pm)
        }
      }
      if (sale.paymentMethod === 'credit' && sale.customerName) {
        const customer = realm.objects('CreditCustomer').filtered('name == $0', sale.customerName)[0]
        if (customer) {
          customer.totalDebt = Math.max(0, (customer.totalDebt || 0) - sale.total)
          customer.totalPaid = Math.max(0, (customer.totalPaid || 0) - (sale.paid + (sale.previousCredit || 0)))
        }
      }
      const activeShift = realm.objects('Shift').filtered('cashierId == $0 AND isActive == true', sale.cashierId)[0]
      if (activeShift) {
        activeShift.totalSales -= sale.total
        if (sale.paymentMethod === 'cash') activeShift.cashTotal -= sale.total
        else if (sale.paymentMethod === 'card') activeShift.cardTotal -= sale.total
        else if (sale.paymentMethod === 'credit') activeShift.creditPaidTotal -= sale.paid
        activeShift.invoiceCount -= 1
      }
      realm.delete(sale)
    }
  })
  return true
}

module.exports = { listSales, createSale, removeSale }
