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
        beforeToolCall: ({ toolName, input }) => {
          if (toolName !== WORKSPACE_TOOLS.SANDBOX.EXECUTE_COMMAND) return undefined
          if (isAgentCommandAllowed(commandOf(input))) return undefined
          return {
            proceed: false,
            output: 'Refused: the workflow pushes the branch and opens the pull request, not you.',
          }
        },
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

function isAgentCommandAllowed(command: string): boolean {
  return (
    !command.includes('git push') &&
    !command.includes('gh pr') &&
    !command.includes('gh api') &&
    !command.includes('--no-verify')
  )
}
