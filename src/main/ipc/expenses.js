const Realm = require('realm')
const crypto = require('node:crypto')

function updateTreasury(realm, amount, note, session, refId) {
  if (amount === 0) return
  const mainTreasury = realm.objects('Treasury').filtered('type == "main"')[0]
  if (!mainTreasury) return
  mainTreasury.balance += amount
  mainTreasury.updatedAt = new Date()
  realm.create('TreasuryTransaction', {
    _id: crypto.randomUUID(),
    treasuryId: mainTreasury._id, treasuryName: mainTreasury.name,
    type: amount > 0 ? 'deposit' : 'withdraw',
    amount, note: note || '',
    refType: 'expense', refId: refId || '',
    createdBy: session.name || session.userId || 'system', createdAt: new Date()
  })
}

function listExpenses(realm) {
  const expenses = realm.objects('Expense').sorted('createdAt', true)
  return Array.from(expenses).map(e => ({
    _id: e._id, amount: e.amount, category: e.category,
    note: e.note, date: e.date?.toISOString(), createdAt: e.createdAt?.toISOString()
  }))
}

function saveExpense(realm, session, data) {
  let expense
  realm.write(() => {
    const isNew = !data._id || !realm.objectForPrimaryKey('Expense', data._id)
    const newAmount = Number(data.amount) || 0
    if (!isNew) {
      const old = realm.objectForPrimaryKey('Expense', data._id)
      const diff = newAmount - old.amount
      if (diff !== 0) {
        updateTreasury(realm, -diff, 'تعديل مصروف - ' + (data.category || data.note || ''), session, data._id)
      }
    }
    expense = realm.create('Expense', {
      _id: data._id || crypto.randomUUID(),
      amount: newAmount,
      category: data.category || '',
      note: data.note || '',
      date: data.date ? new Date(data.date) : new Date(),
      createdAt: isNew ? new Date() : realm.objectForPrimaryKey('Expense', data._id).createdAt
    }, Realm.UpdateMode.Modified)
    if (isNew) {
      updateTreasury(realm, -newAmount, 'مصروف - ' + (data.category || data.note || ''), session, expense._id)
    }
  })
  return { _id: expense._id, amount: expense.amount, category: expense.category, note: expense.note, date: expense.date?.toISOString(), createdAt: expense.createdAt?.toISOString() }
}

function removeExpense(realm, id) {
  realm.write(() => {
    const expense = realm.objectForPrimaryKey('Expense', id)
    if (expense) {
      updateTreasury(realm, expense.amount, 'إلغاء مصروف - ' + (expense.category || expense.note || ''), { userId: 'system' }, expense._id)
      realm.delete(expense)
    }
  })
  return true
}

module.exports = { listExpenses, saveExpense, removeExpense }
