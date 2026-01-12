import * as esbuild from 'esbuild'
import { readFileSync } from 'fs'

// Auto-derive external dependencies from package.json
// This prevents drift between declared dependencies and bundler config
const pkg = JSON.parse(readFileSync('./package.json', 'utf-8'))
const externalDependencies = Object.keys(pkg.dependencies || {})
  .filter(dep => !dep.startsWith('@living-architecture/')) // Bundle workspace packages

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
