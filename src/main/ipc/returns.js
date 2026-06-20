const Realm = require('realm')
const crypto = require('node:crypto')
const { returnToFifo, deductFromFifo, syncProductStock } = require('./inventoryHelpers')
const { createNotification } = require('./notifications')

function updateTreasury(realm, amount, note, session, paymentMethod) {
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
    amount, note: note || '', refType: 'return',
    paymentMethod: paymentMethod || 'cash',
    createdBy: session.name || session.userId || 'system', createdAt: new Date()
  })
}

function listReturns(realm, saleId) {
  let returns
  if (saleId) {
    returns = realm.objects('Return').filtered('saleId == $0', saleId).sorted('createdAt', true)
  } else {
    returns = realm.objects('Return').sorted('createdAt', true)
  }
  return Array.from(returns).map(r => ({
    _id: r._id, saleId: r.saleId, invoiceNo: r.invoiceNo,
    items: Array.from(r.items).map(item => ({
      productId: item.productId, name: item.name,
      quantity: item.quantity, unitPrice: item.unitPrice, cost: item.cost
    })),
    subtotal: r.subtotal, reason: r.reason,
    cashierId: r.cashierId, cashierName: r.cashierName,
    customerName: r.customerName, isFullReturn: r.isFullReturn,
    paymentMethod: r.paymentMethod, refundAmount: r.refundAmount, tax: r.tax,
    createdAt: r.createdAt?.toISOString()
  }))
}

function listReturnsByCustomer(realm, customerName) {
  const returns = realm.objects('Return').filtered('customerName == $0', customerName).sorted('createdAt', true)
  return Array.from(returns).map(r => ({
    _id: r._id, saleId: r.saleId, invoiceNo: r.invoiceNo,
    items: Array.from(r.items).map(item => ({
      productId: item.productId, name: item.name,
      quantity: item.quantity, unitPrice: item.unitPrice, cost: item.cost
    })),
    subtotal: r.subtotal, reason: r.reason,
    cashierId: r.cashierId, cashierName: r.cashierName,
    customerName: r.customerName, isFullReturn: r.isFullReturn,
    paymentMethod: r.paymentMethod, refundAmount: r.refundAmount, tax: r.tax,
    createdAt: r.createdAt?.toISOString()
  }))
}

