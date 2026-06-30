import { useState, useEffect, useRef } from 'preact/hooks'
import api from '../api'
import { printBarcode } from '../utils/print'
import BarcodeSVG from './BarcodeSVG'
import { modalPrimaryBtn } from './ActionIcons'

export default function BarcodePreviewModal({ open, onClose }) {
  const [search, setSearch] = useState('')
  const [products, setProducts] = useState([])
  const [selected, setSelected] = useState(null)
  const [loading, setLoading] = useState(false)
  const [printing, setPrinting] = useState(false)
  const debounceRef = useRef(null)

  useEffect(() => {
    if (!open) { setSearch(''); setProducts([]); setSelected(null); return }
  }, [open])

  useEffect(() => {
    if (!search.trim()) { setProducts([]); return }
    clearTimeout(debounceRef.current)
    debounceRef.current = setTimeout(async () => {
      setLoading(true)
      try {
        const token = localStorage.getItem('token')
        const result = await api.listProducts(token, search.trim(), null, 0, 20)
        setProducts(result.data || [])
      } catch { setProducts([]) }
      setLoading(false)
    }, 300)
    return () => clearTimeout(debounceRef.current)
  }, [search])

  const labelSize = localStorage.getItem('barcodeLabelSize') || '50x30'
  const dims = labelSize.split('x').map(Number)
  const bw = Math.min(Number(dims[0]) * 3.78 * (Number(localStorage.getItem('barcodeScale')) || 1), 600)
  const bh = Math.min(Number(dims[1]) * 3.78 * (Number(localStorage.getItem('barcodeScale')) || 1), 400)
  const fontWeight = localStorage.getItem('barcodeFontWeight') || 'bold'

  if (!open) return null

  return (
    <div style={{
      position: 'fixed', inset: 0, zIndex: 1100, display: 'flex',
      alignItems: 'center', justifyContent: 'center',
      background: 'rgba(0,0,0,0.6)'
    }} onClick={onClose}>
      <div style={{
        background: '#fff', borderRadius: '16px', width: 'min(520px, 96vw)',
        maxHeight: '90vh', overflow: 'hidden', padding: '20px',
        display: 'flex', flexDirection: 'column', gap: '12px'
      }} onClick={e => e.stopPropagation()}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          <div style={{ fontSize: '18px', fontWeight: '700', color: '#111' }}>معاينة الباركود</div>
          <button onClick={onClose} style={{
            background: '#f3f4f6', color: '#111', fontSize: '16px',
            borderRadius: '50%', width: '32px', height: '32px', border: 'none',
            display: 'flex', alignItems: 'center', justifyContent: 'center', cursor: 'pointer'
          }}>✕</button>
        </div>

        <input
          placeholder="ابحث عن منتج..."
          value={search} onInput={e => { setSearch(e.target.value); setSelected(null) }}
          style={{ width: '100%', padding: '10px', fontSize: '14px', border: '1px solid #d1d5db', borderRadius: '8px', outline: 'none' }}
          autoFocus
        />

        {loading && <div style={{ textAlign: 'center', color: '#6b7280', fontSize: '13px' }}>جاري البحث...</div>}

        {!loading && products.length > 0 && !selected && (
          <div style={{ maxHeight: '240px', overflow: 'auto', border: '1px solid #e5e7eb', borderRadius: '8px' }}>
            {products.map((p, i) => (
              <div key={p._id || i} onClick={() => setSelected(p)} style={{
                padding: '10px 12px', cursor: 'pointer', fontSize: '13px', color: '#111',
                borderBottom: i < products.length - 1 ? '1px solid #f3f4f6' : 'none',
                display: 'flex', justifyContent: 'space-between', alignItems: 'center'
              }}>
                <span>{p.name}</span>
                <span style={{ color: '#6b7280', fontSize: '11px', direction: 'ltr' }}>{p.barcode || ''}</span>
              </div>
            ))}
          </div>
        )}

        {!loading && search.trim() && products.length === 0 && (
          <div style={{ textAlign: 'center', color: '#9ca3af', fontSize: '13px' }}>لا توجد منتجات</div>
        )}

        {selected && (
          <div style={{
            background: '#f9fafb', borderRadius: '8px', border: '1px solid #e5e7eb',
            padding: '16px', display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '8px'
          }}>
            {localStorage.getItem('barcodeShowName') !== 'false' && (
              <div style={{ fontSize: '13px', fontWeight, color: '#111827', textAlign: 'center' }}>{selected.name}</div>
            )}
            {localStorage.getItem('barcodeShowPrice') !== 'false' && selected.priceRetail != null && (
              <div style={{ fontSize: '11px', fontWeight, color: '#4b5563', textAlign: 'center' }}>{Number(selected.priceRetail).toFixed(2)} ج.م</div>
            )}
            {selected.barcode ? (
              <BarcodeSVG code={selected.barcode} width={bw} height={bh} />
            ) : (
              <div style={{ color: '#d00', fontSize: '12px' }}>لا يوجد باركود لهذا المنتج</div>
            )}
            <div style={{ fontSize: '11px', color: '#6b7280', fontFamily: 'monospace', direction: 'ltr' }}>{selected.barcode}</div>
            <button disabled={printing || !selected.barcode} onClick={async () => {
              setPrinting(true)
              try {
                await printBarcode(selected.barcode, { name: selected.name, price: selected.priceRetail })
              } catch (err) { alert('فشلت الطباعة: ' + err.message) }
              setPrinting(false)
            }} style={{ ...modalPrimaryBtn, width: '100%', marginTop: '4px' }}>
              {printing ? 'جاري...' : 'طباعة الباركود'}
            </button>
            <button onClick={() => setSelected(null)} style={{
              background: 'none', border: 'none', color: '#6b7280', fontSize: '12px', cursor: 'pointer', padding: '4px'
            }}>بحث عن منتج آخر</button>
          </div>
        )}
      </div>
    </div>
  )
}
