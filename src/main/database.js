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
