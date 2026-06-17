import { renderToString } from 'preact-render-to-string'

export async function printA4(element) {
  const html = renderToString(element)
  const fullHtml = `<!DOCTYPE html><html dir="rtl"><head><meta charset="utf-8"><title>SmartX - طباعة</title><style>@page{size:A4;margin:10mm}body{font-family:Tahoma,Arial,sans-serif;margin:0;padding:0;direction:rtl;color:#000;background:#fff}*{box-sizing:border-box;-webkit-print-color-adjust:economy;print-color-adjust:economy}table{width:100%;border-collapse:collapse}th,td{padding:6px 4px;text-align:center;font-size:11px}th{border-bottom:2px solid #000}td{border-bottom:1px solid #ddd}</style></head><body>${html}</body></html>`
  const token = localStorage.getItem('token')
  const silent = localStorage.getItem('printDirectly') === 'true'
  await window.smartx.printA4(token, fullHtml, silent)
}

export async function printThermal(element) {
  const html = renderToString(element)
  const fullHtml = `<!DOCTYPE html><html dir="rtl"><head><meta charset="utf-8"><title>SmartX - طباعة حرارية</title><style>@page{size:80mm auto;margin:0}body{font-family:Tahoma,Arial,sans-serif;margin:0;padding:8px;direction:rtl;color:#000;background:#fff;font-size:12px}*{box-sizing:border-box;-webkit-print-color-adjust:economy;print-color-adjust:economy}table{width:100%;border-collapse:collapse}td{padding:2px 4px;font-size:11px}.bold{font-weight:bold}.center{text-align:center}.right{text-align:right}.left{text-align:left}hr{border:0;border-top:1px dashed #000;margin:4px 0}</style></head><body>${html}</body></html>`
  const token = localStorage.getItem('token')
  const silent = localStorage.getItem('printDirectly') === 'true'
  await window.smartx.printA4(token, fullHtml, silent)
}
