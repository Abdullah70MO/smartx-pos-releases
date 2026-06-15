import { renderToString } from 'preact-render-to-string'

export async function printA4(element) {
  const html = renderToString(element)
  const fullHtml = `<!DOCTYPE html><html dir="rtl"><head><meta charset="utf-8"><title>SmartX - طباعة</title><style>@page{size:A4;margin:10mm}body{font-family:Cairo,Tahoma,Arial,sans-serif;margin:0;padding:0;direction:rtl;color:#000;background:#fff}*{box-sizing:border-box}table{width:100%;border-collapse:collapse}th,td{padding:6px 4px;text-align:center;font-size:11px}th{border-bottom:2px solid #000}td{border-bottom:1px solid #ddd}</style></head><body>${html}</body></html>`
  const token = localStorage.getItem('token')
  await window.smartx.printA4(token, fullHtml)
}
