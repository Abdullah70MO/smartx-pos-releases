import { formatMoney } from '../utils/money'
import { formatDate } from '../utils/date'
import { generateQrSvg } from '../utils/qrcode'

export default function StatementThermal({ type, party, transactions, settings }) {
  const isCustomer = type === 'customer'
  const title = isCustomer ? 'كشف حساب عميل' : 'كشف حساب مورد'
  const totalDue = isCustomer ? (party?.totalDebt || 0) : (party?.totalPurchases || 0)
  const totalPaid = party?.totalPaid || 0
  const balance = totalDue - totalPaid
  const balanceColor = balance > 0 ? '#d00' : balance < 0 ? '#15803d' : '#111827'
  const balanceTitle = balance > 0 ? (isCustomer ? 'رصيد مستحق من العميل' : 'دين مستحق للمورد') : balance < 0 ? (isCustomer ? 'دين مستحق للعميل' : 'رصيد مستحق من المورد') : 'الرصيد الحالي'
  const accentColor = '#1a56db'
  const paperSize = settings?.thermalPaperSize || '80mm'

  const qrContent = settings?.showQR !== false
    ? generateQrSvg([title, party?.name || '', `الرصيد: ${formatMoney(Math.abs(balance))}`, new Date().toLocaleDateString('ar-EG')].join('\n'), 80)
    : null

  return (
    <div style={{
      width: '100%', maxWidth: paperSize, margin: '0 auto', padding: '8px 6px',
      fontFamily: '"Cairo", "Segoe UI", Tahoma, Arial, sans-serif', fontSize: '10px',
      fontWeight: '400', lineHeight: '1.35', color: '#111827', direction: 'rtl', background: '#fff'
    }}>

      {/* ── Header: Logo + Business Info ── */}
      {(settings?.logoDataUrl || settings?.businessName || settings?.phone || settings?.email || settings?.address) ? (
        <div style={{ marginBottom: '6px' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
            {settings?.logoDataUrl && (
              <div style={{ flexShrink: 0 }}>
                <img src={settings.logoDataUrl} alt="logo" style={{ maxHeight: '38px', maxWidth: '80px' }} />
              </div>
            )}
            <div style={{ flex: 1, textAlign: settings?.logoDataUrl ? 'right' : 'center' }}>
              <div style={{ fontWeight: '800', fontSize: '13px', color: '#111827' }}>{settings?.businessName || 'SMART X'}</div>
              {settings?.phone && <div style={{ fontSize: '8px', color: '#4b5563', lineHeight: '1.5' }}>{settings.phone}</div>}
              {settings?.email && <div style={{ fontSize: '8px', color: '#4b5563', lineHeight: '1.5' }}>{settings.email}</div>}
              {settings?.address && <div style={{ fontSize: '8px', color: '#4b5563', lineHeight: '1.5' }}>{settings.address}</div>}
            </div>
          </div>
          {(settings?.showCommercialReg && settings?.commercialRegistration) || (settings?.showTaxReg && settings?.taxNumber) ? (
            <div style={{ textAlign: 'center', fontSize: '7px', color: '#6b7280', marginTop: '2px', lineHeight: '1.4' }}>
              {settings?.showCommercialReg && settings?.commercialRegistration && <span>س.ت: {settings.commercialRegistration}</span>}
              {settings?.showCommercialReg && settings?.commercialRegistration && settings?.showTaxReg && settings?.taxNumber && <span> | </span>}
              {settings?.showTaxReg && settings?.taxNumber && <span>ر.ض: {settings.taxNumber}</span>}
            </div>
          ) : null}
        </div>
      ) : null}

      {/* ── Accent Bar ── */}
      <div style={{ height: '3px', background: accentColor, marginBottom: '6px', borderRadius: '2px' }} />

      {/* ── Title Box ── */}
      <div style={{
        background: '#f8fafc', border: '1px solid #e5e7eb', borderRadius: '4px',
        padding: '6px 8px', marginBottom: '6px'
      }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          <div style={{ fontWeight: '700', fontSize: '11px', color: accentColor }}>{title}</div>
          <div style={{ fontSize: '8px', color: '#6b7280', textAlign: 'left' }}>{new Date().toLocaleDateString('ar-EG')}</div>
        </div>
      </div>

      {/* ── Party Info ── */}
      {party && (
        <div style={{
          background: '#fcfdff', border: '1px solid #e5e7eb', borderRadius: '4px',
          padding: '5px 8px', marginBottom: '6px', fontSize: '9px'
        }}>
          <div style={{ fontWeight: '600' }}>{party.name}</div>
          {party.phone && <div style={{ color: '#4b5563', fontSize: '8px' }}>تلفون: {party.phone}</div>}
          {party.email && <div style={{ color: '#4b5563', fontSize: '8px' }}>بريد: {party.email}</div>}
          {party.commercialReg && <div style={{ color: '#4b5563', fontSize: '8px' }}>س.ت: {party.commercialReg}</div>}
          {party.taxReg && <div style={{ color: '#4b5563', fontSize: '8px' }}>ر.ض: {party.taxReg}</div>}
          {party.address && <div style={{ color: '#4b5563', fontSize: '8px' }}>{party.address}</div>}
          {party.notes && <div style={{ color: '#4b5563', fontSize: '8px' }}>{party.notes}</div>}
        </div>
      )}

      {/* ── Summary ── */}
      <div style={{
        background: '#f9fafb', border: '1px solid #e5e7eb', borderRadius: '4px',
        padding: '5px 8px', marginBottom: '6px', fontSize: '9px'
      }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', padding: '2px 0' }}>
          <span>{isCustomer ? 'إجمالي المشتريات' : 'إجمالي المشتريات / الشراء'}</span>
          <span>{formatMoney(totalDue)}</span>
        </div>
        <div style={{ display: 'flex', justifyContent: 'space-between', padding: '2px 0' }}>
          <span>المدفوع</span><span>{formatMoney(totalPaid)}</span>
        </div>
        <hr style={{ border: '0', borderTop: '1px solid #d1d5db', margin: '2px 0' }} />
        <div style={{ display: 'flex', justifyContent: 'space-between', fontWeight: '700', fontSize: '11px', padding: '2px 0', color: balanceColor }}>
          <span>{balanceTitle}</span><span>{formatMoney(Math.abs(balance))}</span>
        </div>
      </div>

      {/* ── Transactions Table ── */}
      <table style={{ width: '100%', borderCollapse: 'collapse', marginBottom: '6px', fontSize: '8px' }}>
        <thead>
          <tr style={{ background: '#f3f4f6', borderBottom: '1px solid #d1d5db' }}>
            <th style={{ padding: '3px 2px', textAlign: 'center', width: '14px', fontWeight: '600', fontSize: '7px' }}>#</th>
            <th style={{ padding: '3px 2px', textAlign: 'center', width: '38px', fontWeight: '600', fontSize: '7px' }}>التاريخ</th>
            <th style={{ padding: '3px 2px', textAlign: 'right', fontWeight: '600', fontSize: '7px' }}>البيان</th>
            <th style={{ padding: '3px 2px', textAlign: 'center', width: '22px', fontWeight: '600', fontSize: '7px' }}>ن/د</th>
            <th style={{ padding: '3px 2px', textAlign: 'center', width: '32px', fontWeight: '600', fontSize: '7px' }}>فاتورة</th>
            <th style={{ padding: '3px 2px', textAlign: 'center', width: '38px', fontWeight: '600', fontSize: '7px' }}>المبلغ</th>
            <th style={{ padding: '3px 2px', textAlign: 'center', width: '38px', fontWeight: '600', fontSize: '7px' }}>الرصيد</th>
          </tr>
        </thead>
        <tbody>
          {transactions.map((t, i) => (
            <tr key={i} style={{ borderBottom: '1px solid #f3f4f6' }}>
              <td style={{ padding: '2px 2px', textAlign: 'center', fontSize: '7px', color: '#6b7280' }}>{i + 1}</td>
              <td style={{ padding: '2px 2px', textAlign: 'center', fontSize: '7px' }}>{formatDate(t.date)}</td>
              <td style={{ padding: '2px 2px', textAlign: 'right', fontSize: '7px' }}>{t.desc}</td>
              <td style={{ padding: '2px 2px', textAlign: 'center', fontSize: '7px' }}>{t.paymentMethod === 'credit' ? 'آجل' : t.paymentMethod === 'card' ? 'بطاقة' : t.paymentMethod ? 'نقداً' : '-'}</td>
              <td style={{ padding: '2px 2px', textAlign: 'center', fontSize: '7px' }}>{t.invoiceNo || '-'}</td>
              <td style={{ padding: '2px 2px', textAlign: 'center', fontSize: '7px', color: t.amount > 0 ? '#d00' : '#15803d' }}>{formatMoney(Math.abs(t.amount))}</td>
              <td style={{ padding: '2px 2px', textAlign: 'center', fontSize: '7px', fontWeight: '600', color: t.balance > 0 ? '#d00' : '#15803d' }}>{formatMoney(t.balance)}</td>
            </tr>
          ))}
          {transactions.length === 0 && (
            <tr>
              <td colSpan="7" style={{ padding: '10px', textAlign: 'center', color: '#9ca3af', fontSize: '8px' }}>لا توجد عمليات</td>
            </tr>
          )}
        </tbody>
      </table>

      {/* ── Balance Line ── */}
      <div style={{ textAlign: 'center', fontSize: '9px', marginBottom: '6px', color: '#374151' }}>
        {balanceTitle}: <strong style={{ color: balanceColor }}>{formatMoney(Math.abs(balance))}</strong>
      </div>

      {/* ── QR Code ── */}
      {settings?.showQR !== false && qrContent && (
        <div style={{ textAlign: 'center', marginBottom: '6px' }}>
          <div dangerouslySetInnerHTML={{ __html: qrContent }} />
        </div>
      )}

      {/* ── Footer ── */}
      {settings?.receiptFooter && (
        <div style={{
          textAlign: 'center', fontSize: '8px', borderTop: '1px solid #d1d5db',
          paddingTop: '4px', color: '#6b7280', lineHeight: '1.5'
        }}>
          {settings.receiptFooter.split('\n').map((l, i) => <div key={i}>{l}</div>)}
        </div>
      )}
    </div>
  )
}
