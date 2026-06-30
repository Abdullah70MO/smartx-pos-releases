import { useRef, useEffect } from 'preact/hooks'
import { renderA4Html, renderThermalHtml } from '../utils/print'
import { modalPrimaryBtn } from './ActionIcons'

export default function PreviewModal({ open, onClose, element, title, isA4 }) {
  const iframeRef = useRef(null)

  useEffect(() => {
    if (!open || !element || !iframeRef.current) return
    const html = isA4 ? renderA4Html(element) : renderThermalHtml(element)
    const iframe = iframeRef.current
    iframe.srcdoc = html
  }, [open, element, isA4])

  if (!open) return null

  return (
    <div style={{
      position: 'fixed', inset: 0, zIndex: 1100, display: 'flex',
      alignItems: 'center', justifyContent: 'center',
      background: 'rgba(0,0,0,0.6)'
    }} onClick={onClose}>
      <div style={{
        background: '#fff', borderRadius: '16px', width: 'min(820px, 98vw)',
        maxHeight: '92vh', overflow: 'hidden', padding: '20px',
        display: 'flex', flexDirection: 'column', gap: '12px'
      }} onClick={e => e.stopPropagation()}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          <div style={{ fontSize: '18px', fontWeight: '700', color: '#111' }}>{title || 'معاينة'}</div>
          <button onClick={onClose} style={{
            background: '#f3f4f6', color: '#111', fontSize: '16px',
            borderRadius: '50%', width: '32px', height: '32px', border: 'none',
            display: 'flex', alignItems: 'center', justifyContent: 'center', cursor: 'pointer'
          }}>✕</button>
        </div>
        <div style={{
          flex: 1, background: '#f9fafb', borderRadius: '8px',
          border: '1px solid #e5e7eb', overflow: 'hidden', minHeight: '400px'
        }}>
          <iframe ref={iframeRef} style={{
            width: '100%', height: '100%', minHeight: '500px', border: 'none',
            background: '#fff'
          }} title="معاينة" />
        </div>
        <button onClick={() => {
          const iframe = iframeRef.current
          if (iframe?.contentWindow) iframe.contentWindow.print()
        }} style={{ ...modalPrimaryBtn, width: '100%' }}>
          طباعة
        </button>
      </div>
    </div>
  )
}
