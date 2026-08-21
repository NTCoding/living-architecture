import { describe, expect, it } from 'vitest'
import { execFileSync } from 'node:child_process'
import { mkdirSync, mkdtempSync, rmSync, writeFileSync } from 'node:fs'
import { join } from 'node:path'
import { tmpdir } from 'node:os'
import { RiviereProjectRepository } from './riviere-project-repository'
import { ExtractionDataAccessError } from './riviere-project-error'

const VALID_MODULE = `name: orders
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

function withWorkspace(fn: (dir: string) => void): void {
  const dir = mkdtempSync(join(tmpdir(), 'extract-project-coverage-test-'))
  writeFileSync(join(dir, 'package.json'), JSON.stringify({ name: 'workspace' }), 'utf-8')
  execFileSync('/usr/bin/git', ['init', '--initial-branch=main'], { cwd: dir, stdio: 'ignore' })
  try {
    fn(dir)
  } finally {
    rmSync(dir, { recursive: true })
  }
}

function loadProject(configPath: string): ReturnType<RiviereProjectRepository['load']> {
  return new RiviereProjectRepository().load({
    projectRoot: process.cwd(),
    configPath,
    useTsConfig: false,
  })
}

describe('RiviereProjectRepository coverage', () => {
  it('loads a module from a $ref file', () => {
    withWorkspace((dir) => {
      writeFileSync(join(dir, 'component.ts'), 'export const x = 1', 'utf-8')
      writeFileSync(join(dir, 'module.yml'), VALID_MODULE, 'utf-8')
      writeFileSync(join(dir, 'extract.yml'), 'modules:\n  - $ref: ./module.yml\n', 'utf-8')

      expect(loadProject(join(dir, 'extract.yml'))).toBeDefined()
    })
  })

  it('throws when no files match the extraction patterns', () => {
    withWorkspace((dir) => {
      writeFileSync(join(dir, 'extract.yml'), `modules:\n  - ${VALID_MODULE.replaceAll('\n', '\n    ')}`, 'utf-8')

      expect(() => loadProject(join(dir, 'extract.yml'))).toThrow(
        /No files matched extraction patterns/,
      )
    })
  })

  it('preserves a data access error from a referenced module', () => {
    withWorkspace((dir) => {
      mkdirSync(join(dir, 'module.yml'))
      writeFileSync(join(dir, 'extract.yml'), 'modules:\n  - $ref: ./module.yml\n', 'utf-8')

      expect(() => loadProject(join(dir, 'extract.yml'))).toThrow(ExtractionDataAccessError)
    })
  })
})
