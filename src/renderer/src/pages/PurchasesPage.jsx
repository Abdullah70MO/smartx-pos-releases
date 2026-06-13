import { useState, useEffect, useRef } from 'preact/hooks'
import api from '../api'
import Modal from '../components/Modal'
import { useToast } from '../components/Toast'
import { formatDate } from '../utils/date'
import { formatMoney } from '../utils/money'
import { useStore } from '../store'
import { useConfirm } from '../components/ConfirmModal'
import PrintTemplateA4 from '../components/PrintTemplateA4'
import { printA4 } from '../utils/print'

function generateBarcode() {
  const first = Math.floor(Math.random() * 9) + 1
  const rest = Array.from({ length: 11 }, () => Math.floor(Math.random() * 10)).join('')
  const digits = String(first) + rest
  const check = calcEAN13Check(digits)
  return digits + check
}

function calcEAN13Check(code) {
  let sum = 0
  for (let i = 0; i < code.length; i++) {
    sum += parseInt(code[i]) * (i % 2 === 0 ? 1 : 3)
  }
  const mod = sum % 10
  return String(mod === 0 ? 0 : 10 - mod)
}

const L_CODE = ['0001101','0011001','0010011','0111101','0100011','0110001','0101111','0111011','0110111','0001011']
const G_CODE = ['0100111','0110011','0011011','0100001','0011101','0111001','0000101','0010001','0001001','0010111']
const R_CODE = ['1110010','1100110','1101100','1000010','1011100','1001110','1010000','1000100','1001000','1110100']
const PARITY = [
  'LLLLLL','LLGLGG','LLGGLG','LLGGGL','LGLLGG',
  'LGGLLG','LGGGLL','LGLGLG','LGLGGL','LGGLGL'
]

function encodeEAN13(code) {
  const first = parseInt(code[0])
  const left = code.slice(1, 7).split('')
  const right = code.slice(7).split('')
  const parity = PARITY[first]
  let pattern = '101'
  left.forEach((d, i) => {
    pattern += (parity[i] === 'L' ? L_CODE : G_CODE)[parseInt(d)]
  })
  pattern += '01010'
  right.forEach(d => {
    pattern += R_CODE[parseInt(d)]
  })
  pattern += '101'
  return pattern
}

