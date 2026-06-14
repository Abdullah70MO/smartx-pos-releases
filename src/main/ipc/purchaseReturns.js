const Realm = require('realm')
const crypto = require('node:crypto')
const { returnToFifo } = require('./inventoryHelpers')

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
  if (remaining > 0) throw new Error('الرصيد المتاح في المخزون أقل من الكمية المطلوب إرجاعها')
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
  treasury.balance += amount
  treasury.updatedAt = new Date()
  realm.create('TreasuryTransaction', {
    _id: crypto.randomUUID(),
    treasuryId: treasury._id, treasuryName: treasury.name,
    type: amount > 0 ? 'deposit' : 'withdraw',
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

function syncProduct(realm, productId) {
  const product = realm.objectForPrimaryKey('Product', productId)
  if (!product) return
  const batches = realm.objects('StockBatch').filtered('productId == $0 AND quantity > 0', productId).sorted('createdAt')
  const totalQty = Array.from(batches).reduce((s, b) => s + b.quantity, 0)
  const oldest = Array.from(batches)[0]
  product.stock = totalQty
  product.cost = oldest ? oldest.cost : 0
}

function listPurchaseReturns(realm) {
  const returns = realm.objects('PurchaseReturn').sorted('createdAt', true)
  return Array.from(returns).map(r => {
    const purchase = realm.objectForPrimaryKey('Purchase', r.purchaseId)
    return {
      _id: r._id, purchaseId: r.purchaseId, purchaseInvoiceNo: purchase?.invoiceNo || 0,
      invoiceNo: r.invoiceNo, supplierId: r.supplierId, supplierName: r.supplierName,
      items: Array.from(r.items).map(item => ({
        productId: item.productId, name: item.name,
        quantity: item.quantity, unitPrice: item.unitPrice, cost: item.cost
      })),
      subtotal: r.subtotal, reason: r.reason,
      createdBy: r.createdBy, createdAt: r.createdAt?.toISOString()
    }
  })
}

function createPurchaseReturn(realm, session, data) {
  let ret
  realm.write(() => {
    const purchase = realm.objectForPrimaryKey('Purchase', data.purchaseId)
    if (!purchase) throw new Error('فاتورة الشراء غير موجودة')

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
      if (!purchaseItem) throw new Error(`المنتج "${item.name}" غير موجود في فاتورة الشراء`)
      const alreadyReturned = returnedQtyMap.get(item.productId) || 0
      const remaining = purchaseItem.quantity - alreadyReturned
      if (item.quantity > remaining) {
        if (remaining <= 0) throw new Error(`تم إرجاع "${item.name}" بالكامل مسبقاً`)
        throw new Error(`الكمية المطلوب إرجاعها من "${item.name}" (${item.quantity}) تتجاوز المتبقي (${remaining})`)
      }

      const qty = Number(item.quantity) || 0
      if (qty > 0) {
        const totalCost = deductBatches(realm, data.purchaseId, purchaseItem.productId, qty)
        const avgCost = totalCost / qty
        itemCosts.push({ productId: purchaseItem.productId, cost: avgCost })
        syncProduct(realm, purchaseItem.productId)
      } else {
        itemCosts.push({ productId: purchaseItem.productId, cost: 0 })
      }
    })

    const invoiceNo = getNextInvoiceNo(realm)
    ret = realm.create('PurchaseReturn', {
      _id: crypto.randomUUID(),
      purchaseId: data.purchaseId,
      invoiceNo,
      supplierId: purchase.supplierId,
      supplierName: purchase.supplierName,
      items: data.items.map((item, idx) => ({
        productId: item.productId, name: item.name,
        quantity: Number(item.quantity) || 0,
        unitPrice: Number(item.unitPrice) || 0,
        cost: itemCosts.find(c => c.productId === item.productId)?.cost || 0
      })),
      subtotal: Number(data.subtotal) || 0,
      reason: data.reason || '',
      createdBy: session.name || session.userId || 'system',
      createdAt: new Date()
    })

    updateSupplierBalance(realm, purchase.supplierId, -Number(data.subtotal))

    if (purchase.paymentMethod !== 'credit' && Number(data.subtotal) > 0) {
      updateTreasury(realm, -Number(data.subtotal), 'مرتجع مشتريات فاتورة #' + purchase.invoiceNo, session, purchase.paymentMethod)
    }
  })
  return { _id: ret._id, invoiceNo: ret.invoiceNo, purchaseId: ret.purchaseId, supplierName: ret.supplierName, subtotal: ret.subtotal, reason: ret.reason, createdAt: ret.createdAt?.toISOString() }
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
        syncProduct(realm, item.productId)
      }
    })

    updateSupplierBalance(realm, ret.supplierId, Number(ret.subtotal))

    if (purchase && purchase.paymentMethod !== 'credit' && Number(ret.subtotal) > 0) {
      const treasuryType = purchase.paymentMethod === 'card' ? 'bank' : 'main'
      const treasury = realm.objects('Treasury').filtered('type == $0', treasuryType)[0] || realm.objects('Treasury').filtered('type == "main"')[0]
      if (treasury) {
        treasury.balance += Number(ret.subtotal)
        treasury.updatedAt = new Date()
        realm.create('TreasuryTransaction', {
          _id: crypto.randomUUID(),
          treasuryId: treasury._id, treasuryName: treasury.name,
          type: 'deposit', amount: Number(ret.subtotal),
          note: 'إلغاء مرتجع مشتريات #' + ret.invoiceNo, refType: 'purchaseReturn', refId: ret._id,
          paymentMethod: purchase.paymentMethod,
          createdBy: 'system', createdAt: new Date()
        })
      }
    }

    realm.delete(ret)
  })
  return true
}

module.exports = { listPurchaseReturns, createPurchaseReturn, removePurchaseReturn }
