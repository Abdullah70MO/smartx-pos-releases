import { formatMoney } from '../utils/money'
const MONTHS = ['يناير', 'فبراير', 'مارس', 'إبريل', 'مايو', 'يونيو', 'يوليو', 'أغسطس', 'سبتمبر', 'أكتوبر', 'نوفمبر', 'ديسمبر']

export default function PrintTemplateSalary({ employee, payment, advances, attendance, businessName, businessPhone, businessAddress, logoDataUrl, showLogo }) {
  const monthName = MONTHS[payment.month - 1] || payment.month
  return (
    <div style={{
      width: '210mm', minHeight: '297mm', padding: '15mm 20mm',
      fontFamily: "'Segoe UI', Tahoma, Arial, sans-serif", fontSize: '12px', color: '#000', background: '#fff',
      direction: 'rtl', boxSizing: 'border-box'
    }}>
      <div style={{ textAlign: 'center', marginBottom: '16px', borderBottom: '2px solid #000', paddingBottom: '8px' }}>
        {showLogo !== false && logoDataUrl && <div><img src={logoDataUrl} alt="logo" style={{ maxHeight: '50px', marginBottom: '4px' }} /></div>}
        <div style={{ fontWeight: 'bold', fontSize: '18px' }}>{businessName || 'SMART X POS'}</div>
        {businessPhone && <div style={{ fontSize: '11px' }}>هاتف: {businessPhone}</div>}
        {businessAddress && <div style={{ fontSize: '11px' }}>العنوان: {businessAddress}</div>}
        <div style={{ fontWeight: 'bold', fontSize: '15px', marginTop: '8px' }}>سند صرف راتب</div>
      </div>

      <div style={{ marginBottom: '16px', fontSize: '12px', lineHeight: 1.8 }}>
        <div>الموظف: <b>{employee.name}</b></div>
        <div>الوظيفة: {employee.jobTitle || '-'}</div>
        <div>الشهر: {monthName} {payment.year}</div>
        {payment.paymentDate && <div>تاريخ الصرف: {new Date(payment.paymentDate).toLocaleDateString('ar-EG')}</div>}
      </div>

      <table style={{ width: '100%', borderCollapse: 'collapse', marginBottom: '12px', fontSize: '11px' }}>
        <thead>
          <tr style={{ borderBottom: '2px solid #000' }}>
            <th style={{ padding: '6px 4px', textAlign: 'right', width: '50%' }}>البيان</th>
            <th style={{ padding: '6px 4px', textAlign: 'center', width: '25%' }}>إضافات</th>
            <th style={{ padding: '6px 4px', textAlign: 'center', width: '25%' }}>خصومات</th>
          </tr>
        </thead>
        <tbody>
          <tr style={{ borderBottom: '1px solid #ddd' }}>
            <td style={{ padding: '4px', textAlign: 'right' }}>الراتب الأساسي</td>
            <td style={{ padding: '4px', textAlign: 'center', color: '#080' }}>{formatMoney(payment.baseSalary)}</td>
            <td style={{ padding: '4px', textAlign: 'center' }}>-</td>
          </tr>
          {advances.filter(a => a.type === 'deduction' && a.deducted && a.amount > 0).map((a, i) => (
            <tr key={i} style={{ borderBottom: '1px solid #ddd' }}>
              <td style={{ padding: '4px', textAlign: 'right' }}>خصم: {a.note || 'خصم'}</td>
              <td style={{ padding: '4px', textAlign: 'center' }}>-</td>
              <td style={{ padding: '4px', textAlign: 'center', color: '#d00' }}>{formatMoney(a.amount)}</td>
            </tr>
          ))}
          {advances.filter(a => a.type !== 'deduction' && a.deducted && a.amount > 0).map((a, i) => (
            <tr key={i} style={{ borderBottom: '1px solid #ddd' }}>
              <td style={{ padding: '4px', textAlign: 'right' }}>سلفة: {a.note || 'سلفة'}</td>
              <td style={{ padding: '4px', textAlign: 'center' }}>-</td>
              <td style={{ padding: '4px', textAlign: 'center', color: '#d00' }}>{formatMoney(a.amount)}</td>
            </tr>
          ))}
          {payment.totalAdditions > 0 && (
            <tr style={{ borderBottom: '1px solid #ddd' }}>
              <td style={{ padding: '4px', textAlign: 'right' }}>إضافات أخرى</td>
              <td style={{ padding: '4px', textAlign: 'center', color: '#080' }}>{formatMoney(payment.totalAdditions)}</td>
              <td style={{ padding: '4px', textAlign: 'center' }}>-</td>
            </tr>
          )}
        </tbody>
      </table>

      <div style={{ borderTop: '2px solid #000', paddingTop: '8px', marginBottom: '12px' }}>
        <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '11px' }}>
          <tbody>
            <tr style={{ borderBottom: '1px solid #ddd' }}>
              <td style={{ padding: '4px', textAlign: 'right', width: '50%' }}>إجمالي الإضافات</td>
              <td style={{ padding: '4px', textAlign: 'center', color: '#080', fontWeight: 'bold' }}>{formatMoney(payment.baseSalary + (payment.totalAdditions || 0))}</td>
            </tr>
            <tr style={{ borderBottom: '1px solid #ddd' }}>
              <td style={{ padding: '4px', textAlign: 'right' }}>إجمالي الخصومات</td>
              <td style={{ padding: '4px', textAlign: 'center', color: '#d00', fontWeight: 'bold' }}>{formatMoney(payment.totalDeductions)}</td>
            </tr>
            <tr style={{ borderBottom: '2px solid #000' }}>
              <td style={{ padding: '4px', textAlign: 'right', fontWeight: 'bold', fontSize: '13px' }}>صافي الراتب</td>
              <td style={{ padding: '4px', textAlign: 'center', fontWeight: 'bold', fontSize: '14px', color: '#080' }}>{formatMoney(payment.netAmount)}</td>
            </tr>
          </tbody>
        </table>
      </div>

      {attendance && attendance.length > 0 && (
        <div style={{ marginBottom: '12px', borderTop: '1px solid #ccc', paddingTop: '8px' }}>
          <div style={{ fontWeight: 'bold', fontSize: '12px', marginBottom: '6px' }}>ملخص الحضور</div>
          <div style={{ fontSize: '10px', lineHeight: 1.6 }}>
            <span style={{ marginLeft: '12px' }}>حاضر: {attendance.filter(a => a.status === 'present').length}</span>
            <span style={{ marginLeft: '12px' }}>غائب: {attendance.filter(a => a.status === 'absent').length}</span>
            <span style={{ marginLeft: '12px' }}>إجازة: {attendance.filter(a => a.status === 'vacation').length}</span>
            <span>مرضى: {attendance.filter(a => a.status === 'sick').length}</span>
          </div>
        </div>
      )}

      <div style={{ textAlign: 'center', fontSize: '10px', borderTop: '1px solid #ccc', paddingTop: '6px', marginTop: '12px' }}>
        <div>SMART X POS - سند راتب</div>
        <div>تم الطباعة في: {new Date().toLocaleString('ar-EG')}</div>
      </div>

      <div style={{ display: 'flex', justifyContent: 'space-between', marginTop: '40px', fontSize: '11px' }}>
        <div style={{ textAlign: 'center' }}>
          <div style={{ borderTop: '1px solid #000', paddingTop: '4px', minWidth: '120px' }}>توقيع الموظف</div>
        </div>
        <div style={{ textAlign: 'center' }}>
          <div style={{ borderTop: '1px solid #000', paddingTop: '4px', minWidth: '120px' }}>توقيع المسؤول</div>
        </div>
      </div>
    </div>
  )
}