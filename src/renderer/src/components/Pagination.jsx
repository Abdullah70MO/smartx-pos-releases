const btnBase = {
  background: 'var(--bg3)', color: 'var(--text)',
  border: '1px solid var(--outline)', borderRadius: '6px',
  padding: '6px 10px', fontSize: '12px', fontWeight: '600',
  cursor: 'pointer', display: 'inline-flex', alignItems: 'center', gap: '4px'
}

export default function Pagination({ page, totalPages, total, pageSize, onChange }) {
  if (totalPages <= 1) return null

  const pages = []
  const start = Math.max(0, page - 2)
  const end = Math.min(totalPages - 1, page + 2)
  for (let i = start; i <= end; i++) pages.push(i)

  return (
    <div style={{
      display: 'flex', justifyContent: 'center', alignItems: 'center',
      gap: '4px', padding: '12px 0', direction: 'rtl'
    }}>
      <button onClick={() => onChange(page - 1)} disabled={page === 0} style={{
        ...btnBase, opacity: page === 0 ? 0.4 : 1
      }}>‹</button>
      {pages.map(i => (
        <button key={i} onClick={() => onChange(i)} style={{
          ...btnBase,
          background: i === page ? 'var(--accent)' : 'var(--bg3)',
          color: i === page ? '#fff' : 'var(--text)',
          border: i === page ? '1px solid var(--accent)' : '1px solid var(--outline)'
        }}>{i + 1}</button>
      ))}
      <button onClick={() => onChange(page + 1)} disabled={page >= totalPages - 1} style={{
        ...btnBase, opacity: page >= totalPages - 1 ? 0.4 : 1
      }}>›</button>
      <span style={{ fontSize: '11px', color: 'var(--text)', marginRight: '8px' }}>
        {page * pageSize + 1}-{Math.min((page + 1) * pageSize, total)} / {total}
      </span>
    </div>
  )
}
