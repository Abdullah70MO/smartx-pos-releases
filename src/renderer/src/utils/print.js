import { renderToString } from 'preact-render-to-string'

export async function printA4(element) {
  const html = renderToString(element)
  const fullHtml = `<!DOCTYPE html><html dir="rtl"><head><meta charset="utf-8"><style>@page{size:A4;margin:10mm}body{font-family:Cairo,Tahoma,Arial,sans-serif;margin:0;padding:0;direction:rtl;color:#000;background:#fff}*{box-sizing:border-box}table{width:100%;border-collapse:collapse}th,td{padding:6px 4px;text-align:center;font-size:11px}th{border-bottom:2px solid #000}td{border-bottom:1px solid #ddd}</style></head><body>${html}</body></html>`
  try {
    await window.smartx.printA4(fullHtml)
  } catch {
    const win = window.open('', '_blank')
    if (win) {
      win.document.write(fullHtml)
      win.document.close()
      setTimeout(() => { win.print(); win.close() }, 500)
    }
  }
}
