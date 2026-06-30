import { formatMoney } from '../utils/money'
import { formatDateTime } from '../utils/date'
import { generateQrSvg } from '../utils/qrcode'

export default function PrintTemplateA4({ type, data, settings, suppliers, customers }) {
  const isSale = type === 'sale'
  const title = isSale ? 'فاتورة بيع' : 'فاتورة شراء'
  const paymentLabel = data.paymentMethod === 'card' ? 'بطاقة' : data.paymentMethod === 'credit' ? 'آجل' : 'نقداً'
  const qrContent = settings?.showQR !== false
    ? generateQrSvg([
        `فاتورة #${data.invoiceNo}`,
        settings?.businessName || 'SMART X',
        `الإجمالي: ${formatMoney(isSale ? data.total : data.netCost)}`,
        formatDateTime(data.createdAt)
      ].join('\n'), 100)
    : null

  return (
    <div id="a4-print-content" style={{
      width: '210mm', minHeight: '297mm', padding: '15mm 18mm',
      fontFamily: '"Cairo", "Segoe UI", Tahoma, Arial, sans-serif', fontSize: '12px', fontWeight: '400', lineHeight: '1.35',
      color: '#111827', background: '#fff', direction: 'rtl', boxSizing: 'border-box', position: 'relative'
    }}>
      <div style={{ textAlign: 'center', marginBottom: '16px', borderBottom: '2px solid #111827', paddingBottom: '10px' }}>
        {settings?.showLogo !== false && settings?.logoDataUrl && <img src={settings.logoDataUrl} alt="logo" style={{ maxHeight: '56px', marginBottom: '6px' }} />}
        {settings?.showBusinessName !== false && <div style={{ fontWeight: '700', fontSize: '20px' }}>{settings?.businessName || 'SMART X'}</div>}
        {settings?.showPhone !== false && settings?.phone && <div style={{ fontSize: '11px', color: '#4b5563' }}>هاتف: {settings.phone}</div>}
        {settings?.showEmail !== false && settings?.email && <div style={{ fontSize: '11px', color: '#4b5563' }}>بريد: {settings.email}</div>}
        {settings?.showAddress !== false && settings?.address && <div style={{ fontSize: '11px', color: '#4b5563' }}>العنوان: {settings.address}</div>}
        {settings?.showCommercialReg && settings?.commercialRegistration && <div style={{ fontSize: '11px', color: '#4b5563' }}>سجل تجاري: {settings.commercialRegistration}</div>}
        {settings?.showTaxReg && settings?.taxNumber && <div style={{ fontSize: '11px', color: '#4b5563' }}>رقم ضريبي: {settings.taxNumber}</div>}
      </div>

      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '12px', padding: '8px 10px', background: '#f9fafb', border: '1px solid #e5e7eb', borderRadius: '6px' }}>
        <div>
          <div style={{ fontWeight: '700', fontSize: '15px' }}>{title} - {paymentLabel}</div>
          <div style={{ fontSize: '11px', marginTop: '3px', color: '#6b7280' }}>رقم: #{data.invoiceNo}</div>
        </div>
        <div style={{ textAlign: 'left', fontSize: '11px', color: '#6b7280' }}>
          <div>التاريخ: {formatDateTime(data.createdAt)}</div>
        </div>
      </div>

      {isSale && settings?.showClientInfo !== false ? (
        data.customerName ? (
          <div style={{ marginBottom: '12px', padding: '8px 10px', border: '1px solid #e5e7eb', borderRadius: '6px', fontSize: '11px', background: '#fcfdff' }}>
            <div style={{ fontWeight: '700', marginBottom: '4px' }}>العميل: {data.customerName}</div>
            {data.customerPhone && <div>الهاتف: {data.customerPhone}</div>}
            {(() => {
              if (!customers || !data.customerName) return null
              const c = customers.find(x => x.name === data.customerName)
              if (!c) return null
              return <>
                {c.commercialReg && <div>سجل تجاري: {c.commercialReg}</div>}
                {c.taxReg && <div>سجل ضريبي: {c.taxReg}</div>}
                {c.address && <div>العنوان: {c.address}</div>}
              </>
            })()}
          </div>
        ) : null
      ) : settings?.showSupplierInfo !== false ? (
        data.supplierName ? (
          <div style={{ marginBottom: '12px', padding: '8px 10px', border: '1px solid #e5e7eb', borderRadius: '6px', fontSize: '11px', background: '#f8fafc' }}>
            <div style={{ fontWeight: '700', marginBottom: '4px' }}>المورد: {data.supplierName}</div>
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
      ) : null}

      {settings?.showProductsTable !== false && (
        <table style={{ width: '100%', borderCollapse: 'collapse', marginBottom: '12px', fontSize: '11px' }}>
          <thead>
            <tr style={{ background: '#f3f4f6', borderBottom: '1px solid #d1d5db' }}>
              <th style={{ padding: '7px 4px', textAlign: 'center', width: '30px' }}>#</th>
              <th style={{ padding: '7px 4px', textAlign: 'right' }}>المنتج</th>
              <th style={{ padding: '7px 4px', textAlign: 'center', width: '52px' }}>الكمية</th>
              <th style={{ padding: '7px 4px', textAlign: 'center', width: '78px' }}>سعر الوحدة</th>
              <th style={{ padding: '7px 4px', textAlign: 'center', width: '84px' }}>الإجمالي</th>
            </tr>
          </thead>
          <tbody>
            {data.items?.map((item, i) => (
              <tr key={i} style={{ borderBottom: '1px solid #e5e7eb' }}>
                <td style={{ padding: '6px 4px', textAlign: 'center' }}>{i + 1}</td>
                <td style={{ padding: '6px 4px', textAlign: 'right' }}>{item.name}</td>
                <td style={{ padding: '6px 4px', textAlign: 'center' }}>{item.quantity}</td>
                <td style={{ padding: '6px 4px', textAlign: 'center' }}>{formatMoney(isSale ? item.unitPrice : item.cost)}</td>
                <td style={{ padding: '6px 4px', textAlign: 'center' }}>{formatMoney(isSale ? item.unitPrice * item.quantity : item.subtotal != null ? item.subtotal : item.cost * item.quantity)}</td>
              </tr>
            ))}
          </tbody>
        </table>
      )}

      {settings?.showTotals !== false && (
        <div style={{ width: '46%', marginRight: 'auto', fontSize: '11px', padding: '8px 10px', border: '1px solid #e5e7eb', borderRadius: '6px', background: '#f9fafb' }}>
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
          <div style={{ display: 'flex', justifyContent: 'space-between', padding: '4px 0', borderTop: '1px solid #d1d5db', fontWeight: '700', fontSize: '13px', marginTop: '3px' }}>
            <span>{isSale ? 'الإجمالي' : 'صافي الفاتورة'}</span><span>{formatMoney(isSale ? data.total : data.netCost)}</span>
          </div>
          {isSale && data.previousDebt > 0 && (
            <div style={{ display: 'flex', justifyContent: 'space-between', padding: '3px 0', color: '#d00' }}>
              <span>رصيد مستحق من العميل</span><span>{formatMoney(data.previousDebt)}</span>
            </div>
          )}
          {isSale && data.previousCredit > 0 && (
            <div style={{ display: 'flex', justifyContent: 'space-between', padding: '3px 0', color: '#080' }}>
              <span>دين مستحق للعميل</span><span>-{formatMoney(data.previousCredit)}</span>
            </div>
          )}
          {!isSale && data.previousCredit > 0 && (
            <div style={{ display: 'flex', justifyContent: 'space-between', padding: '3px 0', color: '#080' }}>
              <span>رصيد مستحق من المورد (خصم)</span><span>-{formatMoney(data.previousCredit)}</span>
            </div>
          )}
          {!isSale && data.previousDebt > 0 && (
            <div style={{ display: 'flex', justifyContent: 'space-between', padding: '3px 0', color: '#d00' }}>
              <span>دين مستحق للمورد (سابق)</span><span>{formatMoney(data.previousDebt)}</span>
            </div>
          )}
          {(data.paid || 0) > 0 && settings?.showPaid !== false && (
            <div style={{ display: 'flex', justifyContent: 'space-between', padding: '3px 0' }}>
              <span>المدفوع</span><span>{formatMoney(data.paid)}</span>
            </div>
          )}
          {data.change > 0 && (
            <div style={{ display: 'flex', justifyContent: 'space-between', padding: '3px 0', color: '#15803d' }}>
              <span>الباقي</span><span>{formatMoney(data.change)}</span>
            </div>
          )}
          {settings?.showPaid !== false && ((isSale && (data.paid || 0) < data.total) || (!isSale && (data.paid || 0) < data.netCost)) && (
            <div style={{ display: 'flex', justifyContent: 'space-between', padding: '3px 0', color: '#d00' }}>
              <span>{isSale ? 'رصيد مستحق من العميل' : 'دين مستحق للمورد'}</span><span>{formatMoney((isSale ? data.total : data.netCost) - (data.paid || 0))}</span>
            </div>
          )}
          {(() => {
            const rem = (isSale ? (data.total || 0) : (data.netCost || 0)) - (data.paid || 0)
            const totalRem = rem + (data.previousDebt || 0) - (data.previousCredit || 0)
            if (totalRem <= 0 && rem <= 0) return null
            return <div style={{ display: 'flex', justifyContent: 'space-between', padding: '4px 0', borderTop: '1px solid #d1d5db', fontWeight: '700', fontSize: '12px', marginTop: '3px' }}>
              <span>إجمالي الرصيد المتبقي</span><span>{formatMoney(totalRem)}</span>
            </div>
          })()}
        </div>
      )}

      {settings?.showNotes !== false && data.note && (
        <div style={{ marginTop: '12px', padding: '8px 10px', border: '1px solid #e5e7eb', borderRadius: '6px', fontSize: '11px', background: '#fefce8' }}>
          <strong>ملاحظة: </strong>{data.note}
        </div>
      )}

      {settings?.showQR !== false && qrContent && (
        <div style={{ marginTop: '12px', textAlign: 'center' }}>
          <div dangerouslySetInnerHTML={{ __html: qrContent }} />
          <div style={{ fontSize: '10px', color: '#6b7280', marginTop: '2px' }}>{formatDateTime(data.createdAt)}</div>
        </div>
      )}

      {settings?.showCashier !== false && (data.cashierName || data.createdBy) && (
        <div style={{ marginTop: '12px', fontSize: '11px', color: '#6b7280' }}>
          {data.cashierName ? `الكاشير: ${data.cashierName}` : `بواسطة: ${data.createdBy}`}
        </div>
      )}

      {settings?.showReceiptFooter !== false && settings?.receiptFooter && (
        <div style={{ position: 'absolute', bottom: '10mm', left: '18mm', right: '18mm', textAlign: 'center', fontSize: '10px', borderTop: '1px solid #d1d5db', paddingTop: '6px', color: '#6b7280' }}>
          {settings.receiptFooter.split('\n').map((l, i) => <div key={i}>{l}</div>)}
        </div>
      )}
    </div>
  )
}
