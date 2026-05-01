import {
  describe, expect, it 
} from 'vitest'
import {
  mkdtempSync, rmSync, writeFileSync 
} from 'node:fs'
import { join } from 'node:path'
import { tmpdir } from 'node:os'
import { loadExtendedModule } from './load-extended-module'

function withWorkspace(fn: (dir: string) => void): void {
  const dir = mkdtempSync(join(tmpdir(), 'load-extended-module-test-'))
  writeFileSync(join(dir, 'package.json'), JSON.stringify({ name: 'workspace' }), 'utf-8')
  try {
    fn(dir)
  } finally {
    rmSync(dir, { recursive: true })
  }
}

describe('loadExtendedModule', () => {
  it('throws when resolved config returns no modules for a modules-array config', () => {
    withWorkspace((dir) => {
      writeFileSync(
        join(dir, 'extended.yml'),
        [
          'modules:',
          '  - name: orders',
          '    domain: orders',
          '    path: src',
          '    glob: "**/*.ts"',
          '    api: { notUsed: true }',
          '    useCase: { notUsed: true }',
          '    domainOp: { notUsed: true }',
          '    event: { notUsed: true }',
          '    eventHandler: { notUsed: true }',
          '    ui: { notUsed: true }',
        ].join('\n'),
        'utf-8',
      )

      expect(() =>
        loadExtendedModule({
          configDir: dir,
          source: './extended.yml',
          resolveConfigWithExtends: () => ({ modules: [] }),
        }),
      ).toThrow(/Config has empty modules array/)
    })
  })
})
