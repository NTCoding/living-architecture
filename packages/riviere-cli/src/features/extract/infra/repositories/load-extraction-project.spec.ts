import {
  describe, it, expect 
} from 'vitest'
import {
  mkdtempSync, writeFileSync, rmSync 
} from 'node:fs'
import { join } from 'node:path'
import { tmpdir } from 'node:os'
import type {
  ComponentRule,
  ResolvedExtractionConfig,
} from '@living-architecture/riviere-extract-config'
import { loadExtractionProject } from './load-extraction-project'

const notUsedRule: ComponentRule = { notUsed: true }

function createResolvedConfig(): ResolvedExtractionConfig {
  return {
    modules: [
      {
        api: notUsedRule,
        domainOp: notUsedRule,
        event: notUsedRule,
        eventHandler: notUsedRule,
        eventPublisher: notUsedRule,
        glob: '*.ts',
        name: 'orders',
        path: '.',
        ui: notUsedRule,
        useCase: notUsedRule,
      },
    ],
  }
}

function withTempDir(fn: (dir: string) => void): void {
  const dir = mkdtempSync(join(tmpdir(), 'extract-project-test-'))
  try {
    fn(dir)
  } finally {
    rmSync(dir, { recursive: true })
  }
}

describe('loadExtractionProject', () => {
  it('returns project with source files loaded', () => {
    withTempDir((dir) => {
      const filePath = join(dir, 'component.ts')
      writeFileSync(filePath, 'export class Order {}')

      const extractionProject = loadExtractionProject({
        configDir: dir,
        resolvedConfig: createResolvedConfig(),
        skipTsConfig: true,
        sourceFilePaths: [filePath],
      })

      expect(extractionProject.moduleContexts[0]?.project.getSourceFile(filePath)).toBeDefined()
    })
  })

  it('passes skipTsConfig through to project creation', () => {
    withTempDir((dir) => {
      const filePath = join(dir, 'component.ts')
      writeFileSync(filePath, 'export class Order {}')
      writeFileSync(
        join(dir, 'tsconfig.json'),
        JSON.stringify({ compilerOptions: { strict: true } }),
      )

      const resolvedConfig = createResolvedConfig()

      const withTsConfig = loadExtractionProject({
        configDir: dir,
        resolvedConfig,
        skipTsConfig: false,
        sourceFilePaths: [filePath],
      })
      const withoutTsConfig = loadExtractionProject({
        configDir: dir,
        resolvedConfig,
        skipTsConfig: true,
        sourceFilePaths: [filePath],
      })

      expect(withTsConfig.moduleContexts[0]?.project.getCompilerOptions().strict).toBe(true)
      expect(withoutTsConfig.moduleContexts[0]?.project.getCompilerOptions().strict).toBeUndefined()
    })
  })
})
