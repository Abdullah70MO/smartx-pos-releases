import { useState, useEffect } from 'preact/hooks'
import api from '../api'
import Modal from '../components/Modal'
import { useToast } from '../components/Toast'
import { formatMoney } from '../utils/money'
import { useStore } from '../store'
import { formatDate } from '../utils/date'
import { useConfirm } from '../components/ConfirmModal'

export default function ExpensesPage() {
  const { user } = useStore()
  const toast = useToast()
  const { confirm, ConfirmDialog } = useConfirm()
  const canManage = user?.permissions?.includes('expenses.manage')
  const [expenses, setExpenses] = useState([])
  const [showModal, setShowModal] = useState(false)
  const [edit, setEdit] = useState(null)
  const [form, setForm] = useState({ amount: 0, category: '', note: '', date: new Date().toISOString().slice(0, 10), paymentMethod: 'cash' })

  useEffect(() => { load() }, [])

  async function load() {
    const token = localStorage.getItem('token')
    const data = await api.listExpenses(token)
    setExpenses(data)
  }

  function openEdit(exp) {
    setEdit(exp)
    setForm({
      amount: exp.amount, category: exp.category || '',
      note: exp.note || '', date: new Date(exp.date || exp.createdAt).toISOString().slice(0, 10),
      paymentMethod: exp.paymentMethod || 'cash'
    })
    setShowModal(true)
  }

  async function handleSave(e) {
    e.preventDefault()
    const token = localStorage.getItem('token')
    try {
      await api.saveExpense(token, { ...form, _id: edit?._id })
      toast(edit ? 'تم تحديث المصروف' : 'تمت إضافة المصروف', 'success')
      setShowModal(false); load()
    } catch (err) { toast(err.message, 'error') }
  }

  async function handleRemove(id) {
    if (!await confirm('حذف هذا المصروف؟')) return
    const token = localStorage.getItem('token')
    try {
      await api.removeExpense(token, id)
      toast('تم الحذف', 'success'); load()
    } catch (err) { toast(err.message, 'error') }
  }

  const categories = [...new Set(expenses.map(e => e.category).filter(Boolean))]
  const total = expenses.reduce((s, e) => s + e.amount, 0)

  const pmLabel = { cash: 'نقداً', card: 'بطاقة' }

  return (
    <div style={{ padding: '20px', overflow: 'auto', height: '100%' }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '16px' }}>
        <h1 style={{ fontSize: '20px' }}>المصروفات</h1>
        <div style={{ display: 'flex', gap: '12px', alignItems: 'center' }}>
          <span style={{ color: 'var(--danger)', fontSize: '15px', fontWeight: 'bold' }}>الإجمالي: {formatMoney(total)}</span>
          {canManage && <button onClick={() => { setEdit(null); setForm({ amount: 0, category: '', note: '', date: new Date().toISOString().slice(0, 10), paymentMethod: 'cash' }); setShowModal(true) }}
            style={{ background: 'var(--accent)', color: '#fff', padding: '8px 16px', borderRadius: '8px', fontSize: '13px' }}>+ إضافة مصروف</button>}
        </div>
      </div>

      <div className="table-card">
        <table>
          <thead><tr><th>التاريخ</th><th>التصنيف</th><th>المبلغ</th><th>طريقة الدفع</th><th>البيان</th><th></th></tr></thead>
          <tbody>
            {expenses.map(e => (
              <tr key={e._id}>
                <td style={{ fontSize: '12px', color: 'var(--text2)' }}>{formatDate(e.date || e.createdAt)}</td>
                <td>{e.category || '-'}</td>
                <td style={{ color: 'var(--danger)', fontWeight: 'bold' }}>{formatMoney(e.amount)}</td>
                <td style={{ fontSize: '12px', color: 'var(--text2)' }}>{pmLabel[e.paymentMethod] || e.paymentMethod || 'نقداً'}</td>
                <td style={{ fontSize: '12px', color: 'var(--text2)' }}>{e.note || '-'}</td>
                <td>
                  {canManage && <button onClick={() => openEdit(e)} style={{ background: 'var(--bg3)', color: 'var(--accent)', padding: '4px 10px', borderRadius: '4px', fontSize: '11px', marginLeft: '4px' }}>تعديل</button>}
                  {canManage && <button onClick={() => handleRemove(e._id)} style={{ background: 'var(--bg3)', color: 'var(--danger)', padding: '4px 10px', borderRadius: '4px', fontSize: '11px' }}>حذف</button>}
                </td>
              </tr>
            ))}
            {expenses.length === 0 && <tr><td colSpan="6" style={{ padding: '24px', color: 'var(--text2)', textAlign: 'center' }}>لا توجد مصروفات</td></tr>}
          </tbody>
        </table>
      </div>

      <Modal open={showModal} onClose={() => setShowModal(false)} title={edit ? 'تعديل مصروف' : 'إضافة مصروف'}>
        <form onSubmit={handleSave} style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
          <input type="number" placeholder="المبلغ" value={form.amount || ''} onInput={e => setForm(f => ({ ...f, amount: Number(e.target.value) }))} required />
          <input list="exp-cat-list" placeholder="التصنيف" value={form.category} onInput={e => setForm(f => ({ ...f, category: e.target.value }))} />
          <datalist id="exp-cat-list">{categories.map(c => <option key={c} value={c} />)}</datalist>
          <select value={form.paymentMethod} onChange={e => setForm(f => ({ ...f, paymentMethod: e.target.value }))}
            style={{ background: 'var(--bg)', color: 'var(--text)', border: '1px solid var(--bg3)', borderRadius: '8px', padding: '10px' }}>
            <option value="cash">نقداً</option>
            <option value="card">بطاقة</option>
          </select>
          <input type="date" value={form.date} onInput={e => setForm(f => ({ ...f, date: e.target.value }))} />
          <textarea placeholder="البيان" value={form.note} onInput={e => setForm(f => ({ ...f, note: e.target.value }))} rows="3"
            style={{ background: 'var(--bg)', color: 'var(--text)', border: '1px solid var(--bg3)', borderRadius: '8px', padding: '8px', resize: 'vertical' }} />
          <button type="submit" style={{ background: 'var(--accent)', color: '#fff', padding: '10px', borderRadius: '8px', fontSize: '14px' }}>
            {edit ? 'تحديث' : 'إضافة'}
          </button>
        </form>
      </Modal>
      <ConfirmDialog />
    </div>
  )
}