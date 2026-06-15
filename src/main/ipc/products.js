const Realm = require('realm')
const crypto = require('node:crypto')
const { addBatch, deductFromFifo, syncProductStock } = require('./inventoryHelpers')

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
    const existing = data._id ? realm.objectForPrimaryKey('Product', data._id) : null
    const stock = data.stock != null ? Number(data.stock) : (existing ? existing.stock : 0)

    if (existing && existing.stock !== stock) {
      const diff = stock - existing.stock
      if (diff > 0) {
        addBatch(realm, existing._id, diff, existing.cost || Number(data.cost) || 0)
      } else if (diff < 0) {
        deductFromFifo(realm, existing._id, -diff)
      }
      syncProductStock(realm, existing._id)
    }

    product = realm.create('Product', {
      _id: data._id || crypto.randomUUID(),
      sku: data.sku || 'PRD-' + Date.now(),
      barcode: data.barcode || '',
      name: data.name,
      category: data.category || '',
      unit: data.unit || '',
      cost: stock > 0 && existing ? existing.cost : (Number(data.cost) || 0),
      priceRetail: Number(data.priceRetail) || 0,
      priceHalfWholesale: Number(data.priceHalfWholesale) || Number(data.priceRetail) || 0,
      priceWholesale: Number(data.priceWholesale) || Number(data.priceRetail) || 0,
      stock,
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
    if (product) {
      const batches = realm.objects('StockBatch').filtered('productId == $0', id)
      realm.delete(batches)
      realm.delete(product)
    }
  })
  return true
}

module.exports = { listProducts, saveProduct, removeProduct }
