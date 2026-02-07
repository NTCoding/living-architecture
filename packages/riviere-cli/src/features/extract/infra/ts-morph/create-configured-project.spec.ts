import {
  describe, it, expect 
} from 'vitest'
import {
  mkdtempSync, writeFileSync, rmSync 
} from 'node:fs'
import { join } from 'node:path'
import { tmpdir } from 'node:os'
import { createConfiguredProject } from './create-configured-project'

function withTempDir(fn: (dir: string) => void): void {
  const dir = mkdtempSync(join(tmpdir(), 'tsconfig-test-'))
  try {
    fn(dir)
  } finally {
    rmSync(dir, { recursive: true })
  }
}

describe('createConfiguredProject', () => {
  it('skips tsconfig discovery when skipTsConfig is true', () => {
    withTempDir((dir) => {
      writeFileSync(join(dir, 'tsconfig.json'), '{ "compilerOptions": {} }')
      const project = createConfiguredProject(dir, true)
      expect(project.getCompilerOptions().configFilePath).toBeUndefined()
    })
  })

  it('returns bare project when tsconfig.json does not exist in configDir', () => {
    withTempDir((dir) => {
      const project = createConfiguredProject(dir, false)
      expect(project.getCompilerOptions().configFilePath).toBeUndefined()
    })
  })

  it('uses tsconfig.json when it exists and skipTsConfig is false', () => {
    withTempDir((dir) => {
      writeFileSync(
        join(dir, 'tsconfig.json'),
        JSON.stringify({ compilerOptions: { strict: true } }),
      )
      const project = createConfiguredProject(dir, false)
      expect(project.getCompilerOptions().configFilePath).toContain('tsconfig.json')
      expect(project.getCompilerOptions().strict).toBe(true)
    })
  })

  it('does not add files from tsconfig', () => {
    withTempDir((dir) => {
      writeFileSync(join(dir, 'included.ts'), 'export const x = 1')
      writeFileSync(join(dir, 'tsconfig.json'), JSON.stringify({ include: ['*.ts'] }))
      const project = createConfiguredProject(dir, false)
      expect(project.getSourceFiles()).toHaveLength(0)
    })
  })
})
