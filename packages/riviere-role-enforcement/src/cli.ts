import {
  formatRoleEnforcementFailure, runRoleEnforcement 
} from './cli/run-role-enforcement'

export function main(args: string[]): number {
  const [configPath] = args
  if (configPath === undefined) {
    process.stderr.write('Usage: riviere-role-enforcement <config-path>\n')
    return 1
  }

  try {
    const result = runRoleEnforcement(configPath)
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
