import { mkdtempSync } from 'node:fs'
import { tmpdir } from 'node:os'
import { join } from 'node:path'
import { describe, expect, it } from 'vitest'
import { Workspace, WORKSPACE_TOOLS } from '@mastra/core/workspace'
import { createWorkspace, guardWorkspaceCommand } from './create-workspace'

describe('createWorkspace', () => {
  it('creates a writable workspace over the worktree', () => {
    const worktree = mkdtempSync(join(tmpdir(), 'factory-workspace-'))

    const workspace = createWorkspace(worktree, { readOnly: false })

    expect(workspace).toBeInstanceOf(Workspace)
    expect(workspace.hasFilesystemConfig()).toBe(true)
  })

  it('creates a read-only workspace over the worktree', () => {
    const worktree = mkdtempSync(join(tmpdir(), 'factory-workspace-'))

    const workspace = createWorkspace(worktree, { readOnly: true })

    expect(workspace).toBeInstanceOf(Workspace)
    expect(workspace.hasSandboxConfig()).toBe(true)
  })
})

describe('guardWorkspaceCommand', () => {
  it('allows sandbox commands that are not workflow steps', () => {
    const decision = guardWorkspaceCommand({
      toolName: WORKSPACE_TOOLS.SANDBOX.EXECUTE_COMMAND,
      input: { command: 'pnpm nx test dev-workflow-v3' },
    })

    expect(decision).toBeUndefined()
  })

  it('allows non-sandbox tools whatever they carry', () => {
    const decision = guardWorkspaceCommand({
      toolName: WORKSPACE_TOOLS.SANDBOX.GET_PROCESS_OUTPUT,
      input: { command: 'git push --force' },
    })

    expect(decision).toBeUndefined()
  })

  it('refuses a piped verification command because the pipe hides the failure reason', () => {
    const decision = guardWorkspaceCommand({
      toolName: WORKSPACE_TOOLS.SANDBOX.EXECUTE_COMMAND,
      input: { command: 'pnpm nx role-check riviere-extract-ts-domain-model 2>&1 | tail -25' },
    })

    expect(decision).toStrictEqual({
      proceed: false,
      output:
        'Refused: never run checks through `tail` or `grep`, you will not see the exact failure reason and will waste time reading files. Run the command bare.',
    })
  })

  it('allows a bare verification command', () => {
    const decision = guardWorkspaceCommand({
      toolName: WORKSPACE_TOOLS.SANDBOX.EXECUTE_COMMAND,
      input: { command: 'pnpm nx role-check riviere-extract-ts-domain-model' },
    })

    expect(decision).toBeUndefined()
  })

  it('refuses a git push because the workflow pushes the branch', () => {
    const decision = guardWorkspaceCommand({
      toolName: WORKSPACE_TOOLS.SANDBOX.EXECUTE_COMMAND,
      input: { command: 'git push origin issue-564' },
    })

    expect(decision).toStrictEqual({
      proceed: false,
      output: 'Refused: the workflow pushes the branch and opens the pull request, not you.',
    })
  })

  it('refuses opening a pull request because the workflow opens it', () => {
    const decision = guardWorkspaceCommand({
      toolName: WORKSPACE_TOOLS.SANDBOX.EXECUTE_COMMAND,
      input: { command: 'gh pr create --title "issue 564"' },
    })

    expect(decision?.['proceed']).toBe(false)
  })

  it('refuses a pull request comment because the workflow comments on the pull request', () => {
    const decision = guardWorkspaceCommand({
      toolName: WORKSPACE_TOOLS.SANDBOX.EXECUTE_COMMAND,
      input: {
        command: 'gh api repos/NTCoding/living-architecture/issues/1/comments -f body=nope',
      },
    })

    expect(decision?.['proceed']).toBe(false)
  })

  it('refuses committing with hooks skipped because the verify gate must always run', () => {
    const decision = guardWorkspaceCommand({
      toolName: WORKSPACE_TOOLS.SANDBOX.EXECUTE_COMMAND,
      input: { command: 'git commit --no-verify -m "skip the gate"' },
    })

    expect(decision?.['proceed']).toBe(false)
  })

  it('treats input without a command as an allowed empty command', () => {
    const decision = guardWorkspaceCommand({
      toolName: WORKSPACE_TOOLS.SANDBOX.EXECUTE_COMMAND,
      input: { other: 'x' },
    })

    expect(decision).toBeUndefined()
  })

  it('treats a non-string command as an allowed empty command', () => {
    const decision = guardWorkspaceCommand({
      toolName: WORKSPACE_TOOLS.SANDBOX.EXECUTE_COMMAND,
      input: { command: 42 },
    })

    expect(decision).toBeUndefined()
  })

  it('treats non-object input as an allowed empty command', () => {
    const text = guardWorkspaceCommand({
      toolName: WORKSPACE_TOOLS.SANDBOX.EXECUTE_COMMAND,
      input: 'just text',
    })
    const nothing = guardWorkspaceCommand({
      toolName: WORKSPACE_TOOLS.SANDBOX.EXECUTE_COMMAND,
      input: null,
    })

    expect(text).toBeUndefined()
    expect(nothing).toBeUndefined()
  })
})
