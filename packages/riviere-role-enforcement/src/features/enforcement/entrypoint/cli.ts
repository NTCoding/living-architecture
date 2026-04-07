import {
  readConfig, readConfigForPackage 
} from '../infra/external-clients/oxlint/config-reader'
import {
  formatRoleEnforcementFailure,
  runRoleEnforcement,
} from '../infra/external-clients/oxlint/run-role-enforcement'

/** @riviere-role cli-entrypoint */
export function main(configModule: unknown, configDir: string, packageFilter?: string): number {
  try {
    const config =
      packageFilter === undefined
        ? readConfig(configModule)
        : readConfigForPackage(configModule, packageFilter)
    const result = runRoleEnforcement(config, configDir)
    if (result.stdout !== '') {
      process.stdout.write(result.stdout)
    }
    if (result.stderr !== '') {
      process.stderr.write(result.stderr)
    }
    process.stderr.write(`Role enforcement completed in ${Math.round(result.durationMs)}ms\n`)
    return result.exitCode
  } catch (error) {
    process.stderr.write(`${formatRoleEnforcementFailure(error)}\n`)
    return 1
  }
}
