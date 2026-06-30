import { formatMoney } from '../utils/money'
import { formatDateTime } from '../utils/date'
import { generateQrSvg } from '../utils/qrcode'

export default function PrintTemplateThermal({ data, settings }) {
  const isSale = !data.supplierName && !data.supplierId
  const paymentLabel = data.paymentMethod === 'card' ? 'بطاقة' : data.paymentMethod === 'credit' ? 'آجل' : 'نقداً'
  const accentColor = '#1a56db'
  const paperSize = settings?.thermalPaperSize || '80mm'

  const qrContent = settings?.showQR !== false
    ? generateQrSvg([
        `فاتورة #${data.invoiceNo}`,
        settings?.businessName || 'SMART X',
        `الإجمالي: ${formatMoney(isSale ? data.total : data.netCost)}`,
        formatDateTime(data.createdAt)
      ].join('\n'), 80)
    : null

  const sectionDivider = { color: '#d1d5db', margin: '2px 0' }

  return (
    <div style={{
      width: '100%', maxWidth: paperSize, margin: '0 auto', padding: '8px 6px',
      fontFamily: '"Cairo", "Segoe UI", Tahoma, Arial, sans-serif', fontSize: '10px',
      fontWeight: '400', lineHeight: '1.35', color: '#111827', direction: 'rtl', background: '#fff'
    }}>

      {/* ── Header: Logo + Business Info ── */}
      {(settings?.showLogo !== false && settings?.logoDataUrl) ||
       settings?.showBusinessName !== false ||
       settings?.showPhone !== false ||
       settings?.showAddress !== false ||
       settings?.showEmail !== false ? (
        <div style={{ marginBottom: '6px' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
            {settings?.showLogo !== false && settings?.logoDataUrl && (
              <div style={{ flexShrink: 0 }}>
                <img src={settings.logoDataUrl} alt="logo" style={{ maxHeight: '38px', maxWidth: '80px' }} />
              </div>
            )}
            <div style={{ flex: 1, textAlign: settings?.logoDataUrl ? 'right' : 'center' }}>
              {settings?.showBusinessName !== false && (
                <div style={{ fontWeight: '800', fontSize: '13px', color: '#111827' }}>
                  {settings?.businessName || 'SMART X'}
                </div>
              )}
              {settings?.showPhone !== false && settings?.phone && (
                <div style={{ fontSize: '8px', color: '#4b5563', lineHeight: '1.5' }}>{settings.phone}</div>
              )}
              {settings?.showEmail !== false && settings?.email && (
                <div style={{ fontSize: '8px', color: '#4b5563', lineHeight: '1.5' }}>{settings.email}</div>
              )}
              {settings?.showAddress !== false && settings?.address && (
                <div style={{ fontSize: '8px', color: '#4b5563', lineHeight: '1.5' }}>{settings.address}</div>
              )}
            </div>
          </div>
          {(settings?.showCommercialReg && settings?.commercialRegistration) ||
           (settings?.showTaxReg && settings?.taxNumber) ? (
            <div style={{ textAlign: 'center', fontSize: '7px', color: '#6b7280', marginTop: '2px', lineHeight: '1.4' }}>
              {settings?.showCommercialReg && settings?.commercialRegistration &&
                <span>س.ت: {settings.commercialRegistration}</span>}
              {settings?.showCommercialReg && settings?.commercialRegistration &&
               settings?.showTaxReg && settings?.taxNumber && <span> | </span>}
              {settings?.showTaxReg && settings?.taxNumber &&
                <span>ر.ض: {settings.taxNumber}</span>}
            </div>
          ) : null}
        </div>
      ) : null}

      {/* ── Accent Bar ── */}
      <div style={{ height: '3px', background: accentColor, marginBottom: '6px', borderRadius: '2px' }} />

      {/* ── Invoice Info Box ── */}
      <div style={{
        background: '#f8fafc', border: '1px solid #e5e7eb', borderRadius: '4px',
        padding: '6px 8px', marginBottom: '6px'
      }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          <div style={{ fontWeight: '700', fontSize: '11px', color: accentColor }}>
            {isSale ? 'فاتورة بيع' : 'فاتورة شراء'} #{data.invoiceNo}
          </div>
          <div style={{ fontSize: '8px', color: '#6b7280', textAlign: 'left' }}>{formatDateTime(data.createdAt)}</div>
        </div>
        {data.paymentMethod && (
          <div style={{ fontSize: '8px', color: '#4b5563', marginTop: '2px' }}>طريقة الدفع: {paymentLabel}</div>
        )}
      </div>

      {/* ── Customer / Supplier Info ── */}
      {isSale ? (
        settings?.showClientInfo !== false && data.customerName ? (
          <div style={{
            background: '#fcfdff', border: '1px solid #e5e7eb', borderRadius: '4px',
            padding: '5px 8px', marginBottom: '6px', fontSize: '9px'
          }}>
            <div style={{ fontWeight: '600' }}>العميل: {data.customerName}</div>
            {data.customerPhone && <div style={{ color: '#4b5563', fontSize: '8px' }}>تلفون: {data.customerPhone}</div>}
          </div>
        ) : null
      ) : (
        settings?.showSupplierInfo !== false && data.supplierName ? (
          <div style={{
            background: '#f8fafc', border: '1px solid #e5e7eb', borderRadius: '4px',
            padding: '5px 8px', marginBottom: '6px', fontSize: '9px'
          }}>
            <div style={{ fontWeight: '600' }}>المورد: {data.supplierName}</div>
            {data.supplierPhone && <div style={{ color: '#4b5563', fontSize: '8px' }}>تلفون: {data.supplierPhone}</div>}
          </div>
        ) : null
      )}

      {/* ── Products Table ── */}
      {settings?.showProductsTable !== false && data.items?.length > 0 && (
        <table style={{ width: '100%', borderCollapse: 'collapse', marginBottom: '6px', fontSize: '9px' }}>
          <thead>
            <tr style={{ background: '#f3f4f6', borderBottom: '1px solid #d1d5db' }}>
              <th style={{ padding: '4px 2px', textAlign: 'center', width: '18px', fontWeight: '600', fontSize: '8px' }}>#</th>
              <th style={{ padding: '4px 2px', textAlign: 'right', fontWeight: '600', fontSize: '8px' }}>المنتج</th>
              <th style={{ padding: '4px 2px', textAlign: 'center', width: '26px', fontWeight: '600', fontSize: '8px' }}>الكمية</th>
              <th style={{ padding: '4px 2px', textAlign: 'center', width: '48px', fontWeight: '600', fontSize: '8px' }}>السعر</th>
              <th style={{ padding: '4px 2px', textAlign: 'center', width: '50px', fontWeight: '600', fontSize: '8px' }}>الإجمالي</th>
            </tr>
          </thead>
          <tbody>
            {data.items.map((item, i) => (
              <tr key={i} style={{ borderBottom: '1px solid #f3f4f6' }}>
                <td style={{ padding: '3px 2px', textAlign: 'center', color: '#6b7280', fontSize: '8px' }}>{i + 1}</td>
                <td style={{ padding: '3px 2px', textAlign: 'right', fontWeight: '500' }}>{item.name}</td>
                <td style={{ padding: '3px 2px', textAlign: 'center', fontSize: '8px' }}>{item.quantity}</td>
                <td style={{ padding: '3px 2px', textAlign: 'center', fontSize: '8px' }}>{formatMoney(isSale ? item.unitPrice : item.cost)}</td>
                <td style={{ padding: '3px 2px', textAlign: 'center', fontWeight: '600', fontSize: '8px' }}>
                  {formatMoney(isSale ? item.unitPrice * item.quantity : item.subtotal != null ? item.subtotal : item.cost * item.quantity)}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      )}

      {/* ── Totals Box ── */}
      {settings?.showTotals !== false && (
        <div style={{
          background: '#f9fafb', border: '1px solid #e5e7eb', borderRadius: '4px',
          padding: '5px 8px', marginBottom: '6px', fontSize: '9px'
        }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', padding: '2px 0' }}>
            <span>المجموع</span><span>{formatMoney(isSale ? data.subtotal : data.totalCost)}</span>
          </div>
          {data.discount > 0 && (
            <div style={{ display: 'flex', justifyContent: 'space-between', padding: '2px 0', color: '#d00' }}>
              <span>الخصم</span><span>-{formatMoney(data.discount)}</span>
            </div>
          )}
          {isSale && data.tax > 0 && (
            <div style={{ display: 'flex', justifyContent: 'space-between', padding: '2px 0' }}>
              <span>الضريبة</span><span>{formatMoney(data.tax)}</span>
            </div>
          )}
          <hr style={{ ...sectionDivider, border: '0', borderTop: '1px solid #d1d5db', margin: '2px 0' }} />
          <div style={{ display: 'flex', justifyContent: 'space-between', fontWeight: '700', fontSize: '11px', padding: '2px 0', color: accentColor }}>
            <span>الإجمالي</span><span>{formatMoney(isSale ? data.total : data.netCost)}</span>
          </div>
          {isSale && data.previousDebt > 0 && (
            <div style={{ display: 'flex', justifyContent: 'space-between', padding: '1px 0', color: '#d00', fontSize: '8px' }}>
              <span>رصيد مستحق من العميل</span><span>{formatMoney(data.previousDebt)}</span>
            </div>
          )}
          {isSale && data.previousCredit > 0 && (
            <div style={{ display: 'flex', justifyContent: 'space-between', padding: '1px 0', color: '#15803d', fontSize: '8px' }}>
              <span>دين مستحق للعميل</span><span>-{formatMoney(data.previousCredit)}</span>
            </div>
          )}
          {!isSale && data.previousCredit > 0 && (
            <div style={{ display: 'flex', justifyContent: 'space-between', padding: '1px 0', color: '#15803d', fontSize: '8px' }}>
              <span>رصيد مستحق من المورد (خصم)</span><span>-{formatMoney(data.previousCredit)}</span>
            </div>
          )}
          {!isSale && data.previousDebt > 0 && (
            <div style={{ display: 'flex', justifyContent: 'space-between', padding: '1px 0', color: '#d00', fontSize: '8px' }}>
              <span>دين مستحق للمورد (سابق)</span><span>{formatMoney(data.previousDebt)}</span>
            </div>
          )}
          {(data.paid || 0) > 0 && settings?.showPaid !== false && (
            <div style={{ display: 'flex', justifyContent: 'space-between', padding: '2px 0' }}>
              <span>المدفوع</span><span>{formatMoney(data.paid)}</span>
            </div>
          )}
          {data.change > 0 && (
            <div style={{ display: 'flex', justifyContent: 'space-between', padding: '2px 0', color: '#15803d' }}>
              <span>الباقي</span><span>{formatMoney(data.change)}</span>
            </div>
          )}
          {settings?.showPaid !== false && (() => {
            const total = isSale ? (data.total || 0) : (data.netCost || 0)
            const rem = total - (data.paid || 0)
            if (rem <= 0) return null
            return (
              <div style={{ display: 'flex', justifyContent: 'space-between', padding: '2px 0', color: '#d00', fontSize: '8px' }}>
                <span>{isSale ? 'رصيد مستحق من العميل' : 'دين مستحق للمورد'}</span>
                <span>{formatMoney(rem)}</span>
              </div>
            )
          })()}
          {(() => {
            const total = isSale ? (data.total || 0) : (data.netCost || 0)
            const rem = total - (data.paid || 0)
            const totalRem = rem + (data.previousDebt || 0) - (data.previousCredit || 0)
            if (totalRem <= 0) return null
            return (
              <div style={{
                display: 'flex', justifyContent: 'space-between',
                fontWeight: '600', padding: '2px 0', color: '#d00',
                fontSize: '9px', borderTop: '1px solid #d1d5db', marginTop: '2px'
              }}>
                <span>إجمالي الرصيد المتبقي</span><span>{formatMoney(totalRem)}</span>
              </div>
            )
          })()}
        </div>
      )}

      {/* ── Notes ── */}
      {settings?.showNotes !== false && data.note && (
        <div style={{
          marginBottom: '6px', padding: '5px 8px', border: '1px solid #e5e7eb',
          borderRadius: '4px', fontSize: '9px', background: '#fefce8'
        }}>
          <strong>ملاحظة: </strong>{data.note}
        </div>
      )}

      {/* ── QR Code ── */}
      {settings?.showQR !== false && qrContent && (
        <div style={{ textAlign: 'center', marginBottom: '6px' }}>
          <div dangerouslySetInnerHTML={{ __html: qrContent }} />
          <div style={{ fontSize: '7px', color: '#9ca3af', marginTop: '1px' }}>{formatDateTime(data.createdAt)}</div>
        </div>
      )}

      {/* ── Cashier ── */}
      {settings?.showCashier !== false && (data.cashierName || data.createdBy) && (
        <div style={{ textAlign: 'center', fontSize: '8px', marginBottom: '6px', color: '#6b7280' }}>
          {data.cashierName ? `الكاشير: ${data.cashierName}` : `بواسطة: ${data.createdBy}`}
        </div>
      )}

      {/* ── Footer ── */}
      {settings?.showReceiptFooter !== false && settings?.receiptFooter && (
        <div style={{
          textAlign: 'center', fontSize: '8px', borderTop: '1px solid #d1d5db',
          paddingTop: '4px', marginTop: '2px', color: '#6b7280', lineHeight: '1.5'
        }}>
          {settings.receiptFooter.split('\n').map((l, i) => <div key={i}>{l}</div>)}
        </div>
      )}
    </div>
  )
}