function createReturn(realm, session, data) {
  let ret
  realm.write(() => {
    const previousReturns = realm.objects('Return').filtered('saleId == $0', data.saleId)
    const returnedQtyMap = new Map()
    previousReturns.forEach(r => {
      r.items.forEach(item => {
        const key = item.productId
        returnedQtyMap.set(key, (returnedQtyMap.get(key) || 0) + item.quantity)
      })
    })

    const sale = realm.objectForPrimaryKey('Sale', data.saleId)
    if (!sale) throw new Error('الفاتورة غير موجودة')

    data.items.forEach(item => {
      const saleItem = sale.items.find(i => i.productId === item.productId)
      if (!saleItem) throw new Error(`المنتج ${item.name} غير موجود في الفاتورة`)
      const alreadyReturned = returnedQtyMap.get(item.productId) || 0
      const remaining = saleItem.quantity - alreadyReturned
      if (item.quantity > remaining) {
        if (remaining <= 0) throw new Error(`تم إرجاع المنتج "${item.name}" بالفعل`)
        throw new Error(`الكمية المطلوب إرجاعها من "${item.name}" (${item.quantity}) تتجاوز المتبقي (${remaining})`)
      }
      const product = realm.objectForPrimaryKey('Product', item.productId)
      if (product) {
        const qty = Number(item.quantity) || 0
        const cost = Number(item.cost) || 0
        returnToFifo(realm, product._id, qty, cost)
      }
    })

    const saleTaxRate = sale.tax > 0 && sale.subtotal > 0 ? (sale.tax / sale.subtotal * 100) : 0
    const returnSubtotal = Number(data.subtotal) || 0
    const returnTaxAmount = saleTaxRate > 0 ? (returnSubtotal * saleTaxRate / 100) : 0

    let refundAmount = Number(data.subtotal)
    let totalPaidForSale = Number(sale.paid || 0)
    if (sale.paymentMethod === 'credit') {
      refundAmount = data.cashRefund ? Math.min(Number(data.subtotal), totalPaidForSale) : 0
    }

    ret = realm.create('Return', {
      _id: crypto.randomUUID(),
      saleId: data.saleId,
      invoiceNo: data.invoiceNo,
      items: data.items.map(item => ({
        productId: item.productId, name: item.name,
        quantity: Number(item.quantity) || 0,
        unitPrice: Number(item.unitPrice) || 0,
        cost: Number(item.cost) || 0
      })),
      subtotal: Number(data.subtotal) || 0,
      tax: returnTaxAmount,
      reason: data.reason || '',
      cashierId: session.userId,
      cashierName: session.name,
      customerName: data.customerName || '',
      isFullReturn: data.isFullReturn || false,
      paymentMethod: data.paymentMethod || sale.paymentMethod || 'cash',
      refundAmount,
      createdAt: new Date()
    })

    const activeShift = realm.objects('Shift').filtered('cashierId == $0 AND isActive == true', session.userId)[0]
    const isCreditReturn = data.paymentMethod === 'credit' || sale.paymentMethod === 'credit'

    if (refundAmount > 0) {
      if (activeShift && !isCreditReturn) {
        const fullAmount = refundAmount + (sale.tax > 0 ? returnTaxAmount : 0)
        updateTreasury(realm, -fullAmount, 'مرتجع فاتورة #' + data.invoiceNo, session, data.paymentMethod || sale.paymentMethod || 'cash')
        activeShift.totalSales -= fullAmount
        if (data.paymentMethod === 'card') activeShift.cardTotal -= refundAmount
        else activeShift.cashTotal -= refundAmount
        if (sale.tax > 0) {
          if (data.paymentMethod === 'card') activeShift.cardTotal -= returnTaxAmount
          else activeShift.cashTotal -= returnTaxAmount
        }
      } else if (data.paymentMethod !== 'credit') {
        updateTreasury(realm, -refundAmount, 'مرتجع فاتورة #' + data.invoiceNo, session, data.paymentMethod || sale.paymentMethod || 'cash')
      }
      if (activeShift && sale.paymentMethod === 'credit') {
        activeShift.totalSales -= refundAmount
        activeShift.creditPaidTotal -= refundAmount
      }
    } else if (sale.tax > 0 && saleTaxRate > 0 && activeShift && !isCreditReturn) {
      const taxReturn = returnTaxAmount
      updateTreasury(realm, -taxReturn, 'ضريبة مرتجع فاتورة #' + data.invoiceNo, session, 'cash')
      activeShift.totalSales -= taxReturn
      activeShift.cashTotal -= taxReturn
    }

    if (data.customerName) {
      const customer = realm.objects('CreditCustomer').filtered('name == $0', data.customerName)[0]
      if (sale.paymentMethod === 'credit') {
        if (customer) {
          customer.totalDebt = Math.max(0, (customer.totalDebt || 0) - Number(data.subtotal) - returnTaxAmount)
          customer.totalPaid = Math.max(0, (customer.totalPaid || 0) - refundAmount)
          customer.updatedAt = new Date()
        }
      } else if (data.paymentMethod === 'credit') {
        const creditAmount = Number(data.subtotal) + returnTaxAmount
        if (customer) {
          customer.totalDebt = Math.max(0, (customer.totalDebt || 0) - Number(data.subtotal))
          customer.totalPaid = Math.max(0, (customer.totalPaid || 0) + creditAmount)
          customer.updatedAt = new Date()
        } else {
          realm.create('CreditCustomer', {
            _id: crypto.randomUUID(),
            name: data.customerName,
            phone: sale.customerPhone || '',
            totalDebt: 0,
            totalPaid: creditAmount,
            createdAt: new Date(),
            updatedAt: new Date()
          })
        }
      }
    }
  })
  const settings = realm.objectForPrimaryKey('BusinessSettings', 'business')
  if (settings && settings.notificationReturns !== false) {
    createNotification(realm, {
      type: 'return',
      title: 'مرتجع منتجات',
      message: `مرتجع فاتورة #${ret.invoiceNo} - ${ret.subtotal + ret.tax} ج.م`,
      referenceId: ret._id,
      referenceType: 'return'
    })
  }
  return { _id: ret._id, invoiceNo: ret.invoiceNo, saleId: ret.saleId, subtotal: ret.subtotal, reason: ret.reason, cashierId: ret.cashierId, cashierName: ret.cashierName, customerName: ret.customerName, isFullReturn: ret.isFullReturn, refundAmount: ret.refundAmount, tax: ret.tax, createdAt: ret.createdAt?.toISOString() }
}

