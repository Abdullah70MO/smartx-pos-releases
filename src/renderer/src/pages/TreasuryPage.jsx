import { useState, useEffect } from 'preact/hooks'
import api from '../api'
import Modal from '../components/Modal'
import { useToast } from '../components/Toast'
import { useStore } from '../store'
import { formatMoney } from '../utils/money'
import { formatDate } from '../utils/date'
import { useConfirm } from '../components/ConfirmModal'
import { iconBtn, headerBtn, modalPrimaryBtn, modalSuccessBtn, modalWarningBtn, modalDangerBtn, secondaryBtn, EditIcon, DeleteIcon, AddIcon, CheckIcon, WithdrawIcon, PaymentIcon } from '../components/ActionIcons'

export default function TreasuryPage() {
  const { user } = useStore()
  const toast = useToast()
  const { confirm, ConfirmDialog } = useConfirm()
  const [treasuries, setTreasuries] = useState([])
  const [transactions, setTransactions] = useState([])
  const [activeTreasury, setActiveTreasury] = useState(null)
  const [showModal, setShowModal] = useState(null)
  const [form, setForm] = useState({ name: '', type: 'main', initialBalance: '', withdrawCategory: '', paymentMethod: 'cash' })
  const [editTreasury, setEditTreasury] = useState(null)
  const [withdrawCategories, setWithdrawCategories] = useState([])
  const [searchTx, setSearchTx] = useState({ q: '', dateFrom: '', dateTo: '' })

  useEffect(() => {
    async function loadCats() {
      const token = localStorage.getItem('token')
      try {
        const exps = await api.listExpenses(token)
        const cats = [...new Set(exps.filter(e => e.category).map(e => e.category))]
        if (!cats.includes('سحب تشغيلي')) cats.unshift('سحب تشغيلي')
        setWithdrawCategories(cats)
      } catch {}
    }
    loadCats()
  }, [])

  const canManage = user?.permissions?.includes('treasury.manage')
  const canTransfer = user?.permissions?.includes('treasury.transfer')

  useEffect(() => { load() }, [])

  async function load() {
    const token = localStorage.getItem('token')
    try {
      const data = await api.listTreasuries(token)
      setTreasuries(data || [])
      if (data?.length > 0) setActiveTreasury(data[0]._id)
    } catch {}
  }

  async function loadTransactions(treasuryId) {
    const token = localStorage.getItem('token')
    try {
      setTransactions(await api.listTreasuryTransactions(token, treasuryId, 100))
    } catch {}
  }

  useEffect(() => { if (activeTreasury) loadTransactions(activeTreasury) }, [activeTreasury])

  async function handleSaveTreasury(e) {
    e.preventDefault()
    const token = localStorage.getItem('token')
    try {
      await api.saveTreasury(token, { ...form, _id: editTreasury?._id })
      toast(editTreasury ? 'تم تحديث الخزينة' : 'تمت إضافة الخزينة', 'success')
      setShowModal(null); setEditTreasury(null); load()
    } catch (err) { toast(err.message, 'error') }
  }

  async function handleRemoveTreasury(id) {
    if (!await confirm('حذف هذه الخزينة؟ سيتم حذف جميع الحركات المرتبطة بها.')) return
    const token = localStorage.getItem('token')
    try {
      await api.removeTreasury(token, id)
      toast('تم حذف الخزينة', 'success')
      load()
    } catch (err) { toast(err.message, 'error') }
  }

  const currentTreasury = treasuries.find(t => t._id === activeTreasury)

  const typeLabels = { main: 'رئيسية', bank: 'بنك', wallet: 'محفظة' }
  const typeColors = { main: 'var(--success)', bank: 'var(--accent)', wallet: 'var(--warning)' }

  const filteredTransactions = transactions.filter(t => {
    if (searchTx.q && !(t.createdBy || '').includes(searchTx.q) && !(t.personName || '').includes(searchTx.q) && !(t.note || '').includes(searchTx.q)) return false
    if (searchTx.dateFrom && t.createdAt && t.createdAt.slice(0, 10) < searchTx.dateFrom) return false
    if (searchTx.dateTo && t.createdAt && t.createdAt.slice(0, 10) > searchTx.dateTo) return false
    return true
  })

  return (
    <div style={{ padding: '20px', overflow: 'auto', height: '100%' }}>
      {/* Header */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '16px', flexWrap: 'wrap', gap: '8px' }}>
        <h1 style={{ fontSize: '20px' }}>الخزينة</h1>
        {canManage && <button onClick={() => { setEditTreasury(null); setForm({ name: '', type: 'main', initialBalance: '' }); setShowModal('treasury') }}
          style={headerBtn}><AddIcon size={16} /> خزينة جديدة</button>}
      </div>

      {/* Treasury cards */}
      <div style={{ display: 'flex', gap: '10px', marginBottom: '16px', flexWrap: 'wrap' }}>
        {treasuries.map(t => (
          <div key={t._id} onClick={() => setActiveTreasury(t._id)}
            style={{
              flex: 1, minWidth: '180px', padding: '14px 16px', borderRadius: '14px', cursor: 'pointer',
              background: activeTreasury === t._id ? 'var(--accent-container)' : 'var(--bg2)',
              border: activeTreasury === t._id ? '2px solid var(--accent)' : '2px solid transparent',
              transition: 'all 0.2s'
            }}>
            <div style={{ fontSize: '12px', color: typeColors[t.type] || 'var(--text2)', fontWeight: '600', marginBottom: '4px' }}>
              {typeLabels[t.type] || t.type}
            </div>
            <div style={{ fontWeight: 'bold', fontSize: '14px', marginBottom: '4px' }}>{t.name}</div>
            <div style={{ fontSize: '18px', fontWeight: '800', color: 'var(--accent)' }}>{formatMoney(t.balance)}</div>
            {canManage && activeTreasury === t._id && (
              <div style={{ display: 'flex', gap: '4px', marginTop: '8px' }}>
                <button onClick={() => { setShowModal('add') }}
                  style={{ flex: 1, background: 'var(--success)', color: '#fff', padding: '4px 8px', borderRadius: '4px', fontSize: '10px', display: 'inline-flex', alignItems: 'center', gap: '3px', justifyContent: 'center' }}><PaymentIcon size={12} /> إضافة</button>
                <button onClick={() => { setForm(f => ({ ...f, amount: '', note: '', personName: '', withdrawCategory: '', paymentMethod: 'cash' })); setShowModal('withdraw') }}
                  style={{ flex: 1, background: 'var(--warning)', color: '#fff', padding: '4px 8px', borderRadius: '4px', fontSize: '10px', display: 'inline-flex', alignItems: 'center', gap: '3px', justifyContent: 'center' }}><WithdrawIcon size={12} /> سحب تشغيلي</button>
                <button onClick={() => { setForm(f => ({ ...f, amount: '', note: '', personName: '', paymentMethod: 'cash' })); setShowModal('personal') }}
                  style={{ flex: 1, background: 'var(--warning)', color: '#fff', padding: '4px 8px', borderRadius: '4px', fontSize: '10px', display: 'inline-flex', alignItems: 'center', gap: '3px', justifyContent: 'center' }}><WithdrawIcon size={12} /> سحب شخصي</button>
              </div>
            )}
          </div>
        ))}
        {treasuries.length === 0 && (
          <div style={{ width: '100%', padding: '24px', color: 'var(--text2)', textAlign: 'center' }}>
            لا توجد خزائن. أضف خزينة جديدة للبدء.
          </div>
        )}
      </div>

      {/* Transfer between treasuries */}
      {canTransfer && treasuries.length > 1 && (
        <button onClick={() => setShowModal('transfer')}
          style={{ marginBottom: '16px', background: 'var(--bg3)', color: 'var(--accent)', padding: '8px 16px', borderRadius: '8px', fontSize: '12px', fontWeight: '600' }}>
          تحويل بين الخزائن
        </button>
      )}

      {/* Transactions table */}
      {currentTreasury && (
        <>
          <div style={{ display: 'flex', gap: '8px', marginBottom: '8px', flexWrap: 'wrap', alignItems: 'center' }}>
            <h3 style={{ fontSize: '13px', color: 'var(--text2)' }}>
              آخر الحركات - {currentTreasury.name}
            </h3>
            <button onClick={() => loadTransactions(activeTreasury)}
              style={{ background: 'var(--bg3)', color: 'var(--accent)', padding: '4px 10px', borderRadius: '6px', fontSize: '11px', marginRight: 'auto' }}>تحديث</button>
          </div>
          <div style={{ display: 'flex', gap: '8px', marginBottom: '8px', flexWrap: 'wrap' }}>
            <input placeholder="بحث باسم المستخدم أو البيان..." value={searchTx.q}
              onInput={e => setSearchTx(s => ({ ...s, q: e.target.value }))}
              style={{ flex: 1, minWidth: '150px' }} />
            <input type="date" value={searchTx.dateFrom} onInput={e => setSearchTx(s => ({ ...s, dateFrom: e.target.value }))} style={{ width: '140px' }} />
            <input type="date" value={searchTx.dateTo} onInput={e => setSearchTx(s => ({ ...s, dateTo: e.target.value }))} style={{ width: '140px' }} />
          </div>
          <div className="table-card">
            <table>
              <thead><tr><th>التاريخ</th><th>النوع</th><th>المبلغ</th><th>البيان</th><th>الشخص</th><th>بواسطة</th></tr></thead>
              <tbody>
                {filteredTransactions.map(t => (
                  <tr key={t._id}>
                    <td style={{ fontSize: '11px', color: 'var(--text2)' }}>{formatDate(t.createdAt)}</td>
                    <td>
                      <span style={{
                        fontSize: '11px', padding: '2px 6px', borderRadius: '4px', fontWeight: '600',
                        background: t.type === 'personal_withdraw' ? 'rgba(234,179,8,0.15)' :
                          t.amount > 0 ? 'rgba(34,197,94,0.15)' : 'rgba(239,68,68,0.15)',
                        color: t.type === 'personal_withdraw' ? 'var(--warning)' :
                          t.amount > 0 ? 'var(--success)' : 'var(--danger)'
                      }}>
                        {({deposit:'إيداع',expense:'مصروف',personal_withdraw:'سحب شخصي',operational_withdraw:'سحب تشغيلي',sale:'مبيعات',settlement:'تسوية',customerPayment:'تسديد عميل',supplierPayment:'تسديد مورد',purchase:'مشتريات',purchaseReturn:'مرتجع مشتريات',return:'مرتجع بيع',advance:'سلفة',salary:'راتب',transfer_in:'تحويل وارد',transfer_out:'تحويل صادر'})[t.type] || t.type}
                      </span>
                    </td>
                    <td style={{ fontWeight: 'bold', color: t.amount > 0 ? 'var(--success)' : 'var(--danger)' }}>{formatMoney(t.amount)}</td>
                    <td style={{ fontSize: '12px', color: 'var(--text2)' }}>{t.note || '-'}</td>
                    <td style={{ fontSize: '12px', color: 'var(--text2)' }}>{t.personName || '-'}</td>
                    <td style={{ fontSize: '12px', color: 'var(--text2)' }}>{t.createdBy || '-'}</td>
                  </tr>
                ))}
                {filteredTransactions.length === 0 && <tr><td colSpan="6" style={{ padding: '24px', color: 'var(--text2)', textAlign: 'center' }}>لا توجد حركات</td></tr>}
              </tbody>
            </table>
          </div>
        </>
      )}

      {/* Add Treasury Modal */}
      <Modal open={showModal === 'treasury'} onClose={() => { setShowModal(null); setEditTreasury(null) }} title={editTreasury ? 'تعديل خزينة' : 'إضافة خزينة جديدة'}>
        <form onSubmit={handleSaveTreasury} style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
          <input placeholder="اسم الخزينة" value={form.name} onInput={e => setForm(f => ({ ...f, name: e.target.value }))} required />
          <div style={{ display: 'flex', gap: '6px' }}>
            {[{v:'main',l:'رئيسية'},{v:'bank',l:'بنك'},{v:'wallet',l:'محفظة'}].map(o => (
              <button key={o.v} type="button" onClick={() => setForm(f => ({ ...f, type: o.v }))}
                style={{
                  flex: 1, padding: '10px', borderRadius: '8px', fontSize: '13px', fontWeight: 'bold',
                  background: form.type === o.v
                    ? (o.v === 'main' ? 'var(--success)' : o.v === 'bank' ? 'var(--accent)' : 'var(--warning)')
                    : 'var(--bg3)',
                  color: form.type === o.v ? '#fff' : 'var(--text)'
                }}>
                {o.l}
              </button>
            ))}
          </div>
          {!editTreasury && <input type="number" step="any" placeholder="الرصيد الافتتاحي" value={form.initialBalance || ''} onInput={e => setForm(f => ({ ...f, initialBalance: e.target.value }))} />}
          <button type="submit" style={modalPrimaryBtn}><CheckIcon size={16} /> {editTreasury ? 'تحديث' : 'إضافة'}</button>
        </form>
      </Modal>

      {/* Add money modal */}
      <Modal open={showModal === 'add'} onClose={() => setShowModal(null)} title={`إضافة أموال إلى ${currentTreasury?.name}`}>
        <form onSubmit={async (e) => {
          e.preventDefault(); const token = localStorage.getItem('token')
          try {
            await api.addToTreasury(token, { treasuryId: activeTreasury, amount: Number(form.amount), note: form.note, paymentMethod: form.method, personName: form.personName })
            toast('تمت الإضافة', 'success'); setShowModal(null); load()
          } catch (err) { toast(err.message, 'error') }
        }} style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
          <input type="number" step="any" placeholder="المبلغ" value={form.amount || ''} onInput={e => setForm(f => ({ ...f, amount: e.target.value }))} required />
          <div style={{ display: 'flex', gap: '6px' }}>
            {[{v:'cash',l:'كاش'},{v:'bank_transfer',l:'تحويل بنكي'},{v:'from_owner',l:'من المالك'}].map(o => (
              <button key={o.v} type="button" onClick={() => setForm(f => ({ ...f, method: o.v }))}
                style={{
                  flex: 1, padding: '10px', borderRadius: '8px', fontSize: '13px', fontWeight: 'bold',
                  background: (form.method || 'cash') === o.v
                    ? (o.v === 'cash' ? 'var(--success)' : o.v === 'bank_transfer' ? 'var(--accent)' : 'var(--warning)')
                    : 'var(--bg3)',
                  color: (form.method || 'cash') === o.v ? '#fff' : 'var(--text)'
                }}>
                {o.l}
              </button>
            ))}
          </div>
          <input placeholder="اسم الشخص (اختياري)" value={form.personName || ''} onInput={e => setForm(f => ({ ...f, personName: e.target.value }))} />
          <input placeholder="البيان" value={form.note || ''} onInput={e => setForm(f => ({ ...f, note: e.target.value }))} />
          <button type="submit" style={modalSuccessBtn}><CheckIcon size={16} /> إضافة</button>
        </form>
      </Modal>

      {/* Withdraw modal */}
      <Modal open={showModal === 'withdraw' || showModal === 'personal'} onClose={() => setShowModal(null)}
        title={showModal === 'personal' ? `سحب شخصي من ${currentTreasury?.name}` : `سحب تشغيلي من ${currentTreasury?.name}`}>
        <form onSubmit={async (e) => {
          e.preventDefault(); const token = localStorage.getItem('token')
          try {
            const note = showModal === 'personal' ? form.note : (form.withdrawCategory ? '[' + form.withdrawCategory + '] ' : '') + (form.note || '')
            await api.withdrawFromTreasury(token, {
              treasuryId: activeTreasury, amount: Number(form.amount), note,
              personName: form.personName, isPersonal: showModal === 'personal',
              withdrawCategory: showModal === 'personal' ? '' : form.withdrawCategory,
              paymentMethod: form.paymentMethod || 'cash'
            })
            toast('تم السحب', 'success'); setShowModal(null); load()
          } catch (err) { toast(err.message, 'error') }
        }} style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
          <input type="number" step="any" placeholder="المبلغ" value={form.amount || ''} onInput={e => setForm(f => ({ ...f, amount: e.target.value }))} required />
          {showModal === 'withdraw' && (
            <>
              <input list="w-cat-list" placeholder="التصنيف" value={form.withdrawCategory || ''} onInput={e => setForm(f => ({ ...f, withdrawCategory: e.target.value }))} style={{ width: '100%' }} />
              <datalist id="w-cat-list">{withdrawCategories.map(c => <option key={c} value={c} />)}</datalist>
            </>
          )}
          {showModal === 'personal' && <input placeholder="اسم الشخص" value={form.personName || ''} onInput={e => setForm(f => ({ ...f, personName: e.target.value }))} required />}
          <input placeholder="البيان" value={form.note || ''} onInput={e => setForm(f => ({ ...f, note: e.target.value }))} />
          <div style={{ display: 'flex', gap: '6px' }}>
            {['cash','card'].map(m => (
              <button key={m} type="button" onClick={() => setForm(f => ({ ...f, paymentMethod: m }))}
                style={{
                  flex: 1, padding: '10px', borderRadius: '8px', fontSize: '13px', fontWeight: 'bold',
                  background: (form.paymentMethod || 'cash') === m
                    ? (m === 'cash' ? 'var(--success)' : 'var(--accent)')
                    : 'var(--bg3)',
                  color: (form.paymentMethod || 'cash') === m ? '#fff' : 'var(--text)'
                }}>
                {m === 'cash' ? 'نقداً' : 'بطاقة'}
              </button>
            ))}
          </div>
          <div style={{ fontSize: '12px', color: 'var(--text2)', background: 'var(--bg)', borderRadius: '8px', padding: '8px' }}>
            {showModal === 'personal'
              ? 'السحوبات الشخصية تخصم من الخزينة ولا تسجل كمصروف'
              : 'السحوبات التشغيلية تسجل تلقائياً في المصروفات'}
          </div>
          <button type="submit" style={modalDangerBtn}><CheckIcon size={16} /> تأكيد السحب</button>
        </form>
      </Modal>

      {/* Transfer modal */}
      <Modal open={showModal === 'transfer'} onClose={() => setShowModal(null)} title="تحويل بين الخزائن">
        <form onSubmit={async (e) => {
          e.preventDefault(); const token = localStorage.getItem('token')
          try {
            await api.transferBetweenTreasuries(token, { fromTreasuryId: form.fromId, toTreasuryId: form.toId, amount: Number(form.amount), note: form.note })
            toast('تم التحويل', 'success'); setShowModal(null); load()
          } catch (err) { toast(err.message, 'error') }
        }} style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
          <select value={form.fromId || ''} onChange={e => setForm(f => ({ ...f, fromId: e.target.value }))} required
            style={{ background: 'var(--bg)', color: 'var(--text)', border: '1px solid var(--bg3)', borderRadius: '8px', padding: '10px' }}>
            <option value="">من خزينة</option>
            {treasuries.map(t => <option key={t._id} value={t._id}>{t.name} ({formatMoney(t.balance)})</option>)}
          </select>
          <select value={form.toId || ''} onChange={e => setForm(f => ({ ...f, toId: e.target.value }))} required
            style={{ background: 'var(--bg)', color: 'var(--text)', border: '1px solid var(--bg3)', borderRadius: '8px', padding: '10px' }}>
            <option value="">إلى خزينة</option>
            {treasuries.filter(t => t._id !== form.fromId).map(t => <option key={t._id} value={t._id}>{t.name}</option>)}
          </select>
          <input type="number" step="any" placeholder="المبلغ" value={form.amount || ''} onInput={e => setForm(f => ({ ...f, amount: e.target.value }))} required />
          <input placeholder="البيان (اختياري)" value={form.note || ''} onInput={e => setForm(f => ({ ...f, note: e.target.value }))} />
          <button type="submit" style={modalWarningBtn}><WithdrawIcon size={16} /> تحويل</button>
        </form>
      </Modal>

      {/* Edit/Delete treasury buttons */}
      {currentTreasury && canManage && (
        <div style={{ marginTop: '12px', display: 'flex', gap: '8px' }}>
          <button onClick={() => { setEditTreasury(currentTreasury); setForm({ name: currentTreasury.name, type: currentTreasury.type, initialBalance: '' }); setShowModal('treasury') }}
            style={{ background: 'var(--bg3)', color: 'var(--accent)', padding: '6px 12px', borderRadius: '6px', fontSize: '11px' }}>تعديل الخزينة</button>
          <button onClick={() => handleRemoveTreasury(currentTreasury._id)}
            style={{ background: 'var(--bg3)', color: 'var(--danger)', padding: '6px 12px', borderRadius: '6px', fontSize: '11px' }}>حذف الخزينة</button>
        </div>
      )}
      <ConfirmDialog />
    </div>
  )
}