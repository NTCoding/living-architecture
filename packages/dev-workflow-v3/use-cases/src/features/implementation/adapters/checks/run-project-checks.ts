import type { RunProjectChecks } from '@living-architecture/dev-workflow-v3-domain-model/domain/ports/run-project-checks'
import type {
  CommandOutput,
  CommandRequest,
} from '../../../../infra/external-clients/process/run-command'

/**
 * Runs the affected lint, typecheck and test targets, then the role check.
 * @riviere-role domain-port-adapter
 */
export function runProjectChecksWithCommands(dependencies: {
  readonly runCommand: (request: CommandRequest) => Promise<CommandOutput>
}): RunProjectChecks {
  return async (request) => {
    const affected = await dependencies.runCommand({
      command: 'pnpm',
      arguments: ['nx', 'affected', '-t', 'lint', 'typecheck', 'test'],
      workingDirectory: request.worktreePath,
    })
    const roleCheck = await dependencies.runCommand({
      command: 'pnpm',
      arguments: ['role-check'],
      workingDirectory: request.worktreePath,
    })
    return {
      checks: [
        { name: 'affected lint, typecheck and test', passed: affected.exitCode === 0 },
        { name: 'role check', passed: roleCheck.exitCode === 0 },
      ],
    }
  }
}
