const Realm = require('realm')
const crypto = require('node:crypto')
const { updateWeightedAverage, removeFromWeightedAverage } = require('./inventoryHelpers')

function updateTreasury(realm, amount, note, userId, refId, paymentMethod) {
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
    amount, note: note || '',
    refType: 'purchase', refId: refId || '',
    paymentMethod: paymentMethod || 'cash',
    createdBy: userId, createdAt: new Date()
  })
}

function getNextInvoice(realm) {
  const counter = realm.objectForPrimaryKey('Counter', 'purchase')
  if (!counter) {
    realm.create('Counter', { _id: 'purchase', value: 1 })
    return 1
  }
  counter.value += 1
  return counter.value
}

function listPurchases(realm) {
  return Array.from(realm.objects('Purchase').sorted('createdAt', true)).map(p => flattenPurchase(p))
}

function getOrCreateProduct(realm, item) {
  let product = item.productId ? realm.objectForPrimaryKey('Product', item.productId) : null
  if (!product) {
    const productId = crypto.randomUUID()
    product = realm.create('Product', {
      _id: productId,
      sku: '',
      name: item.name || 'منتج جديد',
      barcode: '',
      category: '',
      unit: '',
      cost: Number(item.cost) || 0,
      priceRetail: Number(item.cost) || 0,
      priceHalfWholesale: Number(item.cost) || 0,
      priceWholesale: Number(item.cost) || 0,
      taxRate: 0,
      stock: 0,
      reorderPoint: 0,
      active: true,
      updatedAt: new Date()
    })
    item.productId = productId
  }
  return product
}

function updateSupplierBalance(realm, supplierId, delta, isPayment = false) {
  const supplier = realm.objectForPrimaryKey('Supplier', supplierId)
  if (supplier) {
    if (isPayment) {
      supplier.totalPaid = Math.max(0, (supplier.totalPaid || 0) + delta)
    } else {
      supplier.totalPurchases = Math.max(0, (supplier.totalPurchases || 0) + delta)
    }
    supplier.updatedAt = new Date()
  }
}

function createPurchase(realm, user, { items, totalCost, supplierName, supplierPhone, supplierId, note, paymentMethod }) {
  let purchase
  realm.write(() => {
    const invoiceNo = getNextInvoice(realm)
    purchase = realm.create('Purchase', {
      _id: crypto.randomUUID(),
      invoiceNo, supplierName: supplierName || '', supplierPhone: supplierPhone || '',
      supplierId: supplierId || '', note: note || '',
      paymentMethod: paymentMethod || 'cash',
      items: items.map(i => ({
        productId: i.productId, name: i.name,
        quantity: Number(i.quantity), cost: Number(i.cost),
        subtotal: Number(i.quantity) * Number(i.cost)
      })),
      totalCost: Number(totalCost),
      createdBy: user.userId || user.name, createdAt: new Date()
    })
    items.forEach(i => {
      const product = getOrCreateProduct(realm, i)
      const qty = Number(i.quantity) || 0
      const cost = Number(i.cost) || 0
      const oldStock = product.stock || 0
      product.stock = oldStock + qty
      updateWeightedAverage(product, qty, cost, oldStock)
      product.updatedAt = new Date()
    })
    if (supplierId) updateSupplierBalance(realm, supplierId, Number(totalCost))
    if (paymentMethod === 'cash' || paymentMethod === 'card') {
      updateTreasury(realm, -Number(totalCost), 'مشتريات فاتورة #' + invoiceNo, user.userId || user.name, purchase._id, paymentMethod)
    }
  })
  return flattenPurchase(purchase)
}

