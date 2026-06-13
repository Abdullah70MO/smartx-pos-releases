const crypto = require('node:crypto')
const fs = require('node:fs')
const path = require('node:path')
const os = require('node:os')
const { app, BrowserWindow } = require('electron')
const { LICENSE_API_URL, LICENSE_SIGNING_KEY } = require('../constants')

const TRIAL_DAYS = 14
function getGraceDays(licenseType) {
  return licenseType === 'lifetime' ? 210 : 7
}
const XOR_KEY = 'Sx@2024!'
const CHECK_INTERVAL_MS = 6 * 60 * 60 * 1000
const AES_ALGO = 'aes-256-gcm'
const AES_KEY_LEN = 32
const AES_IV_LEN = 16
const AES_TAG_LEN = 16
const PBKDF2_ITER = 100000

let periodicTimer = null

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
  return path.join(process.env.LOCALAPPDATA || path.join(os.homedir(), 'AppData', 'Local'), 'SmartX', 'license.dat')
}

function deriveAesKey(hwid) {
  return crypto.pbkdf2Sync(XOR_KEY, hwid || 'default', PBKDF2_ITER, AES_KEY_LEN, 'sha256')
}

function aesEncrypt(data, hwid) {
  const key = deriveAesKey(hwid)
  const iv = crypto.randomBytes(AES_IV_LEN)
  const cipher = crypto.createCipheriv(AES_ALGO, key, iv)
  let encrypted = cipher.update(data, 'utf8', 'base64')
  encrypted += cipher.final('base64')
  const tag = cipher.getAuthTag().toString('base64')
  return JSON.stringify({ iv: iv.toString('base64'), tag, data: encrypted, v: 2 })
}

