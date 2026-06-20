const Realm = require('realm')
const crypto = require('node:crypto')
const { deductFromFifo, addBatch } = require('./inventoryHelpers')
const { checkAndCreateLowStockNotifications, createNotification } = require('./notifications')

function updateTreasury(realm, amount, note, session, refId, refType, paymentMethod) {
  if (amount === 0) return
  const treasuryType = paymentMethod === 'card' ? 'bank' : 'main'
  const treasury = realm.objects('Treasury').filtered('type == $0', treasuryType)[0] || realm.objects('Treasury').filtered('type == "main"')[0]
  if (!treasury) return
  if (amount < 0) {
    const activeShift = realm.objects('Shift').filtered('cashierId == $0 AND isActive == true', session?.userId || '')[0]
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
    amount, note: note || '',
    refType, refId: refId || '',
    paymentMethod: paymentMethod || 'cash',
    createdBy: session.name || session.userId || 'system', createdAt: new Date()
  })
}

function listSales(realm, filter) {
  let sales
  if (filter?.paidOnly) {
    sales = realm.objects('Sale').filtered('paymentMethod != "credit" AND paid > 0').sorted('createdAt', true)
  } else {
    sales = realm.objects('Sale').sorted('createdAt', true)
  }
  return Array.from(sales).map(s => ({
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
  }))
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
      const fifoCost = deductFromFifo(realm, item.productId, qty)
      return {
        productId: item.productId,
        name: item.name,
        quantity: qty,
        unitPrice: Number(item.unitPrice) || 0,
        cost: qty > 0 ? fifoCost / qty : 0
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
      paid: data.paid != null ? Number(data.paid) : total,
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

    const paidAmount = data.paid != null ? Number(data.paid) : 0
    if (paidAmount > 0) {
      const pm = data.paymentMethod === 'card' ? 'card' : 'cash'
      updateTreasury(realm, paidAmount, 'مبيعات فاتورة #' + invoiceNo, session, sale._id, 'sale', pm)
    }

    const activeShift = realm.objects('Shift').filtered('cashierId == $0 AND isActive == true', session.userId)[0]
    if (activeShift) {
      const paid = Number(data.paid || 0)
      activeShift.totalSales += paid
      if (data.paymentMethod === 'cash') activeShift.cashTotal += paid
      else if (data.paymentMethod === 'card') activeShift.cardTotal += paid
      else if (data.paymentMethod === 'credit') activeShift.creditPaidTotal += paid
      activeShift.invoiceCount += 1
    }
  })
  checkAndCreateLowStockNotifications(realm)
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
        if (remaining > 0) {
          const cost = item.cost || 0
          addBatch(realm, item.productId, remaining, cost)
        }
      })
      if ((sale.paid || 0) > 0) {
        const pm = sale.paymentMethod === 'card' ? 'card' : 'cash'
        updateTreasury(realm, -sale.paid, 'إلغاء فاتورة #' + sale.invoiceNo, { userId: 'system' }, sale._id, 'sale', pm)
      }
      if (sale.paymentMethod === 'credit' && sale.customerName) {
        const customer = realm.objects('CreditCustomer').filtered('name == $0', sale.customerName)[0]
        if (customer) {
          customer.totalDebt -= sale.total
          customer.totalPaid -= (sale.paid + (sale.previousCredit || 0))
          if (customer.totalDebt < 0) customer.totalDebt = 0
          if (customer.totalPaid < 0) customer.totalPaid = 0
        }
      }
      const activeShift = realm.objects('Shift').filtered('cashierId == $0 AND isActive == true', sale.cashierId)[0]
      if (activeShift) {
        activeShift.totalSales -= sale.paid
        if (sale.paymentMethod === 'cash') activeShift.cashTotal -= sale.paid
        else if (sale.paymentMethod === 'card') activeShift.cardTotal -= sale.paid
        else if (sale.paymentMethod === 'credit') activeShift.creditPaidTotal -= sale.paid
        activeShift.invoiceCount -= 1
      }
      realm.delete(sale)
    }
  })
  return true
}

module.exports = { listSales, createSale, removeSale }
