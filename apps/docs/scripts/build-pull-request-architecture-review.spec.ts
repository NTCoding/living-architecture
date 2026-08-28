import { mkdtempSync, readFileSync, rmSync } from 'node:fs'
import { tmpdir } from 'node:os'
import path from 'node:path'
import { afterEach, describe, expect, it } from 'vitest'

const temporaryWorkspaces: string[] = []

afterEach(() => {
  for (const workspace of temporaryWorkspaces.splice(0)) {
    rmSync(workspace, { force: true, recursive: true })
  }
})

describe('build pull request architecture review entrypoint', () => {
  it('executes the command with the process arguments', async () => {
    const base = createWorkspace()
    const head = createWorkspace()
    const output = path.join(createWorkspace(), 'architecture-review.md')
    const originalArguments = process.argv
    process.argv = [
      'node',
      'build-pull-request-architecture-review.ts',
      '--base',
      base,
      '--head',
      head,
      '--output',
      output,
    ]

    try {
      await import('./build-pull-request-architecture-review')
    } finally {
      process.argv = originalArguments
    }

    expect(readFileSync(output, 'utf8')).toBe(`<!-- pull-request-architecture-review -->
# Pull request architecture changes

No architecture changes detected.
`)
  })
})

function createWorkspace(): string {
  const workspace = mkdtempSync(path.join(tmpdir(), 'architecture-review-command-'))
  temporaryWorkspaces.push(workspace)
  return workspace
}
