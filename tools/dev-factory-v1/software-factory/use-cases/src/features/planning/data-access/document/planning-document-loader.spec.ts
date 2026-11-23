import { mkdtempSync, mkdirSync, writeFileSync } from 'node:fs'
import { tmpdir } from 'node:os'
import { join } from 'node:path'
import { describe, expect, it } from 'vitest'
import { PlanningDocumentError, PlanningDocumentLoader } from './planning-document-loader'

function factoryWith(markdown: string): string {
  const folder = mkdtempSync(join(tmpdir(), 'factory-document-'))
  const path = join(folder, 'docs', 'project', 'PRD', 'cross-repo-linking')
  mkdirSync(path, { recursive: true })
  writeFileSync(join(path, 'PRD.md'), markdown)
  return folder
}

describe('PlanningDocumentLoader', () => {
  it('reads the Markdown of the document', () => {
    const folder = factoryWith('# The PRD\n\nA sentence.\n')

    expect(new PlanningDocumentLoader(folder).load('cross-repo-linking', 'PRD.md')).toStrictEqual({
      name: 'PRD.md',
      markdown: '# The PRD\n\nA sentence.\n',
    })
  })

  it('reads an empty document that has not been written yet', () => {
    const folder = factoryWith('')

    expect(new PlanningDocumentLoader(folder).load('cross-repo-linking', 'ARCH.md')).toStrictEqual({
      name: 'ARCH.md',
      markdown: '',
    })
  })

  it('refuses a name that is not a Markdown file', () => {
    const folder = factoryWith('# The PRD\n')

    expect(() =>
      new PlanningDocumentLoader(folder).load('cross-repo-linking', '../secrets'),
    ).toThrow(
      new PlanningDocumentError('A planning document is a file that ends in .md: ../secrets'),
    )
  })
})
