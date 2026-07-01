const https = require('node:https')
const fs = require('node:fs')
const path = require('node:path')
const config = require('../config')

function apiUrl(method) {
  return `https://api.telegram.org/bot${config.telegramBotToken}/${method}`
}

function fetchJson(url, options = {}) {
  return new Promise((resolve, reject) => {
    const req = https.request(url, options, res => {
      let data = ''
      res.on('data', chunk => data += chunk)
      res.on('end', () => {
        try { resolve(JSON.parse(data)) }
        catch { reject(new Error('فشل تحليل رد تليجرام')) }
      })
    })
    req.on('error', reject)
    req.on('timeout', () => { req.destroy(); reject(new Error('انتهت مهلة الاتصال بتليجرام')) })
    if (options.body) req.write(options.body)
    req.end()
  })
}

async function startLinking(linkCode) {
  const url = apiUrl('getUpdates')
  const data = await fetchJson(url)
  if (!data.ok) throw new Error('فشل الاتصال بالبوت')
  const updates = data.result || []
  for (const update of updates) {
    const msg = update.message
    if (msg) {
      const text = msg.text || ''
      if (text === linkCode || text === '/start ' + linkCode) {
        return { chatId: String(msg.chat.id), chatName: msg.chat.first_name || '' }
      }
    }
  }
  return null
}

async function sendFile(chatId, filePath) {
  const stats = fs.statSync(filePath)
  const fileName = path.basename(filePath)

  return new Promise((resolve, reject) => {
    const boundary = '----WebKitFormBoundary' + Math.random().toString(36).slice(2)
    let body = ''
    body += `--${boundary}\r\n`
    body += `Content-Disposition: form-data; name="chat_id"\r\n\r\n${chatId}\r\n`
    body += `--${boundary}\r\n`
    body += `Content-Disposition: form-data; name="caption"\r\n\r\n📦 نسخة احتياطية - ${fileName}\r\n`
    body += `--${boundary}\r\n`
    body += `Content-Disposition: form-data; name="document"; filename="${fileName}"\r\n`
    body += `Content-Type: application/octet-stream\r\n\r\n`

    const header = Buffer.from(body, 'utf-8')
    const fileContent = fs.readFileSync(filePath)
    const footer = Buffer.from(`\r\n--${boundary}--\r\n`, 'utf-8')

    const url = apiUrl('sendDocument')
    const req = https.request(url, {
      method: 'POST',
      headers: {
        'Content-Type': `multipart/form-data; boundary=${boundary}`,
        'Content-Length': String(header.length + fileContent.length + footer.length)
      },
      timeout: 15000
    }, res => {
      let data = ''
      res.on('data', chunk => data += chunk)
      res.on('end', () => {
        try {
          const parsed = JSON.parse(data)
          if (parsed.ok) resolve(true)
          else reject(new Error('تليجرام: ' + (parsed.description || 'فشل إرسال الملف')))
        } catch { reject(new Error('تليجرام: فشل تحليل الرد - ' + data.slice(0, 200))) }
      })
    })
    req.on('error', reject)
    req.on('timeout', () => { req.destroy(); reject(new Error('انتهت مهلة إرسال الملف لتليجرام')) })
    req.write(header)
    req.write(fileContent)
    req.write(footer)
    req.end()
  })
}

async function sendBackup(chatId, filePath) {
  if (!config.telegramBotToken || !chatId) throw new Error('البوت غير مرتبط')
  return sendFile(chatId, filePath)
}

module.exports = { startLinking, sendBackup }
