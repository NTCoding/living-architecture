import { LocalFilesystem, LocalSandbox, Workspace, WORKSPACE_TOOLS } from '@mastra/core/workspace'

/**
 * @riviere-role external-client-service
 */
export function createWorkspace(
  worktreePath: string,
  options: { readonly readOnly: boolean },
): Workspace {
  return new Workspace({
    filesystem: new LocalFilesystem({ basePath: worktreePath, readOnly: options.readOnly }),
    sandbox: new LocalSandbox({ workingDirectory: worktreePath }),
    tools: {
      hooks: {
        beforeToolCall: guardWorkspaceCommand,
      },
    },
  })
}

function commandOf(input: unknown): string {
  if (typeof input === 'object' && input !== null && 'command' in input) {
    const command = input['command']
    if (typeof command === 'string') return command
  }
  return ''
}

/**
 * Stops the agent from running the commands that belong to the workflow itself. The workflow
 * pushes the branch and opens the pull request, so the agent must never do those steps itself.
 *
 * @riviere-role external-client-service
 */
export function guardWorkspaceCommand(context: {
  readonly toolName: string
  readonly input: unknown
}): { readonly proceed: false; readonly output: string } | undefined {
  if (context.toolName !== WORKSPACE_TOOLS.SANDBOX.EXECUTE_COMMAND) return undefined
  if (isAgentCommandAllowed(commandOf(context.input))) return undefined
  return {
    proceed: false,
    output: 'Refused: the workflow pushes the branch and opens the pull request, not you.',
  }
}

function isAgentCommandAllowed(command: string): boolean {
  return (
    !command.includes('git push') &&
    !command.includes('gh pr') &&
    !command.includes('gh api') &&
    !command.includes('--no-verify')
  )
}
