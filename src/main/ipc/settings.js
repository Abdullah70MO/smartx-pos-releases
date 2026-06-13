const Realm = require('realm')

function getSettings(realm) {
  const settings = realm.objectForPrimaryKey('BusinessSettings', 'business')
  if (!settings) return null
  return {
    _id: settings._id,
    businessName: settings.businessName,
    logoDataUrl: settings.logoDataUrl,
    phone: settings.phone,
    email: settings.email,
    address: settings.address,
    commercialRegistration: settings.commercialRegistration,
    taxNumber: settings.taxNumber,
    currency: settings.currency,
    taxEnabled: settings.taxEnabled,
    calendarType: settings.calendarType,
    timeFormat: settings.timeFormat,
    theme: settings.theme,
    fontFamily: settings.fontFamily,
    taxRate: settings.taxRate,
    receiptFooter: settings.receiptFooter,
    printAfterPayment: settings.printAfterPayment,
    printDefaultSize: settings.printDefaultSize,
    printColorMode: settings.printColorMode,
    autoBackup: settings.autoBackup,
    autoBackupInterval: settings.autoBackupInterval,
    autoBackupLastDate: settings.autoBackupLastDate,
    autoBackupPath: settings.autoBackupPath,
    seeded: settings.seeded
  }
}

function saveSettings(realm, data) {
  realm.write(() => {
    realm.create('BusinessSettings', {
      _id: 'business',
      businessName: data.businessName || '',
      logoDataUrl: data.logoDataUrl || '',
      phone: data.phone || '',
      email: data.email || '',
      address: data.address || '',
      commercialRegistration: data.commercialRegistration || '',
      taxNumber: data.taxNumber || '',
      currency: data.currency || 'EGP',
      taxEnabled: data.taxEnabled !== false,
      calendarType: data.calendarType || 'gregorian',
      timeFormat: data.timeFormat || '24',
      theme: data.theme || 'dark',
      fontFamily: data.fontFamily || 'dark',
      taxRate: data.taxRate != null ? Number(data.taxRate) : 14,
      receiptFooter: data.receiptFooter || '',
      printAfterPayment: data.printAfterPayment !== false,
      printDefaultSize: data.printDefaultSize || 'receipt',
      printColorMode: data.printColorMode || 'color',
      autoBackup: data.autoBackup || false,
      autoBackupInterval: data.autoBackupInterval || 'weekly',
      autoBackupLastDate: data.autoBackupLastDate ? new Date(data.autoBackupLastDate) : null,
      autoBackupPath: data.autoBackupPath || '',
      seeded: true
    }, Realm.UpdateMode.Modified)
  })
  return getSettings(realm)
}

module.exports = { getSettings, saveSettings }
