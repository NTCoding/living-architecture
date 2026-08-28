import { describe, expect, it, vi } from 'vitest'
import { ArchitectureSummary } from '@living-architecture/living-documentation-use-cases/features/documentation/queries/architecture-summary'
import { createGenerateArchitectureSummaryCommand } from './entrypoint'

describe('generate architecture summary command', () => {
  it('uses defaults and writes the generated summary', async () => {
    const summary = ArchitectureSummary.fromMarkdown('# Summary', 'domain-guide.md')
    const execute = vi.fn(() => summary)
    const writeArchitectureSummary = vi.fn()
    const command = createGenerateArchitectureSummaryCommand({
      generateArchitectureSummary: { execute },
      writeArchitectureSummary,
    })

    await command.parseAsync(['node', 'command'])

    expect(execute).toHaveBeenCalledWith({
      outputPath: 'docs/architecture/ddd/domain-guide.md',
      workspaceRoot: '.',
    })
    expect(writeArchitectureSummary).toHaveBeenCalledWith(summary)
  })

  it('passes explicit paths to the use case', async () => {
    const summary = ArchitectureSummary.fromMarkdown('# Summary', 'custom.md')
    const execute = vi.fn(() => summary)
    const command = createGenerateArchitectureSummaryCommand({
      generateArchitectureSummary: { execute },
      writeArchitectureSummary: vi.fn(),
    })

    await command.parseAsync([
      'node',
      'command',
      '--workspace-root',
      '/workspace',
      '--output',
      'custom.md',
    ])

    expect(execute).toHaveBeenCalledWith({
      outputPath: 'custom.md',
      workspaceRoot: '/workspace',
    })
  })
})
