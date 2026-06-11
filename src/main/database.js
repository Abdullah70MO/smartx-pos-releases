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
    schemaVersion: SCHEMA_VERSION
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
