import { encodeEAN13 } from '../utils/barcode'

export default function BarcodeSVG({ code, width = 220, height = 55 }) {
  const pattern = encodeEAN13(code)
  const moduleWidth = width / pattern.length
  const rects = []
  let x = 0
  for (let i = 0; i < pattern.length; i++) {
    if (pattern[i] === '1') {
      rects.push(<rect key={i} x={x} y={0} width={moduleWidth} height={height - 16} fill="#000" />)
    }
    x += moduleWidth
  }
  return (
    <div style={{ textAlign: 'center', background: '#fff', borderRadius: '4px' }}>
      <svg width={width} height={height} xmlns="http://www.w3.org/2000/svg" style={{ background: '#fff' }}>
        {rects}
        <text x={width / 2} y={height - 2} text-anchor="middle" font-family="monospace" font-size="11" fill="#000">{code}</text>
      </svg>
    </div>
  )
}
