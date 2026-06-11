const Realm = require('realm')
const crypto = require('node:crypto')
const { updateWeightedAverage, removeFromWeightedAverage } = require('./inventoryHelpers')

function updateTreasury(realm, amount, note, session) {
  if (amount === 0) return
  const mainTreasury = realm.objects('Treasury').filtered('type == "main"')[0]
  if (!mainTreasury) return
  mainTreasury.balance += amount
  mainTreasury.updatedAt = new Date()
  realm.create('TreasuryTransaction', {
    _id: crypto.randomUUID(),
    treasuryId: mainTreasury._id, treasuryName: mainTreasury.name,
    type: amount > 0 ? 'deposit' : 'withdraw',
    amount, note: note || '', refType: 'return',
    createdBy: session.userId, createdAt: new Date()
  })
}

function listReturns(realm) {
  const returns = realm.objects('Return').sorted('createdAt', true)
  return Array.from(returns).map(r => ({
    _id: r._id, saleId: r.saleId, invoiceNo: r.invoiceNo,
    items: Array.from(r.items).map(item => ({
      productId: item.productId, name: item.name,
      quantity: item.quantity, unitPrice: item.unitPrice, cost: item.cost
    })),
    subtotal: r.subtotal, reason: r.reason,
    cashierId: r.cashierId, cashierName: r.cashierName,
    customerName: r.customerName, isFullReturn: r.isFullReturn,
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
        const oldStock = product.stock || 0
        product.stock = oldStock + qty
        updateWeightedAverage(product, qty, cost, oldStock)
      }
    })

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
      reason: data.reason || '',
      cashierId: session.userId,
      cashierName: session.name,
      customerName: data.customerName || '',
      isFullReturn: data.isFullReturn || false,
      createdAt: new Date()
    })
    updateTreasury(realm, -Number(data.subtotal), 'مرتجع فاتورة #' + data.invoiceNo, session)
  })
  return { _id: ret._id, invoiceNo: ret.invoiceNo, saleId: ret.saleId, subtotal: ret.subtotal, reason: ret.reason, cashierId: ret.cashierId, cashierName: ret.cashierName, customerName: ret.customerName, isFullReturn: ret.isFullReturn, createdAt: ret.createdAt?.toISOString() }
}

function removeReturn(realm, id) {
  realm.write(() => {
    const ret = realm.objectForPrimaryKey('Return', id)
    if (ret) {
      ret.items.forEach(item => {
        const product = realm.objectForPrimaryKey('Product', item.productId)
        if (product) {
          const qty = Number(item.quantity) || 0
          const cost = Number(item.cost) || 0
          const oldStock = product.stock || 0
          product.stock = Math.max(0, oldStock - qty)
          removeFromWeightedAverage(product, qty, cost, oldStock)
        }
      })
      const mainTreasury = realm.objects('Treasury').filtered('type == "main"')[0]
      if (mainTreasury) {
        mainTreasury.balance += Number(ret.subtotal)
        mainTreasury.updatedAt = new Date()
        realm.create('TreasuryTransaction', {
          _id: crypto.randomUUID(),
          treasuryId: mainTreasury._id, treasuryName: mainTreasury.name,
          type: 'deposit', amount: Number(ret.subtotal),
          note: 'إلغاء مرتجع #' + ret.invoiceNo, refType: 'return', refId: ret._id,
          createdBy: 'system', createdAt: new Date()
        })
      }
      realm.delete(ret)
    }
  })
  return true
}

module.exports = { listReturns, createReturn, removeReturn }
