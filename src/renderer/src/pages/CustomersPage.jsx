import { useState, useEffect } from 'preact/hooks'
import api from '../api'
import Modal from '../components/Modal'
import { useToast } from '../components/Toast'
import { useStore } from '../store'
import { formatDate } from '../utils/date'
import { formatMoney } from '../utils/money'
import { useConfirm } from '../components/ConfirmModal'
import StatementA4 from '../components/StatementA4'
import { printA4 } from '../utils/print'

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
  const [form, setForm] = useState({ name: '', phone: '', notes: '', previousDebt: '' })
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
    const [cust, s, sett] = await Promise.all([api.listCustomers(token), api.listSales(token), api.getSettings(token)])
    setCustomers(cust); setSales(s); setSettings(sett)
  }

  function openEdit(c) {
    setEdit(c); setForm({ name: c.name, phone: c.phone || '', notes: c.notes || '', previousDebt: '' }); setShowModal(true)
  }

  async function handleSave(e) {
    e.preventDefault()
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

  async function openTransactions(c) {
    const token = localStorage.getItem('token')
    const creditSales = sales.filter(s => s.customerName === c.name && s.paymentMethod === 'credit').map(s => ({
      type: 'فاتورة آجلة', desc: `فاتورة #${s.invoiceNo}`, amount: s.total, date: s.createdAt
    }))
    const pays = await api.listCustomerPayments(token, c._id)
    const pymts = pays.map(p => ({ type: 'دفعة', desc: p.note || 'دفعة', amount: -p.amount, date: p.createdAt }))
    const all = [...creditSales, ...pymts].sort((a, b) => new Date(a.date) - new Date(b.date))
    let bal = 0
    setTransactions(all.map(t => { bal += t.amount; return { ...t, balance: bal } }))
    setTransModal(c)
  }

  const filteredCustomers = customers.filter(c =>
    !search || c.name.includes(search) || c.phone?.includes(search)
  )

  return (
    <div style={{ padding: '20px', overflow: 'auto', height: '100vh' }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '16px' }}>
        <h1 style={{ fontSize: '20px' }}>عملاء آجل</h1>
        {canManage && <button onClick={() => { setEdit(null); setForm({ name: '', phone: '', notes: '', previousDebt: '' }); setShowModal(true) }}
          style={{ background: 'var(--accent)', color: '#fff', padding: '8px 16px', borderRadius: '8px', fontSize: '13px' }}>+ إضافة عميل</button>}
      </div>

      <input placeholder="بحث باسم العميل أو رقم الهاتف..." value={search} onInput={e => setSearch(e.target.value)}
        style={{ width: '100%', marginBottom: '12px' }} />

      <div style={{ background: 'var(--bg2)', borderRadius: '12px', overflow: 'auto' }}>
        <table>
          <thead><tr><th>الاسم</th><th>الهاتف</th><th>إجمالي الدين</th><th>المدفوع</th><th>المتبقي</th><th></th></tr></thead>
          <tbody>
            {filteredCustomers.map(c => {
              const remaining = (c.totalDebt || 0) - (c.totalPaid || 0)
              return (
                <tr key={c._id}>
                  <td style={{ fontWeight: 'bold' }}>{c.name}</td>
                  <td style={{ fontSize: '12px', color: 'var(--text2)' }}>{c.phone || '-'}</td>
                  <td style={{ color: 'var(--danger)' }}>{(c.totalDebt || 0).toFixed(2)}</td>
                  <td style={{ color: 'var(--success)' }}>{(c.totalPaid || 0).toFixed(2)}</td>
                  <td style={{ color: remaining > 0 ? 'var(--danger)' : 'var(--success)', fontWeight: 'bold' }}>{remaining.toFixed(2)}</td>
                  <td>
                    <div style={{ display: 'flex', gap: '4px' }}>
                      {canPay && <button onClick={() => openPay(c)} style={{ background: 'var(--bg3)', color: 'var(--success)', padding: '4px 10px', borderRadius: '4px', fontSize: '11px' }}>تسديد</button>}
                      <button onClick={() => openTransactions(c)} style={{ background: 'var(--bg3)', color: 'var(--accent)', padding: '4px 10px', borderRadius: '4px', fontSize: '11px' }}>كشف حساب</button>
                      {canManage && <button onClick={() => openEdit(c)} style={{ background: 'var(--bg3)', color: 'var(--warning)', padding: '4px 10px', borderRadius: '4px', fontSize: '11px' }}>تعديل</button>}
                      {canManage && <button onClick={() => handleRemove(c._id)} style={{ background: 'var(--bg3)', color: 'var(--danger)', padding: '4px 10px', borderRadius: '4px', fontSize: '11px' }}>حذف</button>}
                    </div>
                  </td>
                </tr>
              )
            })}
            {filteredCustomers.length === 0 && <tr><td colSpan="6" style={{ padding: '24px', color: '#475569', textAlign: 'center' }}>لا يوجد عملاء</td></tr>}
          </tbody>
        </table>
      </div>

      <Modal open={showModal} onClose={() => setShowModal(false)} title={edit ? 'تعديل عميل' : 'إضافة عميل'}>
        <form onSubmit={handleSave} style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
          <input placeholder="الاسم" value={form.name} onInput={e => setForm(f => ({ ...f, name: e.target.value }))} required />
          <input placeholder="رقم الهاتف" value={form.phone} onInput={e => setForm(f => ({ ...f, phone: e.target.value }))} />
          {!edit && <input type="number" placeholder="مبلغ مستحق سابق (دين)" value={form.previousDebt || ''} onInput={e => setForm(f => ({ ...f, previousDebt: e.target.value }))}
            style={{ background: 'var(--bg)', color: 'var(--text)', border: '1px solid var(--bg3)', borderRadius: '8px', padding: '8px' }} />}
          <textarea placeholder="ملاحظات" value={form.notes} onInput={e => setForm(f => ({ ...f, notes: e.target.value }))} rows="3"
            style={{ background: 'var(--bg)', color: 'var(--text)', border: '1px solid var(--bg3)', borderRadius: '8px', padding: '8px', resize: 'vertical' }} />
          <button type="submit" style={{ background: 'var(--accent)', color: '#fff', padding: '10px', borderRadius: '8px', fontSize: '14px' }}>
            {edit ? 'تحديث' : 'إضافة'}
          </button>
        </form>
      </Modal>

      <Modal open={!!payModal} onClose={() => setPayModal(null)} title={`تسديد من العميل: ${payModal?.name}`} width="380px">
        <form onSubmit={handlePay} style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
          <div style={{ textAlign: 'center', marginBottom: '8px' }}>
            <div style={{ fontSize: '13px', color: 'var(--text2)' }}>إجمالي الدين: <span style={{ color: 'var(--danger)' }}>{(payModal?.totalDebt || 0).toFixed(2)}</span></div>
            <div style={{ fontSize: '13px', color: 'var(--text2)' }}>المدفوع سابقاً: <span style={{ color: 'var(--success)' }}>{(payModal?.totalPaid || 0).toFixed(2)}</span></div>
            <div style={{ fontSize: '13px', color: 'var(--text2)', marginBottom: '8px' }}>المتبقي: <span style={{ color: 'var(--danger)', fontWeight: 'bold' }}>{((payModal?.totalDebt || 0) - (payModal?.totalPaid || 0)).toFixed(2)}</span></div>
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

      <Modal open={!!transModal} onClose={() => setTransModal(null)} title={`عمليات العميل: ${transModal?.name}`} width="500px">
        <div style={{ fontSize: '13px', color: 'var(--text2)', textAlign: 'center', marginBottom: '8px' }}>
          الرصيد الحالي: <span style={{ color: transactions.length > 0 ? (transactions[transactions.length - 1]?.balance > 0 ? 'var(--danger)' : 'var(--success)') : 'var(--text2)', fontWeight: 'bold' }}>
            {transactions.length > 0 ? transactions[transactions.length - 1]?.balance?.toFixed(2) : '0.00'}
          </span>
        </div>
        <div id="customer-print">
          <div style={{ background: 'var(--bg)', borderRadius: '8px', overflow: 'auto', maxHeight: '400px' }}>
            <table>
              <thead><tr><th>البيان</th><th>المبلغ</th><th>الرصيد</th><th>التاريخ</th></tr></thead>
              <tbody>
                {transactions.map((t, i) => (
                  <tr key={i}>
                    <td style={{ fontSize: '12px' }}>{t.desc}</td>
                    <td style={{ color: t.amount > 0 ? 'var(--danger)' : 'var(--success)', fontSize: '12px' }}>{Math.abs(t.amount).toFixed(2)}</td>
                    <td style={{ color: t.balance > 0 ? 'var(--danger)' : 'var(--success)', fontWeight: 'bold', fontSize: '12px' }}>{t.balance.toFixed(2)}</td>
                    <td style={{ fontSize: '11px', color: 'var(--text2)' }}>{formatDate(t.date)}</td>
                  </tr>
                ))}
                {transactions.length === 0 && <tr><td colSpan="4" style={{ padding: '16px', color: '#475569', textAlign: 'center' }}>لا توجد عمليات</td></tr>}
              </tbody>
            </table>
          </div>
        </div>
        <button onClick={() => printA4(<StatementA4 type="customer" party={transModal} transactions={transactions} settings={settings} />)} style={{ marginTop: '12px', background: 'var(--accent)', color: '#fff', padding: '10px 24px', borderRadius: '8px', fontSize: '13px', fontWeight: 'bold', width: '100%' }}>
          طباعة كشف حساب
        </button>
      </Modal>
      <ConfirmDialog />
    </div>
  )
}