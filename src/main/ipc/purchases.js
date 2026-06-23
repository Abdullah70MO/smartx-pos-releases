const Realm = require('realm')
const crypto = require('node:crypto')
const { addBatch, syncProductStock, removeBatchesByRef } = require('./inventoryHelpers')
const { paginate } = require('../database')

function updateTreasury(realm, amount, note, userId, refId, paymentMethod) {
  if (amount === 0) return
  const treasuryType = paymentMethod === 'card' ? 'bank' : 'main'
  const treasury = realm.objects('Treasury').filtered('type == $0', treasuryType)[0] || realm.objects('Treasury').filtered('type == "main"')[0]
  if (!treasury) return
  if (amount < 0 && treasury.balance + amount < 0) {
    throw new Error('الرصيد غير كافٍ في الخزينة')
  }
  treasury.balance += amount
  treasury.updatedAt = new Date()
  realm.create('TreasuryTransaction', {
    _id: crypto.randomUUID(),
    treasuryId: treasury._id, treasuryName: treasury.name,
    type: 'purchase',
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

function listPurchases(realm, filter, page, pageSize) {
  let results
  if (filter?.query) {
    const q = filter.query
    results = realm.objects('Purchase').filtered(
      'invoiceNo == $0 OR supplierName CONTAINS[c] $1 OR createdBy CONTAINS[c] $1',
      Number(q) || 0, q
    ).sorted('createdAt', true)
  } else {
    results = realm.objects('Purchase').sorted('createdAt', true)
  }
  if (filter?.from) {
    const from = new Date(filter.from)
    if (!isNaN(from)) results = results.filtered('createdAt >= $0', from)
  }
  if (filter?.to) {
    const to = new Date(filter.to + 'T23:59:59')
    if (!isNaN(to)) results = results.filtered('createdAt <= $0', to)
  }
  if (page != null) {
    const result = paginate(results, page, pageSize || 20)
    return { ...result, data: result.data.map(p => flattenPurchase(p)) }
  }
  return Array.from(results).map(p => flattenPurchase(p))
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

function getPaymentStatus(netCost, paid) {
  if (paid <= 0) return 'credit'
  if (paid >= netCost) return 'paid'
  return 'partial'
}

function createPurchase(realm, user, { items, totalCost, supplierName, supplierPhone, supplierId, note, paymentMethod, paid, discount }) {
  let purchase
  const paidAmount = Number(paid) || 0
  const discAmount = Number(discount) || 0
  const netCost = Number(totalCost) - discAmount
  const pm = paymentMethod || 'credit'
  let previousCredit = 0
  let previousDebt = 0
  if (supplierId) {
    const sup = realm.objectForPrimaryKey('Supplier', supplierId)
    if (sup) {
      const credit = (sup.totalPaid || 0) - (sup.totalPurchases || 0)
      previousCredit = Math.max(0, credit)
      previousDebt = Math.max(0, -credit)
    }
  }
  realm.write(() => {
    const invoiceNo = getNextInvoice(realm)
    purchase = realm.create('Purchase', {
      _id: crypto.randomUUID(),
      invoiceNo, supplierName: supplierName || '', supplierPhone: supplierPhone || '',
      supplierId: supplierId || '', note: note || '',
      paymentMethod: pm,
      totalCost: Number(totalCost),
      discount: discAmount,
      netCost: netCost < 0 ? 0 : netCost,
      paid: paidAmount,
      previousCredit,
      previousDebt,
      paymentStatus: getPaymentStatus(netCost < 0 ? 0 : netCost, paidAmount),
      items: items.map(i => ({
        productId: i.productId, name: i.name,
        quantity: Number(i.quantity), cost: Number(i.cost),
        subtotal: Number(i.quantity) * Number(i.cost)
      })),
      createdBy: user.name, createdAt: new Date()
    })
    items.forEach(i => {
      const product = getOrCreateProduct(realm, i)
      const qty = Number(i.quantity) || 0
      const cost = Number(i.cost) || 0
      addBatch(realm, product._id, qty, cost, purchase._id)
      product.updatedAt = new Date()
    })
    if (supplierId) updateSupplierBalance(realm, supplierId, netCost < 0 ? 0 : netCost)
    if (paidAmount > 0) {
      updateTreasury(realm, -paidAmount, 'مشتريات فاتورة #' + invoiceNo, user.name, purchase._id, pm)
      if (supplierId) {
        realm.create('SupplierPayment', {
          _id: crypto.randomUUID(),
          supplierId, supplierName: supplierName || '',
          amount: paidAmount, note: 'دفعة فاتورة #' + invoiceNo,
          paymentMethod: pm, createdBy: user.name, createdAt: new Date()
        })
        const supplier = realm.objectForPrimaryKey('Supplier', supplierId)
        if (supplier) {
          supplier.totalPaid = (supplier.totalPaid || 0) + paidAmount
          supplier.updatedAt = new Date()
        }
      }
    }
  })
  return flattenPurchase(purchase)
}

function savePurchase(realm, user, data) {
  let purchase
  const paidAmount = Number(data.paid) || 0
  const discAmount = Number(data.discount) || 0
  const newNetCost = (Number(data.totalCost) - discAmount)
  realm.write(() => {
    if (data._id) {
      purchase = realm.objectForPrimaryKey('Purchase', data._id)
      if (!purchase) throw new Error('الفاتورة غير موجودة')
      const oldNetCost = (purchase.totalCost - (purchase.discount || 0))
      const oldSupplierId = purchase.supplierId
      const oldPaid = purchase.paid || 0
      const oldItemsMap = {}
      purchase.items.forEach(i => { oldItemsMap[i.productId] = Number(i.quantity) || 0 })
      const newItemsMap = {}
      data.items.forEach(i => { newItemsMap[i.productId] = { qty: Number(i.quantity) || 0, cost: Number(i.cost) || 0, name: i.name } })
      const allProductIds = [...new Set([...Object.keys(oldItemsMap), ...Object.keys(newItemsMap)])]

      allProductIds.forEach(pid => {
        const oldBatches = realm.objects('StockBatch').filtered('productId == $0 AND refId == $1', pid, purchase._id)
        const oldRemaining = Array.from(oldBatches).reduce((s, b) => s + b.quantity, 0)
        const oldOriginal = oldItemsMap[pid] || 0
        const consumed = Math.max(0, oldOriginal - oldRemaining)
        realm.delete(oldBatches)

        const newItem = newItemsMap[pid]
        if (newItem) {
          const product = getOrCreateProduct(realm, { productId: pid, name: newItem.name, cost: newItem.cost })
          const newQty = newItem.qty
          const netQty = Math.max(0, newQty - consumed)
          if (netQty > 0) {
            addBatch(realm, product._id, netQty, newItem.cost, purchase._id)
          }
          product.updatedAt = new Date()
        }
        syncProductStock(realm, pid)
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
      purchase.discount = discAmount
      purchase.netCost = newNetCost < 0 ? 0 : newNetCost
      purchase.paymentMethod = data.paymentMethod || 'credit'
      purchase.paid = paidAmount
      purchase.paymentStatus = getPaymentStatus(newNetCost < 0 ? 0 : newNetCost, paidAmount)
      purchase.note = data.note || ''
      if (oldSupplierId) updateSupplierBalance(realm, oldSupplierId, -oldNetCost)
      if (data.supplierId) updateSupplierBalance(realm, data.supplierId, newNetCost < 0 ? 0 : newNetCost)
      if (oldPaid > 0) {
        updateTreasury(realm, oldPaid, 'إلغاء مشتريات #' + purchase.invoiceNo, user.name, purchase._id, purchase.paymentMethod)
      }
      if (paidAmount > 0) {
        updateTreasury(realm, -paidAmount, 'مشتريات فاتورة #' + purchase.invoiceNo, user.name, purchase._id, data.paymentMethod || 'cash')
      }
      if (oldPaid > 0 && oldSupplierId) {
        updateSupplierBalance(realm, oldSupplierId, -oldPaid, true)
        const oldPayments = realm.objects('SupplierPayment').filtered('supplierId == $0 AND note CONTAINS $1', oldSupplierId, '#' + purchase.invoiceNo)
        realm.delete(oldPayments)
      }
      if (paidAmount > 0 && data.supplierId) {
        updateSupplierBalance(realm, data.supplierId, paidAmount, true)
        realm.create('SupplierPayment', {
          _id: crypto.randomUUID(),
          supplierId: data.supplierId, supplierName: data.supplierName || '',
          amount: paidAmount, note: 'دفعة فاتورة #' + purchase.invoiceNo,
          paymentMethod: data.paymentMethod || 'cash',
          createdBy: user.name, createdAt: new Date()
        })
      }
    } else {
      const invoiceNo = getNextInvoice(realm)
      let prevCredit = 0
      let prevDebt = 0
      if (data.supplierId) {
        const sup = realm.objectForPrimaryKey('Supplier', data.supplierId)
        if (sup) {
          const credit = (sup.totalPaid || 0) - (sup.totalPurchases || 0)
          prevCredit = Math.max(0, credit)
          prevDebt = Math.max(0, -credit)
        }
      }
      purchase = realm.create('Purchase', {
        _id: crypto.randomUUID(),
        invoiceNo, supplierName: data.supplierName || '', supplierPhone: data.supplierPhone || '',
        supplierId: data.supplierId || '', note: data.note || '',
        paymentMethod: data.paymentMethod || 'credit',
        totalCost: Number(data.totalCost),
        discount: discAmount,
        netCost: newNetCost < 0 ? 0 : newNetCost,
        paid: paidAmount,
        previousCredit: prevCredit,
        previousDebt: prevDebt,
        paymentStatus: getPaymentStatus(newNetCost < 0 ? 0 : newNetCost, paidAmount),
        items: data.items.map(i => ({
          productId: i.productId, name: i.name,
          quantity: Number(i.quantity), cost: Number(i.cost),
          subtotal: Number(i.quantity) * Number(i.cost)
        })),
        createdBy: user.name, createdAt: new Date()
      })
      data.items.forEach(i => {
        const product = getOrCreateProduct(realm, i)
        const qty = Number(i.quantity) || 0
        const cost = Number(i.cost) || 0
        addBatch(realm, product._id, qty, cost, purchase._id)
        product.updatedAt = new Date()
      })
      if (data.supplierId) updateSupplierBalance(realm, data.supplierId, newNetCost < 0 ? 0 : newNetCost)
      if (paidAmount > 0) {
        updateTreasury(realm, -paidAmount, 'مشتريات فاتورة #' + invoiceNo, user.name, purchase._id, data.paymentMethod || 'cash')
        if (data.supplierId) {
          realm.create('SupplierPayment', {
            _id: crypto.randomUUID(),
            supplierId: data.supplierId, supplierName: data.supplierName || '',
            amount: paidAmount, note: 'دفعة فاتورة #' + invoiceNo,
            paymentMethod: data.paymentMethod || 'cash',
            createdBy: user.name, createdAt: new Date()
          })
          updateSupplierBalance(realm, data.supplierId, paidAmount, true)
        }
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
    totalCost: p.totalCost, discount: p.discount || 0, netCost: p.netCost || p.totalCost,
    paid: p.paid, previousCredit: p.previousCredit || 0, previousDebt: p.previousDebt || 0,
    paymentMethod: p.paymentMethod,
    paymentStatus: p.paymentStatus || 'credit',
    note: p.note, createdBy: p.createdBy,
    createdAt: p.createdAt?.toISOString()
  }
}

function removePurchase(realm, id) {
  realm.write(() => {
    const purchase = realm.objectForPrimaryKey('Purchase', id)
    if (purchase) {
      const productIds = [...new Set(purchase.items.map(i => i.productId))]
      removeBatchesByRef(realm, purchase._id)
      productIds.forEach(pid => syncProductStock(realm, pid))
      const remNetCost = (purchase.totalCost - (purchase.discount || 0))
      if (purchase.supplierId) updateSupplierBalance(realm, purchase.supplierId, -remNetCost)
      const paidAmount = purchase.paid || 0
      if (paidAmount > 0) {
        updateTreasury(realm, paidAmount, 'إلغاء مشتريات #' + purchase.invoiceNo, 'system', purchase._id, purchase.paymentMethod)
        if (purchase.supplierId) updateSupplierBalance(realm, purchase.supplierId, -paidAmount, true)
      }
      realm.delete(purchase)
    }
  })
  return true
}

module.exports = { listPurchases, createPurchase, savePurchase, removePurchase }
