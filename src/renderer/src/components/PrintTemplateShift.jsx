import { formatMoney } from '../utils/money'

export default function PrintTemplateShift({ data, businessName, businessPhone, businessAddress, logoDataUrl, showLogo }) {
  return (
    <div id="a4-print-content" style={{
      width: '210mm', minHeight: '297mm', padding: '15mm 20mm',
      fontFamily: "'Segoe UI', Tahoma, Arial, sans-serif", fontSize: '12px', color: '#000', background: '#fff',
      direction: 'rtl', boxSizing: 'border-box', position: 'relative'
    }}>
      <div style={{ textAlign: 'center', marginBottom: '20px', borderBottom: '2px solid #000', paddingBottom: '10px' }}>
        {showLogo !== false && logoDataUrl && <div><img src={logoDataUrl} alt="logo" style={{ maxHeight: '50px', marginBottom: '6px' }} /></div>}
        <div style={{ fontWeight: 'bold', fontSize: '20px' }}>{businessName || 'SMART X POS'}</div>
        {businessPhone && <div style={{ fontSize: '11px' }}>هاتف: {businessPhone}</div>}
        {businessAddress && <div style={{ fontSize: '11px' }}>العنوان: {businessAddress}</div>}
        <div style={{ fontWeight: 'bold', fontSize: '16px', marginTop: '10px' }}>تقرير الوردية</div>
      </div>

      <div style={{ marginBottom: '16px', fontSize: '11px' }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', gap: '12px' }}>
          <span style={{ whiteSpace: 'nowrap' }}>الكاشير: {data.cashierName || ''}</span>
          <div style={{ textAlign: 'left', lineHeight: 1.6 }}>
            <div>التاريخ: {data.startedAt ? data.startedAt.split(',')[0] : ''}</div>
            <div>من: {data.startedAt ? data.startedAt.split(',')[1]?.trim() : ''}
              {data.endedAt && data.endedAt !== 'نشطة' && ` - إلى: ${data.endedAt.split(',')[1]?.trim()}`}
              {data.endedAt === 'نشطة' && ' - نشطة'}
            </div>
          </div>
        </div>
      </div>

      <table style={{ width: '100%', borderCollapse: 'collapse', marginBottom: '16px', fontSize: '11px' }}>
        <thead>
          <tr style={{ borderBottom: '2px solid #000' }}>
            <th style={{ padding: '6px 4px', textAlign: 'right', width: '50%' }}>البند</th>
            <th style={{ padding: '6px 4px', textAlign: 'center', width: '50%' }}>القيمة</th>
          </tr>
        </thead>
        <tbody>
          <tr style={{ borderBottom: '1px solid #ddd' }}><td style={{ padding: '4px', textAlign: 'right', fontWeight: 'bold' }}>رصيد البداية</td><td style={{ padding: '4px', textAlign: 'center' }}>{data.startingBalance}</td></tr>
          <tr style={{ borderBottom: '1px solid #ddd' }}><td style={{ padding: '4px', textAlign: 'right' }}>مبيعات نقداً</td><td style={{ padding: '4px', textAlign: 'center', color: '#080' }}>+{data.cashTotal}</td></tr>
          <tr style={{ borderBottom: '1px solid #ddd' }}><td style={{ padding: '4px', textAlign: 'right' }}>مبيعات بطاقة</td><td style={{ padding: '4px', textAlign: 'center', color: '#04f' }}>+{data.cardTotal}</td></tr>
          <tr style={{ borderBottom: '1px solid #ddd' }}><td style={{ padding: '4px', textAlign: 'right' }}>مدفوعات آجلة</td><td style={{ padding: '4px', textAlign: 'center', color: '#800' }}>+{data.creditTotal}</td></tr>
          <tr style={{ borderBottom: '1px solid #ddd' }}><td style={{ padding: '4px', textAlign: 'right' }}>مصروفات</td><td style={{ padding: '4px', textAlign: 'center', color: '#d00' }}>-{data.expensesTotal}</td></tr>
          <tr style={{ borderBottom: '1px solid #ddd' }}><td style={{ padding: '4px', textAlign: 'right' }}>مسحوبات نقداً</td><td style={{ padding: '4px', textAlign: 'center', color: '#d80' }}>-{data.withdrawalsTotal}</td></tr>
          <tr style={{ borderBottom: '1px solid #ddd' }}><td style={{ padding: '4px', textAlign: 'right' }}>مسحوبات بطاقة</td><td style={{ padding: '4px', textAlign: 'center', color: '#d80' }}>-{data.cardWithdrawalsTotal}</td></tr>
          <tr style={{ borderBottom: '1px solid #ddd' }}><td style={{ padding: '4px', textAlign: 'right' }}>مرتجعات</td><td style={{ padding: '4px', textAlign: 'center', color: '#d80' }}>-{data.returnsTotal}</td></tr>
          <tr style={{ borderBottom: '2px solid #000' }}><td style={{ padding: '4px', textAlign: 'right' }}>عدد الفواتير</td><td style={{ padding: '4px', textAlign: 'center' }}>{data.invoiceCount}</td></tr>
        </tbody>
      </table>

      <div style={{ marginBottom: '16px', borderTop: '2px solid #000', paddingTop: '8px' }}>
        <div style={{ fontWeight: 'bold', fontSize: '13px', marginBottom: '8px' }}>تسوية الكاش</div>
        <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '11px' }}>
          <tbody>
            <tr style={{ borderBottom: '1px solid #ddd' }}><td style={{ padding: '4px', textAlign: 'right' }}>الكاش المتوقع بالدرج</td><td style={{ padding: '4px', textAlign: 'center' }}>{data.expectedCash}</td></tr>
            <tr style={{ borderBottom: '1px solid #ddd' }}><td style={{ padding: '4px', textAlign: 'right' }}>الكاش الفعلي</td><td style={{ padding: '4px', textAlign: 'center' }}>{data.actualCash}</td></tr>
            <tr style={{ borderBottom: '1px solid #ddd' }}>
              <td style={{ padding: '4px', textAlign: 'right' }}>{data.cashDiffLabel}</td>
              <td style={{ padding: '4px', textAlign: 'center', fontWeight: 'bold', color: data.cashDiffLabel === 'مطابق' ? '#080' : data.cashDiffLabel === 'عجز' ? '#d00' : '#d80' }}>
                {data.cashDiff}
              </td>
            </tr>
          </tbody>
        </table>
      </div>

      {data.cardTotal && parseFloat(data.cardTotal.replace(/[^\d.-]/g, '')) > 0 && (
        <div style={{ marginBottom: '16px', borderTop: '2px solid #000', paddingTop: '8px' }}>
          <div style={{ fontWeight: 'bold', fontSize: '13px', marginBottom: '8px' }}>تسوية البطاقة</div>
          <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '11px' }}>
            <tbody>
              <tr style={{ borderBottom: '1px solid #ddd' }}><td style={{ padding: '4px', textAlign: 'right' }}>البطاقة المتوقعة</td><td style={{ padding: '4px', textAlign: 'center' }}>{data.expectedCard}</td></tr>
              <tr style={{ borderBottom: '1px solid #ddd' }}><td style={{ padding: '4px', textAlign: 'right' }}>البطاقة الفعلية</td><td style={{ padding: '4px', textAlign: 'center' }}>{data.actualCard}</td></tr>
              <tr style={{ borderBottom: '1px solid #ddd' }}>
                <td style={{ padding: '4px', textAlign: 'right' }}>{data.cardDiffLabel}</td>
                <td style={{ padding: '4px', textAlign: 'center', fontWeight: 'bold', color: data.cardDiffLabel === 'مطابق' ? '#080' : data.cardDiffLabel === 'عجز' ? '#d00' : '#d80' }}>
                  {data.cardDiff}
                </td>
              </tr>
            </tbody>
          </table>
        </div>
      )}

      <div style={{ position: 'absolute', bottom: '10mm', left: '20mm', right: '20mm', textAlign: 'center', fontSize: '10px', borderTop: '1px solid #ccc', paddingTop: '6px' }}>
        <div>SMART X POS - تقرير وردية</div>
        <div>تم الطباعة في: {new Date().toLocaleString('ar-EG')}</div>
      </div>
    </div>
  )
}