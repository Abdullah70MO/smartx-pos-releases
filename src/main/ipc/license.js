const crypto = require('node:crypto')
const fs = require('node:fs')
const path = require('node:path')
const os = require('node:os')
const { app } = require('electron')
const { LICENSE_API_URL } = require('../constants')

const TRIAL_DAYS = 14

function generateHwid() {
  const parts = [
    os.hostname(),
    os.platform(),
    os.arch(),
    os.cpus()[0]?.model || '',
    os.totalmem().toString(),
    os.userInfo().username
  ]
  return crypto.createHash('sha256').update(parts.join('|')).digest('hex')
}

function getLicenseFilePath() {
  return path.join(app.getPath('appData'), 'SmartX', 'license.dat')
}

function xorEncode(data, key) {
  const buf = Buffer.from(data, 'utf8')
  for (let i = 0; i < buf.length; i++) {
    buf[i] ^= key.charCodeAt(i % key.length)
  }
  return buf.toString('base64')
}

function xorDecode(encoded, key) {
  try {
    const buf = Buffer.from(encoded, 'base64')
    for (let i = 0; i < buf.length; i++) {
      buf[i] ^= key.charCodeAt(i % key.length)
    }
    return buf.toString('utf8')
  } catch { return null }
}

function readPersistentLicense() {
  const filePath = getLicenseFilePath()
  try {
    if (!fs.existsSync(filePath)) return null
    const raw = fs.readFileSync(filePath, 'utf8').trim()
    const json = xorDecode(raw, 'Sx@2024!')
    if (!json) return null
    const data = JSON.parse(json)
    if (!data.hwid || !data.checksum) return null
    const expected = crypto.createHash('md5').update(data.hwid + '|' + (data.trialStartedAt || '') + '|' + (data.maxDateSeen || '') + '|' + (data.activated || '')).digest('hex')
    if (data.checksum !== expected) return null
    return data
  } catch { return null }
}

function writePersistentLicense(data) {
  try {
    const filePath = getLicenseFilePath()
    const dir = path.dirname(filePath)
    if (!fs.existsSync(dir)) fs.mkdirSync(dir, { recursive: true })
    data.checksum = crypto.createHash('md5').update(data.hwid + '|' + (data.trialStartedAt || '') + '|' + (data.maxDateSeen || '') + '|' + (data.activated || '')).digest('hex')
    const raw = xorEncode(JSON.stringify(data), 'Sx@2024!')
    fs.writeFileSync(filePath, raw, 'utf8')
  } catch {}
}

