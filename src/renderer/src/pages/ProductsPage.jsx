import { useState, useEffect, useRef } from 'preact/hooks'
import * as XLSX from 'xlsx'
import api from '../api'
import Modal from '../components/Modal'
import { useToast } from '../components/Toast'
import { formatMoney } from '../utils/money'
import { useStore } from '../store'
import { useConfirm } from '../components/ConfirmModal'

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

export default function ProductsPage() {
  const { user } = useStore()
  const toast = useToast()
  const { confirm, ConfirmDialog } = useConfirm()
  const canManage = user?.permissions?.includes('products.manage')
  const [products, setProducts] = useState([])
  const [search, setSearch] = useState('')
  const [showModal, setShowModal] = useState(false)
  const [edit, setEdit] = useState(null)
  const [categories, setCategories] = useState([])
  const [units, setUnits] = useState([])
  const [generatedBarcode, setGeneratedBarcode] = useState('')
  const [showPrintBarcode, setShowPrintBarcode] = useState(false)
  const [importing, setImporting] = useState(false)
  const nameRef = useRef(null)
  const barcodeRef = useRef(null)
  const categoryRef = useRef(null)
  const fileRef = useRef(null)
  const imgRef = useRef(null)

  const [form, setForm] = useState({
    name: '', category: '', unit: '', barcode: '',
    cost: 0, priceRetail: 0, priceHalfWholesale: 0, priceWholesale: 0,
    stock: 0, reorderPoint: 0, image: ''
  })

  useEffect(() => { load() }, [])
  useEffect(() => {
    const handler = () => load()
    window.addEventListener('dataChanged', handler)
    return () => window.removeEventListener('dataChanged', handler)
  }, [])
  useEffect(() => { if (!showModal) { setEdit(null); resetForm(); setGeneratedBarcode(''); setShowPrintBarcode(false) } }, [showModal])

  async function load() {
    const token = localStorage.getItem('token')
    const data = await api.listProducts(token)
    setProducts(data)
    const cats = [...new Set(data.map(p => p.category).filter(Boolean))]
    const uns = [...new Set(data.map(p => p.unit).filter(Boolean))]
    setCategories(cats); setUnits(uns)
  }

  function resetForm() {
    setForm({ name: '', category: '', unit: '', barcode: '', cost: 0, priceRetail: 0, priceHalfWholesale: 0, priceWholesale: 0, stock: 0, reorderPoint: 0, image: '' })
  }

  function openEdit(product) {
    setEdit(product)
    setForm({
      name: product.name, category: product.category || '', unit: product.unit || '',
      barcode: product.barcode || '', cost: product.cost, priceRetail: product.priceRetail,
      priceHalfWholesale: product.priceHalfWholesale || product.priceRetail,
      priceWholesale: product.priceWholesale || product.priceRetail,
      stock: product.stock, reorderPoint: product.reorderPoint,
      image: product.image || ''
    })
    setShowModal(true)
  }

  function handleGenerateBarcode() {
    const code = generateBarcode()
    setForm(f => ({ ...f, barcode: code }))
    setGeneratedBarcode(code)
    setShowPrintBarcode(true)
    setTimeout(() => categoryRef.current?.focus(), 50)
  }

  function handleBarcodeKeyDown(e) {
    if (e.key === 'Enter' && form.barcode.length >= 5) {
      e.preventDefault()
      setGeneratedBarcode(form.barcode)
      setShowPrintBarcode(true)
      setTimeout(() => categoryRef.current?.focus(), 50)
    }
  }

  async function handleSave(e) {
    e.preventDefault()
    const token = localStorage.getItem('token')
    const data = { ...form, _id: edit?._id }
    try {
      await api.saveProduct(token, data)
      toast(edit ? 'تم تحديث المنتج' : 'تمت إضافة المنتج', 'success')
      setShowModal(false)
      load()
      window.dispatchEvent(new Event('dataChanged'))
    } catch (err) { toast(err.message, 'error') }
  }

  async function handleRemove(id) {
    if (!await confirm('هل أنت متأكد من حذف هذا المنتج؟')) return
    const token = localStorage.getItem('token')
    try {
      await api.removeProduct(token, id)
      toast('تم حذف المنتج', 'success')
      load()
      window.dispatchEvent(new Event('dataChanged'))
    } catch (err) { toast(err.message, 'error') }
  }

  async function handleExport() {
    const data = products.map((p, i) => ({
      '#': i + 1, الاسم: p.name, الباركود: p.barcode || '', التصنيف: p.category || '',
      الوحدة: p.unit || '', التكلفة: p.cost, 'سعر التجزئة': p.priceRetail,
      'نصف جملة': p.priceHalfWholesale || 0, جملة: p.priceWholesale || 0,
      المخزون: p.stock, 'حد التنبيه': p.reorderPoint || 0
    }))
    const ws = XLSX.utils.json_to_sheet(data)
    ws['!dir'] = 'rtl'
    const wb = XLSX.utils.book_new()
    XLSX.utils.book_append_sheet(wb, ws, 'المنتجات')
    const buf = XLSX.write(wb, { bookType: 'xlsx', type: 'array' })
    const blob = new Blob([buf], { type: 'application/octet-stream' })
    const url = URL.createObjectURL(blob)
    const a = document.createElement('a')
    a.href = url; a.download = `المنتجات_${new Date().toISOString().slice(0, 10)}.xlsx`
    a.click(); URL.revokeObjectURL(url)
    toast('تم التصدير', 'success')
  }

  async function handleImport(e) {
    const file = e.target.files?.[0]
    if (!file) return
    setImporting(true)
    try {
      const buf = await file.arrayBuffer()
      const wb = XLSX.read(buf, { type: 'array' })
      const ws = wb.Sheets[wb.SheetNames[0]]
      const rows = XLSX.utils.sheet_to_json(ws)
      const token = localStorage.getItem('token')
      let count = 0
      for (const row of rows) {
        const product = {
          name: String(row['الاسم'] || row['name'] || '').trim(),
          barcode: String(row['الباركود'] || row['barcode'] || '').trim(),
          category: String(row['التصنيف'] || row['category'] || '').trim(),
          unit: String(row['الوحدة'] || row['unit'] || '').trim(),
          cost: Number(row['التكلفة'] || row['cost'] || 0),
          priceRetail: Number(row['سعر التجزئة'] || row['priceRetail'] || 0),
          priceHalfWholesale: Number(row['نصف جملة'] || row['priceHalfWholesale'] || 0),
          priceWholesale: Number(row['جملة'] || row['priceWholesale'] || 0),
          stock: Number(row['المخزون'] || row['stock'] || 0),
          reorderPoint: Number(row['حد التنبيه'] || row['reorderPoint'] || 0)
        }
        if (!product.name) continue
        await api.saveProduct(token, product)
        count++
      }
      toast(`تم استيراد ${count} منتج${count > 1 ? '' : ''}`, 'success')
      load(); window.dispatchEvent(new Event('dataChanged'))
    } catch (err) { toast('خطأ في الاستيراد: ' + err.message, 'error') }
    setImporting(false)
    e.target.value = ''
  }

  const filtered = products.filter(p =>
    !search || p.name.includes(search) || p.barcode?.includes(search) || p.category?.includes(search)
  )

  return (
    <div style={{ padding: '20px', overflow: 'auto', height: '100vh' }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '16px' }}>
        <h1 style={{ fontSize: '20px' }}>المنتجات</h1>
        <div style={{ display: 'flex', gap: '6px' }}>
          <input ref={fileRef} type="file" accept=".xlsx,.xls" style={{ display: 'none' }} onChange={handleImport} />
          {canManage && <button onClick={() => fileRef.current?.click()} disabled={importing} style={{ background: 'var(--bg3)', color: 'var(--accent)', padding: '8px 12px', borderRadius: '8px', fontSize: '12px' }}>
            {importing ? 'جاري...' : 'استيراد'}
          </button>}
          {canManage && <button onClick={handleExport} style={{ background: 'var(--bg3)', color: 'var(--success)', padding: '8px 12px', borderRadius: '8px', fontSize: '12px' }}>تصدير</button>}
          {canManage && <button onClick={() => setShowModal(true)} style={{ background: 'var(--accent)', color: '#fff', padding: '8px 16px', borderRadius: '8px', fontSize: '13px' }}>+ إضافة منتج</button>}
        </div>
      </div>

      <input
        placeholder="بحث عن منتج..."
        value={search} onInput={e => setSearch(e.target.value)}
        style={{ width: '100%', marginBottom: '12px' }}
      />

      <div style={{ background: 'var(--bg2)', borderRadius: '12px', overflow: 'auto' }}>
        <table>
          <thead>
            <tr>
              <th></th><th>الاسم</th><th>الباركود</th><th>التصنيف</th><th>الوحدة</th><th>سعر التجزئة</th><th>نصف جملة</th><th>المخزون</th><th></th>
            </tr>
          </thead>
          <tbody>
            {filtered.map(p => (
              <tr key={p._id}>
                <td>{p.image ? <img src={p.image} alt="" style={{ width:'40px',height:'40px',borderRadius:'6px',objectFit:'cover' }} /> : null}</td>
                <td style={{ fontWeight: 'bold' }}>{p.name}</td>
                <td style={{ color: 'var(--text2)', fontSize: '12px' }}>{p.barcode || '-'}</td>
                <td>{p.category || '-'}</td>
                <td>{p.unit || '-'}</td>
                <td>{formatMoney(p.priceRetail)}</td>
                <td>{formatMoney(p.priceHalfWholesale)}</td>
                <td>
                  <span style={{ color: p.stock <= p.reorderPoint ? 'var(--danger)' : 'var(--success)' }}>{p.stock}</span>
                </td>
                <td>
                  <div style={{ display: 'flex', gap: '4px' }}>
                    {canManage && <button onClick={() => openEdit(p)} style={{ background: 'var(--bg3)', color: 'var(--accent)', padding: '4px 10px', borderRadius: '4px', fontSize: '11px' }}>تعديل</button>}
                    {canManage && <button onClick={() => handleRemove(p._id)} style={{ background: 'var(--bg3)', color: 'var(--danger)', padding: '4px 10px', borderRadius: '4px', fontSize: '11px' }}>حذف</button>}
                  </div>
                </td>
              </tr>
            ))}
            {filtered.length === 0 && (
              <tr><td colspan="8" style={{ padding: '24px', color: '#475569' }}>لا توجد منتجات</td></tr>
            )}
          </tbody>
        </table>
      </div>

      <Modal open={showModal} onClose={() => setShowModal(false)} title={edit ? 'تعديل منتج' : 'إضافة منتج'}>
        <form onSubmit={handleSave} style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
          <div style={{ display:'flex', gap:'12px', alignItems:'start' }}>
            <div onClick={() => imgRef.current?.click()} style={{ minWidth:'100px',width:'100px',height:'100px',borderRadius:'12px',border:'2px dashed var(--bg3)',display:'flex',alignItems:'center',justifyContent:'center',cursor:'pointer',overflow:'hidden',background:'var(--bg)',fontSize:'11px',color:'var(--text2)',textAlign:'center' }}>
              {form.image ? <img src={form.image} alt="" style={{ width:'100%',height:'100%',objectFit:'cover' }} /> : 'إضافة صورة'}
              <input ref={imgRef} type="file" accept="image/*" style={{ display:'none' }} onChange={e => { const f = e.target.files?.[0]; if (!f) return; const r = new FileReader(); r.onload = () => setForm(x => ({ ...x, image: r.result })); r.readAsDataURL(f) }} />
            </div>
            <div style={{ flex:1, display:'grid', gridTemplateColumns:'1fr 1fr', gap:'10px' }}>
            <Input inputRef={nameRef} label="الاسم" value={form.name} onInput={v => setForm(f => ({ ...f, name: v }))} required />
            <div>
              <label style={{ fontSize: '11px', color: 'var(--text2)', display: 'block', marginBottom: '4px' }}>الباركود</label>
              <div style={{ display: 'flex', gap: '4px' }}>
                <input ref={barcodeRef} value={form.barcode} onInput={e => setForm(f => ({ ...f, barcode: e.target.value }))} onKeyDown={handleBarcodeKeyDown} style={{ flex: 1 }} />
                <button type="button" onClick={handleGenerateBarcode} style={{ background: 'var(--bg3)', color: 'var(--accent)', padding: '4px 8px', borderRadius: '4px', fontSize: '11px', whiteSpace: 'nowrap' }}>إنشاء</button>
              </div>
              {showPrintBarcode && form.barcode && (
                <div style={{ marginTop: '8px', padding: '8px', background: 'var(--bg)', borderRadius: '8px', textAlign: 'center' }}>
                  <BarcodeSVG code={form.barcode} />
                  <div style={{ fontSize: '12px', color: 'var(--text2)', marginTop: '4px' }}>{form.barcode}</div>
                  <button type="button" onClick={() => window.print()}
                    style={{ marginTop: '6px', background: 'var(--success)', color: '#fff', padding: '6px 16px', borderRadius: '6px', fontSize: '11px' }}>
                    طباعة الباركود
                  </button>
                </div>
              )}
            </div>
            <div>
              <label style={{ fontSize: '11px', color: 'var(--text2)', display: 'block', marginBottom: '4px' }}>التصنيف</label>
              <input ref={categoryRef} list="cat-list" value={form.category} onInput={e => setForm(f => ({ ...f, category: e.target.value }))} style={{ width: '100%' }} />
              <datalist id="cat-list">{categories.map(c => <option key={c} value={c} />)}</datalist>
            </div>
            <div>
              <label style={{ fontSize: '11px', color: 'var(--text2)', display: 'block', marginBottom: '4px' }}>الوحدة</label>
              <input list="unit-list" value={form.unit} onInput={e => setForm(f => ({ ...f, unit: e.target.value }))} style={{ width: '100%' }} />
              <datalist id="unit-list">{units.map(u => <option key={u} value={u} />)}</datalist>
            </div>
            <Input label="التكلفة" type="number" value={form.cost || ''} onInput={v => setForm(f => ({ ...f, cost: Number(v) }))} placeholder="التكلفة" />
            <Input label="سعر التجزئة" type="number" value={form.priceRetail || ''} onInput={v => setForm(f => ({ ...f, priceRetail: Number(v) }))} placeholder="سعر التجزئة" />
            <Input label="سعر نصف الجملة" type="number" value={form.priceHalfWholesale || ''} onInput={v => setForm(f => ({ ...f, priceHalfWholesale: Number(v) }))} placeholder="سعر نصف الجملة" />
            <Input label="سعر الجملة" type="number" value={form.priceWholesale || ''} onInput={v => setForm(f => ({ ...f, priceWholesale: Number(v) }))} placeholder="سعر الجملة" />
            <Input label="المخزون" type="number" value={form.stock || ''} onInput={v => setForm(f => ({ ...f, stock: Number(v) }))} placeholder="المخزون" />
            <Input label="تنبيه انتهاء المخزون" type="number" value={form.reorderPoint || ''} onInput={v => setForm(f => ({ ...f, reorderPoint: Number(v) }))} placeholder="تنبيه انتهاء المخزون" />
          </div>
          </div>
          <button type="submit" style={{ background: 'var(--accent)', color: '#fff', padding: '10px', borderRadius: '8px', fontSize: '14px', marginTop: '8px' }}>
            {edit ? 'تحديث' : 'إضافة'}
          </button>
        </form>
      </Modal>
      <ConfirmDialog />
    </div>
  )
}

function Input({ label, type = 'text', value, onInput, required, placeholder, inputRef }) {
  return (
    <div>
      <label style={{ fontSize: '11px', color: 'var(--text2)', display: 'block', marginBottom: '4px' }}>{label}</label>
      <input ref={inputRef} type={type} value={value} onInput={e => onInput(e.target.value)} required={required} placeholder={placeholder} style={{ width: '100%' }} />
    </div>
  )
}