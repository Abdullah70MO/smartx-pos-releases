import { useState, useEffect, useRef } from 'preact/hooks'
import api from '../api'
import Modal from '../components/Modal'
import { useToast } from '../components/Toast'
import { useStore } from '../store'
import { useConfirm } from '../components/ConfirmModal'
import { formatDate } from '../utils/date'
import ActivateLicenseModal from '../components/ActivateLicenseModal'
import BarcodeSVG from '../components/BarcodeSVG'
import PrintTemplateThermal from '../components/PrintTemplateThermal'
import PrintTemplateA4 from '../components/PrintTemplateA4'
import StatementThermal from '../components/StatementThermal'
import StatementA4 from '../components/StatementA4'
import { renderThermalHtml, renderA4Html, printBarcode } from '../utils/print'
import { formatMoney } from '../utils/money'

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
  const [selectedSection, setSelectedSection] = useState(null)
  const [checkingUpdate, setCheckingUpdate] = useState(false)
  const [appVersion, setAppVersion] = useState('')
  const [licenseStatus, setLicenseStatus] = useState(null)
  const [refreshingLicense, setRefreshingLicense] = useState(false)
  const [printers, setPrinters] = useState([])
  const [barcodePreview, setBarcodePreview] = useState('')
  const [barcodeLabel, setBarcodeLabel] = useState('50x30')
  const [barcodeLabelWidth, setBarcodeLabelWidth] = useState('50')
  const [barcodeLabelHeight, setBarcodeLabelHeight] = useState('30')
  const [barcodeSearch, setBarcodeSearch] = useState('')
  const [barcodeProducts, setBarcodeProducts] = useState([])
  const [barcodeSelectedProduct, setBarcodeSelectedProduct] = useState(null)
  const [barcodeSearchLoading, setBarcodeSearchLoading] = useState(false)
  const barcodeSearchTimer = useRef(null)
  const [invoicePreviewIsA4, setInvoicePreviewIsA4] = useState(false)
  const [previewDocType, setPreviewDocType] = useState('sale')

  const settingsSections = [
    { id: 'store', title: 'بيانات المتجر', description: 'الشعار، اسم المتجر، الهاتف، الإيميل، السجل التجاري، الرقم الضريبي، العنوان' },
    { id: 'config', title: 'التهيئة', description: 'مظهر التطبيق، التقويم، الوقت، الخطوط، العملة، الضريبة' },
    { id: 'printing', title: 'الطباعة', description: 'الطابعة الافتراضية، مقاسات الطباعة، تذييل الفاتورة' },
    { id: 'barcode', title: 'الباركود', description: 'طابعة الباركود، مقاسات اللاصقة، المعاينة' },
    { id: 'invoice', title: 'الفاتورة', description: 'إظهار وإخفاء عناصر الفاتورة' },
    { id: 'notifications', title: 'الإشعارات', description: 'تفعيل/تعطيل أنواع الإشعارات (مخزون، مبيعات، مدفوعات، مرتجعات، ورديات)' },
    { id: 'data', title: 'البيانات', description: 'النسخ الاحتياطي، الاستعادة، إعادة التعيين', adminOnly: true },
    { id: 'updates', title: 'التحديثات', description: 'التحقق من تحديثات التطبيق', adminOnly: true },
    { id: 'license', title: 'الترخيص', description: 'حالة الترخيص، التفعيل' },
    { id: 'support', title: 'الدعم الفني', description: 'بيانات التواصل' }
  ]

  const sectionColors = { store: 'var(--accent)', config: 'var(--secondary)', printing: 'var(--teal)', barcode: 'var(--special)', invoice: 'var(--special)', data: 'var(--success)', updates: 'var(--warning)', license: 'var(--accent)', support: 'var(--secondary)', notifications: 'var(--teal)' }
  const sectionIcons = {
  store: <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" style={{ width: '22px', height: '22px' }}><path d="M3 9l9-7 9 7v11a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2z"/><polyline points="9 22 9 12 15 12 15 22"/></svg>,
  config: <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" style={{ width: '22px', height: '22px' }}><circle cx="12" cy="12" r="3"/><path d="M19.4 15a1.65 1.65 0 0 0 .33 1.82l.06.06a2 2 0 0 1-2.83 2.83l-.06-.06a1.65 1.65 0 0 0-1.82-.33 1.65 1.65 0 0 0-1 1.51V21a2 2 0 0 1-4 0v-.09A1.65 1.65 0 0 0 9 19.4a1.65 1.65 0 0 0-1.82.33l-.06.06a2 2 0 0 1-2.83-2.83l.06-.06A1.65 1.65 0 0 0 4.68 15a1.65 1.65 0 0 0-1.51-1H3a2 2 0 0 1 0-4h.09A1.65 1.65 0 0 0 4.6 9a1.65 1.65 0 0 0-.33-1.82l-.06-.06a2 2 0 0 1 2.83-2.83l.06.06A1.65 1.65 0 0 0 9 4.68a1.65 1.65 0 0 0 1-1.51V3a2 2 0 0 1 4 0v.09a1.65 1.65 0 0 0 1 1.51 1.65 1.65 0 0 0 1.82-.33l.06-.06a2 2 0 0 1 2.83 2.83l-.06.06A1.65 1.65 0 0 0 19.4 9a1.65 1.65 0 0 0 1.51 1H21a2 2 0 0 1 0 4h-.09a1.65 1.65 0 0 0-1.51 1z"/></svg>,
  printing: <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" style={{ width: '22px', height: '22px' }}><polyline points="6 9 6 2 18 2 18 9"/><path d="M6 18H4a2 2 0 0 1-2-2v-5a2 2 0 0 1 2-2h16a2 2 0 0 1 2 2v5a2 2 0 0 1-2 2h-2"/><rect x="6" y="14" width="12" height="8"/></svg>,
  barcode: <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" style={{ width: '22px', height: '22px' }}><path d="M2 4v16"/><path d="M4 4v16"/><path d="M7 4v16"/><path d="M9 4v16"/><path d="M12 4v16"/><path d="M15 4v16"/><path d="M18 4v16"/><path d="M20 4v16"/><path d="M22 4v16"/></svg>,
  invoice: <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" style={{ width: '22px', height: '22px' }}><path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"/><polyline points="14 2 14 8 20 8"/><line x1="8" y1="13" x2="16" y2="13"/><line x1="8" y1="17" x2="16" y2="17"/></svg>,
  data: <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" style={{ width: '22px', height: '22px' }}><ellipse cx="12" cy="5" rx="9" ry="3"/><path d="M21 12c0 1.66-4 3-9 3s-9-1.34-9-3"/><path d="M3 5v14c0 1.66 4 3 9 3s9-1.34 9-3V5"/></svg>,
  updates: <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" style={{ width: '22px', height: '22px' }}><polyline points="23 4 23 10 17 10"/><path d="M20.49 15a9 9 0 1 1-2.12-9.36L23 10"/></svg>,
  license: <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" style={{ width: '22px', height: '22px' }}><path d="M21 2l-2 2m-7.61 7.61a5.5 5.5 0 1 1-7.778 7.778 5.5 5.5 0 0 1 7.777-7.777zm0 0L15.5 7.5m0 0l3 3L22 7l-3-3m-3.5 3.5L19 4"/></svg>,
  support: <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" style={{ width: '22px', height: '22px' }}><path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z"/></svg>,
  notifications: <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" style={{ width: '22px', height: '22px' }}><path d="M18 8A6 6 0 0 0 6 8c0 7-3 9-3 9h18s-3-2-3-9"/><path d="M13.73 21a2 2 0 0 1-3.46 0"/></svg>
}

  const NOTIFICATION_TYPES = [
    { key: 'notificationLowStock', label: 'تنبيه نقص المخزون', description: 'عند وصول منتج لحد التنبيه', icon: <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" style={{ width: '16px', height: '16px' }}><path d="M10.29 3.86L1.82 18a2 2 0 0 0 1.71 3h16.94a2 2 0 0 0 1.71-3L13.71 3.86a2 2 0 0 0-3.42 0z"/><line x1="12" y1="9" x2="12" y2="13"/><line x1="12" y1="17" x2="12.01" y2="17"/></svg> },
    { key: 'notificationSales', label: 'إشعار المبيعات', description: 'عند إتمام عملية بيع', icon: <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" style={{ width: '16px', height: '16px' }}><line x1="12" y1="1" x2="12" y2="23"/><path d="M17 5H9.5a3.5 3.5 0 0 0 0 7h5a3.5 3.5 0 0 1 0 7H6"/></svg> },
    { key: 'notificationPayments', label: 'إشعار المدفوعات', description: 'سداد عملاء أو موردين', icon: <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" style={{ width: '16px', height: '16px' }}><rect x="1" y="4" width="22" height="16" rx="2" ry="2"/><line x1="1" y1="10" x2="23" y2="10"/></svg> },
    { key: 'notificationReturns', label: 'إشعار المرتجعات', description: 'عند عمل مرتجع منتجات', icon: <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" style={{ width: '16px', height: '16px' }}><polyline points="1 4 1 10 7 10"/><path d="M3.51 15a9 9 0 1 0 2.13-9.36L1 10"/></svg> },
    { key: 'notificationShifts', label: 'إشعارات النجاح', description: 'إغلاق وردية، عمليات ناجحة', icon: <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" style={{ width: '16px', height: '16px' }}><path d="M22 11.08V12a10 10 0 1 1-5.93-9.14"/><polyline points="22 4 12 14.01 9 11.01"/></svg> },
    { key: 'notificationExpiry', label: 'تنبيه انتهاء الصلاحية', description: 'عند اقتراب صلاحية منتج', icon: <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" style={{ width: '16px', height: '16px' }}><circle cx="12" cy="12" r="10"/><polyline points="12 6 12 12 16 14"/></svg> },
  ]

  useEffect(() => { load() }, [])

  useEffect(() => {
    registerSettingsLeaveAction(saveSettingsNow)
    return () => registerSettingsLeaveAction(null)
  }, [form, initialForm])

  useEffect(() => {
    if (!initialForm) return
    markSettingsDirty(JSON.stringify(form) !== JSON.stringify(initialForm))
  }, [form, initialForm])

  // Barcode product search
  useEffect(() => {
    if (!barcodeSearch.trim() || barcodeSelectedProduct) { setBarcodeProducts([]); return }
    clearTimeout(barcodeSearchTimer.current)
    barcodeSearchTimer.current = setTimeout(async () => {
      setBarcodeSearchLoading(true)
      try {
        const res = await api.listProducts(localStorage.getItem('token'), barcodeSearch, null, 0, 10)
        setBarcodeProducts(res.data || [])
      } catch { setBarcodeProducts([]) }
      setBarcodeSearchLoading(false)
    }, 300)
    return () => clearTimeout(barcodeSearchTimer.current)
  }, [barcodeSearch, barcodeSelectedProduct])

  // Load font dynamically for preview
  useEffect(() => {
    const font = form.fontFamily
    if (!font) return
    const id = '__gf-preview-' + font.replace(/\s+/g, '-')
    if (!document.getElementById(id)) {
      const link = document.createElement('link')
      link.id = id
      link.rel = 'stylesheet'
      link.href = `https://fonts.googleapis.com/css2?family=${encodeURIComponent(font)}:wght@300;400;500;600;700;800&display=swap`
      document.head.appendChild(link)
    }
  }, [form.fontFamily])

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
          showQR: s.showQR !== false,
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
          printDirectly: s.printDirectly === true,
          thermalPaperSize: s.thermalPaperSize || '80mm',
          customPaperWidth: s.customPaperWidth || '',
          customPaperHeight: s.customPaperHeight || '',
          defaultPrinter: s.defaultPrinter || '',
          barcodePrinter: s.barcodePrinter || '',
          barcodeLabelSize: s.barcodeLabelSize || '50x30',
          barcodeShowName: s.barcodeShowName !== false,
          barcodeShowPrice: s.barcodeShowPrice !== false,
          barcodeScale: s.barcodeScale ?? 1.0,
          barcodeFontWeight: s.barcodeFontWeight || 'bold',
          autoBackup: s.autoBackup || false,
          autoBackupInterval: s.autoBackupInterval || 'weekly',
          autoBackupPath: s.autoBackupPath || '',
          notificationLowStock: s.notificationLowStock !== false,
          notificationSales: s.notificationSales !== false,
          notificationPayments: s.notificationPayments !== false,
          notificationReturns: s.notificationReturns !== false,
          notificationShifts: s.notificationShifts !== false,
          notificationExpiry: s.notificationExpiry !== false
        }
        setInitialForm(loadedForm)
        setForm(loadedForm)
        const labelSize = s.barcodeLabelSize || '50x30'
        setBarcodeLabel(labelSize)
        const parts = labelSize.split('x').map(Number)
        setBarcodeLabelWidth(String(parts[0] || 50))
        setBarcodeLabelHeight(String(parts[1] || 30))
        markSettingsDirty(false)
      }
      setContact(c || [])
    } catch {}
    try {
      const printerList = await api.listPrinters()
      if (printerList) setPrinters(printerList)
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
      if (status.type === 'available') {
        setUpdateStatus(null)
        setCheckingUpdate(false)
        setUpdateModal({ type: 'available', info: status.info })
      } else if (status.type === 'not-available') {
        setUpdateStatus({ type: 'not-available' })
        setCheckingUpdate(false)
      } else if (status.type === 'downloaded') {
        setUpdateModal({ type: 'downloaded' })
        toast('تم تحميل التحديث', 'success')
      } else if (status.type === 'error') {
        setUpdateStatus({ type: 'error', message: status.message })
        setCheckingUpdate(false)
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
      setUpdateStatus({ type: 'error', message: err.message })
      setCheckingUpdate(false)
    }
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
      localStorage.setItem('defaultPrinter', nextForm.defaultPrinter || '')
      localStorage.setItem('thermalPaperSize', nextForm.thermalPaperSize || '80mm')
      localStorage.setItem('printDefaultSize', nextForm.printDefaultSize || 'receipt')
      localStorage.setItem('customPaperWidth', nextForm.customPaperWidth || '')
      localStorage.setItem('customPaperHeight', nextForm.customPaperHeight || '')
      localStorage.setItem('barcodePrinter', nextForm.barcodePrinter || '')
      localStorage.setItem('barcodeLabelSize', nextForm.barcodeLabelSize || '50x30')
      localStorage.setItem('barcodeShowName', nextForm.barcodeShowName !== false ? 'true' : 'false')
      localStorage.setItem('barcodeShowPrice', nextForm.barcodeShowPrice !== false ? 'true' : 'false')
      localStorage.setItem('barcodeScale', String(nextForm.barcodeScale ?? 1.0))
      localStorage.setItem('barcodeFontWeight', nextForm.barcodeFontWeight || 'bold')
      localStorage.setItem('showQR', nextForm.showQR !== false ? 'true' : 'false')
      localStorage.setItem('fontFamily', nextForm.fontFamily || 'Cairo')
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
      <div style={{ display: 'flex', alignItems: 'center', gap: '12px', marginBottom: '24px' }}>
        {selectedSection && (
          <button type="button" onClick={() => setSelectedSection(null)} style={{
            background: 'var(--bg3)', color: 'var(--text)', padding: '8px 14px', borderRadius: '10px', fontSize: '14px', fontWeight: '700',
            display: 'flex', alignItems: 'center', gap: '6px'
          }}>
            ← رجوع
          </button>
        )}
        <h1 style={{ fontSize: '22px', fontWeight: '700', color: 'var(--text)' }}>الإعدادات</h1>
        <div style={{ flex: 1 }}></div>
        {canManage && form?.businessName !== undefined && !['updates', 'license', 'support'].includes(selectedSection || '') && (
          <button type="button" onClick={saveSettingsNow} style={{
            background: 'var(--accent)', color: '#fff', padding: '10px 20px', borderRadius: '10px', fontSize: '14px', fontWeight: '700',
            boxShadow: '0 4px 12px rgba(var(--accent-rgb), 0.2)'
          }}>
            حفظ الإعدادات
          </button>
        )}
      </div>

      {!selectedSection ? (
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(250px, 1fr))', gap: '16px' }}>
          {settingsSections.filter(s => !s.adminOnly || canManage).map(section => (
            <div key={section.id} onClick={() => setSelectedSection(section.id)}
              style={{
                background: 'var(--bg2)', borderRadius: '16px', padding: '24px',
                border: '1px solid var(--outline)', cursor: 'pointer',
                transition: 'all 0.25s cubic-bezier(0.4, 0, 0.2, 1)',
                boxShadow: 'var(--elevation-1)',
              }}
              onMouseEnter={e => { e.currentTarget.style.boxShadow = 'var(--elevation-2)'; e.currentTarget.style.borderColor = 'var(--accent)' }}
              onMouseLeave={e => { e.currentTarget.style.boxShadow = 'var(--elevation-1)'; e.currentTarget.style.borderColor = 'var(--outline)' }}
              role="button" tabIndex={0}
              onKeyDown={e => { if (e.key === 'Enter') setSelectedSection(section.id) }}
            >
              <div style={{
                width: '48px', height: '48px', borderRadius: '14px',
                background: sectionColors[section.id],
                display: 'flex', alignItems: 'center', justifyContent: 'center',
                color: '#fff', fontWeight: '700', fontSize: '22px', marginBottom: '14px'
              }}>
                {sectionIcons[section.id]}
              </div>
              <div style={{ fontSize: '15px', fontWeight: '700', color: 'var(--text)', marginBottom: '8px' }}>
                {section.title}
              </div>
              <div style={{ fontSize: '12px', color: 'var(--text2)', lineHeight: 1.6 }}>
                {section.description}
              </div>
            </div>
          ))}
        </div>
      ) : (
        <form onSubmit={handleSave}>
          <div style={{ width: '100%' }}>
            <Section title={settingsSections.find(s => s.id === selectedSection)?.title}>
              {selectedSection === 'store' && (
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
              )}

              {selectedSection === 'config' && (
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
                        <option value="Noto Naskh Arabic">Noto Naskh Arabic</option>
                        <option value="Alexandria">Alexandria</option>
                        <option value="Readex Pro">Readex Pro</option>
                        <option value="IBM Plex Sans Arabic">IBM Plex Sans Arabic</option>
                        <option value="Amiri">Amiri</option>
                        <option value="Scheherazade New">Scheherazade New</option>
                        <option value="Lateef">Lateef</option>
                        <option value="Reem Kufi">Reem Kufi</option>
                        <option value="Noto Sans Arabic">Noto Sans Arabic</option>
                        <option value="Changa">Changa</option>
                        <option value="Mada">Mada</option>
                        <option value="Markazi Text">Markazi Text</option>
                        <option value="Mirza">Mirza</option>
                        <option value="Kufam">Kufam</option>
                        <option value="Vazirmatn">Vazirmatn</option>
                        <option value="Gulzar">Gulzar</option>
                        <option value="Baloo Bhaijaan 2">Baloo Bhaijaan 2</option>
                        <option value="Jomhuria">Jomhuria</option>
                        <option value="Rakkas">Rakkas</option>
                        <option value="Katibeh">Katibeh</option>
                        <option value="Ruwudu">Ruwudu</option>
                      </select>
                      <div style={{
                        marginTop: '8px', padding: '12px', borderRadius: '8px',
                        background: 'var(--bg1)', border: '1px solid var(--bg3)',
                        fontFamily: form.fontFamily ? `"${form.fontFamily}", Tahoma, Arial, sans-serif` : 'Tahoma, Arial, sans-serif',
                        fontSize: '16px', color: 'var(--text)', textAlign: 'center',
                        transition: 'font-family 0.3s'
                      }}>
                        <div style={{ fontSize: '13px', fontWeight: '700', marginBottom: '4px' }}>{form.fontFamily}</div>
                        <div style={{ fontSize: '14px' }}>نص تجريبي — Smart X Point of Sale</div>
                        <div style={{ fontSize: '12px', color: 'var(--text2)', marginTop: '4px' }}>الأرقام: 0123456789</div>
                      </div>
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
                  </div>
                  <div style={{ borderTop: '1px solid var(--bg3)', margin: '8px 0 4px' }}></div>
                  <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                      <input type="checkbox" id="taxEnabled" checked={form.taxEnabled} onChange={e => setForm(f => ({ ...f, taxEnabled: e.target.checked }))} disabled={!canManage} />
                      <label htmlFor="taxEnabled" style={{ fontSize: '14px', color: 'var(--text)', cursor: 'pointer' }}>تفعيل ضريبة القيمة المضافة</label>
                    </div>
                    {form.taxEnabled && (
                      <div>
                        <label style={{ fontSize: '12px', color: 'var(--text2)', display: 'block', marginBottom: '6px' }}>نسبة الضريبة (%)</label>
                        <input type="number" step="any" placeholder="14" value={form.taxRate} onInput={e => setForm(f => ({ ...f, taxRate: Number(e.target.value) }))} style={{ width: '100%' }} readOnly={!canManage} />
                      </div>
                    )}
                  </div>
                </div>
              )}

              {selectedSection === 'printing' && (
                <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
                  <div style={{ borderBottom: '1px solid var(--bg3)', paddingBottom: '8px' }}>
                    <div style={{ fontSize: '13px', fontWeight: '700', color: 'var(--text)', marginBottom: '12px' }}>الطابعات</div>
                    <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px' }}>
                      <div>
                        <label style={{ fontSize: '12px', color: 'var(--text2)', display: 'block', marginBottom: '6px' }}>الطابعة الافتراضية (الفواتير)</label>
                        <select value={form.defaultPrinter} onChange={e => setForm(f => ({ ...f, defaultPrinter: e.target.value }))} style={{ width: '100%' }} disabled={!canManage}>
                          <option value="">إفتراضي (النظام)</option>
                          {printers.map(p => <option key={p.name} value={p.name}>{p.name}{p.isDefault ? ' (إفتراضية)' : ''}</option>)}
                        </select>
                      </div>
                    </div>
                    {printers.length === 0 && <div style={{ fontSize: '11px', color: 'var(--text2)', marginTop: '6px' }}>جاري تحميل قائمة الطابعات...</div>}
                  </div>

                  <div style={{ borderBottom: '1px solid var(--bg3)', paddingBottom: '8px' }}>
                    <div style={{ fontSize: '13px', fontWeight: '700', color: 'var(--text)', marginBottom: '12px' }}>حجم الطباعة</div>
                    <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px' }}>
                      <div>
                        <label style={{ fontSize: '12px', color: 'var(--text2)', display: 'block', marginBottom: '6px' }}>حجم الفاتورة الافتراضي</label>
                        <select value={form.printDefaultSize} onChange={e => setForm(f => ({ ...f, printDefaultSize: e.target.value }))} style={{ width: '100%' }} disabled={!canManage}>
                          <option value="receipt">حراري (صغير)</option>
                          <option value="a4">كبير (A4)</option>
                        </select>
                      </div>
                      {form.printDefaultSize === 'receipt' && <div>
                        <label style={{ fontSize: '12px', color: 'var(--text2)', display: 'block', marginBottom: '6px' }}>مقاس الطباعة الحرارية</label>
                        <select value={form.thermalPaperSize} onChange={e => setForm(f => ({ ...f, thermalPaperSize: e.target.value }))} style={{ width: '100%' }} disabled={!canManage}>
                          <option value="57mm">57mm</option>
                          <option value="58mm">58mm</option>
                          <option value="76mm">76mm</option>
                          <option value="80mm">80mm</option>
                          <option value="custom">مخصص</option>
                        </select>
                      </div>}
                    </div>
                    {form.thermalPaperSize === 'custom' && form.printDefaultSize === 'receipt' && (
                      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px', marginTop: '10px' }}>
                        <div>
                          <label style={{ fontSize: '12px', color: 'var(--text2)', display: 'block', marginBottom: '6px' }}>العرض (mm)</label>
                          <input type="number" step="any" value={form.customPaperWidth} onInput={e => setForm(f => ({ ...f, customPaperWidth: e.target.value }))} style={{ width: '100%' }} disabled={!canManage} />
                        </div>
                        <div>
                          <label style={{ fontSize: '12px', color: 'var(--text2)', display: 'block', marginBottom: '6px' }}>الطول (mm)</label>
                          <input type="number" step="any" value={form.customPaperHeight} onInput={e => setForm(f => ({ ...f, customPaperHeight: e.target.value }))} style={{ width: '100%' }} disabled={!canManage} />
                        </div>
                      </div>
                    )}
                  </div>

                  <div>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                      <input type="checkbox" id="printAfter" checked={form.printAfterPayment} onChange={e => setForm(f => ({ ...f, printAfterPayment: e.target.checked }))} disabled={!canManage} />
                      <label htmlFor="printAfter" style={{ fontSize: '14px', color: 'var(--text)', cursor: 'pointer' }}>طباعة الفاتورة تلقائياً بعد الدفع</label>
                    </div>
                  </div>
                    <div>
                      <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                        <input type="checkbox" id="printDirectly" checked={form.printDirectly} onChange={e => { const v = e.target.checked; setForm(f => ({ ...f, printDirectly: v, printAfterPayment: v ? true : f.printAfterPayment })) }} disabled={!canManage} />
                        <label htmlFor="printDirectly" style={{ fontSize: '14px', color: 'var(--text)', cursor: 'pointer' }}>طباعة مباشرة بدون نافذة اختيار الطابعة</label>
                      </div>
                  </div>
              </div>
              )}

              {selectedSection === 'barcode' && (
                <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
                  <div>
                    <div style={{ fontSize: '13px', fontWeight: '700', color: 'var(--text)', marginBottom: '12px' }}>طابعة الباركود</div>
                    <div style={{ display: 'grid', gridTemplateColumns: '1fr', gap: '12px' }}>
                      <div>
                        <select value={form.barcodePrinter} onChange={e => setForm(f => ({ ...f, barcodePrinter: e.target.value }))} style={{ width: '100%' }} disabled={!canManage}>
                          <option value="">إفتراضي (النظام)</option>
                          {printers.map(p => <option key={p.name} value={p.name}>{p.name}{p.isDefault ? ' (إفتراضية)' : ''}</option>)}
                        </select>
                      </div>
                    </div>
                    {printers.length === 0 && <div style={{ fontSize: '11px', color: 'var(--text2)', marginTop: '6px' }}>جاري تحميل قائمة الطابعات...</div>}
                  </div>

                  <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
                    <div style={{ fontSize: '13px', fontWeight: '700', color: 'var(--text)', marginBottom: '4px' }}>البيانات على اللاصقة</div>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                      <input type="checkbox" id="barcodeShowName" checked={form.barcodeShowName ?? true} onChange={e => setForm(f => ({ ...f, barcodeShowName: e.target.checked }))} disabled={!canManage} />
                      <label htmlFor="barcodeShowName" style={{ fontSize: '14px', color: 'var(--text)', cursor: 'pointer' }}>عرض اسم المنتج</label>
                    </div>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                      <input type="checkbox" id="barcodeShowPrice" checked={form.barcodeShowPrice ?? true} onChange={e => setForm(f => ({ ...f, barcodeShowPrice: e.target.checked }))} disabled={!canManage} />
                      <label htmlFor="barcodeShowPrice" style={{ fontSize: '14px', color: 'var(--text)', cursor: 'pointer' }}>عرض سعر المنتج</label>
                    </div>
                    <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px', marginTop: '6px' }}>
                      <div>
                        <label style={{ fontSize: '12px', color: 'var(--text2)', display: 'block', marginBottom: '6px' }}>سمك الخط</label>
                        <select value={form.barcodeFontWeight || 'bold'} onChange={e => setForm(f => ({ ...f, barcodeFontWeight: e.target.value }))} style={{ width: '100%' }} disabled={!canManage}>
                          <option value="lighter">خفيف</option>
                          <option value="normal">عادي</option>
                          <option value="bold">ثقيل</option>
                        </select>
                      </div>
                      <div>
                        <label style={{ fontSize: '12px', color: 'var(--text2)', display: 'block', marginBottom: '6px' }}>حجم الباركود</label>
                        <select value={String(form.barcodeScale ?? 1.0)} onChange={e => setForm(f => ({ ...f, barcodeScale: Number(e.target.value) }))} style={{ width: '100%' }} disabled={!canManage}>
                          <option value="0.5">صغير (50%)</option>
                          <option value="0.75">متوسط (75%)</option>
                          <option value="1">كامل (100%)</option>
                          <option value="1.25">كبير (125%)</option>
                          <option value="1.5">كبير جداً (150%)</option>
                        </select>
                      </div>
                    </div>
                  </div>

                  <div>
                    <div style={{ fontSize: '13px', fontWeight: '700', color: 'var(--text)', marginBottom: '12px' }}>إعدادات اللاصقة</div>
                    <div style={{ display: 'grid', gridTemplateColumns: '1fr', gap: '12px' }}>
                      <div>
                        <label style={{ fontSize: '12px', color: 'var(--text2)', display: 'block', marginBottom: '6px' }}>مقاس لاصقة الباركود</label>
                        <select value={barcodeLabel} onChange={e => { setBarcodeLabel(e.target.value); setForm(f => ({ ...f, barcodeLabelSize: e.target.value })) }} style={{ width: '100%' }}>
                          <option value="25x25">25 × 25 mm</option>
                          <option value="30x20">30 × 20 mm</option>
                          <option value="40x30">40 × 30 mm</option>
                          <option value="50x30">50 × 30 mm</option>
                          <option value="60x40">60 × 40 mm</option>
                          <option value="75x50">75 × 50 mm</option>
                          <option value="100x60">100 × 60 mm</option>
                          <option value="custom">مخصص</option>
                        </select>
                        {barcodeLabel === 'custom' && (
                          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '8px', marginTop: '8px' }}>
                            <div>
                              <label style={{ fontSize: '11px', color: 'var(--text2)', display: 'block', marginBottom: '4px' }}>العرض (mm)</label>
                              <input type="number" step="any" value={barcodeLabelWidth} onInput={e => { setBarcodeLabelWidth(e.target.value); setForm(f => ({ ...f, barcodeLabelSize: `${e.target.value}x${barcodeLabelHeight}` })) }} style={{ width: '100%' }} />
                            </div>
                            <div>
                              <label style={{ fontSize: '11px', color: 'var(--text2)', display: 'block', marginBottom: '4px' }}>الطول (mm)</label>
                              <input type="number" step="any" value={barcodeLabelHeight} onInput={e => { setBarcodeLabelHeight(e.target.value); setForm(f => ({ ...f, barcodeLabelSize: `${barcodeLabelWidth}x${e.target.value}` })) }} style={{ width: '100%' }} />
                            </div>
                          </div>
                        )}
                      </div>
                    </div>
                    <div style={{ marginTop: '16px', borderTop: '1px solid var(--bg3)', paddingTop: '16px' }}>
                      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '12px' }}>
                        <div style={{ fontSize: '13px', fontWeight: '700', color: 'var(--text)' }}>معاينة الباركود</div>
                        <button onClick={() => { setBarcodeSelectedProduct({ name: 'منتج تجريبي', barcode: '0123456789123', priceRetail: 100 }); setBarcodePreview('0123456789123'); setBarcodeSearch(''); setBarcodeProducts([]) }}
                          style={{ background: 'var(--bg3)', color: 'var(--text)', border: 'none', borderRadius: '6px', padding: '4px 12px', fontSize: '11px', cursor: 'pointer' }}>
                          معاينة تجريبية
                        </button>
                      </div>
                      <input placeholder="ابحث عن منتج..." value={barcodeSearch} onInput={e => { setBarcodeSearch(e.target.value); setBarcodeSelectedProduct(null); setBarcodePreview('') }}
                        style={{ width: '100%', marginBottom: '8px' }} />
                      {barcodeSearch.length >= 2 && !barcodeSelectedProduct && null}
                      {barcodeSearchLoading && <div style={{ fontSize: '12px', color: 'var(--text2)', marginBottom: '8px' }}>جاري البحث...</div>}
                      {!barcodeSearchLoading && barcodeProducts.length > 0 && !barcodeSelectedProduct && (
                        <div style={{ maxHeight: '150px', overflow: 'auto', border: '1px solid var(--outline)', borderRadius: '8px', marginBottom: '8px' }}>
                          {barcodeProducts.map((p, i) => (
                            <div key={p._id || i} onClick={() => { setBarcodeSelectedProduct(p); setBarcodePreview(p.barcode || '') }} style={{
                              padding: '8px 10px', cursor: 'pointer', fontSize: '12px', color: 'var(--text)',
                              borderBottom: i < barcodeProducts.length - 1 ? '1px solid var(--bg3)' : 'none',
                              display: 'flex', justifyContent: 'space-between'
                            }}>
                              <span>{p.name}</span>
                              <span style={{ color: 'var(--text2)', fontFamily: 'monospace', fontSize: '11px' }}>{p.barcode || ''}</span>
                            </div>
                          ))}
                        </div>
                      )}
                      {!barcodeSearchLoading && barcodeSearch.length >= 2 && barcodeProducts.length === 0 && !barcodeSelectedProduct && (
                        <div style={{ fontSize: '12px', color: 'var(--text2)', marginBottom: '8px' }}>لا توجد نتائج</div>
                      )}
                      {barcodePreview && (() => {
                        const dims = barcodeLabel === 'custom' ? [barcodeLabelWidth, barcodeLabelHeight] : barcodeLabel.split('x').map(Number)
                        const scale = form.barcodeScale ?? 1
                        const bw = Math.min(Number(dims[0]) * 3.78 * scale, 400)
                        const bh = Math.min(Number(dims[1]) * 3.78 * scale, 250)
                        return (
                          <div style={{ padding: '12px', background: '#fff', borderRadius: '8px', display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '4px', border: '1px solid var(--outline)' }}>
                            {barcodeSelectedProduct && form.barcodeShowName !== false && <div style={{ fontSize: '11px', fontWeight: form.barcodeFontWeight || 'bold', color: '#333', textAlign: 'center' }}>{barcodeSelectedProduct.name}</div>}
                            {barcodeSelectedProduct && form.barcodeShowPrice !== false && <div style={{ fontSize: '10px', fontWeight: form.barcodeFontWeight || 'bold', color: '#555', textAlign: 'center' }}>{barcodeSelectedProduct.priceRetail || 0} ج.م</div>}
                            {!barcodeSelectedProduct && <div style={{ fontSize: '10px', color: '#9ca3af', textAlign: 'center' }}>باركود يدوي</div>}
                            <BarcodeSVG code={barcodePreview} width={bw} height={bh} />
                            <button onClick={() => printBarcode(barcodePreview, barcodeSelectedProduct ? { name: barcodeSelectedProduct.name, price: barcodeSelectedProduct.priceRetail } : undefined)}
                              style={{ marginTop: '8px', background: 'var(--accent)', color: '#fff', border: 'none', borderRadius: '6px', padding: '6px 20px', fontSize: '12px', cursor: 'pointer' }}>
                              طباعة
                            </button>
                          </div>
                        )
                      })()}
                    </div>
                  </div>
                </div>
              )}

              {selectedSection === 'invoice' && canManage && (
                <div>
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
                      <label style={{ display: 'flex', alignItems: 'center', gap: '6px', fontSize: '13px', cursor: 'pointer' }}>
                        <input type="checkbox" checked={form.showQR} onChange={e => setForm(f => ({ ...f, showQR: e.target.checked }))} /> رمز QR في الفاتورة
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
                <div style={{ borderTop: '1px solid var(--bg3)', paddingTop: '12px', marginTop: '12px' }}>
                  <div style={{ fontSize: '13px', fontWeight: '700', color: 'var(--text)', marginBottom: '10px' }}>نص تذييل الفاتورة</div>
                  <textarea value={form.receiptFooter} onInput={e => setForm(f => ({ ...f, receiptFooter: e.target.value }))} rows="2" readOnly={!canManage}
                    style={{ width: '100%', background: 'var(--bg)', color: 'var(--text)', border: '1px solid var(--outline)', borderRadius: '8px', padding: '10px', resize: 'vertical' }} />
                </div>

                <div style={{ borderTop: '1px solid var(--bg3)', paddingTop: '16px', marginTop: '16px' }}>
                  <div style={{ display: 'flex', gap: '8px', alignItems: 'center', marginBottom: '12px', flexWrap: 'wrap' }}>
                    <div style={{ fontSize: '13px', fontWeight: '700', color: 'var(--text)' }}>معاينة الفاتورة</div>
                    <select value={previewDocType} onChange={e => setPreviewDocType(e.target.value)} style={{
                      background: 'var(--bg)', color: 'var(--text)', border: '1px solid var(--outline)', borderRadius: '6px',
                      padding: '4px 10px', fontSize: '12px', cursor: 'pointer'
                    }}>
                      <option value="sale">فاتورة بيع</option>
                      <option value="purchase">فاتورة شراء</option>
                      <option value="customerStatement">كشف حساب عميل</option>
                      <option value="supplierStatement">كشف حساب مورد</option>
                    </select>
                    <button onClick={() => setInvoicePreviewIsA4(!invoicePreviewIsA4)} style={{
                      background: 'var(--bg3)', color: 'var(--text)', border: 'none', borderRadius: '6px',
                      padding: '4px 12px', fontSize: '11px', cursor: 'pointer'
                    }}>{invoicePreviewIsA4 ? 'عرض حراري' : 'عرض A4'}</button>
                  </div>
                  {(() => {
                    const previewSettings = { ...form, logoDataUrl: settings?.logoDataUrl, thermalPaperSize: form.thermalPaperSize || '80mm', printDefaultSize: form.printDefaultSize || 'thermal', receiptFooter: form.receiptFooter }
                    const isInvoice = previewDocType === 'sale' || previewDocType === 'purchase'
                    const isPurchase = previewDocType === 'purchase'
                    if (isInvoice) {
                      const demoData = {
                        invoiceNo: 9999, createdAt: new Date().toISOString(),
                        paymentMethod: 'cash',
                        customerName: 'عميل تجريبي',
                        customerPhone: '01234567890',
                        supplierName: 'مورد تجريبي',
                        supplierPhone: '01234567890',
                        items: [
                          { name: 'منتج تجريبي 1', quantity: 2, unitPrice: 50, cost: 30, subtotal: 60 },
                          { name: 'منتج تجريبي 2', quantity: 1, unitPrice: 75, cost: 45, subtotal: 45 },
                          { name: 'منتج تجريبي 3', quantity: 3, unitPrice: 25, cost: 15, subtotal: 45 }
                        ],
                        subtotal: 250, discount: 10, tax: 33.6, total: 273.6,
                        totalCost: 150, netCost: 140,
                        paid: 300, change: 26.4,
                        cashierName: 'كاشير تجريبي', note: 'ملاحظة تجريبية',
                        previousDebt: 50, previousCredit: 0
                      }
                      if (isPurchase) {
                        demoData.customerName = undefined
                        demoData.customerPhone = undefined
                        demoData.tax = 0
                        demoData.subtotal = undefined
                        demoData.total = undefined
                      } else {
                        demoData.supplierName = undefined
                        demoData.supplierPhone = undefined
                        demoData.totalCost = undefined
                        demoData.netCost = undefined
                      }
                      const element = invoicePreviewIsA4
                        ? <PrintTemplateA4 type={previewDocType} data={demoData} settings={previewSettings} />
                        : <PrintTemplateThermal data={demoData} settings={previewSettings} />
                      const html = invoicePreviewIsA4 ? renderA4Html(element) : renderThermalHtml(element)
                      return (
                        <div style={{ background: '#f9fafb', borderRadius: '8px', border: '1px solid #e5e7eb', overflow: 'auto', display: 'flex', justifyContent: 'center' }}>
                          <iframe srcdoc={html} style={{ width: invoicePreviewIsA4 ? '900px' : '100%', height: '600px', border: 'none', background: '#fff' }} title="معاينة الفاتورة" />
                        </div>
                      )
                    } else {
                      const isSupplierStmt = previewDocType === 'supplierStatement'
                      const party = isSupplierStmt
                        ? { name: 'مورد تجريبي', phone: '01234567890', address: 'عنوان المورد التجريبي', commercialReg: '123456', taxReg: '654321', totalPurchases: 800, totalPaid: 300 }
                        : { name: 'عميل تجريبي', phone: '01234567890', address: 'عنوان العميل التجريبي', commercialReg: '123456', taxReg: '654321', totalDebt: 800, totalPaid: 300 }
                      const transactions = [
                        { type: 'رصيد سابق', desc: 'رصيد مستحق سابق', amount: 200, date: new Date(Date.now() - 86400000 * 7).toISOString(), paymentMethod: 'credit', balance: 200 },
                        { type: 'فاتورة آجلة', desc: 'فاتورة #1001', amount: 500, date: new Date(Date.now() - 86400000 * 5).toISOString(), paymentMethod: 'credit', invoiceNo: 1001, balance: 700 },
                        { type: 'دفعة', desc: 'دفعة نقدية', amount: -200, date: new Date(Date.now() - 86400000 * 3).toISOString(), paymentMethod: 'cash', balance: 500 },
                        { type: 'فاتورة آجلة', desc: 'فاتورة #1002', amount: 300, date: new Date(Date.now() - 86400000 * 1).toISOString(), paymentMethod: 'credit', invoiceNo: 1002, balance: 800 }
                      ]
                      const element = invoicePreviewIsA4
                        ? <StatementA4 type={isSupplierStmt ? 'supplier' : 'customer'} party={party} transactions={transactions} settings={previewSettings} />
                        : <StatementThermal type={isSupplierStmt ? 'supplier' : 'customer'} party={party} transactions={transactions} settings={previewSettings} />
                      const html = invoicePreviewIsA4 ? renderA4Html(element) : renderThermalHtml(element)
                      return (
                        <div style={{ background: '#f9fafb', borderRadius: '8px', border: '1px solid #e5e7eb', overflow: 'auto', display: 'flex', justifyContent: 'center' }}>
                          <iframe srcdoc={html} style={{ width: invoicePreviewIsA4 ? '900px' : '100%', height: '600px', border: 'none', background: '#fff' }} title="معاينة كشف الحساب" />
                        </div>
                      )
                    }
                  })()}
                </div>
              </div>
            )}

            {selectedSection === 'notifications' && canManage && (
                <div>
                  <div style={{
                    fontSize: '13px',
                    fontWeight: '700',
                    color: 'var(--text)',
                    marginBottom: '16px'
                  }}>تفعيل/تعطيل أنواع الإشعارات</div>
                  <div style={{
                    display: 'grid',
                    gridTemplateColumns: 'repeat(auto-fill, minmax(280px, 1fr))',
                    gap: '12px'
                  }}>
                    {NOTIFICATION_TYPES.map(t => (
                      <div key={t.key} style={{
                        display: 'flex',
                        flexDirection: 'column',
                        gap: '8px',
                        background: 'var(--bg)',
                        padding: '16px',
                        borderRadius: '12px',
                        border: '1px solid var(--outline)'
                      }}>
                        <div style={{
                          display: 'flex',
                          alignItems: 'center',
                          gap: '10px'
                        }}>
                          <div style={{
                            display: 'flex',
                            alignItems: 'center',
                            justifyContent: 'center',
                            width: '36px',
                            height: '36px',
                            borderRadius: '10px',
                            background: 'var(--bg2)',
                            color: 'var(--accent)'
                          }}>
                            {t.icon}
                          </div>
                          <div style={{ flex: 1 }}>
                            <div style={{
                              fontSize: '14px',
                              fontWeight: '600',
                              color: 'var(--text)'
                            }}>{t.label}</div>
                            <div style={{
                              fontSize: '11px',
                              color: 'var(--text2)'
                            }}>{t.description}</div>
                          </div>
                          <label style={{
                            display: 'flex',
                            alignItems: 'center',
                            cursor: 'pointer'
                          }}>
                            <input
                              type="checkbox"
                              checked={form[t.key] ?? false}
                              onChange={e => setForm(f => ({ ...f, [t.key]: e.target.checked }))}
                              style={{
                                width: '20px',
                                height: '20px',
                                accentColor: 'var(--accent)'
                              }}
                            />
                          </label>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {selectedSection === 'data' && canManage && (
                <div>
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
                </div>
              )}

              {selectedSection === 'updates' && canManage && (
                <div>
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '10px' }}>
                    <span style={{ fontSize: '13px', fontWeight: 'bold', color: 'var(--text)' }}>تحديث التطبيق</span>
                    <span style={{ fontSize: '12px', color: 'var(--text2)' }}>{appVersion || ''}</span>
                  </div>
                  <button type="button" onClick={handleCheckUpdates} disabled={checkingUpdate} style={{ width: '100%', background: 'var(--bg3)', color: 'var(--text)', padding: '12px', borderRadius: '12px', fontSize: '14px', fontWeight: '500' }}>
                    {checkingUpdate ? 'جاري التحقق...' : 'التحقق من وجود تحديثات'}
                  </button>
                  {updateStatus?.type === 'not-available' && (
                    <div style={{ marginTop: '12px', fontSize: '13px', color: 'var(--success)', fontWeight: '600', textAlign: 'center' }}>
                      أنت على أحدث نسخة
                    </div>
                  )}
                  {updateStatus?.type === 'error' && (
                    <div style={{ marginTop: '12px', fontSize: '13px', color: 'var(--danger)', fontWeight: '600', textAlign: 'center' }}>
                      {updateStatus.message || 'حدث خطأ أثناء التحقق من التحديثات'}
                    </div>
                  )}
                </div>
              )}

              {selectedSection === 'license' && (
                <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
                  {licenseStatus?.activated ? (
                    <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
                      <div style={{ display: 'flex', alignItems: 'center', gap: '16px', background: 'var(--bg)', borderRadius: '14px', padding: '20px', border: '1px solid var(--outline)' }}>
                        <div style={{
                          width: '60px', height: '60px', borderRadius: '16px',
                          background: licenseStatus.remainingDays !== null && licenseStatus.remainingDays <= 7 ? 'rgba(var(--danger-rgb),0.15)' : 'rgba(var(--success-rgb),0.15)',
                          display: 'flex', alignItems: 'center', justifyContent: 'center',
                          color: licenseStatus.remainingDays !== null && licenseStatus.remainingDays <= 7 ? 'var(--danger)' : 'var(--success)',
                          fontWeight: '800', fontSize: '22px', flexShrink: 0
                        }}>
                          {licenseStatus.remainingDays ?? '∞'}
                        </div>
                        <div style={{ flex: 1 }}>
                          <div style={{ fontSize: '13px', fontWeight: '600', color: 'var(--text)' }}>
                            {licenseStatus.remainingText || 'مدى الحياة'}
                          </div>
                          <div style={{ fontSize: '11px', color: 'var(--text2)', marginTop: '4px' }}>
                            {licenseStatus.licenseType === 'lifetime' ? 'ترخيص مدى الحياة' : licenseStatus.expiresAt ? `ينتهي في ${formatDate(licenseStatus.expiresAt)}` : ''}
                          </div>
                        </div>
                        <span style={{
                          fontSize: '12px', padding: '6px 14px', borderRadius: '8px', fontWeight: '700',
                          background: licenseStatus.remainingDays !== null && licenseStatus.remainingDays <= 7 ? 'rgba(var(--danger-rgb),0.15)' : 'rgba(var(--success-rgb),0.15)',
                          color: licenseStatus.remainingDays !== null && licenseStatus.remainingDays <= 7 ? 'var(--danger)' : 'var(--success)'
                        }}>
                          {licenseStatus.remainingDays !== null && licenseStatus.remainingDays <= 7 ? 'وشك يخلص' : 'مفعل'}
                        </span>
                      </div>
                      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '10px' }}>
                        <div style={{ background: 'var(--bg)', borderRadius: '10px', padding: '12px', border: '1px solid var(--outline)' }}>
                          <div style={{ fontSize: '11px', color: 'var(--text2)', marginBottom: '4px' }}>المفتاح</div>
                          <div style={{ fontSize: '12px', fontWeight: '600', color: 'var(--text)', wordBreak: 'break-all' }}>{licenseStatus.activatedKey}</div>
                        </div>
                        <div style={{ background: 'var(--bg)', borderRadius: '10px', padding: '12px', border: '1px solid var(--outline)' }}>
                          <div style={{ fontSize: '11px', color: 'var(--text2)', marginBottom: '4px' }}>النوع</div>
                          <div style={{ fontSize: '12px', fontWeight: '600', color: 'var(--text)' }}>
                            {licenseStatus.licenseType === 'lifetime' ? 'مدى الحياة' : licenseStatus.licenseType === 'year' ? 'سنوي' :
                             licenseStatus.licenseType === 'half_year' ? 'نصف سنوي' : licenseStatus.licenseType === 'quarter' ? 'ربع سنوي' : 'شهري'}
                          </div>
                        </div>
                      </div>
                    </div>
                  ) : (
                    <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '14px', background: 'var(--bg)', borderRadius: '14px', padding: '28px 20px', border: '1px solid var(--outline)' }}>
                      <div style={{
                        width: '64px', height: '64px', borderRadius: '20px',
                        background: licenseStatus?.trialUsed ? 'rgba(var(--warning-rgb),0.15)' : 'rgba(var(--danger-rgb),0.15)',
                        display: 'flex', alignItems: 'center', justifyContent: 'center',
                        color: licenseStatus?.trialUsed ? 'var(--warning)' : 'var(--danger)',
                        fontWeight: '800', fontSize: '24px'
                      }}>
                        {licenseStatus?.trialUsed && licenseStatus.remainingDays ? licenseStatus.remainingDays : '!'}
                      </div>
                      <div style={{ fontSize: '13px', fontWeight: '700', color: 'var(--text)' }}>
                        {licenseStatus?.trialUsed ? 'الفترة التجريبية' : 'الترخيص غير مفعل'}
                      </div>
                      {licenseStatus?.remainingText && (
                        <div style={{ fontSize: '12px', color: 'var(--text2)' }}>{licenseStatus.remainingText}</div>
                      )}
                    </div>
                  )}
                  <div style={{ display: 'flex', gap: '8px' }}>
                    <button type="button" onClick={handleRefreshLicense} disabled={refreshingLicense} style={{
                      flex: 1, background: 'var(--accent)', color: '#fff', padding: '12px', borderRadius: '10px', fontSize: '13px', fontWeight: '600'
                    }}>
                      {refreshingLicense ? 'جاري...' : 'تحديث حالة الترخيص'}
                    </button>
                    {!licenseStatus?.activated && (
                      <button type="button" onClick={() => setShowLicenseModal(true)} style={{
                        flex: 1, background: 'var(--bg3)', color: 'var(--text)', padding: '12px', borderRadius: '10px', fontSize: '13px', fontWeight: '600'
                      }}>
                        تفعيل الترخيص
                      </button>
                    )}
                  </div>
                </div>
              )}

              {selectedSection === 'support' && (
                <div>
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
                </div>
              )}
            </Section>

          </div>
        </form>
      )}

      <ActivateLicenseModal
        open={showLicenseModal}
        onClose={() => setShowLicenseModal(false)}
        onActivated={() => { handleRefreshLicense(); refreshLicense() }}
      />

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
    <div style={{ background: 'var(--bg2)', borderRadius: '16px', padding: '28px', border: '1px solid var(--outline)', boxShadow: '0 2px 8px rgba(0,0,0,0.05)' }}>
      <div style={{ fontSize: '14px', fontWeight: '700', color: 'var(--text)', marginBottom: '16px', display: 'flex', alignItems: 'center', gap: '8px' }}>
        <span style={{ width: '4px', height: '14px', background: 'var(--accent)', borderRadius: '2px', display: 'inline-block' }}></span>
        {title}
      </div>
      {children}
    </div>
  )
}