function checkLicense(realm) {
  const license = realm.objectForPrimaryKey('License', 'license')
  const hwid = generateHwid()
  const persistent = readPersistentLicense()

  const now = new Date()

  if (!license && !persistent) {
    return { activated: false, trialUsed: false }
  }

  const result = {
    activated: license?.activated || persistent?.activated || false,
    activatedKey: license?.activatedKey || '',
    expiresAt: license?.expiresAt?.toISOString() || null,
    licenseType: license?.licenseType || persistent?.licenseType || '',
    trialStartedAt: license?.trialStartedAt?.toISOString() || persistent?.trialStartedAt || null,
    trialUsed: !!(license?.trialStartedAt || persistent?.trialStartedAt),
    remainingDays: null,
    remainingText: ''
  }

  let expired = false

  if (license?.activated && license?.expiresAt) {
    const expires = new Date(license.expiresAt)
    expired = expires < now
    if (!expired) {
      const diffMs = expires - now
      result.remainingDays = Math.ceil(diffMs / (1000 * 60 * 60 * 24))
    }
    if (license.licenseType === 'lifetime') {
      result.remainingText = 'مدى الحياة'
    } else if (result.remainingDays !== null && result.remainingDays > 30) {
      const months = Math.floor(result.remainingDays / 30)
      result.remainingText = `${months} شهر`
    } else if (result.remainingDays !== null) {
      result.remainingText = `${result.remainingDays} يوم`
    } else {
      result.remainingText = 'منتهي'
    }
    return result
  }

  if (persistent && persistent.activated && persistent.expiresAt) {
    const expires = new Date(persistent.expiresAt)
    expired = expires < now
    if (!expired) {
      const diffMs = expires - now
      result.remainingDays = Math.ceil(diffMs / (1000 * 60 * 60 * 24))
    }
    if (persistent.licenseType === 'lifetime') {
      result.remainingText = 'مدى الحياة'
    } else if (result.remainingDays !== null && result.remainingDays > 30) {
      const months = Math.floor(result.remainingDays / 30)
      result.remainingText = `${months} شهر`
    } else if (result.remainingDays !== null) {
      result.remainingText = `${result.remainingDays} يوم`
    } else {
      result.remainingText = 'منتهي'
    }
    result.expired = expired
    return result
  }

  const trialStart = license?.trialStartedAt || (persistent?.trialStartedAt ? new Date(persistent.trialStartedAt) : null)
  if (trialStart) {
    const maxSeen = persistent?.maxDateSeen ? new Date(persistent.maxDateSeen) : trialStart
    const nowMs = now.getTime()

    if (nowMs < maxSeen.getTime()) {
      expired = true
      result.remainingDays = 0
      result.remainingText = 'تم اكتشاف تغيير في تاريخ النظام - الترخيص ملغي'
    } else {
      const effectiveMax = license ? new Date(Math.max(maxSeen.getTime(), nowMs)) : maxSeen
      const elapsed = Math.floor((effectiveMax - trialStart) / (1000 * 60 * 60 * 24))
      if (elapsed >= TRIAL_DAYS) {
        expired = true
        result.remainingDays = 0
        result.remainingText = 'منتهي'
      } else {
        expired = false
        result.remainingDays = TRIAL_DAYS - elapsed
        result.remainingText = `تجربة - باقي ${result.remainingDays} يوم`
      }

      if (license) {
        writePersistentLicense({
          hwid,
          trialStartedAt: trialStart.toISOString(),
          maxDateSeen: effectiveMax.toISOString(),
          activated: false
        })
      }
    }
  }

  if (persistent && persistent.hwid && persistent.hwid !== hwid) {
    expired = true
    result.remainingText = 'جهاز مختلف - تجربة غير متاحة'
    result.remainingDays = 0
  }

  result.expired = expired
  return result
}

async function activateLicense(realm, key) {
  const hwid = generateHwid()

  const response = await fetch(`${LICENSE_API_URL}/api/activate`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ key, hwid })
  })
  const data = await response.json()

  if (!data.success) {
    throw new Error(data.error || 'فشل التفعيل')
  }

  const now = new Date()
  realm.write(() => {
    realm.create('License', {
      _id: 'license',
      activatedKey: key,
      activated: true,
      expiresAt: data.expiresAt ? new Date(data.expiresAt) : null,
      licenseType: data.licenseType || 'lifetime',
      deviceHwid: hwid,
      lastSeenDate: now,
      trialStartedAt: null
    }, Realm.UpdateMode.Modified)
  })

  writePersistentLicense({
    hwid,
    activated: true,
    activatedKey: key,
    expiresAt: data.expiresAt || '',
    licenseType: data.licenseType || 'lifetime',
    maxDateSeen: now.toISOString()
  })

  return { success: true, expiresAt: data.expiresAt, licenseType: data.licenseType }
}

async function startTrial(realm) {
  const persistent = readPersistentLicense()
  const hwid = generateHwid()

  if (persistent) {
    if (persistent.hwid !== hwid) {
      throw new Error('هذا الجهاز مختلف عن الجهاز الذي بدأ عليه الترخيص')
    }
    if (persistent.trialStartedAt) {
      return { success: true, alreadyActivated: true }
    }
  }

  const now = new Date()
  realm.write(() => {
    realm.create('License', {
      _id: 'license',
      activated: false,
      trialStartedAt: now,
      deviceHwid: hwid,
      lastSeenDate: now
    }, Realm.UpdateMode.Modified)
  })

  writePersistentLicense({
    hwid,
    trialStartedAt: now.toISOString(),
    maxDateSeen: now.toISOString(),
    activated: false
  })

  return { success: true, trialStartedAt: now.toISOString() }
}

module.exports = { checkLicense, activateLicense, startTrial, generateHwid }
