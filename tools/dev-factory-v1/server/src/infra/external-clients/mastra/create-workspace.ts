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
  const command = commandOf(context.input)
  if (isVerificationCommand(command) && command.includes('|')) {
    return {
      proceed: false,
      output:
        'Refused: never run checks through `tail` or `grep`, you will not see the exact failure reason and will waste time reading files. Run the command bare.',
    }
  }
  if (isAgentCommandAllowed(command)) return undefined
  return {
    proceed: false,
    output: 'Refused: the workflow pushes the branch and opens the pull request, not you.',
  }
}

/**
 * Verification commands whose output must reach the agent complete. A pipe through `tail` or
 * `grep` hides the exact failure reason and the true exit code, so the agent wastes turns
 * reconstructing what the command already knew.
 */
const VERIFICATION_TARGETS = ['lint', 'role-check', 'verify', 'test', 'role-enforcement-bin']

function isVerificationCommand(command: string): boolean {
  const invocation = /(?:nx|pnpm|npm|yarn)\s+([^|]*)/.exec(command)
  if (invocation?.[1] === undefined) return false
  const invoked = invocation[1].toLowerCase()
  return VERIFICATION_TARGETS.some((target) => invoked.includes(target))
}

function isAgentCommandAllowed(command: string): boolean {
  return (
    !command.includes('git push') &&
    !command.includes('gh pr') &&
    !command.includes('gh api') &&
    !command.includes('--no-verify')
  )
}
