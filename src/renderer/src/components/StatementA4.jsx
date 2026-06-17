import { formatMoney } from '../utils/money'
import { formatDate } from '../utils/date'

export default function StatementA4({ type, party, transactions, settings }) {
  const isCustomer = type === 'customer'
  const title = isCustomer ? 'كشف حساب عميل' : 'كشف حساب مورد'
  const balance = transactions.length > 0 ? transactions[transactions.length - 1].balance : 0

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
        {settings?.showCommercialReg && settings?.commercialRegistration && <div style={{ fontSize: '11px' }}>سجل تجاري: {settings.commercialRegistration}</div>}
        {settings?.showTaxReg && settings?.taxNumber && <div style={{ fontSize: '11px' }}>رقم ضريبي: {settings.taxNumber}</div>}
      </div>

      <div style={{ fontWeight: 'bold', fontSize: '16px', marginBottom: '12px' }}>{title}</div>

      {party && (
        <div style={{ marginBottom: '16px', padding: '8px 12px', border: '1px solid #ccc', borderRadius: '4px', fontSize: '11px' }}>
          <div><strong>الاسم: </strong>{party.name}</div>
          {party.phone && <div>الهاتف: {party.phone}</div>}
          {party.email && <div>البريد: {party.email}</div>}
          {party.commercialReg && <div>سجل تجاري: {party.commercialReg}</div>}
          {party.taxReg && <div>سجل ضريبي: {party.taxReg}</div>}
          {party.address && <div>العنوان: {party.address}</div>}
          {party.notes && <div>ملاحظات: {party.notes}</div>}
        </div>
      )}

      {isCustomer && (
        <div style={{ marginBottom: '12px', fontSize: '11px' }}>
          إجمالي المشتريات: <strong>{formatMoney(party?.totalDebt || 0)}</strong>
          {' | '}المدفوع: <strong>{formatMoney(party?.totalPaid || 0)}</strong>
          {' | '}<strong style={{ color: balance > 0 ? '#d00' : balance < 0 ? '#080' : '#000' }}>{balance > 0 ? `رصيد مستحق من العميل: ${formatMoney(balance)}` : balance < 0 ? `دين مستحق للعميل: ${formatMoney(Math.abs(balance))}` : `المتبقي: ${formatMoney(balance)}`}</strong>
        </div>
      )}

      <table style={{ width: '100%', borderCollapse: 'collapse', marginBottom: '16px', fontSize: '11px' }}>
        <thead>
          <tr style={{ borderBottom: '2px solid #000' }}>
            <th style={{ padding: '6px 4px', textAlign: 'center', width: '28px' }}>#</th>
            <th style={{ padding: '6px 4px', textAlign: 'center', width: '65px' }}>التاريخ</th>
            <th style={{ padding: '6px 4px', textAlign: 'right' }}>البيان</th>
            <th style={{ padding: '6px 4px', textAlign: 'center', width: '45px' }}>نوع الدفع</th>
            <th style={{ padding: '6px 4px', textAlign: 'center', width: '55px' }}>فاتورة</th>
            <th style={{ padding: '6px 4px', textAlign: 'center', width: '65px' }}>المبلغ</th>
            <th style={{ padding: '6px 4px', textAlign: 'center', width: '65px' }}>الرصيد</th>
          </tr>
        </thead>
        <tbody>
          {transactions.map((t, i) => (
            <tr key={i} style={{ borderBottom: '1px solid #ddd' }}>
              <td style={{ padding: '4px', textAlign: 'center' }}>{i + 1}</td>
              <td style={{ padding: '4px', textAlign: 'center', fontSize: '10px' }}>{formatDate(t.date)}</td>
              <td style={{ padding: '4px', textAlign: 'right' }}>{t.desc}</td>
              <td style={{ padding: '4px', textAlign: 'center', fontSize: '10px' }}>{t.paymentMethod === 'credit' ? 'آجل' : t.paymentMethod === 'card' ? 'بطاقة' : t.paymentMethod ? 'نقداً' : '-'}</td>
              <td style={{ padding: '4px', textAlign: 'center' }}>{t.invoiceNo || '-'}</td>
              <td style={{ padding: '4px', textAlign: 'center', color: t.amount > 0 ? '#d00' : '#080' }}>
                {formatMoney(Math.abs(t.amount))}
              </td>
              <td style={{ padding: '4px', textAlign: 'center', fontWeight: 'bold', color: t.balance > 0 ? '#d00' : '#080' }}>
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

      <div style={{ textAlign: 'center', fontSize: '11px', marginTop: '8px' }}>
        {balance > 0 ? (isCustomer ? 'رصيد مستحق من العميل' : 'دين مستحق للمورد') : balance < 0 ? (isCustomer ? 'دين مستحق للعميل' : 'رصيد مستحق من المورد') : 'الرصيد الحالي'}: <strong style={{ color: balance > 0 ? '#d00' : '#080' }}>{formatMoney(Math.abs(balance))}</strong>
      </div>

      {settings?.receiptFooter && (
        <div style={{ position: 'absolute', bottom: '10mm', left: '20mm', right: '20mm', textAlign: 'center', fontSize: '10px', borderTop: '1px solid #ccc', paddingTop: '6px' }}>
          {settings.receiptFooter.split('\n').map((l, i) => <div key={i}>{l}</div>)}
        </div>
      )}
    </div>
  )
}
