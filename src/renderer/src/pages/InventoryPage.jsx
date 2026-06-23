import { useState, useEffect } from 'preact/hooks'
import api from '../api'
import Modal from '../components/Modal'
import Pagination from '../components/Pagination'
import { useToast } from '../components/Toast'
import { useStore } from '../store'
import { formatDate } from '../utils/date'
import { formatMoney } from '../utils/money'
import { useConfirm } from '../components/ConfirmModal'
import { iconBtn, headerBtn, secondaryBtn, modalPrimaryBtn, modalSuccessBtn, EditIcon, DeleteIcon, AddIcon, CheckIcon } from '../components/ActionIcons'

export default function InventoryPage() {
  const { user } = useStore()
  const toast = useToast()
  const { confirm, ConfirmDialog } = useConfirm()
  const canAdjust = user?.permissions?.includes('inventory.adjust')
  const [tab, setTab] = useState('adjustments')
  const [adjustments, setAdjustments] = useState([])
  const [lowStock, setLowStock] = useState([])
  const [products, setProducts] = useState([])
  const [showModal, setShowModal] = useState(false)
  const [form, setForm] = useState({ productId: '', type: 'add', quantity: 0, reason: '', date: '', batchId: '' })
  const [editAdjustment, setEditAdjustment] = useState(null)
  const [productBatches, setProductBatches] = useState([])
  const [searchProduct, setSearchProduct] = useState('')
  const [searchType, setSearchType] = useState('')
  const [dateFrom, setDateFrom] = useState('')
  const [dateTo, setDateTo] = useState('')
  const [page, setPage] = useState(0)
  const [totalPages, setTotalPages] = useState(0)
  const [total, setTotal] = useState(0)
  const pageSize = 20

  useEffect(() => { load() }, [page, searchProduct, searchType, dateFrom, dateTo])

  async function load() {
    const token = localStorage.getItem('token')
    const filter = { productName: searchProduct, type: searchType, from: dateFrom, to: dateTo }
    const result = await api.listAdjustments(token, filter, page, pageSize)
    setAdjustments(result.data)
    setTotal(result.total)
    setTotalPages(result.totalPages)
    setLowStock(await api.getLowStockProducts(token))
    setProducts(await api.listProducts(token, '', 1000))
  }

  useEffect(() => {
    if (form.productId && form.type === 'remove') {
      api.getProductBatches(localStorage.getItem('token'), form.productId).then(setProductBatches).catch(() => setProductBatches([]))
    } else {
      setProductBatches([])
    }
  }, [form.productId, form.type])

  async function handleSave(e) {
    e.preventDefault()
    const token = localStorage.getItem('token')
    try {
      const p = products.find(x => x._id === form.productId)
      if (editAdjustment) {
        await api.saveAdjustment(token, { ...form, productName: p?.name || '', _id: editAdjustment._id })
        toast('تم تحديث التسوية', 'success')
      } else {
        await api.createAdjustment(token, { ...form, productName: p?.name || '' })
        toast('تم تسوية المخزون', 'success')
      }
      setShowModal(false)
      setEditAdjustment(null)
      setForm({ productId: '', type: 'add', quantity: 0, reason: '', date: '', batchId: '' })
      setProductBatches([])
      load()
    } catch (err) { toast(err.message, 'error') }
  }

  function openEditAdjustment(a) {
    setEditAdjustment(a)
    setForm({
      productId: a.productId, type: a.type, quantity: a.quantity,
      reason: a.reason, date: a.createdAt ? a.createdAt.slice(0, 10) : ''
    })
    setShowModal(true)
  }

  async function handleRemoveAdjustment(id) {
    if (!await confirm('هل أنت متأكد من حذف هذه التسوية؟')) return
    const token = localStorage.getItem('token')
    try {
      await api.removeAdjustment(token, id)
      toast('تم حذف التسوية', 'success')
      load()
    } catch (err) { toast(err.message, 'error') }
  }

  const typeLabels = { add: 'إضافة', remove: 'خصم', set: 'تحديد' }
   const typeColors = { add: 'var(--success)', remove: 'var(--danger)', set: 'var(--accent)' }

  return (
    <div style={{ padding: '20px', overflow: 'auto', height: '100%' }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '16px' }}>
        <h1 style={{ fontSize: '20px' }}>المخزون</h1>
        {canAdjust && <button onClick={() => { setEditAdjustment(null); setForm({ productId: '', type: 'add', quantity: 0, reason: '', date: '', batchId: '' }); setProductBatches([]); setShowModal(true) }}
          style={headerBtn}><AddIcon size={16} /> تسوية مخزون</button>}
      </div>

      {lowStock.length > 0 && (
        <div style={{ background: '#451a03', border: '1px solid #9a3412', borderRadius: '10px', padding: '12px 16px', marginBottom: '16px' }}>
          <div style={{ color: 'var(--warning)', fontWeight: 'bold', marginBottom: '8px', fontSize: '13px' }}>منتجات منخفضة المخزون</div>
          {lowStock.map(p => (
            <div key={p._id} style={{ display: 'flex', justifyContent: 'space-between', fontSize: '12px', color: '#fdba74', padding: '4px 0' }}>
              <span>{p.name}</span>
              <span>المخزون: {p.stock} / الحد الأدنى: {p.reorderPoint}</span>
            </div>
          ))}
        </div>
      )}

      <div style={{ display: 'flex', gap: '8px', marginBottom: '12px' }}>
        <button onClick={() => setTab('adjustments')}
          style={{ padding: '6px 16px', borderRadius: '6px', fontSize: '12px', background: tab === 'adjustments' ? 'var(--accent)' : 'var(--bg3)', color: tab === 'adjustments' ? '#fff' : 'var(--text)', fontWeight: tab === 'adjustments' ? '600' : '500' }}>التسويات</button>
        <button onClick={() => setTab('stock')}
          style={{ padding: '6px 16px', borderRadius: '6px', fontSize: '12px', background: tab === 'stock' ? 'var(--accent)' : 'var(--bg3)', color: tab === 'stock' ? '#fff' : 'var(--text)', fontWeight: tab === 'stock' ? '600' : '500' }}>المخزون الحالي</button>
      </div>

      {tab === 'adjustments' && (
        <div>
          <div style={{ display: 'flex', gap: '8px', marginBottom: '12px', flexWrap: 'wrap' }}>
            <input placeholder="بحث بالمنتج..." value={searchProduct}
              onInput={e => { setSearchProduct(e.target.value); setPage(0) }}
              style={{ flex: '1', minWidth: '150px' }} />
            <div style={{ display: 'flex', gap: '6px', alignItems: 'center' }}>
              {['','add','remove','set'].map(v => (
                <button key={v} type="button" onClick={() => { setSearchType(v); setPage(0) }}
                  style={{
                    padding: '8px 14px', borderRadius: '8px', fontSize: '12px', fontWeight: 'bold',
                    background: searchType === v ? 'var(--accent)' : 'var(--bg3)',
                    color: searchType === v ? '#fff' : 'var(--text)',
                    border: 'none', cursor: 'pointer'
                  }}>
                  {v === '' ? 'الكل' : v === 'add' ? 'إضافة' : v === 'remove' ? 'خصم' : v === 'set' ? 'تحديد' : v}
                </button>
              ))}
            </div>
            <input type="date" value={dateFrom} onInput={e => { setDateFrom(e.target.value); setPage(0) }}
              style={{ width: '140px' }} />
            <input type="date" value={dateTo} onInput={e => { setDateTo(e.target.value); setPage(0) }}
              style={{ width: '140px' }} />
          </div>
          <div className="table-card">
          <table>
            <thead><tr><th>التاريخ</th><th>المنتج</th><th>النوع</th><th>الكمية</th><th>المخزون القديم</th><th>الجديد</th><th>السبب</th><th></th></tr></thead>
            <tbody>
              {adjustments.map(a => (
                <tr key={a._id}>
                  <td style={{ fontSize: '12px', color: 'var(--text2)' }}>{formatDate(a.createdAt)}</td>
                  <td>{a.productName}</td>
                  <td style={{ color: typeColors[a.type] || 'var(--text2)' }}>{typeLabels[a.type] || a.type}</td>
                  <td style={{ fontWeight: 'bold' }}>{a.quantity}</td>
                  <td style={{ color: 'var(--text2)' }}>{a.oldStock}</td>
                  <td style={{ fontWeight: 'bold' }}>{a.newStock}</td>
                  <td style={{ fontSize: '12px', color: 'var(--text2)' }}>{a.reason || '-'}</td>
                  <td>
                    {canAdjust && <div style={{ display: 'flex', gap: '4px' }}>
                      <button onClick={() => openEditAdjustment(a)} title="تعديل" style={iconBtn('warning')}><EditIcon size={14} /></button>
                      <button onClick={() => handleRemoveAdjustment(a._id)} title="حذف" style={iconBtn('danger')}><DeleteIcon size={14} /></button>
                    </div>}
                  </td>
                </tr>
              ))}
              {adjustments.length === 0 && <tr><td colSpan="8" style={{ padding: '24px', color: 'var(--text2)', textAlign: 'center' }}>لا توجد تسويات</td></tr>}
            </tbody>
          </table>
        </div>
        <Pagination page={page} totalPages={totalPages} total={total} pageSize={pageSize} onChange={setPage} />
        </div>
      )}

      {tab === 'stock' && (
        <div className="table-card">
          <table>
            <thead><tr><th>المنتج</th><th>المخزون</th><th>الحد الأدنى</th><th>الحالة</th></tr></thead>
            <tbody>
              {products.map(p => (
                <tr key={p._id}>
                  <td>{p.name}</td>
                  <td style={{ fontWeight: 'bold' }}>{p.stock}</td>
                  <td style={{ color: 'var(--text2)' }}>{p.reorderPoint || '-'}</td>
                  <td>
                    {p.reorderPoint > 0 && p.stock <= p.reorderPoint ? (
                      <span style={{ color: 'var(--danger)', fontSize: '12px' }}>منخفض</span>
                    ) : (
                      <span style={{ color: 'var(--success)', fontSize: '12px' }}>جيد</span>
                    )}
                  </td>
                </tr>
              ))}
              {products.length === 0 && <tr><td colSpan="4" style={{ padding: '24px', color: 'var(--text2)', textAlign: 'center' }}>لا توجد منتجات</td></tr>}
            </tbody>
          </table>
        </div>
      )}

      <Modal open={showModal} onClose={() => { setShowModal(false); setEditAdjustment(null) }} title={editAdjustment ? 'تعديل تسوية مخزون' : 'تسوية مخزون'}>
        <form onSubmit={handleSave} style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
          <select value={form.productId} onChange={e => setForm(f => ({ ...f, productId: e.target.value }))} required
            style={{ background: 'var(--bg)', color: 'var(--text)', border: '1px solid var(--bg3)', borderRadius: '8px', padding: '8px' }}>
            <option value="">اختر منتج</option>
            {products.map(p => (
              <option key={p._id} value={p._id}>{p.name} (المخزون: {p.stock})</option>
            ))}
          </select>

          <div style={{ display: 'flex', gap: '6px' }}>
            {[{v:'add',l:'إضافة إلى المخزون'},{v:'remove',l:'خصم من المخزون'},{v:'set',l:'تحديد الكمية'}].map(o => (
              <button key={o.v} type="button" onClick={() => setForm(f => ({ ...f, type: o.v }))}
                style={{
                  flex: 1, padding: '10px', borderRadius: '8px', fontSize: '13px', fontWeight: 'bold',
                  background: form.type === o.v
                    ? (o.v === 'add' ? 'var(--success)' : o.v === 'remove' ? 'var(--danger)' : 'var(--accent)')
                    : 'var(--bg3)',
                  color: form.type === o.v ? '#fff' : 'var(--text)'
                }}>
                {o.l}
              </button>
            ))}
          </div>

          {form.type === 'remove' && productBatches.length > 0 && (
            <div style={{ background: 'var(--bg3)', borderRadius: '8px', padding: '8px' }}>
              <div style={{ fontSize: '11px', color: 'var(--text2)', marginBottom: '6px' }}>اختر batch للخصم (اتركها فارغة للأقدم أولاً):</div>
              {productBatches.map(b => (
                <label key={b._id} style={{ display: 'flex', alignItems: 'center', gap: '8px', padding: '6px 8px', borderRadius: '6px', cursor: 'pointer', fontSize: '12px', background: form.batchId === b._id ? 'var(--accent)' : 'transparent', color: form.batchId === b._id ? '#fff' : 'var(--text)' }}>
                  <input type="radio" name="batch" checked={form.batchId === b._id}
                    onChange={() => setForm(f => ({ ...f, batchId: b._id }))}
                    style={{ accentColor: 'var(--accent)' }} />
                  <span>{b.quantity} وحدة بتكلفة {formatMoney(b.cost)}</span>
                </label>
              ))}
              <label style={{ display: 'flex', alignItems: 'center', gap: '8px', padding: '6px 8px', borderRadius: '6px', cursor: 'pointer', fontSize: '12px', color: 'var(--text2)' }}>
                <input type="radio" name="batch" checked={!form.batchId}
                  onChange={() => setForm(f => ({ ...f, batchId: '' }))} />
                <span>تلقائي (الأقدم أولاً)</span>
              </label>
            </div>
          )}

          {form.type === 'set' && productBatches.length > 0 && form.quantity < (products.find(p => p._id === form.productId)?.stock || 0) && (
            <div style={{ background: 'var(--bg3)', borderRadius: '8px', padding: '8px' }}>
              <div style={{ fontSize: '11px', color: 'var(--text2)', marginBottom: '6px' }}>اختر batch للخصم (للكمية الزائدة):</div>
              {productBatches.map(b => (
                <label key={b._id} style={{ display: 'flex', alignItems: 'center', gap: '8px', padding: '6px 8px', borderRadius: '6px', cursor: 'pointer', fontSize: '12px', background: form.batchId === b._id ? 'var(--accent)' : 'transparent', color: form.batchId === b._id ? '#fff' : 'var(--text)' }}>
                  <input type="radio" name="batch" checked={form.batchId === b._id}
                    onChange={() => setForm(f => ({ ...f, batchId: b._id }))}
                    style={{ accentColor: 'var(--accent)' }} />
                  <span>{b.quantity} وحدة بتكلفة {formatMoney(b.cost)}</span>
                </label>
              ))}
              <label style={{ display: 'flex', alignItems: 'center', gap: '8px', padding: '6px 8px', borderRadius: '6px', cursor: 'pointer', fontSize: '12px', color: 'var(--text2)' }}>
                <input type="radio" name="batch" checked={!form.batchId}
                  onChange={() => setForm(f => ({ ...f, batchId: '' }))} />
                <span>تلقائي (الأقدم أولاً)</span>
              </label>
            </div>
          )}

          <input type="number" step="any" placeholder="الكمية" value={form.quantity || ''}
            onInput={e => setForm(f => ({ ...f, quantity: Number(e.target.value) }))} required
            style={{ background: 'var(--bg)', color: 'var(--text)', border: '1px solid var(--bg3)', borderRadius: '8px', padding: '8px' }} />

          <input type="date" value={form.date}
            onInput={e => setForm(f => ({ ...f, date: e.target.value }))}
            style={{ background: 'var(--bg)', color: 'var(--text)', border: '1px solid var(--bg3)', borderRadius: '8px', padding: '8px' }} />

          <input placeholder="السبب" value={form.reason}
            onInput={e => setForm(f => ({ ...f, reason: e.target.value }))}
            style={{ background: 'var(--bg)', color: 'var(--text)', border: '1px solid var(--bg3)', borderRadius: '8px', padding: '8px' }} />

          <button type="submit" style={modalPrimaryBtn}><CheckIcon size={16} /> حفظ</button>
        </form>
      </Modal>
      <ConfirmDialog />
    </div>
  )
}
