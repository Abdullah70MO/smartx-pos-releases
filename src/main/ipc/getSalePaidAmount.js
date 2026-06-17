function getSalePaidAmount(realm, saleId) {
  const sale = realm.objectForPrimaryKey('Sale', saleId)
  if (!sale) return 0
  if (sale.paymentMethod !== 'credit') return Number(sale.paid || 0)
  let totalPaid = Number(sale.paid || 0)
  if (sale.customerName && sale.createdAt) {
    const payments = realm.objects('CustomerPayment').filtered('customerName == $0 AND createdAt > $1', sale.customerName, sale.createdAt)
    payments.forEach(p => { totalPaid += p.amount })
  }
  return totalPaid
}

module.exports = { getSalePaidAmount }
