const Realm = require('realm')
const crypto = require('node:crypto')
const { returnToFifo, syncProductStock } = require('./inventoryHelpers')
const { paginate } = require('../database')

function deductBatches(realm, purchaseId, productId, quantity) {
  let remaining = Number(quantity)
  let totalCost = 0
  const batches = realm.objects('StockBatch').filtered('productId == $0 AND refId == $1 AND quantity > 0', productId, purchaseId).sorted('createdAt')
  for (const batch of batches) {
    if (remaining <= 0) break
    const take = Math.min(batch.quantity, remaining)
    totalCost += take * batch.cost
    batch.quantity -= take
    remaining -= take
    if (batch.quantity <= 0) realm.delete(batch)
  }
  if (remaining > 0) throw new Error('Ø§Ù„Ø±ØµÙŠØ¯ Ø§Ù„Ù…ØªØ§Ø­ ÙÙŠ Ø§Ù„Ù…Ø®Ø²ÙˆÙ† Ø£Ù‚Ù„ Ù…Ù† Ø§Ù„ÙƒÙ…ÙŠØ© Ø§Ù„Ù…Ø·Ù„ÙˆØ¨ Ø¥Ø±Ø¬Ø§Ø¹Ù‡Ø§')
  return totalCost
}

function restoreReturnBatches(realm, productId, quantity, cost) {
  returnToFifo(realm, productId, quantity, cost)
}

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
    type: 'purchaseReturn',
    amount, note: note || '', refType: 'purchaseReturn',
    paymentMethod: paymentMethod || 'cash',
    createdBy: session.name || session.userId || 'system', createdAt: new Date()
  })
}

function getNextInvoiceNo(realm) {
  const existing = realm.objects('PurchaseReturn').sorted('invoiceNo', true)
  return existing.length > 0 ? existing[0].invoiceNo + 1 : 1
}

function updateSupplierBalance(realm, supplierId, delta) {
  const supplier = realm.objectForPrimaryKey('Supplier', supplierId)
  if (supplier) {
    supplier.totalPurchases = Math.max(0, (supplier.totalPurchases || 0) + delta)
    supplier.updatedAt = new Date()
  }
}

function listPurchaseReturns(realm, filter, page, pageSize) {
  let results = realm.objects('PurchaseReturn').sorted('createdAt', true)
  if (filter?.from) {
    const from = new Date(filter.from + 'T00:00:00')
    if (!isNaN(from)) results = results.filtered('createdAt >= $0', from)
  }
  if (filter?.to) {
    const to = new Date(filter.to + 'T23:59:59')
    if (!isNaN(to)) results = results.filtered('createdAt <= $0', to)
  }
  const mapReturn = r => {
    const purchase = realm.objectForPrimaryKey('Purchase', r.purchaseId)
    return {
      _id: r._id, purchaseId: r.purchaseId, purchaseInvoiceNo: purchase?.invoiceNo || 0,
      invoiceNo: r.invoiceNo, supplierId: r.supplierId, supplierName: r.supplierName,
      items: Array.from(r.items).map(item => ({
        productId: item.productId, name: item.name,
        quantity: item.quantity, unitPrice: item.unitPrice, cost: item.cost
      })),
      subtotal: r.subtotal, reason: r.reason,
      refundAmount: r.refundAmount, paymentMethod: r.paymentMethod,
      createdBy: r.createdBy, createdAt: r.createdAt?.toISOString()
    }
  }
  if (page != null) {
    const result = paginate(results, page, pageSize || 20)
    return { ...result, data: result.data.map(mapReturn) }
  }
  return Array.from(results).map(mapReturn)
}

function listPurchaseReturnsBySupplier(realm, supplierName, page, pageSize) {
  let results = realm.objects('PurchaseReturn').filtered('supplierName == $0', supplierName).sorted('createdAt', true)
  const mapReturn = r => {
    const purchase = realm.objectForPrimaryKey('Purchase', r.purchaseId)
    return {
      _id: r._id, purchaseId: r.purchaseId, purchaseInvoiceNo: purchase?.invoiceNo || 0,
      invoiceNo: r.invoiceNo, supplierId: r.supplierId, supplierName: r.supplierName,
      items: Array.from(r.items).map(item => ({
        productId: item.productId, name: item.name,
        quantity: item.quantity, unitPrice: item.unitPrice, cost: item.cost
      })),
      subtotal: r.subtotal, reason: r.reason,
      refundAmount: r.refundAmount, paymentMethod: r.paymentMethod,
      createdBy: r.createdBy, createdAt: r.createdAt?.toISOString()
    }
  }
  if (page != null) {
    const result = paginate(results, page, pageSize || 20)
    return { ...result, data: result.data.map(mapReturn) }
  }
  return Array.from(results).map(mapReturn)
}

