const { spawn } = require('node:child_process')

function kill(proc) {
  if (proc && !proc.killed) try { proc.kill() } catch {}
}

async function waitForServer(url, timeoutMs = 30000) {
  const start = Date.now()
  while (Date.now() - start < timeoutMs) {
    try {
      const res = await fetch(url)
      if (res.ok) return true
    } catch {}
    await new Promise(r => setTimeout(r, 500))
  }
  throw new Error(`Server at ${url} did not start within ${timeoutMs}ms`)
}

async function main() {
  const port = 5173
  const url = `http://localhost:${port}`

  console.log('Starting Vite dev server...')
  const vite = spawn('npx.cmd', ['vite', '--port', String(port), '--strictPort'], {
    stdio: 'inherit',
    shell: true
  })

  vite.on('exit', (code) => {
    console.log(`Vite exited with code ${code}`)
    process.exit(code ?? 1)
  })

  try {
    await waitForServer(url)
    console.log(`Vite ready at ${url}`)
    console.log('Starting Electron...')

    const env = { ...process.env, ELECTRON_RENDERER_URL: url }
    const electron = spawn('npx.cmd', ['electron', '.'], {
      stdio: 'inherit',
      shell: true,
      env
    })

    electron.on('exit', (code) => {
      console.log(`Electron exited with code ${code}`)
      vite.kill()
      process.exit(code ?? 0)
    })

    process.on('SIGINT', () => { kill(electron); kill(vite); process.exit(0) })
    process.on('SIGTERM', () => { kill(electron); kill(vite); process.exit(0) })
  } catch (err) {
    console.error('FATAL:', err.message)
    vite.kill()
    process.exit(1)
  }
}

main()
