import { useState, useEffect, useRef } from 'preact/hooks'
import api from '../api'
import Modal from '../components/Modal'
import Pagination from '../components/Pagination'
import { useToast } from '../components/Toast'
import { formatDate } from '../utils/date'
import { formatMoney } from '../utils/money'
import { printBarcode } from '../utils/print'
import { useStore } from '../store'
import { useConfirm } from '../components/ConfirmModal'
import PrintTemplateA4 from '../components/PrintTemplateA4'
import PrintTemplateThermal from '../components/PrintTemplateThermal'
import { printA4, printThermal } from '../utils/print'
import { iconBtn, headerBtn, secondaryBtn, modalPrimaryBtn, modalWarningBtn, modalSuccessBtn, modalDangerBtn, EditIcon, DeleteIcon, AddIcon, PrintIcon, CheckIcon, PaymentIcon, ReturnIcon, BarcodeIcon, SearchIcon } from '../components/ActionIcons'

import { generateBarcode as genBarcode, encodeEAN13 } from '../utils/barcode'

function generateBarcode() { return genBarcode() }

function BarcodeSVG({ code, width = 220, height = 55 }) {
  const pattern = encodeEAN13(code)
  const moduleWidth = width / pattern.length
  const rects = []
  let x = 0
  for (let i = 0; i < pattern.length; i++) {
    if (pattern[i] === '1') {
      rects.push(<rect key={i} x={x} y={0} width={moduleWidth} height={height - 16} fill="#000" />)
    }
    x += moduleWidth
  }
  return (
    <div style={{ textAlign: 'center' }}>
      <svg width={width} height={height} xmlns="http://www.w3.org/2000/svg" style={{ background: '#fff' }}>
        {rects}
        <text x={width / 2} y={height - 2} text-anchor="middle" font-family="monospace" font-size="11" fill="#000">{code}</text>
      </svg>
    </div>
  )
}

