import {
  describe, it, expect, vi 
} from 'vitest'
import { createRemoveWorktreeStep } from './remove-worktree'
import { buildContext } from './merge-cleanup-context-fixture'

function buildDeps(overrides: Partial<Parameters<typeof createRemoveWorktreeStep>[0]> = {}) {
  return {
    uncommittedFiles: vi.fn<() => Promise<string[]>>().mockResolvedValue([]),
    removeWorktreePermission: vi
      .fn<(w: string, s: string) => Promise<void>>()
      .mockResolvedValue(undefined),
    removeWorktree: vi.fn<(w: string) => Promise<void>>().mockResolvedValue(undefined),
    ...overrides,
  }
}

describe('remove-worktree', () => {
  it('succeeds when no uncommitted changes', async () => {
    const deps = buildDeps()
    const step = createRemoveWorktreeStep(deps)

    const result = await step.execute(buildContext())

    expect(result.type).toBe('success')
  })

  it('removes permission before removing worktree', async () => {
    const callOrder: string[] = []
    const deps = buildDeps({
      removeWorktreePermission: vi
        .fn<(w: string, s: string) => Promise<void>>()
        .mockImplementation(async () => {
          callOrder.push('permission')
        }),
      removeWorktree: vi.fn<(w: string) => Promise<void>>().mockImplementation(async () => {
        callOrder.push('worktree')
      }),
    })
    const step = createRemoveWorktreeStep(deps)

    await step.execute(buildContext())

    expect(callOrder).toStrictEqual(['permission', 'worktree'])
  })

  it('passes correct paths to removeWorktreePermission', async () => {
    const deps = buildDeps()
    const step = createRemoveWorktreeStep(deps)

    await step.execute(
      buildContext({
        worktreePath: '/home/user/worktree-1',
        mainRepoPath: '/home/user/main',
      }),
    )

    expect(deps.removeWorktreePermission).toHaveBeenCalledWith(
      '/home/user/worktree-1',
      '/home/user/main/.claude/settings.local.json',
    )
  })

  it('passes worktree path to removeWorktree', async () => {
    const deps = buildDeps()
    const step = createRemoveWorktreeStep(deps)

    await step.execute(buildContext({ worktreePath: '/home/user/worktree-1' }))

    expect(deps.removeWorktree).toHaveBeenCalledWith('/home/user/worktree-1')
  })

  it('fails when uncommitted changes exist', async () => {
    const deps = buildDeps({
      uncommittedFiles: vi
        .fn<() => Promise<string[]>>()
        .mockResolvedValue(['file1.ts', 'file2.ts']),
    })
    const step = createRemoveWorktreeStep(deps)

    const result = await step.execute(buildContext())

    expect(result.type).toBe('failure')
    expect(result.type === 'failure' && result.details).toStrictEqual({
      nextAction: 'fix_uncommitted',
      nextInstructions: expect.stringContaining('file1.ts'),
    })
  })

  it('does not remove worktree when uncommitted changes exist', async () => {
    const deps = buildDeps({uncommittedFiles: vi.fn<() => Promise<string[]>>().mockResolvedValue(['file1.ts']),})
    const step = createRemoveWorktreeStep(deps)

    await step.execute(buildContext())

    expect(deps.removeWorktree).not.toHaveBeenCalled()
  })

  it('includes worktree path in success output', async () => {
    const deps = buildDeps()
    const step = createRemoveWorktreeStep(deps)

    const result = await step.execute(buildContext({ worktreePath: '/home/user/my-worktree' }))

    expect(result.type === 'success' && result.output).toStrictEqual({
      message: 'Worktree removed: /home/user/my-worktree',
      mainRepoPath: '/home/user/main',
    })
  })
})
