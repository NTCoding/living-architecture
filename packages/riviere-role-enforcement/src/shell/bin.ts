#!/usr/bin/env node
import path from 'node:path'
import { main } from '../features/enforcement/entrypoint/cli'

const configModulePath = process.argv[2]
if (configModulePath === undefined) {
  process.stderr.write(
    'Usage: riviere-role-enforcement <config-module-path> [--package <package-path>]\n',
  )
  process.exitCode = 1
} else {
  const packageFilter = readPackageFilter(process.argv)
  const absolutePath = path.resolve(configModulePath)
  void import(absolutePath).then((loaded: unknown) => {
    process.exitCode = main(loaded, process.cwd(), packageFilter)
  })
}

function readPackageFilter(argv: readonly string[]): string | undefined {
  const flagIndex = argv.indexOf('--package')
  if (flagIndex < 0) {
    return undefined
  }
  const value = argv[flagIndex + 1]
  if (value === undefined) {
    process.stderr.write('Error: --package requires a value\n')
    process.exitCode = 1
    return undefined
  }
  return value
}
