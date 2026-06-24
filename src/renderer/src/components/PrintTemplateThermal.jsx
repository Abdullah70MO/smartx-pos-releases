import { formatMoney } from '../utils/money'
import { formatDateTime } from '../utils/date'

export default function PrintTemplateThermal({ data, settings }) {
  return (
    <div style={{ width: '100%', fontFamily: "'Segoe UI', Tahoma, Arial, sans-serif", fontSize: '12px', color: '#000', direction: 'rtl' }}>
      {settings?.showLogo !== false && settings?.logoDataUrl && <div className="center"><img src={settings.logoDataUrl} alt="logo" style={{ maxHeight: '40px', marginBottom: '4px' }} /></div>}
      {settings?.showBusinessName !== false && <div className="center bold" style={{ fontSize: '14px', marginBottom: '2px' }}>{settings?.businessName || 'SMART X'}</div>}
      {settings?.showPhone !== false && settings?.phone && <div className="center" style={{ fontSize: '10px' }}>هاتف: {settings.phone}</div>}
      {settings?.showAddress !== false && settings?.address && <div className="center" style={{ fontSize: '10px' }}>{settings.address}</div>}
      <hr />
      <div className="center bold" style={{ marginBottom: '4px' }}>فاتورة #{data.invoiceNo}</div>
      <div className="center" style={{ fontSize: '10px', marginBottom: '4px' }}>{formatDateTime(data.createdAt)}</div>
      {data.customerName && <div className="right" style={{ fontSize: '11px', marginBottom: '4px' }}>العميل: {data.customerName}</div>}
      <hr />
      <table>
        <tbody>
          {data.items?.map((item, i) => (
            <tr key={i}>
              <td className="right">{item.name}</td>
              <td className="center">{item.quantity}</td>
              <td className="left">{formatMoney(item.unitPrice)}</td>
              <td className="left">{formatMoney(item.unitPrice * item.quantity)}</td>
            </tr>
          ))}
        </tbody>
      </table>
      <hr />
      <table style={{ width: '100%' }}>
        <tbody>
          <tr><td className="right">المجموع</td><td className="left">{formatMoney(data.subtotal)}</td></tr>
          {data.discount > 0 && <tr><td className="right" style={{ color: '#d00' }}>الخصم</td><td className="left" style={{ color: '#d00' }}>-{formatMoney(data.discount)}</td></tr>}
          {data.tax > 0 && <tr><td className="right">الضريبة</td><td className="left">{formatMoney(data.tax)}</td></tr>}
          <tr><td className="right bold">الإجمالي</td><td className="left bold">{formatMoney(data.total)}</td></tr>
          {data.previousDebt > 0 && <tr><td className="right" style={{ color: '#d00' }}>رصيد مستحق من العميل</td><td className="left" style={{ color: '#d00' }}>{formatMoney(data.previousDebt)}</td></tr>}
          {data.previousCredit > 0 && <tr><td className="right" style={{ color: '#080' }}>دين مستحق للعميل</td><td className="left" style={{ color: '#080' }}>-{formatMoney(data.previousCredit)}</td></tr>}
          {data.paid > 0 && <tr><td className="right">المدفوع</td><td className="left">{formatMoney(data.paid)}</td></tr>}
          {data.paymentMethod === 'credit' && data.total > (data.paid || 0) && <tr><td className="right" style={{ color: '#d00' }}>رصيد مستحق من العميل</td><td className="left" style={{ color: '#d00' }}>{formatMoney(data.total - (data.paid || 0))}</td></tr>}
          {(() => {
            const rem = (data.total || 0) - (data.paid || 0)
            const totalRem = rem + (data.previousDebt || 0) - (data.previousCredit || 0)
            if (totalRem <= 0 && rem <= 0) return null
            return <tr style={{ fontWeight: 'bold' }}><td className="right">إجمالي الرصيد المتبقي</td><td className="left">{formatMoney(totalRem)}</td></tr>
          })()}
        </tbody>
      </table>
      <hr />
      {data.paymentMethod && <div className="center bold" style={{ marginTop: '4px', marginBottom: '2px' }}>نوع الدفع: {data.paymentMethod === 'credit' ? 'آجل' : data.paymentMethod === 'card' ? 'بطاقة' : 'نقداً'}</div>}
      {data.cashierName && <div className="center" style={{ fontSize: '10px', marginTop: '4px' }}>الكاشير: {data.cashierName}</div>}
      {settings?.showReceiptFooter !== false && settings?.receiptFooter && <div className="center" style={{ fontSize: '9px', marginTop: '8px', borderTop: '1px dashed #000', paddingTop: '4px' }}>{settings.receiptFooter}</div>}
    </div>
  )
}