import { defineConfig } from 'vitest/config';
import { playwright } from '@vitest/browser-playwright';
import react from '@vitejs/plugin-react';
import { resolve } from 'path';

const testsUsingJsdomSpecificMocking = [
  '**/GraphContext.test.tsx',
  '**/FileUpload.test.tsx',
  '**/EmptyState.test.tsx',
  '**/App.test.tsx',
  '**/SchemaModal.test.tsx',
];

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
      // In CI, run one browser at a time (specified via BROWSER env) for stability
      // Locally, run all browsers
      instances: (() => {
        const browser = parseBrowser(process.env.BROWSER);
        return browser
          ? [{ browser }]
          : [
            { browser: 'chromium' as const },
            { browser: 'firefox' as const },
            { browser: 'webkit' as const },
          ];
      })(),
    },
  },
}));
