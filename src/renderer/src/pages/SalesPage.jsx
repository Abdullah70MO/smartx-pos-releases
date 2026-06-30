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

      <Modal open={!!viewInvoice} onClose={() => setViewInvoice(null)} title={`فاتورة #${viewInvoice?.invoiceNo}`} width="380px">
        {viewInvoice && (
          <div style={{ fontSize: '12px', textAlign: 'center' }} id="invoice-print">
            {settings?.showBusinessName !== false && <div style={{ fontWeight: 'bold', fontSize: '16px', marginBottom: '2px' }}>{settings?.businessName || 'SMART X'}</div>}
            {settings?.showLogo !== false && settings?.logoDataUrl && <div style={{ marginBottom: '4px' }}><img src={settings.logoDataUrl} alt="logo" style={{ maxHeight: '50px' }} /></div>}
            {settings?.showPhone !== false && settings?.phone && <div style={{ color: 'var(--text2)', fontSize: '11px' }}>هاتف: {settings.phone}</div>}
            {settings?.showEmail !== false && settings?.email && <div style={{ color: 'var(--text2)', fontSize: '11px' }}>بريد: {settings.email}</div>}
            {settings?.showAddress !== false && settings?.address && <div style={{ color: 'var(--text2)', fontSize: '11px' }}>{settings.address}</div>}
            {settings?.showCommercialReg && settings?.commercialRegistration && <div style={{ color: 'var(--text2)', fontSize: '11px' }}>سجل تجاري: {settings.commercialRegistration}</div>}
            {settings?.showTaxReg && settings?.taxNumber && <div style={{ color: 'var(--text2)', fontSize: '11px' }}>رقم ضريبي: {settings.taxNumber}</div>}
            <div style={{ color: 'var(--text2)', margin: '6px 0 10px' }}>فاتورة #{viewInvoice.invoiceNo}</div>
            <div style={{ color: 'var(--text2)', marginBottom: '4px', fontSize: '11px' }}>{formatDateTime(viewInvoice.createdAt)}</div>
            {settings?.showClientInfo !== false && viewInvoice.customerName && <div style={{ marginBottom: '8px', color: 'var(--text2)', fontSize: '11px' }}>
              <div style={{ fontWeight: 'bold', fontSize: '13px', color: 'var(--text)' }}>{viewInvoice.customerName}</div>
              {viewInvoice.customerPhone && <div>الهاتف: {viewInvoice.customerPhone}</div>}
              {(() => {
                if (!customers) return null
                const c = customers.find(x => x.name === viewInvoice.customerName)
                if (!c) return null
                return <>
                  {c.commercialReg && <div>سجل تجاري: {c.commercialReg}</div>}
                  {c.taxReg && <div>سجل ضريبي: {c.taxReg}</div>}
                  {c.address && <div>العنوان: {c.address}</div>}
                </>
              })()}
            </div>}
            {settings?.showProductsTable !== false && (<>
            <div style={{ borderTop: '1px dashed var(--bg3)', margin: '8px 0' }}></div>
            {viewInvoice.items?.map((item, i) => (
              <div key={i} style={{ display: 'flex', justifyContent: 'space-between', padding: '3px 0' }}>
                <span>{item.name} × {item.quantity}</span>
                <span>{(item.unitPrice * item.quantity)?.toFixed(2)}</span>
              </div>
            ))}
            <div style={{ borderTop: '1px dashed var(--bg3)', margin: '8px 0' }}></div>
            </>)}
            {settings?.showTotals !== false && (<>
            <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '13px' }}><span>المجموع</span><span>{formatMoney(viewInvoice.subtotal)}</span></div>
            {viewInvoice.discount > 0 && <div style={{ display: 'flex', justifyContent: 'space-between' }}><span>الخصم</span><span style={{ color: 'var(--danger)' }}>-{formatMoney(viewInvoice.discount)}</span></div>}
            {viewInvoice.tax > 0 && <div style={{ display: 'flex', justifyContent: 'space-between' }}><span>الضريبة</span><span>{formatMoney(viewInvoice.tax)}</span></div>}
            <div style={{ display: 'flex', justifyContent: 'space-between', fontWeight: 'bold', fontSize: '14px', marginTop: '4px', borderTop: '2px solid var(--bg3)', paddingTop: '4px' }}>
              <span>الإجمالي</span><span style={{ color: 'var(--success)' }}>{formatMoney(viewInvoice.total)}</span>
            </div>
            {viewInvoice.previousDebt > 0 && <div style={{ display: 'flex', justifyContent: 'space-between', marginTop: '2px' }}><span style={{ color: 'var(--danger)' }}>رصيد مستحق من العميل</span><span style={{ color: 'var(--danger)' }}>{formatMoney(viewInvoice.previousDebt)}</span></div>}
            {viewInvoice.previousCredit > 0 && <div style={{ display: 'flex', justifyContent: 'space-between', marginTop: '2px' }}><span style={{ color: 'var(--success)' }}>دين مستحق للعميل</span><span style={{ color: 'var(--success)' }}>-{formatMoney(viewInvoice.previousCredit)}</span></div>}
            {settings?.showPaid !== false && viewInvoice.paid > 0 && <div style={{ display: 'flex', justifyContent: 'space-between', marginTop: '4px' }}><span>المدفوع</span><span>{formatMoney(viewInvoice.paid)}</span></div>}
            {viewInvoice.paid > viewInvoice.total && <div style={{ display: 'flex', justifyContent: 'space-between', marginTop: '2px', color: 'var(--success)' }}><span>الباقي</span><span>{formatMoney(viewInvoice.paid - viewInvoice.total)}</span></div>}
            {settings?.showPaid !== false && viewInvoice.paymentMethod === 'credit' && (viewInvoice.paid || 0) < viewInvoice.total && <div style={{ display: 'flex', justifyContent: 'space-between', marginTop: '2px', color: 'var(--danger)' }}><span>رصيد مستحق من العميل</span><span>{formatMoney(viewInvoice.total - (viewInvoice.paid || 0))}</span></div>}
            {(() => {
              const rem = (viewInvoice.total || 0) - (viewInvoice.paid || 0)
              const totalRem = rem + (viewInvoice.previousDebt || 0) - (viewInvoice.previousCredit || 0)
              if (totalRem <= 0 && rem <= 0) return null
              return <div style={{ display: 'flex', justifyContent: 'space-between', marginTop: '2px', fontWeight: 'bold', borderTop: '1px solid var(--bg3)', paddingTop: '4px' }}>
                <span>إجمالي الرصيد المتبقي</span><span style={{ color: 'var(--danger)' }}>{formatMoney(totalRem)}</span>
              </div>
            })()}
            <div style={{ marginTop: '4px', color: 'var(--text2)' }}>طريقة الدفع: {viewInvoice.paymentMethod === 'card' ? 'بطاقة' : viewInvoice.paymentMethod === 'credit' ? 'آجل' : 'نقداً'}</div>
            {settings?.showNotes !== false && viewInvoice.note && <div style={{ marginTop: '8px', color: 'var(--warning)' }}>ملاحظة: {viewInvoice.note}</div>}
            {settings?.showCashier !== false && <div style={{ marginTop: '12px', color: 'var(--text2)', fontSize: '11px' }}>الكاشير: {viewInvoice.cashierName}</div>}
            {settings?.showReceiptFooter !== false && settings?.receiptFooter && <div style={{ marginTop: '10px', borderTop: '1px dashed var(--bg3)', paddingTop: '8px', color: 'var(--text2)', fontSize: '11px' }}>{settings.receiptFooter}</div>}
            <div style={{ display: 'flex', gap: '8px' }}>
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
            </>)}
          </div>
        )}
      </Modal>
      <ConfirmDialog />
    </div>
  )
}
