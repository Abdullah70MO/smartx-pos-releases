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

function updateTreasuryBalance(realm, treasuryType, amount, note) {
  if (amount === 0) return
  const treasury = realm.objects('Treasury').filtered('type == $0', treasuryType)[0]
  if (!treasury) return
  treasury.balance += amount
  treasury.updatedAt = new Date()
  realm.create('TreasuryTransaction', {
    _id: crypto.randomUUID(),
    treasuryId: treasury._id, treasuryName: treasury.name,
    type: amount > 0 ? 'deposit' : 'withdraw',
    amount, note: note || '',
    refType: 'shift', refId: '',
    paymentMethod: treasuryType === 'bank' ? 'card' : 'cash',
    createdBy: 'system', createdAt: new Date()
  })
}

function endShift(realm, session, endingCashBalance, endingCardBalance) {
  const shift = realm.objects('Shift').filtered('cashierId == $0 AND isActive == true', session.userId)[0]
  if (!shift) throw new Error('لا توجد وردية نشطة')

  realm.write(() => {
    shift.isActive = false
    shift.endedAt = new Date()
    shift.endingBalance = Number(endingCashBalance) || 0

    const creditPaidTotal = (shift.totalSales || 0) - (shift.cashTotal || 0) - (shift.cardTotal || 0)
    const expectedCash = (shift.startingBalance || 0) + (shift.cashTotal || 0) + creditPaidTotal - (shift.expensesTotal || 0) - (shift.withdrawalsTotal || 0)
    const cashDiff = (Number(endingCashBalance) || 0) - expectedCash
    if (cashDiff !== 0) {
      updateTreasuryBalance(realm, 'main', cashDiff, `تسوية كاش إنهاء الوردية (${cashDiff > 0 ? 'زيادة' : 'عجز'})`)
    }

    const expectedCard = shift.cardTotal || 0
    const cardDiff = (Number(endingCardBalance) || 0) - expectedCard
    if (cardDiff !== 0) {
      updateTreasuryBalance(realm, 'bank', cardDiff, `تسوية بطاقة إنهاء الوردية (${cardDiff > 0 ? 'زيادة' : 'عجز'})`)
    }
  })

  return {
    _id: shift._id, cashierId: shift.cashierId, cashierName: shift.cashierName,
    startedAt: shift.startedAt?.toISOString(), endedAt: shift.endedAt?.toISOString(),
    startingBalance: shift.startingBalance, endingBalance: shift.endingBalance,
    totalSales: shift.totalSales, cashTotal: shift.cashTotal, cardTotal: shift.cardTotal,
    expensesTotal: shift.expensesTotal, withdrawalsTotal: shift.withdrawalsTotal,
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
  if (!shift) return { sales: [], total: 0, count: 0, creditTotal: 0, cashTotal: 0, cardTotal: 0 }
  const sales = realm.objects('Sale').filtered('cashierId == $0 AND createdAt >= $1', cashierId, shift.startedAt)
    .sorted('createdAt', true)
  return {
    sales: Array.from(sales).map(s => ({
      _id: s._id, invoiceNo: s.invoiceNo, total: s.total, paid: s.paid,
      paymentMethod: s.paymentMethod, createdAt: s.createdAt?.toISOString()
    })),
    total: shift.totalSales || 0,
    cashTotal: shift.cashTotal || 0,
    cardTotal: shift.cardTotal || 0,
    creditTotal: shift.creditPaidTotal || 0,
    count: sales.length
  }
}

module.exports = { getActiveShift, startShift, endShift, listShifts, getShiftSales }
