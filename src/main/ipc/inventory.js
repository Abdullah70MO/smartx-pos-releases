const crypto = require('node:crypto')
const { addBatch, deductFromFifo, deductFromBatch, syncProductStock } = require('./inventoryHelpers')

function listAdjustments(realm) {
  return Array.from(realm.objects('InventoryAdjustment').sorted('createdAt', true)).map(a => ({
    _id: a._id, productId: a.productId, productName: a.productName,
    type: a.type, quantity: a.quantity, oldStock: a.oldStock,
    newStock: a.newStock, reason: a.reason, createdBy: a.createdBy,
    createdAt: a.createdAt?.toISOString()
  }))
}

function createAdjustment(realm, user, { productId, productName, type, quantity, reason, date, batchId }) {
  let adjustment
  realm.write(() => {
    const product = realm.objectForPrimaryKey('Product', productId)
    if (!product) throw new Error('المنتج غير موجود')
    const oldStock = product.stock || 0
    const qty = Number(quantity)
    let newStock
    if (type === 'add') {
      const avgCost = product.cost || 0
      addBatch(realm, productId, qty, avgCost)
      newStock = oldStock + qty
    } else if (type === 'remove') {
      if (batchId) {
        deductFromBatch(realm, batchId, qty)
      } else {
        deductFromFifo(realm, productId, qty)
      }
      newStock = Math.max(0, oldStock - qty)
    } else {
      const diff = qty - oldStock
      if (diff > 0) {
        addBatch(realm, productId, diff, product.cost || 0)
      } else if (diff < 0) {
        deductFromFifo(realm, productId, -diff)
      }
      newStock = qty
    }
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

function revertAdjustment(realm, adj) {
  if (adj.type === 'add') {
    deductFromFifo(realm, adj.productId, adj.quantity)
  } else if (adj.type === 'remove') {
    const product = realm.objectForPrimaryKey('Product', adj.productId)
    addBatch(realm, adj.productId, adj.quantity, product ? product.cost || 0 : 0)
  } else {
    const product = realm.objectForPrimaryKey('Product', adj.productId)
    if (product) {
      const diff = adj.oldStock - (product.stock || 0)
      if (diff > 0) {
        addBatch(realm, adj.productId, diff, product.cost || 0)
      } else if (diff < 0) {
        deductFromFifo(realm, adj.productId, -diff)
      }
    }
  }
}

function saveAdjustment(realm, user, data) {
  let adjustment
  realm.write(() => {
    adjustment = realm.objectForPrimaryKey('InventoryAdjustment', data._id)
    if (!adjustment) throw new Error('التسوية غير موجودة')

    const product = realm.objectForPrimaryKey('Product', data.productId)
    if (product) {
      const oldStock = product.stock || 0
      revertAdjustment(realm, adjustment)
      const qty = Number(data.quantity)
      let newStock
      if (data.type === 'add') {
        addBatch(realm, data.productId, qty, product.cost || 0)
        newStock = oldStock + qty
      } else if (data.type === 'remove') {
        const removeBatchId = data.batchId
        if (removeBatchId) {
          deductFromBatch(realm, removeBatchId, qty)
        } else {
          deductFromFifo(realm, data.productId, qty)
        }
        newStock = Math.max(0, oldStock - qty)
      } else {
        const diff = qty - oldStock
        if (diff > 0) {
          addBatch(realm, data.productId, diff, product.cost || 0)
        } else if (diff < 0) {
          const removeBatchId = data.batchId
          if (removeBatchId) {
            deductFromBatch(realm, removeBatchId, -diff)
          } else {
            deductFromFifo(realm, data.productId, -diff)
          }
        }
        newStock = qty
      }
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
        revertAdjustment(realm, adjustment)
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

function getInventoryBatchReport(realm, query) {
  let products
  if (query) {
    products = realm.objects('Product')
      .filtered('name CONTAINS[c] $0 OR sku CONTAINS[c] $0 OR barcode CONTAINS[c] $0', query)
  } else {
    products = realm.objects('Product').filtered('active == true')
  }
  return Array.from(products).map(p => {
    const batches = realm.objects('StockBatch').filtered('productId == $0 AND quantity > 0', p._id).sorted('createdAt')
    return {
      _id: p._id, name: p.name, sku: p.sku, unit: p.unit,
      stock: p.stock, cost: p.cost,
      batches: Array.from(batches).map(b => ({
        quantity: b.quantity, cost: b.cost, total: b.quantity * b.cost,
        createdAt: b.createdAt?.toISOString()
      }))
    }
  })
}

function getProductBatches(realm, productId) {
  const batches = realm.objects('StockBatch').filtered('productId == $0 AND quantity > 0', productId).sorted('createdAt')
  return Array.from(batches).map(b => ({
    _id: b._id, quantity: b.quantity, cost: b.cost, createdAt: b.createdAt?.toISOString()
  }))
}

module.exports = { listAdjustments, createAdjustment, saveAdjustment, removeAdjustment, getLowStockProducts, getInventoryBatchReport, getProductBatches }
