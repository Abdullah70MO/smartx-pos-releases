const Realm = require('realm')
const crypto = require('node:crypto')
const { paginate } = require('../database')

function listCustomers(realm, query, page, pageSize) {
  let results = realm.objects('CreditCustomer').sorted('updatedAt', true)
  if (query) {
    results = results.filtered('name CONTAINS[c] $0 OR phone CONTAINS[c] $0', query)
  }
  const mapCustomer = c => ({
    _id: c._id, name: c.name, phone: c.phone,
    commercialReg: c.commercialReg, taxReg: c.taxReg, address: c.address,
    totalDebt: c.totalDebt, totalPaid: c.totalPaid,
    notes: c.notes, createdAt: c.createdAt?.toISOString(),
    updatedAt: c.updatedAt?.toISOString()
  })
  if (page != null) {
    const result = paginate(results, page, pageSize || 20)
    return { ...result, data: result.data.map(mapCustomer) }
  }
  return Array.from(results).map(mapCustomer)
}

function saveCustomer(realm, data) {
  let customer
  realm.write(() => {
    const isNew = !data._id || !realm.objectForPrimaryKey('CreditCustomer', data._id)
    customer = realm.create('CreditCustomer', {
      _id: data._id || crypto.randomUUID(),
      name: data.name,
      phone: data.phone || '',
      commercialReg: data.commercialReg || '',
      taxReg: data.taxReg || '',
      address: data.address || '',
      totalDebt: isNew ? Number(data.previousDebt || 0) : (realm.objectForPrimaryKey('CreditCustomer', data._id)?.totalDebt || 0),
      totalPaid: isNew ? 0 : (realm.objectForPrimaryKey('CreditCustomer', data._id)?.totalPaid || 0),
      notes: data.notes || '',
      createdAt: data._id && realm.objectForPrimaryKey('CreditCustomer', data._id)
        ? realm.objectForPrimaryKey('CreditCustomer', data._id).createdAt
        : new Date(),
      updatedAt: new Date()
    }, Realm.UpdateMode.Modified)
  })
  return { _id: customer._id, name: customer.name, phone: customer.phone, commercialReg: customer.commercialReg, taxReg: customer.taxReg, address: customer.address, totalDebt: customer.totalDebt, totalPaid: customer.totalPaid, notes: customer.notes, createdAt: customer.createdAt?.toISOString(), updatedAt: customer.updatedAt?.toISOString() }
}

function removeCustomer(realm, id) {
  realm.write(() => {
    const customer = realm.objectForPrimaryKey('CreditCustomer', id)
    if (customer) realm.delete(customer)
  })
  return true
}

module.exports = { listCustomers, saveCustomer, removeCustomer }