function BarcodeSVG({ code, width = 220, height = 55 }) {
  const pattern = encodeEAN13(code)
  const moduleWidth = width / pattern.length
  let x = 0
  const rects = []
  for (let i = 0; i < pattern.length; i++) {
    if (pattern[i] === '1') {
      rects.push(`<rect x="${x}" y="0" width="${moduleWidth}" height="${height-16}" fill="#000" />`)
    }
    x += moduleWidth
  }
  const svgContent = rects.join('')
  const svg = `<svg width="${width}" height="${height}" xmlns="http://www.w3.org/2000/svg" style="background:#fff">
    ${svgContent}
    <text x="${width/2}" y="${height-2}" text-anchor="middle" font-family="monospace" font-size="11" fill="#000">${code}</text>
  </svg>`
  return <div style={{ textAlign: 'center' }} dangerouslySetInnerHTML={{ __html: svg }} />
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
  const [search, setSearch] = useState({ q: '', dateFrom: '', dateTo: '' })
  const [items, setItems] = useState([{ productId: '', name: '', quantity: '', cost: '' }])
  const [productSearch, setProductSearch] = useState([''])
  const [showProductDropdown, setShowProductDropdown] = useState([false])
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
    cost: 0, priceRetail: 0, priceHalfWholesale: 0, priceWholesale: 0,
    stock: 0, reorderPoint: 0
  })
  const [generatedBarcode, setGeneratedBarcode] = useState('')
  const [showPrintBarcode, setShowPrintBarcode] = useState(false)
  const [settings, setSettings] = useState(null)
  const categories = [...new Set(products.map(p => p.category).filter(Boolean))]
  const units = [...new Set(products.map(p => p.unit).filter(Boolean))]
  const categoryRef = useRef(null)

  useEffect(() => { loadPurchases(); loadProducts(); loadSuppliers(); loadSettings() }, [])
  useEffect(() => {
    const handler = () => { loadProducts(); loadSuppliers() }
    window.addEventListener('dataChanged', handler)
    return () => window.removeEventListener('dataChanged', handler)
  }, [])

  async function loadPurchases() {
    const token = localStorage.getItem('token')
    const data = await api.listPurchases(token)
    setPurchases(data)
  }

  async function loadProducts() {
    const token = localStorage.getItem('token')
    const data = await api.listProducts(token)
    setProducts(data)
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
  }

  function selectProductFromSearch(idx, p) {
    setItems(arr => {
      const next = [...arr]
      next[idx] = { ...next[idx], productId: p._id, name: p.name, cost: p.cost }
      return next
    })
    setProductSearch(arr => { const n = [...arr]; n[idx] = p.name; return n })
    setShowProductDropdown(arr => { const n = [...arr]; n[idx] = false; return n })
  }

  function filteredProducts(search) {
    if (!search) return []
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
    if (supplierName && v !== supplierName) { setSupplierName(''); setSupplierPhone('') }
    const exact = suppliers.find(s => s.name === v)
    if (exact) {
      setSupplierName(exact.name)
      setSupplierPhone(exact.phone || '')
    }
  }

  function selectSupplier(s) {
    setSupplierName(s.name); setSupplierId(s._id); setSupplierSearch(s.name); setSupplierPhone(s.phone || ''); setShowSupplierDropdown(false)
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
      loadPurchases(); loadProducts()
      window.dispatchEvent(new Event('dataChanged'))
    } catch (err) { toast(err.message, 'error') }
  }

  async function handleRemove(id) {
    if (!await confirm('حذف فاتورة الشراء؟ سيتم خصم الكمية من المخزون.')) return
    const token = localStorage.getItem('token')
    try {
      await api.removePurchase(token, id)
      toast('تم الحذف', 'success'); loadPurchases(); loadProducts(); window.dispatchEvent(new Event('dataChanged'))
    } catch (err) { toast(err.message, 'error') }
  }

  async function handleSaveSupplier(e) {
    e.preventDefault()
    const token = localStorage.getItem('token')
    try {
      await api.saveSupplier(token, supplierForm)
      toast('تمت إضافة المورد', 'success')
      setShowSupplierModal(false)
      setSupplierForm({ name: '', phone: '', email: '', commercialReg: '', taxReg: '', address: '', notes: '' })
      loadSuppliers(); window.dispatchEvent(new Event('dataChanged'))
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
    const token = localStorage.getItem('token')
    try {
      await api.saveProduct(token, productForm)
      toast('تمت إضافة المنتج', 'success')
      setShowProductModal(false)
      setProductForm({ name: '', category: '', unit: '', barcode: '', cost: 0, priceRetail: 0, priceHalfWholesale: 0, priceWholesale: 0, stock: 0, reorderPoint: 0 })
      setGeneratedBarcode(''); setShowPrintBarcode(false)
      loadProducts(); window.dispatchEvent(new Event('dataChanged'))
    } catch (err) { toast(err.message, 'error') }
  }

  const filtered = purchases.filter(p => {
    const q = search.q
    const matchQ = !q || String(p.invoiceNo).includes(q) || p.supplierName?.includes(q) || p.supplierPhone?.includes(q)
    const matchDate = (!search.dateFrom || new Date(p.createdAt) >= new Date(search.dateFrom)) &&
      (!search.dateTo || new Date(p.createdAt) <= new Date(search.dateTo + 'T23:59:59'))
    return matchQ && matchDate
  })

  return (
    <div style={{ padding: '20px', overflow: 'auto', height: '100vh' }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '16px' }}>
        <h1 style={{ fontSize: '20px' }}>فواتير الشراء</h1>
        {canCreate && <button onClick={openNew} style={{ background: 'var(--accent)', color: '#fff', padding: '8px 16px', borderRadius: '8px', fontSize: '13px' }}>+ فاتورة شراء</button>}
      </div>

      <div style={{ display: 'flex', gap: '8px', marginBottom: '12px', flexWrap: 'wrap' }}>
        <input placeholder="بحث برقم الفاتورة أو اسم المورد أو رقم الهاتف..." value={search.q}
          onInput={e => setSearch(s => ({ ...s, q: e.target.value }))}
          style={{ flex: 1, minWidth: '200px' }} />
        <input type="date" value={search.dateFrom} onInput={e => setSearch(s => ({ ...s, dateFrom: e.target.value }))}
          style={{ width: '140px' }} />
        <input type="date" value={search.dateTo} onInput={e => setSearch(s => ({ ...s, dateTo: e.target.value }))}
          style={{ width: '140px' }} />
      </div>

      <div style={{ background: 'var(--bg2)', borderRadius: '12px', overflow: 'auto' }}>
        <table>
            <thead><tr><th>الفاتورة</th><th>التاريخ</th><th>المورد</th><th>الهاتف</th><th>عدد الأصناف</th><th>الإجمالي</th><th>الخصم</th><th>الصافي</th><th>المدفوع</th><th>الحالة</th><th></th></tr></thead>
          <tbody>
            {filtered.map(p => (
              <tr key={p._id}>
                <td style={{ fontWeight: 'bold', color: 'var(--success)' }}>#{p.invoiceNo}</td>
                <td style={{ fontSize: '12px', color: 'var(--text2)' }}>{formatDate(p.createdAt)}</td>
                <td>{p.supplierName || '-'}</td>
                <td style={{ fontSize: '12px', color: 'var(--text2)' }}>{p.supplierPhone || '-'}</td>
                <td>{p.items?.length || 0}</td>
                <td style={{ fontWeight: 'bold' }}>{formatMoney(p.totalCost)}</td>
                <td style={{ fontSize: '12px', color: 'var(--danger)' }}>{p.discount > 0 ? formatMoney(p.discount) : '-'}</td>
                <td style={{ fontWeight: 'bold', color: 'var(--success)' }}>{formatMoney(p.netCost)}</td>
                <td style={{ fontSize: '12px' }}>{formatMoney(p.paid || 0)}</td>
                <td>{(s => {
                  const c = s === 'paid' ? 'var(--success)' : s === 'partial' ? 'var(--warning)' : 'var(--text2)'
                  const l = s === 'paid' ? 'مدفوعة' : s === 'partial' ? 'مدفوعة جزئياً' : 'آجل'
                  return <span style={{ color: c, fontSize: '12px', fontWeight: 600 }}>{l}</span>
                })(p.paymentStatus)}</td>
                <td>
                  <div style={{ display: 'flex', gap: '4px' }}>
                    <button onClick={() => setViewInvoice(p)} style={{ background: 'var(--bg3)', color: 'var(--accent)', padding: '4px 10px', borderRadius: '4px', fontSize: '11px' }}>عرض</button>
                    {canDelete && <button onClick={() => handleRemove(p._id)} style={{ background: 'var(--bg3)', color: 'var(--danger)', padding: '4px 10px', borderRadius: '4px', fontSize: '11px' }}>حذف</button>}
                  </div>
                </td>
              </tr>
            ))}
            {filtered.length === 0 && (
              <tr><td colSpan="11" style={{ padding: '24px', color: '#475569', textAlign: 'center' }}>لا توجد فواتير شراء</td></tr>
            )}
          </tbody>
        </table>
      </div>

      <Modal open={showModal} onClose={() => { setShowModal(false); setEditPurchase(null) }} title={editPurchase ? 'تعديل فاتورة شراء' : 'إضافة فاتورة شراء'} width="650px">
        <form onSubmit={handleSave} style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
          <div style={{ position: 'relative', display: 'flex', gap: '6px', alignItems: 'center' }}>
            <input placeholder="ابحث عن المورد بالاسم أو رقم الهاتف..." value={supplierSearch}
              onInput={handleSupplierSearch} onFocus={() => setShowSupplierDropdown(true)} onBlur={() => setTimeout(() => setShowSupplierDropdown(false), 200)}
              style={{ flex: 1, background: 'var(--bg)', color: 'var(--text)', border: '1px solid var(--bg3)', borderRadius: '8px', padding: '8px' }} />
            {canCreate && <button type="button" onClick={() => { setSupplierForm({ name: '', phone: '', email: '', commercialReg: '', taxReg: '', address: '', notes: '' }); setShowSupplierModal(true) }}
              style={{ background: 'var(--bg3)', color: 'var(--accent)', padding: '8px 12px', borderRadius: '6px', fontSize: '11px', whiteSpace: 'nowrap' }}>مورد جديد</button>}
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
                  onFocus={() => setShowProductDropdown(arr => { const n = [...arr]; n[idx] = true; return n })}
                  onBlur={() => setTimeout(() => setShowProductDropdown(arr => { const n = [...arr]; n[idx] = false; return n }), 200)}
                  style={{ flex: 1, background: 'var(--bg)', color: 'var(--text)', border: '1px solid var(--bg3)', borderRadius: '8px', padding: '8px' }} />
                {canCreate && <button type="button" onClick={() => { setProductForm({ name: '', category: '', unit: '', barcode: '', cost: 0, priceRetail: 0, priceHalfWholesale: 0, priceWholesale: 0, stock: 0, reorderPoint: 0 }); setGeneratedBarcode(''); setShowPrintBarcode(false); setShowProductModal(true) }}
                  style={{ background: 'var(--bg3)', color: 'var(--accent)', padding: '6px 10px', borderRadius: '4px', fontSize: '11px', whiteSpace: 'nowrap' }}>+</button>}
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
              <input type="number" placeholder="الكمية" value={item.quantity || ''}
                onInput={e => setItems(arr => { const n = [...arr]; n[idx] = { ...n[idx], quantity: Number(e.target.value) }; return n })}
                style={{ flex: 1, background: 'var(--bg)', color: 'var(--text)', border: '1px solid var(--bg3)', borderRadius: '8px', padding: '8px', width: '70px', minWidth: '0' }} />
              <input type="number" placeholder="التكلفة" value={item.cost || ''}
                onInput={e => setItems(arr => { const n = [...arr]; n[idx] = { ...n[idx], cost: Number(e.target.value) }; return n })}
                style={{ flex: 1, background: 'var(--bg)', color: 'var(--text)', border: '1px solid var(--bg3)', borderRadius: '8px', padding: '8px', width: '80px', minWidth: '0' }} />
              <span style={{ fontSize: '12px', color: 'var(--text2)', minWidth: '60px', textAlign: 'left' }}>{formatMoney(Number(item.quantity) * Number(item.cost))}</span>
              {canCreate && items.length > 1 && <button type="button" onClick={() => removeItem(idx)} style={{ color: 'var(--danger)', background: 'none', fontSize: '16px' }}>✕</button>}
            </div>
          ))}
          {canCreate && <button type="button" onClick={addItem} style={{ background: 'var(--bg3)', color: 'var(--accent)', padding: '6px', borderRadius: '6px', fontSize: '12px' }}>+ إضافة صنف</button>}
          <div style={{ display: 'flex', gap: '10px', alignItems: 'center' }}>
            <div style={{ textAlign: 'left', fontSize: '15px', fontWeight: 'bold', color: 'var(--success)', flex: 1 }}>الإجمالي: {formatMoney(totalCost)}</div>
            <div style={{ flex: 1 }}>
              <label style={{ fontSize: '11px', color: 'var(--text2)', display: 'block', marginBottom: '2px' }}>الخصم</label>
              <div style={{ display: 'flex', gap: '4px' }}>
                <button type="button" onClick={() => setDiscountType(dt => dt === 'amount' ? 'percent' : 'amount')}
                  style={{ background: 'var(--bg3)', color: 'var(--text2)', padding: '2px 6px', borderRadius: '4px', fontSize: '10px', border: 'none', cursor: 'pointer' }}>
                  {discountType === 'amount' ? 'قيمة' : '%'}
                </button>
                <input type="number" placeholder="0" value={discount} onInput={e => setDiscount(e.target.value)}
                  style={{ flex: 1, background: 'var(--bg)', color: 'var(--text)', border: '1px solid var(--bg3)', borderRadius: '8px', padding: '8px' }} />
              </div>
            </div>
            <div style={{ flex: 1 }}>
              <label style={{ fontSize: '11px', color: 'var(--text2)', display: 'block', marginBottom: '2px' }}>المدفوع</label>
              <input type="number" placeholder="المدفوع" value={paid} onInput={e => setPaid(e.target.value)}
                style={{ width: '100%', background: 'var(--bg)', color: 'var(--text)', border: '1px solid var(--bg3)', borderRadius: '8px', padding: '8px' }} />
            </div>
          </div>
          {(() => {
            const n = Math.max(0, totalCost - (discountType === 'percent' ? (totalCost * (Number(discount) || 0) / 100) : (Number(discount) || 0)))
            const p = Number(paid) || 0
            if (Number(discount) > 0) return <div style={{ fontSize: '12px', color: 'var(--danger)', textAlign: 'center', padding: '4px 0' }}>
              الصافي: {formatMoney(n)}
            </div>
            if (p > 0 && p < n) return <div style={{ fontSize: '12px', color: '#f59e0b', background: 'var(--bg)', borderRadius: '8px', padding: '8px', textAlign: 'center' }}>
              الباقي: {formatMoney(n - p)} دين على المورد
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
              background: paymentMethod === 'card' ? '#3b82f6' : 'var(--bg3)',
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
          </div> : paymentMethod === 'card' ? <div style={{ fontSize: '12px', color: '#3b82f6', background: 'var(--bg)', borderRadius: '8px', padding: '8px', textAlign: 'center' }}>
            سيتم خصم {formatMoney(Number(paid))} من خزينة البنك.
          </div> : <div style={{ fontSize: '12px', color: 'var(--success)', background: 'var(--bg)', borderRadius: '8px', padding: '8px', textAlign: 'center' }}>
            سيتم خصم {formatMoney(Number(paid))} من الخزينة الرئيسية.
          </div>}
          <textarea placeholder="ملاحظة" value={note} onInput={e => setNote(e.target.value)} rows="2"
            style={{ background: 'var(--bg)', color: 'var(--text)', border: '1px solid var(--bg3)', borderRadius: '8px', padding: '8px', resize: 'vertical' }} />
          {canCreate && <button type="submit" style={{ background: 'var(--accent)', color: '#fff', padding: '10px', borderRadius: '8px', fontSize: '14px' }}>
            {editPurchase ? 'تحديث الفاتورة' : 'حفظ الفاتورة'}
          </button>}
        </form>
      </Modal>

      <Modal open={!!viewInvoice} onClose={() => setViewInvoice(null)} title={`فاتورة شراء #${viewInvoice?.invoiceNo}`} width="380px">
        {viewInvoice && (
          <div style={{ fontSize: '12px', textAlign: 'center' }} id="purchase-print">
            <div style={{ fontWeight: 'bold', fontSize: '16px', marginBottom: '4px' }}>فاتورة شراء</div>
            <div style={{ color: 'var(--text2)', marginBottom: '4px' }}>رقم: #{viewInvoice.invoiceNo}</div>
            <div style={{ color: 'var(--text2)', marginBottom: '8px' }}>{formatDate(viewInvoice.createdAt)}</div>
            {viewInvoice.supplierName && ((s => (
              <div style={{ marginBottom: '8px', color: 'var(--text2)', fontSize: '11px' }}>
                <div style={{ fontWeight: 'bold', fontSize: '13px', color: 'var(--text)' }}>{viewInvoice.supplierName}</div>
                {viewInvoice.supplierPhone && <div>الهاتف: {viewInvoice.supplierPhone}</div>}
                {s?.email && <div>البريد: {s.email}</div>}
                {s?.commercialReg && <div>سجل تجاري: {s.commercialReg}</div>}
                {s?.taxReg && <div>سجل ضريبي: {s.taxReg}</div>}
                {s?.address && <div>العنوان: {s.address}</div>}
              </div>
            ))(suppliers.find(s => s._id === viewInvoice.supplierId)))}
            <div style={{ borderTop: '1px dashed var(--bg3)', margin: '8px 0' }}></div>
            {viewInvoice.items?.map((item, i) => (
              <div key={i} style={{ display: 'flex', justifyContent: 'space-between', padding: '3px 0' }}>
                <span>{item.name} × {item.quantity}</span>
                <span>{formatMoney(item.quantity * item.cost)}</span>
              </div>
            ))}
            <div style={{ borderTop: '1px dashed var(--bg3)', margin: '8px 0' }}></div>
            {(s => {
              const l = s === 'paid' ? 'مدفوعة' : s === 'partial' ? 'مدفوعة جزئياً' : 'آجل'
              return <div style={{ marginTop: '4px', color: 'var(--text2)', fontSize: '11px' }}>الحالة: {l}</div>
            })(viewInvoice.paymentStatus)}
            <div style={{ marginTop: '4px', color: 'var(--text2)', fontSize: '11px' }}>طريقة الدفع: {viewInvoice.paymentMethod === 'credit' ? 'آجل' : viewInvoice.paymentMethod === 'card' ? 'بطاقة' : 'نقداً'}</div>
            <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '14px', fontWeight: 'bold', marginTop: '4px' }}>
              <span>الإجمالي</span><span style={{ color: 'var(--success)' }}>{formatMoney(viewInvoice.totalCost)}</span>
            </div>
            {viewInvoice.discount > 0 && (
              <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '12px', marginTop: '2px' }}>
                <span>الخصم</span><span style={{ color: 'var(--danger)' }}>-{formatMoney(viewInvoice.discount)}</span>
              </div>
            )}
            <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '12px', marginTop: '2px' }}>
              <span>الصافي</span><span style={{ color: 'var(--success)' }}>{formatMoney(viewInvoice.netCost)}</span>
            </div>
            {viewInvoice.paid > 0 && (
              <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '12px', marginTop: '2px' }}>
                <span>المدفوع</span><span style={{ color: 'var(--success)' }}>{formatMoney(viewInvoice.paid)}</span>
              </div>
            )}
            {(viewInvoice.paid || 0) < viewInvoice.netCost && (
              <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '12px', marginTop: '2px', color: 'var(--warning)' }}>
                <span>الباقي</span><span>{formatMoney(viewInvoice.netCost - (viewInvoice.paid || 0))}</span>
              </div>
            )}
            {viewInvoice.note && <div style={{ marginTop: '8px', color: '#f97316', fontSize: '11px' }}>{viewInvoice.note}</div>}
            <div style={{ marginTop: '8px', color: 'var(--text2)', fontSize: '11px' }}>{viewInvoice.createdBy}</div>
            <button onClick={() => {
              if (settings?.printDefaultSize === 'a4') {
                printA4(<PrintTemplateA4 type="purchase" data={viewInvoice} settings={settings} suppliers={suppliers} />)
              } else {
                window.print()
              }
            }}
              style={{ marginTop: '16px', background: 'var(--accent)', color: '#fff', padding: '10px 24px', borderRadius: '8px', fontSize: '13px', fontWeight: 'bold', width: '100%' }}>
              {settings?.printDefaultSize === 'a4' ? 'كبير (A4)' : 'طباعة'}
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
          <button type="submit" style={{ background: 'var(--success)', color: '#fff', padding: '10px', borderRadius: '8px', fontSize: '14px' }}>إضافة</button>
        </form>
      </Modal>

      <Modal open={showProductModal} onClose={() => { setShowProductModal(false); setGeneratedBarcode(''); setShowPrintBarcode(false) }} title="إضافة منتج جديد">
        <form onSubmit={handleSaveProduct} style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '10px' }}>
            <Input label="الاسم" value={productForm.name} onInput={v => setProductForm(f => ({ ...f, name: v }))} required />
            <div>
              <label style={{ fontSize: '11px', color: 'var(--text2)', display: 'block', marginBottom: '4px' }}>الباركود</label>
              <div style={{ display: 'flex', gap: '4px' }}>
                <input value={productForm.barcode} onInput={e => setProductForm(f => ({ ...f, barcode: e.target.value }))} onKeyDown={handleBarcodeKeyDown} style={{ flex: 1 }} />
                <button type="button" onClick={handleGenerateBarcode} style={{ background: 'var(--bg3)', color: 'var(--accent)', padding: '4px 8px', borderRadius: '4px', fontSize: '11px', whiteSpace: 'nowrap' }}>إنشاء</button>
              </div>
              {showPrintBarcode && productForm.barcode && (
                <div style={{ marginTop: '8px', padding: '8px', background: 'var(--bg)', borderRadius: '8px', textAlign: 'center' }}>
                  <BarcodeSVG code={productForm.barcode} />
                  <div style={{ fontSize: '12px', color: 'var(--text2)', marginTop: '4px' }}>{productForm.barcode}</div>
                  <button type="button" onClick={() => window.print()}
                    style={{ marginTop: '6px', background: 'var(--success)', color: '#fff', padding: '6px 16px', borderRadius: '6px', fontSize: '11px' }}>
                    طباعة الباركود
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
              <input list="p-unit-list" value={productForm.unit} onInput={e => setProductForm(f => ({ ...f, unit: e.target.value }))} style={{ width: '100%' }} />
              <datalist id="p-unit-list">{units.map(u => <option key={u} value={u} />)}</datalist>
            </div>
            <Input label="التكلفة" type="number" value={productForm.cost || ''} onInput={v => setProductForm(f => ({ ...f, cost: Number(v) }))} placeholder="التكلفة" />
            <Input label="سعر التجزئة" type="number" value={productForm.priceRetail || ''} onInput={v => setProductForm(f => ({ ...f, priceRetail: Number(v) }))} placeholder="سعر التجزئة" />
            <Input label="سعر نصف الجملة" type="number" value={productForm.priceHalfWholesale || ''} onInput={v => setProductForm(f => ({ ...f, priceHalfWholesale: Number(v) }))} placeholder="سعر نصف الجملة" />
            <Input label="سعر الجملة" type="number" value={productForm.priceWholesale || ''} onInput={v => setProductForm(f => ({ ...f, priceWholesale: Number(v) }))} placeholder="سعر الجملة" />
            <Input label="المخزون" type="number" value={productForm.stock || ''} onInput={v => setProductForm(f => ({ ...f, stock: Number(v) }))} placeholder="المخزون" />
            <Input label="تنبيه انتهاء المخزون" type="number" value={productForm.reorderPoint || ''} onInput={v => setProductForm(f => ({ ...f, reorderPoint: Number(v) }))} placeholder="تنبيه انتهاء المخزون" />
          </div>
          <button type="submit" style={{ background: 'var(--accent)', color: '#fff', padding: '10px', borderRadius: '8px', fontSize: '14px', marginTop: '8px' }}>إضافة</button>
        </form>
      </Modal>
      <ConfirmDialog />
    </div>
  )
}

function Input({ label, type = 'text', value, onInput, required, placeholder }) {
  return (
    <div>
      <label style={{ fontSize: '11px', color: 'var(--text2)', display: 'block', marginBottom: '4px' }}>{label}</label>
      <input type={type} value={value} onInput={e => onInput(e.target.value)} required={required} placeholder={placeholder} style={{ width: '100%' }} />
    </div>
  )
}