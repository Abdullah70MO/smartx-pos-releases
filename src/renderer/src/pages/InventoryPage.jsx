import { useState, useEffect } from 'preact/hooks'
import api from '../api'
import Modal from '../components/Modal'
import Pagination from '../components/Pagination'
import { useToast } from '../components/Toast'
import { useStore } from '../store'
import { formatDate } from '../utils/date'
import { formatMoney } from '../utils/money'
import { useConfirm } from '../components/ConfirmModal'
import { iconBtn, headerBtn, secondaryBtn, modalPrimaryBtn, modalSuccessBtn, EditIcon, DeleteIcon, AddIcon, CheckIcon, PrintIcon } from '../components/ActionIcons'
import { printA4 } from '../utils/print'
import PrintTemplateInventory from '../components/PrintTemplateInventory'

export default function InventoryPage() {
  const { user, settings } = useStore()
  const toast = useToast()
  const { confirm, ConfirmDialog } = useConfirm()
  const canAdjust = user?.permissions?.includes('inventory.adjust')
  const canView = user?.permissions?.includes('inventory.view')
  const [tab, setTab] = useState('inventory')
  const [adjustments, setAdjustments] = useState([])
  const [lowStock, setLowStock] = useState([])
  const [products, setProducts] = useState([])
  const [allCategories, setAllCategories] = useState([])
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

  // Inventory count state
  const [showInventoryModal, setShowInventoryModal] = useState(false)
  const [inventoryType, setInventoryType] = useState('partial')
  const [invCategory, setInvCategory] = useState('')
  const [invNotes, setInvNotes] = useState('')
  const [invAddedProducts, setInvAddedProducts] = useState([])
  const [countValues, setCountValues] = useState({})
  const [invSearch, setInvSearch] = useState('')
  const [invSearchResults, setInvSearchResults] = useState([])
  const [saving, setSaving] = useState(false)
  const [viewInv, setViewInv] = useState(null)
  const [showViewModal, setShowViewModal] = useState(false)
  const [inventories, setInventories] = useState([])
  const [invPage, setInvPage] = useState(0)
  const [invTotal, setInvTotal] = useState(0)
  const [invTotalPages, setInvTotalPages] = useState(0)

  useEffect(() => { load() }, [page, searchProduct, searchType, dateFrom, dateTo])
  useEffect(() => { loadInventories() }, [invPage])

  useEffect(() => {
    if (form.productId && form.type === 'remove') {
      api.getProductBatches(localStorage.getItem('token'), form.productId).then(setProductBatches).catch(() => setProductBatches([]))
    } else {
      setProductBatches([])
    }
  }, [form.productId, form.type])

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

  async function loadInventories() {
    const token = localStorage.getItem('token')
    const result = await api.listInventories(token, {}, invPage, 20)
    setInventories(result.data || [])
    setInvTotal(result.total || 0)
    setInvTotalPages(result.totalPages || 0)
  }

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

  async function openNewInventory() {
    const token = localStorage.getItem('token')
    try {
      const hasActive = await api.hasAnyActiveShift(token)
      if (hasActive) {
        toast('يجب إنهاء جميع الورديات النشطة أولاً قبل عمل جرد', 'error')
        return
      }
    } catch {}
    setInventoryType('partial')
    setInvCategory('')
    setInvNotes('')
    setInvSearch('')
    setInvAddedProducts([])
    setCountValues({})
    setShowInventoryModal(true)
  }

  async function searchAndAddProduct() {
    if (!invSearch.trim()) { toast('اكتب اسم المنتج للبحث', 'error'); return }
    const token = localStorage.getItem('token')
    try {
      const result = await api.listProducts(token, invSearch.trim(), 0, 0, 20)
      const found = (result.data || []).filter(p => !invAddedProducts.some(x => x._id === p._id && !x._id.startsWith('__cat__')))
      if (found.length === 0) { toast('لا توجد نتائج جديدة', 'error'); return }
      setInvAddedProducts(prev => [...prev, ...found.map(p => ({ ...p, _type: 'product' }))])
      setInvSearch('')
    } catch (err) { toast(err.message, 'error') }
  }

  function addCategoryToInventory() {
    if (!invCategory) { toast('اختر صنفاً أولاً', 'error'); return }
    if (invAddedProducts.some(x => x._id === '__cat__' + invCategory)) { toast('الصنف مضاف بالفعل', 'error'); return }
    setInvAddedProducts(prev => [...prev, { _id: '__cat__' + invCategory, _type: 'category', name: invCategory, unit: '', stock: 0 }])
  }

  function removeAddedProduct(pid) {
    setCountValues(prev => { const c = { ...prev }; delete c[pid]; return c })
    setInvAddedProducts(prev => prev.filter(x => x._id !== pid))
  }

  function updateCount(pid, val) {
    setCountValues(prev => ({ ...prev, [pid]: val }))
  }

  async function handleSaveInventory() {
    const token = localStorage.getItem('token')
    if (inventoryType === 'full') {
      setSaving(true)
      try {
        await api.createInventory(token, { type: 'full', notes: invNotes, items: [] })
        toast('تم حفظ الجرد الكامل', 'success')
        setShowInventoryModal(false)
        loadInventories()
      } catch (err) { toast(err.message, 'error') }
      setSaving(false)
      return
    }
    const items = invAddedProducts.map(p => ({
      productId: p._type === 'category' ? '__cat__' + p.name : p._id,
      productName: p.name,
      unit: p.unit || '',
      actualQuantity: p._type === 'category' ? 0 : Number(countValues[p._id]) || 0
    }))
    if (items.length === 0) { toast('أضف منتجاً واحداً على الأقل', 'error'); return }
    setSaving(true)
    try {
      await api.createInventory(token, {
        type: 'partial',
        filterCategory: invCategory,
        notes: invNotes,
        items
      })
      toast('تم حفظ الجرد', 'success')
      setShowInventoryModal(false)
      loadInventories()
      load()
    } catch (err) { toast(err.message, 'error') }
    setSaving(false)
  }

  function viewInventory(inv) {
    const token = localStorage.getItem('token')
    api.getInventory(token, inv._id).then(data => {
      setViewInv(data)
      setShowViewModal(true)
    }).catch(err => toast(err.message, 'error'))
  }

  async function printInventory(inv) {
    const token = localStorage.getItem('token')
    try {
      const data = inv.items ? inv : await api.getInventory(token, inv._id)
      const settingsData = settings || await api.getSettings(token)
      await printA4(<PrintTemplateInventory inventory={data} settings={settingsData} />)
    } catch (err) { toast(err.message, 'error') }
  }

  const typeLabels = { add: 'إضافة', remove: 'خصم', set: 'تحديد' }
  const typeColors = { add: 'var(--success)', remove: 'var(--danger)', set: 'var(--accent)' }

  return (
    <div style={{ padding: '20px', overflow: 'auto', height: '100%' }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '16px' }}>
        <h1 style={{ fontSize: '20px' }}>المخزون</h1>
        <div style={{ display: 'flex', gap: '8px' }}>
          {canAdjust && <button onClick={openNewInventory} style={headerBtn}><AddIcon size={16} /> جرد جديد</button>}
          {canAdjust && <button onClick={() => { setEditAdjustment(null); setForm({ productId: '', type: 'add', quantity: 0, reason: '', date: '', batchId: '' }); setProductBatches([]); setShowModal(true) }}
            style={headerBtn}><AddIcon size={16} /> تسوية مخزون</button>}
        </div>
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
        <button onClick={() => setTab('inventory')}
          style={{ padding: '6px 16px', borderRadius: '6px', fontSize: '12px', background: tab === 'inventory' ? 'var(--accent)' : 'var(--bg3)', color: tab === 'inventory' ? '#fff' : 'var(--text)', fontWeight: tab === 'inventory' ? '600' : '500' }}>الجرد</button>
        <button onClick={() => setTab('adjustments')}
          style={{ padding: '6px 16px', borderRadius: '6px', fontSize: '12px', background: tab === 'adjustments' ? 'var(--accent)' : 'var(--bg3)', color: tab === 'adjustments' ? '#fff' : 'var(--text)', fontWeight: tab === 'adjustments' ? '600' : '500' }}>التسويات</button>
        <button onClick={() => setTab('stock')}
          style={{ padding: '6px 16px', borderRadius: '6px', fontSize: '12px', background: tab === 'stock' ? 'var(--accent)' : 'var(--bg3)', color: tab === 'stock' ? '#fff' : 'var(--text)', fontWeight: tab === 'stock' ? '600' : '500' }}>المخزون الحالي</button>
      </div>

      {tab === 'inventory' && (
        <div>
          <div className="table-card">
            <table>
              <thead><tr><th>التاريخ</th><th>النوع</th><th>منتجات</th><th>بفروقات</th><th>فرق الكمية</th><th>خسائر</th><th>ملاحظات</th><th>بواسطة</th><th></th></tr></thead>
              <tbody>
                {inventories.map(inv => (
                  <tr key={inv._id}>
                    <td style={{ fontSize: '12px', color: 'var(--text2)' }}>{formatDate(inv.createdAt)}</td>
                    <td>{inv.type === 'full' ? 'كامل' : 'جزئي'}{inv.filterCategory ? ` (${inv.filterCategory})` : ''}</td>
                    <td>{inv.itemsCount}</td>
                    <td style={{ fontWeight: 'bold' }}>{inv.itemsWithDiff}</td>
                    <td style={{ fontWeight: 'bold', color: inv.totalQuantityDifference > 0 ? 'var(--success)' : inv.totalQuantityDifference < 0 ? 'var(--danger)' : 'inherit' }}>
                      {inv.totalQuantityDifference > 0 ? '+' : ''}{inv.totalQuantityDifference}
                    </td>
                    <td style={{ fontWeight: 'bold', color: 'var(--danger)' }}>{formatMoney(inv.totalFinancialLoss)}</td>
                    <td style={{ fontSize: '12px', color: 'var(--text2)', maxWidth: '120px', overflow: 'hidden', textOverflow: 'ellipsis' }}>{inv.notes || '-'}</td>
                    <td style={{ fontSize: '12px' }}>{inv.createdBy}</td>
                    <td>
                      <div style={{ display: 'flex', gap: '4px' }}>
                        <button onClick={() => viewInventory(inv)} title="عرض" style={iconBtn('primary')}><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" style={{ width: '14px', height: '14px' }}><path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z"/><circle cx="12" cy="12" r="3"/></svg></button>
                        <button onClick={() => printInventory(inv)} title="طباعة" style={iconBtn('primary')}><PrintIcon size={14} /></button>
                      </div>
                    </td>
                  </tr>
                ))}
                {inventories.length === 0 && <tr><td colSpan="9" style={{ padding: '24px', color: 'var(--text2)', textAlign: 'center' }}>لا توجد جرديات</td></tr>}
              </tbody>
            </table>
          </div>
          <Pagination page={invPage} totalPages={invTotalPages} total={invTotal} pageSize={20} onChange={setInvPage} />
        </div>
      )}

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

      {/* Inventory Count Modal */}
      <Modal open={showInventoryModal} onClose={() => { setShowInventoryModal(false) }} title="جرد جديد" large>
        <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
          <div style={{ display: 'flex', gap: '8px' }}>
            <button onClick={() => setInventoryType('partial')}
              style={{ flex: 1, padding: '10px', borderRadius: '8px', fontSize: '13px', fontWeight: 'bold', border: 'none', cursor: 'pointer',
                background: inventoryType === 'partial' ? 'var(--accent)' : 'var(--bg3)', color: inventoryType === 'partial' ? '#fff' : 'var(--text)' }}>
              جرد جزئي
            </button>
            <button onClick={() => setInventoryType('full')}
              style={{ flex: 1, padding: '10px', borderRadius: '8px', fontSize: '13px', fontWeight: 'bold', border: 'none', cursor: 'pointer',
                background: inventoryType === 'full' ? 'var(--accent)' : 'var(--bg3)', color: inventoryType === 'full' ? '#fff' : 'var(--text)' }}>
              جرد كامل
            </button>
          </div>

          {inventoryType === 'full' ? (
            <div style={{ background: 'var(--bg3)', borderRadius: '8px', padding: '16px', textAlign: 'center', fontSize: '13px', color: 'var(--text2)' }}>
              سيتم تسجيل جرد لكافة المنتجات. يمكنك بعد ذلك طباعة التقرير للاطلاع على المخزون الكامل.
            </div>
          ) : (
            <>
              <div style={{ display: 'flex', gap: '8px', alignItems: 'center' }}>
                <input placeholder="ابحث عن منتج وأضفه..." value={invSearch}
                  onInput={e => setInvSearch(e.target.value)}
                  onKeyDown={e => { if (e.key === 'Enter') searchAndAddProduct() }}
                  style={{ flex: 1 }} />
                <button onClick={searchAndAddProduct} style={{ ...secondaryBtn, padding: '8px 16px', whiteSpace: 'nowrap' }}><AddIcon size={14} /> إضافة</button>
                <select value={invCategory} onChange={e => setInvCategory(e.target.value)} style={{ width: '140px' }}>
                  <option value="">اختر صنف</option>
                  {allCategories.map(c => <option key={c} value={c}>{c}</option>)}
                </select>
                <button onClick={addCategoryToInventory} style={{ ...secondaryBtn, padding: '8px 12px', whiteSpace: 'nowrap', fontSize: '11px' }}>+ إضافة صنف</button>
              </div>

              <div className="table-card" style={{ maxHeight: '280px', overflow: 'auto' }}>
                <table style={{ fontSize: '12px' }}>
                  <thead>
                    <tr>
                      <th style={{ width: '30px' }}></th>
                      <th>النوع</th>
                      <th>الاسم</th>
                      {invAddedProducts.some(x => x._type === 'product') && <th>الوحدة</th>}
                      {invAddedProducts.some(x => x._type === 'product') && <th>المخزون</th>}
                      {invAddedProducts.some(x => x._type === 'product') && <th>الكمية الفعلية</th>}
                    </tr>
                  </thead>
                  <tbody>
                    {invAddedProducts.map(p => (
                      <tr key={p._id} style={{ background: p._type === 'category' ? 'rgba(59,106,181,0.1)' : 'transparent' }}>
                        <td>
                          <button onClick={() => removeAddedProduct(p._id)} title="حذف" style={{ background: 'none', border: 'none', color: 'var(--danger)', cursor: 'pointer', fontSize: '16px', padding: '2px' }}>×</button>
                        </td>
                        <td style={{ fontSize: '11px', color: 'var(--text2)' }}>{p._type === 'category' ? 'صنف' : 'منتج'}</td>
                        <td style={{ fontWeight: p._type === 'category' ? 'bold' : 'normal' }}>{p.name}{p._type === 'category' ? ` (${allCategories.includes(p.name) ? 'جميع المنتجات' : ''})` : ''}</td>
                        {p._type === 'category' ? (
                          <td colSpan="3" style={{ fontSize: '11px', color: 'var(--text2)' }}>- يظهر في الطباعة -</td>
                        ) : (
                          <>
                            <td>{p.unit}</td>
                            <td style={{ fontWeight: 'bold' }}>{p.stock}</td>
                            <td>
                              <input type="number" step="any" placeholder={String(p.stock)}
                                value={countValues[p._id] !== undefined ? countValues[p._id] : ''}
                                onInput={e => updateCount(p._id, e.target.value)}
                                style={{ width: '80px', padding: '4px 8px', borderRadius: '4px', border: '1px solid var(--bg3)', background: 'var(--bg)', color: 'var(--text)', fontSize: '12px' }} />
                            </td>
                          </>
                        )}
                      </tr>
                    ))}
                    {invAddedProducts.length === 0 && <tr><td colSpan="6" style={{ padding: '24px', color: 'var(--text2)', textAlign: 'center' }}>لم تضف أي منتجات أو أصناف بعد</td></tr>}
                  </tbody>
                </table>
              </div>
            </>
          )}

          <input placeholder="ملاحظات (اختياري)" value={invNotes} onInput={e => setInvNotes(e.target.value)}
            style={{ background: 'var(--bg)', color: 'var(--text)', border: '1px solid var(--bg3)', borderRadius: '8px', padding: '8px' }} />

          <button onClick={handleSaveInventory} disabled={saving}
            style={{ ...modalPrimaryBtn, background: 'var(--accent)', opacity: saving ? 0.6 : 1 }}>
            <CheckIcon size={16} /> {saving ? 'جاري الحفظ...' : (inventoryType === 'full' ? 'تسجيل جرد كامل' : 'تسوية و حفظ الجرد')}
          </button>
        </div>
      </Modal>

      {/* View Inventory Modal */}
      <Modal open={showViewModal} onClose={() => { setShowViewModal(false); setViewInv(null) }} title="تفاصيل الجرد" large>
        {viewInv && (
          <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
            <div style={{ display: 'flex', gap: '12px', flexWrap: 'wrap' }}>
              <div style={{ background: 'var(--bg3)', padding: '8px 12px', borderRadius: '8px', fontSize: '12px' }}>
                <span style={{ color: 'var(--text2)' }}>النوع: </span>
                <span style={{ fontWeight: 'bold' }}>{viewInv.type === 'full' ? 'جرد كامل' : 'جرد جزئي'}{viewInv.filterCategory ? ` - ${viewInv.filterCategory}` : ''}</span>
              </div>
              <div style={{ background: 'var(--bg3)', padding: '8px 12px', borderRadius: '8px', fontSize: '12px' }}>
                <span style={{ color: 'var(--text2)' }}>التاريخ: </span>
                <span>{formatDate(viewInv.createdAt)}</span>
              </div>
              <div style={{ background: 'var(--bg3)', padding: '8px 12px', borderRadius: '8px', fontSize: '12px' }}>
                <span style={{ color: 'var(--text2)' }}>بواسطة: </span>
                <span>{viewInv.createdBy}</span>
              </div>
              <div style={{ background: 'var(--bg3)', padding: '8px 12px', borderRadius: '8px', fontSize: '12px' }}>
                <span style={{ color: 'var(--text2)' }}>فرق الكمية: </span>
                <span style={{ fontWeight: 'bold', color: viewInv.totalQuantityDifference > 0 ? 'var(--success)' : 'var(--danger)' }}>
                  {viewInv.totalQuantityDifference > 0 ? '+' : ''}{viewInv.totalQuantityDifference}
                </span>
              </div>
              <div style={{ background: 'var(--bg3)', padding: '8px 12px', borderRadius: '8px', fontSize: '12px' }}>
                <span style={{ color: 'var(--text2)' }}>خسائر: </span>
                <span style={{ fontWeight: 'bold', color: 'var(--danger)' }}>{formatMoney(viewInv.totalFinancialLoss)}</span>
              </div>
            </div>
            {viewInv.notes && <div style={{ background: 'var(--bg3)', padding: '8px', borderRadius: '8px', fontSize: '12px' }}>ملاحظات: {viewInv.notes}</div>}
            <div className="table-card" style={{ maxHeight: '350px', overflow: 'auto' }}>
              <table style={{ fontSize: '12px' }}>
                <thead><tr><th>#</th><th>المنتج</th><th>النظام</th><th>الفعلي</th><th>الفرق</th><th>التكلفة</th><th>الخسارة</th></tr></thead>
                <tbody>
                  {viewInv.items.map((item, i) => (
                    <tr key={item.productId}>
                      <td>{i + 1}</td>
                      <td>{item.productName}</td>
                      <td>{item.systemQuantity}</td>
                      <td>{item.actualQuantity}</td>
                      <td style={{ fontWeight: 'bold', color: item.difference > 0 ? 'var(--success)' : item.difference < 0 ? 'var(--danger)' : 'inherit' }}>
                        {item.difference > 0 ? '+' : ''}{item.difference}
                      </td>
                      <td>{formatMoney(item.cost)}</td>
                      <td style={{ color: 'var(--danger)' }}>{item.lossAmount > 0 ? formatMoney(item.lossAmount) : '-'}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
            <div style={{ display: 'flex', justifyContent: 'flex-end' }}>
              <button onClick={() => printInventory(viewInv)} style={headerBtn}><PrintIcon size={16} /> طباعة</button>
            </div>
          </div>
        )}
      </Modal>

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
