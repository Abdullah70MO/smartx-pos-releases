import { defineConfig } from 'vite'
import preact from '@preact/preset-vite'
import path from 'path'

export default defineConfig({
  plugins: [preact()],
  root: 'src/renderer',
  base: './',
  build: {
    outDir: path.resolve(__dirname, 'dist'),
    emptyOutDir: true,
    sourcemap: false
  },
  resolve: {
    alias: {
      react: 'preact/compat',
      'react-dom': 'preact/compat',
      zimmerframe: path.resolve(__dirname, 'node_modules/zimmerframe/src/walk.js')
    }
  },
  server: {
    port: 5173
  }
})
