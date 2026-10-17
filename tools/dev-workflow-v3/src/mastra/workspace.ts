import { LocalFilesystem, LocalSandbox, Workspace, WORKSPACE_TOOLS } from '@mastra/core/workspace'

/**
 * The workspace the implementer works in. The deny list is written here, inside
 * the step that owns it, because the step already is the state. The stronger
 * guarantee is that the workspace is given no GitHub token at all.
 * @riviere-role workspace-configuration
 */
export function createImplementationWorkspace(worktreePath: string): Workspace {
  return new Workspace({
    filesystem: new LocalFilesystem({ basePath: worktreePath }),
    sandbox: new LocalSandbox({ workingDirectory: worktreePath }),
    tools: {
      hooks: {
        beforeToolCall: ({ toolName, input }) => {
          if (toolName !== WORKSPACE_TOOLS.SANDBOX.EXECUTE_COMMAND) return undefined
          const command = commandOf(input)
          if (!isReservedForTheWorkflow(command)) return undefined
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
    const command = input.command
    if (typeof command === 'string') return command
  }
  return ''
}

function isReservedForTheWorkflow(command: string): boolean {
  return command.includes('git push') || command.includes('gh pr') || command.includes('gh api')
}
