const Realm = require('realm')
const path = require('path')
const os = require('os')
const fs = require('fs')
const { SCHEMAS, SCHEMA_VERSION } = require('./schemas')

let realm = null

function getRealmPath() {
  return path.join(os.homedir(), 'AppData', 'Roaming', 'smart-x-pos', 'smart-x.realm')
}

async function openRealm() {
  if (realm && !realm.isClosed) return realm
  try {
    realm = await Realm.open({
      path: getRealmPath(),
      schema: SCHEMAS,
        schemaVersion: SCHEMA_VERSION,
        migration: (oldRealm, newRealm) => {
          const oldVersion = oldRealm.schemaVersion
          if (oldVersion < 24) {
            // v24: Added Shift.expensesTotal/withdrawalsTotal, Expense.shiftId, Return.paymentMethod
          }
          if (oldVersion < 25) {
            // v25: Added BusinessSettings.showCommercialReg/showTaxReg, PurchaseReturn.refundAmount
          }
          if (oldVersion < 26) {
            // v26: Invoice show/hide fields, defaults changed to true
            const oldSettings = oldRealm.objectForPrimaryKey('BusinessSettings', 'business')
            const newSettings = newRealm.objectForPrimaryKey('BusinessSettings', 'business')
            if (oldSettings && newSettings) {
              newSettings.showCommercialReg = true
              newSettings.showTaxReg = true
            }
          }
          if (oldVersion < 27) {
            // v27: Added Shift.cashTotal/cardTotal
          }
          if (oldVersion < 28) {
            // v28: CreditCustomer.totalDebt = old totalDebt + sum(paid from sales)
            const customers = oldRealm.objects('CreditCustomer')
            customers.forEach(c => {
              const sales = oldRealm.objects('Sale').filtered('customerName == $0 AND paymentMethod == "credit"', c.name)
              let totalPaidFromSales = 0
              for (const s of sales) {
                totalPaidFromSales += (s.paid || 0)
              }
              const newC = newRealm.objectForPrimaryKey('CreditCustomer', c._id)
              if (newC) {
                newC.totalDebt = (c.totalDebt || 0) + totalPaidFromSales
              }
            })
          }
          if (oldVersion < 29) {
            // v29: Added Shift.creditPaidTotal
          }
          if (oldVersion < 30) {
            // v30: Added Return.tax
          }
          if (oldVersion < 31) {
            // v31: Added BusinessSettings.printDirectly
          }
          if (oldVersion < 32) {
            // v32: Added Sale.previousCredit
          }
          if (oldVersion < 33) {
            // v33: Added Purchase.previousCredit
          }
        }
    })
  } catch (e) {
    if (e.message && e.message.includes('header has invalid mnemonic')) {
      const p = getRealmPath()
      try { if (fs.existsSync(p)) fs.unlinkSync(p) } catch {}
      realm = await Realm.open({ path: p, schema: SCHEMAS, schemaVersion: SCHEMA_VERSION })
    } else {
      throw e
    }
  }
  return realm
}

function closeRealm() {
  if (realm && !realm.isClosed) {
    realm.close()
    realm = null
  }
}

function getRealm() {
  return realm
}

module.exports = { openRealm, closeRealm, getRealm, getRealmPath }
