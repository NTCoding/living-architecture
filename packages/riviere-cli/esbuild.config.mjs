import * as esbuild from 'esbuild'

// npm dependencies that must be external (not bundled)
// These use CommonJS patterns that fail when bundled into ESM
const externalDependencies = [
  'commander',
  'glob',
  'ts-morph',
  'tslib',
  'yaml',
]

// CLI binary entry point
await esbuild.build({
  entryPoints: ['src/bin.ts'],
  bundle: true,
  platform: 'node',
  target: 'node18',
  format: 'esm',
  outfile: 'dist/bin.js',
  banner: {js: '#!/usr/bin/env node',},
  // Bundle workspace packages (@living-architecture/*) into CLI
  // Externalize npm dependencies because many use CommonJS patterns
  // that fail when bundled into ESM (e.g., yaml, ts-morph)
  external: externalDependencies,
})

// Library entry point (no side effects)
await esbuild.build({
  entryPoints: ['src/index.ts'],
  bundle: true,
  platform: 'node',
  target: 'node18',
  format: 'esm',
  outfile: 'dist/index.js',
  external: externalDependencies,
})
