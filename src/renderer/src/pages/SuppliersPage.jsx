import { useState, useEffect, useMemo } from 'preact/hooks'
import api from '../api'
import Modal from '../components/Modal'
import { useToast } from '../components/Toast'
import { useStore } from '../store'
import { formatDate } from '../utils/date'
import { useConfirm } from '../components/ConfirmModal'
import StatementA4 from '../components/StatementA4'
import { printA4 } from '../utils/print'

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
  const [transModal, setTransModal] = useState(null)
  const [transactions, setTransactions] = useState([])
  const [search, setSearch] = useState('')
  const [settings, setSettings] = useState(null)

  useEffect(() => { load() }, [])

  async function load() {
    const token = localStorage.getItem('token')
    const [sup, pur, sett] = await Promise.all([api.listSuppliers(token), api.listPurchases(token), api.getSettings(token)])
    setSuppliers(sup); setPurchases(pur); setSettings(sett)
  }

  function openEdit(s) {
    setEdit(s); setForm({ name: s.name, phone: s.phone || '', email: s.email || '', commercialReg: s.commercialReg || '', taxReg: s.taxReg || '', address: s.address || '', notes: s.notes || '', previousBalance: '' }); setShowModal(true)
  }

  async function handleSave(e) {
    e.preventDefault()
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
    setPayModal(s); setPayAmount(''); setPayNote('')
  }

  async function handlePay(e) {
    e.preventDefault()
    const token = localStorage.getItem('token')
    try {
      await api.createSupplierPayment(token, { supplierId: payModal._id, supplierName: payModal.name, amount: Number(payAmount), note: payNote, paymentMethod: payMethod })
      toast('تمت إضافة الدفعة', 'success')
      setPayModal(null); load(); window.dispatchEvent(new Event('dataChanged'))
    } catch (err) { toast(err.message, 'error') }
  }

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

  const filteredSuppliers = useMemo(() => suppliers.filter(s =>
    !search || s.name.includes(search) || s.phone?.includes(search)
  ), [suppliers, search])

  return (
    <div style={{ padding: '20px', overflow: 'auto', height: '100%' }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '16px' }}>
        <h1 style={{ fontSize: '20px' }}>الموردين</h1>
        {canManage && <button onClick={() => { setEdit(null); setForm({ name: '', phone: '', email: '', commercialReg: '', taxReg: '', address: '', notes: '', previousBalance: '' }); setShowModal(true) }}
          style={{ background: 'var(--accent)', color: '#fff', padding: '8px 16px', borderRadius: '8px', fontSize: '13px' }}>+ إضافة مورد</button>}
      </div>

      <input placeholder="بحث باسم المورد أو رقم الهاتف..." value={search} onInput={e => setSearch(e.target.value)}
        style={{ width: '100%', marginBottom: '12px' }} />

      <div style={{ background: 'var(--bg2)', borderRadius: '12px', overflow: 'auto' }}>
        <table>
          <thead><tr><th>الاسم</th><th>الهاتف</th><th>المشتريات</th><th>المدفوع</th><th>الباقي</th><th></th></tr></thead>
          <tbody>
            {filteredSuppliers.map(s => {
              const balance = (s.totalPurchases || 0) - (s.totalPaid || 0)
              return (
                <tr key={s._id}>
                  <td style={{ fontWeight: 'bold' }}>{s.name}</td>
                  <td style={{ fontSize: '12px', color: 'var(--text2)' }}>{s.phone || '-'}</td>
                  <td style={{ color: '#f97316' }}>{(s.totalPurchases || 0).toFixed(2)}</td>
                  <td style={{ color: 'var(--success)' }}>{(s.totalPaid || 0).toFixed(2)}</td>
                  <td style={{ color: balance > 0 ? 'var(--danger)' : 'var(--success)', fontWeight: 'bold' }}>{balance.toFixed(2)}</td>
                  <td>
                    <div style={{ display: 'flex', gap: '4px' }}>
                      {canPay && <button onClick={() => openPay(s)} style={{ background: 'var(--bg3)', color: 'var(--success)', padding: '4px 10px', borderRadius: '4px', fontSize: '11px' }}>تسديد</button>}
                      <button onClick={() => openTransactions(s)} style={{ background: 'var(--bg3)', color: 'var(--accent)', padding: '4px 10px', borderRadius: '4px', fontSize: '11px' }}>كشف حساب</button>
                      {canManage && <button onClick={() => openEdit(s)} style={{ background: 'var(--bg3)', color: 'var(--warning)', padding: '4px 10px', borderRadius: '4px', fontSize: '11px' }}>تعديل</button>}
                      {canManage && <button onClick={() => handleRemove(s._id)} style={{ background: 'var(--bg3)', color: 'var(--danger)', padding: '4px 10px', borderRadius: '4px', fontSize: '11px' }}>حذف</button>}
                    </div>
                  </td>
                </tr>
              )
            })}
            {filteredSuppliers.length === 0 && <tr><td colSpan="6" style={{ padding: '24px', color: 'var(--text2)', textAlign: 'center' }}>لا يوجد موردين</td></tr>}
          </tbody>
        </table>
      </div>

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
          {!edit && <input type="number" placeholder="مبلغ مستحق سابق (مشتريات)" value={form.previousBalance || ''} onInput={e => setForm(f => ({ ...f, previousBalance: e.target.value }))}
            style={{ background: 'var(--bg)', color: 'var(--text)', border: '1px solid var(--bg3)', borderRadius: '8px', padding: '8px' }} />}
          <textarea placeholder="ملاحظات" value={form.notes} onInput={e => setForm(f => ({ ...f, notes: e.target.value }))} rows="3"
            style={{ background: 'var(--bg)', color: 'var(--text)', border: '1px solid var(--bg3)', borderRadius: '8px', padding: '8px', resize: 'vertical' }} />
          <button type="submit" style={{ background: 'var(--accent)', color: '#fff', padding: '10px', borderRadius: '8px', fontSize: '14px' }}>
            {edit ? 'تحديث' : 'إضافة'}
          </button>
        </form>
      </Modal>

      <Modal open={!!payModal} onClose={() => setPayModal(null)} title={`تسديد للمورد: ${payModal?.name}`} width="380px">
        <form onSubmit={handlePay} style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
          <div style={{ textAlign: 'center', marginBottom: '8px' }}>
            <div style={{ fontSize: '13px', color: 'var(--text2)' }}>إجمالي المشتريات: <span style={{ color: '#f97316' }}>{(payModal?.totalPurchases || 0).toFixed(2)}</span></div>
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
              background: payMethod === 'card' ? '#3b82f6' : 'var(--bg3)',
              color: payMethod === 'card' ? '#fff' : 'var(--text)', fontWeight: payMethod === 'card' ? '700' : '500'
            }}>بطاقة</button>
          </div>
          <input type="number" placeholder="المبلغ" value={payAmount} onInput={e => setPayAmount(e.target.value)} required
            style={{ background: 'var(--bg)', color: 'var(--text)', border: '1px solid var(--bg3)', borderRadius: '8px', padding: '8px' }} />
          <textarea placeholder="ملاحظات (اختياري)" value={payNote} onInput={e => setPayNote(e.target.value)} rows="2"
            style={{ background: 'var(--bg)', color: 'var(--text)', border: '1px solid var(--bg3)', borderRadius: '8px', padding: '8px', resize: 'vertical' }} />
          <button type="submit" style={{ background: 'var(--success)', color: '#fff', padding: '10px', borderRadius: '8px', fontSize: '14px' }}>تسديد</button>
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
                    <td style={{ color: t.amount > 0 ? '#f97316' : 'var(--success)', fontSize: '12px' }}>{Math.abs(t.amount).toFixed(2)}</td>
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
        <button onClick={() => printA4(<StatementA4 type="supplier" party={transModal} transactions={transactions} settings={settings} />)} style={{ marginTop: '12px', background: 'var(--accent)', color: '#fff', padding: '10px 24px', borderRadius: '8px', fontSize: '13px', fontWeight: 'bold', width: '100%' }}>
          طباعة كشف حساب
        </button>
      </Modal>
      <ConfirmDialog />
    </div>
  )
}