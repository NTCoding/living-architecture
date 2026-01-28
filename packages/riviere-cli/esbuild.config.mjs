import * as esbuild from 'esbuild'
import { readFileSync } from 'node:fs'
import {
  dirname,
  join,
} from 'node:path'
import { fileURLToPath } from 'node:url'

// Resolve package.json relative to this config file, not CWD
const __dirname = dirname(fileURLToPath(import.meta.url))
const pkg = JSON.parse(readFileSync(join(__dirname, 'package.json'), 'utf-8'))

// Auto-derive external dependencies from package.json
// This prevents drift between declared dependencies and bundler config
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
  external: externalDependencies,
  define: { INJECTED_VERSION: JSON.stringify(pkg.version) },
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
