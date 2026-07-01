const Realm = require('realm')
const crypto = require('node:crypto')
const { returnToFifo, deductFromFifo, syncProductStock } = require('./inventoryHelpers')
const { createNotification } = require('./notifications')
const { paginate } = require('../database')

function updateTreasury(realm, amount, note, session, paymentMethod) {
  if (amount === 0) return
  const treasuryType = paymentMethod === 'card' ? 'bank' : 'main'
  const treasury = realm.objects('Treasury').filtered('type == $0', treasuryType)[0] || realm.objects('Treasury').filtered('type == "main"')[0]
  if (!treasury) return
  if (amount < 0) {
    const activeShift = realm.objects('Shift').filtered('cashierId == $0 AND isActive == true', session?.userId || '')[0]
    if (activeShift) {
      const available = activeShift.startingBalance + (activeShift.cashTotal || 0) + (activeShift.creditPaidTotal || 0) - activeShift.expensesTotal - activeShift.withdrawalsTotal
      if (available + amount < 0) throw new Error('Ø§Ù„Ø±ØµÙŠØ¯ ØºÙŠØ± ÙƒØ§ÙÙ ÙÙŠ Ø§Ù„ÙˆØ±Ø¯ÙŠØ©')
    } else if (treasury.balance + amount < 0) {
      throw new Error('Ø§Ù„Ø±ØµÙŠØ¯ ØºÙŠØ± ÙƒØ§ÙÙ ÙÙŠ Ø§Ù„Ø®Ø²ÙŠÙ†Ø©')
    }
  }
  treasury.balance += amount
  treasury.updatedAt = new Date()
  realm.create('TreasuryTransaction', {
    _id: crypto.randomUUID(),
    treasuryId: treasury._id, treasuryName: treasury.name,
    type: 'return',
    amount, note: note || '', refType: 'return',
    paymentMethod: paymentMethod || 'cash',
    createdBy: session.name || session.userId || 'system', createdAt: new Date()
  })
}

function listReturns(realm, filter, page, pageSize) {
  let results
  const saleId = filter?.saleId
  if (saleId) {
    results = realm.objects('Return').filtered('saleId == $0', saleId).sorted('createdAt', true)
  } else {
    results = realm.objects('Return').sorted('createdAt', true)
  }
  if (filter?.from) {
    const from = new Date(filter.from + 'T00:00:00')
    if (!isNaN(from)) results = results.filtered('createdAt >= $0', from)
  }
  if (filter?.to) {
    const to = new Date(filter.to + 'T23:59:59')
    if (!isNaN(to)) results = results.filtered('createdAt <= $0', to)
  }
  const mapReturn = r => ({
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
  })
  if (page != null) {
    const result = paginate(results, page, pageSize || 20)
    return { ...result, data: result.data.map(mapReturn) }
  }
  return Array.from(results).map(mapReturn)
}

