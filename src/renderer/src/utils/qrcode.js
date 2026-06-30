import QRCode from 'qrcode'

export function generateQrSvg(text, size = 90) {
  const qr = QRCode.create(text, { errorCorrectionLevel: 'M' })
  const modules = qr.modules.data
  const count = qr.modules.size
  const moduleSize = size / count
  let rects = ''
  for (let row = 0; row < count; row++) {
    for (let col = 0; col < count; col++) {
      if (modules[row * count + col]) {
        rects += `<rect x="${col * moduleSize}" y="${row * moduleSize}" width="${moduleSize}" height="${moduleSize}" fill="#000"/>`
      }
    }
  }
  return `<svg width="${size}" height="${size}" xmlns="http://www.w3.org/2000/svg" style="background:#fff;display:block;margin:0 auto">${rects}</svg>`
}
