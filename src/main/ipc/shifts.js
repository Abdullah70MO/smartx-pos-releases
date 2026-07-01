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

function hasAnyActiveShift(realm) {
  return realm.objects('Shift').filtered('isActive == true').length > 0
}

function startShift(realm, session, startingBalance) {
  const existing = realm.objects('Shift').filtered('cashierId == $0 AND isActive == true', session.userId)[0]
  if (existing) throw new Error('ÙŠÙˆØ¬Ø¯ ÙˆØ±Ø¯ÙŠØ© Ù†Ø´Ø·Ø© Ø­Ø§Ù„ÙŠØ§Ù‹')

  const bal = Number(startingBalance) || 0
  if (bal > 0) {
    const treasury = realm.objects('Treasury').filtered('type == $0', 'main')[0]
    if (!treasury) throw new Error('Ù„Ø§ ØªÙˆØ¬Ø¯ Ø®Ø²Ù†Ø© Ø±Ø¦ÙŠØ³ÙŠØ©')
    if (treasury.balance < bal) throw new Error('Ø§Ù„Ø±ØµÙŠØ¯ ØºÙŠØ± ÙƒØ§ÙÙ ÙÙŠ Ø§Ù„Ø®Ø²Ù†Ø©')
  }

  realm.write(() => {
    realm.create('Shift', {
      _id: crypto.randomUUID(),
      cashierId: session.userId,
      cashierName: session.name,
      startedAt: new Date(),
      startingBalance: bal,
      endingBalance: bal,
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
    if (bal > 0) {
      updateTreasuryBalance(realm, 'main', -bal, 'Ø³Ø­Ø¨Ø© Ø¨Ø¯Ø§ÙŠØ© ÙˆØ±Ø¯ÙŠØ©')
    }
  })
  return getActiveShift(realm, session.userId)
}

function endShift(realm, session, endingCashBalance, endingCardBalance) {
  const shift = realm.objects('Shift').filtered('cashierId == $0 AND isActive == true', session.userId)[0]
  if (!shift) throw new Error('Ù„Ø§ ØªÙˆØ¬Ø¯ ÙˆØ±Ø¯ÙŠØ© Ù†Ø´Ø·Ø©')

  realm.write(() => {
    shift.isActive = false
    shift.endedAt = new Date()
    shift.endingBalance = Number(endingCashBalance) || 0
    shift.cardEndingBalance = Number(endingCardBalance) || 0

    if ((Number(endingCashBalance) || 0) > 0) {
      updateTreasuryBalance(realm, 'main', Number(endingCashBalance) || 0, 'Ø¥ÙŠØ¯Ø§Ø¹ Ù†Ù‡Ø§ÙŠØ© ÙˆØ±Ø¯ÙŠØ©')
    }
    if ((Number(endingCardBalance) || 0) > 0) {
      updateTreasuryBalance(realm, 'bank', Number(endingCardBalance) || 0, 'Ø¥ÙŠØ¯Ø§Ø¹ Ù†Ù‡Ø§ÙŠØ© ÙˆØ±Ø¯ÙŠØ© (Ø¨Ø·Ø§Ù‚Ø©)')
    }
  })

  const settings = realm.objectForPrimaryKey('BusinessSettings', 'business')
  if (settings && settings.notificationShifts !== false) {
    createNotification(realm, {
      type: 'success',
      title: 'ØªÙ… Ø¥ØºÙ„Ø§Ù‚ Ø§Ù„ÙˆØ±Ø¯ÙŠØ©',
      message: `Ø£ØºÙ„Ù‚ ${shift.cashierName} Ø§Ù„ÙˆØ±Ø¯ÙŠØ© - Ø¥Ø¬Ù…Ø§Ù„ÙŠ Ø§Ù„Ù…Ø¨ÙŠØ¹Ø§Øª: ${shift.totalSales} Ø¬.Ù… - ÙÙˆØ§ØªÙŠØ±: ${shift.invoiceCount}`,
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
  const q = filter?.q || filter?.query
  const dateFrom = filter?.dateFrom || filter?.from
  const dateTo = filter?.dateTo || filter?.to
  if (q) {
    results = results.filtered('cashierName CONTAINS[c] $0', q)
  }
  if (dateFrom) {
    const from = new Date(dateFrom)
    if (!isNaN(from)) results = results.filtered('startedAt >= $0', from)
  }
  if (dateTo) {
    const to = new Date(dateTo + 'T23:59:59')
    if (!isNaN(to)) results = results.filtered('startedAt <= $0', to)
  }
  const mapShift = s => ({
    _id: s._id, cashierId: s.cashierId, cashierName: s.cashierName,
    startedAt: s.startedAt?.toISOString(), endedAt: s.endedAt?.toISOString(),
    startingBalance: s.startingBalance, endingBalance: s.endingBalance,
    totalSales: s.totalSales, cashTotal: s.cashTotal, cardTotal: s.cardTotal,
    creditPaidTotal: s.creditPaidTotal, expensesTotal: s.expensesTotal,
    withdrawalsTotal: s.withdrawalsTotal, cardWithdrawalsTotal: s.cardWithdrawalsTotal,
    invoiceCount: s.invoiceCount, isActive: s.isActive,
    cardEndingBalance: s.cardEndingBalance
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
  const salesTotal = sales.reduce((sum, s) => sum + (s.total || 0), 0)
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
  if (!amount || isNaN(amount) || amount === 0) return
  const treasury = realm.objects('Treasury').filtered('type == $0', treasuryType)[0]
  if (!treasury) return
  treasury.balance += amount
  treasury.updatedAt = new Date()
  realm.create('TreasuryTransaction', {
    _id: crypto.randomUUID(),
    treasuryId: treasury._id,
    treasuryName: treasury.name,
    type: amount > 0 ? 'settlement' : 'shift_withdrawal',
    amount,
    note: note || '',
    refType: 'shift',
    createdBy: 'system',
    createdAt: new Date()
  })
}

module.exports = { getActiveShift, hasAnyActiveShift, startShift, endShift, listShifts, getShiftSales }
