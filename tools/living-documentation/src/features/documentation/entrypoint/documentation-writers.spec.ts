import { mkdtempSync, readFileSync, rmSync } from 'node:fs'
import { tmpdir } from 'node:os'
import path from 'node:path'
import { afterEach, describe, expect, it } from 'vitest'
import { ArchitectureSummary } from '@living-architecture/living-documentation-use-cases/features/documentation/queries/architecture-summary'
import { ArchitectureSourceLoader } from '@living-architecture/living-documentation-use-cases/features/documentation/data-access/architecture-source/architecture-source-loader'
import { GeneratePullRequestArchitectureDiff } from '@living-architecture/living-documentation-use-cases/features/documentation/queries/generate-pr-architecture-diff'
import { TypescriptWorkspaceReader } from '@living-architecture/living-documentation-use-cases/infra/external-clients/typescript/typescript-workspace-reader'
import { writeArchitectureSummary } from './generate-architecture-summary/architecture-summary-writer'
import { writePullRequestArchitectureDiff } from './generate-pr-architecture-diff/pull-request-architecture-diff-writer'

const temporaryDirectories: string[] = []

afterEach(() => {
  for (const directory of temporaryDirectories.splice(0)) rmSync(directory, { recursive: true })
})

describe('documentation writers', () => {
  it('writes an architecture summary', () => {
    const outputPath = temporaryOutput('summary.md')

    writeArchitectureSummary(ArchitectureSummary.fromMarkdown('# Summary', outputPath))

    expect(readFileSync(outputPath, 'utf8')).toBe('# Summary')
  })

  it('writes a pull request architecture diff', () => {
    const outputPath = temporaryOutput('diff.md')
    const diff = new GeneratePullRequestArchitectureDiff(
      new ArchitectureSourceLoader(new TypescriptWorkspaceReader()),
    ).execute({
      baseWorkspaceRoot: '/missing-base',
      headWorkspaceRoot: '/missing-head',
      outputPath,
    })

    writePullRequestArchitectureDiff(diff)

    expect(readFileSync(outputPath, 'utf8')).toContain('No architecture changes detected.')
  })
})

function temporaryOutput(fileName: string): string {
  const directory = mkdtempSync(path.join(tmpdir(), 'living-documentation-writer-'))
  temporaryDirectories.push(directory)
  return path.join(directory, fileName)
}
