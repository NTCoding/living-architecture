import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
import tailwindcss from '@tailwindcss/vite';
import { resolve } from 'path';

export default defineConfig({
  base: '/eclair/',
  plugins: [react(), tailwindcss()],
  resolve: {alias: {'@': resolve(__dirname, './src'),},},
});
