function dashboardSummary(realm) {
  const today = new Date()
  const startOfDay = new Date(today.getFullYear(), today.getMonth(), today.getDate())
  const startOfMonth = new Date(today.getFullYear(), today.getMonth(), 1)

  const todaySales = realm.objects('Sale').filtered('createdAt >= $0', startOfDay)
  const monthSales = realm.objects('Sale').filtered('createdAt >= $0', startOfMonth)
  const todayExpenses = realm.objects('Expense').filtered('date >= $0', startOfDay)
  const monthExpenses = realm.objects('Expense').filtered('date >= $0', startOfMonth)
  const todayReturns = realm.objects('Return').filtered('createdAt >= $0', startOfDay)
  const monthReturns = realm.objects('Return').filtered('createdAt >= $0', startOfMonth)
  const todayTotal = todaySales.reduce((sum, s) => sum + (s.total || 0), 0) - todayReturns.reduce((sum, r) => sum + (r.refundAmount || 0) + (r.tax || 0), 0)
  const todayProfit = todaySales.reduce((sum, s) => {
    const cost = s.items.reduce((c, item) => c + (item.cost * item.quantity), 0)
    return sum + (s.total - (s.tax || 0)) - cost
  }, 0) - todayReturns.reduce((sum, r) => {
    const cost = r.items.reduce((c, item) => c + (item.cost * item.quantity), 0)
    return sum + (r.refundAmount || 0) + (r.tax || 0) - cost
  }, 0)

  const productSalesMap = new Map()
  todaySales.forEach(sale => {
    sale.items.forEach(item => {
      const existing = productSalesMap.get(item.productId) || { name: item.name, quantity: 0, revenue: 0 }
      existing.quantity += item.quantity
      existing.revenue += item.quantity * item.unitPrice
      productSalesMap.set(item.productId, existing)
    })
  })

  const topProducts = [...productSalesMap.entries()]
    .sort((a, b) => b[1].revenue - a[1].revenue)
    .slice(0, 5)
    .map(([id, data]) => ({ productId: id, ...data }))

  const lowStockProducts = realm.objects('Product').filtered('active == true AND (stock <= reorderPoint OR stock == 0)')
  const lowStock = Array.from(lowStockProducts)

  const now = new Date()
  const thirtyDaysFromNow = new Date(now.getFullYear(), now.getMonth(), now.getDate() + 30)
  const expiringProducts = realm.objects('Product').filtered('active == true AND expiryDate != ""')
  const nearExpiry = Array.from(expiringProducts).filter(p => {
    const d = new Date(p.expiryDate + 'T23:59:59')
    return d > now && d <= thirtyDaysFromNow
  }).sort((a, b) => a.expiryDate.localeCompare(b.expiryDate))

  const recentSales = realm.objects('Sale').sorted('createdAt', true).slice(0, 6)

  const totalInventoryValue = realm.objects('StockBatch').reduce((sum, b) => sum + (b.quantity * b.cost), 0)

  return {
    todaySales: todayTotal,
    todayInvoices: todaySales.length,
    lowStock: lowStock.length,
    lowStockProducts: lowStock.map(p => ({ _id: p._id, name: p.name, stock: p.stock, reorderPoint: p.reorderPoint })),
    nearExpiry: nearExpiry.map(p => ({ _id: p._id, name: p.name, expiryDate: p.expiryDate })),
    nearExpiryCount: nearExpiry.length,
    grossProfit: todayProfit,
    totalProducts: realm.objects('Product').filtered('active == true').length,
    totalInventoryValue,
    expensesMonth: monthExpenses.reduce((sum, e) => sum + e.amount, 0),
    expensesToday: todayExpenses.reduce((sum, e) => sum + e.amount, 0),
    recentSales: Array.from(recentSales).map(s => ({
      _id: s._id, invoiceNo: s.invoiceNo, total: s.total,
      cashierName: s.cashierName, createdAt: s.createdAt?.toISOString()
    })),
    topProducts
  }
}

module.exports = { dashboardSummary }
