import { runRoleEnforcementCommand } from '../infra/run-role-enforcement-command'

try {
  process.exitCode = runRoleEnforcementCommand(process.argv.slice(2))
} catch (error) {
  const message =
    error instanceof Error ? error.message : 'Unknown role enforcement execution error'
  console.error(`Role enforcement execution error: ${message}`)
  process.exitCode = 1
}