function removeReturn(realm, id, session) {
  realm.write(() => {
    const ret = realm.objectForPrimaryKey('Return', id)
    if (ret) {
      const sale = realm.objectForPrimaryKey('Sale', ret.saleId)
      ret.items.forEach(item => {
        const product = realm.objectForPrimaryKey('Product', item.productId)
        if (product) {
          const qty = Number(item.quantity) || 0
          const cost = Number(item.cost) || 0
          const returnBatches = realm.objects('StockBatch').filtered('productId == $0 AND refId == "return" AND quantity > 0', item.productId).sorted('createdAt')
          let remaining = qty
          for (const batch of returnBatches) {
            if (remaining <= 0) break
            const take = Math.min(batch.quantity, remaining)
            batch.quantity -= take
            remaining -= take
            if (batch.quantity <= 0) realm.delete(batch)
          }
          if (remaining > 0) {
            deductFromFifo(realm, product._id, remaining)
          }
          syncProductStock(realm, product._id)
        }
      })
      const retRefundAmount = ret.refundAmount != null ? Number(ret.refundAmount) : Number(ret.subtotal)
      const retTax = Number(ret.tax || 0)
      const activeShift = realm.objects('Shift').filtered('cashierId == $0 AND isActive == true', session.userId)[0]
      const isCreditReturn = ret.paymentMethod === 'credit' || (sale && sale.paymentMethod === 'credit')

      if (activeShift && !isCreditReturn) {
        const pm = ret.paymentMethod || sale?.paymentMethod || 'cash'
        const fullAmount = retRefundAmount + retTax
        const treasuryType = pm === 'card' ? 'bank' : 'main'
        const treasury = realm.objects('Treasury').filtered('type == $0', treasuryType)[0] || realm.objects('Treasury').filtered('type == "main"')[0]
        if (treasury) {
          treasury.balance += fullAmount
          treasury.updatedAt = new Date()
          realm.create('TreasuryTransaction', {
            _id: crypto.randomUUID(),
            treasuryId: treasury._id, treasuryName: treasury.name,
            type: 'deposit', amount: fullAmount,
            note: 'إلغاء مرتجع #' + ret.invoiceNo, refType: 'return', refId: ret._id,
            paymentMethod: pm,
            createdBy: 'system', createdAt: new Date()
          })
        }
        activeShift.totalSales += fullAmount
        if (ret.paymentMethod === 'card') activeShift.cardTotal += fullAmount
        else activeShift.cashTotal += fullAmount
      } else if (ret.paymentMethod !== 'credit' && retRefundAmount > 0) {
        const pm = ret.paymentMethod || sale?.paymentMethod || 'cash'
        const treasuryType = pm === 'card' ? 'bank' : 'main'
        const treasury = realm.objects('Treasury').filtered('type == $0', treasuryType)[0] || realm.objects('Treasury').filtered('type == "main"')[0]
        if (treasury) {
          treasury.balance += retRefundAmount
          treasury.updatedAt = new Date()
          realm.create('TreasuryTransaction', {
            _id: crypto.randomUUID(),
            treasuryId: treasury._id, treasuryName: treasury.name,
            type: 'deposit', amount: retRefundAmount,
            note: 'إلغاء مرتجع #' + ret.invoiceNo, refType: 'return', refId: ret._id,
            paymentMethod: pm,
            createdBy: 'system', createdAt: new Date()
          })
        }
      }
      if (activeShift && sale && sale.paymentMethod === 'credit' && retRefundAmount > 0) {
        activeShift.totalSales += retRefundAmount
        activeShift.creditPaidTotal += retRefundAmount
      }

      if (sale && sale.paymentMethod === 'credit' && sale.customerName) {
        const customer = realm.objects('CreditCustomer').filtered('name == $0', sale.customerName)[0]
        if (customer) {
          customer.totalDebt = (customer.totalDebt || 0) + Number(ret.subtotal) + Number(ret.tax || 0)
          customer.totalPaid = Math.max(0, (customer.totalPaid || 0) + retRefundAmount)
          customer.updatedAt = new Date()
        }
      }
      if (ret.customerName && ret.paymentMethod === 'credit' && sale && sale.paymentMethod !== 'credit') {
        const customer = realm.objects('CreditCustomer').filtered('name == $0', ret.customerName)[0]
        const creditAmount = Number(ret.subtotal) + Number(ret.tax || 0)
        if (customer) {
          customer.totalDebt = Math.max(0, (customer.totalDebt || 0) + Number(ret.subtotal))
          customer.totalPaid = Math.max(0, (customer.totalPaid || 0) - creditAmount)
          customer.updatedAt = new Date()
        }
      }
      realm.delete(ret)
    }
  })
  return true
}

module.exports = { listReturns, listReturnsByCustomer, createReturn, removeReturn }
