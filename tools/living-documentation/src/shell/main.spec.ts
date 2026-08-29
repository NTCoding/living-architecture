import { existsSync, mkdirSync, mkdtempSync, readFileSync, rmSync } from 'node:fs'
import { tmpdir } from 'node:os'
import path from 'node:path'
import { afterEach, describe, expect, it } from 'vitest'

const temporaryDirectories: string[] = []

afterEach(() => {
  for (const directory of temporaryDirectories.splice(0)) rmSync(directory, { recursive: true })
})

describe('living documentation shell', () => {
  it('wires and runs the architecture summary command', async () => {
    const workspace = mkdtempSync(path.join(tmpdir(), 'living-documentation-shell-'))
    temporaryDirectories.push(workspace)
    mkdirSync(path.join(workspace, 'packages'))
    const outputPath = path.join(workspace, 'domain-guide.md')
    const originalArguments = process.argv
    process.argv = [
      'node',
      'living-documentation',
      'generate-architecture-summary',
      '--workspace-root',
      workspace,
      '--output',
      outputPath,
    ]

    try {
      await import('./main')
    } finally {
      process.argv = originalArguments
    }

    expect(existsSync(outputPath)).toBe(true)
    expect(readFileSync(outputPath, 'utf8')).toContain('# Domain guide')
  })
})
