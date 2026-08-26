import { execFileSync } from 'node:child_process'
import { mkdtempSync, rmSync, writeFileSync } from 'node:fs'
import { tmpdir } from 'node:os'
import { join } from 'node:path'
import { describe, expect, it } from 'vitest'
import { DraftComponentsLoadError } from './draft-components-load-error'
import { RiviereProjectRepository } from './riviere-project-repository'

const VALID_CONFIG = `modules:
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
`

const GIT_EXECUTABLE = process.env['GIT_EXECUTABLE'] ?? '/usr/bin/git'

function runGit(args: string[], cwd: string): void {
  execFileSync(GIT_EXECUTABLE, args, {
    cwd,
    env: Object.fromEntries(
      Object.entries(process.env).filter(([name]) => !name.startsWith('GIT_')),
    ),
    stdio: 'ignore',
  })
}

function withWorkspace(run: (directory: string) => void): void {
  const directory = mkdtempSync(join(tmpdir(), 'extract-drafts-test-'))
  writeFileSync(join(directory, 'package.json'), JSON.stringify({ name: 'workspace' }))
  writeFileSync(join(directory, 'component.ts'), 'export class Order {}')
  writeFileSync(join(directory, 'extract.config.yml'), VALID_CONFIG)
  runGit(['init', '--initial-branch=main'], directory)
  runGit(['remote', 'add', 'origin', 'https://github.com/test/repo.git'], directory)
  try {
    run(directory)
  } finally {
    rmSync(directory, { recursive: true })
  }
}

function loadForEnrichment(directory: string, draftComponentsPath: string) {
  return new RiviereProjectRepository().loadForEnrichment({
    configPath: 'extract.config.yml',
    draftComponentsPath,
    projectRoot: directory,
    useTsConfig: false,
  })
}

describe('RiviereProjectRepository draft component restoration', () => {
  it('restores draft components as project state', () => {
    withWorkspace((directory) => {
      const draftComponentsPath = join(directory, 'drafts.json')
      writeFileSync(
        draftComponentsPath,
        JSON.stringify([
          {
            domain: 'orders',
            location: { file: join(directory, 'component.ts'), line: 1 },
            module: 'orders',
            name: 'Order',
            type: 'api',
          },
        ]),
      )

      const project = loadForEnrichment(directory, draftComponentsPath)

      expect(
        project.enrichDraftComponents({
          allowIncomplete: false,
          includeConnections: false,
        }),
      ).toMatchObject({
        kind: 'draftOnly',
        components: [{ name: 'Order' }],
      })
    })
  })

  it('rejects a draft components file whose root is not an array', () => {
    withWorkspace((directory) => {
      const draftComponentsPath = join(directory, 'drafts.json')
      writeFileSync(draftComponentsPath, '{}')

      expect(() => loadForEnrichment(directory, draftComponentsPath)).toThrow(
        new DraftComponentsLoadError(
          `Draft components file must contain an array: ${draftComponentsPath}`,
        ),
      )
    })
  })

  it('rejects invalid draft component state', () => {
    withWorkspace((directory) => {
      const draftComponentsPath = join(directory, 'drafts.json')
      writeFileSync(draftComponentsPath, '[{}]')

      expect(() => loadForEnrichment(directory, draftComponentsPath)).toThrow(
        new DraftComponentsLoadError(`Invalid draft component: ${draftComponentsPath}`),
      )
    })
  })

  it('reports unreadable draft component state', () => {
    withWorkspace((directory) => {
      const draftComponentsPath = join(directory, 'missing.json')

      expect(() => loadForEnrichment(directory, draftComponentsPath)).toThrow(
        new DraftComponentsLoadError(`Draft components not found: ${draftComponentsPath}`),
      )
    })
  })
})
