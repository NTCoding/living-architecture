import {
  describe, expect, it 
} from 'vitest'
import {
  mkdtempSync, rmSync, writeFileSync 
} from 'node:fs'
import { join } from 'node:path'
import { tmpdir } from 'node:os'
import { ExtractionProjectRepository } from './extraction-project-repository'

const VALID_CONFIG = `modules:
  - name: orders
    path: .
    glob: "*.ts"
    api: { notUsed: true }
    useCase: { notUsed: true }
    domainOp: { notUsed: true }
    event: { notUsed: true }
    eventHandler: { notUsed: true }
    eventPublisher: { notUsed: true }
    ui: { notUsed: true }
`

function withTempDir(fn: (dir: string) => void): void {
  const dir = mkdtempSync(join(tmpdir(), 'extract-project-test-'))
  try {
    fn(dir)
  } finally {
    rmSync(dir, { recursive: true })
  }
}

describe('ExtractionProjectRepository', () => {
  it('loadFromFullProject returns project with source files loaded', () => {
    withTempDir((dir) => {
      const filePath = join(dir, 'component.ts')
      const configPath = join(dir, 'extract.config.yml')
      writeFileSync(filePath, 'export class Order {}')
      writeFileSync(configPath, VALID_CONFIG)

      const extractionProject = new ExtractionProjectRepository().loadFromFullProject({
        configPath,
        useTsConfig: true,
      })

      expect(extractionProject).toBeDefined()
    })
  })

  it('loadFromFullProject passes skipTsConfig through to project creation', () => {
    withTempDir((dir) => {
      const filePath = join(dir, 'component.ts')
      const configPath = join(dir, 'extract.config.yml')
      writeFileSync(filePath, 'export class Order {}')
      writeFileSync(configPath, VALID_CONFIG)
      writeFileSync(
        join(dir, 'tsconfig.json'),
        JSON.stringify({ compilerOptions: { strict: true } }),
      )

      expect(() =>
        new ExtractionProjectRepository().loadFromFullProject({
          configPath,
          useTsConfig: true,
        }),
      ).not.toThrow()
      expect(() =>
        new ExtractionProjectRepository().loadFromFullProject({
          configPath,
          useTsConfig: false,
        }),
      ).not.toThrow()
    })
  })
})
