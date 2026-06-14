const crypto = require('node:crypto')

function getActiveShift(realm, cashierId) {
  const shift = realm.objects('Shift').filtered('cashierId == $0 AND isActive == true', cashierId)[0]
  if (!shift) return null
  return {
    _id: shift._id, cashierId: shift.cashierId, cashierName: shift.cashierName,
    startedAt: shift.startedAt?.toISOString(), endingBalance: shift.endingBalance,
    startingBalance: shift.startingBalance, totalSales: shift.totalSales,
    expensesTotal: shift.expensesTotal, withdrawalsTotal: shift.withdrawalsTotal,
    invoiceCount: shift.invoiceCount, isActive: shift.isActive
  }
}

function startShift(realm, session, startingBalance) {
  const existing = realm.objects('Shift').filtered('cashierId == $0 AND isActive == true', session.userId)[0]
  if (existing) throw new Error('يوجد وردية نشطة حالياً')

  let shift
  realm.write(() => {
    shift = realm.create('Shift', {
      _id: crypto.randomUUID(),
      cashierId: session.userId,
      cashierName: session.name,
      startedAt: new Date(),
      startingBalance: Number(startingBalance) || 0,
      endingBalance: Number(startingBalance) || 0,
      totalSales: 0,
      invoiceCount: 0,
      isActive: true
    })
  })
  return {
    _id: shift._id, cashierId: shift.cashierId, cashierName: shift.cashierName,
    startingBalance: shift.startingBalance, totalSales: shift.totalSales,
    expensesTotal: shift.expensesTotal, withdrawalsTotal: shift.withdrawalsTotal,
    invoiceCount: shift.invoiceCount, isActive: shift.isActive,
    startedAt: shift.startedAt?.toISOString()
  }
}

function endShift(realm, session, endingBalance) {
  const shift = realm.objects('Shift').filtered('cashierId == $0 AND isActive == true', session.userId)[0]
  if (!shift) throw new Error('لا توجد وردية نشطة')

  realm.write(() => {
    shift.isActive = false
    shift.endedAt = new Date()
    shift.endingBalance = Number(endingBalance) || 0
  })

  return {
    _id: shift._id, cashierId: shift.cashierId, cashierName: shift.cashierName,
    startedAt: shift.startedAt?.toISOString(), endedAt: shift.endedAt?.toISOString(),
    startingBalance: shift.startingBalance, endingBalance: shift.endingBalance,
    totalSales: shift.totalSales, expensesTotal: shift.expensesTotal,
    withdrawalsTotal: shift.withdrawalsTotal,
    invoiceCount: shift.invoiceCount, isActive: false
  }
}
function listShifts(realm) {
  const shifts = realm.objects('Shift').sorted('startedAt', true)
  return Array.from(shifts).map(s => ({
    _id: s._id, cashierId: s.cashierId, cashierName: s.cashierName,
    startedAt: s.startedAt?.toISOString(), endedAt: s.endedAt?.toISOString(),
    startingBalance: s.startingBalance, endingBalance: s.endingBalance,
    totalSales: s.totalSales, expensesTotal: s.expensesTotal,
    withdrawalsTotal: s.withdrawalsTotal,
    invoiceCount: s.invoiceCount, isActive: s.isActive
  }))
}

function getShiftSales(realm, cashierId) {
  const shift = realm.objects('Shift').filtered('cashierId == $0 AND isActive == true', cashierId)[0]
  if (!shift) return { sales: [], total: 0, count: 0 }
  const sales = realm.objects('Sale').filtered('cashierId == $0 AND createdAt >= $1', cashierId, shift.startedAt)
    .sorted('createdAt', true)
  return {
    sales: Array.from(sales).map(s => ({
      _id: s._id, invoiceNo: s.invoiceNo, total: s.total,
      paymentMethod: s.paymentMethod, createdAt: s.createdAt?.toISOString()
    })),
    total: sales.reduce((sum, s) => sum + s.total, 0),
    count: sales.length
  }
}

module.exports = { getActiveShift, startShift, endShift, listShifts, getShiftSales }
