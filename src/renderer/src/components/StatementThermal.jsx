import { formatMoney } from '../utils/money'
import { formatDate } from '../utils/date'

export default function StatementThermal({ type, party, transactions, settings }) {
  const isCustomer = type === 'customer'
  const title = isCustomer ? 'كشف حساب عميل' : 'كشف حساب مورد'
  const totalDue = isCustomer ? (party?.totalDebt || 0) : (party?.totalPurchases || 0)
  const totalPaid = party?.totalPaid || 0
  const balance = totalDue - totalPaid
  const balanceColor = balance > 0 ? '#d00' : balance < 0 ? '#0a7' : '#111'
  const balanceTitle = balance > 0 ? (isCustomer ? 'رصيد مستحق من العميل' : 'دين مستحق للمورد') : balance < 0 ? (isCustomer ? 'دين مستحق للعميل' : 'رصيد مستحق من المورد') : 'الرصيد الحالي'

  return (
    <div style={{
      width: '100%', maxWidth: '80mm', margin: '0 auto', padding: '6px 4px',
      fontFamily: '"Cairo", "Segoe UI", Tahoma, Arial, sans-serif', fontSize: '10px', fontWeight: '400', lineHeight: '1.3',
      color: '#111', direction: 'rtl', background: '#fff'
    }}>
      {settings?.logoDataUrl && (
        <div style={{ textAlign: 'center', marginBottom: '4px' }}>
          <img src={settings.logoDataUrl} alt="logo" style={{ maxHeight: '30px', maxWidth: '100%' }} />
        </div>
      )}
      <div style={{ textAlign: 'center', fontWeight: '700', fontSize: '12px', marginBottom: '2px' }}>
        {settings?.businessName || 'SMART X'}
      </div>
      {settings?.phone && <div style={{ textAlign: 'center', fontSize: '9px', color: '#444' }}>هاتف: {settings.phone}</div>}
      {settings?.email && <div style={{ textAlign: 'center', fontSize: '9px', color: '#444' }}>بريد: {settings.email}</div>}
      {settings?.address && <div style={{ textAlign: 'center', fontSize: '9px', color: '#444' }}>{settings.address}</div>}
      {settings?.showCommercialReg && settings?.commercialRegistration && <div style={{ textAlign: 'center', fontSize: '9px', color: '#444' }}>سجل تجاري: {settings.commercialRegistration}</div>}
      {settings?.showTaxReg && settings?.taxNumber && <div style={{ textAlign: 'center', fontSize: '9px', color: '#444' }}>رقم ضريبي: {settings.taxNumber}</div>}

      <div style={{ borderTop: '1px dashed #999', margin: '6px 0 4px', paddingTop: '4px' }} />
      <div style={{ textAlign: 'center', fontWeight: '700', fontSize: '11px', marginBottom: '3px' }}>{title}</div>
      <div style={{ textAlign: 'center', fontSize: '9px', color: '#666', marginBottom: '4px' }}>التاريخ: {new Date().toLocaleDateString('ar-EG')}</div>

      {party && (
        <div style={{ marginBottom: '5px', fontSize: '8.5px', border: '1px solid #ddd', borderRadius: '4px', padding: '6px' }}>
          <div style={{ fontWeight: '700', marginBottom: '2px' }}>{party.name}</div>
          {party.phone && <div>الهاتف: {party.phone}</div>}
          {party.email && <div>البريد: {party.email}</div>}
          {party.commercialReg && <div>سجل تجاري: {party.commercialReg}</div>}
          {party.taxReg && <div>سجل ضريبي: {party.taxReg}</div>}
          {party.address && <div>العنوان: {party.address}</div>}
          {party.notes && <div>ملاحظات: {party.notes}</div>}
        </div>
      )}

      <div style={{ borderTop: '1px dashed #999', margin: '4px 0' }} />
      <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '8.5px', marginBottom: '2px' }}>
        <span>{isCustomer ? 'إجمالي المشتريات' : 'إجمالي المشتريات / الشراء'}</span><span>{formatMoney(totalDue)}</span>
      </div>
      <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '8.5px', marginBottom: '2px' }}>
        <span>المدفوع</span><span>{formatMoney(totalPaid)}</span>
      </div>
      <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '8.5px', fontWeight: '700', color: balanceColor }}>
        <span>{balanceTitle}</span><span>{formatMoney(Math.abs(balance))}</span>
      </div>

      <div style={{ borderTop: '1px dashed #999', margin: '4px 0' }} />
      <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '8px' }}>
        <thead>
          <tr style={{ borderBottom: '1px solid #999', borderTop: '1px solid #999' }}>
            <th style={{ padding: '2px 1px', textAlign: 'center', width: '14px' }}>#</th>
            <th style={{ padding: '2px 1px', textAlign: 'center', width: '38px' }}>التاريخ</th>
            <th style={{ padding: '2px 1px', textAlign: 'right' }}>البيان</th>
            <th style={{ padding: '2px 1px', textAlign: 'center' }}>ن/د</th>
            <th style={{ padding: '2px 1px', textAlign: 'center' }}>فاتورة</th>
            <th style={{ padding: '2px 1px', textAlign: 'center' }}>المبلغ</th>
            <th style={{ padding: '2px 1px', textAlign: 'center' }}>الرصيد</th>
          </tr>
        </thead>
        <tbody>
          {transactions.map((t, i) => (
            <tr key={i} style={{ borderBottom: '1px dashed #eee' }}>
              <td style={{ padding: '2px 1px', textAlign: 'center', fontSize: '7px' }}>{i + 1}</td>
              <td style={{ padding: '2px 1px', textAlign: 'center', fontSize: '7px' }}>{formatDate(t.date)}</td>
              <td style={{ padding: '2px 1px', textAlign: 'right', fontSize: '7.5px' }}>{t.desc}</td>
              <td style={{ padding: '2px 1px', textAlign: 'center', fontSize: '7px' }}>{t.paymentMethod === 'credit' ? 'آجل' : t.paymentMethod === 'card' ? 'بطاقة' : t.paymentMethod ? 'نقداً' : '-'}</td>
              <td style={{ padding: '2px 1px', textAlign: 'center', fontSize: '7px' }}>{t.invoiceNo || '-'}</td>
              <td style={{ padding: '2px 1px', textAlign: 'center', fontSize: '7px', color: t.amount > 0 ? '#d00' : '#0a7' }}>{formatMoney(Math.abs(t.amount))}</td>
              <td style={{ padding: '2px 1px', textAlign: 'center', fontSize: '7px', fontWeight: '700', color: t.balance > 0 ? '#d00' : '#0a7' }}>{formatMoney(t.balance)}</td>
            </tr>
          ))}
        </tbody>
      </table>
      {transactions.length === 0 && <div style={{ textAlign: 'center', color: '#777', marginTop: '6px', fontSize: '8px' }}>لا توجد عمليات</div>}

      <div style={{ textAlign: 'center', fontSize: '8px', marginTop: '6px', color: '#374151' }}>
        {balanceTitle}: <strong style={{ color: balanceColor }}>{formatMoney(Math.abs(balance))}</strong>
      </div>

      {settings?.receiptFooter && (
        <div style={{ textAlign: 'center', fontSize: '8px', marginTop: '6px', borderTop: '1px dashed #999', paddingTop: '4px', color: '#666' }}>
          {settings.receiptFooter}
        </div>
      )}
    </div>
  )
}
