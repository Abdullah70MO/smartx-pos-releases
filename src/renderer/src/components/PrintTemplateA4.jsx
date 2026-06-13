import { formatMoney } from '../utils/money'
import { formatDate, formatDateTime } from '../utils/date'

export default function PrintTemplateA4({ type, data, settings, suppliers }) {
  const isSale = type === 'sale'
  const title = isSale ? 'فاتورة بيع' : 'فاتورة شراء'

  return (
    <div id="a4-print-content" style={{
      width: '210mm', minHeight: '297mm', padding: '15mm 20mm',
      fontFamily: 'inherit', fontSize: '12px', color: '#000', background: '#fff',
      direction: 'rtl', boxSizing: 'border-box', position: 'relative'
    }}>
      <div style={{ textAlign: 'center', marginBottom: '20px', borderBottom: '2px solid #000', paddingBottom: '10px' }}>
        {settings?.logoDataUrl && <img src={settings.logoDataUrl} alt="logo" style={{ maxHeight: '60px', marginBottom: '6px' }} />}
        <div style={{ fontWeight: 'bold', fontSize: '20px' }}>{settings?.businessName || 'SMART X'}</div>
        {settings?.phone && <div style={{ fontSize: '11px' }}>هاتف: {settings.phone}</div>}
        {settings?.email && <div style={{ fontSize: '11px' }}>بريد: {settings.email}</div>}
        {settings?.address && <div style={{ fontSize: '11px' }}>العنوان: {settings.address}</div>}
        {settings?.commercialRegistration && <div style={{ fontSize: '11px' }}>سجل تجاري: {settings.commercialRegistration}</div>}
        {settings?.taxNumber && <div style={{ fontSize: '11px' }}>رقم ضريبي: {settings.taxNumber}</div>}
      </div>

      <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '16px' }}>
        <div>
          <div style={{ fontWeight: 'bold', fontSize: '16px' }}>{title}</div>
          <div style={{ fontSize: '11px', marginTop: '4px' }}>رقم: #{data.invoiceNo}</div>
        </div>
        <div style={{ textAlign: 'left', fontSize: '11px' }}>
          <div>التاريخ: {formatDateTime(data.createdAt)}</div>
        </div>
      </div>

      {isSale ? (
        data.customerName ? (
          <div style={{ marginBottom: '16px', padding: '8px 12px', border: '1px solid #ccc', borderRadius: '4px', fontSize: '11px' }}>
            <strong>العميل: </strong>{data.customerName}
            {data.customerPhone && <span> - {data.customerPhone}</span>}
          </div>
        ) : null
      ) : (
        data.supplierName ? (
          <div style={{ marginBottom: '16px', padding: '8px 12px', border: '1px solid #ccc', borderRadius: '4px', fontSize: '11px' }}>
            <div><strong>المورد: </strong>{data.supplierName}</div>
            {data.supplierPhone && <div>الهاتف: {data.supplierPhone}</div>}
            {(() => {
              if (!suppliers || !data.supplierId) return null
              const s = suppliers.find(x => x._id === data.supplierId)
              if (!s) return null
              return <>
                {s.email && <div>البريد: {s.email}</div>}
                {s.commercialReg && <div>سجل تجاري: {s.commercialReg}</div>}
                {s.taxReg && <div>سجل ضريبي: {s.taxReg}</div>}
                {s.address && <div>العنوان: {s.address}</div>}
              </>
            })()}
          </div>
        ) : null
      )}

      <table style={{ width: '100%', borderCollapse: 'collapse', marginBottom: '16px', fontSize: '11px' }}>
        <thead>
          <tr style={{ borderBottom: '2px solid #000' }}>
            <th style={{ padding: '6px 4px', textAlign: 'center', width: '30px' }}>#</th>
            <th style={{ padding: '6px 4px', textAlign: 'right' }}>المنتج</th>
            <th style={{ padding: '6px 4px', textAlign: 'center', width: '50px' }}>الكمية</th>
            <th style={{ padding: '6px 4px', textAlign: 'center', width: '70px' }}>سعر الوحدة</th>
            <th style={{ padding: '6px 4px', textAlign: 'center', width: '80px' }}>الإجمالي</th>
          </tr>
        </thead>
        <tbody>
          {data.items?.map((item, i) => (
            <tr key={i} style={{ borderBottom: '1px solid #ddd' }}>
              <td style={{ padding: '4px', textAlign: 'center' }}>{i + 1}</td>
              <td style={{ padding: '4px', textAlign: 'right' }}>{item.name}</td>
              <td style={{ padding: '4px', textAlign: 'center' }}>{item.quantity}</td>
              <td style={{ padding: '4px', textAlign: 'center' }}>{formatMoney(isSale ? item.unitPrice : item.cost)}</td>
              <td style={{ padding: '4px', textAlign: 'center' }}>{formatMoney(isSale ? item.unitPrice * item.quantity : item.subtotal != null ? item.subtotal : item.cost * item.quantity)}</td>
            </tr>
          ))}
        </tbody>
      </table>

      <div style={{ width: '50%', marginRight: 'auto', fontSize: '11px' }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', padding: '3px 0' }}>
          <span>المجموع</span><span>{formatMoney(isSale ? data.subtotal : data.totalCost)}</span>
        </div>
        {data.discount > 0 && (
          <div style={{ display: 'flex', justifyContent: 'space-between', padding: '3px 0', color: '#d00' }}>
            <span>الخصم</span><span>-{formatMoney(data.discount)}</span>
          </div>
        )}
        {isSale && data.tax > 0 && (
          <div style={{ display: 'flex', justifyContent: 'space-between', padding: '3px 0' }}>
            <span>الضريبة</span><span>{formatMoney(data.tax)}</span>
          </div>
        )}
        <div style={{ display: 'flex', justifyContent: 'space-between', padding: '4px 0', borderTop: '2px solid #000', fontWeight: 'bold', fontSize: '13px' }}>
          <span>{isSale ? 'الإجمالي' : 'صافي الفاتورة'}</span><span>{formatMoney(isSale ? data.total : data.netCost)}</span>
        </div>
        {(data.paid || 0) > 0 && (
          <div style={{ display: 'flex', justifyContent: 'space-between', padding: '3px 0' }}>
            <span>المدفوع</span><span>{formatMoney(data.paid)}</span>
          </div>
        )}
        {((isSale && (data.paid || 0) < data.total) || (!isSale && (data.paid || 0) < data.netCost)) && (
          <div style={{ display: 'flex', justifyContent: 'space-between', padding: '3px 0', color: '#d00' }}>
            <span>الباقي</span><span>{formatMoney((isSale ? data.total : data.netCost) - (data.paid || 0))}</span>
          </div>
        )}
      </div>

      {data.note && (
        <div style={{ marginTop: '12px', padding: '8px', border: '1px solid #ccc', borderRadius: '4px', fontSize: '11px' }}>
          <strong>ملاحظة: </strong>{data.note}
        </div>
      )}

      {(data.cashierName || data.createdBy) && (
        <div style={{ marginTop: '16px', fontSize: '11px' }}>
          {data.cashierName ? `الكاشير: ${data.cashierName}` : `بواسطة: ${data.createdBy}`}
        </div>
      )}

      {settings?.receiptFooter && (
        <div style={{ position: 'absolute', bottom: '10mm', left: '20mm', right: '20mm', textAlign: 'center', fontSize: '10px', borderTop: '1px solid #ccc', paddingTop: '6px' }}>
          {settings.receiptFooter.split('\n').map((l, i) => <div key={i}>{l}</div>)}
        </div>
      )}
    </div>
  )
}
