import { defineConfig } from 'vitest/config';
import { playwright } from '@vitest/browser-playwright';
import react from '@vitejs/plugin-react';
import { resolve } from 'path';

const testsUsingJsdomSpecificMocking = [
  '**/GraphContext.test.tsx',
  '**/FileUpload.test.tsx',
  '**/EmptyState.test.tsx',
  '**/App.test.tsx',
];

export default defineConfig(() => ({
  root: __dirname,
  cacheDir: '../../node_modules/.vite/apps/eclair-browser',
  plugins: [react()],
  resolve: { alias: { '@': resolve(__dirname, './src') } },
  test: {
    name: '@living-architecture/eclair-browser',
    watch: false,
    globals: true,
    include: ['{src,tests}/**/*.{test,spec}.{js,mjs,cjs,ts,mts,cts,jsx,tsx}'],
    exclude: testsUsingJsdomSpecificMocking,
    // Disable file parallelism in CI for stability with multiple browsers
    fileParallelism: !process.env.CI,
    retry: process.env.CI ? 2 : 0,
    browser: {
      enabled: true,
      headless: true,
      provider: playwright(),
      instances: [
        { browser: 'chromium' },
        { browser: 'firefox' },
        { browser: 'webkit' },
      ],
    },
  },
}));
