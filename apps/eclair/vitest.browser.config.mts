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
    coverage: {
      enabled: true,
      reportsDirectory: '../../coverage/apps/eclair-browser',
      provider: 'v8' as const,
      reporter: ['text', 'lcov'],
      exclude: [
        '**/riviereTestFixtures.ts',
        '**/ForceGraph/ForceGraph.tsx',
        '**/ForceGraph/GraphRenderingSetup.ts',
      ],
    },
    browser: {
      enabled: true,
      provider: playwright(),
      instances: [
        { browser: 'chromium' },
        { browser: 'firefox' },
        { browser: 'webkit' },
      ],
    },
  },
}));
