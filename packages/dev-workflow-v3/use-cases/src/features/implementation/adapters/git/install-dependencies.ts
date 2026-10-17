import type { InstallDependencies } from '@living-architecture/dev-workflow-v3-domain-model/domain/ports/install-dependencies'
import type {
  CommandOutput,
  CommandRequest,
} from '../../../../infra/external-clients/process/run-command'
import { requireSuccess } from '../../../../infra/external-clients/process/run-command'

/**
 * @riviere-role domain-port-adapter
 */
export function installDependenciesWithPnpm(dependencies: {
  readonly runCommand: (request: CommandRequest) => Promise<CommandOutput>
}): InstallDependencies {
  return async (request) => {
    const command: CommandRequest = {
      command: 'pnpm',
      arguments: ['install', '--frozen-lockfile'],
      workingDirectory: request.worktreePath,
    }
    requireSuccess(await dependencies.runCommand(command), command)
  }
}
