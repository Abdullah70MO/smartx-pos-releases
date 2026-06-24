export default function PrintTemplateShiftThermal({ data, businessName, businessPhone, businessAddress, logoDataUrl, showLogo, paperWidth = 80 }) {
  const w = paperWidth
  const col1 = Math.floor(w * 0.55)
  const col2 = w - col1
  return (
    <div style={{ width: `${w}mm`, fontFamily: "'Segoe UI', Tahoma, Arial, sans-serif", fontSize: '11px', color: '#000', background: '#fff', direction: 'rtl', padding: '4mm' }}>
      <div style={{ textAlign: 'center', marginBottom: '3mm', borderBottom: '1px dashed #000', paddingBottom: '2mm' }}>
        {showLogo !== false && logoDataUrl && <div><img src={logoDataUrl} alt="logo" style={{ maxHeight: '30px', marginBottom: '2mm' }} /></div>}
        <div style={{ fontWeight: 'bold', fontSize: '14px' }}>{businessName || 'SMART X POS'}</div>
        {businessPhone && <div style={{ fontSize: '9px' }}>هاتف: {businessPhone}</div>}
        {businessAddress && <div style={{ fontSize: '9px' }}>العنوان: {businessAddress}</div>}
        <div style={{ fontWeight: 'bold', fontSize: '12px', marginTop: '2mm' }}>تقرير وردية</div>
      </div>

      <div style={{ marginBottom: '2mm', fontSize: '9px', lineHeight: 1.5 }}>
        <div>الكاشير: {data.cashierName || ''}</div>
        <div>التاريخ: {data.startedAt ? data.startedAt.split(',')[0] : ''}</div>
        <div>من: {data.startedAt ? data.startedAt.split(',')[1]?.trim() : ''}
          {data.endedAt && data.endedAt !== 'نشطة' && ` - إلى: ${data.endedAt.split(',')[1]?.trim()}`}
          {data.endedAt === 'نشطة' && ' - نشطة'}
        </div>
      </div>

      <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '9px', marginBottom: '2mm' }}>
        <tbody>
          <tr style={{ borderBottom: '1px dashed #000' }}><td style={{ padding: '2px 0', textAlign: 'right', width: `${col1}px` }}>رصيد البداية</td><td style={{ padding: '2px 0', textAlign: 'center', width: `${col2}px` }}>{data.startingBalance}</td></tr>
          <tr style={{ borderBottom: '1px dashed #000' }}><td style={{ padding: '2px 0', textAlign: 'right' }}>مبيعات نقداً</td><td style={{ padding: '2px 0', textAlign: 'center', color: '#080' }}>+{data.cashTotal}</td></tr>
          <tr style={{ borderBottom: '1px dashed #000' }}><td style={{ padding: '2px 0', textAlign: 'right' }}>مبيعات بطاقة</td><td style={{ padding: '2px 0', textAlign: 'center', color: '#04f' }}>+{data.cardTotal}</td></tr>
          <tr style={{ borderBottom: '1px dashed #000' }}><td style={{ padding: '2px 0', textAlign: 'right' }}>مدفوعات آجلة</td><td style={{ padding: '2px 0', textAlign: 'center', color: '#800' }}>+{data.creditTotal}</td></tr>
          <tr style={{ borderBottom: '1px dashed #000' }}><td style={{ padding: '2px 0', textAlign: 'right' }}>مصروفات</td><td style={{ padding: '2px 0', textAlign: 'center', color: '#d00' }}>-{data.expensesTotal}</td></tr>
          <tr style={{ borderBottom: '1px dashed #000' }}><td style={{ padding: '2px 0', textAlign: 'right' }}>مسحوبات نقداً</td><td style={{ padding: '2px 0', textAlign: 'center', color: '#d80' }}>-{data.withdrawalsTotal}</td></tr>
          <tr style={{ borderBottom: '1px dashed #000' }}><td style={{ padding: '2px 0', textAlign: 'right' }}>مسحوبات بطاقة</td><td style={{ padding: '2px 0', textAlign: 'center', color: '#d80' }}>-{data.cardWithdrawalsTotal}</td></tr>
          <tr style={{ borderBottom: '1px dashed #000' }}><td style={{ padding: '2px 0', textAlign: 'right' }}>مرتجعات</td><td style={{ padding: '2px 0', textAlign: 'center', color: '#d80' }}>-{data.returnsTotal}</td></tr>
          <tr style={{ borderBottom: '2px solid #000' }}><td style={{ padding: '2px 0', textAlign: 'right' }}>عدد الفواتير</td><td style={{ padding: '2px 0', textAlign: 'center' }}>{data.invoiceCount}</td></tr>
        </tbody>
      </table>

      <div style={{ marginBottom: '2mm', borderTop: '1px solid #000', paddingTop: '2mm' }}>
        <div style={{ fontWeight: 'bold', fontSize: '10px', marginBottom: '1mm' }}>تسوية الكاش</div>
        <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '9px' }}>
          <tbody>
            <tr style={{ borderBottom: '1px dashed #000' }}><td style={{ padding: '2px 0', textAlign: 'right' }}>الكاش المتوقع</td><td style={{ padding: '2px 0', textAlign: 'center' }}>{data.expectedCash}</td></tr>
            <tr style={{ borderBottom: '1px dashed #000' }}><td style={{ padding: '2px 0', textAlign: 'right' }}>الكاش الفعلي</td><td style={{ padding: '2px 0', textAlign: 'center' }}>{data.actualCash}</td></tr>
            <tr style={{ borderBottom: '1px dashed #000' }}>
              <td style={{ padding: '2px 0', textAlign: 'right' }}>{data.cashDiffLabel}</td>
              <td style={{ padding: '2px 0', textAlign: 'center', fontWeight: 'bold', color: data.cashDiffLabel === 'مطابق' ? '#080' : data.cashDiffLabel === 'عجز' ? '#d00' : '#d80' }}>
                {data.cashDiff}
              </td>
            </tr>
          </tbody>
        </table>
      </div>

      {data.cardTotal && parseFloat(data.cardTotal.replace(/[^\d.-]/g, '')) > 0 && (
        <div style={{ marginBottom: '2mm', borderTop: '1px solid #000', paddingTop: '2mm' }}>
          <div style={{ fontWeight: 'bold', fontSize: '10px', marginBottom: '1mm' }}>تسوية البطاقة</div>
          <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '9px' }}>
            <tbody>
              <tr style={{ borderBottom: '1px dashed #000' }}><td style={{ padding: '2px 0', textAlign: 'right' }}>البطاقة المتوقعة</td><td style={{ padding: '2px 0', textAlign: 'center' }}>{data.expectedCard}</td></tr>
              <tr style={{ borderBottom: '1px dashed #000' }}><td style={{ padding: '2px 0', textAlign: 'right' }}>البطاقة الفعلية</td><td style={{ padding: '2px 0', textAlign: 'center' }}>{data.actualCard}</td></tr>
              <tr style={{ borderBottom: '1px dashed #000' }}>
                <td style={{ padding: '2px 0', textAlign: 'right' }}>{data.cardDiffLabel}</td>
                <td style={{ padding: '2px 0', textAlign: 'center', fontWeight: 'bold', color: data.cardDiffLabel === 'مطابق' ? '#080' : data.cardDiffLabel === 'عجز' ? '#d00' : '#d80' }}>
                  {data.cardDiff}
                </td>
              </tr>
            </tbody>
          </table>
        </div>
      )}

      <div style={{ textAlign: 'center', fontSize: '8px', borderTop: '1px dashed #000', paddingTop: '2mm', marginTop: '2mm' }}>
        <div>SMART X POS - تقرير وردية</div>
        <div>تم الطباعة: {new Date().toLocaleString('ar-EG')}</div>
      </div>
    </div>
  )
}