import { RunRoleEnforcement } from '@living-architecture/riviere-role-enforcement-use-cases'

/** @riviere-role cli-entrypoint-dependencies */
export interface MainEntrypointDependencies {
  readonly application: RunRoleEnforcement
  readonly configModulePath: string
  readonly configDir: string
  readonly packageFilter?: string
}

/** @riviere-role cli-entrypoint */
export function main(dependencies: MainEntrypointDependencies): number {
  const { application, configModulePath, configDir, packageFilter } = dependencies
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
