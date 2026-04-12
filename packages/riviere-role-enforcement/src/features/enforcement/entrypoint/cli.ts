import path from 'node:path'
import { RunRoleEnforcement } from '../commands/run-role-enforcement'

/** @riviere-role cli-entrypoint */
export async function main(argv: readonly string[], cwd: string): Promise<number> {
  const configModulePath = argv[2]
  if (configModulePath === undefined) {
    process.stderr.write(
      'Usage: riviere-role-enforcement <config-module-path> [--package <package-path>]\n',
    )
    return 1
  }

  const flagIndex = argv.indexOf('--package')
  if (flagIndex >= 0 && argv[flagIndex + 1] === undefined) {
    process.stderr.write('Error: --package requires a value\n')
    return 1
  }
  const packageFilter = flagIndex >= 0 ? argv[flagIndex + 1] : undefined

  const absolutePath = path.resolve(configModulePath)
  const loaded: unknown = await import(absolutePath)

  const result = new RunRoleEnforcement().execute({
    configDir: cwd,
    configModule: loaded,
    ...(packageFilter === undefined ? {} : { packageFilter }),
  })
  if (result.stdout !== '') {
    process.stdout.write(result.stdout)
  }
  if (result.stderr !== '') {
    process.stderr.write(result.stderr)
  }
  process.stderr.write(`Role enforcement completed in ${Math.round(result.durationMs)}ms\n`)
  return result.exitCode
}
