import { useState, useEffect } from 'preact/hooks'
import api from '../api'
import Modal from '../components/Modal'
import Pagination from '../components/Pagination'
import { useToast } from '../components/Toast'
import { useStore } from '../store'
import { formatDate } from '../utils/date'
import { formatMoney } from '../utils/money'
import { useConfirm } from '../components/ConfirmModal'
import StatementA4 from '../components/StatementA4'
import StatementThermal from '../components/StatementThermal'
import { printA4, printThermal } from '../utils/print'
import { iconBtn, headerBtn, modalSuccessBtn, modalPrimaryBtn, printBtn, EditIcon, DeleteIcon, ViewIcon, PaymentIcon, AddIcon, PrintIcon, CheckIcon } from '../components/ActionIcons'

export default function CustomersPage() {
  const { user } = useStore()
  const toast = useToast()
  const { confirm, ConfirmDialog } = useConfirm()
  const canManage = user?.permissions?.includes('customers.manage')
  const canPay = user?.permissions?.includes('customers.payments')
  const [customers, setCustomers] = useState([])
  const [sales, setSales] = useState([])
  const [showModal, setShowModal] = useState(false)
  const [edit, setEdit] = useState(null)
  const [form, setForm] = useState({ name: '', phone: '', commercialReg: '', taxReg: '', address: '', notes: '', previousDebt: '' })
  const [payModal, setPayModal] = useState(null)
  const [payAmount, setPayAmount] = useState('')
  const [payNote, setPayNote] = useState('')
  const [payMethod, setPayMethod] = useState('cash')
  const [transModal, setTransModal] = useState(null)
  const [transactions, setTransactions] = useState([])
  const [search, setSearch] = useState('')
  const [settings, setSettings] = useState(null)
  const [page, setPage] = useState(0)
  const [totalPages, setTotalPages] = useState(0)
  const [total, setTotal] = useState(0)
  const pageSize = 20

  useEffect(() => { load() }, [page, search])

  async function load() {
    try {
      const token = localStorage.getItem('token')
      const [cust, s, sett] = await Promise.all([api.listCustomers(token, search, page, pageSize), api.listSales(token), api.getSettings(token)])
      setCustomers(cust.data); setTotal(cust.total); setTotalPages(cust.totalPages); setSales(s); setSettings(sett)
    } catch (err) { console.error(err) }
  }

  function openEdit(c) {
    setEdit(c); setForm({ name: c.name, phone: c.phone || '', commercialReg: c.commercialReg || '', taxReg: c.taxReg || '', address: c.address || '', notes: c.notes || '', previousDebt: '' }); setShowModal(true)
  }

  async function handleSave(e) {
    e.preventDefault()
    if (!form.name.trim()) { toast('الرجاء إدخال اسم العميل', 'error'); return }
    const token = localStorage.getItem('token')
    try {
      await api.saveCustomer(token, { ...form, _id: edit?._id })
      toast(edit ? 'تم التحديث' : 'تمت الإضافة', 'success')
      setShowModal(false); load(); window.dispatchEvent(new Event('dataChanged'))
    } catch (err) { toast(err.message, 'error') }
  }

  async function handleRemove(id) {
    if (!await confirm('حذف هذا العميل؟')) return
    const token = localStorage.getItem('token')
    try { await api.removeCustomer(token, id); toast('تم الحذف', 'success'); load(); window.dispatchEvent(new Event('dataChanged')) }
    catch (err) { toast(err.message, 'error') }
  }

  async function openPay(c) {
    setPayModal(c); setPayAmount(''); setPayNote('')
  }

  async function handlePay(e) {
    e.preventDefault()
    const token = localStorage.getItem('token')
    try {
      await api.createCustomerPayment(token, { customerId: payModal._id, customerName: payModal.name, amount: Number(payAmount), note: payNote, paymentMethod: payMethod })
      toast('تمت إضافة الدفعة', 'success')
      setPayModal(null); load(); window.dispatchEvent(new Event('dataChanged'))
    } catch (err) { toast(err.message, 'error') }
  }

  function handleSearch(v) { setSearch(v); setPage(0) }

  async function openTransactions(c) {
    const token = localStorage.getItem('token')
    const creditSales = sales.filter(s => s.customerName === c.name && s.paymentMethod === 'credit').flatMap(s => [
      { type: 'فاتورة آجلة', desc: `فاتورة #${s.invoiceNo}`, amount: s.total - s.paid, date: s.createdAt, paymentMethod: 'credit' },
      ...(s.previousCredit > 0 ? [{ type: 'خصم رصيد سابق', desc: `خصم دين مستحق للعميل فاتورة #${s.invoiceNo}`, amount: -s.previousCredit, date: s.createdAt, paymentMethod: 'credit' }] : []),
      ...(s.previousDebt > 0 ? [{ type: 'رصيد سابق', desc: `رصيد مستحق من العميل فاتورة #${s.invoiceNo}`, amount: s.previousDebt, date: s.createdAt, paymentMethod: 'credit' }] : [])
    ])
    const pays = await api.listCustomerPayments(token, c._id)
    const pymts = pays.map(p => ({ type: 'دفعة', desc: p.note || 'دفعة', amount: -p.amount, date: p.createdAt, paymentMethod: p.paymentMethod }))
    const returns = await api.listReturnsByCustomer(token, c.name)
    const rets = returns.flatMap(r => [
      { type: 'مرتجع', desc: `مرتجع #${r.invoiceNo}`, amount: -(r.subtotal + (r.tax || 0)), date: r.createdAt, paymentMethod: r.paymentMethod },
      ...(r.refundAmount > 0 ? [{ type: 'استرداد نقدي', desc: `استرداد مرتجع #${r.invoiceNo}`, amount: r.refundAmount, date: r.createdAt, paymentMethod: r.paymentMethod }] : [])
    ])
    const all = [...creditSales, ...pymts, ...rets].sort((a, b) => new Date(a.date) - new Date(b.date))
    let bal = 0
    setTransactions(all.map(t => { bal += t.amount; return { ...t, balance: bal } }))
    setTransModal(c)
  }

  return (
    <div style={{ padding: '20px', overflow: 'auto', height: '100%' }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '16px' }}>
        <h1 style={{ fontSize: '20px' }}>عملاء آجل ({total})</h1>
        {canManage && <button onClick={() => { setEdit(null); setForm({ name: '', phone: '', commercialReg: '', taxReg: '', address: '', notes: '', previousDebt: '' }); setShowModal(true) }}
          style={headerBtn}><AddIcon size={16} /> إضافة عميل</button>}
      </div>

      <input placeholder="بحث باسم العميل أو رقم الهاتف..." value={search} onInput={e => handleSearch(e.target.value)}
        style={{ width: '100%', marginBottom: '12px' }} />

      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(300px, 1fr))', gap: '12px' }}>
        {customers.map(c => {
          const remaining = (c.totalDebt || 0) - (c.totalPaid || 0)
          const hasDebt = remaining > 0
          return (
            <div key={c._id} style={{
              background: 'var(--bg2)', borderRadius: '14px', padding: '18px',
              border: '1px solid var(--outline)', boxShadow: 'var(--elevation-1)',
              transition: 'all 0.2s', display: 'flex', flexDirection: 'column', gap: '12px'
            }}
              onMouseEnter={e => { e.currentTarget.style.boxShadow = 'var(--elevation-2)'; e.currentTarget.style.borderColor = 'var(--accent)' }}
              onMouseLeave={e => { e.currentTarget.style.boxShadow = 'var(--elevation-1)'; e.currentTarget.style.borderColor = 'var(--outline)' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                <div style={{
                  width: '44px', height: '44px', borderRadius: '12px',
                  background: hasDebt ? 'rgba(239,68,68,0.15)' : 'rgba(34,197,94,0.15)',
                  display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0
                }}>
                  <svg viewBox="0 0 24 24" fill="none" stroke={hasDebt ? '#ef4444' : '#22c55e'} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" width="22" height="22">
                    <path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2"/><circle cx="9" cy="7" r="4"/>
                    <path d="M23 21v-2a4 4 0 0 0-3-3.87"/><path d="M16 3.13a4 4 0 0 1 0 7.75"/>
                  </svg>
                </div>
                <div style={{ flex: 1 }}>
                  <div style={{ fontSize: '15px', fontWeight: 'bold', color: 'var(--text)' }}>{c.name}</div>
                  <div style={{ fontSize: '12px', color: 'var(--text2)' }}>{c.phone || 'لا يوجد هاتف'}</div>
                </div>
              </div>
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: '6px', background: 'var(--bg)', borderRadius: '10px', padding: '10px' }}>
                <div style={{ textAlign: 'center' }}>
                  <div style={{ fontSize: '10px', color: 'var(--text2)' }}>الدين</div>
                  <div style={{ fontSize: '14px', fontWeight: 'bold', color: 'var(--danger)' }}>{formatMoney(c.totalDebt || 0)}</div>
                </div>
                <div style={{ textAlign: 'center' }}>
                  <div style={{ fontSize: '10px', color: 'var(--text2)' }}>المدفوع</div>
                  <div style={{ fontSize: '14px', fontWeight: 'bold', color: 'var(--success)' }}>{formatMoney(c.totalPaid || 0)}</div>
                </div>
                <div style={{ textAlign: 'center' }}>
                  <div style={{ fontSize: '10px', color: 'var(--text2)' }}>المتبقي</div>
                  <div style={{ fontSize: '14px', fontWeight: 'bold', color: hasDebt ? 'var(--danger)' : 'var(--success)' }}>{formatMoney(remaining)}</div>
                </div>
              </div>
              {c.notes && <div style={{ fontSize: '12px', color: 'var(--text2)', background: 'var(--bg)', borderRadius: '8px', padding: '8px', lineHeight: 1.5 }}>ملاحظات: {c.notes}</div>}
              <div style={{ display: 'flex', gap: '4px', justifyContent: 'center' }}>
                {canPay && <button onClick={() => openPay(c)} title="تسديد" style={iconBtn('success')}><PaymentIcon size={13} /></button>}
                <button onClick={() => openTransactions(c)} title="كشف حساب" style={iconBtn('accent')}><ViewIcon size={13} /></button>
                {canManage && <button onClick={() => openEdit(c)} title="تعديل" style={iconBtn('warning')}><EditIcon size={13} /></button>}
                {canManage && <button onClick={() => handleRemove(c._id)} title="حذف" style={iconBtn('danger')}><DeleteIcon size={13} /></button>}
              </div>
            </div>
          )
        })}
        {customers.length === 0 && (
          <div style={{ gridColumn: '1 / -1', padding: '32px', color: 'var(--text2)', textAlign: 'center' }}>لا يوجد عملاء</div>
        )}
      </div>
      <Pagination page={page} totalPages={totalPages} total={total} pageSize={pageSize} onChange={setPage} />

      <Modal open={showModal} onClose={() => setShowModal(false)} title={edit ? 'تعديل عميل' : 'إضافة عميل'} width="450px">
        <form onSubmit={handleSave} style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
          <input placeholder="الاسم *" value={form.name} onInput={e => setForm(f => ({ ...f, name: e.target.value }))} required />
          <input placeholder="رقم الهاتف" value={form.phone} onInput={e => setForm(f => ({ ...f, phone: e.target.value }))} />
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '10px' }}>
            <input placeholder="رقم السجل التجاري" value={form.commercialReg} onInput={e => setForm(f => ({ ...f, commercialReg: e.target.value }))} />
            <input placeholder="رقم السجل الضريبي" value={form.taxReg} onInput={e => setForm(f => ({ ...f, taxReg: e.target.value }))} />
          </div>
          <input placeholder="العنوان" value={form.address} onInput={e => setForm(f => ({ ...f, address: e.target.value }))} />
          {!edit && <input type="number" step="any" placeholder="مبلغ مستحق سابق (دين)" value={form.previousDebt || ''} onInput={e => setForm(f => ({ ...f, previousDebt: e.target.value }))}
            style={{ background: 'var(--bg)', color: 'var(--text)', border: '1px solid var(--bg3)', borderRadius: '8px', padding: '8px' }} />}
          <textarea placeholder="ملاحظات" value={form.notes} onInput={e => setForm(f => ({ ...f, notes: e.target.value }))} rows="3"
            style={{ background: 'var(--bg)', color: 'var(--text)', border: '1px solid var(--bg3)', borderRadius: '8px', padding: '8px', resize: 'vertical' }} />
          <button type="submit" style={modalPrimaryBtn}><CheckIcon size={16} /> {edit ? 'تحديث' : 'إضافة'}</button>
        </form>
      </Modal>

      <Modal open={!!payModal} onClose={() => setPayModal(null)} title={`تسديد من العميل: ${payModal?.name}`} width="380px">
        <form onSubmit={handlePay} style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
          <div style={{ textAlign: 'center', marginBottom: '8px' }}>
            <div style={{ fontSize: '13px', color: 'var(--text2)' }}>إجمالي الدين: <span style={{ color: 'var(--danger)' }}>{(payModal?.totalDebt || 0).toFixed(2)}</span></div>
            <div style={{ fontSize: '13px', color: 'var(--text2)' }}>المدفوع سابقاً: <span style={{ color: 'var(--success)' }}>{(payModal?.totalPaid || 0).toFixed(2)}</span></div>
            {(() => { const r = (payModal?.totalDebt || 0) - (payModal?.totalPaid || 0); return <div style={{ fontSize: '13px', color: 'var(--text2)', marginBottom: '8px' }}>{r > 0 ? 'رصيد مستحق من العميل' : r < 0 ? 'دين مستحق للعميل' : 'المتبقي'}: <span style={{ color: r > 0 ? 'var(--danger)' : 'var(--success)', fontWeight: 'bold' }}>{Math.abs(r).toFixed(2)}</span></div> })()}
          </div>
          <div style={{ display: 'flex', gap: '8px' }}>
            <button type="button" onClick={() => setPayMethod('cash')} style={{
              flex: 1, padding: '8px', borderRadius: '8px', fontSize: '13px',
              background: payMethod === 'cash' ? 'var(--success)' : 'var(--bg3)',
              color: payMethod === 'cash' ? '#fff' : 'var(--text)', fontWeight: payMethod === 'cash' ? '700' : '500'
            }}>نقداً</button>
            <button type="button" onClick={() => setPayMethod('card')} style={{
              flex: 1, padding: '8px', borderRadius: '8px', fontSize: '13px',
              background: payMethod === 'card' ? 'var(--accent)' : 'var(--bg3)',
              color: payMethod === 'card' ? '#fff' : 'var(--text)', fontWeight: payMethod === 'card' ? '700' : '500'
            }}>بطاقة</button>
          </div>
          <input type="number" step="any" placeholder="المبلغ" value={payAmount} onInput={e => setPayAmount(e.target.value)} required
            style={{ background: 'var(--bg)', color: 'var(--text)', border: '1px solid var(--bg3)', borderRadius: '8px', padding: '8px' }} />
          <textarea placeholder="ملاحظات (اختياري)" value={payNote} onInput={e => setPayNote(e.target.value)} rows="2"
            style={{ background: 'var(--bg)', color: 'var(--text)', border: '1px solid var(--bg3)', borderRadius: '8px', padding: '8px', resize: 'vertical' }} />
          <button type="submit" style={modalSuccessBtn}><CheckIcon size={16} /> تسديد</button>
        </form>
      </Modal>

      <Modal open={!!transModal} onClose={() => setTransModal(null)} title={`عمليات العميل: ${transModal?.name}`} width={settings?.printDefaultSize === 'a4' ? '700px' : '380px'}>
        <div id="customer-print-statement">
          {settings?.printDefaultSize === 'a4'
            ? <StatementA4 type="customer" party={transModal} transactions={transactions} settings={settings} />
            : <StatementThermal type="customer" party={transModal} transactions={transactions} settings={settings} />}
        </div>
        <div style={{ display: 'flex', gap: '8px', justifyContent: 'center', marginTop: '12px' }}>
          <button onClick={async () => { try { const isA4 = settings?.printDefaultSize === 'a4'; const template = isA4 ? <StatementA4 type="customer" party={transModal} transactions={transactions} settings={settings} /> : <StatementThermal type="customer" party={transModal} transactions={transactions} settings={settings} />; if (isA4) await printA4(template); else await printThermal(template) } catch (err) { toast('فشلت الطباعة: ' + err.message, 'error') } }} style={{ ...printBtn }}><PrintIcon size={16} /> طباعة</button>
        </div>
      </Modal>
      <ConfirmDialog />
    </div>
  )
}