function updateWeightedAverage(product, addQty, addCost, oldStock) {
  oldStock = oldStock != null ? oldStock : (product.stock || 0)
  const oldCost = product.cost || 0
  const newStock = oldStock + addQty
  if (newStock <= 0 || addQty <= 0) {
    product.cost = 0
  } else {
    product.cost = ((oldStock * oldCost) + (addQty * addCost)) / newStock
  }
}

function removeFromWeightedAverage(product, removeQty, removeCost, oldStock) {
  oldStock = oldStock != null ? oldStock : (product.stock || 0)
  const oldCost = product.cost || 0
  const qty = Math.min(removeQty, oldStock)
  if (qty <= 0) return
  const newStock = oldStock - qty
  if (newStock <= 0) {
    product.cost = 0
  } else {
    product.cost = Math.max(0, ((oldStock * oldCost) - (qty * removeCost)) / newStock)
  }
}

module.exports = { updateWeightedAverage, removeFromWeightedAverage }
