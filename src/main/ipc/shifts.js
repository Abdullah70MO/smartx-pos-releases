const crypto = require('node:crypto')
const { createNotification } = require('./notifications')
const { paginate } = require('../database')

function getActiveShift(realm, cashierId) {
  const shift = realm.objects('Shift').filtered('cashierId == $0 AND isActive == true', cashierId)[0]
  if (!shift) return null
  return {
    _id: shift._id, cashierId: shift.cashierId, cashierName: shift.cashierName,
    startedAt: shift.startedAt?.toISOString(), endingBalance: shift.endingBalance,
    cardEndingBalance: shift.cardEndingBalance,
    startingBalance: shift.startingBalance, totalSales: shift.totalSales,
    cashTotal: shift.cashTotal, cardTotal: shift.cardTotal,
    creditPaidTotal: shift.creditPaidTotal,
    expensesTotal: shift.expensesTotal, withdrawalsTotal: shift.withdrawalsTotal,
    cardWithdrawalsTotal: shift.cardWithdrawalsTotal,
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
      cashTotal: 0,
      cardTotal: 0,
      creditPaidTotal: 0,
      expensesTotal: 0,
      withdrawalsTotal: 0,
      cardWithdrawalsTotal: 0,
      isActive: true
    })
  })
  return getActiveShift(realm, session.userId)
}

function endShift(realm, session, endingCashBalance, endingCardBalance) {
  const shift = realm.objects('Shift').filtered('cashierId == $0 AND isActive == true', session.userId)[0]
  if (!shift) throw new Error('لا توجد وردية نشطة')

  realm.write(() => {
    shift.isActive = false
    shift.endedAt = new Date()
    shift.endingBalance = Number(endingCashBalance) || 0
    shift.cardEndingBalance = Number(endingCardBalance) || 0

    const creditPaidTotal = shift.creditPaidTotal || 0
    const expectedCash = Math.max(0, (shift.startingBalance || 0) + (shift.cashTotal || 0) + creditPaidTotal - (shift.expensesTotal || 0) - (shift.withdrawalsTotal || 0))
    const cashDiff = (Number(endingCashBalance) || 0) - expectedCash
    if (cashDiff !== 0) {
      updateTreasuryBalance(realm, 'main', cashDiff, `تسوية كاش إنهاء الوردية (${cashDiff > 0 ? 'زيادة' : 'عجز'})`)
    }
    if ((shift.expensesTotal || 0) > 0) {
      updateTreasuryBalance(realm, 'main', -(shift.expensesTotal), 'مصروفات الوردية')
    }
    if ((shift.withdrawalsTotal || 0) > 0) {
      updateTreasuryBalance(realm, 'main', -(shift.withdrawalsTotal), 'مسحوبات الوردية')
    }

    const expectedCard = (shift.cardTotal || 0) - (shift.cardWithdrawalsTotal || 0)
    const cardDiff = (Number(endingCardBalance) || 0) - expectedCard
    if (cardDiff !== 0) {
      updateTreasuryBalance(realm, 'bank', cardDiff, `تسوية بطاقة إنهاء الوردية (${cardDiff > 0 ? 'زيادة' : 'عجز'})`)
    }
    if ((shift.cardWithdrawalsTotal || 0) > 0) {
      updateTreasuryBalance(realm, 'bank', -(shift.cardWithdrawalsTotal), 'مسحوبات بطاقة الوردية')
    }
  })

  const settings = realm.objectForPrimaryKey('BusinessSettings', 'business')
  if (settings && settings.notificationShifts !== false) {
    createNotification(realm, {
      type: 'success',
      title: 'تم إغلاق الوردية',
      message: `أغلق ${shift.cashierName} الوردية - إجمالي المبيعات: ${shift.totalSales} ج.م - فواتير: ${shift.invoiceCount}`,
      referenceId: shift._id,
      referenceType: 'shift'
    })
  }
  return {
    _id: shift._id, cashierId: shift.cashierId, cashierName: shift.cashierName,
    startedAt: shift.startedAt?.toISOString(), endedAt: shift.endedAt?.toISOString(),
    startingBalance: shift.startingBalance, endingBalance: shift.endingBalance,
    cardEndingBalance: shift.cardEndingBalance,
    totalSales: shift.totalSales, cashTotal: shift.cashTotal, cardTotal: shift.cardTotal, creditPaidTotal: shift.creditPaidTotal,
    expensesTotal: shift.expensesTotal, withdrawalsTotal: shift.withdrawalsTotal,
    cardWithdrawalsTotal: shift.cardWithdrawalsTotal,
    invoiceCount: shift.invoiceCount, isActive: false
  }
}

