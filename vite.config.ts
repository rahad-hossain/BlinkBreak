import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import path from 'path'
import { copyFileSync, mkdirSync } from 'fs'

export default defineConfig({
  plugins: [
    react(),
    {
      name: 'copy-break-screens',
      closeBundle() {
        // Copy break screen HTML files to dist
        try {
          mkdirSync('dist/renderer', { recursive: true })
          copyFileSync('src/renderer/hardBreak.html', 'dist/renderer/hardBreak.html')
          copyFileSync('src/renderer/softBreak.html', 'dist/renderer/softBreak.html')
          console.log('✓ Break screen HTML files copied to dist')
        } catch (err) {
          console.error('Error copying break screen files:', err)
        }
      }
    }
  ],
  resolve: {
    alias: {
      '@': path.resolve(__dirname, './src'),
      '@renderer': path.resolve(__dirname, './src/renderer'),
      '@main': path.resolve(__dirname, './src/main'),
      '@shared': path.resolve(__dirname, './src/shared')
    }
  },
  base: './',
  build: {
    outDir: 'dist/renderer'
  },
  server: {
    port: 5173
  }
})
