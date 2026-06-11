const api = window.smartx

if (!api) {
  throw new Error('SmartX API not available - are you running inside Electron?')
}

export default api
