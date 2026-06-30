import { renderToString } from 'preact-render-to-string'
import { generateBarcodeSvg } from './barcode'

export function renderThermalHtml(element) {
  const html = renderToString(element)
  const font = localStorage.getItem('fontFamily') || 'Cairo'
  const fontLink = `<link href="https://fonts.googleapis.com/css2?family=${encodeURIComponent(font)}:wght@300;400;500;600;700;800&display=swap" rel="stylesheet" />`
  const paperSize = localStorage.getItem('thermalPaperSize') || '80mm'
  const pageSizeCss = paperSize === 'custom'
    ? (localStorage.getItem('customPaperWidth') || '80') + 'mm auto'
    : paperSize + ' auto'
  return `<!DOCTYPE html><html dir="rtl" lang="ar"><head><meta charset="utf-8">${fontLink}<style>@page{size:${pageSizeCss};margin:0}body{font-family:'Segoe UI',Tahoma,Arial,sans-serif;margin:0;padding:8px;direction:rtl;color:#000;background:#fff;font-size:12px}*{box-sizing:border-box;-webkit-print-color-adjust:exact;print-color-adjust:exact}table{width:100%;border-collapse:collapse}th,td{padding:2px 4px;font-size:11px}th{font-weight:600}img{mix-blend-mode:multiply}</style></head><body>${html}</body></html>`
}

export function renderA4Html(element) {
  const html = renderToString(element)
  const font = localStorage.getItem('fontFamily') || 'Cairo'
  const fontLink = `<link href="https://fonts.googleapis.com/css2?family=${encodeURIComponent(font)}:wght@300;400;500;600;700;800&display=swap" rel="stylesheet" />`
  return `<!DOCTYPE html><html dir="rtl" lang="ar"><head><meta charset="utf-8">${fontLink}<style>@page{size:A4;margin:10mm}body{font-family:'Segoe UI',Tahoma,Arial,sans-serif;margin:0;padding:0;direction:rtl;color:#000;background:#fff}*{box-sizing:border-box;-webkit-print-color-adjust:economy;print-color-adjust:economy}table{width:100%;border-collapse:collapse}th,td{padding:6px 4px;text-align:center;font-size:11px}th{border-bottom:2px solid #000}td{border-bottom:1px solid #ddd}img{mix-blend-mode:multiply}</style></head><body>${html}</body></html>`
}

function getPrintOpts() {
  const silent = localStorage.getItem('printDirectly') === 'true'
  const deviceName = localStorage.getItem('defaultPrinter') || undefined
  return { silent, deviceName }
}

export async function printA4(element) {
  const fullHtml = renderA4Html(element)
  const token = localStorage.getItem('token')
  const opts = getPrintOpts()
  await window.smartx.printA4(token, fullHtml, opts.silent, opts.deviceName, 'A4')
}

export async function printThermal(element) {
  const fullHtml = renderThermalHtml(element)
  const token = localStorage.getItem('token')
  const opts = getPrintOpts()
  const paperSize = localStorage.getItem('thermalPaperSize') || '80mm'
  const pageSizeCss = paperSize === 'custom'
    ? (localStorage.getItem('customPaperWidth') || '80') + 'mm auto'
    : paperSize + ' auto'
  await window.smartx.printA4(token, fullHtml, opts.silent, opts.deviceName, pageSizeCss)
}

export async function printBarcode(barcodeCode, productInfo) {
  const labelSize = localStorage.getItem('barcodeLabelSize') || '50x30'
  const dims = labelSize.split('x').map(Number)
  const wMm = Number(dims[0]) || 50
  const hMm = Number(dims[1]) || 30
  const barcodePrinter = localStorage.getItem('barcodePrinter') || undefined
  const token = localStorage.getItem('token')
  const silent = getPrintOpts().silent
  const bw = wMm * 3.78
  const bh = hMm * 3.78
  const showName = localStorage.getItem('barcodeShowName') !== 'false'
  const showPrice = localStorage.getItem('barcodeShowPrice') !== 'false'
  const scale = Number(localStorage.getItem('barcodeScale')) || 1
  const fontWeight = localStorage.getItem('barcodeFontWeight') || 'bold'
  const svg = generateBarcodeSvg(barcodeCode, bw * scale, bh * scale)
  const pageSize = `${wMm}mm ${hMm}mm`
  const extra = []
  if (showName && productInfo?.name) extra.push(`<div style="font-size:10px;font-weight:${fontWeight};text-align:center;margin-bottom:2px">${productInfo.name}</div>`)
  if (showPrice && productInfo?.price != null) extra.push(`<div style="font-size:9px;font-weight:${fontWeight};text-align:center;margin-bottom:1px">${productInfo.price} ج.م</div>`)
  const content = extra.length
    ? `<div style="display:flex;flex-direction:column;align-items:center;justify-content:center;width:100%;height:100%">${extra.join('')}${svg}</div>`
    : svg
  const fullHtml = `<!DOCTYPE html><html><head><meta charset="utf-8"><title>SmartX - باركود</title><style>@page{size:${pageSize};margin:0}body{margin:0;padding:4px;display:flex;align-items:center;justify-content:center;width:${wMm}mm;height:${hMm}mm;background:#fff;overflow:hidden;font-family:Tahoma,Arial,sans-serif;direction:rtl}*{box-sizing:border-box}</style></head><body>${content}</body></html>`
  await window.smartx.printA4(token, fullHtml, silent, barcodePrinter, pageSize)
}
