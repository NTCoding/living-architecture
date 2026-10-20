import { LocalFilesystem, LocalSandbox, Workspace, WORKSPACE_TOOLS } from '@mastra/core/workspace'

const WRITE_TOOLS: readonly string[] = [
  WORKSPACE_TOOLS.FILESYSTEM.WRITE_FILE,
  WORKSPACE_TOOLS.FILESYSTEM.EDIT_FILE,
  WORKSPACE_TOOLS.FILESYSTEM.DELETE,
  WORKSPACE_TOOLS.FILESYSTEM.MKDIR,
  WORKSPACE_TOOLS.FILESYSTEM.AST_EDIT,
]

/**
 * @riviere-role external-client-service
 */
export function createWorkspace(
  worktreePath: string,
  options: { readonly readOnly: boolean },
): Workspace {
  return new Workspace({
    filesystem: new LocalFilesystem({ basePath: worktreePath }),
    sandbox: new LocalSandbox({ workingDirectory: worktreePath }),
    tools: {
      hooks: {
        beforeToolCall: ({ toolName, input }) => {
          if (options.readOnly && WRITE_TOOLS.includes(toolName)) {
            return {
              proceed: false,
              output: 'Refused: this agent reviews the change, it does not write it.',
            }
          }
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
