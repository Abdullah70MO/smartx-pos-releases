export function calcEAN13Check(code) {
  let sum = 0
  for (let i = 0; i < code.length; i++) {
    sum += parseInt(code[i]) * (i % 2 === 0 ? 1 : 3)
  }
  const mod = sum % 10
  return String(mod === 0 ? 0 : 10 - mod)
}

export function generateBarcode() {
  const first = Math.floor(Math.random() * 9) + 1
  const rest = Array.from({ length: 11 }, () => Math.floor(Math.random() * 10)).join('')
  const digits = String(first) + rest
  const check = calcEAN13Check(digits)
  return digits + check
}

const L_CODE = ['0001101','0011001','0010011','0111101','0100011','0110001','0101111','0111011','0110111','0001011']
const G_CODE = ['0100111','0110011','0011011','0100001','0011101','0111001','0000101','0010001','0001001','0010111']
const R_CODE = ['1110010','1100110','1101100','1000010','1011100','1001110','1010000','1000100','1001000','1110100']
const PARITY = ['LLLLLL','LLGLGG','LLGGLG','LLGGGL','LGLLGG','LGGLLG','LGGGLL','LGLGLG','LGLGGL','LGGLGL']

export function encodeEAN13(code) {
  const first = parseInt(code[0])
  const left = code.slice(1, 7).split('')
  const right = code.slice(7).split('')
  const parity = PARITY[first]
  let pattern = '101'
  left.forEach((d, i) => {
    pattern += (parity[i] === 'L' ? L_CODE : G_CODE)[parseInt(d)]
  })
  pattern += '01010'
  right.forEach(d => {
    pattern += R_CODE[parseInt(d)]
  })
  pattern += '101'
  return pattern
}

export function generateBarcodeSvg(code, width, height) {
  const pattern = encodeEAN13(code)
  const moduleWidth = width / pattern.length
  let x = 0
  let rects = ''
  for (let i = 0; i < pattern.length; i++) {
    if (pattern[i] === '1') {
      rects += `<rect x="${x}" y="0" width="${moduleWidth}" height="${height-16}" fill="#000"/>`
    }
    x += moduleWidth
  }
  return `<svg width="${width}" height="${height}" xmlns="http://www.w3.org/2000/svg" style="background:#fff">
    ${rects}
    <text x="${width/2}" y="${height-2}" text-anchor="middle" font-family="monospace" font-size="11" fill="#000">${code}</text>
  </svg>`
}
