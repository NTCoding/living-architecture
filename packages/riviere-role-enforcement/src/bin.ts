#!/usr/bin/env node
import path from 'node:path'
import { main } from './cli'

const configModulePath = process.argv[2]
if (configModulePath === undefined) {
  process.stderr.write('Usage: riviere-role-enforcement <config-module-path>\n')
  process.exitCode = 1
} else {
  const absolutePath = path.resolve(configModulePath)
  import(absolutePath).then((loaded: unknown) => {
    process.exitCode = main(loaded, process.cwd())
  })
}
