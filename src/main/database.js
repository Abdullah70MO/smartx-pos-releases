const Realm = require('realm')
const path = require('path')
const os = require('os')
const { SCHEMAS, SCHEMA_VERSION } = require('./schemas')

let realm = null
let realmReady = Promise.resolve()
let realmReadyResolve = null
let realmOpening = null
let backingUp = false

function getRealmPath() {
  return path.join(os.homedir(), 'AppData', 'Roaming', 'smart-x-pos', 'smart-x.realm')
}

function migration(oldRealm, newRealm) {
}

async function openRealm() {
  if (backingUp) await realmReady
  if (realmOpening) return realmOpening
  if (realm && !realm.isClosed) return realm
  realmOpening = Realm.open({
    path: getRealmPath(),
    schema: SCHEMAS,
    schemaVersion: SCHEMA_VERSION,
    onMigration: migration
  })
  try {
    realm = await realmOpening
    const r = realmReadyResolve
    realmReadyResolve = null
    if (r) r()
    return realm
  } finally {
    realmOpening = null
  }
}

function closeRealm() {
  if (realm && !realm.isClosed) {
    realm.close()
    realm = null
  }
}

async function getRealm() {
  await realmReady
  return realm
}

async function withRealm(fn) {
  const r = await getRealm()
  if (!r) throw new Error('قاعدة البيانات غير متاحة حالياً')
  return fn(r)
}

function lockForBackup() {
  backingUp = true
  realmReady = new Promise(r => { realmReadyResolve = r })
}

function unlockAfterBackup() {
  backingUp = false
  const r = realmReadyResolve
  realmReadyResolve = null
  if (r) r()
}

function paginate(results, page = 0, pageSize = 50) {
  const total = results.length
  const totalPages = Math.ceil(total / pageSize) || 1
  if (page < 0) page = 0
  if (page >= totalPages) page = totalPages - 1
  const data = results.slice(page * pageSize, (page + 1) * pageSize)
  return { data: Array.from(data), total, page, pageSize, totalPages }
}

module.exports = { openRealm, closeRealm, getRealm, getRealmPath, withRealm, lockForBackup, unlockAfterBackup, paginate }
