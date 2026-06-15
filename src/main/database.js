const Realm = require('realm')
const path = require('path')
const os = require('os')
const { SCHEMAS, SCHEMA_VERSION } = require('./schemas')

let realm = null

function getRealmPath() {
  return path.join(os.homedir(), 'AppData', 'Roaming', 'smart-x-pos', 'smart-x.realm')
}

async function openRealm() {
  if (realm && !realm.isClosed) return realm
  realm = await Realm.open({
    path: getRealmPath(),
    schema: SCHEMAS,
      schemaVersion: SCHEMA_VERSION,
      migration: (oldRealm, newRealm) => {
        const oldVersion = oldRealm.schemaVersion
        // Realm handles additive changes (new fields with defaults) automatically.
        // Add manual migration cases here for breaking changes:
        // if (oldVersion < 25) { /* rename field X to Y */ }
        // if (oldVersion < 26) { /* change type of field Z */ }
        if (oldVersion < 24) {
          // v24: Added Shift.expensesTotal/withdrawalsTotal, Expense.shiftId, Return.paymentMethod
        }
      }
  })
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
