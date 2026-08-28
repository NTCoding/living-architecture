import { describe, expect, it, vi } from 'vitest'
import { ArchitectureSourceLoader } from '@living-architecture/living-documentation-use-cases/features/documentation/data-access/architecture-source/architecture-source-loader'
import { GeneratePullRequestArchitectureDiff } from '@living-architecture/living-documentation-use-cases/features/documentation/queries/generate-pr-architecture-diff'
import { TypescriptWorkspaceReader } from '@living-architecture/living-documentation-use-cases/infra/external-clients/typescript/typescript-workspace-reader'
import { createGeneratePullRequestArchitectureDiffCommand } from './entrypoint'

describe('generate pull request architecture diff command', () => {
  it('passes workspace paths and writes the generated diff', async () => {
    const diff = new GeneratePullRequestArchitectureDiff(
      new ArchitectureSourceLoader(new TypescriptWorkspaceReader()),
    ).execute({
      baseWorkspaceRoot: '/missing-base',
      headWorkspaceRoot: '/missing-head',
      outputPath: 'diff.md',
    })
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
