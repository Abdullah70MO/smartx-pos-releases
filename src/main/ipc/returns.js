const Realm = require('realm')
const crypto = require('node:crypto')
const { returnToFifo, deductFromFifo } = require('./inventoryHelpers')

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
    amount, note: note || '', refType: 'return',
    paymentMethod: paymentMethod || 'cash',
    createdBy: session.name || session.userId || 'system', createdAt: new Date()
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
        returnToFifo(realm, product._id, qty, cost)
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
    updateTreasury(realm, -Number(data.subtotal), 'مرتجع فاتورة #' + data.invoiceNo, session, sale.paymentMethod)

    const activeShift = realm.objects('Shift').filtered('cashierId == $0 AND isActive == true', session.userId)[0]
    if (activeShift) {
      activeShift.totalSales -= Number(data.subtotal)
    }

    if (sale.paymentMethod === 'credit' && data.customerName) {
      const customer = realm.objects('CreditCustomer').filtered('name == $0', data.customerName)[0]
      if (customer) {
        customer.totalDebt = Math.max(0, (customer.totalDebt || 0) - Number(data.subtotal))
        customer.updatedAt = new Date()
      }
    }
  })
  return { _id: ret._id, invoiceNo: ret.invoiceNo, saleId: ret.saleId, subtotal: ret.subtotal, reason: ret.reason, cashierId: ret.cashierId, cashierName: ret.cashierName, customerName: ret.customerName, isFullReturn: ret.isFullReturn, createdAt: ret.createdAt?.toISOString() }
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
      if (sale && (sale.paymentMethod === 'cash' || sale.paymentMethod === 'card')) {
        const treasuryType = sale.paymentMethod === 'card' ? 'bank' : 'main'
        const treasury = realm.objects('Treasury').filtered('type == $0', treasuryType)[0] || realm.objects('Treasury').filtered('type == "main"')[0]
        if (treasury) {
          treasury.balance += Number(ret.subtotal)
          treasury.updatedAt = new Date()
          realm.create('TreasuryTransaction', {
            _id: crypto.randomUUID(),
            treasuryId: treasury._id, treasuryName: treasury.name,
            type: 'deposit', amount: Number(ret.subtotal),
            note: 'إلغاء مرتجع #' + ret.invoiceNo, refType: 'return', refId: ret._id,
            paymentMethod: sale.paymentMethod,
            createdBy: 'system', createdAt: new Date()
          })
        }
      }
      if (sale && sale.paymentMethod === 'credit' && sale.customerName) {
        const customer = realm.objects('CreditCustomer').filtered('name == $0', sale.customerName)[0]
        if (customer) {
          customer.totalDebt = (customer.totalDebt || 0) + Number(ret.subtotal)
          customer.updatedAt = new Date()
        }
      }
      const activeShift = realm.objects('Shift').filtered('cashierId == $0 AND isActive == true', session.userId)[0]
      if (activeShift) {
        activeShift.totalSales += Number(ret.subtotal)
      }
      realm.delete(ret)
    }
  })
  return true
}

module.exports = { listReturns, createReturn, removeReturn }
