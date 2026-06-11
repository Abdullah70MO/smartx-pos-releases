import { useState, useEffect } from 'preact/hooks'
import api from '../api'
import { useToast } from '../components/Toast'
import Modal from '../components/Modal'
import { formatDate, formatDateTime } from '../utils/date'
import { formatMoney } from '../utils/money'
import { useStore } from '../store'
import { useConfirm } from '../components/ConfirmModal'

export default function SalesPage() {
  const { user } = useStore()
  const toast = useToast()
  const { confirm, ConfirmDialog } = useConfirm()
  const canDelete = user?.permissions?.includes('sales.delete')
  const [sales, setSales] = useState([])
  const [expanded, setExpanded] = useState(null)
  const [error, setError] = useState(null)
  const [viewInvoice, setViewInvoice] = useState(null)
  const [settings, setSettings] = useState(null)
  const [search, setSearch] = useState({ q: '', dateFrom: '', dateTo: '' })

  useEffect(() => { load() }, [])

  async function load() {
    const token = localStorage.getItem('token')
    try {
      const data = await api.listSales(token)
      setSales(data)
      setError(null)
      const s = await api.getSettings(token)
      setSettings(s)
    } catch (err) { setError(err.message) }
  }

  async function handleRemove(id) {
    if (!await confirm('هل أنت متأكد من حذف هذه الفاتورة؟')) return
    const token = localStorage.getItem('token')
    try {
      await api.removeSale(token, id)
      toast('تم حذف الفاتورة وإعادة المخزون', 'success')
      load(); window.dispatchEvent(new Event('dataChanged'))
    } catch (err) { toast(err.message, 'error') }
  }

  const filtered = sales.filter(s => {
    const q = search.q
    const matchQ = !q || String(s.invoiceNo).includes(q) || s.customerName?.includes(q) || s.cashierName?.includes(q) || s.customerPhone?.includes(q)
    const matchDate = (!search.dateFrom || new Date(s.createdAt) >= new Date(search.dateFrom)) &&
      (!search.dateTo || new Date(s.createdAt) <= new Date(search.dateTo + 'T23:59:59'))
    return matchQ && matchDate
  })

  return (
    <div style={{ padding: '20px', overflow: 'auto', height: '100vh' }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '16px' }}>
        <h1 style={{ fontSize: '20px' }}>المبيعات</h1>
      </div>

      <div style={{ display: 'flex', gap: '8px', marginBottom: '12px', flexWrap: 'wrap' }}>
        <input placeholder="بحث برقم الفاتورة أو اسم العميل أو الكاشير أو رقم الهاتف..." value={search.q}
          onInput={e => setSearch(s => ({ ...s, q: e.target.value }))}
          style={{ flex: 1, minWidth: '200px' }} />
        <input type="date" value={search.dateFrom} onInput={e => setSearch(s => ({ ...s, dateFrom: e.target.value }))}
          style={{ width: '140px' }} />
        <input type="date" value={search.dateTo} onInput={e => setSearch(s => ({ ...s, dateTo: e.target.value }))}
          style={{ width: '140px' }} />
      </div>

      <div style={{ background: 'var(--bg2)', borderRadius: '12px', overflow: 'auto' }}>
        <table>
          <thead>
            <tr>
              <th>الفاتورة</th><th>التاريخ</th><th>العميل</th><th>الإجمالي</th><th>طريقة الدفع</th><th>الكاشير</th><th></th>
            </tr>
          </thead>
          <tbody>
            {filtered.map(s => (
              <>
                <tr key={s._id} onClick={() => setExpanded(expanded === s._id ? null : s._id)} style={{ cursor: 'pointer' }}>
                  <td style={{ fontWeight: 'bold', color: 'var(--accent)' }}>#{s.invoiceNo}</td>
                  <td style={{ fontSize: '12px', color: 'var(--text2)' }}>{formatDate(s.createdAt)}</td>
                  <td>{s.customerName || '-'}</td>
                  <td style={{ fontWeight: 'bold' }}>{formatMoney(s.total)}</td>
                  <td style={{ color: 'var(--text2)' }}>{s.paymentMethod === 'card' ? 'بطاقة' : s.paymentMethod === 'credit' ? 'آجل' : 'نقداً'}</td>
                  <td style={{ fontSize: '12px', color: 'var(--text2)' }}>{s.cashierName}</td>
                  <td style={{ display: 'flex', gap: '4px' }}>
                    <button onClick={e => { e.stopPropagation(); setViewInvoice(s) }} style={{ background: 'var(--bg3)', color: 'var(--accent)', padding: '4px 10px', borderRadius: '4px', fontSize: '11px' }}>عرض</button>
                    {canDelete && <button onClick={e => { e.stopPropagation(); handleRemove(s._id) }} style={{ background: 'var(--bg3)', color: 'var(--danger)', padding: '4px 10px', borderRadius: '4px', fontSize: '11px' }}>حذف</button>}
                  </td>
                </tr>
                {expanded === s._id && (
                  <tr key={`items-${s._id}`}>
                    <td colSpan="7" style={{ padding: '12px 24px', background: 'var(--bg)' }}>
                      <table style={{ maxWidth: '500px', margin: '0 auto' }}>
                        <thead>
                          <tr><th>المنتج</th><th>الكمية</th><th>السعر</th><th>المجموع</th></tr>
                        </thead>
                        <tbody>
                          {s.items?.map((item, i) => (
                            <tr key={i}>
                              <td>{item.name}</td>
                              <td>{item.quantity}</td>
                              <td>{formatMoney(item.unitPrice)}</td>
                              <td>{formatMoney(item.quantity * item.unitPrice)}</td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                      {s.note && <div style={{ fontSize: '12px', color: 'var(--text2)', marginTop: '8px', textAlign: 'center' }}>ملاحظة: {s.note}</div>}
                    </td>
                  </tr>
                )}
              </>
            ))}
            {error && <tr><td colSpan="7" style={{ padding: '24px', color: 'var(--danger)', textAlign: 'center' }}>خطأ: {error}</td></tr>}
            {filtered.length === 0 && !error && (
              <tr><td colSpan="7" style={{ padding: '24px', color: '#475569', textAlign: 'center' }}>لا توجد مبيعات</td></tr>
            )}
          </tbody>
        </table>
      </div>

      <Modal open={!!viewInvoice} onClose={() => setViewInvoice(null)} title={`فاتورة #${viewInvoice?.invoiceNo}`} width="380px">
        {viewInvoice && (
          <div style={{ fontSize: '12px', textAlign: 'center' }} id="invoice-print">
            <div style={{ fontWeight: 'bold', fontSize: '16px', marginBottom: '2px' }}>{settings?.businessName || 'SMART X'}</div>
            {settings?.phone && <div style={{ color: 'var(--text2)', fontSize: '11px' }}>هاتف: {settings.phone}</div>}
            {settings?.address && <div style={{ color: 'var(--text2)', fontSize: '11px' }}>{settings.address}</div>}
            <div style={{ color: 'var(--text2)', margin: '6px 0 10px' }}>فاتورة #{viewInvoice.invoiceNo}</div>
            <div style={{ color: 'var(--text2)', marginBottom: '4px', fontSize: '11px' }}>{formatDateTime(viewInvoice.createdAt)}</div>
            {viewInvoice.customerName && <div style={{ marginBottom: '8px', color: 'var(--text2)' }}>العميل: {viewInvoice.customerName}{viewInvoice.customerPhone ? ` - ${viewInvoice.customerPhone}` : ''}</div>}
            <div style={{ borderTop: '1px dashed var(--bg3)', margin: '8px 0' }}></div>
            {viewInvoice.items?.map((item, i) => (
              <div key={i} style={{ display: 'flex', justifyContent: 'space-between', padding: '3px 0' }}>
                <span>{item.name} × {item.quantity}</span>
                <span>{(item.unitPrice * item.quantity)?.toFixed(2)}</span>
              </div>
            ))}
            <div style={{ borderTop: '1px dashed var(--bg3)', margin: '8px 0' }}></div>
            <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '13px' }}><span>المجموع</span><span>{formatMoney(viewInvoice.subtotal)}</span></div>
            {viewInvoice.discount > 0 && <div style={{ display: 'flex', justifyContent: 'space-between' }}><span>الخصم</span><span style={{ color: 'var(--danger)' }}>-{formatMoney(viewInvoice.discount)}</span></div>}
            {viewInvoice.tax > 0 && <div style={{ display: 'flex', justifyContent: 'space-between' }}><span>الضريبة</span><span>{formatMoney(viewInvoice.tax)}</span></div>}
            <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '15px', fontWeight: 'bold', marginTop: '4px' }}>
              <span>الإجمالي</span><span style={{ color: 'var(--success)' }}>{formatMoney(viewInvoice.total)}</span>
            </div>
            {viewInvoice.paid > 0 && <div style={{ display: 'flex', justifyContent: 'space-between', marginTop: '4px' }}><span>المدفوع</span><span>{formatMoney(viewInvoice.paid)}</span></div>}
            <div style={{ marginTop: '4px', color: 'var(--text2)' }}>طريقة الدفع: {viewInvoice.paymentMethod === 'card' ? 'بطاقة' : viewInvoice.paymentMethod === 'credit' ? 'آجل' : 'نقداً'}</div>
            {viewInvoice.note && <div style={{ marginTop: '8px', color: '#f97316' }}>ملاحظة: {viewInvoice.note}</div>}
            <div style={{ marginTop: '12px', color: 'var(--text2)', fontSize: '11px' }}>الكاشير: {viewInvoice.cashierName}</div>
            {settings?.receiptFooter && <div style={{ marginTop: '10px', borderTop: '1px dashed var(--bg3)', paddingTop: '8px', color: 'var(--text2)', fontSize: '11px' }}>{settings.receiptFooter}</div>}
            <button onClick={() => window.print()}
              style={{ marginTop: '16px', background: 'var(--accent)', color: '#fff', padding: '10px 24px', borderRadius: '8px', fontSize: '13px', fontWeight: 'bold', width: '100%' }}>
              طباعة
            </button>
          </div>
        )}
      </Modal>
      <ConfirmDialog />
    </div>
  )
}
