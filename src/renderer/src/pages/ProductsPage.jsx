import { useState, useEffect, useRef } from 'preact/hooks'
import * as XLSX from 'xlsx'
import api from '../api'
import Modal from '../components/Modal'
import Pagination from '../components/Pagination'
import { useToast } from '../components/Toast'
import { formatMoney } from '../utils/money'
import { printBarcode } from '../utils/print'
import { useStore } from '../store'
import { useConfirm } from '../components/ConfirmModal'
import { iconBtn, headerBtn, secondaryBtn, modalPrimaryBtn, EditIcon, DeleteIcon, AddIcon, CheckIcon, BarcodeIcon, PrintIcon, DownloadIcon, UploadIcon } from '../components/ActionIcons'

import { generateBarcode as genBarcode, encodeEAN13 } from '../utils/barcode'

const FRACTIONAL_UNITS = ['كيلو', 'كجم', 'جرام', 'جم', 'طن', 'لتر', 'مل', 'جالون', 'متر', 'سم', 'قدم', 'ياردة']

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

export default function ProductsPage() {
  const { user } = useStore()
  const toast = useToast()
  const { confirm, ConfirmDialog } = useConfirm()
  const canManage = user?.permissions?.includes('products.manage')
  const [products, setProducts] = useState([])
  const [search, setSearch] = useState('')
  const [page, setPage] = useState(0)
  const [totalPages, setTotalPages] = useState(0)
  const [total, setTotal] = useState(0)
  const pageSize = 50
  const [showModal, setShowModal] = useState(false)
  const [edit, setEdit] = useState(null)
  const [categories, setCategories] = useState([])
  const [units, setUnits] = useState([])
  const [generatedBarcode, setGeneratedBarcode] = useState('')
  const [showPrintBarcode, setShowPrintBarcode] = useState(false)
  const [printingBarcode, setPrintingBarcode] = useState(false)
  const [importing, setImporting] = useState(false)
  const nameRef = useRef(null)
  const barcodeRef = useRef(null)
  const categoryRef = useRef(null)
  const fileRef = useRef(null)
  const imgRef = useRef(null)

  const [form, setForm] = useState({
    name: '', category: '', unit: '', barcode: '',
    cost: '', priceRetail: '', priceHalfWholesale: '', priceWholesale: '',
    stock: '', reorderPoint: '', image: ''
  })

  useEffect(() => { load() }, [page, search])
  useEffect(() => { if (!showModal) { setEdit(null); resetForm(); setGeneratedBarcode(''); setShowPrintBarcode(false) } }, [showModal])

  async function load() {
    const token = localStorage.getItem('token')
    const result = await api.listProducts(token, search, null, page, pageSize)
    setProducts(result.data)
    setTotal(result.total)
    setTotalPages(result.totalPages)
    api.listProductMeta(token).then(meta => {
      if (meta) { setCategories(meta.categories); setUnits(meta.units) }
    }).catch(() => {})
  }

  function handleSearch(v) {
    setSearch(v)
    setPage(0)
  }

  function handlePage(newPage) {
    setPage(newPage)
  }

  function resetForm() {
    setForm({ name: '', category: '', unit: '', barcode: '', cost: '', priceRetail: '', priceHalfWholesale: '', priceWholesale: '', stock: '', reorderPoint: '', image: '', expiryDate: '' })
  }

  function openEdit(product) {
    setEdit(product)
    setForm({
      name: product.name, category: product.category || '', unit: product.unit || '',
      barcode: product.barcode || '', cost: String(product.cost ?? ''),
      priceRetail: String(product.priceRetail ?? ''),
      priceHalfWholesale: String(product.priceHalfWholesale ?? ''),
      priceWholesale: String(product.priceWholesale ?? ''),
      stock: String(product.stock ?? ''),
      reorderPoint: String(product.reorderPoint ?? ''),
      image: product.image || '',
      expiryDate: product.expiryDate || ''
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
    if (!form.name.trim()) { toast('الرجاء إدخال اسم المنتج', 'error'); return }
    if (!form.priceRetail || Number(form.priceRetail) <= 0) { toast('الرجاء إدخال سعر التجزئة', 'error'); return }
    const token = localStorage.getItem('token')
    const data = { ...form, _id: edit?._id, cost: Number(form.cost) || 0, priceRetail: Number(form.priceRetail) || 0, priceHalfWholesale: Number(form.priceHalfWholesale) || 0, priceWholesale: Number(form.priceWholesale) || 0, stock: Number(form.stock) || 0, reorderPoint: Number(form.reorderPoint) || 0, expiryDate: form.expiryDate || '' }
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
    const token = localStorage.getItem('token')
    const all = await api.listProducts(token, '', null)
    const data = all.map((p, i) => ({
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

  return (
    <div style={{ padding: '20px', overflow: 'auto', height: '100%' }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '16px' }}>
        <h1 style={{ fontSize: '20px' }}>المنتجات ({total})</h1>
        <div style={{ display: 'flex', gap: '6px' }}>
          <input ref={fileRef} type="file" accept=".xlsx,.xls" style={{ display: 'none' }} onChange={handleImport} />
          {canManage && <button onClick={() => fileRef.current?.click()} disabled={importing} style={secondaryBtn}><UploadIcon size={14} /> {importing ? 'جاري...' : 'استيراد'}</button>}
          {canManage && <button onClick={handleExport} style={{ ...secondaryBtn, color: 'var(--success)' }}><DownloadIcon size={14} /> تصدير</button>}
          {canManage && <button onClick={() => setShowModal(true)} style={headerBtn}><AddIcon size={16} /> إضافة منتج</button>}
        </div>
      </div>

      <input
        placeholder="بحث عن منتج..."
        value={search} onInput={e => handleSearch(e.target.value)}
        style={{ width: '100%', marginBottom: '12px' }}
      />

      <div className="table-card">
        <table>
          <thead>
            <tr>
              <th></th><th>الاسم</th><th>الباركود</th><th>التصنيف</th><th>الوحدة</th><th>التكلفة</th><th>التجزئة</th><th>نصف جملة</th><th>الجملة</th><th>المخزون</th><th></th>
            </tr>
          </thead>
          <tbody>
            {products.map(p => (
              <tr key={p._id}>
                <td>{p.image ? <img src={p.image} alt="" style={{ width:'40px',height:'40px',borderRadius:'6px',objectFit:'cover' }} /> : null}</td>
                <td style={{ fontWeight: 'bold' }}>{p.name}</td>
                <td style={{ color: 'var(--text2)', fontSize: '12px' }}>{p.barcode || '-'}</td>
                <td>{p.category || '-'}</td>
                <td>{p.unit ? `${p.unit} (${FRACTIONAL_UNITS.includes(p.unit) ? 'عشرية' : 'صحيحة'})` : '-'}</td>
                <td>{formatMoney(p.cost)}</td>
                <td>{formatMoney(p.priceRetail)}</td>
                <td>{formatMoney(p.priceHalfWholesale)}</td>
                <td>{formatMoney(p.priceWholesale)}</td>
                <td>
                  <span style={{ color: p.stock <= p.reorderPoint ? 'var(--danger)' : 'var(--success)' }}>{p.stock}</span>
                </td>
                <td>
                  <div style={{ display: 'flex', gap: '4px' }}>
                    {canManage && <button onClick={() => openEdit(p)} title="تعديل" style={iconBtn('warning')}><EditIcon size={14} /></button>}
                    {canManage && <button onClick={() => handleRemove(p._id)} title="حذف" style={iconBtn('danger')}><DeleteIcon size={14} /></button>}
                  </div>
                </td>
              </tr>
            ))}
            {products.length === 0 && (
              <tr><td colSpan="11" style={{ padding: '24px', color: 'var(--text2)' }}>لا توجد منتجات</td></tr>
            )}
          </tbody>
        </table>
      </div>
      <Pagination page={page} totalPages={totalPages} total={total} pageSize={pageSize} onChange={handlePage} />

      <Modal open={showModal} onClose={() => setShowModal(false)} title={edit ? 'تعديل منتج' : 'إضافة منتج'} width="750px">
        <form onSubmit={handleSave} style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
          <div style={{ display:'flex', gap:'12px', alignItems:'start' }}>
            <div onClick={() => imgRef.current?.click()} style={{ minWidth:'100px',width:'100px',height:'100px',borderRadius:'12px',border:'2px dashed var(--bg3)',display:'flex',alignItems:'center',justifyContent:'center',cursor:'pointer',overflow:'hidden',background:'var(--bg)',fontSize:'11px',color:'var(--text2)',textAlign:'center' }}>
              {form.image ? <img src={form.image} alt="" style={{ width:'100%',height:'100%',objectFit:'cover' }} /> : 'إضافة صورة'}
              <input ref={imgRef} type="file" accept="image/*" style={{ display:'none' }} onChange={e => { const f = e.target.files?.[0]; if (!f) return; const r = new FileReader(); r.onload = () => setForm(x => ({ ...x, image: r.result })); r.readAsDataURL(f) }} />
            </div>
            <div style={{ flex:1, display:'grid', gridTemplateColumns:'1fr 1fr', gap:'10px' }}>
            <Input inputRef={nameRef} label="الاسم *" value={form.name} onInput={v => setForm(f => ({ ...f, name: v }))} required />
            <div>
              <label style={{ fontSize: '11px', color: 'var(--text2)', display: 'block', marginBottom: '4px' }}>الباركود</label>
              <div style={{ display: 'flex', gap: '4px' }}>
                <input ref={barcodeRef} value={form.barcode} onInput={e => setForm(f => ({ ...f, barcode: e.target.value }))} onKeyDown={handleBarcodeKeyDown} style={{ flex: 1 }} />
                <button type="button" onClick={handleGenerateBarcode} title="إنشاء" style={iconBtn('accent')}><BarcodeIcon size={14} /></button>
              </div>
              {showPrintBarcode && form.barcode && (
                <div style={{ marginTop: '8px', padding: '8px', background: 'var(--bg)', borderRadius: '8px', textAlign: 'center' }}>
                  {(() => {
                    const labelSize = localStorage.getItem('barcodeLabelSize') || '50x30'
                    const dims = labelSize.split('x').map(Number)
                    const bw = Math.min(Number(dims[0]) * 3.78, 400)
                    const bh = Math.min(Number(dims[1]) * 3.78, 250)
                    return <BarcodeSVG code={form.barcode} width={bw} height={bh} />
                  })()}
                  <div style={{ fontSize: '12px', color: 'var(--text2)', marginTop: '4px' }}>{form.barcode}</div>
                  <button type="button" onClick={async () => { setPrintingBarcode(true); try { await printBarcode(form.barcode) } catch (err) { toast('فشلت طباعة الباركود: ' + err.message, 'error') }; setPrintingBarcode(false) }} disabled={printingBarcode} style={{ ...secondaryBtn, background: 'var(--success)', color: '#fff' }}><PrintIcon size={14} /> {printingBarcode ? 'جاري...' : 'طباعة الباركود'}</button>
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
              <select value={form.unit} onChange={e => setForm(f => ({ ...f, unit: e.target.value }))} style={{ width: '100%', background: 'var(--bg)', color: 'var(--text)', border: '1px solid var(--bg3)', borderRadius: '8px', padding: '8px' }}>
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
              <label style={{ fontSize: '11px', color: 'var(--text2)', display: 'block', marginBottom: '4px' }}>التكلفة {form.stock > 0 && <span style={{ color: 'var(--warning)', fontSize: '10px' }}>(محسوبة من المشتريات)</span>}</label>
              <input type="number" step="any" value={form.cost} onInput={v => setForm(f => ({ ...f, cost: v.target.value }))} placeholder="التكلفة" disabled={form.stock > 0} style={{ width: '100%', opacity: form.stock > 0 ? 0.6 : 1 }} />
            </div>
            <Input label="سعر التجزئة *" type="number" step="any" value={form.priceRetail} onInput={v => setForm(f => ({ ...f, priceRetail: v }))} placeholder="سعر التجزئة" />
            <Input label="سعر نصف الجملة" type="number" step="any" value={form.priceHalfWholesale} onInput={v => setForm(f => ({ ...f, priceHalfWholesale: v }))} placeholder="سعر نصف الجملة" />
            <Input label="سعر الجملة" type="number" step="any" value={form.priceWholesale} onInput={v => setForm(f => ({ ...f, priceWholesale: v }))} placeholder="سعر الجملة" />
            <Input label="المخزون" type="number" step="any" value={form.stock} onInput={v => setForm(f => ({ ...f, stock: v }))} placeholder="المخزون" />
            <Input label="تنبيه انتهاء المخزون" type="number" step="any" value={form.reorderPoint} onInput={v => setForm(f => ({ ...f, reorderPoint: v }))} placeholder="تنبيه انتهاء المخزون" />
            <div>
              <label style={{ fontSize: '11px', color: 'var(--text2)', display: 'block', marginBottom: '4px' }}>تاريخ انتهاء الصلاحية</label>
              <input type="date" value={form.expiryDate} onInput={e => setForm(f => ({ ...f, expiryDate: e.target.value }))} style={{ width: '100%' }} />
            </div>
          </div>
          </div>
          <button type="submit" style={modalPrimaryBtn}><CheckIcon size={16} /> {edit ? 'تحديث' : 'إضافة'}</button>
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