function listShifts(realm, filter, page, pageSize) {
  let results = realm.objects('Shift').sorted('startedAt', true)
  if (filter?.query) {
    results = results.filtered('cashierName CONTAINS[c] $0', filter.query)
  }
  if (filter?.from) {
    const from = new Date(filter.from)
    if (!isNaN(from)) results = results.filtered('startedAt >= $0', from)
  }
  if (filter?.to) {
    const to = new Date(filter.to + 'T23:59:59')
    if (!isNaN(to)) results = results.filtered('startedAt <= $0', to)
  }
  const mapShift = s => ({
    _id: s._id, cashierId: s.cashierId, cashierName: s.cashierName,
    startedAt: s.startedAt?.toISOString(), endedAt: s.endedAt?.toISOString(),
    startingBalance: s.startingBalance, endingBalance: s.endingBalance,
    totalSales: s.totalSales, expensesTotal: s.expensesTotal,
    withdrawalsTotal: s.withdrawalsTotal, cardWithdrawalsTotal: s.cardWithdrawalsTotal,
    invoiceCount: s.invoiceCount, isActive: s.isActive
  })
  if (page != null) {
    const result = paginate(results, page, pageSize || 20)
    return { ...result, data: result.data.map(mapShift) }
  }
  return Array.from(results).map(mapShift)
}

function getShiftSales(realm, cashierId) {
  const shift = realm.objects('Shift').filtered('cashierId == $0 AND isActive == true', cashierId)[0]
  if (!shift) return { sales: [], total: 0, count: 0, creditTotal: 0, cashTotal: 0, cardTotal: 0, expensesTotal: 0, withdrawalsTotal: 0, cardWithdrawalsTotal: 0, returnsTotal: 0 }
  const sales = realm.objects('Sale').filtered('cashierId == $0 AND createdAt >= $1', cashierId, shift.startedAt)
    .sorted('createdAt', true)
  const returns = realm.objects('Return').filtered('cashierId == $0 AND createdAt >= $1', cashierId, shift.startedAt)
  const returnsTotal = returns.reduce((sum, r) => sum + (r.subtotal + (r.tax || 0)), 0)
  const salesTotal = sales.reduce((sum, s) => sum + (s.paid || 0), 0)
  return {
    sales: Array.from(sales).map(s => ({
      _id: s._id, invoiceNo: s.invoiceNo, total: s.total, paid: s.paid,
      paymentMethod: s.paymentMethod, customerName: s.customerName,
      createdAt: s.createdAt?.toISOString()
    })),
    total: salesTotal,
    count: sales.length,
    cashTotal: shift.cashTotal || 0,
    cardTotal: shift.cardTotal || 0,
    creditTotal: shift.creditPaidTotal || 0,
    expensesTotal: shift.expensesTotal,
    withdrawalsTotal: shift.withdrawalsTotal,
    cardWithdrawalsTotal: shift.cardWithdrawalsTotal,
    returnsTotal
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
    treasuryId: treasury._id,
    treasuryName: treasury.name,
      type: 'settlement',
    amount,
    note: note || '',
    refType: 'shift',
    createdBy: 'system',
    createdAt: new Date()
  })
}

module.exports = { getActiveShift, startShift, endShift, listShifts, getShiftSales }