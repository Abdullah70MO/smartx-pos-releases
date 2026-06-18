const Realm = require('realm')
const crypto = require('node:crypto')

function updateTreasury(realm, amount, note, session, refId, paymentMethod) {
  if (amount === 0) return
  const treasuryType = paymentMethod === 'card' ? 'bank' : 'main'
  const treasury = realm.objects('Treasury').filtered('type == $0', treasuryType)[0] || realm.objects('Treasury').filtered('type == "main"')[0]
  if (!treasury) return
  if (amount < 0) {
    const activeShift = realm.objects('Shift').filtered('cashierId == $0 AND isActive == true', session?.userId || '')[0]
    if (activeShift) {
      const available = activeShift.startingBalance + activeShift.totalSales - activeShift.expensesTotal - activeShift.withdrawalsTotal
      if (available + amount < 0) throw new Error('الرصيد غير كافٍ في الوردية')
    } else if (treasury.balance + amount < 0) {
      throw new Error('الرصيد غير كافٍ في الخزينة')
    }
  }
  treasury.balance += amount
  treasury.updatedAt = new Date()
  realm.create('TreasuryTransaction', {
    _id: crypto.randomUUID(),
    treasuryId: treasury._id, treasuryName: treasury.name,
    type: amount > 0 ? 'deposit' : 'withdraw',
    amount, note: note || '',
    refType: 'expense', refId: refId || '',
    paymentMethod: paymentMethod || 'cash',
    createdBy: session.name || session.userId || 'system', createdAt: new Date()
  })
}

function listExpenses(realm) {
  const expenses = realm.objects('Expense').sorted('createdAt', true)
  return Array.from(expenses).map(e => ({
    _id: e._id, amount: e.amount, category: e.category,
    note: e.note, date: e.date?.toISOString(), createdAt: e.createdAt?.toISOString(),
    paymentMethod: e.paymentMethod
  }))
}

function updateShiftExpenses(realm, shiftId, amount) {
  if (!shiftId) return
  const shift = realm.objectForPrimaryKey('Shift', shiftId)
  if (shift) shift.expensesTotal += amount
}

function checkShiftBalance(shift, amount) {
  const available = shift.startingBalance + shift.totalSales - shift.expensesTotal - shift.withdrawalsTotal
  if (available < amount) throw new Error('الرصيد غير كافٍ في الوردية')
}

function saveExpense(realm, session, data) {
  let expense
  const pm = data.paymentMethod || 'cash'
  realm.write(() => {
    const isNew = !data._id || !realm.objectForPrimaryKey('Expense', data._id)
    const newAmount = Number(data.amount) || 0
    if (!isNew) {
      const old = realm.objectForPrimaryKey('Expense', data._id)
      const diff = newAmount - old.amount
      if (diff !== 0) {
        if (!old.shiftId) updateTreasury(realm, -diff, 'تعديل مصروف - ' + (data.category || data.note || ''), session, data._id, pm)
        if (old.shiftId) {
          if (diff > 0) {
            const shift = realm.objectForPrimaryKey('Shift', old.shiftId)
            if (data.paymentMethod === 'card') {
              const cardAvailable = (shift.cardTotal || 0) - (shift.cardWithdrawalsTotal || 0)
              if (cardAvailable < diff) throw new Error('الرصيد غير كافٍ في بطاقة الوردية')
            } else {
              checkShiftBalance(shift, diff)
            }
          }
          updateShiftExpenses(realm, old.shiftId, diff)
        }
      }
    } else if (data.shiftId) {
      const shift = realm.objectForPrimaryKey('Shift', data.shiftId)
      if (data.paymentMethod === 'card') {
        const cardAvailable = (shift.cardTotal || 0) - (shift.cardWithdrawalsTotal || 0)
        if (cardAvailable < newAmount) throw new Error('الرصيد غير كافٍ في بطاقة الوردية')
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
      createdAt: isNew ? new Date() : realm.objectForPrimaryKey('Expense', data._id).createdAt
    }, Realm.UpdateMode.Modified)
    if (isNew) {
      if (!data.shiftId) updateTreasury(realm, -newAmount, 'مصروف - ' + (data.category || data.note || ''), session, expense._id, pm)
    }
  })
  return { _id: expense._id, amount: expense.amount, category: expense.category, note: expense.note, date: expense.date?.toISOString(), createdAt: expense.createdAt?.toISOString(), paymentMethod: expense.paymentMethod, shiftId: expense.shiftId }
}

function removeExpense(realm, id) {
  realm.write(() => {
    const expense = realm.objectForPrimaryKey('Expense', id)
    if (expense) {
      if (expense.shiftId) updateShiftExpenses(realm, expense.shiftId, -expense.amount)
      if (!expense.shiftId) updateTreasury(realm, expense.amount, 'إلغاء مصروف - ' + (expense.category || expense.note || ''), { userId: 'system' }, expense._id, expense.paymentMethod || 'cash')
      realm.delete(expense)
    }
  })
  return true
}

module.exports = { listExpenses, saveExpense, removeExpense }