const Realm = require('realm')
const crypto = require('node:crypto')

function listProducts(realm, query) {
  let products
  if (query) {
    products = realm.objects('Product')
      .filtered('active == true AND (name CONTAINS[c] $0 OR sku CONTAINS[c] $0 OR barcode CONTAINS[c] $0 OR category CONTAINS[c] $0)', query)
  } else {
    products = realm.objects('Product').filtered('active == true')
  }
  return Array.from(products).map(p => ({
    _id: p._id, sku: p.sku, barcode: p.barcode, name: p.name,
    category: p.category, unit: p.unit, cost: p.cost,
    priceRetail: p.priceRetail, priceHalfWholesale: p.priceHalfWholesale, priceWholesale: p.priceWholesale,
    stock: p.stock, reorderPoint: p.reorderPoint,
    active: p.active, image: p.image || '', updatedAt: p.updatedAt?.toISOString()
  }))
}

function saveProduct(realm, data) {
  let product
  realm.write(() => {
    product = realm.create('Product', {
      _id: data._id || crypto.randomUUID(),
      sku: data.sku || 'PRD-' + Date.now(),
      barcode: data.barcode || '',
      name: data.name,
      category: data.category || '',
      unit: data.unit || '',
      cost: Number(data.cost) || 0,
      priceRetail: Number(data.priceRetail) || 0,
      priceHalfWholesale: Number(data.priceHalfWholesale) || Number(data.priceRetail) || 0,
      priceWholesale: Number(data.priceWholesale) || Number(data.priceRetail) || 0,
      stock: Number(data.stock) || 0,
      reorderPoint: Number(data.reorderPoint) || 0,
      active: data.active !== false,
      image: data.image || '',
      updatedAt: new Date()
    }, Realm.UpdateMode.Modified)
  })
  return {
    _id: product._id, sku: product.sku, barcode: product.barcode, name: product.name,
    category: product.category, unit: product.unit, cost: product.cost,
    priceRetail: product.priceRetail, priceHalfWholesale: product.priceHalfWholesale, priceWholesale: product.priceWholesale,
    stock: product.stock, reorderPoint: product.reorderPoint,
    active: product.active, image: product.image || '', updatedAt: product.updatedAt?.toISOString()
  }
}

function removeProduct(realm, id) {
  realm.write(() => {
    const product = realm.objectForPrimaryKey('Product', id)
    if (product) realm.delete(product)
  })
  return true
}

module.exports = { listProducts, saveProduct, removeProduct }
