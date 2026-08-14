import { mkdtempSync, rmSync, writeFileSync } from 'node:fs'
import { tmpdir } from 'node:os'
import path from 'node:path'
import { describe, expect, it } from 'vitest'
import { loadTypeScriptModule } from './load-typescript-module'

describe('loadTypeScriptModule', () => {
  it('loads the exports from a TypeScript module', () => {
    const directory = mkdtempSync(path.join(tmpdir(), 'typescript-module-'))
    const modulePath = path.join(directory, 'config.ts')
    writeFileSync(modulePath, 'export const config: { name: string } = { name: "example" }')

    try {
      expect(loadTypeScriptModule(modulePath)).toMatchObject({
        config: { name: 'example' },
      })
    } finally {
      rmSync(directory, { force: true, recursive: true })
    }
  })
})
