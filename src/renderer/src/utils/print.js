import { renderToString } from 'preact-render-to-string'

function getPrintOpts() {
  const silent = localStorage.getItem('printDirectly') === 'true'
  const deviceName = localStorage.getItem('defaultPrinter') || undefined
  return { silent, deviceName }
}

export async function printA4(element) {
  const html = renderToString(element)
  const fullHtml = `<!DOCTYPE html><html dir="rtl"><head><meta charset="utf-8"><title>SmartX - طباعة</title><style>@page{size:A4;margin:10mm}body{font-family:Tahoma,Arial,sans-serif;margin:0;padding:0;direction:rtl;color:#000;background:#fff}*{box-sizing:border-box;-webkit-print-color-adjust:economy;print-color-adjust:economy}table{width:100%;border-collapse:collapse}th,td{padding:6px 4px;text-align:center;font-size:11px}th{border-bottom:2px solid #000}td{border-bottom:1px solid #ddd}</style></head><body>${html}</body></html>`
  const token = localStorage.getItem('token')
  const opts = getPrintOpts()
  await window.smartx.printA4(token, fullHtml, opts.silent, opts.deviceName)
}

export async function printThermal(element) {
  const html = renderToString(element)
  const paperSize = localStorage.getItem('thermalPaperSize') || '80mm'
  const pageSizeCss = paperSize === 'custom'
    ? (localStorage.getItem('customPaperWidth') || '80') + 'mm auto'
    : paperSize + ' auto'
  const fullHtml = `<!DOCTYPE html><html dir="rtl"><head><meta charset="utf-8"><title>SmartX - طباعة حرارية</title><style>@page{size:${pageSizeCss};margin:0}body{font-family:Tahoma,Arial,sans-serif;margin:0;padding:8px;direction:rtl;color:#000;background:#fff;font-size:12px}*{box-sizing:border-box;-webkit-print-color-adjust:economy;print-color-adjust:economy}table{width:100%;border-collapse:collapse}td{padding:2px 4px;font-size:11px}.bold{font-weight:bold}.center{text-align:center}.right{text-align:right}.left{text-align:left}hr{border:0;border-top:1px dashed #000;margin:4px 0}</style></head><body>${html}</body></html>`
  const token = localStorage.getItem('token')
  const opts = getPrintOpts()
  await window.smartx.printA4(token, fullHtml, opts.silent, opts.deviceName)
}

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

function generateBarcodeSvg(code, width, height) {
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

export async function printBarcode(barcodeCode) {
  const labelSize = localStorage.getItem('barcodeLabelSize') || '50x30'
  const dims = labelSize.split('x').map(Number)
  const wMm = Number(dims[0]) || 50
  const hMm = Number(dims[1]) || 30
  const barcodePrinter = localStorage.getItem('barcodePrinter') || undefined
  const token = localStorage.getItem('token')
  const silent = localStorage.getItem('printDirectly') === 'true'
  const bw = wMm * 3.78
  const bh = hMm * 3.78
  const svg = generateBarcodeSvg(barcodeCode, bw, bh)
  const fullHtml = `<!DOCTYPE html><html><head><meta charset="utf-8"><title>SmartX - باركود</title><style>@page{size:${wMm}mm ${hMm}mm;margin:0}body{margin:0;padding:0;display:flex;align-items:center;justify-content:center;width:${wMm}mm;height:${hMm}mm;background:#fff;overflow:hidden}</style></head><body>${svg}</body></html>`
  await window.smartx.printA4(token, fullHtml, silent, barcodePrinter)
}
