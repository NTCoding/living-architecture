import * as esbuild from 'esbuild'

// CLI binary entry point
await esbuild.build({
  entryPoints: ['src/bin.ts'],
  bundle: true,
  platform: 'node',
  target: 'node18',
  format: 'esm',
  outfile: 'dist/bin.js',
  banner: {js: '#!/usr/bin/env node',},
  // Bundle workspace packages into CLI to avoid ESM resolution issues
  external: [
    'commander',
    'tslib',
  ],
})

// Library entry point (no side effects)
await esbuild.build({
  entryPoints: ['src/index.ts'],
  bundle: true,
  platform: 'node',
  target: 'node18',
  format: 'esm',
  outfile: 'dist/index.js',
  external: [
    'commander',
    'tslib',
  ],
})
