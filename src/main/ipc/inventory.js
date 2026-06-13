const crypto = require('node:crypto')

function listAdjustments(realm) {
  return Array.from(realm.objects('InventoryAdjustment').sorted('createdAt', true)).map(a => ({
    _id: a._id, productId: a.productId, productName: a.productName,
    type: a.type, quantity: a.quantity, oldStock: a.oldStock,
    newStock: a.newStock, reason: a.reason, createdBy: a.createdBy,
    createdAt: a.createdAt?.toISOString()
  }))
}

function createAdjustment(realm, user, { productId, productName, type, quantity, reason, date }) {
  let adjustment
  realm.write(() => {
    const product = realm.objectForPrimaryKey('Product', productId)
    if (!product) throw new Error('المنتج غير موجود')
    const oldStock = product.stock || 0
    const qty = Number(quantity)
    let newStock
    if (type === 'add') newStock = oldStock + qty
    else if (type === 'remove') newStock = Math.max(0, oldStock - qty)
    else newStock = qty
    product.stock = newStock
    product.updatedAt = new Date()
    adjustment = realm.create('InventoryAdjustment', {
      _id: crypto.randomUUID(), productId, productName,
      type, quantity: qty, oldStock, newStock,
      reason: reason || '', createdBy: user.name,
      createdAt: date ? new Date(date) : new Date()
    })
  })
  return { _id: adjustment._id, productId: adjustment.productId, productName: adjustment.productName, type: adjustment.type, quantity: adjustment.quantity, oldStock: adjustment.oldStock, newStock: adjustment.newStock, reason: adjustment.reason, createdBy: adjustment.createdBy, createdAt: adjustment.createdAt?.toISOString() }
}

function saveAdjustment(realm, user, data) {
  let adjustment
  realm.write(() => {
    adjustment = realm.objectForPrimaryKey('InventoryAdjustment', data._id)
    if (!adjustment) throw new Error('التسوية غير موجودة')

    // Revert old adjustment on product stock
    const product = realm.objectForPrimaryKey('Product', data.productId)
    if (product) {
      if (adjustment.type === 'add') product.stock -= adjustment.quantity
      else if (adjustment.type === 'remove') product.stock += adjustment.quantity
      else product.stock = adjustment.oldStock

      const oldStock = product.stock || 0
      const qty = Number(data.quantity)
      let newStock
      if (data.type === 'add') newStock = oldStock + qty
      else if (data.type === 'remove') newStock = Math.max(0, oldStock - qty)
      else newStock = qty
      product.stock = newStock
      product.updatedAt = new Date()

      adjustment.productId = data.productId
      adjustment.productName = data.productName || adjustment.productName
      adjustment.type = data.type
      adjustment.quantity = qty
      adjustment.oldStock = oldStock
      adjustment.newStock = newStock
      adjustment.reason = data.reason || ''
      if (data.date) adjustment.createdAt = new Date(data.date)
    }
  })
  return {
    _id: adjustment._id, productId: adjustment.productId,
    productName: adjustment.productName, type: adjustment.type,
    quantity: adjustment.quantity, oldStock: adjustment.oldStock,
    newStock: adjustment.newStock, reason: adjustment.reason,
    createdBy: adjustment.createdBy,
    createdAt: adjustment.createdAt?.toISOString()
  }
}

function removeAdjustment(realm, id) {
  realm.write(() => {
    const adjustment = realm.objectForPrimaryKey('InventoryAdjustment', id)
    if (adjustment) {
      const product = realm.objectForPrimaryKey('Product', adjustment.productId)
      if (product) {
        // Revert the adjustment on the product stock
        if (adjustment.type === 'add') product.stock -= adjustment.quantity
        else if (adjustment.type === 'remove') product.stock += adjustment.quantity
        else product.stock = adjustment.oldStock
        product.stock = Math.max(0, product.stock || 0)
        product.updatedAt = new Date()
      }
      realm.delete(adjustment)
    }
  })
  return true
}

function getLowStockProducts(realm, threshold) {
  const products = realm.objects('Product').filtered('active == true AND stock <= reorderPoint AND reorderPoint > 0')
  return Array.from(products).map(p => ({
    _id: p._id, sku: p.sku, name: p.name, stock: p.stock,
    reorderPoint: p.reorderPoint, unit: p.unit
  }))
}

module.exports = { listAdjustments, createAdjustment, saveAdjustment, removeAdjustment, getLowStockProducts }
