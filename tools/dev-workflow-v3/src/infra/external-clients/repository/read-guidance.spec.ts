import { mkdirSync, mkdtempSync, writeFileSync } from 'node:fs'
import { tmpdir } from 'node:os'
import { join } from 'node:path'
import { describe, expect, it } from 'vitest'
import { readRepositoryGuidance } from './read-guidance'

describe('readRepositoryGuidance', () => {
  it('joins the guidance files that exist under the repository root', async () => {
    const root = mkdtempSync(join(tmpdir(), 'factory-guidance-'))
    mkdirSync(`${root}/docs/conventions`, { recursive: true })
    writeFileSync(`${root}/AGENTS.md`, 'Be honest in the domain model.')
    writeFileSync(`${root}/docs/conventions/testing.md`, 'Cover real behaviour.')

    const guidance = await readRepositoryGuidance(root)

    expect(guidance).toContain('## AGENTS.md\n\nBe honest in the domain model.')
    expect(guidance).toContain('## docs/conventions/testing.md\n\nCover real behaviour.')
    expect(guidance).not.toContain('software-design')
  })

  it('returns an empty string when no guidance file exists', async () => {
    const root = mkdtempSync(join(tmpdir(), 'factory-guidance-'))

    const guidance = await readRepositoryGuidance(root)

    expect(guidance).toBe('')
  })
})
