import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

// The factory server serves the bundle at /assets/<file> and reads it from dist/<file>, so the
// page has to point at that prefix while the files stay at the top of dist.
export default defineConfig({
  base: '/assets/',
  plugins: [react()],
  build: {
    outDir: 'dist',
    emptyOutDir: true,
    rollupOptions: {
      output: {
        entryFileNames: 'factory-ui.js',
        assetFileNames: 'factory-ui.[ext]',
      },
    },
  },
})
