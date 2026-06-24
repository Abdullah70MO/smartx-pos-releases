import { formatMoney } from '../utils/money'

export default function PrintTemplateInventory({ inventory, settings }) {
  const logoHtml = settings?.showLogo && settings?.logoDataUrl
    ? `<img src="${settings.logoDataUrl}" style="max-height:60px;max-width:200px;object-fit:contain;margin-bottom:8px" />`
    : ''

  return (
    <div style={{ fontFamily: "'Segoe UI', Tahoma, Arial, sans-serif", fontSize: '12px', color: '#000', background: '#fff', padding: '10mm', direction: 'rtl' }}>
      <div style={{ textAlign: 'center', marginBottom: '16px' }}>
        <div dangerouslySetInnerHTML={{ __html: logoHtml }} />
        {settings?.showBusinessName !== false && <h2 style={{ margin: '4px 0', fontSize: '18px' }}>{settings?.businessName || 'جرد المخزون'}</h2>}
        {settings?.showCommercialReg && settings?.commercialRegistration && <div style={{ fontSize: '11px', color: '#555' }}>سجل تجاري: {settings.commercialRegistration}</div>}
        {settings?.showTaxReg && settings?.taxNumber && <div style={{ fontSize: '11px', color: '#555' }}>رقم ضريبي: {settings.taxNumber}</div>}
        <div style={{ fontSize: '13px', fontWeight: 'bold', marginTop: '8px' }}>تقرير جرد المخزون</div>
        <div style={{ fontSize: '11px', color: '#555' }}>نوع الجرد: {inventory.type === 'full' ? 'جرد كامل' : 'جرد جزئي'}{inventory.filterCategory ? ` - صنف: ${inventory.filterCategory}` : ''}</div>
        <div style={{ fontSize: '11px', color: '#555' }}>التاريخ: {new Date(inventory.createdAt).toLocaleDateString('ar-EG', { year: 'numeric', month: 'long', day: 'numeric' })}</div>
        <div style={{ fontSize: '11px', color: '#555' }}>بواسطة: {inventory.createdBy}</div>
      </div>
      {inventory.notes && <div style={{ background: '#f0f0f0', padding: '8px', borderRadius: '4px', marginBottom: '12px', fontSize: '11px' }}>ملاحظات: {inventory.notes}</div>}

      <div style={{ display: 'flex', gap: '16px', marginBottom: '12px' }}>
        <div style={{ flex: 1, background: '#f0f0f0', borderRadius: '4px', padding: '8px', textAlign: 'center' }}>
          <div style={{ fontSize: '11px', color: '#555' }}>إجمالي المنتجات</div>
          <div style={{ fontSize: '16px', fontWeight: 'bold' }}>{inventory.items.length}</div>
        </div>
        <div style={{ flex: 1, background: '#e8f5e9', borderRadius: '4px', padding: '8px', textAlign: 'center' }}>
          <div style={{ fontSize: '11px', color: '#555' }}>فروقات إجمالية</div>
          <div style={{ fontSize: '16px', fontWeight: 'bold', color: inventory.totalQuantityDifference > 0 ? '#2e7d32' : '#c62828' }}>
            {inventory.totalQuantityDifference > 0 ? '+' : ''}{inventory.totalQuantityDifference}
          </div>
        </div>
        <div style={{ flex: 1, background: '#ffebee', borderRadius: '4px', padding: '8px', textAlign: 'center' }}>
          <div style={{ fontSize: '11px', color: '#555' }}>خسائر الجرد</div>
          <div style={{ fontSize: '16px', fontWeight: 'bold', color: '#c62828' }}>{formatMoney(inventory.totalFinancialLoss)}</div>
        </div>
      </div>

      <table>
        <thead>
          <tr>
            <th style={{ borderBottom: '2px solid #000', padding: '6px 4px', fontSize: '11px', textAlign: 'center' }}>#</th>
            <th style={{ borderBottom: '2px solid #000', padding: '6px 4px', fontSize: '11px', textAlign: 'center' }}>المنتج</th>
            <th style={{ borderBottom: '2px solid #000', padding: '6px 4px', fontSize: '11px', textAlign: 'center' }}>الوحدة</th>
            <th style={{ borderBottom: '2px solid #000', padding: '6px 4px', fontSize: '11px', textAlign: 'center' }}>النظام</th>
            <th style={{ borderBottom: '2px solid #000', padding: '6px 4px', fontSize: '11px', textAlign: 'center' }}>الفعلي</th>
            <th style={{ borderBottom: '2px solid #000', padding: '6px 4px', fontSize: '11px', textAlign: 'center' }}>الفرق</th>
            <th style={{ borderBottom: '2px solid #000', padding: '6px 4px', fontSize: '11px', textAlign: 'center' }}>التكلفة</th>
            <th style={{ borderBottom: '2px solid #000', padding: '6px 4px', fontSize: '11px', textAlign: 'center' }}>الخسارة</th>
          </tr>
        </thead>
        <tbody>
          {inventory.items.map((item, i) => (
            <tr key={item.productId}>
              <td style={{ borderBottom: '1px solid #ddd', padding: '4px', fontSize: '11px', textAlign: 'center' }}>{i + 1}</td>
              <td style={{ borderBottom: '1px solid #ddd', padding: '4px', fontSize: '11px', textAlign: 'right' }}>{item.productName}</td>
              <td style={{ borderBottom: '1px solid #ddd', padding: '4px', fontSize: '11px', textAlign: 'center' }}>{item.unit}</td>
              <td style={{ borderBottom: '1px solid #ddd', padding: '4px', fontSize: '11px', textAlign: 'center' }}>{item.systemQuantity}</td>
              <td style={{ borderBottom: '1px solid #ddd', padding: '4px', fontSize: '11px', textAlign: 'center' }}>{item.actualQuantity}</td>
              <td style={{
                borderBottom: '1px solid #ddd', padding: '4px', fontSize: '11px', textAlign: 'center', fontWeight: 'bold',
                color: item.difference > 0 ? '#2e7d32' : item.difference < 0 ? '#c62828' : 'inherit'
              }}>{item.difference > 0 ? '+' : ''}{item.difference}</td>
              <td style={{ borderBottom: '1px solid #ddd', padding: '4px', fontSize: '11px', textAlign: 'center' }}>{formatMoney(item.cost)}</td>
              <td style={{ borderBottom: '1px solid #ddd', padding: '4px', fontSize: '11px', textAlign: 'center', color: '#c62828' }}>{item.lossAmount > 0 ? formatMoney(item.lossAmount) : '-'}</td>
            </tr>
          ))}
        </tbody>
      </table>

      <div style={{ marginTop: '24px', display: 'flex', justifyContent: 'space-between', fontSize: '11px' }}>
        <div>
          <div style={{ marginBottom: '4px' }}>مسؤول الجرد: ________________</div>
          <div>التوقيع: ________________</div>
        </div>
        <div>
          <div style={{ marginBottom: '4px' }}>المدقق: ________________</div>
          <div>التوقيع: ________________</div>
        </div>
      </div>
    </div>
  )
}
