import { useState, useEffect, useRef } from 'preact/hooks'
import { useStore } from '../store'
import api from '../api'
import Modal from '../components/Modal'
import { useToast } from '../components/Toast'
import { formatMoney } from '../utils/money'
import { useConfirm } from '../components/ConfirmModal'
import PrintTemplateA4 from '../components/PrintTemplateA4'
import { printA4 } from '../utils/print'

const PRICE_MODES = [
  { id: 'retail', label: 'تجزئة', field: 'priceRetail' },
  { id: 'halfWholesale', label: 'نصف جملة', field: 'priceHalfWholesale' },
  { id: 'wholesale', label: 'جملة', field: 'priceWholesale' }
]

export default function CashierPage() {
  const toast = useToast()
  const { user } = useStore()
  const { confirm, ConfirmDialog } = useConfirm()
  const [products, setProducts] = useState([])
  const [customers, setCustomers] = useState([])
  const [activeShift, setActiveShift] = useState(undefined)
  const [shiftLoaded, setShiftLoaded] = useState(false)
  const [shiftSales, setShiftSales] = useState({ sales: [], total: 0, count: 0 })
  const [search, setSearch] = useState('')
  const [cart, setCart] = useState([])
  const [paymentMethod, setPaymentMethod] = useState('cash')
  const [paid, setPaid] = useState('')
  const [creditPaid, setCreditPaid] = useState('')
  const [discount, setDiscount] = useState('')
  const [discountType, setDiscountType] = useState('amount')
  const [customerName, setCustomerName] = useState('')
  const [customerPhone, setCustomerPhone] = useState('')
  const [note, setNote] = useState('')
  const [loading, setLoading] = useState(false)
  const [priceMode, setPriceMode] = useState('retail')
  const [showCustomerList, setShowCustomerList] = useState(false)
  const [showStartShift, setShowStartShift] = useState(false)
const [showEndShift, setShowEndShift] = useState(false)
const [showEndConfirm, setShowEndConfirm] = useState(false)
const [startBalance, setStartBalance] = useState('')
const [taxEnabled, setTaxEnabled] = useState(true)
const [taxRate, setTaxRate] = useState(14)
  const [endBalance, setEndBalance] = useState('')
  const [errorModal, setErrorModal] = useState({ show: false, message: '' })
  const [receipt, setReceipt] = useState(null)
  const [showReturnModal, setShowReturnModal] = useState(false)
  const [returnSearch, setReturnSearch] = useState('')
  const [returnSales, setReturnSales] = useState([])
  const [selectedReturnSale, setSelectedReturnSale] = useState(null)
  const [returnItems, setReturnItems] = useState([])
  const [returnReason, setReturnReason] = useState('')
  const searchRef = useRef(null)
  const customerRef = useRef(null)
  const barcodeBuffer = useRef('')
  const barcodeTimer = useRef(null)
  const addToCartRef = useRef(null)

  useEffect(() => {
    loadProducts(); loadCustomers(); loadShiftData(); loadSettings(); searchRef.current?.focus()
  }, [])
  async function loadSettings() {
    try {
      const s = await api.getSettings(localStorage.getItem('token'))
      setTaxEnabled(s.taxEnabled !== false)
      setTaxRate(s.taxRate != null ? s.taxRate : 14)
    } catch {}
  }

  useEffect(() => {
    if (!shiftLoaded) return
    if (!activeShift) {
      setStartBalance(''); setShowStartShift(true)
    }
  }, [activeShift, shiftLoaded])

  useEffect(() => {
    const handler = e => {
      if (e.key === 'Escape') { setSearch(''); searchRef.current?.focus() }
    }
    window.addEventListener('keydown', handler)
    return () => window.removeEventListener('keydown', handler)
  }, [])

  useEffect(() => {
    const handler = e => {
      if (e.key === 'Enter' && barcodeBuffer.current.length >= 5) {
        const code = barcodeBuffer.current
        barcodeBuffer.current = ''
        const product = products.find(p => p.barcode === code)
        if (product) { addToCartRef.current?.(product); e.preventDefault(); return }
      }
      if (e.key.length === 1 && /^\d$/.test(e.key)) {
        barcodeBuffer.current += e.key
        if (barcodeTimer.current) clearTimeout(barcodeTimer.current)
        barcodeTimer.current = setTimeout(() => { barcodeBuffer.current = '' }, 150)
      } else if (e.key !== 'Enter') {
        barcodeBuffer.current = ''
      }
    }
    window.addEventListener('keydown', handler)
    return () => window.removeEventListener('keydown', handler)
  }, [products])

  async function loadProducts(q) {
    const token = localStorage.getItem('token')
    const data = await api.listProducts(token, q)
    setProducts(data)
  }

  async function loadCustomers() {
    const token = localStorage.getItem('token')
    const data = await api.listCustomers(token)
    setCustomers(data)
  }

  async function loadShiftData() {
    const token = localStorage.getItem('token')
    const shift = await api.getActiveShift(token)
    setActiveShift(shift)
    setShiftLoaded(true)
    if (shift) {
      const sales = await api.getShiftSales(token)
      setShiftSales(sales)
    } else {
      setShiftSales({ sales: [], total: 0, count: 0 })
    }
  }

  async function handleStartShift() {
    if (startBalance === '' || startBalance === undefined) { toast('الرجاء إدخال رصيد البداية', 'error'); return }
    if (activeShift) {
      toast('يجب إنهاء الوردية الحالية أولاً', 'error')
      setShowStartShift(false)
      setShowEndShift(true)
      return
    }
    const token = localStorage.getItem('token')
    const bal = Number(startBalance) || 0
    await api.startShift(token, bal)
    toast('تم بدء الوردية', 'success')
    setShowStartShift(false); setStartBalance('')
    loadShiftData()
  }

  async function handleEndShift() {
    if (endBalance === '' || endBalance === undefined) { toast('الرجاء إدخال رصيد النهاية', 'error'); return }
    setShowEndConfirm(true)
  }

  async function confirmEndShift() {
    setShowEndConfirm(false)
    const token = localStorage.getItem('token')
    const bal = Number(endBalance) || 0
    await api.endShift(token, bal)
    toast('تم إنهاء الوردية', 'success')
    setShowEndShift(false); setEndBalance('')
    setActiveShift(null)
    setShiftSales({ sales: [], total: 0, count: 0 })
    setStartBalance(''); setShowStartShift(true)
  }

  function handleSearch(v) {
    setSearch(v)
    if (/^\d+$/.test(v)) return
    if (v.length > 1) loadProducts(v)
    else if (v.length === 0) loadProducts()
  }

  function getProductPrice(p) {
    const mode = PRICE_MODES.find(m => m.id === priceMode)
    const price = p[mode.field]
    return price > 0 ? price : p.priceRetail
  }

  function addToCart(product) {
    const unitPrice = getProductPrice(product)
    setCart(prev => {
      const existing = prev.find(item => item.productId === product._id)
      return existing
        ? prev.map(item => item.productId === product._id ? { ...item, quantity: item.quantity + 1, unitPrice } : item)
        : [{ productId: product._id, name: product.name, quantity: 1, unitPrice, cost: product.cost }, ...prev]
    })
    setSearch('')
    searchRef.current?.focus()
  }

  useEffect(() => { addToCartRef.current = addToCart }, [])

  function updateCartItem(id, qty) {
    setCart(c => {
      if (qty <= 0) return c.filter(item => item.productId !== id)
      return c.map(item => item.productId === id ? { ...item, quantity: qty } : item)
    })
  }

  useEffect(() => {
    if (paymentMethod === 'cash' && cart.length > 0) {
      const st = cart.reduce((s, item) => s + (item.unitPrice * item.quantity), 0)
      const d = discountType === 'percent' ? (st * (Number(discount) || 0) / 100) : (Number(discount) || 0)
      const t = taxEnabled ? ((st - d) * taxRate / 100) : 0
      setPaid(st - d + t)
    } else if (paymentMethod === 'cash' && cart.length === 0) {
      setPaid('')
    }
  }, [cart, discount, discountType, paymentMethod, taxEnabled, taxRate])

  function handleCustomerInput(v) {
    setCustomerName(v)
    if (v.length === 0) { setShowCustomerList(false); setCustomerPhone(''); return }
    const matches = customers.filter(c => c.name.includes(v))
    setShowCustomerList(matches.length > 0 && matches.length <= 20)
    const exact = customers.find(c => c.name === v)
    if (exact) {
      setCustomerPhone(exact.phone || '')
    }
  }

  function selectCustomer(c) {
    setCustomerName(c.name)
    setCustomerPhone(c.phone || '')
    setShowCustomerList(false)
    const remaining = (c.totalDebt || 0) - (c.totalPaid || 0)
    if (remaining > 0) {
      toast(`مديونية سابقة: ${(c.totalDebt || 0).toFixed(2)} | المتبقي: ${remaining.toFixed(2)}`, 'info')
    }
  }

  const subtotal = cart.reduce((sum, item) => sum + (item.unitPrice * item.quantity), 0)
  const discAmount = discountType === 'percent' ? (subtotal * (Number(discount) || 0) / 100) : (Number(discount) || 0)
  const tax = taxEnabled ? ((subtotal - discAmount) * taxRate / 100) : 0
  const total = subtotal - discAmount + tax
  const payable = paymentMethod === 'credit' ? (Number(creditPaid) || 0) : (Number(paid) || 0)
  const change = payable > total ? (payable - total) : 0
  const creditRemaining = paymentMethod === 'credit' ? (total - payable) : 0

  async function handleCheckout() {
    if (cart.length === 0) { toast('السلة فارغة', 'error'); return }
    if (!activeShift) { setErrorModal({ show: true, message: 'يجب بدء الوردية قبل البيع' }); return }
    if (paymentMethod === 'cash' && Number(paid) < total) { setErrorModal({ show: true, message: 'المبلغ المدفوع أقل من الإجمالي' }); return }
    if (paymentMethod === 'credit' && (!customerName.trim() || !customerPhone.trim())) { setErrorModal({ show: true, message: 'يرجى تسجيل اسم العميل ورقم الهاتف للفاتورة الآجلة' }); return }

    setLoading(true)
    try {
      const token = localStorage.getItem('token')
      const settings = await api.getSettings(token)
      const result = await api.createSale(token, {
        items: cart.map(item => ({
          productId: item.productId, name: item.name,
          quantity: item.quantity, unitPrice: item.unitPrice, cost: item.cost
        })),
        subtotal, discount: discAmount, tax, total,
        paymentMethod, paid: paymentMethod === 'credit' ? payable : (payable || total),
        customerName, customerPhone, note
      })
      if (settings?.printAfterPayment) {
        setReceipt({ ...result, items: cart, subtotal, discount: discAmount, tax, total, paymentMethod, paid: paymentMethod === 'credit' ? payable : (payable || total), customerName, customerPhone, settings })
      } else {
        toast(`تمت الفاتورة #${result.invoiceNo}`, 'success')
        setCart([]); setPaid(''); setCreditPaid(''); setDiscount(''); setNote('')
        setCustomerName(''); setCustomerPhone('')
        loadProducts(); loadCustomers(); loadShiftData()
      }
    } catch (err) { toast(err.message, 'error') }
    setLoading(false)
  }

  async function loadReturnSales(search) {
    if (!search || search.length < 1) { setReturnSales([]); return }
    const token = localStorage.getItem('token')
    const data = await api.listSales(token)
    setReturnSales(data.filter(s =>
      String(s.invoiceNo).includes(search) ||
      s.customerName?.includes(search) ||
      s.customerPhone?.includes(search)
    ))
  }

  async function openReturn(sale) {
    setSelectedReturnSale(sale)
    const token = localStorage.getItem('token')
    const allReturns = await api.listReturns(token)
    const saleReturns = allReturns.filter(r => r.saleId === sale._id)
    const returnedQtyMap = new Map()
    saleReturns.forEach(r => {
      r.items.forEach(item => {
        returnedQtyMap.set(item.productId, (returnedQtyMap.get(item.productId) || 0) + item.quantity)
      })
    })
    setReturnItems(sale.items.map(item => {
      const returned = returnedQtyMap.get(item.productId) || 0
      const remaining = item.quantity - returned
      return { ...item, returnQty: 0, originalQty: item.quantity, remainingQty: Math.max(0, remaining) }
    }))
    setReturnReason('')
  }

  async function handleReturnConfirm() {
    const items = returnItems.filter(i => i.returnQty > 0)
    if (items.length === 0) { toast('اختر عنصر واحد على الأقل للإرجاع', 'error'); return }

    const isFull = items.every(i => i.returnQty >= i.quantity)
    const subtotal = items.reduce((sum, i) => sum + (i.unitPrice * i.returnQty), 0)
    const token = localStorage.getItem('token')
    try {
      await api.createReturn(token, {
        saleId: selectedReturnSale._id,
        invoiceNo: selectedReturnSale.invoiceNo,
        items: items.map(i => ({
          productId: i.productId, name: i.name,
          quantity: i.returnQty, unitPrice: i.unitPrice, cost: i.cost
        })),
        subtotal, reason: returnReason,
        customerName: selectedReturnSale.customerName,
        isFullReturn: isFull
      })
      toast('تم إرجاع المنتجات', 'success')
      setShowReturnModal(false)
      setSelectedReturnSale(null)
      setReturnItems([])
      loadProducts()
    } catch (err) { toast(err.message, 'error') }
  }

  const filteredCustomers = customerName.length > 0
    ? customers.filter(c => c.name.includes(customerName))
    : []

  return (
    <div style={{ display: 'flex', height: '100vh', position: 'relative' }}>
      {!activeShift && shiftLoaded && !showStartShift && (
        <div style={{
          position: 'absolute', inset: 0, zIndex: 500,
          background: 'rgba(0,0,0,0.85)',
          display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', gap: '16px'
        }}>
          <div style={{ fontSize: '48px' }}>⏰</div>
          <div style={{ fontSize: '20px', fontWeight: 'bold', color: '#fff' }}>لا توجد وردية نشطة</div>
          <div style={{ fontSize: '14px', color: '#aaa' }}>يجب بدء وردية جديدة قبل البيع</div>
          <button onClick={() => { setStartBalance(''); setShowStartShift(true) }}
            style={{ background: 'var(--success)', color: '#fff', padding: '14px 32px', borderRadius: '10px', fontSize: '15px', fontWeight: 'bold' }}>
            بدء وردية جديدة
          </button>
        </div>
      )}
      <div style={{ flex: 1, padding: '16px', display: 'flex', flexDirection: 'column', overflow: 'hidden' }}>
        <div style={{ display: 'flex', gap: '12px', alignItems: 'center', marginBottom: '12px', padding: '10px 14px', background: activeShift ? 'var(--bg)' : 'var(--bg2)', borderRadius: '10px', fontSize: '12px' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
            <span style={{ width: '8px', height: '8px', borderRadius: '50%', background: activeShift ? 'var(--success)' : 'var(--danger)' }}></span>
            <span style={{ color: 'var(--text2)' }}>{activeShift ? 'وردية نشطة' : 'لا توجد وردية'}</span>
          </div>
          {activeShift && (
            <div style={{ display: 'flex', gap: '16px', flex: 1 }}>
              <span style={{ color: 'var(--success)', fontWeight: 'bold' }}>مبيعات الوردية: {formatMoney(shiftSales.total)}</span>
              <span style={{ color: 'var(--text2)' }}>فواتير: {shiftSales.count}</span>
              <span style={{ color: 'var(--text2)' }}>بداية: {new Date(activeShift.startedAt).toLocaleTimeString('ar-SA')}</span>
            </div>
          )}
          <div style={{ display: 'flex', gap: '6px', marginRight: 'auto' }}>
            <button onClick={() => { loadReturnSales(); setShowReturnModal(true) }}
              style={{ background: 'var(--warning)', color: '#fff', padding: '6px 14px', borderRadius: '6px', fontSize: '11px', fontWeight: 'bold' }}>
              مرتجع
            </button>
            {!activeShift ? (
              <button onClick={() => setShowStartShift(true)}
                style={{ background: 'var(--success)', color: '#fff', padding: '6px 14px', borderRadius: '6px', fontSize: '11px', fontWeight: 'bold' }}>
                بداية وردية جديدة
              </button>
            ) : (
              <>
                <button onClick={() => { setEndBalance(''); setShowEndShift(true) }}
                  style={{ background: 'var(--danger)', color: '#fff', padding: '6px 14px', borderRadius: '6px', fontSize: '11px', fontWeight: 'bold' }}>
                  إنهاء الوردية
                </button>
                <button onClick={() => { setStartBalance(''); setShowStartShift(true) }}
                  style={{ background: 'var(--accent)', color: '#fff', padding: '6px 14px', borderRadius: '6px', fontSize: '11px', fontWeight: 'bold' }}>
                  وردية جديدة
                </button>
              </>
            )}
          </div>
        </div>
        <div style={{ display: 'flex', gap: '8px', marginBottom: '12px' }}>
          <input
            ref={searchRef}
            placeholder="بحث عن منتج..."
            value={search} onInput={e => handleSearch(e.target.value)}
            style={{ flex: 1, padding: '12px', fontSize: '15px' }}
            autoFocus
          />
          {PRICE_MODES.map(mode => (
            <button key={mode.id} onClick={() => setPriceMode(mode.id)}
              style={{
                padding: '8px 14px', borderRadius: '8px', fontSize: '12px', fontWeight: 'bold',
                background: priceMode === mode.id ? 'var(--accent)' : 'var(--bg3)',
                color: priceMode === mode.id ? '#fff' : 'var(--text2)',
                whiteSpace: 'nowrap'
              }}>
              {mode.label}
            </button>
          ))}
        </div>
        <div style={{ flex: 1, overflow: 'auto', display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(160px, 1fr))', gap: '8px', alignContent: 'start' }}>
          {products.length === 0 && (
            <div style={{ gridColumn: '1 / -1', textAlign: 'center', padding: '40px', color: 'var(--text2)', fontSize: '14px' }}>
              لا توجد منتجات<br />
              <span style={{ fontSize: '12px' }}>أضف منتجات من صفحة المنتجات أولاً</span>
            </div>
          )}
          {products.filter(p => !search || /^\d+$/.test(search) || p.name.includes(search) || p.barcode?.includes(search)).map(p => (
            <button key={p._id} onClick={() => addToCart(p)} style={{
              background: 'var(--bg2)', padding: '8px', borderRadius: '10px', textAlign: 'center', fontSize: '13px',
              border: '1px solid var(--bg3)', transition: '0.15s'
            }}>
              {p.image ? <img src={p.image} alt="" style={{ width:'48px',height:'48px',borderRadius:'8px',objectFit:'cover',marginBottom:'4px' }} /> : null}
              <div style={{ fontWeight: 'bold', marginBottom: '4px' }}>{p.name}</div>
              <div style={{ color: 'var(--accent)', fontSize: '15px' }}>{formatMoney(getProductPrice(p))}</div>
              <div style={{ fontSize: '11px', color: p.stock <= p.reorderPoint ? 'var(--danger)' : 'var(--text2)' }}>
                المخزون: {p.stock} {p.unit}
              </div>
            </button>
          ))}
        </div>
      </div>

      <div style={{ width: '400px', background: 'var(--bg2)', padding: '16px', display: 'flex', flexDirection: 'column', borderRight: '1px solid var(--bg3)' }}>
        <h2 style={{ fontSize: '14px', marginBottom: '12px' }}>فاتورة البيع</h2>

        <div style={{ flex: 1, overflow: 'auto', marginBottom: '12px' }}>
          {cart.map(item => (
            <div key={item.productId} style={{ display: 'flex', alignItems: 'center', gap: '8px', padding: '8px', background: 'var(--bg)', borderRadius: '8px', marginBottom: '4px' }}>
              <div style={{ flex: 1 }}>
                <div style={{ fontSize: '13px' }}>{item.name}</div>
                <div style={{ fontSize: '11px', color: 'var(--text2)' }}>{formatMoney(item.unitPrice)} × {item.quantity}</div>
              </div>
              <div style={{ display: 'flex', gap: '4px', alignItems: 'center' }}>
                <button onClick={() => updateCartItem(item.productId, item.quantity - 1)}
                  style={{ background: 'var(--bg3)', color: 'var(--text)', width: '24px', height: '24px', borderRadius: '4px', fontSize: '12px' }}>-</button>
                <input type="number" value={item.quantity} onInput={e => updateCartItem(item.productId, Number(e.target.value))}
                  style={{ width: '50px', textAlign: 'center', fontSize: '12px' }} min="0" />
                <button onClick={() => updateCartItem(item.productId, item.quantity + 1)}
                  style={{ background: 'var(--bg3)', color: 'var(--text)', width: '24px', height: '24px', borderRadius: '4px', fontSize: '12px' }}>+</button>
              </div>
              <div style={{ fontSize: '13px', fontWeight: 'bold', width: '70px', textAlign: 'left' }}>
                {formatMoney(item.unitPrice * item.quantity)}
              </div>
            </div>
          ))}
          {cart.length === 0 && <div style={{ color: '#475569', fontSize: '13px', textAlign: 'center', padding: '20px' }}>السلة فارغة</div>}
        </div>

        <div style={{ borderTop: '1px solid var(--bg3)', paddingTop: '12px' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '13px', marginBottom: '4px' }}>
            <span style={{ color: 'var(--text2)' }}>المجموع</span><span>{formatMoney(subtotal)}</span>
          </div>
          <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '13px', marginBottom: '4px', alignItems: 'center' }}>
            <span style={{ color: 'var(--text2)' }}>الخصم</span>
            <div style={{ display: 'flex', gap: '4px', alignItems: 'center' }}>
              <button type="button" onClick={() => setDiscountType(dt => dt === 'amount' ? 'percent' : 'amount')}
                style={{ background: 'var(--bg3)', color: 'var(--text2)', padding: '2px 6px', borderRadius: '4px', fontSize: '10px', border: 'none', cursor: 'pointer' }}>
                {discountType === 'amount' ? 'قيمة' : '%'}
              </button>
              <input type="number" placeholder="0" value={discount || ''} onInput={e => setDiscount(e.target.value)}
                style={{ width: '70px', textAlign: 'center', fontSize: '12px', padding: '4px' }} />
            </div>
          </div>
            <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '13px', marginBottom: '4px', color: 'var(--text2)' }}>
            <span>الضريبة</span><span>{formatMoney(tax)}</span>
          </div>
          <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '18px', fontWeight: 'bold', marginBottom: '12px' }}>
            <span>الإجمالي</span><span style={{ color: 'var(--success)' }}>{formatMoney(total)}</span>
          </div>

          <select value={paymentMethod} onChange={e => { setPaymentMethod(e.target.value); if (e.target.value === 'cash') setPaid(total) }}
            style={{ width: '100%', marginBottom: '8px' }}>
            <option value="cash">نقداً</option>
            <option value="card">بطاقة</option>
            <option value="credit">آجل</option>
          </select>

          {paymentMethod === 'cash' && (
            <div>
              <input type="number" placeholder="المبلغ المدفوع" value={paid || ''}
                onInput={e => setPaid(e.target.value)}
                style={{ width: '100%', marginBottom: '4px' }} />
              {change > 0 && (
                <div style={{ textAlign: 'left', fontSize: '14px', color: 'var(--success)', marginBottom: '8px' }}>
                  الباقي: {formatMoney(change)}
                </div>
              )}
            </div>
          )}

          {paymentMethod === 'credit' && (
            <div>
              <input type="number" placeholder="المبلغ المدفوع الآن" value={creditPaid || ''}
                onInput={e => setCreditPaid(e.target.value)}
                style={{ width: '100%', marginBottom: '4px' }} />
              {creditRemaining > 0 && (
                <div style={{ textAlign: 'left', fontSize: '14px', color: '#f97316', marginBottom: '8px' }}>
                  المتبقي على العميل: {formatMoney(creditRemaining)}
                </div>
              )}
            </div>
          )}

          <div style={{ position: 'relative' }}>
            <input placeholder="اسم العميل" value={customerName}
              onInput={e => handleCustomerInput(e.target.value)}
              onFocus={() => { if (customerName.length > 0) setShowCustomerList(true) }}
              onBlur={() => setTimeout(() => setShowCustomerList(false), 200)}
              ref={customerRef}
              style={{ width: '100%', marginBottom: '8px' }} />
            {showCustomerList && filteredCustomers.length > 0 && (
              <div style={{
                position: 'absolute', top: '100%', left: 0, right: 0, zIndex: 100,
                background: 'var(--bg)', border: '1px solid var(--bg3)', borderRadius: '8px',
                maxHeight: '160px', overflow: 'auto'
              }}>
                {filteredCustomers.slice(0, 10).map(c => (
                  <button key={c._id} type="button" onClick={() => selectCustomer(c)}
                    style={{
                      display: 'block', width: '100%', textAlign: 'right', padding: '8px 12px',
                      background: 'transparent', color: 'var(--text)', fontSize: '13px', borderBottom: '1px solid var(--bg2)'
                    }}>
                    <div style={{ fontSize: '13px' }}>{c.name} {c.phone ? `(${c.phone})` : ''}</div>
                    <div style={{ fontSize: '11px', color: 'var(--text2)' }}>
                      مديونية: {c.totalDebt?.toFixed(2)} | متبقي: <span style={{ color: ((c.totalDebt||0)-(c.totalPaid||0)) > 0 ? 'var(--danger)' : 'var(--success)' }}>{((c.totalDebt||0)-(c.totalPaid||0)).toFixed(2)}</span>
                    </div>
                  </button>
                ))}
              </div>
            )}
          </div>
          <input placeholder="رقم العميل" value={customerPhone} onInput={e => setCustomerPhone(e.target.value)}
            style={{ width: '100%', marginBottom: '8px' }} />
          <input placeholder="ملاحظة" value={note} onInput={e => setNote(e.target.value)}
            style={{ width: '100%', marginBottom: '12px' }} />

          <button onClick={handleCheckout} disabled={loading || cart.length === 0} style={{
            width: '100%', padding: '12px', background: 'var(--success)', color: '#fff',
            borderRadius: '8px', fontSize: '15px', fontWeight: 'bold', opacity: loading ? 0.6 : 1
          }}>
            {loading ? 'جاري...' : 'إتمام البيع'}
          </button>
        </div>
      </div>

      <Modal open={showStartShift} onClose={() => setShowStartShift(false)} title={activeShift ? 'بدء وردية جديدة' : 'بداية وردية جديدة'}>
        <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
          {activeShift && <div style={{ color: '#f97316', fontSize: '13px' }}>سيتم إنهاء الوردية الحالية أولاً</div>}
          <input type="text" inputMode="numeric" placeholder="رصيد بداية الوردية" value={startBalance}
            onInput={e => setStartBalance(e.target.value)}
            style={{ background: 'var(--bg)', color: 'var(--text)', border: '1px solid var(--bg3)', borderRadius: '8px', padding: '10px' }} />
          <button onClick={handleStartShift} style={{ background: 'var(--success)', color: '#fff', padding: '10px', borderRadius: '8px', fontSize: '14px', fontWeight: 'bold' }}>
            تأكيد
          </button>
        </div>
      </Modal>

      <Modal open={showEndShift} onClose={() => setShowEndShift(false)} title="إنهاء الوردية">
        <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
          <div style={{ background: 'var(--bg)', borderRadius: '8px', padding: '12px' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '13px', marginBottom: '4px' }}>
              <span style={{ color: 'var(--text2)' }}>مبيعات الوردية</span><span style={{ color: 'var(--success)', fontWeight: 'bold' }}>{shiftSales.total?.toFixed(2)}</span>
            </div>
            <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '13px', marginBottom: '4px' }}>
              <span style={{ color: 'var(--text2)' }}>عدد الفواتير</span><span>{shiftSales.count}</span>
            </div>
            <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '13px' }}>
              <span style={{ color: 'var(--text2)' }}>رصيد البداية</span><span>{activeShift?.startingBalance?.toFixed(2)}</span>
            </div>
          </div>
           <input type="text" inputMode="numeric" placeholder="رصيد النهاية" value={endBalance}
            onInput={e => setEndBalance(e.target.value)}
            style={{ background: 'var(--bg)', color: 'var(--text)', border: '1px solid var(--bg3)', borderRadius: '8px', padding: '10px' }} />
          {endBalance !== '' && endBalance !== undefined && (() => {
            const expected = (activeShift?.startingBalance || 0) + shiftSales.total
            const diff = Number(endBalance) - expected
            if (diff < 0) return <div style={{ color:'var(--danger)', fontSize:'13px', textAlign:'center' }}>عجز: {Math.abs(diff).toFixed(2)}</div>
            if (diff > 0) return <div style={{ color:'#f59e0b', fontSize:'13px', textAlign:'center' }}>زيادة: {diff.toFixed(2)}</div>
            return <div style={{ color:'var(--success)', fontSize:'13px', textAlign:'center' }}>مطابق للرصيد</div>
          })()}
          <button onClick={handleEndShift} style={{ background: 'var(--danger)', color: '#fff', padding: '10px', borderRadius: '8px', fontSize: '14px', fontWeight: 'bold' }}>
            تأكيد الإنهاء
          </button>
        </div>
      </Modal>

      <ConfirmDialog />
      <Modal open={showEndConfirm} onClose={() => setShowEndConfirm(false)} title="تأكيد إنهاء الوردية" width="400px">
        <div style={{ display: 'flex', flexDirection: 'column', gap: '16px', alignItems: 'center', padding: '8px 0' }}>
          <div style={{ fontSize: '14px', color: 'var(--text)', textAlign: 'center' }}>هل أنت متأكد من إنهاء الوردية الحالية؟</div>
          <div style={{ display: 'flex', gap: '12px' }}>
            <button onClick={confirmEndShift}
              style={{ background: 'var(--danger)', color: '#fff', padding: '10px 24px', borderRadius: '8px', fontSize: '14px', fontWeight: 'bold' }}>
              تأكيد
            </button>
            <button onClick={() => setShowEndConfirm(false)}
              style={{ background: 'var(--bg3)', color: 'var(--text)', padding: '10px 24px', borderRadius: '8px', fontSize: '14px', fontWeight: 'bold' }}>
              إلغاء
            </button>
          </div>
        </div>
      </Modal>

      <Modal open={errorModal.show} onClose={() => setErrorModal({ show: false, message: '' })} title="تنبيه">
        <div style={{ display: 'flex', flexDirection: 'column', gap: '16px', alignItems: 'center', padding: '8px 0' }}>
          <div style={{ fontSize: '14px', color: 'var(--danger)', textAlign: 'center' }}>{errorModal.message}</div>
          <button onClick={() => setErrorModal({ show: false, message: '' })}
            style={{ background: 'var(--accent)', color: '#fff', padding: '10px 24px', borderRadius: '8px', fontSize: '14px', fontWeight: 'bold' }}>
            حسناً
          </button>
        </div>
      </Modal>

      <Modal open={!!receipt} onClose={() => { setReceipt(null); setCart([]); setPaid(''); setCreditPaid(''); setDiscount(''); setNote(''); setCustomerName(''); setCustomerPhone(''); loadProducts(); loadCustomers(); loadShiftData() }} title="فاتورة" width="350px">
        {receipt && (
          <div style={{ fontSize: '12px', textAlign: 'center' }} id="receipt-content">
            <div style={{ fontWeight: 'bold', fontSize: '16px', marginBottom: '2px' }}>{receipt.settings?.businessName || 'SMART X'}</div>
            {receipt.settings?.phone && <div style={{ color: 'var(--text2)', fontSize: '11px' }}>هاتف: {receipt.settings.phone}</div>}
            {receipt.settings?.address && <div style={{ color: 'var(--text2)', fontSize: '11px' }}>{receipt.settings.address}</div>}
            <div style={{ color: 'var(--text2)', margin: '6px 0 10px' }}>فاتورة #{receipt.invoiceNo}</div>
            <div style={{ borderTop: '1px dashed var(--bg3)', margin: '8px 0' }}></div>
            {receipt.items?.map((item, i) => (
              <div key={i} style={{ display: 'flex', justifyContent: 'space-between', padding: '2px 0' }}>
                <span>{item.name} × {item.quantity}</span>
                <span>{(item.unitPrice * item.quantity)?.toFixed(2)}</span>
              </div>
            ))}
            <div style={{ borderTop: '1px dashed var(--bg3)', margin: '8px 0' }}></div>
            <div style={{ display: 'flex', justifyContent: 'space-between' }}><span>المجموع</span><span>{formatMoney(receipt.subtotal)}</span></div>
            {receipt.discount > 0 && <div style={{ display: 'flex', justifyContent: 'space-between' }}><span>الخصم</span><span style={{ color: 'var(--danger)' }}>-{formatMoney(receipt.discount)}</span></div>}
            {receipt.tax > 0 && <div style={{ display: 'flex', justifyContent: 'space-between' }}><span>الضريبة</span><span>{formatMoney(receipt.tax)}</span></div>}
            <div style={{ display: 'flex', justifyContent: 'space-between', fontWeight: 'bold', fontSize: '14px' }}><span>الإجمالي</span><span style={{ color: 'var(--success)' }}>{formatMoney(receipt.total)}</span></div>
            {receipt.paid > 0 && <div style={{ display: 'flex', justifyContent: 'space-between' }}><span>المدفوع</span><span>{formatMoney(receipt.paid)}</span></div>}
            {receipt.customerName && <div style={{ marginTop: '8px', color: 'var(--text2)' }}>العميل: {receipt.customerName}{receipt.customerPhone ? ` - ${receipt.customerPhone}` : ''}</div>}
            {receipt.settings?.receiptFooter && <div style={{ marginTop: '10px', borderTop: '1px dashed var(--bg3)', paddingTop: '8px', color: 'var(--text2)', fontSize: '11px' }}>{receipt.settings.receiptFooter}</div>}
            <button onClick={() => {
              if (receipt.settings?.printDefaultSize === 'a4') {
                printA4(<PrintTemplateA4 type="sale" data={receipt} settings={receipt.settings} />)
              } else {
                window.print()
              }
            }}
              style={{ marginTop: '16px', background: 'var(--accent)', color: '#fff', padding: '10px 24px', borderRadius: '8px', fontSize: '13px', fontWeight: 'bold', width: '100%' }}>
              {receipt.settings?.printDefaultSize === 'a4' ? 'طباعة A4' : 'طباعة'}
            </button>
          </div>
        )}
      </Modal>

      <Modal open={showReturnModal} onClose={() => { setShowReturnModal(false); setSelectedReturnSale(null); setReturnItems([]); setReturnSearch(''); setReturnSales([]) }} title="المرتجع" width="450px">
        {!selectedReturnSale ? (
          <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
            <input placeholder="ابحث برقم الفاتورة أو اسم العميل أو رقم الهاتف..." value={returnSearch}
              onInput={e => { setReturnSearch(e.target.value); loadReturnSales(e.target.value) }}
              autoFocus
              style={{ width: '100%' }} />
            <div style={{ maxHeight: '300px', overflow: 'auto', display: 'flex', flexWrap: 'wrap', gap: '6px' }}>
              {returnSales.length > 0 ? (
                returnSales.slice(0, 20).map(s => (
                  <button key={s._id} onClick={() => openReturn(s)} style={{
                    background: 'var(--bg3)', padding: '8px 14px', borderRadius: '6px', fontSize: '12px',
                    color: 'var(--accent)', border: '1px solid #475569'
                  }}>
                    #{s.invoiceNo} - {formatMoney(s.total)} {s.customerName ? `(${s.customerName})` : ''}
                  </button>
                ))
              ) : returnSearch.length >= 1 ? (
                <div style={{ color: '#475569', padding: '20px', textAlign: 'center', width: '100%' }}>لا توجد نتائج</div>
              ) : (
                <div style={{ color: '#475569', padding: '20px', textAlign: 'center', width: '100%', fontSize: '12px' }}>ابدأ الكتابة للبحث...</div>
              )}
            </div>
          </div>
        ) : (
          <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
            <div style={{ fontSize: '13px', color: 'var(--text2)', marginBottom: '8px' }}>إرجاع من فاتورة #{selectedReturnSale.invoiceNo}</div>
            {returnItems.map((item, i) => (
              <div key={item.productId} style={{ display: 'flex', alignItems: 'center', gap: '8px', padding: '8px', background: 'var(--bg)', borderRadius: '8px' }}>
                <div style={{ flex: 1 }}>
                  <div style={{ fontSize: '13px' }}>{item.name}</div>
                  <div style={{ fontSize: '11px', color: 'var(--text2)' }}>
                    {item.remainingQty > 0 ? `المتبقي للإرجاع: ${item.remainingQty} | السعر: ${formatMoney(item.unitPrice)}` : `تم إرجاع الكمية كاملة`}
                  </div>
                </div>
                <input type="number" value={item.returnQty} min="0" max={item.remainingQty}
                  disabled={item.remainingQty <= 0}
                  onInput={e => {
                    const newItems = [...returnItems]
                    newItems[i] = { ...newItems[i], returnQty: Math.min(Number(e.target.value) || 0, item.remainingQty) }
                    setReturnItems(newItems)
                  }}
                  style={{ width: '60px', textAlign: 'center', fontSize: '12px' }} />
              </div>
            ))}
            <input placeholder="سبب الإرجاع (اختياري)" value={returnReason}
              onInput={e => setReturnReason(e.target.value)}
              style={{ width: '100%' }} />
            <button onClick={handleReturnConfirm}
              style={{ width: '100%', padding: '10px', background: 'var(--warning)', color: '#fff', borderRadius: '8px', fontSize: '14px', fontWeight: 'bold' }}>
              تأكيد الإرجاع
            </button>
          </div>
        )}
      </Modal>
    </div>
  )
}
