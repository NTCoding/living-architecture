import * as esbuild from 'esbuild'
import { readFileSync } from 'node:fs'
import {
  dirname,
  join,
} from 'node:path'
import { fileURLToPath } from 'node:url'

const __dirname = dirname(fileURLToPath(import.meta.url))
const pkg = JSON.parse(readFileSync(join(__dirname, 'package.json'), 'utf-8'))

const externalDependencies = Object.keys(pkg.dependencies || {})

await esbuild.build({
  entryPoints: [join(__dirname, 'src/shell/bin.ts')],
  bundle: true,
  platform: 'node',
  target: 'node18',
  format: 'esm',
  outfile: join(__dirname, 'dist/shell/bin.js'),
  banner: {js: '#!/usr/bin/env node',},
  external: externalDependencies,
})

await esbuild.build({
  entryPoints: [join(__dirname, 'src/index.ts')],
  bundle: true,
  platform: 'node',
  target: 'node18',
  format: 'esm',
  outfile: join(__dirname, 'dist/index.js'),
  external: externalDependencies,
})
