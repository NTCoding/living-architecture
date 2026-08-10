import {
  mkdtempSync, rmSync, writeFileSync 
} from 'node:fs'
import { tmpdir } from 'node:os'
import { join } from 'node:path'
import {
  expect, it 
} from 'vitest'
import { ExtractionProjectRepository } from './extraction-project-repository'

it('rejects JSON that is not a draft-component array', () => {
  const directory = mkdtempSync(join(tmpdir(), 'extract-project-drafts-'))
  try {
    writeFileSync(join(directory, 'package.json'), '{"name":"workspace"}', 'utf-8')
    writeFileSync(join(directory, 'component.ts'), 'export class Order {}', 'utf-8')
    writeFileSync(
      join(directory, 'extract.yml'),
      `modules:
  - name: orders
    domain: orders
    path: .
    glob: "*.ts"
    api: { notUsed: true }
    useCase: { notUsed: true }
    domainOp: { notUsed: true }
    event: { notUsed: true }
    eventHandler: { notUsed: true }
    ui: { notUsed: true }
`,
      'utf-8',
    )
    writeFileSync(join(directory, 'draft-components.json'), '{"invalid":true}', 'utf-8')

    expect(() =>
      new ExtractionProjectRepository().loadFromDraftEnrichment({
        configPath: join(directory, 'extract.yml'),
        draftComponentsPath: join(directory, 'draft-components.json'),
        useTsConfig: false,
      }),
    ).toThrow(/does not contain valid draft components/)
  } finally {
    rmSync(directory, { recursive: true })
  }
})