function createPurchaseReturn(realm, session, data) {
  let ret
  realm.write(() => {
    const purchase = realm.objectForPrimaryKey('Purchase', data.purchaseId)
    if (!purchase) throw new Error('ÙØ§ØªÙˆØ±Ø© Ø§Ù„Ø´Ø±Ø§Ø¡ ØºÙŠØ± Ù…ÙˆØ¬ÙˆØ¯Ø©')

    const previousReturns = realm.objects('PurchaseReturn').filtered('purchaseId == $0', data.purchaseId)
    const returnedQtyMap = new Map()
    previousReturns.forEach(r => {
      r.items.forEach(item => {
        const key = item.productId
        returnedQtyMap.set(key, (returnedQtyMap.get(key) || 0) + item.quantity)
      })
    })

    const itemCosts = []
    data.items.forEach(item => {
      const purchaseItem = purchase.items.find(i => i.productId === item.productId || i.name === item.name)
      if (!purchaseItem) throw new Error(`Ø§Ù„Ù…Ù†ØªØ¬ "${item.name}" ØºÙŠØ± Ù…ÙˆØ¬ÙˆØ¯ ÙÙŠ ÙØ§ØªÙˆØ±Ø© Ø§Ù„Ø´Ø±Ø§Ø¡`)
      const alreadyReturned = returnedQtyMap.get(item.productId) || 0
      const remaining = purchaseItem.quantity - alreadyReturned
      if (item.quantity > remaining) {
        if (remaining <= 0) throw new Error(`ØªÙ… Ø¥Ø±Ø¬Ø§Ø¹ "${item.name}" Ø¨Ø§Ù„ÙƒØ§Ù…Ù„ Ù…Ø³Ø¨Ù‚Ø§Ù‹`)
        throw new Error(`Ø§Ù„ÙƒÙ…ÙŠØ© Ø§Ù„Ù…Ø·Ù„ÙˆØ¨ Ø¥Ø±Ø¬Ø§Ø¹Ù‡Ø§ Ù…Ù† "${item.name}" (${item.quantity}) ØªØªØ¬Ø§ÙˆØ² Ø§Ù„Ù…ØªØ¨Ù‚ÙŠ (${remaining})`)
      }

      const qty = Number(item.quantity) || 0
      if (qty > 0) {
        const totalCost = deductBatches(realm, data.purchaseId, purchaseItem.productId, qty)
        const avgCost = totalCost / qty
        itemCosts.push({ productId: purchaseItem.productId, cost: avgCost })
        syncProductStock(realm, purchaseItem.productId)
      } else {
        itemCosts.push({ productId: purchaseItem.productId, cost: 0 })
      }
    })

    const invoiceNo = getNextInvoiceNo(realm)
    const purchaseTaxRate = purchase.tax > 0 && purchase.totalCost > 0 ? (purchase.tax / purchase.totalCost * 100) : 0
    const returnTaxAmount = purchaseTaxRate > 0 ? (data.subtotal * purchaseTaxRate / 100) : 0

    const isCreditReturn = data.paymentMethod === 'credit'
    const refundAmount = isCreditReturn ? 0 : Math.min(Number(data.subtotal), Number(purchase.paid || 0))

    const itemsWithCost = data.items.map((item, idx) => ({
      productId: item.productId, name: item.name,
      quantity: Number(item.quantity) || 0,
      unitPrice: Number(item.unitPrice) || 0,
      cost: itemCosts[idx]?.cost || 0
    }))

    ret = realm.create('PurchaseReturn', {
      _id: crypto.randomUUID(),
      purchaseId: data.purchaseId,
      invoiceNo,
      supplierId: purchase.supplierId,
      supplierName: purchase.supplierName,
      items: itemsWithCost,
      subtotal: Number(data.subtotal) || 0,
      reason: data.reason || '',
      refundAmount,
      paymentMethod: data.paymentMethod || 'cash',
      createdBy: session.name || session.userId || 'system',
      createdAt: new Date()
    })

    if (refundAmount > 0) {
      const pm = data.paymentMethod === 'card' ? 'card' : 'cash'
      updateTreasury(realm, refundAmount, 'Ù…Ø±ØªØ¬Ø¹ Ù…Ø´ØªØ±ÙŠØ§Øª ÙØ§ØªÙˆØ±Ø© #' + purchase.invoiceNo, session, pm)
    }
    if (purchase.tax > 0 && purchaseTaxRate > 0) {
      const pm = data.paymentMethod === 'card' ? 'card' : 'cash'
      updateTreasury(realm, returnTaxAmount, 'Ø¶Ø±ÙŠØ¨Ø© Ù…Ø±ØªØ¬Ø¹ Ù…Ø´ØªØ±ÙŠØ§Øª #' + purchase.invoiceNo, session, pm)
    }

    updateSupplierBalance(realm, purchase.supplierId, -Number(data.subtotal))
    if (refundAmount > 0 && purchase.supplierId) {
      const supplier = realm.objectForPrimaryKey('Supplier', purchase.supplierId)
      if (supplier) {
        supplier.totalPaid = Math.max(0, (supplier.totalPaid || 0) - refundAmount)
        supplier.updatedAt = new Date()
      }
    }
  })
  return { _id: ret._id, invoiceNo: ret.invoiceNo, purchaseId: ret.purchaseId, supplierName: ret.supplierName, subtotal: ret.subtotal, reason: ret.reason, refundAmount: ret.refundAmount, paymentMethod: ret.paymentMethod, createdAt: ret.createdAt?.toISOString() }
}

