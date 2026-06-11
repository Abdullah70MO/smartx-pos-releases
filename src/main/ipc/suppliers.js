const Realm = require('realm')
const crypto = require('node:crypto')

function listSuppliers(realm) {
  const suppliers = realm.objects('Supplier').sorted('updatedAt', true)
  return Array.from(suppliers).map(s => ({
    _id: s._id, name: s.name, phone: s.phone, email: s.email,
    commercialReg: s.commercialReg, taxReg: s.taxReg,
    address: s.address, notes: s.notes,
    totalPurchases: s.totalPurchases, totalPaid: s.totalPaid,
    createdAt: s.createdAt?.toISOString(), updatedAt: s.updatedAt?.toISOString()
  }))
}

function saveSupplier(realm, data) {
  let supplier
  realm.write(() => {
    const isNew = !data._id || !realm.objectForPrimaryKey('Supplier', data._id)
    supplier = realm.create('Supplier', {
      _id: data._id || crypto.randomUUID(),
      name: data.name,
      phone: data.phone || '',
      email: data.email || '',
      commercialReg: data.commercialReg || '',
      taxReg: data.taxReg || '',
      address: data.address || '',
      notes: data.notes || '',
      totalPurchases: isNew ? Number(data.previousBalance || 0) : (realm.objectForPrimaryKey('Supplier', data._id)?.totalPurchases || 0),
      totalPaid: isNew ? 0 : (realm.objectForPrimaryKey('Supplier', data._id)?.totalPaid || 0),
      createdAt: data._id && realm.objectForPrimaryKey('Supplier', data._id)
        ? realm.objectForPrimaryKey('Supplier', data._id).createdAt
        : new Date(),
      updatedAt: new Date()
    }, Realm.UpdateMode.Modified)
  })
  return { _id: supplier._id, name: supplier.name, phone: supplier.phone, email: supplier.email, commercialReg: supplier.commercialReg, taxReg: supplier.taxReg, address: supplier.address, notes: supplier.notes, totalPurchases: supplier.totalPurchases, totalPaid: supplier.totalPaid, createdAt: supplier.createdAt?.toISOString(), updatedAt: supplier.updatedAt?.toISOString() }
}

function removeSupplier(realm, id) {
  realm.write(() => {
    const supplier = realm.objectForPrimaryKey('Supplier', id)
    if (supplier) realm.delete(supplier)
  })
  return true
}

module.exports = { listSuppliers, saveSupplier, removeSupplier }
