function encodeEAN13(code) {
  const s = String(code).replace(/\D/g, '').slice(0, 12)
  if (s.length < 12) return '1'.repeat(95)
  let sum = 0
  for (let i = 0; i < 12; i++) sum += parseInt(s[i]) * (i % 2 ? 3 : 1)
  const check = (10 - (sum % 10)) % 10
  const full = s + check
  const patterns = {
    L: ['0001101','0011001','0010011','0111101','0100011','0110001','0101111','0111011','0110111','0001011'],
    G: ['0100111','0110011','0011011','0100001','0011101','0111001','0000101','0010001','0001001','0010111'],
    R: ['1110010','1100110','1101100','1000010','1011100','1001110','1010000','1000100','1001000','1110100']
  }
  const first = full[0]
  const parities = {
    '0':'LLLLLL','1':'LLGLGG','2':'LLGGLG','3':'LLGGGL','4':'LGLLGG','5':'LGGLLG','6':'LGGGLL','7':'LGLGLG','8':'LGLGGL','9':'LGGLGL'
  }
  const parity = parities[first] || 'LLLLLL'
  let result = '101'
  for (let i = 1; i <= 6; i++) result += patterns[parity[i-1] === 'L' ? 'L' : 'G'][parseInt(full[i])]
  result += '01010'
  for (let i = 7; i <= 12; i++) result += patterns.R[parseInt(full[i])]
  result += '101'
  return result
}

export default function BarcodeSVG({ code, width = 220, height = 55 }) {
  const pattern = encodeEAN13(code)
  const moduleWidth = width / pattern.length
  let x = 0
  const rects = []
  for (let i = 0; i < pattern.length; i++) {
    if (pattern[i] === '1') {
      rects.push(`<rect x="${x}" y="0" width="${moduleWidth}" height="${height-16}" fill="#000" />`)
    }
    x += moduleWidth
  }
  const svgContent = rects.join('')
  const svg = `<svg width="${width}" height="${height}" xmlns="http://www.w3.org/2000/svg" style="background:#fff">
    ${svgContent}
    <text x="${width/2}" y="${height-2}" text-anchor="middle" font-family="monospace" font-size="11" fill="#000">${code}</text>
  </svg>`
  return <div style={{ textAlign: 'center', background: '#fff', borderRadius: '4px' }} dangerouslySetInnerHTML={{ __html: svg }} />
}