export default function PurchasesPage() {
  const { user } = useStore()
  const toast = useToast()
  const { confirm, ConfirmDialog } = useConfirm()
  const canCreate = user?.permissions?.includes('purchases.create')
  const canDelete = user?.permissions?.includes('purchases.delete')
  const [purchases, setPurchases] = useState([])
  const [products, setProducts] = useState([])
  const [suppliers, setSuppliers] = useState([])
  const [showModal, setShowModal] = useState(false)
  const [editPurchase, setEditPurchase] = useState(null)
  const [viewInvoice, setViewInvoice] = useState(null)
  const [showSupplierModal, setShowSupplierModal] = useState(false)
  const [showProductModal, setShowProductModal] = useState(false)
  const [showReturnModal, setShowReturnModal] = useState(false)
  const [returnPurchase, setReturnPurchase] = useState(null)
  const [returnItems, setReturnItems] = useState([])
  const [returnReason, setReturnReason] = useState('')
  const [returnRefundCash, setReturnRefundCash] = useState(false)
  const [returnPaymentMethod, setReturnPaymentMethod] = useState('cash')
  const [supplierPaidForReturn, setSupplierPaidForReturn] = useState(0)
  const [purchaseReturns, setPurchaseReturns] = useState([])
  const [search, setSearch] = useState({ q: '', dateFrom: '', dateTo: '' })
  const [page, setPage] = useState(0)
  const [totalPages, setTotalPages] = useState(0)
  const [total, setTotal] = useState(0)
  const pageSize = 20
  const [items, setItems] = useState([{ productId: '', name: '', quantity: '', cost: '' }])
  const [productSearch, setProductSearch] = useState([''])
  const [showProductDropdown, setShowProductDropdown] = useState([false])
  const [productSearchResults, setProductSearchResults] = useState([])
  const [supplierName, setSupplierName] = useState('')
  const [supplierId, setSupplierId] = useState('')
  const [supplierSearch, setSupplierSearch] = useState('')
  const [showSupplierDropdown, setShowSupplierDropdown] = useState(false)
  const [supplierPhone, setSupplierPhone] = useState('')
  const [note, setNote] = useState('')
  const [paymentMethod, setPaymentMethod] = useState('cash')
  const [paid, setPaid] = useState('')
  const [discount, setDiscount] = useState('')
  const [discountType, setDiscountType] = useState('amount')
  const [supplierForm, setSupplierForm] = useState({ name: '', phone: '', email: '', commercialReg: '', taxReg: '', address: '', notes: '' })
  const [productForm, setProductForm] = useState({
    name: '', category: '', unit: '', barcode: '',
    cost: '', priceRetail: '', priceHalfWholesale: '', priceWholesale: '',
    stock: '', reorderPoint: '', image: '', expiryDate: ''
  })
  const [generatedBarcode, setGeneratedBarcode] = useState('')
  const [showPrintBarcode, setShowPrintBarcode] = useState(false)
  const [printingBarcode, setPrintingBarcode] = useState(false)
  const [settings, setSettings] = useState(null)
  const [categories, setCategories] = useState([])
  const [units, setUnits] = useState([])
  const categoryRef = useRef(null)
  const productSearchTimer = useRef(null)
  const imgRef = useRef(null)
  const nameRef = useRef(null)
  const barcodeRef = useRef(null)

  useEffect(() => { loadPurchases(); loadProducts(); loadSuppliers(); loadSettings(); loadPurchaseReturns(); loadProductMeta() }, [page, search.q, search.dateFrom, search.dateTo])
  useEffect(() => {
    let timer
    const handler = () => {
      clearTimeout(timer)
      timer = setTimeout(() => { loadPurchases(); loadProducts(); loadSuppliers(); loadPurchaseReturns(); loadProductMeta() }, 300)
    }
    window.addEventListener('dataChanged', handler)
    return () => { window.removeEventListener('dataChanged', handler); clearTimeout(timer) }
  }, [])
  useEffect(() => { if (showProductModal) setTimeout(() => nameRef.current?.focus(), 100) }, [showProductModal])

  async function loadPurchases() {
    const token = localStorage.getItem('token')
    const result = await api.listPurchases(token, { query: search.q, from: search.dateFrom, to: search.dateTo }, page, pageSize)
    setPurchases(result.data)
    setTotal(result.total)
    setTotalPages(result.totalPages)
  }

  async function loadProducts() {
    const token = localStorage.getItem('token')
    const data = await api.listProducts(token, '', 300)
    setProducts(data)
  }

  async function loadProductMeta() {
    const token = localStorage.getItem('token')
    try {
      const meta = await api.listProductMeta(token)
      if (meta) { setCategories(meta.categories); setUnits(meta.units) }
    } catch {}
  }

  async function loadSuppliers() {
    const token = localStorage.getItem('token')
    const data = await api.listSuppliers(token)
    setSuppliers(data)
  }

  async function loadSettings() {
    const token = localStorage.getItem('token')
    const s = await api.getSettings(token)
    setSettings(s)
  }

  async function loadPurchaseReturns() {
    const token = localStorage.getItem('token')
    try {
      const data = await api.listPurchaseReturns(token)
      setPurchaseReturns(data)
    } catch {}
  }

  function handleProductSearch(idx, value) {
    setProductSearch(arr => { const n = [...arr]; n[idx] = value; return n })
    setShowProductDropdown(arr => { const n = [...arr]; n[idx] = true; return n })
    setItems(arr => {
      const next = [...arr]
      if (!next[idx].productId || next[idx].name !== value) {
        next[idx] = { ...next[idx], productId: '', name: value }
      }
      return next
    })
    clearTimeout(productSearchTimer.current)
    if (value.length < 2) { setProductSearchResults([]); return }
    productSearchTimer.current = setTimeout(async () => {
      const token = localStorage.getItem('token')
      const data = await api.listProducts(token, value, 30)
      setProductSearchResults(data || [])
    }, 250)
  }

  function selectProductFromSearch(idx, p) {
    setItems(arr => {
      const next = [...arr]
      next[idx] = { ...next[idx], productId: p._id, name: p.name, cost: p.cost }
      return next
    })
    setProductSearch(arr => { const n = [...arr]; n[idx] = p.name; return n })
    setShowProductDropdown(arr => { const n = [...arr]; n[idx] = false; return n })
    setProductSearchResults([])
  }

  function filteredProducts(search) {
    if (!search) return []
    if (productSearchResults.length > 0) return productSearchResults
    return products.filter(p => p.name.includes(search) || p.barcode?.includes(search))
  }

  function addItem() {
    setItems(arr => [...arr, { productId: '', name: '', quantity: '', cost: '' }])
    setProductSearch(arr => [...arr, ''])
    setShowProductDropdown(arr => [...arr, false])
  }
  function removeItem(idx) {
    if (items.length > 1) {
      setItems(arr => arr.filter((_, i) => i !== idx))
      setProductSearch(arr => arr.filter((_, i) => i !== idx))
      setShowProductDropdown(arr => arr.filter((_, i) => i !== idx))
    }
  }

  const filteredSuppliers = supplierSearch
    ? suppliers.filter(s => s.name.includes(supplierSearch) || s.phone?.includes(supplierSearch))
    : []

  function handleSupplierSearch(e) {
    const v = e.target.value
    setSupplierSearch(v)
    setShowSupplierDropdown(true)
    if (supplierName && v !== supplierName) { setSupplierName(''); setSupplierId(''); setSupplierPhone('') }
    const exact = suppliers.find(s => s.name === v)
    if (exact) {
      setSupplierName(exact.name)
      setSupplierId(exact._id)
      setSupplierPhone(exact.phone || '')
    }
  }

  function selectSupplier(s) {
    setSupplierName(s.name); setSupplierId(s._id); setSupplierSearch(s.name); setSupplierPhone(s.phone || ''); setShowSupplierDropdown(false)
    const credit = (s.totalPaid || 0) - (s.totalPurchases || 0)
    const debt = (s.totalPurchases || 0) - (s.totalPaid || 0)
    if (credit > 0) {
      toast(`رصيد مستحق من المورد: ${formatMoney(credit)} - سيتم خصمه من قيمة الفاتورة`, 'info')
      const remaining = Math.max(0, totalCost - credit)
      setPaid(String(remaining))
    } else if (debt > 0) {
      toast(`دين مستحق للمورد: ${formatMoney(debt)}`, 'info')
    }
  }

  const totalCost = items.reduce((s, i) => s + Number(i.quantity) * Number(i.cost), 0)

  function openNew() {
    setEditPurchase(null)
    setItems([{ productId: '', name: '', quantity: '', cost: '' }])
    setProductSearch(['']); setShowProductDropdown([false])
    setSupplierName(''); setSupplierId(''); setSupplierPhone(''); setSupplierSearch(''); setNote(''); setPaymentMethod('cash'); setPaid(''); setDiscount(''); setDiscountType('amount')
    setShowModal(true)
  }

  function openEdit(p) {
    setEditPurchase(p)
    setItems(p.items.map(i => ({ productId: i.productId, name: i.name, quantity: i.quantity, cost: i.cost })))
    setProductSearch(p.items.map(i => i.name))
    setShowProductDropdown(p.items.map(() => false))
    setSupplierName(p.supplierName || '')
    setSupplierId(p.supplierId || '')
    setSupplierSearch(p.supplierName || '')
    setSupplierPhone(p.supplierPhone || '')
    setNote(p.note || '')
    setPaymentMethod(p.paymentMethod || 'cash')
    setPaid(String(p.paid) || '')
    setDiscount(String(p.discount) || '')
    setDiscountType('amount')
    setShowModal(true)
  }

  async function handleSave(e) {
    e.preventDefault()
    const token = localStorage.getItem('token')
    try {
      const matched = suppliers.find(s => s.name === supplierName)
      const discAmount = discountType === 'percent' ? (totalCost * (Number(discount) || 0) / 100) : (Number(discount) || 0)
      const netCost = Math.max(0, totalCost - discAmount)
      const data = { _id: editPurchase?._id, items, totalCost, supplierName, supplierPhone, supplierId: matched?._id || '', note, paymentMethod, paid: Number(paid) || 0, discount: discAmount }
      if (editPurchase) {
        await api.savePurchase(token, data)
        toast('تم تحديث فاتورة الشراء', 'success')
      } else {
        await api.createPurchase(token, data)
        toast('تمت إضافة فاتورة الشراء', 'success')
      }
      setShowModal(false)
      setEditPurchase(null)
      window.dispatchEvent(new Event('dataChanged'))
    } catch (err) { toast(err.message, 'error') }
  }

  async function handleRemove(id) {
    if (!await confirm('حذف فاتورة الشراء؟ سيتم خصم الكمية من المخزون.')) return
    const token = localStorage.getItem('token')
    try {
      await api.removePurchase(token, id)
      toast('تم الحذف', 'success'); window.dispatchEvent(new Event('dataChanged'))
    } catch (err) { toast(err.message, 'error') }
  }

  function openReturn(p) {
    setReturnPurchase(p)
    setReturnRefundCash(false)
    const paid = p.paymentMethod === 'credit' ? Number(p.paid || 0) : 0
    setSupplierPaidForReturn(paid)
    setReturnItems(p.items.map(i => ({
      productId: i.productId, name: i.name,
      quantity: 0, unitPrice: i.cost
    })))
    setReturnReason('')
    setReturnPaymentMethod(p.paymentMethod === 'credit' ? 'supplier_balance' : p.paymentMethod)
    setShowReturnModal(true)
  }

  async function handleCreateReturn() {
    const validItems = returnItems.filter(i => Number(i.quantity) > 0)
    if (validItems.length === 0) { toast('اختر كمية للإرجاع', 'error'); return }
    const subtotal = validItems.reduce((s, i) => s + Number(i.quantity) * Number(i.unitPrice), 0)

    const token = localStorage.getItem('token')
    try {
      await api.createPurchaseReturn(token, {
        purchaseId: returnPurchase._id,
        items: validItems, subtotal,
        reason: returnReason,
        paymentMethod: returnPaymentMethod === 'supplier_balance' ? 'credit' : returnPaymentMethod
      })
      toast('تم تسجيل مرتجع المشتريات', 'success')
      setShowReturnModal(false); setReturnPurchase(null)
      window.dispatchEvent(new Event('dataChanged'))
    } catch (err) { toast(err.message, 'error') }
  }

  async function handleSaveSupplier(e) {
    e.preventDefault()
    const token = localStorage.getItem('token')
    try {
      const saved = await api.saveSupplier(token, supplierForm)
      toast('تمت إضافة المورد', 'success')
      setShowSupplierModal(false)
      setSupplierForm({ name: '', phone: '', email: '', commercialReg: '', taxReg: '', address: '', notes: '' })
      setSupplierName(saved.name)
      setSupplierId(saved._id)
      setSupplierSearch(saved.name)
      setSupplierPhone(saved.phone || '')
      window.dispatchEvent(new Event('dataChanged'))
    } catch (err) { toast(err.message, 'error') }
  }

  function handleGenerateBarcode() {
    const code = generateBarcode()
    setProductForm(f => ({ ...f, barcode: code }))
    setGeneratedBarcode(code)
    setShowPrintBarcode(true)
    setTimeout(() => categoryRef.current?.focus(), 50)
  }

  function handleBarcodeKeyDown(e) {
    if (e.key === 'Enter' && productForm.barcode.length >= 5) {
      e.preventDefault()
      setGeneratedBarcode(productForm.barcode)
      setShowPrintBarcode(true)
      setTimeout(() => categoryRef.current?.focus(), 50)
    }
  }

  async function handleSaveProduct(e) {
    e.preventDefault()
    if (!productForm.name.trim()) { toast('الرجاء إدخال اسم المنتج', 'error'); return }
    if (!productForm.priceRetail || Number(productForm.priceRetail) <= 0) { toast('الرجاء إدخال سعر التجزئة', 'error'); return }
    const token = localStorage.getItem('token')
    const data = { ...productForm, cost: Number(productForm.cost) || 0, priceRetail: Number(productForm.priceRetail) || 0, priceHalfWholesale: Number(productForm.priceHalfWholesale) || 0, priceWholesale: Number(productForm.priceWholesale) || 0, stock: Number(productForm.stock) || 0, reorderPoint: Number(productForm.reorderPoint) || 0, expiryDate: productForm.expiryDate || '' }
    try {
      await api.saveProduct(token, data)
      toast('تمت إضافة المنتج', 'success')
      setShowProductModal(false)
      setProductForm({ name: '', category: '', unit: '', barcode: '', cost: '', priceRetail: '', priceHalfWholesale: '', priceWholesale: '', stock: '', reorderPoint: '', image: '', expiryDate: '' })
      setGeneratedBarcode(''); setShowPrintBarcode(false)
      window.dispatchEvent(new Event('dataChanged'))
    } catch (err) { toast(err.message, 'error') }
  }

  return (
    <div style={{ padding: '20px', overflow: 'auto', height: '100%' }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '16px' }}>
        <h1 style={{ fontSize: '20px' }}>فواتير الشراء ({total})</h1>
        {canCreate && <button onClick={openNew} style={headerBtn}><AddIcon size={16} /> فاتورة شراء</button>}
      </div>

      <div style={{ display: 'flex', gap: '8px', marginBottom: '12px', flexWrap: 'wrap' }}>
        <input placeholder="بحث برقم الفاتورة أو اسم المورد أو رقم الهاتف..." value={search.q}
          onInput={e => { setSearch(s => ({ ...s, q: e.target.value })); setPage(0) }}
          style={{ flex: 1, minWidth: '200px' }} />
        <input type="date" value={search.dateFrom} onInput={e => { setSearch(s => ({ ...s, dateFrom: e.target.value })); setPage(0) }}
          style={{ width: '140px' }} />
        <input type="date" value={search.dateTo} onInput={e => { setSearch(s => ({ ...s, dateTo: e.target.value })); setPage(0) }}
          style={{ width: '140px' }} />
      </div>

      <div className="table-card">
        <table>
            <thead><tr><th>الفاتورة</th><th>التاريخ</th><th>المورد</th><th>الهاتف</th><th>عدد الأصناف</th><th>الإجمالي</th><th>الخصم</th><th>الصافي</th><th>نوع الدفع</th><th>المدفوع</th><th>الحالة</th><th></th></tr></thead>
          <tbody>
            {purchases.map(p => (
              <tr key={p._id}>
                <td style={{ fontWeight: 'bold', color: 'var(--success)' }}>#{p.invoiceNo}</td>
                <td style={{ fontSize: '12px', color: 'var(--text2)' }}>{formatDate(p.createdAt)}</td>
                <td>{p.supplierName || '-'}</td>
                <td style={{ fontSize: '12px', color: 'var(--text2)' }}>{p.supplierPhone || '-'}</td>
                <td>{p.items?.length || 0}</td>
                <td style={{ fontWeight: 'bold' }}>{formatMoney(p.totalCost)}</td>
                <td style={{ fontSize: '12px', color: 'var(--danger)' }}>{p.discount > 0 ? formatMoney(p.discount) : '-'}</td>
                <td style={{ fontWeight: 'bold', color: 'var(--success)' }}>{formatMoney(p.netCost)}</td>
                <td style={{ fontSize: '12px' }}>{p.paymentMethod === 'credit' ? 'آجل' : p.paymentMethod === 'card' ? 'بطاقة' : 'نقداً'}</td>
                <td style={{ fontSize: '12px' }}>{formatMoney(p.paid || 0)}</td>
                <td>{(s => {
                  const c = s === 'paid' ? 'var(--success)' : s === 'partial' ? 'var(--warning)' : 'var(--text2)'
                  const l = s === 'paid' ? 'مدفوعة' : s === 'partial' ? 'مدفوعة جزئياً' : 'آجل'
                  return <span style={{ color: c, fontSize: '12px', fontWeight: 600 }}>{l}</span>
                })(p.paymentStatus)}</td>
                <td>
                  <div style={{ display: 'flex', gap: '4px' }}>
                    <button onClick={() => setViewInvoice(p)} title="عرض" style={iconBtn('accent')}><SearchIcon size={14} /></button>
                    {canDelete && <button onClick={() => handleRemove(p._id)} title="حذف" style={iconBtn('danger')}><DeleteIcon size={14} /></button>}
                    <button onClick={() => openReturn(p)} title="مرتجع" style={iconBtn('warning')}><ReturnIcon size={14} /></button>
                  </div>
                </td>
              </tr>
            ))}
            {purchases.length === 0 && (
              <tr><td colSpan="12" style={{ padding: '24px', color: 'var(--text2)', textAlign: 'center' }}>لا توجد فواتير شراء</td></tr>
            )}
          </tbody>
        </table>
      </div>
      <Pagination page={page} totalPages={totalPages} total={total} pageSize={pageSize} onChange={setPage} />

      <Modal open={showModal} onClose={() => { setShowModal(false); setEditPurchase(null) }} title={editPurchase ? 'تعديل فاتورة شراء' : 'إضافة فاتورة شراء'} width="650px">
        <form onSubmit={handleSave} style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
          <div style={{ position: 'relative', display: 'flex', gap: '6px', alignItems: 'center' }}>
            <input placeholder="ابحث عن المورد بالاسم أو رقم الهاتف..." value={supplierSearch}
              onInput={handleSupplierSearch} onFocus={() => setShowSupplierDropdown(true)} onBlur={() => setTimeout(() => setShowSupplierDropdown(false), 200)}
              style={{ flex: 1, background: 'var(--bg)', color: 'var(--text)', border: '1px solid var(--bg3)', borderRadius: '8px', padding: '8px' }} />
            {canCreate && <button type="button" onClick={() => { setSupplierForm({ name: '', phone: '', email: '', commercialReg: '', taxReg: '', address: '', notes: '' }); setShowSupplierModal(true) }}
              style={secondaryBtn}><AddIcon size={12} /> مورد جديد</button>}
            {showSupplierDropdown && filteredSuppliers.length > 0 && (
              <div style={{ position: 'absolute', top: '100%', left: 0, right: 0, background: 'var(--bg2)', border: '1px solid var(--bg3)', borderRadius: '8px', zIndex: 10, maxHeight: '200px', overflow: 'auto' }}>
                {filteredSuppliers.map(s => (
                  <div key={s._id} onMouseDown={() => selectSupplier(s)}
                    style={{ padding: '10px', cursor: 'pointer', borderBottom: '1px solid var(--bg3)', fontSize: '13px' }}>
                    {s.name}{s.phone ? ` - ${s.phone}` : ''}
                  </div>
                ))}
              </div>
            )}
          </div>
          <input placeholder="رقم الهاتف" value={supplierPhone} readOnly
            style={{ background: 'var(--bg)', color: supplierPhone ? 'var(--text)' : 'var(--text2)', border: '1px solid var(--bg3)', borderRadius: '8px', padding: '8px', width: '100%', fontSize: '12px' }} />
          {items.map((item, idx) => (
            <div key={idx} style={{ display: 'flex', gap: '6px', alignItems: 'center' }}>
              <div style={{ flex: 2, position: 'relative', display: 'flex', gap: '4px', alignItems: 'center' }}>
                <input placeholder="ابحث أو اكتب اسم المنتج..." value={productSearch[idx] || ''}
                  onInput={e => handleProductSearch(idx, e.target.value)}
                  onKeyDown={e => {
                    if (e.key === 'Enter') {
                      const val = productSearch[idx]
                      if (/^\d{5,}$/.test(val)) {
                        const match = products.find(p => p.barcode === val)
                        if (match) { selectProductFromSearch(idx, match); e.preventDefault(); return }
                        api.listProducts(localStorage.getItem('token'), val, 1).then(data => {
                          if (data && data.length > 0) selectProductFromSearch(idx, data[0])
                        })
                      }
                    }
                  }}
                  onFocus={() => setShowProductDropdown(arr => { const n = [...arr]; n[idx] = true; return n })}
                  onBlur={() => setTimeout(() => setShowProductDropdown(arr => { const n = [...arr]; n[idx] = false; return n }), 200)}
                  style={{ flex: 1, background: 'var(--bg)', color: 'var(--text)', border: '1px solid var(--bg3)', borderRadius: '8px', padding: '8px' }} />
                {canCreate && <button type="button" onClick={() => { setProductForm({ name: productSearch[idx] || '', category: '', unit: '', barcode: '', cost: 0, priceRetail: 0, priceHalfWholesale: 0, priceWholesale: 0, stock: 0, reorderPoint: 0 }); setGeneratedBarcode(''); setShowPrintBarcode(false); setShowProductModal(true) }} title="إضافة صنف" style={iconBtn('accent')}><AddIcon size={14} /></button>}
                {showProductDropdown[idx] && filteredProducts(productSearch[idx]).length > 0 && (
                  <div style={{ position: 'absolute', top: '100%', left: 0, right: 0, background: 'var(--bg2)', border: '1px solid var(--bg3)', borderRadius: '8px', zIndex: 10, maxHeight: '200px', overflow: 'auto' }}>
                    {filteredProducts(productSearch[idx]).map(p => (
                      <div key={p._id} onMouseDown={() => selectProductFromSearch(idx, p)}
                        style={{ padding: '10px', cursor: 'pointer', borderBottom: '1px solid var(--bg3)', fontSize: '13px' }}>
                        {p.name}{p.barcode ? ` (${p.barcode})` : ''}
                      </div>
                    ))}
                  </div>
                )}
              </div>
              <input type="number" step="any" placeholder="الكمية" value={item.quantity || ''}
                onInput={e => setItems(arr => { const n = [...arr]; n[idx] = { ...n[idx], quantity: Number(e.target.value) }; return n })}
                style={{ flex: 1, background: 'var(--bg)', color: 'var(--text)', border: '1px solid var(--bg3)', borderRadius: '8px', padding: '8px', width: '70px', minWidth: '0' }} />
              <input type="number" step="any" placeholder="التكلفة" value={item.cost || ''}
                onInput={e => setItems(arr => { const n = [...arr]; n[idx] = { ...n[idx], cost: Number(e.target.value) }; return n })}
                style={{ flex: 1, background: 'var(--bg)', color: 'var(--text)', border: '1px solid var(--bg3)', borderRadius: '8px', padding: '8px', width: '80px', minWidth: '0' }} />
              <span style={{ fontSize: '12px', color: 'var(--text2)', minWidth: '60px', textAlign: 'left' }}>{formatMoney(Number(item.quantity) * Number(item.cost))}</span>
              {canCreate && items.length > 1 && <button type="button" onClick={() => removeItem(idx)} style={{ color: 'var(--danger)', background: 'none', fontSize: '16px' }}>✕</button>}
            </div>
          ))}
          {canCreate && <button type="button" onClick={addItem} style={{ ...secondaryBtn, padding: '6px', borderRadius: '6px', fontSize: '12px' }}><AddIcon size={14} /> إضافة صنف</button>}
          <div style={{ display: 'flex', gap: '10px', alignItems: 'center' }}>
            <div style={{ textAlign: 'left', fontSize: '15px', fontWeight: 'bold', color: 'var(--success)', flex: 1 }}>الإجمالي: {formatMoney(totalCost)}</div>
            <div style={{ flex: 1 }}>
              <label style={{ fontSize: '11px', color: 'var(--text2)', display: 'block', marginBottom: '2px' }}>الخصم</label>
              <div style={{ display: 'flex', gap: '4px' }}>
                <button type="button" onClick={() => setDiscountType(dt => dt === 'amount' ? 'percent' : 'amount')}
                  style={{ background: 'var(--bg3)', color: 'var(--text2)', padding: '2px 6px', borderRadius: '4px', fontSize: '10px', border: 'none', cursor: 'pointer' }}>
                  {discountType === 'amount' ? 'قيمة' : '%'}
                </button>
                <input type="number" step="any" placeholder="0" value={discount} onInput={e => setDiscount(e.target.value)}
                  style={{ flex: 1, background: 'var(--bg)', color: 'var(--text)', border: '1px solid var(--bg3)', borderRadius: '8px', padding: '8px' }} />
              </div>
            </div>
            <div style={{ flex: 1 }}>
              <label style={{ fontSize: '11px', color: 'var(--text2)', display: 'block', marginBottom: '2px' }}>المدفوع</label>
              <input type="number" step="any" placeholder="المدفوع" value={paid} onInput={e => setPaid(e.target.value)}
                style={{ width: '100%', background: 'var(--bg)', color: 'var(--text)', border: '1px solid var(--bg3)', borderRadius: '8px', padding: '8px' }} />
            </div>
          </div>
          {(() => {
            const n = Math.max(0, totalCost - (discountType === 'percent' ? (totalCost * (Number(discount) || 0) / 100) : (Number(discount) || 0)))
            const p = Number(paid) || 0
            if (Number(discount) > 0) return <div style={{ fontSize: '12px', color: 'var(--danger)', textAlign: 'center', padding: '4px 0' }}>
              الصافي: {formatMoney(n)}
            </div>
            if (p > 0 && p < n) return <div style={{ fontSize: '12px', color: 'var(--warning)', background: 'var(--bg)', borderRadius: '8px', padding: '8px', textAlign: 'center' }}>
              باقي دين مستحق للمورد: {formatMoney(n - p)}
            </div>
            return null
          })()}
          <div style={{ display: 'flex', gap: '8px' }}>
            <button type="button" onClick={() => setPaymentMethod('cash')} style={{
              flex: 1, padding: '8px', borderRadius: '8px', fontSize: '13px',
              background: paymentMethod === 'cash' ? 'var(--accent)' : 'var(--bg3)',
              color: paymentMethod === 'cash' ? '#fff' : 'var(--text)', fontWeight: paymentMethod === 'cash' ? '700' : '500'
            }}>نقداً</button>
            <button type="button" onClick={() => setPaymentMethod('card')} style={{
              flex: 1, padding: '8px', borderRadius: '8px', fontSize: '13px',
              background: paymentMethod === 'card' ? 'var(--accent)' : 'var(--bg3)',
              color: paymentMethod === 'card' ? '#fff' : 'var(--text)', fontWeight: paymentMethod === 'card' ? '700' : '500'
            }}>بطاقة</button>
            <button type="button" onClick={() => setPaymentMethod('credit')} style={{
              flex: 1, padding: '8px', borderRadius: '8px', fontSize: '13px',
              background: paymentMethod === 'credit' ? 'var(--warning)' : 'var(--bg3)',
              color: paymentMethod === 'credit' ? '#fff' : 'var(--text)', fontWeight: paymentMethod === 'credit' ? '700' : '500'
            }}>آجل</button>
          </div>
          {Number(paid) <= 0 || paid === '' ? <div style={{ fontSize: '12px', color: 'var(--warning)', background: 'var(--bg)', borderRadius: '8px', padding: '8px', textAlign: 'center' }}>
            سيتم إضافة المبلغ إلى ذمة المورد. يمكنك تسديد الدفعات من صفحة الموردين.
          </div> : paymentMethod === 'card' ? <div style={{ fontSize: '12px', color: 'var(--accent)', background: 'var(--bg)', borderRadius: '8px', padding: '8px', textAlign: 'center' }}>
            سيتم خصم {formatMoney(Number(paid))} من خزينة البنك.
          </div> : <div style={{ fontSize: '12px', color: 'var(--success)', background: 'var(--bg)', borderRadius: '8px', padding: '8px', textAlign: 'center' }}>
            سيتم خصم {formatMoney(Number(paid))} من الخزينة الرئيسية.
          </div>}
          <textarea placeholder="ملاحظة" value={note} onInput={e => setNote(e.target.value)} rows="2"
            style={{ background: 'var(--bg)', color: 'var(--text)', border: '1px solid var(--bg3)', borderRadius: '8px', padding: '8px', resize: 'vertical' }} />
          {canCreate && <button type="submit" style={modalPrimaryBtn}>
            <CheckIcon size={16} /> {editPurchase ? 'تحديث الفاتورة' : 'حفظ الفاتورة'}
          </button>}
        </form>
      </Modal>

      <Modal open={!!viewInvoice} onClose={() => setViewInvoice(null)} title={`فاتورة شراء #${viewInvoice?.invoiceNo}`} width={settings?.printDefaultSize === 'a4' ? '700px' : '380px'}>
        {viewInvoice && (
          <div id="purchase-print">
            {(() => {
              return settings?.printDefaultSize === 'a4'
                ? <PrintTemplateA4 type="purchase" data={viewInvoice} settings={settings} suppliers={suppliers} />
                : <PrintTemplateThermal data={viewInvoice} settings={settings} />
            })()}
            <div style={{ display: 'flex', gap: '8px', justifyContent: 'center', marginTop: '12px' }}>
              <button onClick={async () => {
                try {
                  if (settings?.printDefaultSize === 'a4') {
                    await printA4(<PrintTemplateA4 type="purchase" data={viewInvoice} settings={settings} suppliers={suppliers} />)
                  } else {
                    await printThermal(<PrintTemplateThermal data={viewInvoice} settings={settings} />)
                  }
                } catch (err) {
                  toast('فشلت الطباعة: ' + err.message, 'error')
                }
              }}
                style={modalPrimaryBtn}>
                <PrintIcon size={16} /> {settings?.printDefaultSize === 'a4' ? 'كبير (A4)' : 'طباعة'}
              </button>
            </div>
          </div>
        )}
      </Modal>

      <Modal open={showReturnModal} onClose={() => { setShowReturnModal(false); setReturnPurchase(null); setReturnRefundCash(false); setSupplierPaidForReturn(0) }} title={`مرتجع مشتريات - فاتورة #${returnPurchase?.invoiceNo}`} width="500px">
        {returnPurchase && (
          <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
            <div style={{ fontSize: '12px', color: 'var(--text2)' }}>المورد: {returnPurchase.supplierName}</div>
            {returnPurchase.paymentMethod === 'credit' && (
              <div style={{ fontSize: '12px', color: 'var(--text2)', padding: '4px 0' }}>
                المبلغ المدفوع للمورد: <strong style={{ color: 'var(--text)' }}>{formatMoney(supplierPaidForReturn)}</strong>
              </div>
            )}
            {returnItems.map((item, idx) => {
              const oldReturns = purchaseReturns.filter(r => r.purchaseId === returnPurchase._id)
              const returnedQty = oldReturns.reduce((s, r) => s + (r.items.find(i => i.productId === item.productId)?.quantity || 0), 0)
              const maxReturn = (returnPurchase.items.find(i => i.productId === item.productId)?.quantity || 0) - returnedQty
              return (
                <div key={idx} style={{ display: 'flex', gap: '6px', alignItems: 'center', padding: '6px', background: 'var(--bg)', borderRadius: '8px' }}>
                  <span style={{ flex: 2, fontSize: '13px' }}>{item.name}</span>
                  <input type="number" step="any" placeholder="الكمية" value={item.quantity || ''}
                    onInput={e => setReturnItems(arr => { const n = [...arr]; n[idx] = { ...n[idx], quantity: Math.min(Number(e.target.value) || 0, maxReturn) }; return n })}
                    style={{ flex: 1, width: '60px', background: 'var(--bg)', color: 'var(--text)', border: '1px solid var(--bg3)', borderRadius: '8px', padding: '6px' }} />
                  <input type="number" step="any" placeholder="سعر الوحدة" value={item.unitPrice || ''}
                    onInput={e => setReturnItems(arr => { const n = [...arr]; n[idx] = { ...n[idx], unitPrice: Number(e.target.value) || 0 }; return n })}
                    style={{ flex: 1, width: '60px', background: 'var(--bg)', color: 'var(--text)', border: '1px solid var(--bg3)', borderRadius: '8px', padding: '6px' }} />
                  <span style={{ fontSize: '11px', color: 'var(--text2)', minWidth: '60px', textAlign: 'left' }}>{formatMoney(Number(item.quantity) * Number(item.unitPrice))}</span>
                </div>
              )
            })}
            <div style={{ textAlign: 'left', fontWeight: 'bold', fontSize: '14px', color: 'var(--success)' }}>
              الإجمالي: {formatMoney(returnItems.reduce((s, i) => s + Number(i.quantity) * Number(i.unitPrice), 0))}
            </div>
            <textarea placeholder="سبب الإرجاع (اختياري)" value={returnReason} onInput={e => setReturnReason(e.target.value)} rows="2"
              style={{ background: 'var(--bg)', color: 'var(--text)', border: '1px solid var(--bg3)', borderRadius: '8px', padding: '8px', resize: 'vertical' }} />
            <div style={{ display: 'flex', gap: '6px' }}>
              {['cash','card','supplier_balance'].map(m => (
                <button key={m} type="button" onClick={() => setReturnPaymentMethod(m)}
                  style={{
                    flex: 1, padding: '10px', borderRadius: '8px', fontSize: '13px', fontWeight: 'bold',
                    background: returnPaymentMethod === m
                      ? (m === 'cash' ? 'var(--success)' : m === 'card' ? 'var(--accent)' : 'var(--warning)')
                      : 'var(--bg3)',
                    color: returnPaymentMethod === m ? '#fff' : 'var(--text)'
                  }}>
                  {m === 'cash' ? 'نقداً' : m === 'card' ? 'بطاقة' : 'رصيد مستحق للمورد'}
                </button>
              ))}
            </div>
            <button onClick={handleCreateReturn} style={modalWarningBtn}>
              <ReturnIcon size={16} /> تسجيل مرتجع
            </button>
          </div>
        )}
      </Modal>

      <Modal open={showSupplierModal} onClose={() => setShowSupplierModal(false)} title="إضافة مورد جديد" width="450px">
        <form onSubmit={handleSaveSupplier} style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
          <input placeholder="الاسم *" value={supplierForm.name} onInput={e => setSupplierForm(s => ({ ...s, name: e.target.value }))} required style={{ width: '100%' }} />
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '10px' }}>
            <input placeholder="رقم الهاتف *" value={supplierForm.phone} onInput={e => setSupplierForm(s => ({ ...s, phone: e.target.value }))} required style={{ width: '100%' }} />
            <input placeholder="البريد الإلكتروني" type="email" value={supplierForm.email} onInput={e => setSupplierForm(s => ({ ...s, email: e.target.value }))} style={{ width: '100%' }} />
          </div>
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '10px' }}>
            <input placeholder="رقم السجل التجاري" value={supplierForm.commercialReg} onInput={e => setSupplierForm(s => ({ ...s, commercialReg: e.target.value }))} style={{ width: '100%' }} />
            <input placeholder="رقم السجل الضريبي" value={supplierForm.taxReg} onInput={e => setSupplierForm(s => ({ ...s, taxReg: e.target.value }))} style={{ width: '100%' }} />
          </div>
          <input placeholder="العنوان" value={supplierForm.address} onInput={e => setSupplierForm(s => ({ ...s, address: e.target.value }))} style={{ width: '100%' }} />
          <textarea placeholder="ملاحظات" value={supplierForm.notes} onInput={e => setSupplierForm(s => ({ ...s, notes: e.target.value }))} rows="2" style={{ width: '100%', resize: 'vertical' }} />
          <button type="submit" style={modalSuccessBtn}><CheckIcon size={16} /> إضافة</button>
        </form>
      </Modal>

      <Modal open={showProductModal} onClose={() => { setShowProductModal(false); setGeneratedBarcode(''); setShowPrintBarcode(false) }} title="إضافة منتج جديد" width="750px">
        <form onSubmit={handleSaveProduct} style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
          <div style={{ display:'flex', gap:'12px', alignItems:'start' }}>
            <div onClick={() => imgRef.current?.click()} style={{ minWidth:'100px',width:'100px',height:'100px',borderRadius:'12px',border:'2px dashed var(--bg3)',display:'flex',alignItems:'center',justifyContent:'center',cursor:'pointer',overflow:'hidden',background:'var(--bg)',fontSize:'11px',color:'var(--text2)',textAlign:'center' }}>
              {productForm.image ? <img src={productForm.image} alt="" style={{ width:'100%',height:'100%',objectFit:'cover' }} /> : 'إضافة صورة'}
              <input ref={imgRef} type="file" accept="image/*" style={{ display:'none' }} onChange={e => { const f = e.target.files?.[0]; if (!f) return; const r = new FileReader(); r.onload = () => setProductForm(x => ({ ...x, image: r.result })); r.readAsDataURL(f) }} />
            </div>
            <div style={{ flex:1, display:'grid', gridTemplateColumns:'1fr 1fr', gap:'10px' }}>
            <Input label="الاسم *" inputRef={nameRef} value={productForm.name} onInput={v => setProductForm(f => ({ ...f, name: v }))} required />
            <div>
              <label style={{ fontSize: '11px', color: 'var(--text2)', display: 'block', marginBottom: '4px' }}>الباركود</label>
              <div style={{ display: 'flex', gap: '4px' }}>
                <input ref={barcodeRef} value={productForm.barcode} onInput={e => setProductForm(f => ({ ...f, barcode: e.target.value }))} onKeyDown={handleBarcodeKeyDown} style={{ flex: 1 }} />
                <button type="button" onClick={handleGenerateBarcode} title="إنشاء" style={iconBtn('accent')}><BarcodeIcon size={14} /></button>
              </div>
              {showPrintBarcode && productForm.barcode && (
                <div style={{ marginTop: '8px', padding: '8px', background: 'var(--bg)', borderRadius: '8px', textAlign: 'center' }}>
                  {(() => {
                    const labelSize = localStorage.getItem('barcodeLabelSize') || '50x30'
                    const dims = labelSize.split('x').map(Number)
                    const bw = Math.min(Number(dims[0]) * 3.78, 400)
                    const bh = Math.min(Number(dims[1]) * 3.78, 250)
                    return <BarcodeSVG code={productForm.barcode} width={bw} height={bh} />
                  })()}
                  <div style={{ fontSize: '12px', color: 'var(--text2)', marginTop: '4px' }}>{productForm.barcode}</div>
                  <button type="button" onClick={async () => { setPrintingBarcode(true); try { await printBarcode(productForm.barcode, { name: productForm.name, price: productForm.priceRetail }) } catch (err) { toast('فشلت طباعة الباركود: ' + err.message, 'error') }; setPrintingBarcode(false) }} disabled={printingBarcode}
                    style={{ ...secondaryBtn, background: 'var(--success)', color: '#fff' }}>
                    <PrintIcon size={14} /> {printingBarcode ? 'جاري...' : 'طباعة الباركود'}
                  </button>
                </div>
              )}
            </div>
            <div>
              <label style={{ fontSize: '11px', color: 'var(--text2)', display: 'block', marginBottom: '4px' }}>التصنيف</label>
              <input ref={categoryRef} list="p-cat-list" value={productForm.category} onInput={e => setProductForm(f => ({ ...f, category: e.target.value }))} style={{ width: '100%' }} />
              <datalist id="p-cat-list">{categories.map(c => <option key={c} value={c} />)}</datalist>
            </div>
            <div>
              <label style={{ fontSize: '11px', color: 'var(--text2)', display: 'block', marginBottom: '4px' }}>الوحدة</label>
              <select value={productForm.unit} onChange={e => setProductForm(f => ({ ...f, unit: e.target.value }))} style={{ width: '100%', background: 'var(--bg)', color: 'var(--text)', border: '1px solid var(--bg3)', borderRadius: '8px', padding: '8px' }}>
                <option value="">-- اختر الوحدة --</option>
                <option value="قطعة">قطعة (صحيحة)</option>
                <option value="حبة">حبة (صحيحة)</option>
                <option value="دسته">دسته (صحيحة)</option>
                <option value="دزينة">دزينة (صحيحة)</option>
                <option value="درزن">درزن (صحيحة)</option>
                <option value="زوج">زوج (صحيحة)</option>
                <option value="كيلو">كيلو (عشرية)</option>
                <option value="كجم">كجم (عشرية)</option>
                <option value="جرام">جرام (عشرية)</option>
                <option value="جم">جم (عشرية)</option>
                <option value="طن">طن (عشرية)</option>
                <option value="لتر">لتر (عشرية)</option>
                <option value="مل">مل (عشرية)</option>
                <option value="جالون">جالون (عشرية)</option>
                <option value="متر">متر (عشرية)</option>
                <option value="سم">سم (عشرية)</option>
                <option value="قدم">قدم (عشرية)</option>
                <option value="ياردة">ياردة (عشرية)</option>
                <option value="علبة">علبة (صحيحة)</option>
                <option value="زجاجة">زجاجة (صحيحة)</option>
                <option value="قارورة">قارورة (صحيحة)</option>
                <option value="عبوة">عبوة (صحيحة)</option>
                <option value="صفيحة">صفيحة (صحيحة)</option>
                <option value="كرتونة">كرتونة (صحيحة)</option>
                <option value="صندوق">صندوق (صحيحة)</option>
                <option value="كيس">كيس (صحيحة)</option>
                <option value="شريط">شريط (صحيحة)</option>
                <option value="لفة">لفة (صحيحة)</option>
                <option value="رزمة">رزمة (صحيحة)</option>
                <option value="حزمة">حزمة (صحيحة)</option>
                <option value="بالة">بالة (صحيحة)</option>
                <option value="طبق">طبق (صحيحة)</option>
                <option value="برميل">برميل (صحيحة)</option>
              </select>
            </div>
            <div>
              <label style={{ fontSize: '11px', color: 'var(--text2)', display: 'block', marginBottom: '4px' }}>التكلفة {productForm.stock > 0 && <span style={{ color: 'var(--warning)', fontSize: '10px' }}>(محسوبة من المشتريات)</span>}</label>
              <input type="number" step="any" value={productForm.cost} onInput={e => setProductForm(f => ({ ...f, cost: e.target.value }))} placeholder="التكلفة" disabled={productForm.stock > 0} style={{ width: '100%', opacity: productForm.stock > 0 ? 0.6 : 1 }} />
            </div>
            <Input label="سعر التجزئة *" type="number" step="any" value={productForm.priceRetail} onInput={v => setProductForm(f => ({ ...f, priceRetail: v }))} placeholder="سعر التجزئة" />
            <Input label="سعر نصف الجملة" type="number" step="any" value={productForm.priceHalfWholesale} onInput={v => setProductForm(f => ({ ...f, priceHalfWholesale: v }))} placeholder="سعر نصف الجملة" />
            <Input label="سعر الجملة" type="number" step="any" value={productForm.priceWholesale} onInput={v => setProductForm(f => ({ ...f, priceWholesale: v }))} placeholder="سعر الجملة" />
            <Input label="المخزون" type="number" step="any" value={productForm.stock} onInput={v => setProductForm(f => ({ ...f, stock: v }))} placeholder="المخزون" />
            <Input label="تنبيه انتهاء المخزون" type="number" step="any" value={productForm.reorderPoint} onInput={v => setProductForm(f => ({ ...f, reorderPoint: v }))} placeholder="تنبيه انتهاء المخزون" />
            <div>
              <label style={{ fontSize: '11px', color: 'var(--text2)', display: 'block', marginBottom: '4px' }}>تاريخ انتهاء الصلاحية</label>
              <input type="date" value={productForm.expiryDate} onInput={e => setProductForm(f => ({ ...f, expiryDate: e.target.value }))} style={{ width: '100%' }} />
            </div>
          </div>
          </div>
          <button type="submit" style={modalPrimaryBtn}><CheckIcon size={16} /> إضافة</button>
        </form>
      </Modal>
      <ConfirmDialog />
    </div>
  )
}

function Input({ label, type = 'text', value, onInput, required, placeholder, inputRef, step }) {
  return (
    <div>
      <label style={{ fontSize: '11px', color: 'var(--text2)', display: 'block', marginBottom: '4px' }}>{label}</label>
      <input ref={inputRef} type={type} value={value} onInput={e => onInput(e.target.value)} required={required} placeholder={placeholder} step={step} style={{ width: '100%' }} />
    </div>
  )
}