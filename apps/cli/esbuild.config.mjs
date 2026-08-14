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

const externalDependencies = Object.keys(pkg.dependencies || {})
  .filter(dep => !dep.startsWith('@living-architecture/'))
const executableBanner = [
  '#!/usr/bin/env node',
  "import { createRequire as __createRequire } from 'node:module';",
  "import { fileURLToPath as __fileURLToPath } from 'node:url';",
  "import { dirname as __pathDirname } from 'node:path';",
  'const require = __createRequire(import.meta.url);',
  'const __filename = __fileURLToPath(import.meta.url);',
  'const __dirname = __pathDirname(__filename);',
].join('\n')

// CLI binary entry point
await esbuild.build({
  entryPoints: ['src/shell/bin.ts'],
  bundle: true,
  platform: 'node',
  target: 'node18',
  format: 'esm',
  outfile: 'dist/bin.js',
  banner: {js: executableBanner,},
  external: externalDependencies,
  define: { INJECTED_VERSION: JSON.stringify(pkg.version) },
})

await esbuild.build({
  entryPoints: ['src/shell/role-enforcement-bin.ts'],
  bundle: true,
  platform: 'node',
  target: 'node18',
  format: 'esm',
  outfile: 'dist/role-enforcement-bin.js',
  banner: {js: executableBanner,},
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
  banner: {js: executableBanner,},
  external: externalDependencies,
  define: { INJECTED_VERSION: JSON.stringify(pkg.version) },
})
