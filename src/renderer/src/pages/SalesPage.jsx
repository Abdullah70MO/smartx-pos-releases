import { Fragment } from 'preact'
import { useState, useEffect } from 'preact/hooks'
import api from '../api'
import Pagination from '../components/Pagination'
import { useToast } from '../components/Toast'
import Modal from '../components/Modal'
import { formatDate, formatDateTime } from '../utils/date'
import { formatMoney } from '../utils/money'
import { useStore } from '../store'
import { useConfirm } from '../components/ConfirmModal'
import PrintTemplateA4 from '../components/PrintTemplateA4'
import PrintTemplateThermal from '../components/PrintTemplateThermal'
import { printA4, printThermal } from '../utils/print'
import { iconBtn, headerBtn, secondaryBtn, modalPrimaryBtn, modalDangerBtn, PrintIcon, DeleteIcon, AddIcon, CheckIcon, SearchIcon, PaymentIcon } from '../components/ActionIcons'

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
  const [customers, setCustomers] = useState([])
  const [search, setSearch] = useState({ q: '', dateFrom: '', dateTo: '' })
  const [page, setPage] = useState(0)
  const [totalPages, setTotalPages] = useState(0)
  const [total, setTotal] = useState(0)
  const pageSize = 20

  useEffect(() => { load() }, [page, search.q, search.dateFrom, search.dateTo])

  async function load() {
    const token = localStorage.getItem('token')
    try {
      const filter = { query: search.q, from: search.dateFrom, to: search.dateTo }
      const result = await api.listSales(token, filter, page, pageSize)
      setSales(result.data)
      setTotal(result.total)
      setTotalPages(result.totalPages)
      setError(null)
      const s = await api.getSettings(token)
      setSettings(s)
      const c = await api.listCustomers(token)
      setCustomers(c)
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

  function handleSearch(key, value) {
    setSearch(s => ({ ...s, [key]: value }))
    setPage(0)
  }

  return (
    <div style={{ padding: '20px', overflow: 'auto', height: '100%' }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '16px' }}>
        <h1 style={{ fontSize: '20px' }}>المبيعات ({total})</h1>
      </div>

      <div style={{ display: 'flex', gap: '8px', marginBottom: '12px', flexWrap: 'wrap' }}>
        <input placeholder="بحث برقم الفاتورة أو اسم العميل أو الكاشير..." value={search.q}
          onInput={e => handleSearch('q', e.target.value)}
          style={{ flex: 1, minWidth: '200px' }} />
        <input type="date" value={search.dateFrom} onInput={e => handleSearch('dateFrom', e.target.value)}
          style={{ width: '140px' }} />
        <input type="date" value={search.dateTo} onInput={e => handleSearch('dateTo', e.target.value)}
          style={{ width: '140px' }} />
      </div>

      <div className="table-card">
        <table>
          <thead>
            <tr>
              <th>الفاتورة</th><th>التاريخ</th><th>العميل</th><th>الإجمالي</th><th>طريقة الدفع</th><th>الكاشير</th><th></th>
            </tr>
          </thead>
          <tbody>
            {sales.map(s => (
              <Fragment key={s._id}>
                <tr onClick={() => setExpanded(expanded === s._id ? null : s._id)} style={{ cursor: 'pointer' }}>
                  <td style={{ fontWeight: 'bold', color: 'var(--accent)' }}>#{s.invoiceNo}</td>
                  <td style={{ fontSize: '12px', color: 'var(--text2)' }}>{formatDate(s.createdAt)}</td>
                  <td>{s.customerName || '-'}</td>
                  <td style={{ fontWeight: 'bold' }}>{formatMoney(s.total)}</td>
                  <td style={{ color: 'var(--text2)' }}>{s.paymentMethod === 'card' ? 'بطاقة' : s.paymentMethod === 'credit' ? 'آجل' : 'نقداً'}</td>
                  <td style={{ fontSize: '12px', color: 'var(--text2)' }}>{s.cashierName}</td>
                  <td style={{ display: 'flex', gap: '4px' }}>
                    <button onClick={e => { e.stopPropagation(); setViewInvoice(s) }} title="عرض" style={iconBtn('accent')}><SearchIcon size={14} /></button>
                    {canDelete && <button onClick={e => { e.stopPropagation(); handleRemove(s._id) }} title="حذف" style={iconBtn('danger')}><DeleteIcon size={14} /></button>}
                  </td>
                </tr>
                {expanded === s._id && (
                  <tr>
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
              </Fragment>
            ))}
            {error && <tr><td colSpan="7" style={{ padding: '24px', color: 'var(--danger)', textAlign: 'center' }}>خطأ: {error}</td></tr>}
            {sales.length === 0 && !error && (
              <tr><td colSpan="7" style={{ padding: '24px', color: 'var(--text2)', textAlign: 'center' }}>لا توجد مبيعات</td></tr>
            )}
          </tbody>
        </table>
      </div>
      <Pagination page={page} totalPages={totalPages} total={total} pageSize={pageSize} onChange={setPage} />

      <Modal open={!!viewInvoice} onClose={() => setViewInvoice(null)} title={`فاتورة #${viewInvoice?.invoiceNo}`} width={settings?.printDefaultSize === 'a4' ? '700px' : '380px'}>
        {viewInvoice && (
          <div id="invoice-print">
            {(() => {
              const printData = { ...viewInvoice, change: (viewInvoice.paid || 0) > viewInvoice.total ? viewInvoice.paid - viewInvoice.total : 0 }
              return settings?.printDefaultSize === 'a4'
                ? <PrintTemplateA4 type="sale" data={printData} settings={settings} customers={customers} />
                : <PrintTemplateThermal data={printData} settings={settings} />
            })()}
            <div style={{ display: 'flex', gap: '8px', justifyContent: 'center', marginTop: '12px' }}>
              <button onClick={async () => {
                try {
                  const printData = { ...viewInvoice, change: (viewInvoice.paid || 0) > viewInvoice.total ? viewInvoice.paid - viewInvoice.total : 0 }
                  if (settings?.printDefaultSize === 'a4') {
                    await printA4(<PrintTemplateA4 type="sale" data={printData} settings={settings} customers={customers} />)
                  } else {
                    await printThermal(<PrintTemplateThermal data={printData} settings={settings} />)
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
      <ConfirmDialog />
    </div>
  )
}
