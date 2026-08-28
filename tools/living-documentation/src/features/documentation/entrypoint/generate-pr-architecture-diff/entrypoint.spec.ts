import { describe, expect, it, vi } from 'vitest'
import { createGeneratePullRequestArchitectureDiffCommand } from './entrypoint'

describe('generate pull request architecture diff command', () => {
  it('passes workspace paths and writes the generated diff', async () => {
    const diff = { markdown: '# Diff', outputPath: 'diff.md' }
    const execute = vi.fn(() => diff)
    const writePullRequestArchitectureDiff = vi.fn()
    const command = createGeneratePullRequestArchitectureDiffCommand({
      generatePullRequestArchitectureDiff: { execute },
      writePullRequestArchitectureDiff,
    })

    await command.parseAsync([
      'node',
      'command',
      '--base',
      '/base',
      '--head',
      '/head',
      '--output',
      'diff.md',
    ])

    expect(execute).toHaveBeenCalledWith({
      baseWorkspaceRoot: '/base',
      headWorkspaceRoot: '/head',
      outputPath: 'diff.md',
    })
    expect(writePullRequestArchitectureDiff).toHaveBeenCalledWith(diff)
  })
})
