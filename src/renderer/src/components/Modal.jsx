export default function Modal({ open, onClose, title, children, width = '500px', closable = true }) {
  if (!open) return null

  return (
    <div style={{
      position: 'fixed', inset: 0, zIndex: 1000, display: 'flex',
      alignItems: 'center', justifyContent: 'center',
      background: 'rgba(0,0,0,0.6)'
    }} onClick={closable ? onClose : undefined}>
      <div style={{
        background: 'var(--bg2)', borderRadius: '24px', width, maxWidth: '92vw',
        maxHeight: '88vh', overflow: 'auto', padding: '24px',
        border: '1px solid var(--outline)',
        boxShadow: 'var(--elevation-3)',
        display: 'flex', flexDirection: 'column', gap: '16px'
      }} onClick={e => e.stopPropagation()}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          <div style={{ fontSize: '18px', fontWeight: '700', color: 'var(--text)' }}>{title}</div>
          {closable && <button onClick={onClose} style={{ 
            background: 'var(--bg3)', 
            color: 'var(--text2)', 
            fontSize: '16px', 
            borderRadius: '50%', 
            width: '32px', 
            height: '32px',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            lineHeight: '1'
          }}>✕</button>}
        </div>
        <div style={{ overflow: 'auto', flex: 1 }}>
          {children}
        </div>
      </div>
    </div>
  )
}