function savePurchase(realm, user, data) {
  let purchase
  realm.write(() => {
    if (data._id) {
      purchase = realm.objectForPrimaryKey('Purchase', data._id)
      if (!purchase) throw new Error('الفاتورة غير موجودة')
      const oldTotal = purchase.totalCost
      const oldSupplierId = purchase.supplierId
      const oldPaymentMethod = purchase.paymentMethod
      purchase.items.forEach(i => {
        const product = realm.objectForPrimaryKey('Product', i.productId)
        if (product) {
          const qty = Number(i.quantity) || 0
          const cost = Number(i.cost) || 0
          const oldStock = product.stock || 0
          product.stock = Math.max(0, oldStock - qty)
          removeFromWeightedAverage(product, qty, cost, oldStock)
          product.updatedAt = new Date()
        }
      })
      purchase.items = data.items.map(i => ({
        productId: i.productId, name: i.name,
        quantity: Number(i.quantity), cost: Number(i.cost),
        subtotal: Number(i.quantity) * Number(i.cost)
      }))
      purchase.supplierId = data.supplierId || ''
      purchase.supplierName = data.supplierName || ''
      purchase.supplierPhone = data.supplierPhone || ''
      purchase.totalCost = Number(data.totalCost)
      purchase.paymentMethod = data.paymentMethod || 'cash'
      purchase.note = data.note || ''
      data.items.forEach(i => {
        const product = getOrCreateProduct(realm, i)
        const qty = Number(i.quantity) || 0
        const cost = Number(i.cost) || 0
        const oldStock = product.stock || 0
        product.stock = oldStock + qty
        updateWeightedAverage(product, qty, cost, oldStock)
        product.updatedAt = new Date()
      })
      if (oldSupplierId) updateSupplierBalance(realm, oldSupplierId, -oldTotal)
      if (data.supplierId) updateSupplierBalance(realm, data.supplierId, Number(data.totalCost))
      // Revert old treasury deduction, apply new one
      if (oldPaymentMethod === 'cash' || oldPaymentMethod === 'card') {
        updateTreasury(realm, oldTotal, 'إلغاء مشتريات #' + purchase.invoiceNo, user.userId || user.name, purchase._id, oldPaymentMethod)
      }
      if (data.paymentMethod === 'cash' || data.paymentMethod === 'card') {
        updateTreasury(realm, -Number(data.totalCost), 'مشتريات فاتورة #' + purchase.invoiceNo, user.userId || user.name, purchase._id, data.paymentMethod)
      }
    } else {
      const invoiceNo = getNextInvoice(realm)
      purchase = realm.create('Purchase', {
        _id: crypto.randomUUID(),
        invoiceNo, supplierName: data.supplierName || '', supplierPhone: data.supplierPhone || '',
        supplierId: data.supplierId || '', note: data.note || '',
        paymentMethod: data.paymentMethod || 'cash',
        items: data.items.map(i => ({
          productId: i.productId, name: i.name,
          quantity: Number(i.quantity), cost: Number(i.cost),
          subtotal: Number(i.quantity) * Number(i.cost)
        })),
        totalCost: Number(data.totalCost),
        createdBy: user.userId || user.name, createdAt: new Date()
      })
      data.items.forEach(i => {
        const product = getOrCreateProduct(realm, i)
        const qty = Number(i.quantity) || 0
        const cost = Number(i.cost) || 0
        const oldStock = product.stock || 0
        product.stock = oldStock + qty
        updateWeightedAverage(product, qty, cost, oldStock)
        product.updatedAt = new Date()
      })
      if (data.supplierId) updateSupplierBalance(realm, data.supplierId, Number(data.totalCost))
      if (data.paymentMethod === 'cash' || data.paymentMethod === 'card') {
        updateTreasury(realm, -Number(data.totalCost), 'مشتريات فاتورة #' + invoiceNo, user.userId || user.name, purchase._id, data.paymentMethod)
      }
    }
  })
  return flattenPurchase(purchase)
}

function flattenPurchase(p) {
  return {
    _id: p._id, invoiceNo: p.invoiceNo, supplierId: p.supplierId,
    supplierName: p.supplierName, supplierPhone: p.supplierPhone,
    items: Array.from(p.items).map(i => ({
      productId: i.productId, name: i.name,
      quantity: i.quantity, cost: i.cost, subtotal: i.subtotal
    })),
    totalCost: p.totalCost, paymentMethod: p.paymentMethod,
    note: p.note, createdBy: p.createdBy,
    createdAt: p.createdAt?.toISOString()
  }
}

function removePurchase(realm, id) {
  realm.write(() => {
    const purchase = realm.objectForPrimaryKey('Purchase', id)
    if (purchase) {
      purchase.items.forEach(i => {
        const product = realm.objectForPrimaryKey('Product', i.productId)
        if (product) {
          const qty = Number(i.quantity) || 0
          const cost = Number(i.cost) || 0
          const oldStock = product.stock || 0
          product.stock = Math.max(0, oldStock - qty)
          removeFromWeightedAverage(product, qty, cost, oldStock)
        }
      })
      if (purchase.supplierId) updateSupplierBalance(realm, purchase.supplierId, -purchase.totalCost)
      if (purchase.paymentMethod === 'cash' || purchase.paymentMethod === 'card') {
        updateTreasury(realm, purchase.totalCost, 'إلغاء مشتريات #' + purchase.invoiceNo, 'system', purchase._id, purchase.paymentMethod)
      }
      realm.delete(purchase)
    }
  })
  return true
}

module.exports = { listPurchases, createPurchase, savePurchase, removePurchase }
