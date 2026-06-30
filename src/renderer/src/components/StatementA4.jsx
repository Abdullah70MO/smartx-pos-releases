import { formatMoney } from '../utils/money'
import { formatDate } from '../utils/date'
import { generateQrSvg } from '../utils/qrcode'

export default function StatementA4({ type, party, transactions, settings }) {
  const isCustomer = type === 'customer'
  const title = isCustomer ? 'كشف حساب عميل' : 'كشف حساب مورد'
  const totalDue = isCustomer ? (party?.totalDebt || 0) : (party?.totalPurchases || 0)
  const totalPaid = party?.totalPaid || 0
  const balance = totalDue - totalPaid
  const balanceColor = balance > 0 ? '#d00' : balance < 0 ? '#0a7' : '#111827'
  const summaryLabel = isCustomer ? 'إجمالي المشتريات' : 'إجمالي المشتريات / الشراء'
  const paidLabel = 'المدفوع'
  const balanceTitle = balance > 0 ? (isCustomer ? 'رصيد مستحق من العميل' : 'دين مستحق للمورد') : balance < 0 ? (isCustomer ? 'دين مستحق للعميل' : 'رصيد مستحق من المورد') : 'الرصيد الحالي'
  const qrContent = settings?.showQR !== false
    ? generateQrSvg([
        title,
        party?.name || '',
        `الرصيد: ${formatMoney(Math.abs(balance))}`,
        new Date().toLocaleDateString('ar-EG')
      ].join('\n'), 100)
    : null

  return (
    <div id="a4-print-content" style={{
      width: '210mm', minHeight: '297mm', padding: '15mm 18mm',
      fontFamily: '"Cairo", "Segoe UI", Tahoma, Arial, sans-serif', fontSize: '12px', fontWeight: '400', lineHeight: '1.35',
      color: '#111827', background: '#fff', direction: 'rtl', boxSizing: 'border-box', position: 'relative'
    }}>
      <div style={{ textAlign: 'center', marginBottom: '16px', borderBottom: '2px solid #111827', paddingBottom: '10px' }}>
        {settings?.logoDataUrl && <img src={settings.logoDataUrl} alt="logo" style={{ maxHeight: '56px', marginBottom: '6px' }} />}
        <div style={{ fontWeight: '700', fontSize: '20px' }}>{settings?.businessName || 'SMART X'}</div>
        {settings?.phone && <div style={{ fontSize: '11px', color: '#4b5563' }}>هاتف: {settings.phone}</div>}
        {settings?.email && <div style={{ fontSize: '11px', color: '#4b5563' }}>بريد: {settings.email}</div>}
        {settings?.address && <div style={{ fontSize: '11px', color: '#4b5563' }}>العنوان: {settings.address}</div>}
        {settings?.showCommercialReg && settings?.commercialRegistration && <div style={{ fontSize: '11px', color: '#4b5563' }}>سجل تجاري: {settings.commercialRegistration}</div>}
        {settings?.showTaxReg && settings?.taxNumber && <div style={{ fontSize: '11px', color: '#4b5563' }}>رقم ضريبي: {settings.taxNumber}</div>}
      </div>

      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '12px' }}>
        <div style={{ fontWeight: '700', fontSize: '16px' }}>{title}</div>
        <div style={{ fontSize: '11px', color: '#6b7280' }}>التاريخ: {new Date().toLocaleDateString('ar-EG')}</div>
      </div>

      {party && (
        <div style={{ marginBottom: '12px', padding: '8px 10px', border: '1px solid #e5e7eb', borderRadius: '6px', background: '#f9fafb', fontSize: '11px' }}>
          <div style={{ fontWeight: '700', marginBottom: '4px' }}>{party.name}</div>
          {party.phone && <div>الهاتف: {party.phone}</div>}
          {party.email && <div>البريد: {party.email}</div>}
          {party.commercialReg && <div>سجل تجاري: {party.commercialReg}</div>}
          {party.taxReg && <div>سجل ضريبي: {party.taxReg}</div>}
          {party.address && <div>العنوان: {party.address}</div>}
          {party.notes && <div>ملاحظات: {party.notes}</div>}
        </div>
      )}

      <div style={{ display: 'flex', gap: '8px', marginBottom: '12px', flexWrap: 'wrap' }}>
        <div style={{ flex: '1 1 180px', padding: '8px 10px', border: '1px solid #e5e7eb', borderRadius: '6px', background: '#f9fafb', fontSize: '11px' }}>
          <div style={{ color: '#6b7280', marginBottom: '3px' }}>{summaryLabel}</div>
          <div style={{ fontWeight: '700' }}>{formatMoney(totalDue)}</div>
        </div>
        <div style={{ flex: '1 1 180px', padding: '8px 10px', border: '1px solid #e5e7eb', borderRadius: '6px', background: '#f9fafb', fontSize: '11px' }}>
          <div style={{ color: '#6b7280', marginBottom: '3px' }}>{paidLabel}</div>
          <div style={{ fontWeight: '700' }}>{formatMoney(totalPaid)}</div>
        </div>
        <div style={{ flex: '1 1 180px', padding: '8px 10px', border: '1px solid #e5e7eb', borderRadius: '6px', background: '#fef3c7', fontSize: '11px' }}>
          <div style={{ color: '#92400e', marginBottom: '3px' }}>{balanceTitle}</div>
          <div style={{ fontWeight: '700', color: balanceColor }}>{formatMoney(Math.abs(balance))}</div>
        </div>
      </div>

      <table style={{ width: '100%', borderCollapse: 'collapse', marginBottom: '16px', fontSize: '11px' }}>
        <thead>
          <tr style={{ background: '#f3f4f6', borderBottom: '1px solid #d1d5db' }}>
            <th style={{ padding: '7px 4px', textAlign: 'center', width: '28px' }}>#</th>
            <th style={{ padding: '7px 4px', textAlign: 'center', width: '68px' }}>التاريخ</th>
            <th style={{ padding: '7px 4px', textAlign: 'right' }}>البيان</th>
            <th style={{ padding: '7px 4px', textAlign: 'center', width: '54px' }}>نوع الدفع</th>
            <th style={{ padding: '7px 4px', textAlign: 'center', width: '58px' }}>فاتورة</th>
            <th style={{ padding: '7px 4px', textAlign: 'center', width: '70px' }}>المبلغ</th>
            <th style={{ padding: '7px 4px', textAlign: 'center', width: '70px' }}>الرصيد</th>
          </tr>
        </thead>
        <tbody>
          {transactions.map((t, i) => (
            <tr key={i} style={{ borderBottom: '1px solid #e5e7eb' }}>
              <td style={{ padding: '5px 4px', textAlign: 'center' }}>{i + 1}</td>
              <td style={{ padding: '5px 4px', textAlign: 'center', fontSize: '10px' }}>{formatDate(t.date)}</td>
              <td style={{ padding: '5px 4px', textAlign: 'right' }}>{t.desc}</td>
              <td style={{ padding: '5px 4px', textAlign: 'center', fontSize: '10px' }}>{t.paymentMethod === 'credit' ? 'آجل' : t.paymentMethod === 'card' ? 'بطاقة' : t.paymentMethod ? 'نقداً' : '-'}</td>
              <td style={{ padding: '5px 4px', textAlign: 'center' }}>{t.invoiceNo || '-'}</td>
              <td style={{ padding: '5px 4px', textAlign: 'center', color: t.amount > 0 ? '#d00' : '#0a7' }}>
                {formatMoney(Math.abs(t.amount))}
              </td>
              <td style={{ padding: '5px 4px', textAlign: 'center', fontWeight: '700', color: t.balance > 0 ? '#d00' : '#0a7' }}>
                {formatMoney(t.balance)}
              </td>
            </tr>
          ))}
          {transactions.length === 0 && (
            <tr>
              <td colSpan="7" style={{ padding: '16px', textAlign: 'center', color: '#999' }}>لا توجد عمليات</td>
            </tr>
          )}
        </tbody>
      </table>

      <div style={{ textAlign: 'center', fontSize: '11px', marginTop: '8px', color: '#374151' }}>
        {balanceTitle}: <strong style={{ color: balanceColor }}>{formatMoney(Math.abs(balance))}</strong>
      </div>

      {settings?.showQR !== false && qrContent && (
        <div style={{ marginTop: '12px', textAlign: 'center' }}>
          <div dangerouslySetInnerHTML={{ __html: qrContent }} />
        </div>
      )}

      {settings?.receiptFooter && (
        <div style={{ position: 'absolute', bottom: '10mm', left: '18mm', right: '18mm', textAlign: 'center', fontSize: '10px', borderTop: '1px solid #d1d5db', paddingTop: '6px', color: '#6b7280' }}>
          {settings.receiptFooter.split('\n').map((l, i) => <div key={i}>{l}</div>)}
        </div>
      )}
    </div>
  )
}
