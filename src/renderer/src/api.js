const raw = window.smartx
if (!raw) throw new Error('SmartX API not available - are you running inside Electron?')

function cleanError(msg) {
  return msg.replace(/^Error invoking remote method '[^']*':\s*Error:\s*/i, '')
    .replace(/^(Error|Unhandled Error):\s*/i, '')
}

const api = {}
for (const key of Object.keys(raw)) {
  api[key] = async (...args) => {
    try {
      return await raw[key](...args)
    } catch (err) {
      const msg = (err && err.message) || String(err || '')
      throw new Error(cleanError(msg))
    }
  }
}

export default api