function removePurchaseReturn(realm, id) {
  realm.write(() => {
    const ret = realm.objectForPrimaryKey('PurchaseReturn', id)
    if (!ret) return false

    const purchase = realm.objectForPrimaryKey('Purchase', ret.purchaseId)

    ret.items.forEach(item => {
      const qty = Number(item.quantity) || 0
      const cost = Number(item.cost) || 0
      if (qty > 0) {
        restoreReturnBatches(realm, item.productId, qty, cost)
        syncProductStock(realm, item.productId)
      }
    })

    updateSupplierBalance(realm, ret.supplierId, Number(ret.subtotal))

    const retRefund = ret.refundAmount != null ? Number(ret.refundAmount) : Number(ret.subtotal)
    if (retRefund > 0) {
      const pm = ret.paymentMethod === 'card' ? 'card' : 'cash'
      const treasuryType = pm === 'card' ? 'bank' : 'main'
      const treasury = realm.objects('Treasury').filtered('type == $0', treasuryType)[0] || realm.objects('Treasury').filtered('type == "main"')[0]
      if (treasury) {
        if (treasury.balance < retRefund) throw new Error('Ø±ØµÙŠØ¯ Ø§Ù„Ø®Ø²ÙŠÙ†Ø© ØºÙŠØ± ÙƒØ§ÙÙ')
        treasury.balance += -retRefund
        treasury.updatedAt = new Date()
        realm.create('TreasuryTransaction', {
          _id: crypto.randomUUID(),
          treasuryId: treasury._id, treasuryName: treasury.name,
          type: 'purchaseReturn', amount: -retRefund,
          note: 'Ø¥Ù„ØºØ§Ø¡ Ù…Ø±ØªØ¬Ø¹ Ù…Ø´ØªØ±ÙŠØ§Øª #' + ret.invoiceNo, refType: 'purchaseReturn', refId: ret._id,
          paymentMethod: pm,
          createdBy: 'system', createdAt: new Date()
        })
      }
    }
    if (ret.supplierId && retRefund > 0) {
      const supplier = realm.objectForPrimaryKey('Supplier', ret.supplierId)
      if (supplier) {
        supplier.totalPaid = Math.max(0, (supplier.totalPaid || 0) + retRefund)
        supplier.updatedAt = new Date()
      }
    }

    realm.delete(ret)
  })
  return true
}

module.exports = { listPurchaseReturns, listPurchaseReturnsBySupplier, createPurchaseReturn, removePurchaseReturn }
