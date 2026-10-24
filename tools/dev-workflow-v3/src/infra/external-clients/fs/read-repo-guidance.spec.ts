import { mkdtempSync, writeFileSync } from 'node:fs'
import { tmpdir } from 'node:os'
import { join } from 'node:path'
import { describe, expect, it } from 'vitest'
import { MissingRepoGuidance, readRepoGuidance } from './read-repo-guidance'

describe('readRepoGuidance', () => {
  it('returns the trimmed AGENTS.md of the workspace', () => {
    const workspace = mkdtempSync(join(tmpdir(), 'repo-guidance-'))
    writeFileSync(join(workspace, 'AGENTS.md'), '# Rules\n\nUse nx commands.\n')

    expect(readRepoGuidance(workspace)).toBe('# Rules\n\nUse nx commands.')
  })

  it('throws MissingRepoGuidance when the workspace carries no AGENTS.md', () => {
    const workspace = mkdtempSync(join(tmpdir(), 'repo-guidance-'))

    expect(() => readRepoGuidance(workspace)).toThrow(
      `The workspace at ${workspace} carries no AGENTS.md to guide the agent.`,
    )
    expect(() => readRepoGuidance(workspace)).toThrow(MissingRepoGuidance)
  })
})
