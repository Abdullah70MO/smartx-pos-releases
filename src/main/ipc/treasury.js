const Realm = require('realm')
const crypto = require('node:crypto')

function listTreasuries(realm) {
  const typeOrder = { main: 0, bank: 1 }
  return Array.from(realm.objects('Treasury')).sort((a, b) => {
    const ao = typeOrder[a.type] ?? 2
    const bo = typeOrder[b.type] ?? 2
    return ao - bo
  }).map(t => ({
    _id: t._id, name: t.name, type: t.type,
    balance: t.balance, createdAt: t.createdAt?.toISOString()
  }))
}

function saveTreasury(realm, data, session) {
  let t
  realm.write(() => {
    const existing = data._id ? realm.objectForPrimaryKey('Treasury', data._id) : null
    if (!existing && (data.type === 'main' || data.type === 'bank')) {
      const dup = realm.objects('Treasury').filtered('type == $0', data.type)[0]
      if (dup) throw new Error(`يوجد بالفعل خزينة من نوع "${data.type === 'main' ? 'الرئيسية' : 'البنك'}"`)
    }
    t = realm.create('Treasury', {
      _id: data._id || crypto.randomUUID(),
      name: data.name,
      type: data.type || 'main',
      balance: data.initialBalance ? Number(data.initialBalance) : (existing ? existing.balance : 0),
      createdAt: existing ? existing.createdAt : new Date(),
      updatedAt: new Date()
    }, Realm.UpdateMode.Modified)
  })
  return { _id: t._id, name: t.name, type: t.type, balance: t.balance, createdAt: t.createdAt?.toISOString() }
}

function removeTreasury(realm, id) {
  realm.write(() => {
    const t = realm.objectForPrimaryKey('Treasury', id)
    if (!t) return
    if (t.type === 'main' || t.type === 'bank') throw new Error('لا يمكن حذف الخزينة ' + (t.type === 'main' ? 'الرئيسية' : 'البنك'))
    const activeShift = realm.objects('Shift').filtered('isActive == true').length
    if (activeShift > 0) throw new Error('لا يمكن حذف خزينة أثناء وجود وردية نشطة')
    realm.delete(realm.objects('TreasuryTransaction').filtered('treasuryId == $0', id))
    realm.delete(t)
  })
  return true
}

function addToTreasury(realm, data, session) {
  const amount = Number(data.amount)
  if (isNaN(amount) || amount <= 0) throw new Error('المبلغ يجب أن يكون رقماً صحيحاً أكبر من صفر')
  realm.write(() => {
    const t = realm.objectForPrimaryKey('Treasury', data.treasuryId)
    if (!t) throw new Error('الخزينة غير موجودة')
    t.balance += amount
    t.updatedAt = new Date()
    realm.create('TreasuryTransaction', {
      _id: crypto.randomUUID(),
      treasuryId: data.treasuryId,
      treasuryName: t.name,
      type: 'deposit',
      amount,
      note: data.note || '',
      personName: data.personName || '',
      relatedTreasuryId: data.relatedTreasuryId || '',
      relatedTreasuryName: data.relatedTreasuryName || '',
      refType: data.refType || '',
      refId: data.refId || '',
      paymentMethod: data.paymentMethod || 'cash',
      createdBy: session.name,
      createdAt: new Date()
    })
  })
  return true
}

