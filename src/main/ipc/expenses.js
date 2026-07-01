const Realm = require('realm')
const crypto = require('node:crypto')
const { paginate } = require('../database')

function updateTreasury(realm, amount, note, session, refId, paymentMethod) {
  if (amount === 0) return
  const treasuryType = paymentMethod === 'card' ? 'bank' : 'main'
  const treasury = realm.objects('Treasury').filtered('type == $0', treasuryType)[0] || realm.objects('Treasury').filtered('type == "main"')[0]
  if (!treasury) return
  if (amount < 0) {
    const activeShift = realm.objects('Shift').filtered('cashierId == $0 AND isActive == true', session?.userId || '')[0]
    if (activeShift) {
      const available = activeShift.startingBalance + (activeShift.cashTotal || 0) + (activeShift.creditPaidTotal || 0) - activeShift.expensesTotal - activeShift.withdrawalsTotal
      if (available + amount < 0) throw new Error('Ø§Ù„Ø±ØµÙŠØ¯ ØºÙŠØ± ÙƒØ§ÙÙ ÙÙŠ Ø§Ù„ÙˆØ±Ø¯ÙŠØ©')
    } else if (treasury.balance + amount < 0) {
      throw new Error('Ø§Ù„Ø±ØµÙŠØ¯ ØºÙŠØ± ÙƒØ§ÙÙ ÙÙŠ Ø§Ù„Ø®Ø²ÙŠÙ†Ø©')
    }
  }
  treasury.balance += amount
  treasury.updatedAt = new Date()
  realm.create('TreasuryTransaction', {
    _id: crypto.randomUUID(),
    treasuryId: treasury._id, treasuryName: treasury.name,
    type: 'expense',
    amount, note: note || '',
    refType: 'expense', refId: refId || '',
    paymentMethod: paymentMethod || 'cash',
    createdBy: session.name || session.userId || 'system', createdAt: new Date()
  })
}

function listExpenses(realm, filter, page, pageSize) {
  let results = realm.objects('Expense').sorted('createdAt', true)
  if (filter?.query) {
    results = results.filtered('category CONTAINS[c] $0 OR note CONTAINS[c] $0', filter.query)
  }
  if (filter?.from) {
    const from = new Date(filter.from + 'T00:00:00')
    if (!isNaN(from)) results = results.filtered('createdAt >= $0', from)
  }
  if (filter?.to) {
    const to = new Date(filter.to + 'T23:59:59')
    if (!isNaN(to)) results = results.filtered('createdAt <= $0', to)
  }
  const mapExpense = e => ({
    _id: e._id, amount: e.amount, category: e.category,
    note: e.note, date: e.date?.toISOString(), createdAt: e.createdAt?.toISOString(),
    paymentMethod: e.paymentMethod, isInventoryLoss: e.isInventoryLoss
  })
  if (page != null) {
    const result = paginate(results, page, pageSize || 20)
    return { ...result, data: result.data.map(mapExpense) }
  }
  return Array.from(results).map(mapExpense)
}

function updateShiftExpenses(realm, shiftId, amount) {
  if (!shiftId) return
  const shift = realm.objectForPrimaryKey('Shift', shiftId)
  if (shift) shift.expensesTotal += amount
}

function checkShiftBalance(shift, amount) {
  const available = shift.startingBalance + (shift.cashTotal || 0) + (shift.creditPaidTotal || 0) - shift.expensesTotal - shift.withdrawalsTotal
  if (available < amount) throw new Error('Ø§Ù„Ø±ØµÙŠØ¯ ØºÙŠØ± ÙƒØ§ÙÙ ÙÙŠ Ø§Ù„ÙˆØ±Ø¯ÙŠØ©')
}

function saveExpense(realm, session, data) {
  let expense
  const pm = data.paymentMethod || 'cash'
  const isInventoryLoss = data.isInventoryLoss || false
  realm.write(() => {
    const isNew = !data._id || !realm.objectForPrimaryKey('Expense', data._id)
    const newAmount = Number(data.amount) || 0
    if (!isNew) {
      const old = realm.objectForPrimaryKey('Expense', data._id)
      const diff = newAmount - old.amount
      if (diff !== 0) {
        if (!old.shiftId && !old.isInventoryLoss) updateTreasury(realm, -diff, 'ØªØ¹Ø¯ÙŠÙ„ Ù…ØµØ±ÙˆÙ - ' + (data.category || data.note || ''), session, data._id, pm)
        if (old.shiftId) {
          if (diff > 0) {
            const shift = realm.objectForPrimaryKey('Shift', old.shiftId)
            if (data.paymentMethod === 'card') {
              const cardAvailable = (shift.cardTotal || 0) - (shift.cardWithdrawalsTotal || 0)
              if (cardAvailable < diff) throw new Error('Ø§Ù„Ø±ØµÙŠØ¯ ØºÙŠØ± ÙƒØ§ÙÙ ÙÙŠ Ø¨Ø·Ø§Ù‚Ø© Ø§Ù„ÙˆØ±Ø¯ÙŠØ©')
            } else {
              checkShiftBalance(shift, diff)
            }
          }
          updateShiftExpenses(realm, old.shiftId, diff)
        }
      }
      if (old.isInventoryLoss) data.isInventoryLoss = true
    } else if (data.shiftId) {
      const shift = realm.objectForPrimaryKey('Shift', data.shiftId)
      if (data.paymentMethod === 'card') {
        const cardAvailable = (shift.cardTotal || 0) - (shift.cardWithdrawalsTotal || 0)
        if (cardAvailable < newAmount) throw new Error('Ø§Ù„Ø±ØµÙŠØ¯ ØºÙŠØ± ÙƒØ§ÙÙ ÙÙŠ Ø¨Ø·Ø§Ù‚Ø© Ø§Ù„ÙˆØ±Ø¯ÙŠØ©')
      } else {
        checkShiftBalance(shift, newAmount)
      }
      updateShiftExpenses(realm, data.shiftId, newAmount)
    }
    expense = realm.create('Expense', {
      _id: data._id || crypto.randomUUID(),
      amount: newAmount,
      category: data.category || '',
      note: data.note || '',
      date: data.date ? new Date(data.date) : new Date(),
      paymentMethod: pm,
      shiftId: data.shiftId || '',
      isInventoryLoss,
      createdAt: isNew ? new Date() : realm.objectForPrimaryKey('Expense', data._id).createdAt
    }, Realm.UpdateMode.Modified)
    if (isNew) {
      if (!data.shiftId && !isInventoryLoss) updateTreasury(realm, -newAmount, 'Ù…ØµØ±ÙˆÙ - ' + (data.category || data.note || ''), session, expense._id, pm)
    }
  })
  return { _id: expense._id, amount: expense.amount, category: expense.category, note: expense.note, date: expense.date?.toISOString(), createdAt: expense.createdAt?.toISOString(), paymentMethod: expense.paymentMethod, shiftId: expense.shiftId, isInventoryLoss }
}

function removeExpense(realm, id) {
  realm.write(() => {
    const expense = realm.objectForPrimaryKey('Expense', id)
    if (expense) {
      if (expense.shiftId) updateShiftExpenses(realm, expense.shiftId, -expense.amount)
      if (!expense.shiftId && !expense.isInventoryLoss) updateTreasury(realm, expense.amount, 'Ø¥Ù„ØºØ§Ø¡ Ù…ØµØ±ÙˆÙ - ' + (expense.category || expense.note || ''), { userId: 'system' }, expense._id, expense.paymentMethod || 'cash')
      realm.delete(expense)
    }
  })
  return true
}

module.exports = { listExpenses, saveExpense, removeExpense }
