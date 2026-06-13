import { createRoot } from 'react-dom/client'

export function printA4(element) {
  const win = window.open('', '_blank')
  if (!win) return
  const wrapper = win.document.createElement('div')
  wrapper.id = 'a4-print-root'
  win.document.body.innerHTML = '<style>@page{size:A4;margin:10mm}body{direction:rtl;font-family:Cairo,sans-serif;margin:0;padding:0}*{box-sizing:border-box}</style>'
  win.document.body.appendChild(wrapper)
  const root = createRoot(wrapper)
  root.render(element)
  win.document.close()
  setTimeout(() => { win.print(); win.close() }, 500)
}
