import { RunRoleEnforcement } from '../commands/run-role-enforcement'

/** @riviere-role cli-entrypoint */
export function main(configModule: unknown, configDir: string, packageFilter?: string): number {
  const result = new RunRoleEnforcement().execute({
    configDir,
    configModule,
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
