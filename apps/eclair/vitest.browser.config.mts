import { defineConfig } from 'vitest/config';
import { playwright } from '@vitest/browser-playwright';
import react from '@vitejs/plugin-react';
import { resolve } from 'path';

const testsRequiringJsdom: string[] = [];

const ALLOWED_BROWSERS = ['chromium', 'firefox', 'webkit'] as const;
type BrowserName = (typeof ALLOWED_BROWSERS)[number];

function parseBrowser(value: string | undefined): BrowserName | undefined {
  if (!value) return undefined;
  if (!ALLOWED_BROWSERS.includes(value as BrowserName)) {
    throw new Error(
      `Invalid BROWSER environment variable: '${value}'. Allowed values: ${ALLOWED_BROWSERS.join(', ')}`,
    );
  }
  return value as BrowserName;
}

function getBrowserInstances(): { browser: BrowserName }[] {
  const browser = parseBrowser(process.env.BROWSER);
  if (browser) {
    return [{ browser }];
  }
  return [
    { browser: 'chromium' },
    { browser: 'firefox' },
    { browser: 'webkit' },
  ];
}

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
    exclude: testsRequiringJsdom,
    fileParallelism: !process.env.CI,
    retry: process.env.CI ? 2 : 0,
    browser: {
      enabled: true,
      headless: true,
      provider: playwright(),
      instances: getBrowserInstances(),
    },
  },
}));
