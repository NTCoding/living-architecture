import { RunRoleEnforcement } from '@living-architecture/riviere-role-enforcement-use-cases'

/** @riviere-role cli-entrypoint */
export function main(
  application: RunRoleEnforcement,
  configModulePath: string,
  configDir: string,
  packageFilter?: string,
): number {
  const result = application.execute({
    configDir,
    configModulePath,
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
