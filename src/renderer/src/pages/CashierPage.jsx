import { useState, useEffect, useRef, useCallback } from 'preact/hooks'
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

const FRACTIONAL_UNITS = ['كيلو', 'كجم', 'جرام', 'جم', 'طن', 'لتر', 'مل', 'جالون', 'متر', 'سم', 'قدم', 'ياردة']
const FRACTION_STEP = 0.5

export default function CashierPage() {
  const toast = useToast()
  const { user } = useStore()
  const { confirm, ConfirmDialog } = useConfirm()
  const [products, setProducts] = useState([])
  const [customers, setCustomers] = useState([])
  const [activeShift, setActiveShift] = useState(undefined)
  const [shiftLoaded, setShiftLoaded] = useState(false)
  const [shiftSales, setShiftSales] = useState({ sales: [], total: 0, count: 0, creditTotal: 0, cashTotal: 0, cardTotal: 0, expensesTotal: 0, withdrawalsTotal: 0, cardWithdrawalsTotal: 0, returnsTotal: 0 })
  const [search, setSearch] = useState('')
  const [cart, setCart] = useState([])
  const [paymentMethod, setPaymentMethod] = useState('cash')
  const [paid, setPaid] = useState('')
  const [creditPaid, setCreditPaid] = useState('')
  const [discount, setDiscount] = useState('')
  const [discountType, setDiscountType] = useState('amount')
  const [customerName, setCustomerName] = useState('')
  const [customerPhone, setCustomerPhone] = useState('')
  const [customerCredit, setCustomerCredit] = useState(0)
  const [editingQty, setEditingQty] = useState({})
  const [customerDebt, setCustomerDebt] = useState(0)
  const [note, setNote] = useState('')
  const [loading, setLoading] = useState(false)
  const [priceMode, setPriceMode] = useState('retail')
  const [showCustomerList, setShowCustomerList] = useState(false)
  const [customerListIndex, setCustomerListIndex] = useState(-1)
  const [showStartShift, setShowStartShift] = useState(false)
const [showEndShift, setShowEndShift] = useState(false)
const [showEndConfirm, setShowEndConfirm] = useState(false)
const [startBalance, setStartBalance] = useState('')
const [taxEnabled, setTaxEnabled] = useState(true)
const [taxRate, setTaxRate] = useState(14)
  const [endCashBalance, setEndCashBalance] = useState('')
  const [endCardBalance, setEndCardBalance] = useState('')
  const [errorModal, setErrorModal] = useState({ show: false, message: '' })
  const [receipt, setReceipt] = useState(null)
  const [showExpenseModal, setShowExpenseModal] = useState(false)
  const [expenseAmount, setExpenseAmount] = useState('')
  const [expenseNote, setExpenseNote] = useState('')
  const [expensePaymentMethod, setExpensePaymentMethod] = useState('cash')
  const [showWithdrawModal, setShowWithdrawModal] = useState(false)
  const [withdrawAmount, setWithdrawAmount] = useState('')
  const [withdrawNote, setWithdrawNote] = useState('')
  const [withdrawCategory, setWithdrawCategory] = useState('operational')
  const [withdrawPaymentMethod, setWithdrawPaymentMethod] = useState('cash')
  const [showReturnModal, setShowReturnModal] = useState(false)
  const [returnSearch, setReturnSearch] = useState('')
  const [returnSales, setReturnSales] = useState([])
  const [selectedReturnSale, setSelectedReturnSale] = useState(null)
  const [returnItems, setReturnItems] = useState([])
  const [returnReason, setReturnReason] = useState('')
  const [returnPaymentMethod, setReturnPaymentMethod] = useState('cash')
  const [returnRefundCash, setReturnRefundCash] = useState(false)
  const [customerPaidForSale, setCustomerPaidForSale] = useState(0)
  const searchRef = useRef(null)
  const customerRef = useRef(null)
  const barcodeBuffer = useRef('')
  const barcodeTimer = useRef(null)
  const addToCartRef = useRef(null)
  const reloadTimer = useRef(null)
  const productMapRef = useRef({ byId: {}, byBarcode: {} })

  useEffect(() => {
    const byId = {}
    const byBarcode = {}
    for (const p of products) {
      byId[p._id] = p
      if (p.barcode) byBarcode[p.barcode] = p
    }
    productMapRef.current = { byId, byBarcode }
  }, [products])

  function debouncedReload() {
    clearTimeout(reloadTimer.current)
    reloadTimer.current = setTimeout(() => {
      loadProducts('', 200); loadCustomers(); loadShiftData()
    }, 300)
  }

  useEffect(() => {
    loadProducts('', 200); loadCustomers(); loadShiftData(); loadSettings(); searchRef.current?.focus()
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
        const product = productMapRef.current.byBarcode[code]
        if (product) { addToCartRef.current?.(product, true); e.preventDefault(); return }
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

  async function loadProducts(q, limit) {
    const token = localStorage.getItem('token')
    const data = await api.listProducts(token, q, limit)
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
      setShiftSales({ sales: [], total: 0, count: 0, creditTotal: 0, cashTotal: 0, cardTotal: 0, expensesTotal: 0, withdrawalsTotal: 0, cardWithdrawalsTotal: 0, returnsTotal: 0 })
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
    setShowEndConfirm(true)
  }

  async function confirmEndShift() {
    setShowEndConfirm(false)
    const token = localStorage.getItem('token')
    const cashBal = Number(endCashBalance)
    const cardBal = Number(endCardBalance)
    if (isNaN(cashBal) || isNaN(cardBal)) { toast('الرجاء إدخال أرقام صحيحة', 'error'); return }
    await api.endShift(token, cashBal, cardBal)
    toast('تم إنهاء الوردية', 'success')
    setShowEndShift(false); setEndCashBalance(''); setEndCardBalance('')
    setActiveShift(null)
    setShiftSales({ sales: [], total: 0, count: 0, creditTotal: 0, cashTotal: 0, cardTotal: 0, expensesTotal: 0, withdrawalsTotal: 0, returnsTotal: 0 })
    setStartBalance(''); setShowStartShift(true)
  }

  function handleSearch(v) {
    setSearch(v)
    if (v.length > 0 && v.length < 2) { setProducts([]); return }
    loadProducts(v, 100)
  }

  function getProductPrice(p) {
    const mode = PRICE_MODES.find(m => m.id === priceMode)
    const price = p[mode.field]
    return price > 0 ? price : p.priceRetail
  }

  function addToCart(product, keepSearch) {
    if (product.stock <= 0) { toast('المنتج نفد من المخزون', 'error'); return }
    const unitPrice = getProductPrice(product)
    setCart(prev => {
      const existing = prev.find(item => item.productId === product._id)
      const step = FRACTIONAL_UNITS.includes(product.unit) ? FRACTION_STEP : 1
      if (existing && existing.quantity + step > product.stock) {
        toast(`المخزون غير كافٍ للمنتج "${product.name}" (المتاح: ${product.stock})`, 'error')
        return prev
      }
      return existing
        ? prev.map(item => item.productId === product._id ? { ...item, quantity: item.quantity + step, unitPrice } : item)
        : [{ productId: product._id, name: product.name, quantity: 1, unitPrice, cost: product.cost }, ...prev]
    })
    if (!keepSearch) {
      setSearch('')
      searchRef.current?.focus()
    }
  }

  useEffect(() => { addToCartRef.current = addToCart }, [addToCart])

  function updateCartItem(id, qty) {
    if (qty < 0) { setCart(c => c.filter(item => item.productId !== id)); return }
    const product = productMapRef.current.byId[id]
    if (product && qty > product.stock) {
      toast(`المخزون غير كافٍ للمنتج "${product.name}" (المتاح: ${product.stock})`, 'error')
      return
    }
    setCart(c => c.map(item => item.productId === id ? { ...item, quantity: qty } : item))
  }

  useEffect(() => {
    if ((paymentMethod === 'cash' || paymentMethod === 'card') && cart.length > 0) {
      const st = cart.reduce((s, item) => s + (item.unitPrice * item.quantity), 0)
      const d = discountType === 'percent' ? (st * (Number(discount) || 0) / 100) : (Number(discount) || 0)
      const t = taxEnabled ? ((st - d) * taxRate / 100) : 0
      setPaid(st - d + t)
    } else if ((paymentMethod === 'cash' || paymentMethod === 'card') && cart.length === 0) {
      setPaid('')
    }
  }, [cart, discount, discountType, paymentMethod, taxEnabled, taxRate])

  function handleCustomerInput(v) {
    setCustomerName(v); setCustomerCredit(0); setCustomerDebt(0)
    setCustomerListIndex(-1)
    if (v.length === 0) { setShowCustomerList(false); setCustomerPhone(''); return }
    const matches = customers.filter(c => c.name.includes(v) || c.phone?.includes(v))
    setShowCustomerList(matches.length > 0)
  }

  function selectCustomer(c) {
    setCustomerName(c.name)
    setCustomerPhone(c.phone || '')
    setShowCustomerList(false)
    const credit = Math.max(0, (c.totalPaid || 0) - (c.totalDebt || 0))
    setCustomerCredit(credit)
    const debt = Math.max(0, (c.totalDebt || 0) - (c.totalPaid || 0))
    setCustomerDebt(debt)
    if (debt > 0) {
      toast(`رصيد مستحق من العميل: ${debt.toFixed(2)}`, 'info')
    } else if (credit > 0) {
      toast(`دين مستحق للعميل: ${credit.toFixed(2)}`, 'info')
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
    if (paymentMethod !== 'credit') {
      const requiredPaid = Math.max(0, total - customerCredit)
      if (Number(paid) < requiredPaid) {
        const msg = customerCredit > 0
          ? `المبلغ المدفوع أقل من الإجمالي بعد خصم الرصيد السابق (الإجمالي: ${total.toFixed(2)} - دين مستحق للعميل: ${customerCredit.toFixed(2)} = ${requiredPaid.toFixed(2)})`
          : 'المبلغ المدفوع أقل من الإجمالي'
        setErrorModal({ show: true, message: msg }); return
      }
    }
    if (paymentMethod === 'credit' && (!customerName.trim() || !customerPhone.trim())) { setErrorModal({ show: true, message: 'يرجى تسجيل اسم العميل ورقم الهاتف للفاتورة الآجلة' }); return }

    for (const item of cart) {
      const product = productMapRef.current.byId[item.productId]
      if (!product || product.stock < item.quantity) {
        const name = item.name
        const available = product ? product.stock : 0
        setErrorModal({ show: true, message: `المخزون غير كافٍ للمنتج "${name}" (المتاح: ${available}, المطلوب: ${item.quantity})` })
        return
      }
    }

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
        customerName, customerPhone, note,
        previousCredit: paymentMethod !== 'credit' ? customerCredit : 0
      })
      if (settings?.printAfterPayment) {
        setReceipt({ ...result, items: cart, subtotal, discount: discAmount, tax, total, paymentMethod, paid: paymentMethod === 'credit' ? payable : (payable || total), customerName, customerPhone, note, previousCredit: paymentMethod !== 'credit' ? customerCredit : 0, previousDebt: result.previousDebt || 0, settings, customers, cashierName: user?.name })
      } else {
        toast(`تمت الفاتورة #${result.invoiceNo}`, 'success')
        setCart([]); setPaid(''); setCreditPaid(''); setDiscount(''); setNote('')
        setCustomerName(''); setCustomerPhone(''); setCustomerCredit(0); setCustomerDebt(0)
        debouncedReload()
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
    setReturnRefundCash(false)
    const token = localStorage.getItem('token')
    let paid = 0
    if (sale.paymentMethod === 'credit') {
      try { paid = await api.getSalePaidAmount(token, sale._id) } catch {}
    }
    setCustomerPaidForSale(paid)
    const saleReturns = await api.listReturns(token, sale._id)
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
    setReturnPaymentMethod(sale.paymentMethod === 'credit' ? 'customer_balance' : sale.paymentMethod)
  }

  async function handleReturnConfirm() {
    const items = returnItems.filter(i => i.returnQty > 0)
    if (items.length === 0) { toast('الرجاء تحديد كميات للإرجاع', 'error'); return }
    if (!returnReason.trim()) { toast('الرجاء إدخال سبب الإرجاع', 'error'); return }
    const subtotal = items.reduce((sum, i) => sum + (i.unitPrice * i.returnQty), 0)
    const expectedRefund = returnPaymentMethod === 'customer_balance' ? 0 : (selectedReturnSale && selectedReturnSale.paymentMethod === 'credit' ? Math.min(subtotal, selectedReturnSale.paid || 0) : subtotal)
    const shiftAvailable = activeShift ? (activeShift.startingBalance || 0) + (activeShift.totalSales || 0) - (activeShift.expensesTotal || 0) - (activeShift.withdrawalsTotal || 0) : 0
    if (returnPaymentMethod === 'cash' && activeShift && shiftAvailable < expectedRefund) { toast('رصيد الوردية غير كافٍ', 'error'); return }
    if (returnPaymentMethod === 'card' && activeShift && shiftAvailable < expectedRefund) { toast('رصيد الوردية غير كافٍ', 'error'); return }
    if (!activeShift && (returnPaymentMethod === 'cash' || returnPaymentMethod === 'card')) { toast('لا توجد وردية نشطة، سيتم الخصم من الخزينة مباشرة', 'info') }

    const isFull = items.every(i => i.returnQty >= i.quantity)
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
        isFullReturn: isFull,
        paymentMethod: returnPaymentMethod === 'customer_balance' ? 'credit' : returnPaymentMethod,
        cashRefund: returnPaymentMethod !== 'customer_balance'
      })
      toast('تم إرجاع المنتجات', 'success')
      setShowReturnModal(false)
      setSelectedReturnSale(null)
      setReturnItems([])
      loadProducts(); loadShiftData()
    } catch (err) { toast(err.message, 'error') }
  }

  async function handleAddExpense() {
    if (!expenseAmount || Number(expenseAmount) <= 0) { toast('الرجاء إدخال مبلغ المصروف', 'error'); return }
    if (!expenseNote.trim()) { toast('الرجاء إدخال بيان المصروف', 'error'); return }
    const token = localStorage.getItem('token')
    try {
      await api.saveExpense(token, {
        amount: Number(expenseAmount),
        category: 'مصروف وردية',
        note: expenseNote.trim(),
        paymentMethod: expensePaymentMethod,
        shiftId: activeShift?._id || ''
      })
      toast('تم تسجيل المصروف', 'success')
      setShowExpenseModal(false)
      setExpenseAmount('')
      setExpenseNote('')
      setExpensePaymentMethod('cash')
      loadShiftData()
    } catch (err) { toast(err.message, 'error') }
  }

  async function handleWithdraw() {
    if (!withdrawAmount || Number(withdrawAmount) <= 0) { toast('الرجاء إدخال مبلغ السحب', 'error'); return }
    const token = localStorage.getItem('token')
    try {
      const treasuries = await api.listTreasuries(token)
      const treasuryType = withdrawPaymentMethod === 'card' ? 'bank' : 'main'
      const treasury = treasuries.find(t => t.type === treasuryType)
      if (!treasury) { toast('لا توجد خزينة ' + (treasuryType === 'bank' ? 'بنك' : 'رئيسية'), 'error'); return }
      await api.withdrawFromTreasury(token, {
        treasuryId: treasury._id,
        amount: Number(withdrawAmount),
        note: withdrawNote.trim(),
        isPersonal: withdrawCategory === 'personal',
        withdrawCategory: withdrawCategory === 'personal' ? '' : 'سحب تشغيلي',
        paymentMethod: withdrawPaymentMethod
      })
      toast('تم السحب', 'success')
      setShowWithdrawModal(false)
      setWithdrawAmount('')
      setWithdrawNote('')
      setWithdrawCategory('operational')
      setWithdrawPaymentMethod('cash')
      loadShiftData()
    } catch (err) { toast(err.message, 'error') }
  }

  const filterValue = customerName || customerPhone
  const filteredCustomers = filterValue.length > 0
    ? customers.filter(c => c.name.includes(filterValue) || c.phone?.includes(filterValue))
    : []

  return (
    <div style={{ display: 'flex', height: '100%', position: 'relative' }}>
      {!activeShift && shiftLoaded && !showStartShift && (
        <div style={{
          position: 'absolute', inset: 0, zIndex: 500,
          background: 'rgba(0,0,0,0.85)',
          display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', gap: '16px'
        }}>
          <div style={{ fontSize: '48px' }}>⏰</div>
          <div style={{ fontSize: '20px', fontWeight: 'bold', color: '#fff' }}>لا توجد وردية نشطة</div>
          <div style={{ fontSize: '14px', color: 'var(--text2)' }}>يجب بدء وردية جديدة قبل البيع</div>
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
              <span style={{ color: 'var(--success)', fontWeight: 'bold' }}>مبيعات الوردية: {formatMoney(activeShift?.totalSales || 0)}</span>
              {activeShift?.expensesTotal > 0 && <span style={{ color: '#f59e0b', fontWeight: 'bold' }}>مصروفات: {formatMoney(activeShift.expensesTotal)}</span>}
              {activeShift?.withdrawalsTotal > 0 && <span style={{ color: '#ef4444', fontWeight: 'bold' }}>مسحوبات: {formatMoney(activeShift.withdrawalsTotal)}</span>}
              <span style={{ color: 'var(--text2)' }}>فواتير: {shiftSales.count}</span>
              <span style={{ color: 'var(--text2)' }}>بداية: {new Date(activeShift.startedAt).toLocaleTimeString('ar-SA')}</span>
            </div>
          )}
          <div style={{ display: 'flex', gap: '6px', marginRight: 'auto' }}>
            {user?.permissions?.includes('cashier.access') && (
              <button onClick={() => { loadReturnSales(); setShowReturnModal(true) }}
                style={{ background: 'var(--warning)', color: '#fff', padding: '6px 14px', borderRadius: '6px', fontSize: '11px', fontWeight: 'bold' }}>
                مرتجع
              </button>
            )}
            {user?.permissions?.includes('cashier.access') && (
              <button onClick={() => setShowExpenseModal(true)}
                style={{ background: '#f59e0b', color: '#fff', padding: '6px 14px', borderRadius: '6px', fontSize: '11px', fontWeight: 'bold' }}>
                مصروف
              </button>
            )}
            {user?.permissions?.includes('cashier.access') && (
              <button onClick={() => setShowWithdrawModal(true)}
                style={{ background: '#ef4444', color: '#fff', padding: '6px 14px', borderRadius: '6px', fontSize: '11px', fontWeight: 'bold' }}>
                سحب
              </button>
            )}
            {user?.permissions?.includes('cashier.access') && !activeShift ? (
              <button onClick={() => setShowStartShift(true)}
                style={{ background: 'var(--success)', color: '#fff', padding: '6px 14px', borderRadius: '6px', fontSize: '11px', fontWeight: 'bold' }}>
                بداية وردية جديدة
              </button>
            ) : user?.permissions?.includes('cashier.access') && (
              <>
                <button onClick={() => { setEndCashBalance(''); setEndCardBalance(''); setShowEndShift(true) }}
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
              {search ? 'لا توجد منتجات مطابقة' : 'لا توجد منتجات<br />'}
              <span style={{ fontSize: '12px' }}>{search ? 'جرب بحث آخر' : 'أضف منتجات من صفحة المنتجات أولاً'}</span>
            </div>
          )}
          {products.map(p => (
            <button key={p._id} onClick={() => addToCart(p)} disabled={p.stock <= 0} style={{
              background: p.stock <= 0 ? 'var(--bg)' : 'var(--bg2)', padding: '8px', borderRadius: '10px', textAlign: 'center', fontSize: '13px',
              border: '1px solid var(--bg3)', transition: '0.15s', opacity: p.stock <= 0 ? 0.5 : 1, cursor: p.stock <= 0 ? 'not-allowed' : 'pointer'
            }}>
              {p.image ? <img src={p.image} alt="" style={{ width:'48px',height:'48px',borderRadius:'8px',objectFit:'cover',marginBottom:'4px' }} /> : null}
              <div style={{ fontWeight: 'bold', marginBottom: '4px', color: 'var(--text)' }}>{p.name}</div>
              <div style={{ color: 'var(--accent)', fontSize: '15px' }}>{formatMoney(getProductPrice(p))}</div>
              <div style={{ fontSize: '11px', color: p.stock <= 0 ? 'var(--danger)' : (p.stock <= p.reorderPoint ? 'var(--danger)' : 'var(--text2)') }}>
                {p.stock <= 0 ? 'نفد من المخزون' : `المخزون: ${p.stock} ${p.unit}`}
              </div>
            </button>
          ))}
        </div>
      </div>

      <div style={{ width: '400px', background: 'var(--bg2)', padding: '16px', display: 'flex', flexDirection: 'column', borderRight: '1px solid var(--bg3)' }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '12px' }}>
          <h2 style={{ fontSize: '14px' }}>فاتورة البيع</h2>
          {cart.length > 0 && <button onClick={() => setCart([])} style={{
            background: 'transparent', color: 'var(--text2)', border: '1px solid var(--bg3)',
            borderRadius: '6px', padding: '4px 10px', fontSize: '11px', cursor: 'pointer'
          }}>تفريغ</button>}
        </div>

        <div style={{ flex: 1, overflow: 'auto', marginBottom: '12px' }}>
          {cart.map(item => (
            <div key={item.productId} style={{ display: 'flex', alignItems: 'center', gap: '8px', padding: '8px', background: 'var(--bg)', borderRadius: '8px', marginBottom: '4px' }}>
              <div style={{ flex: 1 }}>
                <div style={{ fontSize: '13px', color: 'var(--text)' }}>{item.name}</div>
                <div style={{ fontSize: '11px', color: 'var(--text2)' }}>{formatMoney(item.unitPrice)} × {item.quantity}</div>
              </div>
              <div style={{ display: 'flex', gap: '4px', alignItems: 'center' }}>
                <button onClick={() => { const p = productMapRef.current.byId[item.productId]; const step = p && FRACTIONAL_UNITS.includes(p.unit) ? FRACTION_STEP : 1; const n = item.quantity - step; if (n <= 0) { setCart(c => c.filter(i => i.productId !== item.productId)) } else { updateCartItem(item.productId, n) } }}
                  style={{ background: 'var(--bg3)', color: 'var(--text)', width: '24px', height: '24px', borderRadius: '4px', fontSize: '12px' }}>-</button>
                <input type="text" inputMode="decimal"
                  value={editingQty[item.productId] !== undefined ? editingQty[item.productId] : item.quantity}
                  onInput={e => setEditingQty(d => ({ ...d, [item.productId]: e.target.value }))}
                  onBlur={e => { const v = e.target.value; setEditingQty(d => { const n = { ...d }; delete n[item.productId]; return n }); if (v.trim() === '' || Number(v) <= 0) { setCart(c => c.filter(i => i.productId !== item.productId)) } else { updateCartItem(item.productId, Number(v)) } }}
                  onKeyDown={e => { if (e.key === 'Enter') e.target.blur() }}
                  style={{ width: '70px', textAlign: 'center', fontSize: '13px', fontWeight: 'bold', background: 'var(--bg)', color: 'var(--text)', border: '1px solid var(--bg3)', borderRadius: '4px', padding: '4px' }} />
                <button onClick={() => { const p = productMapRef.current.byId[item.productId]; const step = p && FRACTIONAL_UNITS.includes(p.unit) ? FRACTION_STEP : 1; updateCartItem(item.productId, item.quantity + step) }}
                  style={{ background: 'var(--bg3)', color: 'var(--text)', width: '24px', height: '24px', borderRadius: '4px', fontSize: '12px' }}>+</button>
              </div>
              <div style={{ fontSize: '13px', fontWeight: 'bold', width: '70px', textAlign: 'left' }}>
                {formatMoney(item.unitPrice * item.quantity)}
              </div>
            </div>
          ))}
          {cart.length === 0 && <div style={{ color: 'var(--text2)', fontSize: '13px', textAlign: 'center', padding: '20px' }}>السلة فارغة</div>}
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
            <span style={{ cursor: 'pointer', userSelect: 'none' }} onClick={() => setTaxEnabled(!taxEnabled)} title="اضغط لتفعيل/إلغاء الضريبة">
              {taxEnabled ? 'الضريبة' : 'الضريبة (ملغية)'}
            </span><span>{formatMoney(tax)}</span>
          </div>
          <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '18px', fontWeight: 'bold', marginBottom: '12px' }}>
            <span>الإجمالي</span><span style={{ color: 'var(--success)' }}>{formatMoney(total)}</span>
          </div>

          <div style={{ display: 'flex', gap: '6px', marginBottom: '8px' }}>
            {['cash','card','credit'].map(m => (
              <button key={m} type="button" onClick={() => { setPaymentMethod(m); if (m === 'cash') setPaid(total) }}
                style={{
                  flex: 1, padding: '10px', borderRadius: '8px', fontSize: '13px', fontWeight: 'bold',
                  background: paymentMethod === m
                    ? (m === 'cash' ? 'var(--success)' : m === 'card' ? '#3b82f6' : 'var(--warning)')
                    : 'var(--bg3)',
                  color: paymentMethod === m ? '#fff' : 'var(--text)'
                }}>
                {m === 'cash' ? 'نقداً' : m === 'card' ? 'بطاقة' : 'آجل'}
              </button>
            ))}
          </div>

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
                  رصيد مستحق من العميل: {formatMoney(creditRemaining)}
                </div>
              )}
            </div>
          )}

          <div style={{ position: 'relative' }}>
            <div style={{ display: 'flex', gap: '6px' }}>
              <input placeholder="اسم العميل" value={customerName}
                onInput={e => handleCustomerInput(e.target.value)}
                onFocus={() => { if (customerName.length > 0) setShowCustomerList(true) }}
                onBlur={() => setTimeout(() => setShowCustomerList(false), 200)}
                onKeyDown={e => {
                  const list = filteredCustomers.slice(0, 10)
                  if (e.key === 'ArrowDown') {
                    e.preventDefault()
                    setCustomerListIndex(i => Math.min(i + 1, list.length - 1))
                  } else if (e.key === 'ArrowUp') {
                    e.preventDefault()
                    setCustomerListIndex(i => Math.max(i - 1, -1))
                  } else if (e.key === 'Enter' || e.key === 'Tab') {
                    const idx = customerListIndex >= 0 ? customerListIndex : 0
                    if (list[idx]) {
                      e.preventDefault()
                      selectCustomer(list[idx])
                    }
                  }}}
                ref={customerRef}
                style={{ flex: 1, marginBottom: '8px' }} />
              <input placeholder="رقم العميل" value={customerPhone}
                  onInput={e => {
                    const v = e.target.value
                    setCustomerPhone(v); setCustomerCredit(0); setCustomerDebt(0)
                    setCustomerListIndex(-1)
                    if (v.length === 0) { setShowCustomerList(false); return }
                    const matches = customers.filter(c => c.name.includes(v) || c.phone?.includes(v))
                    setShowCustomerList(matches.length > 0)
                  }}
                  onFocus={() => { if (customerPhone.length > 0) setShowCustomerList(true) }}
                  onKeyDown={e => {
                    const list = filteredCustomers.slice(0, 10)
                    if (e.key === 'ArrowDown') {
                      e.preventDefault()
                      setCustomerListIndex(i => Math.min(i + 1, list.length - 1))
                    } else if (e.key === 'ArrowUp') {
                      e.preventDefault()
                      setCustomerListIndex(i => Math.max(i - 1, -1))
                    } else if (e.key === 'Enter' || e.key === 'Tab') {
                      const idx = customerListIndex >= 0 ? customerListIndex : 0
                      if (list[idx]) {
                        e.preventDefault()
                        selectCustomer(list[idx])
                      }
                    }}}
                style={{ flex: 1, marginBottom: '8px' }} />
            </div>
            {showCustomerList && filteredCustomers.length > 0 && (
              <div style={{
                position: 'absolute', top: '100%', left: 0, right: 0, zIndex: 100,
                background: 'var(--bg)', border: '1px solid var(--bg3)', borderRadius: '8px',
                maxHeight: '160px', overflow: 'auto'
              }}>
                {filteredCustomers.slice(0, 10).map((c, i) => (
                  <button key={c._id} type="button" onClick={() => selectCustomer(c)}
                    style={{
                      display: 'block', width: '100%', textAlign: 'right', padding: '8px 12px',
                      background: i === customerListIndex ? 'var(--bg2)' : 'transparent',
                      color: 'var(--text)', fontSize: '13px', borderBottom: '1px solid var(--bg2)'
                    }}>
                    <div style={{ fontSize: '13px', color: 'var(--text)' }}>{c.name} {c.phone ? `(${c.phone})` : ''}</div>
                    <div style={{ fontSize: '11px', color: 'var(--text2)' }}>
                      {(c.totalDebt||0)-(c.totalPaid||0) > 0
                        ? <span style={{ color: 'var(--danger)' }}>رصيد مستحق من العميل: {((c.totalDebt||0)-(c.totalPaid||0)).toFixed(2)}</span>
                        : (c.totalPaid||0)-(c.totalDebt||0) > 0
                        ? <span style={{ color: 'var(--success)' }}>دين مستحق للعميل: {((c.totalPaid||0)-(c.totalDebt||0)).toFixed(2)}</span>
                        : <span>لا يوجد دين</span>}
                    </div>
                  </button>
                ))}
              </div>
            )}
          </div>
          {customerDebt > 0 && (
            <div style={{ fontSize: '11px', color: 'var(--danger)', marginBottom: '8px', fontWeight: 'bold' }}>
              رصيد مستحق من العميل: {customerDebt.toFixed(2)}
            </div>
          )}
          {customerCredit > 0 && (
            <div style={{ fontSize: '11px', color: 'var(--success)', marginBottom: '8px', fontWeight: 'bold' }}>
              دين مستحق للعميل: {customerCredit.toFixed(2)} - سيتم خصمه تلقائياً
            </div>
          )}
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
          <input type="number" placeholder="رصيد بداية الوردية" value={startBalance}
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
            <div style={{ fontSize: '13px', fontWeight: 'bold', marginBottom: '8px', color: 'var(--text)' }}>ملخص الوردية</div>
            <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '13px', marginBottom: '4px' }}>
              <span style={{ color: 'var(--text2)' }}>رصيد البداية</span><span style={{ fontWeight: 'bold' }}>{activeShift?.startingBalance?.toFixed(2)}</span>
            </div>
            <div style={{ height: '1px', background: 'var(--bg3)', margin: '6px 0' }} />
            <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '13px', marginBottom: '4px' }}>
              <span style={{ color: 'var(--text2)' }}>مبيعات نقداً</span><span style={{ color: 'var(--success)', fontWeight: 'bold' }}>+{shiftSales.cashTotal?.toFixed(2)}</span>
            </div>
            {shiftSales.cardTotal > 0 && <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '13px', marginBottom: '4px' }}>
              <span style={{ color: 'var(--text2)' }}>مبيعات بطاقة</span><span style={{ color: 'var(--accent)', fontWeight: 'bold' }}>+{shiftSales.cardTotal?.toFixed(2)}</span>
            </div>}
            {shiftSales.creditTotal > 0 && <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '13px', marginBottom: '4px' }}>
              <span style={{ color: 'var(--text2)' }}>مدفوعات آجلة</span><span style={{ color: '#8b5cf6', fontWeight: 'bold' }}>+{shiftSales.creditTotal?.toFixed(2)}</span>
            </div>}
            {shiftSales.expensesTotal > 0 && <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '13px', marginBottom: '4px' }}>
              <span style={{ color: 'var(--text2)' }}>مصروفات</span><span style={{ color: '#f97316', fontWeight: 'bold' }}>-{shiftSales.expensesTotal?.toFixed(2)}</span>
            </div>}
            {shiftSales.withdrawalsTotal > 0 && <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '13px', marginBottom: '4px' }}>
              <span style={{ color: 'var(--text2)' }}>مسحوبات نقداً</span><span style={{ color: '#ef4444', fontWeight: 'bold' }}>-{shiftSales.withdrawalsTotal?.toFixed(2)}</span>
            </div>}
            {shiftSales.cardWithdrawalsTotal > 0 && <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '13px', marginBottom: '4px' }}>
              <span style={{ color: 'var(--text2)' }}>مسحوبات بطاقة</span><span style={{ color: '#ef4444', fontWeight: 'bold' }}>-{shiftSales.cardWithdrawalsTotal?.toFixed(2)}</span>
            </div>}
            {shiftSales.returnsTotal > 0 && <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '13px', marginBottom: '4px' }}>
              <span style={{ color: 'var(--text2)' }}>مرتجعات</span><span style={{ color: '#ef4444', fontWeight: 'bold' }}>-{shiftSales.returnsTotal?.toFixed(2)}</span>
            </div>}
            <div style={{ height: '1px', background: 'var(--bg3)', margin: '6px 0' }} />
            <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '13px' }}>
              <span style={{ color: 'var(--text2)' }}>عدد الفواتير</span><span>{shiftSales.count}</span>
            </div>
            <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '13px', fontWeight: 'bold' }}>
              <span>الكاش المتوقع بالدرج</span><span style={{ color: 'var(--accent)' }}>
                {((activeShift?.startingBalance || 0) + (shiftSales.cashTotal || 0) + (shiftSales.creditTotal || 0) - (shiftSales.expensesTotal || 0) - (shiftSales.withdrawalsTotal || 0)).toFixed(2)}
              </span>
            </div>
            {(shiftSales.cardTotal > 0 || shiftSales.cardWithdrawalsTotal > 0) && <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '13px', fontWeight: 'bold', marginTop: '4px' }}>
              <span>البطاقة المتوقعة</span><span style={{ color: 'var(--accent)' }}>
                {((shiftSales.cardTotal || 0) - (shiftSales.cardWithdrawalsTotal || 0)).toFixed(2)}
              </span>
            </div>}
          </div>
          <div style={{ background: 'var(--bg)', borderRadius: '8px', padding: '12px' }}>
            <div style={{ fontSize: '13px', fontWeight: 'bold', marginBottom: '8px', color: 'var(--text)' }}>رصيد الكاش في الدرج</div>
            <input type="number" placeholder="أدخل رصيد الكاش الفعلي" value={endCashBalance}
              onInput={e => setEndCashBalance(e.target.value)}
              style={{ width: '100%', background: 'var(--bg2)', color: 'var(--text)', border: '1px solid var(--bg3)', borderRadius: '8px', padding: '10px', marginBottom: '6px' }} />
            {endCashBalance !== '' && endCashBalance !== undefined && (() => {
              const num = Number(endCashBalance)
              if (isNaN(num)) return <div style={{ color:'var(--danger)', fontSize:'13px', textAlign:'center' }}>الرجاء إدخال رقم صحيح</div>
              const expected = (activeShift?.startingBalance || 0) + (shiftSales.cashTotal || 0) + (shiftSales.creditTotal || 0) - (shiftSales.expensesTotal || 0) - (shiftSales.withdrawalsTotal || 0)
              const diff = num - expected
              if (Math.abs(diff) < 0.005) return <div style={{ color:'var(--success)', fontSize:'13px', textAlign:'center' }}>الكاش مطابق</div>
              if (diff < 0) return <div style={{ color:'var(--danger)', fontSize:'13px', textAlign:'center' }}>عجز كاش: {Math.abs(diff).toFixed(2)}</div>
              return <div style={{ color:'#f59e0b', fontSize:'13px', textAlign:'center' }}>زيادة كاش: {diff.toFixed(2)}</div>
            })()}
          </div>
          {(shiftSales.cardTotal > 0 || shiftSales.cardWithdrawalsTotal > 0) && <div style={{ background: 'var(--bg)', borderRadius: '8px', padding: '12px' }}>
            <div style={{ fontSize: '13px', fontWeight: 'bold', marginBottom: '8px', color: 'var(--text)' }}>رصيد البطاقة</div>
            <input type="number" placeholder="أدخل إجمالي البطاقة" value={endCardBalance}
              onInput={e => setEndCardBalance(e.target.value)}
              style={{ width: '100%', background: 'var(--bg2)', color: 'var(--text)', border: '1px solid var(--bg3)', borderRadius: '8px', padding: '10px', marginBottom: '6px' }} />
            {endCardBalance !== '' && endCardBalance !== undefined && (() => {
              const num = Number(endCardBalance)
              if (isNaN(num)) return <div style={{ color:'var(--danger)', fontSize:'13px', textAlign:'center' }}>الرجاء إدخال رقم صحيح</div>
              const expected = (shiftSales.cardTotal || 0) - (shiftSales.cardWithdrawalsTotal || 0)
              const diff = num - expected
              if (Math.abs(diff) < 0.005) return <div style={{ color:'var(--success)', fontSize:'13px', textAlign:'center' }}>البطاقة مطابقة</div>
              if (diff < 0) return <div style={{ color:'var(--danger)', fontSize:'13px', textAlign:'center' }}>عجز بطاقة: {Math.abs(diff).toFixed(2)}</div>
              return <div style={{ color:'#f59e0b', fontSize:'13px', textAlign:'center' }}>زيادة بطاقة: {diff.toFixed(2)}</div>
            })()}
          </div>}
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

      <Modal open={!!receipt} onClose={() => { setReceipt(null); setCart([]); setPaid(''); setCreditPaid(''); setDiscount(''); setNote(''); setCustomerName(''); setCustomerPhone(''); debouncedReload() }} title="فاتورة" width="350px">
        {receipt && (
          <div style={{ fontSize: '12px', textAlign: 'center' }} id="receipt-content">
            {receipt.settings?.showBusinessName !== false && <div style={{ fontWeight: 'bold', fontSize: '16px', marginBottom: '2px' }}>{receipt.settings?.businessName || 'SMART X'}</div>}
            {receipt.settings?.showLogo !== false && receipt.settings?.logoDataUrl && <div style={{ marginBottom: '4px' }}><img src={receipt.settings.logoDataUrl} alt="logo" style={{ maxHeight: '50px' }} /></div>}
            {receipt.settings?.showPhone !== false && receipt.settings?.phone && <div style={{ color: 'var(--text2)', fontSize: '11px' }}>هاتف: {receipt.settings.phone}</div>}
            {receipt.settings?.showEmail !== false && receipt.settings?.email && <div style={{ color: 'var(--text2)', fontSize: '11px' }}>بريد: {receipt.settings.email}</div>}
            {receipt.settings?.showAddress !== false && receipt.settings?.address && <div style={{ color: 'var(--text2)', fontSize: '11px' }}>{receipt.settings.address}</div>}
            {receipt.settings?.showCommercialReg && receipt.settings?.commercialRegistration && <div style={{ color: 'var(--text2)', fontSize: '11px' }}>سجل تجاري: {receipt.settings.commercialRegistration}</div>}
            {receipt.settings?.showTaxReg && receipt.settings?.taxNumber && <div style={{ color: 'var(--text2)', fontSize: '11px' }}>رقم ضريبي: {receipt.settings.taxNumber}</div>}
            <div style={{ color: 'var(--text2)', margin: '6px 0 10px' }}>فاتورة #{receipt.invoiceNo}</div>
            {receipt.paymentMethod && <div style={{ color: 'var(--text)', fontSize: '12px', fontWeight: 'bold', marginBottom: '4px' }}>نوع الدفع: {receipt.paymentMethod === 'credit' ? 'آجل' : receipt.paymentMethod === 'card' ? 'بطاقة' : 'نقداً'}</div>}
            {receipt.paymentMethod === 'credit' && receipt.customerName && <div style={{ color: 'var(--danger)', fontSize: '12px', fontWeight: 'bold', marginBottom: '4px' }}>رصيد مستحق من العميل: {formatMoney(receipt.total - (receipt.paid || 0))}</div>}
            {receipt.settings?.showProductsTable !== false && (<>
            <div style={{ borderTop: '1px dashed var(--bg3)', margin: '8px 0' }}></div>
            {receipt.items?.map((item, i) => (
              <div key={i} style={{ display: 'flex', justifyContent: 'space-between', padding: '2px 0' }}>
                <span>{item.name} × {item.quantity}</span>
                <span>{(item.unitPrice * item.quantity)?.toFixed(2)}</span>
              </div>
            ))}
            <div style={{ borderTop: '1px dashed var(--bg3)', margin: '8px 0' }}></div>
            </>)}
            {receipt.settings?.showTotals !== false && (<>
            <div style={{ display: 'flex', justifyContent: 'space-between' }}><span>المجموع</span><span>{formatMoney(receipt.subtotal)}</span></div>
            {receipt.discount > 0 && <div style={{ display: 'flex', justifyContent: 'space-between' }}><span>الخصم</span><span style={{ color: 'var(--danger)' }}>-{formatMoney(receipt.discount)}</span></div>}
            {receipt.tax > 0 && <div style={{ display: 'flex', justifyContent: 'space-between' }}><span>الضريبة</span><span>{formatMoney(receipt.tax)}</span></div>}
            <div style={{ display: 'flex', justifyContent: 'space-between', fontWeight: 'bold', fontSize: '14px' }}><span>الإجمالي</span><span style={{ color: 'var(--success)' }}>{formatMoney(receipt.total)}</span></div>
            </>)}
            {receipt.previousDebt > 0 && <div style={{ display: 'flex', justifyContent: 'space-between' }}><span style={{ color: 'var(--danger)' }}>رصيد مستحق من العميل</span><span style={{ color: 'var(--danger)' }}>{formatMoney(receipt.previousDebt)}</span></div>}
            {receipt.previousCredit > 0 && <div style={{ display: 'flex', justifyContent: 'space-between' }}><span style={{ color: 'var(--success)' }}>دين مستحق للعميل</span><span style={{ color: 'var(--success)' }}>-{formatMoney(receipt.previousCredit)}</span></div>}
            {receipt.settings?.showPaid !== false && receipt.paid > 0 && <div style={{ display: 'flex', justifyContent: 'space-between' }}><span>المدفوع</span><span>{formatMoney(receipt.paid)}</span></div>}
            {(() => {
              const rem = Math.max(0, (receipt.total || 0) - (receipt.paid || 0))
              const totalRem = rem + (receipt.previousDebt || 0) - (receipt.previousCredit || 0)
              if (totalRem <= 0) return null
              return <div style={{ display: 'flex', justifyContent: 'space-between', fontWeight: 'bold', borderTop: '1px dashed var(--bg3)', paddingTop: '4px', marginTop: '2px' }}>
                <span>إجمالي الرصيد المتبقي</span><span style={{ color: 'var(--danger)' }}>{formatMoney(totalRem)}</span>
              </div>
            })()}
            {receipt.settings?.showClientInfo !== false && receipt.customerName && <div style={{ marginTop: '8px', color: 'var(--text2)', fontSize: '11px' }}>
              <div style={{ fontWeight: 'bold', fontSize: '13px', color: 'var(--text)' }}>{receipt.customerName}</div>
              {receipt.customerPhone && <div>الهاتف: {receipt.customerPhone}</div>}
              {(() => {
                if (!customers || !receipt.customerName) return null
                const c = customers.find(x => x.name === receipt.customerName)
                if (!c) return null
                return <>
                  {c.commercialReg && <div>سجل تجاري: {c.commercialReg}</div>}
                  {c.taxReg && <div>سجل ضريبي: {c.taxReg}</div>}
                  {c.address && <div>العنوان: {c.address}</div>}
                </>
              })()}
            </div>}
            {receipt.settings?.showNotes !== false && receipt.note && <div style={{ marginTop: '8px', color: '#f97316', fontSize: '11px' }}>{receipt.note}</div>}
            {receipt.settings?.showCashier !== false && receipt.cashierName && <div style={{ marginTop: '6px', color: 'var(--text2)', fontSize: '11px' }}>الكاشير: {receipt.cashierName}</div>}
            {receipt.settings?.showReceiptFooter !== false && receipt.settings?.receiptFooter && <div style={{ marginTop: '10px', borderTop: '1px dashed var(--bg3)', paddingTop: '8px', color: 'var(--text2)', fontSize: '11px' }}>{receipt.settings.receiptFooter}</div>}
            <button onClick={() => {
              if (receipt.settings?.printDefaultSize === 'a4') {
                printA4(<PrintTemplateA4 type="sale" data={receipt} settings={receipt.settings} customers={receipt.customers} />)
              } else {
                window.print()
              }
            }}
              style={{ marginTop: '16px', background: 'var(--accent)', color: '#fff', padding: '10px 24px', borderRadius: '8px', fontSize: '13px', fontWeight: 'bold', width: '100%' }}>
              {receipt.settings?.printDefaultSize === 'a4' ? 'كبير (A4)' : 'طباعة'}
            </button>
          </div>
        )}
      </Modal>

      <Modal open={showReturnModal} onClose={() => { setShowReturnModal(false); setSelectedReturnSale(null); setReturnItems([]); setReturnSearch(''); setReturnSales([]); setReturnPaymentMethod('cash'); setReturnRefundCash(false); setCustomerPaidForSale(0) }} title="المرتجع" width="450px">
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
                    color: 'var(--accent)', border: '1px solid var(--text2)'
                  }}>
                    #{s.invoiceNo} - {formatMoney(s.total)} {s.customerName ? `(${s.customerName})` : ''}
                  </button>
                ))
              ) : returnSearch.length >= 1 ? (
                <div style={{ color: 'var(--text2)', padding: '20px', textAlign: 'center', width: '100%' }}>لا توجد نتائج</div>
              ) : (
                <div style={{ color: 'var(--text2)', padding: '20px', textAlign: 'center', width: '100%', fontSize: '12px' }}>ابدأ الكتابة للبحث...</div>
              )}
            </div>
          </div>
        ) : (
          <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
            <div style={{ fontSize: '13px', color: 'var(--text2)', marginBottom: '8px' }}>إرجاع من فاتورة #{selectedReturnSale.invoiceNo}</div>
            {returnItems.map((item, i) => (
              <div key={item.productId} style={{ display: 'flex', alignItems: 'center', gap: '8px', padding: '8px', background: 'var(--bg)', borderRadius: '8px' }}>
                <div style={{ flex: 1 }}>
                <div style={{ fontSize: '13px', color: 'var(--text)' }}>{item.name}</div>
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
            {selectedReturnSale?.paymentMethod === 'credit' && (
              <div style={{ fontSize: '12px', color: 'var(--text2)', padding: '4px 0' }}>
                المبلغ المدفوع من العميل: <strong style={{ color: 'var(--text)' }}>{formatMoney(customerPaidForSale)}</strong>
              </div>
            )}
            <input placeholder="سبب الإرجاع (اختياري)" value={returnReason}
              onInput={e => setReturnReason(e.target.value)}
              style={{ width: '100%' }} />
            <select value={returnPaymentMethod} onChange={e => setReturnPaymentMethod(e.target.value)}
              style={{ width: '100%' }}>
              {(() => {
                const opts = ['cash', 'card', 'customer_balance']
                const first = selectedReturnSale?.paymentMethod === 'credit' ? 'customer_balance' : (selectedReturnSale?.paymentMethod || 'cash')
                opts.sort((a, b) => a === first ? -1 : b === first ? 1 : 0)
                return opts.map(v => (
                  <option key={v} value={v}>{v === 'cash' ? 'نقداً' : v === 'card' ? 'بطاقة' : 'تضاف إلى رصيد العميل'}</option>
                ))
              })()}
            </select>
            <button onClick={handleReturnConfirm}
              style={{ width: '100%', padding: '10px', background: 'var(--warning)', color: '#fff', borderRadius: '8px', fontSize: '14px', fontWeight: 'bold' }}>
              تأكيد الإرجاع
            </button>
          </div>
        )}
      </Modal>

      <Modal open={showExpenseModal} onClose={() => { setShowExpenseModal(false); setExpenseAmount(''); setExpenseNote(''); setExpensePaymentMethod('cash') }} title="تسجيل مصروف" width="380px">
        <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
          <input type="number" placeholder="المبلغ" value={expenseAmount}
            onInput={e => setExpenseAmount(e.target.value)}
            style={{ width: '100%' }} autoFocus />
          <input placeholder="بيان المصروف" value={expenseNote}
            onInput={e => setExpenseNote(e.target.value)}
            style={{ width: '100%' }} />
          <select value={expensePaymentMethod} onChange={e => setExpensePaymentMethod(e.target.value)}
            style={{ width: '100%' }}>
            <option value="cash">نقداً</option>
            <option value="card">بطاقة</option>
          </select>
          <button onClick={handleAddExpense}
            style={{ width: '100%', padding: '10px', background: '#f59e0b', color: '#fff', borderRadius: '8px', fontSize: '14px', fontWeight: 'bold' }}>
            تسجيل
          </button>
        </div>
      </Modal>
      <Modal open={showWithdrawModal} onClose={() => { setShowWithdrawModal(false); setWithdrawAmount(''); setWithdrawNote(''); setWithdrawCategory('operational') }} title="سحب من الخزينة" width="380px">
        <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
          <input type="number" placeholder="المبلغ" value={withdrawAmount}
            onInput={e => setWithdrawAmount(e.target.value)}
            style={{ width: '100%' }} autoFocus />
          <input placeholder="السبب" value={withdrawNote}
            onInput={e => setWithdrawNote(e.target.value)}
            style={{ width: '100%' }} />
          <select value={withdrawCategory} onChange={e => setWithdrawCategory(e.target.value)}
            style={{ width: '100%' }}>
            <option value="operational">سحب تشغيلي</option>
            <option value="personal">سحب شخصي</option>
          </select>
          <select value={withdrawPaymentMethod} onChange={e => setWithdrawPaymentMethod(e.target.value)}
            style={{ width: '100%' }}>
            <option value="cash">نقداً</option>
            <option value="card">بطاقة</option>
          </select>
          <button onClick={handleWithdraw}
            style={{ width: '100%', padding: '10px', background: '#ef4444', color: '#fff', borderRadius: '8px', fontSize: '14px', fontWeight: 'bold' }}>
            تأكيد السحب
          </button>
        </div>
      </Modal>
    </div>
  )
}
