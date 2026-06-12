const Realm = require('realm')
const crypto = require('node:crypto')

function updateTreasury(realm, amount, note, session, refId, refType, paymentMethod) {
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
    refType, refId: refId || '',
    paymentMethod: paymentMethod || 'cash',
    createdBy: session.userId, createdAt: new Date()
  })
}

function listSales(realm) {
  const sales = realm.objects('Sale').sorted('createdAt', true)
  return Array.from(sales).map(s => ({
    _id: s._id, invoiceNo: s.invoiceNo,
    items: Array.from(s.items).map(item => ({
      productId: item.productId, name: item.name,
      quantity: item.quantity, unitPrice: item.unitPrice, cost: item.cost
    })),
    subtotal: s.subtotal, discount: s.discount, tax: s.tax, total: s.total,
    paymentMethod: s.paymentMethod, paid: s.paid,
    cashierId: s.cashierId, cashierName: s.cashierName,
    customerName: s.customerName, customerPhone: s.customerPhone,
    note: s.note, createdAt: s.createdAt?.toISOString()
  }))
}

function createSale(realm, session, data) {
  let counter = realm.objectForPrimaryKey('Counter', 'invoice')
  if (!counter) {
    realm.write(() => {
      realm.create('Counter', { _id: 'invoice', value: 1000 })
    })
    counter = realm.objectForPrimaryKey('Counter', 'invoice')
  }

  const invoiceNo = counter.value + 1
  const subtotal = data.items.reduce((sum, item) => sum + (item.unitPrice * item.quantity), 0)
  const discount = Number(data.discount) || 0
  const tax = Number(data.tax) || 0
  const total = subtotal - discount + tax

  let sale
  realm.write(() => {
    counter.value = invoiceNo

    data.items.forEach(item => {
      const product = realm.objectForPrimaryKey('Product', item.productId)
      if (product) {
        product.stock -= Number(item.quantity) || 0
      }
    })

    sale = realm.create('Sale', {
      _id: crypto.randomUUID(),
      invoiceNo,
      items: data.items.map(item => ({
        productId: item.productId,
        name: item.name,
        quantity: Number(item.quantity) || 0,
        unitPrice: Number(item.unitPrice) || 0,
        cost: Number(item.cost) || 0
      })),
      subtotal, discount, tax, total,
      paymentMethod: data.paymentMethod || 'cash',
      paid: data.paid != null ? Number(data.paid) : total,
      cashierId: session.userId,
      cashierName: session.name,
      customerName: data.customerName || '',
      customerPhone: data.customerPhone || '',
      note: data.note || '',
      createdAt: new Date()
    })

    if (data.paymentMethod === 'credit' && data.customerName) {
      const existing = realm.objects('CreditCustomer').filtered('name == $0', data.customerName)[0]
      if (existing) {
        existing.totalDebt += total - Number(data.paid || 0)
        existing.totalPaid += Number(data.paid || 0)
        existing.updatedAt = new Date()
      } else {
        realm.create('CreditCustomer', {
          _id: crypto.randomUUID(),
          name: data.customerName,
          phone: data.customerPhone || '',
          totalDebt: total - Number(data.paid || 0),
          totalPaid: Number(data.paid || 0),
          createdAt: new Date(),
          updatedAt: new Date()
        })
      }
    }

    if (data.paymentMethod === 'cash' || data.paymentMethod === 'card') {
      updateTreasury(realm, data.paid != null ? Number(data.paid) : total, 'مبيعات فاتورة #' + invoiceNo, session, sale._id, 'sale', data.paymentMethod)
    }

    const activeShift = realm.objects('Shift').filtered('cashierId == $0 AND isActive == true', session.userId)[0]
    if (activeShift) {
      activeShift.totalSales += total
      activeShift.invoiceCount += 1
    }
  })
  return {
    _id: sale._id, invoiceNo: sale.invoiceNo, total: sale.total,
    paid: sale.paid, paymentMethod: sale.paymentMethod,
    customerName: sale.customerName, customerPhone: sale.customerPhone,
    note: sale.note, createdAt: sale.createdAt?.toISOString()
  }
}

function removeSale(realm, id) {
  realm.write(() => {
    const sale = realm.objectForPrimaryKey('Sale', id)
    if (sale) {
      sale.items.forEach(item => {
        const product = realm.objectForPrimaryKey('Product', item.productId)
        if (product) product.stock += item.quantity
      })
      if (sale.paymentMethod === 'cash' || sale.paymentMethod === 'card') {
        updateTreasury(realm, -sale.paid, 'إلغاء فاتورة #' + sale.invoiceNo, { userId: 'system' }, sale._id, 'sale', sale.paymentMethod)
      }
      if (sale.paymentMethod === 'credit' && sale.customerName) {
        const customer = realm.objects('CreditCustomer').filtered('name == $0', sale.customerName)[0]
        if (customer) {
          customer.totalDebt -= sale.total - sale.paid
          customer.totalPaid -= sale.paid
          if (customer.totalDebt < 0) customer.totalDebt = 0
          if (customer.totalPaid < 0) customer.totalPaid = 0
        }
      }
      const activeShift = realm.objects('Shift').filtered('cashierId == $0 AND isActive == true', sale.cashierId)[0]
      if (activeShift) {
        activeShift.totalSales -= sale.total
        activeShift.invoiceCount -= 1
      }
      realm.delete(sale)
    }
  })
  return true
}

module.exports = { listSales, createSale, removeSale }
