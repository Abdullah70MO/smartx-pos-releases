function dashboardSummary(realm) {
  const today = new Date()
  const startOfDay = new Date(today.getFullYear(), today.getMonth(), today.getDate())
  const startOfMonth = new Date(today.getFullYear(), today.getMonth(), 1)

  const todaySales = realm.objects('Sale').filtered('createdAt >= $0', startOfDay)
  const monthSales = realm.objects('Sale').filtered('createdAt >= $0', startOfMonth)
  const todayExpenses = realm.objects('Expense').filtered('createdAt >= $0', startOfDay)
  const monthExpenses = realm.objects('Expense').filtered('createdAt >= $0', startOfMonth)
  const allProducts = realm.objects('Product')

  const todayTotal = todaySales.reduce((sum, s) => sum + s.total, 0)
  const todayProfit = todaySales.reduce((sum, s) => {
    const cost = s.items.reduce((c, item) => c + (item.cost * item.quantity), 0)
    return sum + s.total - cost
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

  const lowStock = allProducts.filtered('active == true AND (stock <= reorderPoint OR stock == 0)')

  const recentSales = realm.objects('Sale').sorted('createdAt', true).slice(0, 6)

  return {
    todaySales: todayTotal,
    todayInvoices: todaySales.length,
    lowStock: lowStock.length,
    lowStockProducts: Array.from(lowStock).map(p => ({ _id: p._id, name: p.name, stock: p.stock, reorderPoint: p.reorderPoint })),
    grossProfit: todayProfit,
    totalProducts: allProducts.length,
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
