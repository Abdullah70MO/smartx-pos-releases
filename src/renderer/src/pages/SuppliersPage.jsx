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

export default function SuppliersPage() {
  const { user } = useStore()
  const toast = useToast()
  const { confirm, ConfirmDialog } = useConfirm()
  const canManage = user?.permissions?.includes('suppliers.manage')
  const canPay = user?.permissions?.includes('suppliers.payments')
  const [suppliers, setSuppliers] = useState([])
  const [purchases, setPurchases] = useState([])
  const [showModal, setShowModal] = useState(false)
  const [edit, setEdit] = useState(null)
  const [form, setForm] = useState({ name: '', phone: '', email: '', commercialReg: '', taxReg: '', address: '', notes: '', previousBalance: '' })
  const [payModal, setPayModal] = useState(null)
  const [payAmount, setPayAmount] = useState('')
  const [payNote, setPayNote] = useState('')
  const [payMethod, setPayMethod] = useState('cash')
  const [paySource, setPaySource] = useState('treasury')
  const [activeShift, setActiveShift] = useState(null)
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
      const [sup, pur, sett, shift] = await Promise.all([
        api.listSuppliers(token, search, page, pageSize),
        api.listPurchases(token),
        api.getSettings(token),
        api.getActiveShift(token).catch(() => null)
      ])
      setSuppliers(sup.data); setTotal(sup.total); setTotalPages(sup.totalPages); setPurchases(pur); setSettings(sett)
      setActiveShift(shift)
    } catch (err) { console.error(err) }
  }

  function openEdit(s) {
    setEdit(s); setForm({ name: s.name, phone: s.phone || '', email: s.email || '', commercialReg: s.commercialReg || '', taxReg: s.taxReg || '', address: s.address || '', notes: s.notes || '', previousBalance: '' }); setShowModal(true)
  }

  async function handleSave(e) {
    e.preventDefault()
    if (!form.name.trim()) { toast('الرجاء إدخال اسم المورد', 'error'); return }
    if (!form.phone.trim()) { toast('الرجاء إدخال رقم هاتف المورد', 'error'); return }
    const token = localStorage.getItem('token')
    try {
      await api.saveSupplier(token, { ...form, _id: edit?._id })
      toast(edit ? 'تم التحديث' : 'تمت الإضافة', 'success')
      setShowModal(false); load(); window.dispatchEvent(new Event('dataChanged'))
    } catch (err) { toast(err.message, 'error') }
  }

  async function handleRemove(id) {
    if (!await confirm('حذف هذا المورد؟')) return
    const token = localStorage.getItem('token')
    try { await api.removeSupplier(token, id); toast('تم الحذف', 'success'); load(); window.dispatchEvent(new Event('dataChanged')) }
    catch (err) { toast(err.message, 'error') }
  }

  async function openPay(s) {
    setPayModal(s); setPayAmount(''); setPayNote(''); setPaySource('treasury')
  }

  async function handlePay(e) {
    e.preventDefault()
    const token = localStorage.getItem('token')
    try {
      await api.createSupplierPayment(token, {
        supplierId: payModal._id, supplierName: payModal.name,
        amount: Number(payAmount), note: payNote, paymentMethod: payMethod,
        source: activeShift ? paySource : 'treasury'
      })
      toast('تمت إضافة الدفعة', 'success')
      setPayModal(null); load(); window.dispatchEvent(new Event('dataChanged'))
    } catch (err) { toast(err.message, 'error') }
  }

  function handleSearch(v) { setSearch(v); setPage(0) }

  async function openTransactions(s) {
    const token = localStorage.getItem('token')
    const sups = purchases.filter(p => p.supplierId === s._id).map(p => [
      { type: 'شراء', desc: `فاتورة #${p.invoiceNo}`, amount: p.netCost || p.totalCost, date: p.createdAt, paymentMethod: p.paymentMethod },
      ...(p.previousCredit > 0 ? [{ type: 'خصم رصيد سابق', desc: `خصم رصيد مستحق من المورد فاتورة #${p.invoiceNo}`, amount: -p.previousCredit, date: p.createdAt, paymentMethod: p.paymentMethod }] : []),
      ...(p.previousDebt > 0 ? [{ type: 'دين سابق', desc: `دين مستحق للمورد فاتورة #${p.invoiceNo}`, amount: p.previousDebt, date: p.createdAt, paymentMethod: p.paymentMethod }] : [])
    ]).flat()
    const pays = await api.listSupplierPayments(token, s._id)
    const pymts = pays.map(p => ({ type: 'دفعة', desc: p.note || 'دفعة', amount: -p.amount, date: p.createdAt, paymentMethod: p.paymentMethod }))
    const returns = await api.listPurchaseReturnsBySupplier(token, s.name)
    const rets = returns.flatMap(r => [
      { type: 'مرتجع شراء', desc: `مرتجع #${r.invoiceNo}`, amount: -(r.subtotal + (r.tax || 0)), date: r.createdAt, paymentMethod: r.paymentMethod },
      ...(r.refundAmount > 0 ? [{ type: 'استرداد نقدي', desc: `استرداد مرتجع #${r.invoiceNo}`, amount: r.refundAmount, date: r.createdAt, paymentMethod: r.paymentMethod }] : [])
    ])
    const all = [...sups, ...pymts, ...rets].sort((a, b) => new Date(a.date) - new Date(b.date))
    let bal = 0
    setTransactions(all.map(t => { bal += t.amount; return { ...t, balance: bal } }))
    setTransModal(s)
  }

  return (
    <div style={{ padding: '20px', overflow: 'auto', height: '100%' }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '16px' }}>
        <h1 style={{ fontSize: '20px' }}>الموردين ({total})</h1>
        {canManage && <button onClick={() => { setEdit(null); setForm({ name: '', phone: '', email: '', commercialReg: '', taxReg: '', address: '', notes: '', previousBalance: '' }); setShowModal(true) }}
          style={headerBtn}><AddIcon size={16} /> إضافة مورد</button>}
      </div>

      <input placeholder="بحث باسم المورد أو رقم الهاتف..." value={search} onInput={e => handleSearch(e.target.value)}
        style={{ width: '100%', marginBottom: '12px' }} />

      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(300px, 1fr))', gap: '12px' }}>
        {suppliers.map(s => {
          const balance = (s.totalPurchases || 0) - (s.totalPaid || 0)
          const hasDebt = balance > 0
          return (
            <div key={s._id} style={{
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
                    <rect x="1" y="3" width="15" height="13"/><polygon points="16 8 20 8 23 11 23 16 16 16 16 8"/>
                    <circle cx="5.5" cy="18.5" r="2.5"/><circle cx="18.5" cy="18.5" r="2.5"/>
                  </svg>
                </div>
                <div style={{ flex: 1 }}>
                  <div style={{ fontSize: '15px', fontWeight: 'bold', color: 'var(--text)' }}>{s.name}</div>
                  <div style={{ fontSize: '12px', color: 'var(--text2)' }}>{s.phone || 'لا يوجد هاتف'}</div>
                </div>
              </div>
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: '6px', background: 'var(--bg)', borderRadius: '10px', padding: '10px' }}>
                <div style={{ textAlign: 'center' }}>
                  <div style={{ fontSize: '10px', color: 'var(--text2)' }}>المشتريات</div>
                  <div style={{ fontSize: '14px', fontWeight: 'bold', color: 'var(--warning)' }}>{formatMoney(s.totalPurchases || 0)}</div>
                </div>
                <div style={{ textAlign: 'center' }}>
                  <div style={{ fontSize: '10px', color: 'var(--text2)' }}>المدفوع</div>
                  <div style={{ fontSize: '14px', fontWeight: 'bold', color: 'var(--success)' }}>{formatMoney(s.totalPaid || 0)}</div>
                </div>
                <div style={{ textAlign: 'center' }}>
                  <div style={{ fontSize: '10px', color: 'var(--text2)' }}>المتبقي</div>
                  <div style={{ fontSize: '14px', fontWeight: 'bold', color: hasDebt ? 'var(--danger)' : 'var(--success)' }}>{formatMoney(balance)}</div>
                </div>
              </div>
              {s.notes && <div style={{ fontSize: '12px', color: 'var(--text2)', background: 'var(--bg)', borderRadius: '8px', padding: '8px', lineHeight: 1.5 }}>ملاحظات: {s.notes}</div>}
              <div style={{ display: 'flex', gap: '4px', justifyContent: 'center' }}>
                {canPay && <button onClick={() => openPay(s)} title="تسديد" style={iconBtn('success')}><PaymentIcon size={13} /></button>}
                <button onClick={() => openTransactions(s)} title="كشف حساب" style={iconBtn('accent')}><ViewIcon size={13} /></button>
                {canManage && <button onClick={() => openEdit(s)} title="تعديل" style={iconBtn('warning')}><EditIcon size={13} /></button>}
                {canManage && <button onClick={() => handleRemove(s._id)} title="حذف" style={iconBtn('danger')}><DeleteIcon size={13} /></button>}
              </div>
            </div>
          )
        })}
        {suppliers.length === 0 && (
          <div style={{ gridColumn: '1 / -1', padding: '32px', color: 'var(--text2)', textAlign: 'center' }}>لا يوجد موردين</div>
        )}
      </div>
      <Pagination page={page} totalPages={totalPages} total={total} pageSize={pageSize} onChange={setPage} />

      <Modal open={showModal} onClose={() => setShowModal(false)} title={edit ? 'تعديل مورد' : 'إضافة مورد'} width="450px">
        <form onSubmit={handleSave} style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
          <input placeholder="الاسم *" value={form.name} onInput={e => setForm(f => ({ ...f, name: e.target.value }))} required />
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '10px' }}>
            <input placeholder="رقم الهاتف *" value={form.phone} onInput={e => setForm(f => ({ ...f, phone: e.target.value }))} required />
            <input placeholder="البريد الإلكتروني" type="email" value={form.email} onInput={e => setForm(f => ({ ...f, email: e.target.value }))} />
          </div>
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '10px' }}>
            <input placeholder="رقم السجل التجاري" value={form.commercialReg} onInput={e => setForm(f => ({ ...f, commercialReg: e.target.value }))} />
            <input placeholder="رقم السجل الضريبي" value={form.taxReg} onInput={e => setForm(f => ({ ...f, taxReg: e.target.value }))} />
          </div>
          <input placeholder="العنوان" value={form.address} onInput={e => setForm(f => ({ ...f, address: e.target.value }))} />
          {!edit && <input type="number" step="any" placeholder="مبلغ مستحق سابق (مشتريات)" value={form.previousBalance || ''} onInput={e => setForm(f => ({ ...f, previousBalance: e.target.value }))}
            style={{ background: 'var(--bg)', color: 'var(--text)', border: '1px solid var(--bg3)', borderRadius: '8px', padding: '8px' }} />}
          <textarea placeholder="ملاحظات" value={form.notes} onInput={e => setForm(f => ({ ...f, notes: e.target.value }))} rows="3"
            style={{ background: 'var(--bg)', color: 'var(--text)', border: '1px solid var(--bg3)', borderRadius: '8px', padding: '8px', resize: 'vertical' }} />
          <button type="submit" style={modalPrimaryBtn}><CheckIcon size={16} /> {edit ? 'تحديث' : 'إضافة'}</button>
        </form>
      </Modal>

      <Modal open={!!payModal} onClose={() => setPayModal(null)} title={`تسديد للمورد: ${payModal?.name}`} width="380px">
        <form onSubmit={handlePay} style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
          <div style={{ textAlign: 'center', marginBottom: '8px' }}>
            <div style={{ fontSize: '13px', color: 'var(--text2)' }}>إجمالي المشتريات: <span style={{ color: 'var(--warning)' }}>{(payModal?.totalPurchases || 0).toFixed(2)}</span></div>
            <div style={{ fontSize: '13px', color: 'var(--text2)' }}>المدفوع سابقاً: <span style={{ color: 'var(--success)' }}>{(payModal?.totalPaid || 0).toFixed(2)}</span></div>
            {(() => { const r = (payModal?.totalPurchases || 0) - (payModal?.totalPaid || 0); return <div style={{ fontSize: '13px', color: 'var(--text2)' }}>{r > 0 ? 'دين مستحق للمورد' : r < 0 ? 'رصيد مستحق من المورد' : 'المتبقي'}: <span style={{ color: r > 0 ? 'var(--danger)' : 'var(--success)', fontWeight: 'bold' }}>{Math.abs(r).toFixed(2)}</span></div> })()}
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
          {activeShift && (
            <div style={{ display: 'flex', gap: '8px' }}>
              <button type="button" onClick={() => setPaySource('treasury')} style={{
                flex: 1, padding: '8px', borderRadius: '8px', fontSize: '12px',
                background: paySource === 'treasury' ? 'var(--accent)' : 'var(--bg3)',
                color: paySource === 'treasury' ? '#fff' : 'var(--text)', fontWeight: paySource === 'treasury' ? '700' : '500'
              }}>من الخزنة</button>
              <button type="button" onClick={() => setPaySource('shift')} style={{
                flex: 1, padding: '8px', borderRadius: '8px', fontSize: '12px',
                background: paySource === 'shift' ? 'var(--warning)' : 'var(--bg3)',
                color: paySource === 'shift' ? '#fff' : 'var(--text)', fontWeight: paySource === 'shift' ? '700' : '500'
              }}>من الوردية</button>
            </div>
          )}
          <input type="number" step="any" placeholder="المبلغ" value={payAmount} onInput={e => setPayAmount(e.target.value)} required
            style={{ background: 'var(--bg)', color: 'var(--text)', border: '1px solid var(--bg3)', borderRadius: '8px', padding: '8px' }} />
          <textarea placeholder="ملاحظات (اختياري)" value={payNote} onInput={e => setPayNote(e.target.value)} rows="2"
            style={{ background: 'var(--bg)', color: 'var(--text)', border: '1px solid var(--bg3)', borderRadius: '8px', padding: '8px', resize: 'vertical' }} />
          <button type="submit" style={modalSuccessBtn}><CheckIcon size={16} /> تسديد</button>
        </form>
      </Modal>

      <Modal open={!!transModal} onClose={() => setTransModal(null)} title={`عمليات المورد: ${transModal?.name}`} width="500px">
        <div style={{ fontSize: '13px', color: 'var(--text2)', textAlign: 'center', marginBottom: '8px' }}>
          {(() => { const b = transactions.length > 0 ? transactions[transactions.length - 1]?.balance : 0; return b > 0 ? 'دين مستحق للمورد' : b < 0 ? 'رصيد مستحق من المورد' : 'الرصيد الحالي' })()}: <span style={{ color: transactions.length > 0 ? (transactions[transactions.length - 1]?.balance > 0 ? 'var(--danger)' : 'var(--success)') : 'var(--text2)', fontWeight: 'bold' }}>
            {transactions.length > 0 ? Math.abs(transactions[transactions.length - 1]?.balance)?.toFixed(2) : '0.00'}
          </span>
        </div>
        <div id="supplier-print">
          <div style={{ background: 'var(--bg)', borderRadius: '8px', overflow: 'auto', maxHeight: '400px' }}>
            <table>
              <thead><tr><th>البيان</th><th>المبلغ</th><th>الرصيد</th><th>نوع الدفع</th><th>التاريخ</th></tr></thead>
              <tbody>
                {transactions.map((t, i) => (
                  <tr key={i}>
                    <td style={{ fontSize: '12px' }}>{t.desc}</td>
                    <td style={{ color: t.amount > 0 ? 'var(--warning)' : 'var(--success)', fontSize: '12px' }}>{Math.abs(t.amount).toFixed(2)}</td>
                    <td style={{ color: t.balance > 0 ? 'var(--danger)' : 'var(--success)', fontWeight: 'bold', fontSize: '12px' }}>{t.balance.toFixed(2)}</td>
                    <td style={{ fontSize: '11px', color: 'var(--text2)' }}>{t.paymentMethod === 'credit' ? 'آجل' : t.paymentMethod === 'card' ? 'بطاقة' : t.paymentMethod ? 'نقداً' : '-'}</td>
                    <td style={{ fontSize: '11px', color: 'var(--text2)' }}>{formatDate(t.date)}</td>
                  </tr>
                ))}
                {transactions.length === 0 && <tr><td colSpan="5" style={{ padding: '16px', color: 'var(--text2)', textAlign: 'center' }}>لا توجد عمليات</td></tr>}
              </tbody>
            </table>
          </div>
        </div>
        <div style={{ display: 'flex', gap: '8px', marginTop: '12px' }}>
          <button onClick={async () => { try { const isA4 = settings?.printDefaultSize === 'a4'; const template = isA4 ? <StatementA4 type="supplier" party={transModal} transactions={transactions} settings={settings} /> : <StatementThermal type="supplier" party={transModal} transactions={transactions} settings={settings} />; if (isA4) await printA4(template); else await printThermal(template) } catch (err) { toast('فشلت الطباعة: ' + err.message, 'error') } }} style={{ ...printBtn }}><PrintIcon size={16} /> طباعة</button>
        </div>
      </Modal>
      <ConfirmDialog />
    </div>
  )
}