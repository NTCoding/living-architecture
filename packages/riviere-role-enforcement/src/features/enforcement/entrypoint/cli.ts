import { runRoleEnforcement } from '../commands/run-role-enforcement'
import {
  readConfig, readConfigForPackage 
} from '../infra/external-clients/oxlint/config-reader'

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
    const message = error instanceof Error ? error.message : 'Unknown role enforcement failure.'
    process.stderr.write(`${message}\n`)
    return 1
  }
}
