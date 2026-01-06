import { defineConfig } from 'vite'

export default defineConfig(() => ({
  root: import.meta.dirname,
  cacheDir: '../../node_modules/.vite/packages/riviere-extract-conventions',
  plugins: [],
}))
