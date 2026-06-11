function getCurrencyCode() {
  return localStorage.getItem('currency') || 'SAR'
}

export function formatMoney(value) {
  const amount = Number(value)
  if (!Number.isFinite(amount)) return '0.00'

  try {
    return new Intl.NumberFormat('ar-SA-u-nu-latn', {
      style: 'currency',
      currency: getCurrencyCode(),
      minimumFractionDigits: 2,
      maximumFractionDigits: 2
    }).format(amount)
  } catch {
    return `${amount.toFixed(2)} ${getCurrencyCode()}`
  }
}
