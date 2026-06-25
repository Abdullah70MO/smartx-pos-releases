import { formatMoney } from '../utils/money'
import { formatDateTime } from '../utils/date'

export default function PrintTemplateThermal({ data, settings }) {
  const paymentLabel = data.paymentMethod === 'card' ? 'بطاقة' : data.paymentMethod === 'credit' ? 'آجل' : 'نقداً'

  return (
    <div style={{
      width: '100%', maxWidth: '80mm', margin: '0 auto', padding: '6px 4px',
      fontFamily: '"Cairo", "Segoe UI", Tahoma, Arial, sans-serif', fontSize: '11px', fontWeight: '400', lineHeight: '1.3',
      color: '#111', direction: 'rtl', background: '#fff'
    }}>
      {settings?.showLogo !== false && settings?.logoDataUrl && (
        <div style={{ textAlign: 'center', marginBottom: '4px' }}>
          <img src={settings.logoDataUrl} alt="logo" style={{ maxHeight: '34px', maxWidth: '100%' }} />
        </div>
      )}
      {settings?.showBusinessName !== false && (
        <div style={{ textAlign: 'center', fontWeight: '700', fontSize: '13px', marginBottom: '2px' }}>
          {settings?.businessName || 'SMART X'}
        </div>
      )}
      {settings?.showPhone !== false && settings?.phone && <div style={{ textAlign: 'center', fontSize: '9px', color: '#444' }}>هاتف: {settings.phone}</div>}
      {settings?.showAddress !== false && settings?.address && <div style={{ textAlign: 'center', fontSize: '9px', color: '#444' }}>{settings.address}</div>}

      <div style={{ borderTop: '1px dashed #999', margin: '6px 0 4px', paddingTop: '4px' }} />
      <div style={{ textAlign: 'center', fontWeight: '700', fontSize: '12px', marginBottom: '2px' }}>فاتورة #{data.invoiceNo}</div>
      <div style={{ textAlign: 'center', fontSize: '9px', color: '#666', marginBottom: '4px' }}>{formatDateTime(data.createdAt)}</div>
      {data.customerName && <div style={{ fontSize: '10px', marginBottom: '4px' }}>العميل: {data.customerName}</div>}
      <div style={{ textAlign: 'center', fontSize: '9px', marginBottom: '4px', color: '#555' }}>الطريقة: {paymentLabel}</div>

      <div style={{ borderTop: '1px dashed #999', margin: '4px 0' }} />
      {data.items?.map((item, i) => (
        <div key={i} style={{ marginBottom: '4px', paddingBottom: '4px', borderBottom: '1px dashed #eee' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', gap: '6px' }}>
            <div style={{ flex: 1, textAlign: 'right', fontWeight: '600', fontSize: '10px' }}>{item.name}</div>
            <div style={{ fontSize: '9px', whiteSpace: 'nowrap' }}>{item.quantity} × {formatMoney(item.unitPrice)}</div>
          </div>
          <div style={{ textAlign: 'left', fontSize: '9px', marginTop: '2px', color: '#444' }}>{formatMoney(item.unitPrice * item.quantity)}</div>
        </div>
      ))}

      <div style={{ borderTop: '1px dashed #999', margin: '4px 0' }} />
      <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '10px', padding: '2px 0' }}>
        <span>المجموع</span><span>{formatMoney(data.subtotal)}</span>
      </div>
      {data.discount > 0 && (
        <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '10px', padding: '2px 0', color: '#d00' }}>
          <span>الخصم</span><span>-{formatMoney(data.discount)}</span>
        </div>
      )}
      {data.tax > 0 && (
        <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '10px', padding: '2px 0' }}>
          <span>الضريبة</span><span>{formatMoney(data.tax)}</span>
        </div>
      )}
      <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '11px', fontWeight: '700', padding: '4px 0', borderTop: '1px solid #111' }}>
        <span>الإجمالي</span><span>{formatMoney(data.total)}</span>
      </div>
      {data.paid > 0 && (
        <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '10px', padding: '2px 0' }}>
          <span>المدفوع</span><span>{formatMoney(data.paid)}</span>
        </div>
      )}
      {data.paymentMethod === 'credit' && data.total > (data.paid || 0) && (
        <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '10px', padding: '2px 0', color: '#d00' }}>
          <span>الرصيد</span><span>{formatMoney(data.total - (data.paid || 0))}</span>
        </div>
      )}

      {data.cashierName && <div style={{ textAlign: 'center', fontSize: '9px', marginTop: '6px', color: '#555' }}>الكاشير: {data.cashierName}</div>}
      {settings?.showReceiptFooter !== false && settings?.receiptFooter && (
        <div style={{ textAlign: 'center', fontSize: '8px', marginTop: '6px', borderTop: '1px dashed #999', paddingTop: '4px', color: '#666' }}>
          {settings.receiptFooter}
        </div>
      )}
    </div>
  )
}