function listReturnsByCustomer(realm, customerName, page, pageSize) {
  let results = realm.objects('Return').filtered('customerName == $0', customerName).sorted('createdAt', true)
  const mapReturn = r => ({
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
  })
  if (page != null) {
    const result = paginate(results, page, pageSize || 20)
    return { ...result, data: result.data.map(mapReturn) }
  }
  return Array.from(results).map(mapReturn)
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
    if (!sale) throw new Error('Ø§Ù„ÙØ§ØªÙˆØ±Ø© ØºÙŠØ± Ù…ÙˆØ¬ÙˆØ¯Ø©')

    data.items.forEach(item => {
      const saleItem = sale.items.find(i => i.productId === item.productId)
      if (!saleItem) throw new Error(`Ø§Ù„Ù…Ù†ØªØ¬ ${item.name} ØºÙŠØ± Ù…ÙˆØ¬ÙˆØ¯ ÙÙŠ Ø§Ù„ÙØ§ØªÙˆØ±Ø©`)
      const alreadyReturned = returnedQtyMap.get(item.productId) || 0
      const remaining = saleItem.quantity - alreadyReturned
      if (item.quantity > remaining) {
        if (remaining <= 0) throw new Error(`ØªÙ… Ø¥Ø±Ø¬Ø§Ø¹ Ø§Ù„Ù…Ù†ØªØ¬ "${item.name}" Ø¨Ø§Ù„ÙØ¹Ù„`)
        throw new Error(`Ø§Ù„ÙƒÙ…ÙŠØ© Ø§Ù„Ù…Ø·Ù„ÙˆØ¨ Ø¥Ø±Ø¬Ø§Ø¹Ù‡Ø§ Ù…Ù† "${item.name}" (${item.quantity}) ØªØªØ¬Ø§ÙˆØ² Ø§Ù„Ù…ØªØ¨Ù‚ÙŠ (${remaining})`)
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

    let refundAmount = Number(data.subtotal) || 0
    let totalPaidForSale = Number(sale.paid || 0)
    if (sale.paymentMethod === 'credit') {
      refundAmount = data.cashRefund ? Math.min(Number(data.subtotal) || 0, totalPaidForSale) : 0
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
        updateTreasury(realm, -fullAmount, 'Ù…Ø±ØªØ¬Ø¹ ÙØ§ØªÙˆØ±Ø© #' + data.invoiceNo, session, data.paymentMethod || sale.paymentMethod || 'cash')
        activeShift.totalSales -= fullAmount
        if (data.paymentMethod === 'card') activeShift.cardTotal -= refundAmount
        else activeShift.cashTotal -= refundAmount
        if (sale.tax > 0) {
          if (data.paymentMethod === 'card') activeShift.cardTotal -= returnTaxAmount
          else activeShift.cashTotal -= returnTaxAmount
        }
      } else if (data.paymentMethod !== 'credit') {
        updateTreasury(realm, -refundAmount, 'Ù…Ø±ØªØ¬Ø¹ ÙØ§ØªÙˆØ±Ø© #' + data.invoiceNo, session, data.paymentMethod || sale.paymentMethod || 'cash')
      }
      if (activeShift && sale.paymentMethod === 'credit') {
        activeShift.totalSales -= refundAmount
        activeShift.creditPaidTotal -= refundAmount
      }
    } else if (sale.tax > 0 && saleTaxRate > 0 && activeShift && !isCreditReturn) {
      const taxReturn = returnTaxAmount
      updateTreasury(realm, -taxReturn, 'Ø¶Ø±ÙŠØ¨Ø© Ù…Ø±ØªØ¬Ø¹ ÙØ§ØªÙˆØ±Ø© #' + data.invoiceNo, session, 'cash')
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
      title: 'Ù…Ø±ØªØ¬Ø¹ Ù…Ù†ØªØ¬Ø§Øª',
      message: `Ù…Ø±ØªØ¬Ø¹ ÙØ§ØªÙˆØ±Ø© #${ret.invoiceNo} - ${ret.subtotal + ret.tax} Ø¬.Ù…`,
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
      const retRefundAmount = ret.refundAmount != null ? Number(ret.refundAmount) || 0 : Number(ret.subtotal) || 0
      const retTax = Number(ret.tax || 0)
      const activeShift = realm.objects('Shift').filtered('cashierId == $0 AND isActive == true', session.userId)[0]
      const isCreditReturn = ret.paymentMethod === 'credit' || (sale && sale.paymentMethod === 'credit')

      if (activeShift && !isCreditReturn) {
        const pm = ret.paymentMethod || sale?.paymentMethod || 'cash'
        const fullAmount = retRefundAmount + retTax
        updateTreasury(realm, fullAmount, 'Ø¥Ù„ØºØ§Ø¡ Ù…Ø±ØªØ¬Ø¹ #' + ret.invoiceNo, session, pm)
        activeShift.totalSales += fullAmount
        if (ret.paymentMethod === 'card') activeShift.cardTotal += fullAmount
        else activeShift.cashTotal += fullAmount
      } else if (ret.paymentMethod !== 'credit' && retRefundAmount > 0) {
        const pm = ret.paymentMethod || sale?.paymentMethod || 'cash'
        updateTreasury(realm, retRefundAmount, 'Ø¥Ù„ØºØ§Ø¡ Ù…Ø±ØªØ¬Ø¹ #' + ret.invoiceNo, session, pm)
      }
      if (activeShift && sale && sale.paymentMethod === 'credit' && retRefundAmount > 0) {
        activeShift.totalSales += retRefundAmount
        activeShift.creditPaidTotal += retRefundAmount
      }

      if (sale && sale.paymentMethod === 'credit' && sale.customerName) {
        const customer = realm.objects('CreditCustomer').filtered('name == $0', sale.customerName)[0]
        if (customer) {
          customer.totalDebt = (customer.totalDebt || 0) + (Number(ret.subtotal) || 0) + Number(ret.tax || 0)
          customer.totalPaid = Math.max(0, (customer.totalPaid || 0) + retRefundAmount)
          customer.updatedAt = new Date()
        }
      }
      if (ret.customerName && ret.paymentMethod === 'credit' && sale && sale.paymentMethod !== 'credit') {
        const customer = realm.objects('CreditCustomer').filtered('name == $0', ret.customerName)[0]
        const creditAmount = (Number(ret.subtotal) || 0) + Number(ret.tax || 0)
        if (customer) {
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
