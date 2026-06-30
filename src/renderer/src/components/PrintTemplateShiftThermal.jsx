export default function PrintTemplateShiftThermal({ data, businessName, businessPhone, businessAddress, logoDataUrl, showLogo, paperWidth = 80 }) {
  const accentColor = '#1a56db'

  return (
    <div style={{
      width: '100%', maxWidth: paperWidth + 'mm', margin: '0 auto', padding: '8px 6px',
      fontFamily: '"Cairo", "Segoe UI", Tahoma, Arial, sans-serif', fontSize: '10px',
      fontWeight: '400', lineHeight: '1.35', color: '#111827', direction: 'rtl', background: '#fff'
    }}>

      {/* ── Header ── */}
      {(showLogo !== false && logoDataUrl) || businessName || businessPhone || businessAddress ? (
        <div style={{ marginBottom: '6px' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
            {showLogo !== false && logoDataUrl && (
              <div style={{ flexShrink: 0 }}>
                <img src={logoDataUrl} alt="logo" style={{ maxHeight: '38px', maxWidth: '80px' }} />
              </div>
            )}
            <div style={{ flex: 1, textAlign: logoDataUrl ? 'right' : 'center' }}>
              <div style={{ fontWeight: '800', fontSize: '13px', color: '#111827' }}>{businessName || 'SMART X POS'}</div>
              {businessPhone && <div style={{ fontSize: '8px', color: '#4b5563', lineHeight: '1.5' }}>{businessPhone}</div>}
              {businessAddress && <div style={{ fontSize: '8px', color: '#4b5563', lineHeight: '1.5' }}>{businessAddress}</div>}
            </div>
          </div>
        </div>
      ) : null}

      {/* ── Accent Bar ── */}
      <div style={{ height: '3px', background: accentColor, marginBottom: '6px', borderRadius: '2px' }} />

      {/* ── Shift Info Box ── */}
      <div style={{
        background: '#f8fafc', border: '1px solid #e5e7eb', borderRadius: '4px',
        padding: '6px 8px', marginBottom: '6px'
      }}>
        <div style={{ fontWeight: '700', fontSize: '11px', color: accentColor, marginBottom: '2px' }}>تقرير وردية</div>
        <div style={{ fontSize: '8px', color: '#4b5563', lineHeight: '1.5' }}>
          {data.cashierName && <div>الكاشير: {data.cashierName}</div>}
          {data.startedAt && <div>التاريخ: {data.startedAt.split(',')[0] || data.startedAt}</div>}
          <div>
            من: {data.startedAt ? data.startedAt.split(',')[1]?.trim() || data.startedAt : ''}
            {data.endedAt && data.endedAt !== 'نشطة' ? ` - إلى: ${data.endedAt.split(',')[1]?.trim() || data.endedAt}` : ''}
            {data.endedAt === 'نشطة' && ' - نشطة'}
          </div>
        </div>
      </div>

      {/* ── Sales Breakdown Table ── */}
      <table style={{ width: '100%', borderCollapse: 'collapse', marginBottom: '6px', fontSize: '9px' }}>
        <thead>
          <tr style={{ background: '#f3f4f6', borderBottom: '1px solid #d1d5db' }}>
            <th style={{ padding: '4px 3px', textAlign: 'right', fontWeight: '600', fontSize: '8px' }}>البيان</th>
            <th style={{ padding: '4px 3px', textAlign: 'center', fontWeight: '600', fontSize: '8px', width: '70px' }}>المبلغ</th>
          </tr>
        </thead>
        <tbody>
          <tr style={{ borderBottom: '1px solid #f3f4f6' }}>
            <td style={{ padding: '3px 3px', textAlign: 'right', fontSize: '8px' }}>رصيد البداية</td>
            <td style={{ padding: '3px 3px', textAlign: 'center', fontSize: '8px' }}>{data.startingBalance}</td>
          </tr>
          <tr style={{ borderBottom: '1px solid #f3f4f6' }}>
            <td style={{ padding: '3px 3px', textAlign: 'right', fontSize: '8px', color: '#15803d' }}>مبيعات نقداً</td>
            <td style={{ padding: '3px 3px', textAlign: 'center', fontSize: '8px', color: '#15803d' }}>+{data.cashTotal}</td>
          </tr>
          <tr style={{ borderBottom: '1px solid #f3f4f6' }}>
            <td style={{ padding: '3px 3px', textAlign: 'right', fontSize: '8px', color: '#1a56db' }}>مبيعات بطاقة</td>
            <td style={{ padding: '3px 3px', textAlign: 'center', fontSize: '8px', color: '#1a56db' }}>+{data.cardTotal}</td>
          </tr>
          <tr style={{ borderBottom: '1px solid #f3f4f6' }}>
            <td style={{ padding: '3px 3px', textAlign: 'right', fontSize: '8px', color: '#7c3aed' }}>مدفوعات آجلة</td>
            <td style={{ padding: '3px 3px', textAlign: 'center', fontSize: '8px', color: '#7c3aed' }}>+{data.creditTotal}</td>
          </tr>
          <tr style={{ borderBottom: '1px solid #f3f4f6' }}>
            <td style={{ padding: '3px 3px', textAlign: 'right', fontSize: '8px', color: '#d00' }}>مصروفات</td>
            <td style={{ padding: '3px 3px', textAlign: 'center', fontSize: '8px', color: '#d00' }}>-{data.expensesTotal}</td>
          </tr>
          <tr style={{ borderBottom: '1px solid #f3f4f6' }}>
            <td style={{ padding: '3px 3px', textAlign: 'right', fontSize: '8px', color: '#d80' }}>مسحوبات نقداً</td>
            <td style={{ padding: '3px 3px', textAlign: 'center', fontSize: '8px', color: '#d80' }}>-{data.withdrawalsTotal}</td>
          </tr>
          <tr style={{ borderBottom: '1px solid #f3f4f6' }}>
            <td style={{ padding: '3px 3px', textAlign: 'right', fontSize: '8px', color: '#d80' }}>مسحوبات بطاقة</td>
            <td style={{ padding: '3px 3px', textAlign: 'center', fontSize: '8px', color: '#d80' }}>-{data.cardWithdrawalsTotal}</td>
          </tr>
          <tr style={{ borderBottom: '1px solid #f3f4f6' }}>
            <td style={{ padding: '3px 3px', textAlign: 'right', fontSize: '8px', color: '#d80' }}>مرتجعات</td>
            <td style={{ padding: '3px 3px', textAlign: 'center', fontSize: '8px', color: '#d80' }}>-{data.returnsTotal}</td>
          </tr>
          <tr style={{ borderBottom: '1px solid #d1d5db', fontWeight: '700' }}>
            <td style={{ padding: '4px 3px', textAlign: 'right', fontSize: '9px' }}>عدد الفواتير</td>
            <td style={{ padding: '4px 3px', textAlign: 'center', fontSize: '9px' }}>{data.invoiceCount}</td>
          </tr>
        </tbody>
      </table>

      {/* ── Cash Settlement ── */}
      <div style={{
        background: '#f9fafb', border: '1px solid #e5e7eb', borderRadius: '4px',
        padding: '5px 8px', marginBottom: '6px', fontSize: '9px'
      }}>
        <div style={{ fontWeight: '700', fontSize: '10px', color: accentColor, marginBottom: '3px' }}>تسوية الكاش</div>
        <div style={{ display: 'flex', justifyContent: 'space-between', padding: '2px 0' }}>
          <span>الكاش المتوقع</span><span>{data.expectedCash}</span>
        </div>
        <div style={{ display: 'flex', justifyContent: 'space-between', padding: '2px 0' }}>
          <span>الكاش الفعلي</span><span>{data.actualCash}</span>
        </div>
        <hr style={{ border: '0', borderTop: '1px solid #d1d5db', margin: '2px 0' }} />
        <div style={{
          display: 'flex', justifyContent: 'space-between', fontWeight: '700',
          color: data.cashDiffLabel === 'مطابق' ? '#15803d' : data.cashDiffLabel === 'عجز' ? '#d00' : '#d80'
        }}>
          <span>{data.cashDiffLabel}</span><span>{data.cashDiff}</span>
        </div>
      </div>

      {/* ── Card Settlement ── */}
      {data.cardTotal && parseFloat(data.cardTotal.replace(/[^\d.-]/g, '')) > 0 && (
        <div style={{
          background: '#f9fafb', border: '1px solid #e5e7eb', borderRadius: '4px',
          padding: '5px 8px', marginBottom: '6px', fontSize: '9px'
        }}>
          <div style={{ fontWeight: '700', fontSize: '10px', color: accentColor, marginBottom: '3px' }}>تسوية البطاقة</div>
          <div style={{ display: 'flex', justifyContent: 'space-between', padding: '2px 0' }}>
            <span>البطاقة المتوقعة</span><span>{data.expectedCard}</span>
          </div>
          <div style={{ display: 'flex', justifyContent: 'space-between', padding: '2px 0' }}>
            <span>البطاقة الفعلية</span><span>{data.actualCard}</span>
          </div>
          <hr style={{ border: '0', borderTop: '1px solid #d1d5db', margin: '2px 0' }} />
          <div style={{
            display: 'flex', justifyContent: 'space-between', fontWeight: '700',
            color: data.cardDiffLabel === 'مطابق' ? '#15803d' : data.cardDiffLabel === 'عجز' ? '#d00' : '#d80'
          }}>
            <span>{data.cardDiffLabel}</span><span>{data.cardDiff}</span>
          </div>
        </div>
      )}

      {/* ── Footer ── */}
      <div style={{
        textAlign: 'center', fontSize: '8px', borderTop: '1px solid #d1d5db',
        paddingTop: '4px', marginTop: '2px', color: '#6b7280', lineHeight: '1.5'
      }}>
        <div>{businessName || 'SMART X POS'} - تقرير وردية</div>
        <div>تم الطباعة: {new Date().toLocaleString('ar-EG')}</div>
      </div>
    </div>
  )
}
