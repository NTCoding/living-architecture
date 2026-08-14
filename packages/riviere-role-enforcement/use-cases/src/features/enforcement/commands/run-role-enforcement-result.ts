/** @riviere-role command-use-case-result */
export interface RunRoleEnforcementResult {
  durationMs: number
  exitCode: number
  stderr: string
  stdout: string
}
