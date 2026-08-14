import { readdir, readFile, rm } from 'node:fs/promises'
import { join, relative, resolve } from 'node:path'
import { build } from 'esbuild'

const packageRoot = resolve(process.argv[2] ?? '.')

if (process.argv.includes('--clean')) {
  await rm(resolve(packageRoot, 'dist'), { recursive: true, force: true })
  process.exit(0)
}

const packageJson = JSON.parse(await readFile(resolve(packageRoot, 'package.json'), 'utf8'))

const sourceTargets = new Set()

for (const exported of Object.values(packageJson.exports ?? {})) {
  if (
    typeof exported === 'object' &&
    exported !== null &&
    '@living-architecture/source' in exported
  ) {
    sourceTargets.add(exported['@living-architecture/source'])
  }
}

async function filesBelow(directory) {
  const entries = await readdir(directory, { withFileTypes: true })
  return (
    await Promise.all(
      entries.map((entry) => {
        const path = join(directory, entry.name)
        return entry.isDirectory() ? filesBelow(path) : [path]
      }),
    )
  ).flat()
}

function sourceTargetPattern(sourceTarget) {
  const escaped = sourceTarget
    .slice(2)
    .replace(/[.+?^${}()|[\]\\]/g, '\\$&')
    .replaceAll('*', '.*')
  return new RegExp(`^${escaped}$`)
}

const sourcePatterns = [...sourceTargets]
  .filter((target) => target.endsWith('.ts'))
  .map(sourceTargetPattern)
const sourceFiles = (await filesBelow(resolve(packageRoot, 'src')))
  .map((sourceFile) => relative(packageRoot, sourceFile))
  .filter(
    (sourceFile) =>
      !sourceFile.includes('/__fixtures__/') &&
      !/\.(spec|test)\.tsx?$/.test(sourceFile) &&
      sourcePatterns.some((pattern) => pattern.test(sourceFile)),
  )

const entryPoints = Object.fromEntries(
  [...new Set(sourceFiles)].map((sourceFile) => [
    sourceFile.replace(/^src\//, '').replace(/\.ts$/, ''),
    resolve(packageRoot, sourceFile),
  ]),
)

if (Object.keys(entryPoints).length > 0) {
  await rm(resolve(packageRoot, 'dist/_chunks'), { recursive: true, force: true })
  await build({
    entryPoints,
    outdir: resolve(packageRoot, 'dist'),
    bundle: true,
    splitting: true,
    chunkNames: '_chunks/[name]-[hash]',
    packages: 'external',
    platform: 'node',
    target: 'node18',
    format: 'esm',
  })
}
