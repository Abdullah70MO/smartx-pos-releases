const crypto = require('node:crypto')
const { addBatch, deductFromFifo, deductFromBatch, syncProductStock, getAvgCost } = require('./inventoryHelpers')
const { checkAndCreateLowStockNotifications } = require('./notifications')
const { paginate } = require('../database')

function listAdjustments(realm, filter, page, pageSize) {
  let results = realm.objects('InventoryAdjustment').sorted('createdAt', true)
  if (filter?.productName) {
    results = results.filtered('productName CONTAINS[c] $0', filter.productName)
  }
  if (filter?.type) {
    results = results.filtered('type == $0', filter.type)
  }
  if (filter?.from) {
    const from = new Date(filter.from)
    if (!isNaN(from)) results = results.filtered('createdAt >= $0', from)
  }
  if (filter?.to) {
    const to = new Date(filter.to + 'T23:59:59')
    if (!isNaN(to)) results = results.filtered('createdAt <= $0', to)
  }
  const mapAdjustment = a => ({
    _id: a._id, productId: a.productId, productName: a.productName,
    type: a.type, quantity: a.quantity, oldStock: a.oldStock,
    newStock: a.newStock, reason: a.reason, createdBy: a.createdBy,
    createdAt: a.createdAt?.toISOString()
  })
  if (page != null) {
    const result = paginate(results, page, pageSize || 20)
    return { ...result, data: result.data.map(mapAdjustment) }
  }
  return Array.from(results).map(mapAdjustment)
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
  checkAndCreateLowStockNotifications(realm)
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
  checkAndCreateLowStockNotifications(realm)
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

function createInventory(realm, session, data) {
  const rx = crypto.randomUUID()
  const now = new Date()
  let totalDiff = 0
  let totalLoss = 0
  const items = []

  realm.write(() => {
    for (const item of data.items || []) {
      if (item.productId && item.productId.startsWith('__cat__')) {
        items.push({
          productId: item.productId, productName: item.productName,
          unit: '', category: item.productName,
          systemQuantity: 0, actualQuantity: 0, difference: 0,
          cost: 0, lossAmount: 0, adjustmentId: '', expenseId: ''
        })
        continue
      }
      const product = realm.objectForPrimaryKey('Product', item.productId)
      if (!product) continue
      const sysQty = product.stock || 0
      const actQty = Number(item.actualQuantity) !== undefined && item.actualQuantity !== '' && item.actualQuantity !== null ? Number(item.actualQuantity) : sysQty
      const diff = actQty - sysQty
      totalDiff += diff

      const invItem = {
        productId: item.productId,
        productName: item.productName || product.name,
        unit: item.unit || product.unit || '',
        category: product.category || '',
        systemQuantity: sysQty,
        actualQuantity: actQty,
        difference: diff,
        cost: 0,
        lossAmount: 0,
        adjustmentId: '',
        expenseId: ''
      }

      if (diff !== 0) {
        if (diff > 0) {
          const adjId = crypto.randomUUID()
          addBatch(realm, item.productId, Math.abs(diff), getAvgCost(realm, item.productId), adjId)
          syncProductStock(realm, item.productId)
          realm.create('InventoryAdjustment', {
            _id: adjId, productId: item.productId, productName: item.productName || product.name,
            type: 'add', quantity: Math.abs(diff),
            oldStock: sysQty, newStock: actQty,
            reason: 'تسوية جرد', createdBy: session.name, createdAt: now
          })
          invItem.adjustmentId = adjId
          invItem.cost = 0
        } else {
          const qty = Math.abs(diff)
          const avgCost = getAvgCost(realm, item.productId)
          const adjId = crypto.randomUUID()
          const cost = deductFromFifo(realm, item.productId, qty)
          syncProductStock(realm, item.productId)
          realm.create('InventoryAdjustment', {
            _id: adjId, productId: item.productId, productName: item.productName || product.name,
            type: 'remove', quantity: qty,
            oldStock: sysQty, newStock: actQty,
            reason: 'تسوية جرد', createdBy: session.name, createdAt: now
          })
          invItem.adjustmentId = adjId
          invItem.cost = avgCost

          const lossAmount = qty * avgCost
          invItem.lossAmount = lossAmount
          if (lossAmount > 0) {
            const expId = crypto.randomUUID()
            realm.create('Expense', {
              _id: expId, amount: lossAmount, category: 'فروقات الجرد',
              note: `نقص جرد - ${item.productName || product.name} (${qty} وحدة)`,
              date: now, paymentMethod: 'cash', shiftId: '',
              createdAt: now
            })
            invItem.expenseId = expId
            totalLoss += lossAmount
          }
        }
      }
      items.push(invItem)
    }

    realm.create('Inventory', {
      _id: rx, type: data.type || 'partial', status: 'completed',
      notes: data.notes || '', filterCategory: data.filterCategory || '',
      items, totalQuantityDifference: totalDiff,
      totalFinancialLoss: totalLoss,
      createdBy: session.name, createdAt: now
    })
  })
  checkAndCreateLowStockNotifications(realm)
  return { _id: rx, type: data.type, notes: data.notes, totalQuantityDifference: totalDiff, totalFinancialLoss: totalLoss, createdAt: now.toISOString() }
}

function listInventories(realm, filter, page, pageSize) {
  let results = realm.objects('Inventory').sorted('createdAt', true)
  if (filter?.from) {
    const from = new Date(filter.from)
    if (!isNaN(from)) results = results.filtered('createdAt >= $0', from)
  }
  if (filter?.to) {
    const to = new Date(filter.to + 'T23:59:59')
    if (!isNaN(to)) results = results.filtered('createdAt <= $0', to)
  }
  const mapInv = i => ({
    _id: i._id, type: i.type, status: i.status, notes: i.notes,
    filterCategory: i.filterCategory,
    itemsCount: i.items.length || (i.type === 'full' ? realm.objects('Product').filtered('active == true').length : 0),
    itemsWithDiff: i.items.filter(x => x.difference !== 0).length,
    totalQuantityDifference: i.totalQuantityDifference,
    totalFinancialLoss: i.totalFinancialLoss,
    createdBy: i.createdBy, createdAt: i.createdAt?.toISOString()
  })
  if (page != null) {
    const result = paginate(results, page, pageSize || 20)
    return { ...result, data: result.data.map(mapInv) }
  }
  return Array.from(results).map(mapInv)
}

function getInventory(realm, id) {
  const inv = realm.objectForPrimaryKey('Inventory', id)
  if (!inv) return null

  let items
  if (inv.type === 'full' && inv.items.length === 0) {
    const all = realm.objects('Product').filtered('active == true').sorted('name')
    items = Array.from(all).map(p => ({
      productId: p._id, productName: p.name, unit: p.unit || '',
      category: p.category || '', systemQuantity: p.stock || 0,
      actualQuantity: p.stock || 0, difference: 0,
      cost: p.cost || 0, lossAmount: 0,
      adjustmentId: '', expenseId: ''
    }))
  } else {
    items = []
    for (const x of inv.items) {
      if (x.productId && x.productId.startsWith('__cat__')) {
        const catName = x.productName
        const catProducts = realm.objects('Product').filtered('active == true AND category == $0', catName).sorted('name')
        for (const p of catProducts) {
          items.push({
            productId: p._id, productName: p.name, unit: p.unit || '',
            category: catName, systemQuantity: p.stock || 0,
            actualQuantity: p.stock || 0, difference: 0,
            cost: p.cost || 0, lossAmount: 0,
            adjustmentId: '', expenseId: ''
          })
        }
      } else {
        items.push({
          productId: x.productId, productName: x.productName, unit: x.unit,
          category: x.category || '', systemQuantity: x.systemQuantity,
          actualQuantity: x.actualQuantity, difference: x.difference,
          cost: x.cost, lossAmount: x.lossAmount,
          adjustmentId: x.adjustmentId, expenseId: x.expenseId
        })
      }
    }
  }

  return {
    _id: inv._id, type: inv.type, status: inv.status, notes: inv.notes,
    filterCategory: inv.filterCategory,
    totalQuantityDifference: inv.totalQuantityDifference,
    totalFinancialLoss: inv.totalFinancialLoss,
    createdBy: inv.createdBy, createdAt: inv.createdAt?.toISOString(),
    items
  }
}

module.exports = { listAdjustments, createAdjustment, saveAdjustment, removeAdjustment, getLowStockProducts, getInventoryBatchReport, getProductBatches, createInventory, listInventories, getInventory }
