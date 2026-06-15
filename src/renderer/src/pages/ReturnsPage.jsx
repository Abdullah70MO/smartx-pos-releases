import { useState, useEffect } from 'preact/hooks'
import api from '../api'
import { useToast } from '../components/Toast'
import Modal from '../components/Modal'
import { formatMoney } from '../utils/money'
import { useStore } from '../store'
import { formatDate } from '../utils/date'
import { useConfirm } from '../components/ConfirmModal'

export default function ReturnsPage() {
  const { user } = useStore()
  const toast = useToast()
  const { confirm, ConfirmDialog } = useConfirm()
  const canCreate = user?.permissions?.includes('returns.create')
  const [activeTab, setActiveTab] = useState('sale')

  const [returns, setReturns] = useState([])
  const [sales, setSales] = useState([])
  const [showModal, setShowModal] = useState(false)
  const [selectedSale, setSelectedSale] = useState(null)
  const [returnItems, setReturnItems] = useState([])
  const [reason, setReason] = useState('')
  const [saleSearch, setSaleSearch] = useState({ q: '', dateFrom: '', dateTo: '' })
  const [retSearch, setRetSearch] = useState({ q: '', dateFrom: '', dateTo: '' })

  const [purchaseReturns, setPurchaseReturns] = useState([])
  const [purchases, setPurchases] = useState([])
  const [showPReturnModal, setShowPReturnModal] = useState(false)
  const [selectedPurchase, setSelectedPurchase] = useState(null)
  const [pReturnItems, setPReturnItems] = useState([])
  const [pReturnReason, setPReturnReason] = useState('')
  const [pSearch, setPSearch] = useState({ q: '', dateFrom: '', dateTo: '' })
  const [pRetSearch, setPRetSearch] = useState({ q: '', dateFrom: '', dateTo: '' })

  useEffect(() => { loadReturns(); loadSales(); loadPurchaseReturns(); loadPurchases() }, [])

  async function loadReturns() {
    const token = localStorage.getItem('token')
    const data = await api.listReturns(token)
    setReturns(data)
  }

  async function loadSales() {
    const token = localStorage.getItem('token')
    const data = await api.listSales(token)
    setSales(data)
  }

  async function loadPurchaseReturns() {
    const token = localStorage.getItem('token')
    try { setPurchaseReturns(await api.listPurchaseReturns(token)) } catch {}
  }

  async function loadPurchases() {
    const token = localStorage.getItem('token')
    try { setPurchases(await api.listPurchases(token)) } catch {}
  }

  function openReturn(sale) {
    setSelectedSale(sale)
    setReturnItems(sale.items.map(item => ({ ...item, returnQty: 0 })))
    setReason('')
    setShowModal(true)
  }

  async function handleReturn() {
    const items = returnItems.filter(i => i.returnQty > 0)
    if (items.length === 0) { toast('اختر عنصر واحد على الأقل للإرجاع', 'error'); return }
    const isFull = items.every(i => i.returnQty >= i.quantity)
    const subtotal = items.reduce((sum, i) => sum + (i.unitPrice * i.returnQty), 0)
    const token = localStorage.getItem('token')
    try {
      await api.createReturn(token, {
        saleId: selectedSale._id, invoiceNo: selectedSale.invoiceNo,
        items: items.map(i => ({ productId: i.productId, name: i.name, quantity: i.returnQty, unitPrice: i.unitPrice, cost: i.cost })),
        subtotal, reason, customerName: selectedSale.customerName, isFullReturn: isFull
      })
      toast('تم إرجاع المنتجات', 'success'); setShowModal(false); loadReturns()
    } catch (err) { toast(err.message, 'error') }
  }

  async function handleRemovePurchaseReturn(id) {
    if (!await confirm('حذف مرتجع المشتريات؟')) return
    const token = localStorage.getItem('token')
    try { await api.removePurchaseReturn(token, id); toast('تم الحذف', 'success'); loadPurchaseReturns() } catch (err) { toast(err.message, 'error') }
  }

  function openPReturn(p) {
    setSelectedPurchase(p)
    setPReturnItems(p.items.map(i => ({ productId: i.productId, name: i.name, quantity: 0, unitPrice: i.cost })))
    setPReturnReason('')
    setShowPReturnModal(true)
  }

  async function handleCreatePReturn() {
    const validItems = pReturnItems.filter(i => Number(i.quantity) > 0)
    if (validItems.length === 0) { toast('اختر كمية للإرجاع', 'error'); return }
    const subtotal = validItems.reduce((s, i) => s + Number(i.quantity) * Number(i.unitPrice), 0)
    const token = localStorage.getItem('token')
    try {
      await api.createPurchaseReturn(token, { purchaseId: selectedPurchase._id, items: validItems, subtotal, reason: pReturnReason })
      toast('تم تسجيل مرتجع المشتريات', 'success')
      setShowPReturnModal(false); setSelectedPurchase(null); loadPurchaseReturns(); loadPurchases()
    } catch (err) { toast(err.message, 'error') }
  }

  const filteredSales = sales.filter(s => {
    const q = saleSearch.q
    const matchQ = !q || String(s.invoiceNo).includes(q) || s.customerName?.includes(q) || s.customerPhone?.includes(q)
    const matchDate = (!saleSearch.dateFrom || new Date(s.createdAt) >= new Date(saleSearch.dateFrom)) &&
      (!saleSearch.dateTo || new Date(s.createdAt) <= new Date(saleSearch.dateTo + 'T23:59:59'))
    return matchQ && matchDate
  })

  const filteredReturns = returns.filter(r => {
    const q = retSearch.q
    const matchQ = !q || String(r.invoiceNo).includes(q) || r.customerName?.includes(q) || r.cashierName?.includes(q)
    const matchDate = (!retSearch.dateFrom || new Date(r.createdAt) >= new Date(retSearch.dateFrom)) &&
      (!retSearch.dateTo || new Date(r.createdAt) <= new Date(retSearch.dateTo + 'T23:59:59'))
    return matchQ && matchDate
  })

  const filteredPurchases = purchases.filter(p => {
    const q = pSearch.q
    const matchQ = !q || String(p.invoiceNo).includes(q) || p.supplierName?.includes(q)
    const matchDate = (!pSearch.dateFrom || new Date(p.createdAt) >= new Date(pSearch.dateFrom)) &&
      (!pSearch.dateTo || new Date(p.createdAt) <= new Date(pSearch.dateTo + 'T23:59:59'))
    return matchQ && matchDate
  })

  const filteredPReturns = purchaseReturns.filter(r => {
    const q = pRetSearch.q
    const matchQ = !q || String(r.invoiceNo).includes(q) || r.supplierName?.includes(q)
    const matchDate = (!pRetSearch.dateFrom || new Date(r.createdAt) >= new Date(pRetSearch.dateFrom)) &&
      (!pRetSearch.dateTo || new Date(r.createdAt) <= new Date(pRetSearch.dateTo + 'T23:59:59'))
    return matchQ && matchDate
  })

  return (
    <div style={{ padding: '20px', overflow: 'auto', height: '100%' }}>
      <h1 style={{ fontSize: '20px', marginBottom: '16px' }}>المرتجع</h1>

      <div style={{ display: 'flex', gap: '8px', marginBottom: '16px' }}>
        <button onClick={() => setActiveTab('sale')} style={{
          flex: 1, padding: '10px', borderRadius: '8px', fontSize: '14px', fontWeight: activeTab === 'sale' ? '700' : '500',
          background: activeTab === 'sale' ? 'var(--accent)' : 'var(--bg3)',
          color: activeTab === 'sale' ? '#fff' : 'var(--text)'
        }}>مرتجعات بيع</button>
        <button onClick={() => setActiveTab('purchase')} style={{
          flex: 1, padding: '10px', borderRadius: '8px', fontSize: '14px', fontWeight: activeTab === 'purchase' ? '700' : '500',
          background: activeTab === 'purchase' ? '#f59e0b' : 'var(--bg3)',
          color: activeTab === 'purchase' ? '#fff' : 'var(--text)'
        }}>مرتجعات شراء</button>
      </div>

      {activeTab === 'sale' && <>
        <div style={{ background: 'var(--bg2)', borderRadius: '12px', padding: '12px', marginBottom: '16px' }}>
          <div style={{ fontSize: '13px', fontWeight: 'bold', marginBottom: '8px' }}>إرجاع من فاتورة بيع</div>
          <div style={{ display: 'flex', gap: '8px', marginBottom: '8px', flexWrap: 'wrap' }}>
            <input placeholder="بحث برقم الفاتورة أو اسم العميل..." value={saleSearch.q}
              onInput={e => setSaleSearch(s => ({ ...s, q: e.target.value }))}
              style={{ flex: 1, minWidth: '200px' }} />
            <input type="date" value={saleSearch.dateFrom} onInput={e => setSaleSearch(s => ({ ...s, dateFrom: e.target.value }))} style={{ width: '130px' }} />
            <input type="date" value={saleSearch.dateTo} onInput={e => setSaleSearch(s => ({ ...s, dateTo: e.target.value }))} style={{ width: '130px' }} />
          </div>
          {canCreate && <div style={{ display: 'flex', flexWrap: 'wrap', gap: '6px' }}>
            {filteredSales.length > 0 && <div style={{ fontSize: '12px', color: 'var(--text2)', width: '100%', marginBottom: '4px' }}>اختر فاتورة للإرجاع:</div>}
            {filteredSales.slice(0, 30).map(s => (
              <button key={s._id} onClick={() => openReturn(s)} style={{ background: 'var(--bg3)', padding: '6px 12px', borderRadius: '6px', fontSize: '12px', color: 'var(--accent)' }}>
                #{s.invoiceNo} - {formatMoney(s.total)} ({s.customerName || 'بدون عميل'})
              </button>
            ))}
            {saleSearch.q && filteredSales.length === 0 && <span style={{ color: 'var(--text2)', fontSize: '12px' }}>لا توجد فواتير مطابقة</span>}
            {!saleSearch.q && <span style={{ color: 'var(--text2)', fontSize: '12px' }}>ابدأ الكتابة للبحث عن فاتورة...</span>}
          </div>}
        </div>

        <div style={{ background: 'var(--bg2)', borderRadius: '12px', padding: '12px' }}>
          <div style={{ fontSize: '13px', fontWeight: 'bold', marginBottom: '8px' }}>سجل مرتجعات البيع</div>
          <div style={{ display: 'flex', gap: '8px', marginBottom: '8px', flexWrap: 'wrap' }}>
            <input placeholder="بحث برقم المرتجع أو اسم العميل أو الكاشير..." value={retSearch.q}
              onInput={e => setRetSearch(s => ({ ...s, q: e.target.value }))}
              style={{ flex: 1, minWidth: '200px' }} />
            <input type="date" value={retSearch.dateFrom} onInput={e => setRetSearch(s => ({ ...s, dateFrom: e.target.value }))} style={{ width: '130px' }} />
            <input type="date" value={retSearch.dateTo} onInput={e => setRetSearch(s => ({ ...s, dateTo: e.target.value }))} style={{ width: '130px' }} />
          </div>
          <div style={{ overflow: 'auto' }}>
            <table>
              <thead>
                <tr><th>الفاتورة</th><th>التاريخ</th><th>العميل</th><th>المبلغ</th><th>كامل/جزئي</th><th>الكاشير</th></tr>
              </thead>
              <tbody>
                {filteredReturns.map(r => (
                  <tr key={r._id}>
                    <td style={{ color: 'var(--accent)', fontWeight: 'bold' }}>#{r.invoiceNo}</td>
                    <td style={{ fontSize: '12px', color: 'var(--text2)' }}>{formatDate(r.createdAt)}</td>
                    <td>{r.customerName || '-'}</td>
                    <td>{formatMoney(r.subtotal)}</td>
                    <td>{r.isFullReturn ? 'كامل' : 'جزئي'}</td>
                    <td style={{ fontSize: '12px', color: 'var(--text2)' }}>{r.cashierName}</td>
                  </tr>
                ))}
                {filteredReturns.length === 0 && <tr><td colSpan="6" style={{ padding: '24px', color: 'var(--text2)', textAlign: 'center' }}>لا توجد مرتجعات</td></tr>}
              </tbody>
            </table>
          </div>
        </div>

        <Modal open={showModal} onClose={() => setShowModal(false)} title={`إرجاع من فاتورة #${selectedSale?.invoiceNo}`}>
          <div style={{ marginBottom: '12px' }}>
            {returnItems.map((item, i) => (
              <div key={item.productId} style={{ display: 'flex', alignItems: 'center', gap: '8px', padding: '8px', background: 'var(--bg)', borderRadius: '8px', marginBottom: '4px' }}>
                <div style={{ flex: 1 }}>
                  <div style={{ fontSize: '13px' }}>{item.name}</div>
                  <div style={{ fontSize: '11px', color: 'var(--text2)' }}>المتبقي: {item.quantity} | السعر: {formatMoney(item.unitPrice)}</div>
                </div>
                <input type="number" value={item.returnQty} min="0" max={item.quantity}
                  onInput={e => {
                    const newItems = [...returnItems]
                    newItems[i] = { ...newItems[i], returnQty: Math.min(Number(e.target.value) || 0, item.quantity) }
                    setReturnItems(newItems)
                  }}
                  style={{ width: '60px', textAlign: 'center', fontSize: '12px' }} />
              </div>
            ))}
          </div>
          <input placeholder="سبب الإرجاع (اختياري)" value={reason} onInput={e => setReason(e.target.value)} style={{ width: '100%', marginBottom: '12px' }} />
          {canCreate && <button onClick={handleReturn} style={{ width: '100%', padding: '10px', background: 'var(--warning)', color: '#fff', borderRadius: '8px', fontSize: '14px', fontWeight: 'bold' }}>تأكيد الإرجاع</button>}
        </Modal>
      </>}

      {activeTab === 'purchase' && <>
        <div style={{ background: 'var(--bg2)', borderRadius: '12px', padding: '12px', marginBottom: '16px' }}>
          <div style={{ fontSize: '13px', fontWeight: 'bold', marginBottom: '8px' }}>إرجاع من فاتورة شراء</div>
          <div style={{ display: 'flex', gap: '8px', marginBottom: '8px', flexWrap: 'wrap' }}>
            <input placeholder="بحث برقم الفاتورة أو اسم المورد..." value={pSearch.q}
              onInput={e => setPSearch(s => ({ ...s, q: e.target.value }))}
              style={{ flex: 1, minWidth: '200px' }} />
            <input type="date" value={pSearch.dateFrom} onInput={e => setPSearch(s => ({ ...s, dateFrom: e.target.value }))} style={{ width: '130px' }} />
            <input type="date" value={pSearch.dateTo} onInput={e => setPSearch(s => ({ ...s, dateTo: e.target.value }))} style={{ width: '130px' }} />
          </div>
          {canCreate && <div style={{ display: 'flex', flexWrap: 'wrap', gap: '6px' }}>
            {filteredPurchases.length > 0 && <div style={{ fontSize: '12px', color: 'var(--text2)', width: '100%', marginBottom: '4px' }}>اختر فاتورة شراء للإرجاع:</div>}
            {filteredPurchases.slice(0, 30).map(p => (
              <button key={p._id} onClick={() => openPReturn(p)} style={{ background: 'var(--bg3)', padding: '6px 12px', borderRadius: '6px', fontSize: '12px', color: '#f59e0b' }}>
                #{p.invoiceNo} - {formatMoney(p.netCost)} ({p.supplierName || 'بدون مورد'})
              </button>
            ))}
            {pSearch.q && filteredPurchases.length === 0 && <span style={{ color: 'var(--text2)', fontSize: '12px' }}>لا توجد فواتير مطابقة</span>}
            {!pSearch.q && <span style={{ color: 'var(--text2)', fontSize: '12px' }}>ابدأ الكتابة للبحث عن فاتورة...</span>}
          </div>}
        </div>

        <div style={{ background: 'var(--bg2)', borderRadius: '12px', padding: '12px' }}>
          <div style={{ fontSize: '13px', fontWeight: 'bold', marginBottom: '8px' }}>سجل مرتجعات الشراء</div>
          <div style={{ display: 'flex', gap: '8px', marginBottom: '8px', flexWrap: 'wrap' }}>
            <input placeholder="بحث برقم المرتجع أو اسم المورد..." value={pRetSearch.q}
              onInput={e => setPRetSearch(s => ({ ...s, q: e.target.value }))}
              style={{ flex: 1, minWidth: '200px' }} />
            <input type="date" value={pRetSearch.dateFrom} onInput={e => setPRetSearch(s => ({ ...s, dateFrom: e.target.value }))} style={{ width: '130px' }} />
            <input type="date" value={pRetSearch.dateTo} onInput={e => setPRetSearch(s => ({ ...s, dateTo: e.target.value }))} style={{ width: '130px' }} />
          </div>
          <div style={{ overflow: 'auto' }}>
            <table>
              <thead>
                <tr><th>المرتجع</th><th>فاتورة الشراء</th><th>التاريخ</th><th>المورد</th><th>المبلغ</th><th>السبب</th><th></th></tr>
              </thead>
              <tbody>
                {filteredPReturns.map(r => (
                  <tr key={r._id}>
                    <td style={{ color: '#f59e0b', fontWeight: 'bold' }}>#{r.invoiceNo}</td>
                    <td style={{ fontSize: '12px', color: 'var(--text2)' }}>#{r.purchaseInvoiceNo}</td>
                    <td style={{ fontSize: '12px', color: 'var(--text2)' }}>{formatDate(r.createdAt)}</td>
                    <td>{r.supplierName || '-'}</td>
                    <td style={{ fontWeight: 'bold' }}>{formatMoney(r.subtotal)}</td>
                    <td style={{ fontSize: '12px', color: 'var(--text2)' }}>{r.reason || '-'}</td>
                    <td><button onClick={() => handleRemovePurchaseReturn(r._id)} style={{ color: 'var(--danger)', background: 'var(--bg3)', padding: '4px 8px', borderRadius: '4px', fontSize: '11px' }}>حذف</button></td>
                  </tr>
                ))}
                {filteredPReturns.length === 0 && <tr><td colSpan="7" style={{ padding: '24px', color: 'var(--text2)', textAlign: 'center' }}>لا توجد مرتجعات شراء</td></tr>}
              </tbody>
            </table>
          </div>
        </div>

        <Modal open={showPReturnModal} onClose={() => { setShowPReturnModal(false); setSelectedPurchase(null) }} title={`مرتجع مشتريات - فاتورة #${selectedPurchase?.invoiceNo}`} width="500px">
          {selectedPurchase && (
            <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
              <div style={{ fontSize: '12px', color: 'var(--text2)' }}>المورد: {selectedPurchase.supplierName}</div>
              {pReturnItems.map((item, idx) => {
                const oldReturns = purchaseReturns.filter(r => r.purchaseId === selectedPurchase._id)
                const returnedQty = oldReturns.reduce((s, r) => s + (r.items.find(i => i.productId === item.productId)?.quantity || 0), 0)
                const maxReturn = (selectedPurchase.items.find(i => i.productId === item.productId)?.quantity || 0) - returnedQty
                return (
                  <div key={idx} style={{ display: 'flex', gap: '6px', alignItems: 'center', padding: '6px', background: 'var(--bg)', borderRadius: '8px' }}>
                    <span style={{ flex: 2, fontSize: '13px' }}>{item.name}</span>
                    <input type="number" placeholder="الكمية" value={item.quantity || ''}
                      onInput={e => setPReturnItems(arr => { const n = [...arr]; n[idx] = { ...n[idx], quantity: Math.min(Number(e.target.value) || 0, maxReturn) }; return n })}
                      style={{ flex: 1, width: '60px', background: 'var(--bg)', color: 'var(--text)', border: '1px solid var(--bg3)', borderRadius: '8px', padding: '6px' }} />
                    <input type="number" placeholder="سعر الوحدة" value={item.unitPrice || ''}
                      onInput={e => setPReturnItems(arr => { const n = [...arr]; n[idx] = { ...n[idx], unitPrice: Number(e.target.value) || 0 }; return n })}
                      style={{ flex: 1, width: '60px', background: 'var(--bg)', color: 'var(--text)', border: '1px solid var(--bg3)', borderRadius: '8px', padding: '6px' }} />
                    <span style={{ fontSize: '11px', color: 'var(--text2)', minWidth: '60px', textAlign: 'left' }}>{formatMoney(Number(item.quantity) * Number(item.unitPrice))}</span>
                  </div>
                )
              })}
              <div style={{ textAlign: 'left', fontWeight: 'bold', fontSize: '14px', color: 'var(--success)' }}>
                الإجمالي: {formatMoney(pReturnItems.reduce((s, i) => s + Number(i.quantity) * Number(i.unitPrice), 0))}
              </div>
              <textarea placeholder="سبب الإرجاع (اختياري)" value={pReturnReason} onInput={e => setPReturnReason(e.target.value)} rows="2"
                style={{ background: 'var(--bg)', color: 'var(--text)', border: '1px solid var(--bg3)', borderRadius: '8px', padding: '8px', resize: 'vertical' }} />
              <button onClick={handleCreatePReturn} style={{ background: '#f59e0b', color: '#fff', padding: '10px', borderRadius: '8px', fontSize: '14px', fontWeight: 'bold' }}>
                تسجيل مرتجع
              </button>
            </div>
          )}
        </Modal>
      </>}

      <ConfirmDialog />
    </div>
  )
}
