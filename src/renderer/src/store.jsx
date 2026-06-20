import { createContext } from 'preact'
import { useContext, useState, useEffect } from 'preact/hooks'
import api from './api'

const StoreContext = createContext(null)

export function StoreProvider({ children }) {
  const [state, setState] = useState({
    token: null,
    user: null,
    settings: null,
    license: null,
    page: 'loading',
    reportTab: 'overview',
    reportDateFrom: '',
    reportDateTo: '',
    settingsDirty: false,
    leaveSettingsPrompt: { open: false, targetPage: null },
    settingsLeaveAction: null,
    updateAvailable: null,
    pendingAutoUpdate: false
  })

  function goToReports(tab, dateFrom, dateTo) {
    setState(s => ({ ...s, reportTab: tab || 'overview', reportDateFrom: dateFrom || '', reportDateTo: dateTo || '', page: 'reports' }))
  }

  function clearReportNav() {
    setState(s => ({ ...s, reportTab: 'overview', reportDateFrom: '', reportDateTo: '' }))
  }

  function setPage(page) {
    setState(s => {
      if (s.page === 'settings' && s.settingsDirty && page !== 'settings') {
        return { ...s, leaveSettingsPrompt: { open: true, targetPage: page } }
      }
      return { ...s, page }
    })
  }

  function markSettingsDirty(isDirty = true) {
    setState(s => ({ ...s, settingsDirty: isDirty }))
  }

  function registerSettingsLeaveAction(action) {
    setState(s => ({ ...s, settingsLeaveAction: action }))
  }

  function closeSettingsPrompt() {
    setState(s => ({ ...s, leaveSettingsPrompt: { open: false, targetPage: null } }))
  }

  async function confirmLeaveSettings(choice) {
    const { leaveSettingsPrompt: prompt, settingsLeaveAction: action } = state
    const targetPage = prompt?.targetPage

    if (choice === 'save' && typeof action === 'function') {
      const saved = await action()
      if (!saved) return
    }

    if (choice === 'discard' || choice === 'save') {
      setState(s => ({
        ...s,
        page: targetPage,
        settingsDirty: false,
        leaveSettingsPrompt: { open: false, targetPage: null }
      }))
      return
    }

    closeSettingsPrompt()
  }

  async function login(username, password) {
    const result = await api.login(username, password)
    let settings = null
    try {
      settings = await api.getSettings(result.token)
      if (settings?.currency) localStorage.setItem('currency', settings.currency)
      if (settings?.calendarType) localStorage.setItem('calendarType', settings.calendarType)
      if (settings?.timeFormat) localStorage.setItem('timeFormat', settings.timeFormat)
      if (settings?.theme) localStorage.setItem('theme', settings.theme)
      localStorage.setItem('printDirectly', settings?.printDirectly ? 'true' : 'false')
    } catch (e) {}
    const license = await api.serverCheckLicense()
    const targetPage = (!license?.activated && !license?.trialUsed) || license?.expired ? 'license' : 'dashboard'
    setState(s => ({ ...s, token: result.token, user: result.user, settings, license, page: targetPage }))
    localStorage.setItem('token', result.token)
    localStorage.setItem('user', JSON.stringify(result.user))
    return result
  }

  async function logout() {
    const token = localStorage.getItem('token')
    if (token) await api.logout(token)
    localStorage.removeItem('token')
    localStorage.removeItem('user')
    setState(s => ({ ...s, token: null, user: null, settings: null, license: null, page: 'login' }))
  }

  async function refreshLicense() {
    const license = await api.serverCheckLicense()
    setState(s => ({ ...s, license }))
    return license
  }

  async function updateSettings(newSettings) {
    const token = localStorage.getItem('token')
    const updated = await api.saveSettings(token, newSettings)
      if (updated?.currency) localStorage.setItem('currency', updated.currency)
      if (updated?.calendarType) localStorage.setItem('calendarType', updated.calendarType)
      if (updated?.timeFormat) localStorage.setItem('timeFormat', updated.timeFormat)
      if (updated?.theme) localStorage.setItem('theme', updated.theme)
      localStorage.setItem('printDirectly', updated?.printDirectly ? 'true' : 'false')
    setState(s => ({ ...s, settings: updated }))
    return updated
  }

  useEffect(() => {
    async function init() {
      try {
        const license = await api.checkLicense()
        // Background server check to detect revocation
        api.serverCheckLicense().then(serverLic => {
          if (serverLic?.expired && !license?.expired) {
            const token = localStorage.getItem('token')
            if (token) api.logout(token).catch(() => {})
            localStorage.removeItem('token')
            localStorage.removeItem('user')
            setState(s => ({ ...s, token: null, user: null, license: serverLic, page: 'license' }))
          } else if (serverLic) {
            setState(s => ({ ...s, license: serverLic }))
          }
        }).catch(() => {})
        if (license?.expired) {
          setState(s => ({ ...s, license, page: 'license' }))
        } else if (license?.activated || license?.trialUsed) {
          const savedToken = localStorage.getItem('token')
          if (savedToken) {
            const session = await api.getSession(savedToken)
            if (session) {
              let settings = null
              try {
                settings = await api.getSettings(savedToken)
                if (settings?.currency) localStorage.setItem('currency', settings.currency)
                if (settings?.calendarType) localStorage.setItem('calendarType', settings.calendarType)
                if (settings?.timeFormat) localStorage.setItem('timeFormat', settings.timeFormat)
                if (settings?.theme) localStorage.setItem('theme', settings.theme)
                localStorage.setItem('printDirectly', settings?.printDirectly ? 'true' : 'false')
              } catch (e) {}
              setState(s => ({ ...s, token: savedToken, user: session, settings, license, page: 'dashboard' }))
              return
            }
          }
          setState(s => ({ ...s, license, page: 'login' }))
        } else {
          setState(s => ({ ...s, license, page: 'license' }))
        }
      } catch {
        setState(s => ({ ...s, page: 'login' }))
      }
    }
    init()
  }, [])

  // Listen for grace warning reset from periodic check
  useEffect(() => {
    const unsub = window.smartx?.onGraceWarning?.((data) => {
      if (!data.graceWarning) refreshLicense()
    })
    return unsub
  }, [])

  // Listen for license revoked from periodic check
  useEffect(() => {
    const unsub = window.smartx?.onLicenseRevoked?.(() => {
      refreshLicense().then(lic => {
        if (lic?.expired) {
          const token = localStorage.getItem('token')
          if (token) api.logout(token).catch(() => {})
          localStorage.removeItem('token')
          localStorage.removeItem('user')
          setState(s => ({ ...s, token: null, user: null, license: lic, page: 'license' }))
        }
      })
    })
    return unsub
  }, [])

  // Listen for update status
  useEffect(() => {
    const unsub = window.smartx?.onUpdateStatus?.((status) => {
      if (status.type === 'available') {
        setState(s => ({ ...s, updateAvailable: status.info?.version }))
      } else if (status.type === 'not-available' || status.type === 'downloaded') {
        // reset on next app restart
      }
    })
    return unsub
  }, [])

  function toggleTheme() {
    const current = state.settings?.theme || localStorage.getItem('theme') || 'dark'
    const next = current === 'dark' ? 'light' : 'dark'
    localStorage.setItem('theme', next)
    document.documentElement.setAttribute('data-theme', next)
    setState(s => ({ ...s, settings: s.settings ? { ...s.settings, theme: next } : s.settings }))
    const token = localStorage.getItem('token')
    if (token) {
      api.getSettings(token).then(s => {
        if (s) api.saveSettings(token, { ...s, theme: next }).catch(() => {})
      }).catch(() => {})
    }
  }

  // Sync theme attribute with state.settings.theme
  useEffect(() => {
    const theme = state.settings?.theme || localStorage.getItem('theme') || 'dark'
    document.documentElement.setAttribute('data-theme', theme)
  }, [state.settings?.theme])

  // Sync timeFormat with localStorage for the global date interceptor
  useEffect(() => {
    if (state.settings?.timeFormat) {
      localStorage.setItem('timeFormat', state.settings.timeFormat)
    }
  }, [state.settings?.timeFormat])

  // Sync fontFamily (Google Fonts) with CSS variable
  useEffect(() => {
    let font = state.settings?.fontFamily || 'Cairo'
    if (font === 'dark' || font === 'light') font = 'Cairo' // sanitization
    document.documentElement.style.setProperty('--font-family', font)
  }, [state.settings?.fontFamily])

  return (
    <StoreContext.Provider value={{
      ...state,
      login,
      logout,
      setPage,
      updateSettings, refreshLicense,
      goToReports, clearReportNav,
      markSettingsDirty,
      registerSettingsLeaveAction, toggleTheme,
      closeSettingsPrompt,
      confirmLeaveSettings,
      clearUpdate: () => setState(s => ({ ...s, updateAvailable: null })),
      triggerAutoUpdate: () => setState(s => ({ ...s, page: 'settings', pendingAutoUpdate: true })),
      clearAutoUpdateFlag: () => setState(s => ({ ...s, pendingAutoUpdate: false }))
    }}>
      {children}
    </StoreContext.Provider>
  )
}

export function useStore() {
  return useContext(StoreContext)
}
