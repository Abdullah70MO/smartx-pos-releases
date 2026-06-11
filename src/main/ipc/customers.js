const Realm = require('realm')
const crypto = require('node:crypto')

function listCustomers(realm) {
  const customers = realm.objects('CreditCustomer').sorted('updatedAt', true)
  return Array.from(customers).map(c => ({
    _id: c._id, name: c.name, phone: c.phone,
    totalDebt: c.totalDebt, totalPaid: c.totalPaid,
    notes: c.notes, createdAt: c.createdAt?.toISOString(),
    updatedAt: c.updatedAt?.toISOString()
  }))
}

function saveCustomer(realm, data) {
  let customer
  realm.write(() => {
    const isNew = !data._id || !realm.objectForPrimaryKey('CreditCustomer', data._id)
    customer = realm.create('CreditCustomer', {
      _id: data._id || crypto.randomUUID(),
      name: data.name,
      phone: data.phone || '',
      totalDebt: isNew ? Number(data.previousDebt || 0) : (realm.objectForPrimaryKey('CreditCustomer', data._id)?.totalDebt || 0),
      totalPaid: isNew ? 0 : (realm.objectForPrimaryKey('CreditCustomer', data._id)?.totalPaid || 0),
      notes: data.notes || '',
      createdAt: data._id && realm.objectForPrimaryKey('CreditCustomer', data._id)
        ? realm.objectForPrimaryKey('CreditCustomer', data._id).createdAt
        : new Date(),
      updatedAt: new Date()
    }, Realm.UpdateMode.Modified)
  })
  return { _id: customer._id, name: customer.name, phone: customer.phone, totalDebt: customer.totalDebt, totalPaid: customer.totalPaid, notes: customer.notes, createdAt: customer.createdAt?.toISOString(), updatedAt: customer.updatedAt?.toISOString() }
}

function removeCustomer(realm, id) {
  realm.write(() => {
    const customer = realm.objectForPrimaryKey('CreditCustomer', id)
    if (customer) realm.delete(customer)
  })
  return true
}

module.exports = { listCustomers, saveCustomer, removeCustomer }
