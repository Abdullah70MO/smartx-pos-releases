const crypto = require('node:crypto')

function addBatch(realm, productId, quantity, cost, refId) {
  realm.create('StockBatch', {
    _id: crypto.randomUUID(),
    productId,
    quantity: Number(quantity),
    cost: Number(cost),
    refId: refId || '',
    createdAt: new Date()
  })
  syncProductStock(realm, productId)
}

function deductFromBatch(realm, batchId, quantity) {
  const batch = realm.objectForPrimaryKey('StockBatch', batchId)
  if (!batch) throw new Error('الدفعة غير موجودة')
  const qty = Number(quantity)
  const take = Math.min(batch.quantity, qty)
  const cost = take * batch.cost
  batch.quantity -= take
  if (batch.quantity <= 0) {
    realm.delete(batch)
  }
  syncProductStock(realm, batch.productId)
  return cost
}

function removeBatchesByRef(realm, refId) {
  const batches = realm.objects('StockBatch').filtered('refId == $0', refId)
  realm.delete(batches)
}

function deductFromFifo(realm, productId, quantity) {
  const qty = Number(quantity)
  if (qty <= 0) return 0
  let remaining = qty
  let totalCost = 0
  const batches = realm.objects('StockBatch').filtered('productId == $0 AND quantity > 0', productId).sorted('createdAt')
  for (const batch of batches) {
    if (remaining <= 0) break
    const take = Math.min(batch.quantity, remaining)
    totalCost += take * batch.cost
    batch.quantity -= take
    remaining -= take
    if (batch.quantity <= 0) {
      realm.delete(batch)
    }
  }
  if (remaining > 0) throw new Error('المخزون غير كافٍ')
  syncProductStock(realm, productId)
  return totalCost
}

function returnToFifo(realm, productId, quantity, cost) {
  addBatch(realm, productId, quantity, cost, 'return')
}

function syncProductStock(realm, productId) {
  const product = realm.objectForPrimaryKey('Product', productId)
  if (!product) return
  const batches = realm.objects('StockBatch').filtered('productId == $0 AND quantity > 0', productId).sorted('createdAt')
  const totalQty = Array.from(batches).reduce((s, b) => s + b.quantity, 0)
  const oldest = Array.from(batches)[0]
  product.stock = totalQty
  product.cost = oldest ? oldest.cost : 0
}

function getAvgCost(realm, productId) {
  const product = realm.objectForPrimaryKey('Product', productId)
  return product ? (product.cost || 0) : 0
}

module.exports = { addBatch, deductFromFifo, deductFromBatch, returnToFifo, syncProductStock, getAvgCost, removeBatchesByRef }