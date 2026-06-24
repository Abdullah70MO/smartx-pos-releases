import { renderToString } from 'preact-render-to-string'
import { generateBarcodeSvg } from './barcode'

function getPrintOpts() {
  const silent = localStorage.getItem('printDirectly') === 'true'
  const deviceName = localStorage.getItem('defaultPrinter') || undefined
  return { silent, deviceName }
}

export async function printA4(element) {
  const html = renderToString(element)
  const fullHtml = `<!DOCTYPE html><html dir="rtl" lang="ar"><head><meta charset="utf-8"><title>SmartX - طباعة</title><style>@page{size:A4;margin:10mm}body{font-family:'Segoe UI',Tahoma,Arial,sans-serif;margin:0;padding:0;direction:rtl;color:#000;background:#fff}*{box-sizing:border-box;-webkit-print-color-adjust:economy;print-color-adjust:economy}table{width:100%;border-collapse:collapse}th,td{padding:6px 4px;text-align:center;font-size:11px}th{border-bottom:2px solid #000}td{border-bottom:1px solid #ddd}</style></head><body>${html}</body></html>`
  const token = localStorage.getItem('token')
  const opts = getPrintOpts()
  await window.smartx.printA4(token, fullHtml, opts.silent, opts.deviceName, 'A4')
}

export async function printThermal(element) {
  const html = renderToString(element)
  const paperSize = localStorage.getItem('thermalPaperSize') || '80mm'
  const paperWidth = paperSize === 'custom' ? (localStorage.getItem('customPaperWidth') || '80') + 'mm' : paperSize
  const pageSizeCss = paperSize === 'custom'
    ? (localStorage.getItem('customPaperWidth') || '80') + 'mm auto'
    : paperSize + ' auto'
  const fullHtml = `<!DOCTYPE html><html dir="rtl" lang="ar"><head><meta charset="utf-8"><title>SmartX - طباعة حرارية</title><style>@page{size:${pageSizeCss};margin:0}body{font-family:'Segoe UI',Tahoma,Arial,sans-serif;margin:0;padding:8px;direction:rtl;color:#000;background:#fff;font-size:12px}*{box-sizing:border-box;-webkit-print-color-adjust:economy;print-color-adjust:economy}table{width:100%;border-collapse:collapse}td{padding:2px 4px;font-size:11px}.bold{font-weight:bold}.center{text-align:center}.right{text-align:right}.left{text-align:left}hr{border:0;border-top:1px dashed #000;margin:4px 0}</style></head><body>${html}</body></html>`
  const token = localStorage.getItem('token')
  const opts = getPrintOpts()
  await window.smartx.printA4(token, fullHtml, opts.silent, opts.deviceName, paperWidth)
}

export async function printBarcode(barcodeCode) {
  const labelSize = localStorage.getItem('barcodeLabelSize') || '50x30'
  const dims = labelSize.split('x').map(Number)
  const wMm = Number(dims[0]) || 50
  const hMm = Number(dims[1]) || 30
  const barcodePrinter = localStorage.getItem('barcodePrinter') || undefined
  const token = localStorage.getItem('token')
  const silent = getPrintOpts().silent
  const bw = wMm * 3.78
  const bh = hMm * 3.78
  const svg = generateBarcodeSvg(barcodeCode, bw, bh)
  const fullHtml = `<!DOCTYPE html><html><head><meta charset="utf-8"><title>SmartX - باركود</title><style>@page{size:${wMm}mm ${hMm}mm;margin:0}body{margin:0;padding:0;display:flex;align-items:center;justify-content:center;width:${wMm}mm;height:${hMm}mm;background:#fff;overflow:hidden}</style></head><body>${svg}</body></html>`
  await window.smartx.printA4(token, fullHtml, silent, barcodePrinter)
}