function withdrawFromTreasury(realm, data, session) {
  const amount = Number(data.amount)
  if (isNaN(amount) || amount <= 0) throw new Error('المبلغ يجب أن يكون رقماً صحيحاً أكبر من صفر')
  realm.write(() => {
    const t = realm.objectForPrimaryKey('Treasury', data.treasuryId)
    if (!t) throw new Error('الخزينة غير موجودة')
    const activeShift = realm.objects('Shift').filtered('cashierId == $0 AND isActive == true', session.userId)[0]
    if (activeShift && data.paymentMethod === 'card') {
      const cardAvailable = (activeShift.cardTotal || 0) - (activeShift.cardWithdrawalsTotal || 0)
      if (cardAvailable < amount) throw new Error('الرصيد غير كافٍ في بطاقة الوردية')
    } else if (activeShift) {
      const available = activeShift.startingBalance + (activeShift.cashTotal || 0) + (activeShift.creditPaidTotal || 0) - activeShift.expensesTotal - activeShift.withdrawalsTotal
      if (available < amount) throw new Error('الرصيد غير كافٍ في الوردية')
    } else if (t.balance < amount) {
      throw new Error('الرصيد غير كافٍ في الخزينة')
    }
    if (!activeShift) {
      t.balance -= amount
      t.updatedAt = new Date()
    }
    const type = data.isPersonal ? 'personal_withdraw' : 'operational_withdraw'
    realm.create('TreasuryTransaction', {
      _id: crypto.randomUUID(),
      treasuryId: data.treasuryId,
      treasuryName: t.name,
      type,
      amount: -amount,
      note: data.note || '',
      personName: data.personName || '',
      relatedTreasuryId: data.relatedTreasuryId || '',
      relatedTreasuryName: data.relatedTreasuryName || '',
      refType: data.refType || '',
      refId: data.refId || '',
      paymentMethod: data.paymentMethod || 'cash',
      createdBy: session.name,
      createdAt: new Date()
    })
    if (activeShift) {
      if (data.paymentMethod === 'card') {
        activeShift.cardWithdrawalsTotal += amount
      } else {
        activeShift.withdrawalsTotal += amount
      }
    }
    if (!data.isPersonal) {
      realm.create('Expense', {
        _id: crypto.randomUUID(),
        amount, category: data.withdrawCategory || 'سحب تشغيلي',
        note: 'سحب من الخزينة - ' + t.name + (data.note ? ' - ' + data.note : ''),
        date: new Date(),
        shiftId: activeShift?._id || '',
        paymentMethod: data.paymentMethod || 'cash',
        createdAt: new Date()
      })
    }
  })
  return true
}

function transferBetweenTreasuries(realm, data, session) {
  const amount = Number(data.amount)
  if (isNaN(amount) || amount <= 0) throw new Error('المبلغ يجب أن يكون رقماً صحيحاً أكبر من صفر')
  if (data.fromTreasuryId === data.toTreasuryId) throw new Error('لا يمكن التحويل إلى نفس الخزينة')
  realm.write(() => {
    const from = realm.objectForPrimaryKey('Treasury', data.fromTreasuryId)
    const to = realm.objectForPrimaryKey('Treasury', data.toTreasuryId)
    if (!from) throw new Error('خزينة المصدر غير موجودة')
    if (!to) throw new Error('خزينة الهدف غير موجودة')
    if (from.balance < amount) throw new Error('الرصيد غير كافٍ في الخزينة المصدر')
    from.balance -= amount
    from.updatedAt = new Date()
    to.balance += amount
    to.updatedAt = new Date()
    realm.create('TreasuryTransaction', {
      _id: crypto.randomUUID(),
      treasuryId: data.fromTreasuryId,
      treasuryName: from.name,
      type: 'transfer_out',
      amount: -amount,
      note: 'تحويل إلى ' + to.name + (data.note ? ' - ' + data.note : ''),
      relatedTreasuryId: data.toTreasuryId,
      relatedTreasuryName: to.name,
      createdBy: session.name,
      createdAt: new Date()
    })
    realm.create('TreasuryTransaction', {
      _id: crypto.randomUUID(),
      treasuryId: data.toTreasuryId,
      treasuryName: to.name,
      type: 'transfer_in',
      amount,
      note: 'تحويل من ' + from.name + (data.note ? ' - ' + data.note : ''),
      relatedTreasuryId: data.fromTreasuryId,
      relatedTreasuryName: from.name,
      createdBy: session.name,
      createdAt: new Date()
    })
  })
  return true
}

function listTransactions(realm, { treasuryId, limit }) {
  let txns = treasuryId
    ? realm.objects('TreasuryTransaction').filtered('treasuryId == $0', treasuryId)
    : realm.objects('TreasuryTransaction')
  txns = txns.sorted('createdAt', true)
  if (limit) txns = txns.slice(0, limit)
  return Array.from(txns).map(t => ({
    _id: t._id, treasuryId: t.treasuryId, treasuryName: t.treasuryName,
    type: t.type, amount: t.amount, note: t.note,
    personName: t.personName,
    relatedTreasuryId: t.relatedTreasuryId, relatedTreasuryName: t.relatedTreasuryName,
    refType: t.refType, refId: t.refId,
    paymentMethod: t.paymentMethod, createdBy: t.createdBy,
    createdAt: t.createdAt?.toISOString()
  }))
}

module.exports = { listTreasuries, saveTreasury, removeTreasury, addToTreasury, withdrawFromTreasury, transferBetweenTreasuries, listTransactions }