function aesDecrypt(encoded, hwid) {
  try {
    const parts = JSON.parse(encoded)
    if (parts.v !== 2) return null
    const key = deriveAesKey(hwid)
    const iv = Buffer.from(parts.iv, 'base64')
    const tag = Buffer.from(parts.tag, 'base64')
    const decipher = crypto.createDecipheriv(AES_ALGO, key, iv)
    decipher.setAuthTag(tag)
    let decrypted = decipher.update(parts.data, 'base64', 'utf8')
    decrypted += decipher.final('utf8')
    return decrypted
  } catch { return null }
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

function computeChecksum(data) {
  let input = data.hwid + '|' + (data.trialStartedAt || '') + '|' + (data.maxDateSeen || '') + '|' + (data.activated || '')
  if (data.lastSuccessfulCheck) input += '|' + data.lastSuccessfulCheck
  return crypto.createHmac('sha256', LICENSE_SIGNING_KEY).update(input).digest('hex')
}

function verifyServerLicenseFile(base64data) {
  try {
    const json = Buffer.from(base64data, 'base64').toString('utf8')
    const data = JSON.parse(json)
    const signature = data.signature
    if (!signature) return null
    const dataForSig = { ...data }
    delete dataForSig.signature
    const expected = crypto.createHmac('sha256', LICENSE_SIGNING_KEY)
      .update(JSON.stringify(dataForSig))
      .digest('hex')
    return signature === expected ? data : null
  } catch { return null }
}

function readPersistentLicense() {
  const filePath = getLicenseFilePath()
  try {
    if (!fs.existsSync(filePath)) return null
    const raw = fs.readFileSync(filePath, 'utf8').trim()
    let json = null
    const hwid = generateHwid()
    if (raw.startsWith('{') && raw.includes('"v"')) {
      json = aesDecrypt(raw, 'read') || aesDecrypt(raw, hwid)
    }
    if (!json) {
      json = xorDecode(raw, XOR_KEY)
    }
    if (!json) return null
    const data = JSON.parse(json)
    if (!data.hwid || !data.checksum) return null
    const expected = computeChecksum(data)
    if (data.checksum !== expected) return null
    if (data.licenseFile) {
      const verified = verifyServerLicenseFile(data.licenseFile)
      if (!verified) return null
    }
    return data
  } catch { return null }
}

function writePersistentLicense(data) {
  try {
    const filePath = getLicenseFilePath()
    const dir = path.dirname(filePath)
    if (!fs.existsSync(dir)) fs.mkdirSync(dir, { recursive: true })
    data.checksum = computeChecksum(data)
    const raw = aesEncrypt(JSON.stringify(data), 'read')
    fs.writeFileSync(filePath, raw, 'utf8')
  } catch {}
}

async function checkLicenseWithServer(key, hwid) {
  try {
    const response = await fetch(`${LICENSE_API_URL}/api/check`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ key, hwid }),
      signal: AbortSignal.timeout(10000)
    })
    return await response.json()
  } catch {
    return { valid: false, networkError: true, error: 'فشل الاتصال بالسيرفر' }
  }
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
    activatedAt: license?.activatedAt?.toISOString() || persistent?.activatedAt || null,
    expiresAt: license?.expiresAt?.toISOString() || null,
    licenseType: license?.licenseType || persistent?.licenseType || '',
    trialStartedAt: license?.trialStartedAt?.toISOString() || persistent?.trialStartedAt || null,
    trialUsed: !!(license?.trialStartedAt || persistent?.trialStartedAt),
    remainingDays: null,
    remainingText: '',
    graceWarning: false
  }

  let expired = false

  if (license?.activated || (persistent && persistent.activated)) {
    const hardExpiry = (license?.expiresAt && license.licenseType !== 'lifetime') ? new Date(license.expiresAt) : null
    const graceDays = getGraceDays(result.licenseType)
    const lastCheck = persistent?.lastSuccessfulCheck ? new Date(persistent.lastSuccessfulCheck) : null
    const networkExpiry = lastCheck ? new Date(lastCheck.getTime() + graceDays * 24 * 60 * 60 * 1000) : null

    let earliestExpiry = null
    if (hardExpiry && networkExpiry) {
      earliestExpiry = hardExpiry < networkExpiry ? hardExpiry : networkExpiry
    } else if (hardExpiry) {
      earliestExpiry = hardExpiry
    } else if (networkExpiry) {
      earliestExpiry = networkExpiry
    }

    if (earliestExpiry) {
      expired = now >= earliestExpiry
      if (expired) {
        result.remainingDays = 0
        if (result.licenseType === 'lifetime') {
          result.remainingText = 'انتهت مهلة الأمان - يرجى الاتصال بالإنترنت'
        } else if (hardExpiry && now >= hardExpiry) {
          result.remainingText = 'منتهي'
        } else {
          result.remainingText = 'انتهت مهلة الأمان - يرجى الاتصال بالإنترنت'
        }
      } else {
        const diffMs = earliestExpiry - now
        result.remainingDays = Math.ceil(diffMs / (1000 * 60 * 60 * 24))
        if (result.licenseType === 'lifetime') {
          result.remainingText = lastCheck ? ('مدى الحياة - مهلة ' + result.remainingDays + ' يوم') : 'مدى الحياة'
          if (lastCheck) {
            const graceRemaining = Math.ceil((networkExpiry - now) / (1000 * 60 * 60 * 24))
            if (graceRemaining <= 7) result.graceWarning = true
          }
        } else {
          if (result.remainingDays > 30) {
            const months = Math.floor(result.remainingDays / 30)
            result.remainingText = months + ' شهر'
          } else {
            result.remainingText = result.remainingDays + ' يوم'
          }
          if (networkExpiry) {
            const graceRemaining = Math.ceil((networkExpiry - now) / (1000 * 60 * 60 * 24))
            if (graceRemaining <= 2) result.graceWarning = true
          }
        }
      }
    } else {
      if (result.licenseType === 'lifetime') {
        result.remainingText = 'مدى الحياة'
      }
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
        result.remainingText = 'تجربة - باقي ' + result.remainingDays + ' يوم'
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
    body: JSON.stringify({ key, hwid }),
    signal: AbortSignal.timeout(15000)
  })
  const data = await response.json()

  if (!data.success) {
    throw new Error(data.error || 'فشل التفعيل')
  }

  const now = new Date()
  const existing = realm.objectForPrimaryKey('License', 'license')
  const activatedAt = existing?.activatedAt || now
  realm.write(() => {
    realm.create('License', {
      _id: 'license',
      activatedKey: key,
      activated: true,
      activatedAt,
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
    activatedAt: activatedAt.toISOString(),
    expiresAt: data.expiresAt || '',
    licenseType: data.licenseType || 'lifetime',
    maxDateSeen: now.toISOString(),
    licenseFile: data.licenseFile || '',
    lastSuccessfulCheck: now.toISOString(),
    cachedServerResponse: JSON.stringify(data)
  })

  return { success: true, expiresAt: data.expiresAt, licenseType: data.licenseType, activatedAt: activatedAt.toISOString() }
}

async function startTrial(realm) {
  const persistent = readPersistentLicense()
  const hwid = generateHwid()

  if (persistent?.activated) {
    throw new Error('الترخيص مفعل بالفعل')
  }

  const realmLicense = realm.objectForPrimaryKey('License', 'license')
  if (realmLicense?.activated) {
    throw new Error('الترخيص مفعل بالفعل')
  }

  if (persistent) {
    if (persistent.hwid !== hwid) {
      throw new Error('هذا الجهاز مختلف عن الجهاز الذي بدأ عليه الترخيص')
    }
    if (persistent.trialStartedAt) {
      return { success: true, alreadyActivated: true }
    }
  }

  if (realmLicense?.trialStartedAt) {
    return { success: true, alreadyActivated: true }
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

async function periodicCheck(realm) {
  const license = realm.objectForPrimaryKey('License', 'license')
  if (!license?.activated || !license?.activatedKey) return { valid: true, local: true }
  const hwid = generateHwid()
  const serverResult = await checkLicenseWithServer(license.activatedKey, hwid)
  if (serverResult.valid === true) {
    const persistent = readPersistentLicense() || {}
    persistent.lastSuccessfulCheck = new Date().toISOString()
    persistent.cachedServerResponse = JSON.stringify(serverResult)
    writePersistentLicense(persistent)

    BrowserWindow.getAllWindows().forEach(w =>
      w.webContents.send('license:grace-warning', { graceWarning: false })
    )
  } else if (serverResult.valid === false && !serverResult.networkError) {
    r.write(() => {
      license.activated = false
    })
    writePersistentLicense({
      hwid,
      activated: false,
      maxDateSeen: new Date().toISOString()
    })
  }
  return serverResult
}

function startPeriodicCheck(realm) {
  if (periodicTimer) clearInterval(periodicTimer)
  periodicTimer = setInterval(() => {
    periodicCheck(realm)
  }, CHECK_INTERVAL_MS)
}

function getGraceWarning(realm) {
  const result = checkLicense(realm)
  return result.graceWarning || false
}

function stopPeriodicCheck() {
  if (periodicTimer) {
    clearInterval(periodicTimer)
    periodicTimer = null
  }
}

module.exports = { checkLicense, activateLicense, startTrial, generateHwid, periodicCheck, startPeriodicCheck, stopPeriodicCheck, getGraceWarning }
