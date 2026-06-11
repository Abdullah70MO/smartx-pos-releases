import { useState, useEffect } from 'preact/hooks'
import api from '../api'
import { useToast } from '../components/Toast'
import Modal from '../components/Modal'
import { formatMoney } from '../utils/money'
import { useStore } from '../store'
import { formatDate } from '../utils/date'

export default function ReturnsPage() {
  const { user } = useStore()
  const toast = useToast()
  const canCreate = user?.permissions?.includes('returns.create')
  const [returns, setReturns] = useState([])
  const [sales, setSales] = useState([])
  const [showModal, setShowModal] = useState(false)
  const [selectedSale, setSelectedSale] = useState(null)
  const [returnItems, setReturnItems] = useState([])
  const [reason, setReason] = useState('')
  const [search, setSearch] = useState({ q: '', dateFrom: '', dateTo: '' })

  useEffect(() => { loadReturns(); loadSales() }, [])

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
        saleId: selectedSale._id,
        invoiceNo: selectedSale.invoiceNo,
        items: items.map(i => ({
          productId: i.productId, name: i.name,
          quantity: i.returnQty, unitPrice: i.unitPrice, cost: i.cost
        })),
        subtotal, reason,
        customerName: selectedSale.customerName,
        isFullReturn: isFull
      })
      toast('تم إرجاع المنتجات', 'success')
      setShowModal(false)
      loadReturns()
    } catch (err) { toast(err.message, 'error') }
  }

  const filteredSales = sales.filter(s => {
    const q = search.q
    const matchQ = !q || String(s.invoiceNo).includes(q) || s.customerName?.includes(q) || s.customerPhone?.includes(q)
    const matchDate = (!search.dateFrom || new Date(s.createdAt) >= new Date(search.dateFrom)) &&
      (!search.dateTo || new Date(s.createdAt) <= new Date(search.dateTo + 'T23:59:59'))
    return matchQ && matchDate
  })

  return (
    <div style={{ padding: '20px', overflow: 'auto', height: '100vh' }}>
      <h1 style={{ fontSize: '20px', marginBottom: '16px' }}>المرتجع</h1>

      <div style={{ display: 'flex', gap: '8px', marginBottom: '12px', flexWrap: 'wrap' }}>
        <input placeholder="بحث برقم الفاتورة أو اسم العميل أو رقم الهاتف..." value={search.q}
          onInput={e => setSearch(s => ({ ...s, q: e.target.value }))}
          style={{ flex: 1, minWidth: '200px' }} />
        <input type="date" value={search.dateFrom} onInput={e => setSearch(s => ({ ...s, dateFrom: e.target.value }))}
          style={{ width: '140px' }} />
        <input type="date" value={search.dateTo} onInput={e => setSearch(s => ({ ...s, dateTo: e.target.value }))}
          style={{ width: '140px' }} />
      </div>

      {canCreate && <div style={{ background: 'var(--bg2)', borderRadius: '12px', padding: '12px', marginBottom: '16px' }}>
        <div style={{ display: 'flex', flexWrap: 'wrap', gap: '6px' }}>
          {filteredSales.length > 0 && <div style={{ fontSize: '12px', color: 'var(--text2)', width: '100%', marginBottom: '4px' }}>نتائج البحث — اختر فاتورة للإرجاع:</div>}
          {filteredSales.slice(0, 30).map(s => (
            <button key={s._id} onClick={() => openReturn(s)} style={{
              background: 'var(--bg3)', padding: '6px 12px', borderRadius: '6px', fontSize: '12px', color: 'var(--accent)'
            }}>
              #{s.invoiceNo} - {formatMoney(s.total)} ({s.customerName || 'بدون عميل'})
            </button>
          ))}
          {search.q && filteredSales.length === 0 && <span style={{ color: '#475569', fontSize: '12px' }}>لا توجد فواتير مطابقة</span>}
          {!search.q && <span style={{ color: '#475569', fontSize: '12px' }}>ابدأ الكتابة للبحث عن فاتورة...</span>}
        </div>
      </div>}

      <h3 style={{ fontSize: '13px', color: 'var(--text2)', marginBottom: '8px' }}>سجل المرتجعات</h3>
      <div style={{ background: 'var(--bg2)', borderRadius: '12px', overflow: 'auto' }}>
        <table>
          <thead>
            <tr><th>الفاتورة</th><th>التاريخ</th><th>العميل</th><th>المبلغ</th><th>كامل/جزئي</th><th>الكاشير</th></tr>
          </thead>
          <tbody>
            {returns.map(r => (
              <tr key={r._id}>
                <td style={{ color: 'var(--accent)', fontWeight: 'bold' }}>#{r.invoiceNo}</td>
                <td style={{ fontSize: '12px', color: 'var(--text2)' }}>{formatDate(r.createdAt)}</td>
                <td>{r.customerName || '-'}</td>
                <td>{formatMoney(r.subtotal)}</td>
                <td>{r.isFullReturn ? 'كامل' : 'جزئي'}</td>
                <td style={{ fontSize: '12px', color: 'var(--text2)' }}>{r.cashierName}</td>
              </tr>
            ))}
            {returns.length === 0 && <tr><td colSpan="6" style={{ padding: '24px', color: '#475569', textAlign: 'center' }}>لا توجد مرتجعات</td></tr>}
          </tbody>
        </table>
      </div>

      <Modal open={showModal} onClose={() => setShowModal(false)} title={`إرجاع من فاتورة #${selectedSale?.invoiceNo}`}>
        <div style={{ marginBottom: '12px' }}>
          {returnItems.map((item, i) => (
            <div key={item.productId} style={{ display: 'flex', alignItems: 'center', gap: '8px', padding: '8px', background: 'var(--bg)', borderRadius: '8px', marginBottom: '4px' }}>
              <div style={{ flex: 1 }}>
                <div style={{ fontSize: '13px' }}>{item.name}</div>
                <div style={{ fontSize: '11px', color: 'var(--text2)' }}>الكمية المتاحة: {item.quantity} | السعر: {formatMoney(item.unitPrice)}</div>
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
        {canCreate && <button onClick={handleReturn} style={{ width: '100%', padding: '10px', background: 'var(--warning)', color: '#fff', borderRadius: '8px', fontSize: '14px', fontWeight: 'bold' }}>
          تأكيد الإرجاع
        </button>}
      </Modal>
    </div>
  )
}