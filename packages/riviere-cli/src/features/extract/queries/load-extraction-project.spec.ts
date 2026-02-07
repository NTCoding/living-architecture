import {
  describe, it, expect 
} from 'vitest'
import {
  mkdtempSync, writeFileSync, rmSync 
} from 'node:fs'
import { join } from 'node:path'
import { tmpdir } from 'node:os'
import { loadExtractionProject } from './load-extraction-project'

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

      const project = loadExtractionProject(dir, [filePath], true)

      expect(project.getSourceFile(filePath)).toBeDefined()
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

      const withTsConfig = loadExtractionProject(dir, [filePath], false)
      const withoutTsConfig = loadExtractionProject(dir, [filePath], true)

      expect(withTsConfig.getCompilerOptions().strict).toBe(true)
      expect(withoutTsConfig.getCompilerOptions().strict).toBeUndefined()
    })
  })
})
