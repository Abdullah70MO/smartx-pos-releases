import { useState, useEffect } from 'preact/hooks'
import api from '../api'
import Modal from '../components/Modal'
import { useToast } from '../components/Toast'
import { useStore } from '../store'
import { useConfirm } from '../components/ConfirmModal'
import { formatDate } from '../utils/date'
import ActivateLicenseModal from '../components/ActivateLicenseModal'

export default function SettingsPage() {
  const toast = useToast()
  const { confirm, ConfirmDialog } = useConfirm()
  const { user, updateSettings, markSettingsDirty, registerSettingsLeaveAction, settingsDirty, clearUpdate, setPage, refreshLicense, pendingAutoUpdate, clearAutoUpdateFlag } = useStore()
  useEffect(() => { clearUpdate() }, [])
  const canManage = user?.permissions?.includes('settings.manage')
  const [settings, setSettings] = useState(null)
  const [contact, setContact] = useState([])
  const [form, setForm] = useState({})
  const [initialForm, setInitialForm] = useState(null)
  const [updateStatus, setUpdateStatus] = useState(null)
  const [updateModal, setUpdateModal] = useState(null)
  const [showLicenseModal, setShowLicenseModal] = useState(false)
  const [checkingUpdate, setCheckingUpdate] = useState(false)
  const [appVersion, setAppVersion] = useState('')
  const [licenseStatus, setLicenseStatus] = useState(null)
  const [refreshingLicense, setRefreshingLicense] = useState(false)

  useEffect(() => { load() }, [])

  useEffect(() => {
    registerSettingsLeaveAction(saveSettingsNow)
    return () => registerSettingsLeaveAction(null)
  }, [form, initialForm])

  useEffect(() => {
    if (!initialForm) return
    markSettingsDirty(JSON.stringify(form) !== JSON.stringify(initialForm))
  }, [form, initialForm])

  async function load() {
    const token = localStorage.getItem('token')
    try {
      const [s, c, ver, lic] = await Promise.all([api.getSettings(token), api.getContactInfo(), api.getAppVersion(), api.checkLicense()])
      setLicenseStatus(lic)
      if (ver) setAppVersion(ver)
      if (s) {
        setSettings(s)
        let savedFont = s.fontFamily || 'Cairo'
        if (savedFont === 'dark' || savedFont === 'light') savedFont = 'Cairo'

        const loadedForm = {
          businessName: s.businessName || '',
          phone: s.phone || '',
          email: s.email || '',
          address: s.address || '',
          commercialRegistration: s.commercialRegistration || '',
          taxNumber: s.taxNumber || '',
          showCommercialReg: s.showCommercialReg !== false,
          showTaxReg: s.showTaxReg !== false,
          showBusinessName: s.showBusinessName !== false,
          showLogo: s.showLogo !== false,
          showPhone: s.showPhone !== false,
          showEmail: s.showEmail !== false,
          showAddress: s.showAddress !== false,
          showReceiptFooter: s.showReceiptFooter !== false,
          showProductsTable: s.showProductsTable !== false,
          showTotals: s.showTotals !== false,
          showPaid: s.showPaid !== false,
          showCashier: s.showCashier !== false,
          showNotes: s.showNotes !== false,
          showClientInfo: s.showClientInfo !== false,
          showSupplierInfo: s.showSupplierInfo !== false,
          currency: s.currency || 'EGP',
          taxEnabled: s.taxEnabled !== false,
          theme: s.theme || 'dark',
          timeFormat: s.timeFormat || '12',
          fontFamily: savedFont,
          calendarType: s.calendarType || localStorage.getItem('calendarType') || 'gregorian',
          logoDataUrl: s.logoDataUrl || '',
          receiptFooter: s.receiptFooter || '',
          printAfterPayment: s.printAfterPayment !== false,
          taxRate: s.taxRate != null ? s.taxRate : 14,
          printDefaultSize: s.printDefaultSize || 'receipt',
          printColorMode: s.printColorMode || 'color',
          printDirectly: s.printDirectly === true,
          autoBackup: s.autoBackup || false,
          autoBackupInterval: s.autoBackupInterval || 'weekly',
          autoBackupPath: s.autoBackupPath || ''
        }
        setInitialForm(loadedForm)
        setForm(loadedForm)
        markSettingsDirty(false)
      }
      setContact(c || [])
    } catch {}
  }

  async function handleBackupExport() {
    const token = localStorage.getItem('token')
    try {
      const path = await api.exportBackup(token)
      if (path) toast(`تم إنشاء النسخة الاحتياطية: ${path}`, 'success')
    } catch (err) { toast(err.message, 'error') }
  }

  async function handleBackupRestore() {
    const token = localStorage.getItem('token')
    try {
      await api.restoreBackup(token)
      toast('تمت استعادة النسخة الاحتياطية', 'success')
      load()
    } catch (err) { toast(err.message, 'error') }
  }

  async function handleRefreshLicense() {
    setRefreshingLicense(true)
    try {
      const lic = await api.serverCheckLicense()
      setLicenseStatus(lic)
      if (lic?.expired) {
        toast('تم إلغاء الترخيص - سيتم تسجيل الخروج', 'error')
        setTimeout(async () => {
          const token = localStorage.getItem('token')
          if (token) await api.logout(token).catch(() => {})
          localStorage.removeItem('token')
          localStorage.removeItem('user')
          window.location.reload()
        }, 2000)
      } else {
        toast('تم تحديث حالة الترخيص', 'success')
      }
    } catch (err) {
      toast(err.message, 'error')
    }
    setRefreshingLicense(false)
  }

  async function handleSelectBackupFolder() {
    try {
      const folderPath = await api.selectFolder()
      if (folderPath) {
        setForm(f => ({ ...f, autoBackupPath: folderPath }))
        markSettingsDirty(true)
      }
    } catch (err) {
      toast('فشل اختيار المجلد', 'error')
    }
  }

  // Auto-backup check on mount
  useEffect(() => {
    if (!settings?.autoBackup) return
    const lastDate = settings.autoBackupLastDate ? new Date(settings.autoBackupLastDate) : null
    const now = new Date()
    let shouldBackup = false
    if (!lastDate) {
      shouldBackup = true
    } else {
      const daysSince = (now - lastDate) / (1000 * 60 * 60 * 24)
      if (settings.autoBackupInterval === 'daily' && daysSince >= 1) shouldBackup = true
      else if (settings.autoBackupInterval === 'weekly' && daysSince >= 7) shouldBackup = true
      else if (settings.autoBackupInterval === 'monthly' && daysSince >= 30) shouldBackup = true
    }
    if (shouldBackup) {
      api.autoBackup(localStorage.getItem('token'), settings.autoBackupPath).then(path => {
        if (path) toast('تم إنشاء نسخة احتياطية تلقائية', 'success')
        // Update last backup date
        const token = localStorage.getItem('token')
        api.getSettings(token).then(s => {
          s.autoBackupLastDate = new Date().toISOString()
          api.saveSettings(token, s)
        }).catch(() => {})
      }).catch(() => {})
    }
  }, [settings?.autoBackup, settings?.autoBackupInterval, settings?.autoBackupLastDate, settings?.autoBackupPath])

  useEffect(() => {
    const unsub = api.onUpdateStatus((status) => {
      setUpdateStatus(status)
      if (status.type === 'available') {
        setUpdateModal({ type: 'available', info: status.info })
      } else if (status.type === 'downloaded') {
        setUpdateModal({ type: 'downloaded' })
        toast('تم تحميل التحديث', 'success')
      } else if (status.type === 'error') {
        setUpdateModal({ type: 'error', message: status.message })
      } else if (status.type === 'not-available') {
        toast('لا توجد تحديثات متاحة', 'success')
      }
    })
    return unsub
  }, [])

  useEffect(() => {
    if (pendingAutoUpdate) {
      clearAutoUpdateFlag()
      const timer = setTimeout(() => handleCheckUpdates(), 500)
      return () => clearTimeout(timer)
    }
  }, [pendingAutoUpdate])

  async function handleCheckUpdates() {
    setCheckingUpdate(true)
    setUpdateStatus(null)
    try {
      await api.checkForUpdates()
    } catch (err) {
      setUpdateModal({ type: 'error', message: err.message })
    }
    setCheckingUpdate(false)
  }

  async function handleDownloadUpdate() {
    const doBackup = await confirm('يفضل أخذ نسخة احتياطية قبل التحديث. هل تريد أخذ نسخة الآن؟')
    if (doBackup) {
      try {
        await api.exportBackup(localStorage.getItem('token'))
        toast('تم أخذ النسخة الاحتياطية', 'success')
      } catch (err) {
        toast('فشل أخذ النسخة: ' + err.message, 'error')
        return
      }
    }
    setUpdateModal(null)
    try {
      await api.downloadUpdate()
    } catch (err) {
      setUpdateModal({ type: 'error', message: err.message })
    }
  }

  async function handleInstallUpdate() {
    setUpdateModal(null)
    await api.installUpdate()
  }

  async function handleBackupReset() {
    const token = localStorage.getItem('token')
    try {
      const confirmed = await confirm('هل تريد إعادة تعيين قاعدة البيانات؟ سيتم حذف البيانات وإرجاع الإعدادات الأساسية.')
      if (!confirmed) return
      await api.resetDatabase(token)
      toast('تمت إعادة تعيين البيانات بنجاح', 'success')
      load()
      window.dispatchEvent(new Event('dataChanged'))
    } catch (err) { toast(err.message, 'error') }
  }

  function handleLogoChange(e) {
    const file = e.target.files?.[0]
    if (!file) return
    const reader = new FileReader()
    reader.onload = () => {
      setForm(f => ({ ...f, logoDataUrl: String(reader.result || '') }))
    }
    reader.readAsDataURL(file)
  }

  function clearLogo() {
    setForm(f => ({ ...f, logoDataUrl: '' }))
  }

  async function saveSettingsNow() {
    try {
      const nextForm = { ...form }
      localStorage.setItem('currency', nextForm.currency)
      localStorage.setItem('calendarType', nextForm.calendarType)
      localStorage.setItem('timeFormat', nextForm.timeFormat)
      localStorage.setItem('printDirectly', nextForm.printDirectly ? 'true' : 'false')
      const updated = await updateSettings(nextForm)
      const normalized = updated || nextForm
      setInitialForm(normalized)
      setForm(normalized)
      markSettingsDirty(false)
      toast('تم حفظ الإعدادات بنجاح', 'success')
      window.dispatchEvent(new Event('dataChanged'))
      return true
    } catch (err) {
      toast(err.message, 'error')
      return false
    }
  }

  async function handleSave(e) {
    e.preventDefault()
    await saveSettingsNow()
  }

  return (
    <div style={{ padding: '24px', overflow: 'auto', height: '100%', background: 'var(--bg)' }}>
      <h1 style={{ fontSize: '22px', fontWeight: '700', marginBottom: '24px', color: 'var(--text)' }}>الإعدادات</h1>

      <form onSubmit={handleSave}>
        <div style={{ display: 'grid', gap: '16px' }}>
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: '16px' }}>
        <Section title="بيانات المتجر">
          <div style={{ display: 'flex', flexDirection: 'column', gap: '14px' }}>
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px' }}>
              <div style={{ gridColumn: '1 / -1' }}>
                <label style={{ fontSize: '12px', color: 'var(--text2)', display: 'block', marginBottom: '6px' }}>شعار المتجر</label>
                <div style={{ display: 'flex', alignItems: 'center', gap: '12px', flexWrap: 'wrap' }}>
                  <div style={{ width: '84px', height: '84px', borderRadius: '14px', overflow: 'hidden', border: '1px solid var(--outline)', background: 'var(--bg)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                    {form.logoDataUrl ? (
                      <img src={form.logoDataUrl} alt="شعار المتجر" style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
                    ) : (
                      <span style={{ color: 'var(--text2)', fontSize: '11px', textAlign: 'center', padding: '6px' }}>لا يوجد شعار</span>
                    )}
                  </div>
                  {canManage && <div style={{ display: 'flex', flexDirection: 'column', gap: '8px', flex: 1, minWidth: '200px' }}>
                    <input type="file" accept="image/*" onChange={handleLogoChange} />
                    <div style={{ display: 'flex', gap: '8px', flexWrap: 'wrap' }}>
                      <button type="button" onClick={clearLogo} style={{ background: 'var(--bg3)', color: 'var(--text)', padding: '8px 12px', borderRadius: '10px', fontSize: '12px', fontWeight: '600' }}>
                        إزالة الشعار
                      </button>
                    </div>
                  </div>}
                </div>
              </div>
              <div>
                <label style={{ fontSize: '12px', color: 'var(--text2)', display: 'block', marginBottom: '6px' }}>اسم المتجر</label>
                <input value={form.businessName} onInput={e => setForm(f => ({ ...f, businessName: e.target.value }))} style={{ width: '100%' }} readOnly={!canManage} />
              </div>
              <div>
                <label style={{ fontSize: '12px', color: 'var(--text2)', display: 'block', marginBottom: '6px' }}>العملة</label>
                <select value={form.currency} onChange={e => setForm(f => ({ ...f, currency: e.target.value }))} style={{ width: '100%' }} disabled={!canManage}>
                  <option value="EGP">جنيه مصري (EGP)</option>
                  <option value="SAR">ريال سعودي (SAR)</option>
                  <option value="AED">درهم إماراتي (AED)</option>
                  <option value="QAR">ريال قطري (QAR)</option>
                  <option value="KWD">دينار كويتي (KWD)</option>
                  <option value="BHD">دينار بحريني (BHD)</option>
                  <option value="OMR">ريال عماني (OMR)</option>
                  <option value="USD">دولار (USD)</option>
                </select>
              </div>
              <div>
                <label style={{ fontSize: '12px', color: 'var(--text2)', display: 'block', marginBottom: '6px' }}>رقم الهاتف</label>
                <input value={form.phone} onInput={e => setForm(f => ({ ...f, phone: e.target.value }))} style={{ width: '100%' }} readOnly={!canManage} />
              </div>
              <div>
                <label style={{ fontSize: '12px', color: 'var(--text2)', display: 'block', marginBottom: '6px' }}>الإيميل</label>
                <input value={form.email} onInput={e => setForm(f => ({ ...f, email: e.target.value }))} style={{ width: '100%' }} readOnly={!canManage} />
              </div>
              <div>
                <label style={{ fontSize: '12px', color: 'var(--text2)', display: 'block', marginBottom: '6px' }}>السجل التجاري</label>
                <input value={form.commercialRegistration} onInput={e => setForm(f => ({ ...f, commercialRegistration: e.target.value }))} style={{ width: '100%' }} readOnly={!canManage} />
              </div>
              <div>
                <label style={{ fontSize: '12px', color: 'var(--text2)', display: 'block', marginBottom: '6px' }}>الرقم الضريبي</label>
                <input value={form.taxNumber} onInput={e => setForm(f => ({ ...f, taxNumber: e.target.value }))} style={{ width: '100%' }} readOnly={!canManage} />
              </div>
            </div>
            <div>
              <label style={{ fontSize: '12px', color: 'var(--text2)', display: 'block', marginBottom: '6px' }}>العنوان</label>
              <input value={form.address} onInput={e => setForm(f => ({ ...f, address: e.target.value }))} style={{ width: '100%' }} readOnly={!canManage} />
            </div>
          </div>
        </Section>

        <Section title="التهيئة">
          <div style={{ display: 'flex', flexDirection: 'column', gap: '14px' }}>
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px' }}>
              <div>
                <label style={{ fontSize: '12px', color: 'var(--text2)', display: 'block', marginBottom: '6px' }}>مظهر التطبيق</label>
                <select value={form.theme} onChange={e => setForm(f => ({ ...f, theme: e.target.value }))} style={{ width: '100%' }} disabled={!canManage}>
                  <option value="dark">داكن</option>
                  <option value="light">فاتح</option>
                </select>
              </div>
              <div>
                <label style={{ fontSize: '12px', color: 'var(--text2)', display: 'block', marginBottom: '6px' }}>نوع التقويم</label>
                <select value={form.calendarType} onChange={e => setForm(f => ({ ...f, calendarType: e.target.value }))} style={{ width: '100%' }} disabled={!canManage}>
                  <option value="gregorian">ميلادي</option>
                  <option value="hijri">هجري</option>
                </select>
              </div>
              <div>
                <label style={{ fontSize: '12px', color: 'var(--text2)', display: 'block', marginBottom: '6px' }}>نظام الوقت</label>
                <select value={form.timeFormat} onChange={e => setForm(f => ({ ...f, timeFormat: e.target.value }))} style={{ width: '100%' }} disabled={!canManage}>
                  <option value="12">12 ساعة (ص/م)</option>
                  <option value="24">24 ساعة (عسكري)</option>
                </select>
              </div>
              <div>
                <label style={{ fontSize: '12px', color: 'var(--text2)', display: 'block', marginBottom: '6px' }}>خط التطبيق (Google Fonts)</label>
                <select value={form.fontFamily} onChange={e => setForm(f => ({ ...f, fontFamily: e.target.value }))} style={{ width: '100%' }} disabled={!canManage}>
                  <option value="Cairo">Cairo (الافتراضي)</option>
                  <option value="Tajawal">Tajawal</option>
                  <option value="Almarai">Almarai</option>
                  <option value="El Messiri">El Messiri</option>
                  <option value="Rubik">Rubik</option>
                </select>
              </div>
            </div>
          </div>
        </Section>

        <Section title="الطباعة">
          <div style={{ display: 'flex', flexDirection: 'column', gap: '14px' }}>
            <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                <input type="checkbox" id="taxEnabled" checked={form.taxEnabled} onChange={e => setForm(f => ({ ...f, taxEnabled: e.target.checked }))} disabled={!canManage} />
                <label htmlFor="taxEnabled" style={{ fontSize: '14px', color: 'var(--text)', cursor: 'pointer' }}>تفعيل ضريبة القيمة المضافة</label>
              </div>
              {form.taxEnabled && (
                <div>
                  <label style={{ fontSize: '12px', color: 'var(--text2)', display: 'block', marginBottom: '6px' }}>نسبة الضريبة (%)</label>
                  <input type="number" placeholder="14" value={form.taxRate} onInput={e => setForm(f => ({ ...f, taxRate: Number(e.target.value) }))} style={{ width: '100%' }} readOnly={!canManage} />
                </div>
              )}
            </div>
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px' }}>
              <div>
                <label style={{ fontSize: '12px', color: 'var(--text2)', display: 'block', marginBottom: '6px' }}>حجم الطباعة الافتراضي</label>
                <select value={form.printDefaultSize} onChange={e => setForm(f => ({ ...f, printDefaultSize: e.target.value }))} style={{ width: '100%' }} disabled={!canManage}>
                  <option value="receipt">صغير (80mm)</option>
                  <option value="a4">كبير (A4)</option>
                </select>
              </div>
              <div>
                <label style={{ fontSize: '12px', color: 'var(--text2)', display: 'block', marginBottom: '6px' }}>وضع الطباعة</label>
                <select value={form.printColorMode} onChange={e => setForm(f => ({ ...f, printColorMode: e.target.value }))} style={{ width: '100%' }} disabled={!canManage}>
                  <option value="color">ألوان</option>
                  <option value="bw">أبيض وأسود فقط</option>
                </select>
              </div>
            </div>
            <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
              <input type="checkbox" id="printAfter" checked={form.printAfterPayment} onChange={e => setForm(f => ({ ...f, printAfterPayment: e.target.checked }))} disabled={!canManage} />
              <label htmlFor="printAfter" style={{ fontSize: '14px', color: 'var(--text)', cursor: 'pointer' }}>طباعة الفاتورة تلقائياً بعد الدفع</label>
            </div>
            <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
              <input type="checkbox" id="printDirectly" checked={form.printDirectly} onChange={e => setForm(f => ({ ...f, printDirectly: e.target.checked }))} disabled={!canManage} />
              <label htmlFor="printDirectly" style={{ fontSize: '14px', color: 'var(--text)', cursor: 'pointer' }}>طباعة مباشرة بدون نافذة اختيار الطابعة</label>
            </div>
            <div>
              <label style={{ fontSize: '12px', color: 'var(--text2)', display: 'block', marginBottom: '6px' }}>نص تذييل الفاتورة</label>
              <textarea value={form.receiptFooter} onInput={e => setForm(f => ({ ...f, receiptFooter: e.target.value }))} rows="2" readOnly={!canManage}
                style={{ width: '100%', background: 'var(--bg)', color: 'var(--text)', border: '1px solid var(--outline)', borderRadius: '8px', padding: '10px', resize: 'vertical' }} />
            </div>
          </div>
        </Section>
          </div>

        <Section title="الفاتورة">
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: '16px' }}>
            <div>
              <div style={{ fontSize: '13px', fontWeight: '700', color: 'var(--text)', marginBottom: '10px' }}>بيانات المتجر</div>
              <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
                <label style={{ display: 'flex', alignItems: 'center', gap: '6px', fontSize: '13px', cursor: 'pointer' }}>
                  <input type="checkbox" checked={form.showBusinessName} onChange={e => setForm(f => ({ ...f, showBusinessName: e.target.checked }))} /> اسم المتجر
                </label>
                <label style={{ display: 'flex', alignItems: 'center', gap: '6px', fontSize: '13px', cursor: 'pointer' }}>
                  <input type="checkbox" checked={form.showLogo} onChange={e => setForm(f => ({ ...f, showLogo: e.target.checked }))} /> الشعار
                </label>
                <label style={{ display: 'flex', alignItems: 'center', gap: '6px', fontSize: '13px', cursor: 'pointer' }}>
                  <input type="checkbox" checked={form.showPhone} onChange={e => setForm(f => ({ ...f, showPhone: e.target.checked }))} /> الهاتف
                </label>
                <label style={{ display: 'flex', alignItems: 'center', gap: '6px', fontSize: '13px', cursor: 'pointer' }}>
                  <input type="checkbox" checked={form.showEmail} onChange={e => setForm(f => ({ ...f, showEmail: e.target.checked }))} /> الإيميل
                </label>
                <label style={{ display: 'flex', alignItems: 'center', gap: '6px', fontSize: '13px', cursor: 'pointer' }}>
                  <input type="checkbox" checked={form.showAddress} onChange={e => setForm(f => ({ ...f, showAddress: e.target.checked }))} /> العنوان
                </label>
                <label style={{ display: 'flex', alignItems: 'center', gap: '6px', fontSize: '13px', cursor: 'pointer' }}>
                  <input type="checkbox" checked={form.showCommercialReg} onChange={e => setForm(f => ({ ...f, showCommercialReg: e.target.checked }))} /> السجل التجاري
                </label>
                <label style={{ display: 'flex', alignItems: 'center', gap: '6px', fontSize: '13px', cursor: 'pointer' }}>
                  <input type="checkbox" checked={form.showTaxReg} onChange={e => setForm(f => ({ ...f, showTaxReg: e.target.checked }))} /> الرقم الضريبي
                </label>
                <label style={{ display: 'flex', alignItems: 'center', gap: '6px', fontSize: '13px', cursor: 'pointer' }}>
                  <input type="checkbox" checked={form.showReceiptFooter} onChange={e => setForm(f => ({ ...f, showReceiptFooter: e.target.checked }))} /> التذييل
                </label>
              </div>
            </div>
            <div>
              <div style={{ fontSize: '13px', fontWeight: '700', color: 'var(--text)', marginBottom: '10px' }}>محتوى الفاتورة</div>
              <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
                <label style={{ display: 'flex', alignItems: 'center', gap: '6px', fontSize: '13px', cursor: 'pointer' }}>
                  <input type="checkbox" checked={form.showProductsTable} onChange={e => setForm(f => ({ ...f, showProductsTable: e.target.checked }))} /> جدول المنتجات
                </label>
                <label style={{ display: 'flex', alignItems: 'center', gap: '6px', fontSize: '13px', cursor: 'pointer' }}>
                  <input type="checkbox" checked={form.showTotals} onChange={e => setForm(f => ({ ...f, showTotals: e.target.checked }))} /> الإجماليات
                </label>
                <label style={{ display: 'flex', alignItems: 'center', gap: '6px', fontSize: '13px', cursor: 'pointer' }}>
                  <input type="checkbox" checked={form.showPaid} onChange={e => setForm(f => ({ ...f, showPaid: e.target.checked }))} /> المدفوع
                </label>
                <label style={{ display: 'flex', alignItems: 'center', gap: '6px', fontSize: '13px', cursor: 'pointer' }}>
                  <input type="checkbox" checked={form.showCashier} onChange={e => setForm(f => ({ ...f, showCashier: e.target.checked }))} /> الكاشير
                </label>
                <label style={{ display: 'flex', alignItems: 'center', gap: '6px', fontSize: '13px', cursor: 'pointer' }}>
                  <input type="checkbox" checked={form.showNotes} onChange={e => setForm(f => ({ ...f, showNotes: e.target.checked }))} /> الملاحظات
                </label>
              </div>
            </div>
            <div>
              <div style={{ fontSize: '13px', fontWeight: '700', color: 'var(--text)', marginBottom: '10px' }}>بيانات العميل والمورد</div>
              <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
                <label style={{ display: 'flex', alignItems: 'center', gap: '6px', fontSize: '13px', cursor: 'pointer' }}>
                  <input type="checkbox" checked={form.showClientInfo} onChange={e => setForm(f => ({ ...f, showClientInfo: e.target.checked }))} /> بيانات العميل
                </label>
                <label style={{ display: 'flex', alignItems: 'center', gap: '6px', fontSize: '13px', cursor: 'pointer' }}>
                  <input type="checkbox" checked={form.showSupplierInfo} onChange={e => setForm(f => ({ ...f, showSupplierInfo: e.target.checked }))} /> بيانات المورد
                </label>
              </div>
            </div>
          </div>
        </Section>

        {canManage && <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '16px' }}>
        <Section title="البيانات">
          <div style={{ display: 'flex', gap: '12px' }}>
            <button type="button" onClick={handleBackupExport} style={{ flex: 1, background: 'var(--accent)', color: '#fff', padding: '12px', borderRadius: '12px', fontSize: '14px', fontWeight: '500' }}>تصدير نسخة احتياطية</button>
            <button type="button" onClick={handleBackupRestore} style={{ flex: 1, background: 'var(--warning)', color: '#fff', padding: '12px', borderRadius: '12px', fontSize: '14px', fontWeight: '500' }}>استعادة نسخة احتياطية</button>
          </div>
          <button type="button" onClick={handleBackupReset} style={{ marginTop: '12px', width: '100%', background: 'var(--danger)', color: '#fff', padding: '12px', borderRadius: '12px', fontSize: '14px', fontWeight: '500' }}>
            إعادة تعيين البيانات
          </button>
          <div style={{ borderTop: '1px solid var(--bg3)', margin: '16px 0 12px' }}></div>
          <div style={{ fontSize: '13px', fontWeight: 'bold', marginBottom: '10px', color: 'var(--text)' }}>النسخ الاحتياطي التلقائي</div>
          <div style={{ display: 'flex', flexDirection: 'column', gap: '12px', background: 'var(--bg)', padding: '14px', borderRadius: '12px', border: '1px solid var(--outline)' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
              <input type="checkbox" id="autoBackup" checked={form.autoBackup} onChange={e => { setForm(f => ({ ...f, autoBackup: e.target.checked })); markSettingsDirty(true) }} />
              <label htmlFor="autoBackup" style={{ fontSize: '14px', color: 'var(--text)', cursor: 'pointer', fontWeight: '600' }}>تفعيل النسخ الاحتياطي التلقائي</label>
            </div>
            {form.autoBackup && (
              <div style={{ display: 'flex', flexDirection: 'column', gap: '10px', marginTop: '4px' }}>
                <div>
                  <label style={{ fontSize: '12px', color: 'var(--text2)', display: 'block', marginBottom: '6px' }}>مدة التكرار</label>
                  <select value={form.autoBackupInterval} onChange={e => { setForm(f => ({ ...f, autoBackupInterval: e.target.value })); markSettingsDirty(true) }} style={{ width: '100%' }}>
                    <option value="daily">يومياً</option><option value="weekly">أسبوعياً</option><option value="monthly">شهرياً</option>
                  </select>
                </div>
                <div>
                  <label style={{ fontSize: '12px', color: 'var(--text2)', display: 'block', marginBottom: '6px' }}>مكان الحفظ</label>
                  <div style={{ display: 'flex', gap: '8px' }}>
                    <input type="text" readOnly placeholder="Documents/SMART X Backups" value={form.autoBackupPath || ''} style={{ flex: 1, fontSize: '12px', background: 'var(--bg2)', color: 'var(--text2)', padding: '8px 12px', borderRadius: '8px', border: '1px solid var(--outline)' }} />
                    <button type="button" onClick={handleSelectBackupFolder} style={{ background: 'var(--accent)', color: '#fff', padding: '8px 14px', borderRadius: '8px', fontSize: '12px', fontWeight: 'bold', border: 'none', cursor: 'pointer' }}>
                      اختيار
                    </button>
                  </div>
                </div>
              </div>
            )}
            {settingsDirty && (
              <button type="button" onClick={saveSettingsNow} style={{ marginTop: '8px', background: 'var(--success)', color: '#fff', padding: '10px', borderRadius: '8px', fontSize: '13px', fontWeight: 'bold', border: 'none', cursor: 'pointer' }}>
                حفظ
              </button>
            )}
          </div>
        </Section>
        <Section title="التحديثات">
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '10px' }}>
            <span style={{ fontSize: '13px', fontWeight: 'bold', color: 'var(--text)' }}>تحديث التطبيق</span>
            <span style={{ fontSize: '12px', color: 'var(--text2)' }}>{appVersion || ''}</span>
          </div>
          <button type="button" onClick={handleCheckUpdates} disabled={checkingUpdate} style={{ width: '100%', background: 'var(--bg3)', color: 'var(--text)', padding: '12px', borderRadius: '12px', fontSize: '14px', fontWeight: '500' }}>
            {checkingUpdate ? 'جاري التحقق...' : 'التحقق من وجود تحديثات'}
          </button>
        </Section>
        </div>}

        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '16px' }}>
        <Section title="الترخيص">
          <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
            <div style={{ background: 'var(--bg)', borderRadius: '10px', padding: '14px', border: '1px solid var(--outline)' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '10px' }}>
                <span style={{ fontSize: '13px', fontWeight: '700', color: 'var(--text)' }}>حالة الترخيص</span>
                <span style={{ fontSize: '12px', padding: '4px 10px', borderRadius: '6px', fontWeight: '600',
                  background: licenseStatus?.activated ? 'rgba(16,185,129,0.15)' : 'rgba(239,68,68,0.15)',
                  color: licenseStatus?.activated ? 'var(--success)' : 'var(--danger)'
                }}>
                  {licenseStatus?.activated ? 'مفعل' : licenseStatus?.trialUsed ? 'تجريبي' : 'غير مفعل'}
                </span>
              </div>
              {licenseStatus?.activated && (
                <>
                  <div style={{ fontSize: '12px', color: 'var(--text2)', marginBottom: '4px' }}>
                    <span style={{ fontWeight: '600', color: 'var(--text)' }}>المفتاح: </span>{licenseStatus.activatedKey}
                  </div>
                  <div style={{ fontSize: '12px', color: 'var(--text2)', marginBottom: '4px' }}>
                    <span style={{ fontWeight: '600', color: 'var(--text)' }}>النوع: </span>
                    {licenseStatus.licenseType === 'lifetime' ? 'مدى الحياة' : licenseStatus.licenseType === 'year' ? 'سنوي' :
                     licenseStatus.licenseType === 'half_year' ? 'نصف سنوي' : licenseStatus.licenseType === 'quarter' ? 'ربع سنوي' : 'شهري'}
                  </div>
                  {licenseStatus.expiresAt && (
                    <div style={{ fontSize: '12px', color: 'var(--text2)', marginBottom: '4px' }}>
                      <span style={{ fontWeight: '600', color: 'var(--text)' }}>تاريخ الانتهاء: </span>{formatDate(licenseStatus.expiresAt)}
                    </div>
                  )}
                  {licenseStatus.remainingText && (
                    <div style={{ fontSize: '12px', marginTop: '6px', padding: '6px 10px', borderRadius: '6px', fontWeight: '600',
                      background: licenseStatus.remainingDays !== null && licenseStatus.remainingDays <= 7 ? 'rgba(239,68,68,0.15)' : 'rgba(16,185,129,0.15)',
                      color: licenseStatus.remainingDays !== null && licenseStatus.remainingDays <= 7 ? 'var(--danger)' : 'var(--success)'
                    }}>{licenseStatus.remainingText}</div>
                  )}
                </>
              )}
            </div>
            <div style={{ display: 'flex', gap: '8px' }}>
              <button type="button" onClick={handleRefreshLicense} disabled={refreshingLicense} style={{
                flex: 1, background: 'var(--accent)', color: '#fff', padding: '10px', borderRadius: '8px', fontSize: '13px', fontWeight: '600'
              }}>
                {refreshingLicense ? 'جاري...' : 'تحديث'}
              </button>
              {!licenseStatus?.activated && (
                <button type="button" onClick={() => setShowLicenseModal(true)} style={{
                  flex: 1, background: 'var(--bg3)', color: 'var(--text)', padding: '10px', borderRadius: '8px', fontSize: '13px', fontWeight: '600'
                }}>
                  تفعيل
                </button>
              )}
            </div>
          </div>
        </Section>

        <Section title="الدعم الفني">
          {contact.length > 0 ? (
            <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
              {contact.filter(i => i.label !== 'WhatsApp' && i.label !== 'Email').map((item, i) => (
                <div key={i} style={{ display: 'flex', alignItems: 'center', gap: '12px', fontSize: '14px', padding: '10px 14px', background: 'var(--bg)', borderRadius: '10px', border: '1px solid var(--outline)' }}>
                  <span style={{ color: 'var(--text2)', minWidth: '80px' }}>{item.label}:</span>
                  <span style={{ color: 'var(--text)', fontWeight: '500' }}>{item.value}</span>
                  {item.link && (
                    <button type="button" onClick={() => window.open(item.link, '_blank')} style={{ marginRight: 'auto', background: 'var(--bg3)', color: 'var(--accent)', padding: '6px 12px', borderRadius: '6px', fontSize: '12px', fontWeight: '600' }}>
                      فتح الرابط
                    </button>
                  )}
                </div>
              ))}
            </div>
          ) : (
            <div style={{ color: 'var(--text2)', fontSize: '13px' }}>بيانات التواصل غير متوفرة حالياً</div>
          )}
        </Section>
        </div>

        <ActivateLicenseModal
          open={showLicenseModal}
          onClose={() => setShowLicenseModal(false)}
          onActivated={() => { handleRefreshLicense(); refreshLicense() }}
        />

        {canManage && <button type="submit" style={{ width: '100%', background: 'var(--accent)', color: '#fff', padding: '14px', borderRadius: '12px', fontSize: '16px', fontWeight: '700', boxShadow: '0 4px 12px rgba(var(--accent-rgb), 0.2)' }}>
          حفظ الإعدادات
        </button>}
          </div>
      </form>
      {/* Update modals */}
      <Modal open={!!updateModal} onClose={() => { if (updateModal?.type !== 'downloading') setUpdateModal(null) }} title="تحديث التطبيق" width="420px">
        {updateModal?.type === 'available' && (
          <div style={{ display: 'flex', flexDirection: 'column', gap: '14px', textAlign: 'center' }}>
            <div style={{ fontSize: '13px', color: 'var(--text2)', lineHeight: 1.8 }}>
              يوجد تحديث جديد. يفضل أخذ نسخة احتياطية قبل التحديث لتجنب فقدان البيانات في حالة حدوث خطأ.
            </div>
            <button onClick={handleDownloadUpdate} style={{ background: 'var(--accent)', color: '#fff', padding: '12px', borderRadius: '10px', fontSize: '14px', fontWeight: '600' }}>
              تحميل التحديث
            </button>
            <button onClick={() => setUpdateModal(null)} style={{ background: 'var(--bg3)', color: 'var(--text)', padding: '10px', borderRadius: '10px', fontSize: '13px' }}>
              لاحقاً
            </button>
          </div>
        )}
        {updateModal?.type === 'downloaded' && (
          <div style={{ display: 'flex', flexDirection: 'column', gap: '14px', textAlign: 'center' }}>
            <div style={{ fontSize: '40px' }}>✅</div>
            <div style={{ fontSize: '13px', color: 'var(--text2)', lineHeight: 1.8 }}>
              تم تحميل التحديث بنجاح. هل تريد إعادة التشغيل الآن لتثبيته؟
            </div>
            <button onClick={handleInstallUpdate} style={{ background: 'var(--accent)', color: '#fff', padding: '12px', borderRadius: '10px', fontSize: '14px', fontWeight: '600' }}>
              إعادة التشغيل والتحديث
            </button>
            <button onClick={() => setUpdateModal(null)} style={{ background: 'var(--bg3)', color: 'var(--text)', padding: '10px', borderRadius: '10px', fontSize: '13px' }}>
              لاحقاً
            </button>
          </div>
        )}
        {updateModal?.type === 'error' && (
          <div style={{ display: 'flex', flexDirection: 'column', gap: '14px', textAlign: 'center' }}>
            <div style={{ fontSize: '13px', color: 'var(--danger)', lineHeight: 1.8 }}>
              {updateModal.message || 'حدث خطأ أثناء التحقق من التحديثات'}
            </div>
            <button onClick={() => setUpdateModal(null)} style={{ background: 'var(--bg3)', color: 'var(--text)', padding: '10px', borderRadius: '10px', fontSize: '13px' }}>
              إغلاق
            </button>
          </div>
        )}
      </Modal>
      <ConfirmDialog />
    </div>
  )
}

function Section({ title, children }) {
  return (
    <div style={{ background: 'var(--bg2)', borderRadius: '16px', padding: '20px', border: '1px solid var(--outline)', boxShadow: '0 2px 8px rgba(0,0,0,0.05)' }}>
      <div style={{ fontSize: '14px', fontWeight: '700', color: 'var(--text)', marginBottom: '16px', display: 'flex', alignItems: 'center', gap: '8px' }}>
        <span style={{ width: '4px', height: '14px', background: 'var(--accent)', borderRadius: '2px', display: 'inline-block' }}></span>
        {title}
      </div>
      {children}
    </div>
  )
}
