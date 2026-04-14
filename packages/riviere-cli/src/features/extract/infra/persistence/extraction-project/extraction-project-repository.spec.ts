import {
  describe, expect, it 
} from 'vitest'
import {
  mkdirSync, mkdtempSync, rmSync, writeFileSync 
} from 'node:fs'
import { join } from 'node:path'
import { tmpdir } from 'node:os'
import { ConfigValidationError } from '../../../../../platform/infra/cli/presentation/error-codes'
import { ExtractionProjectRepository } from './extraction-project-repository'

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

function withWorkspace(fn: (dir: string) => void): void {
  const dir = mkdtempSync(join(tmpdir(), 'extract-project-test-'))
  writeFileSync(join(dir, 'package.json'), JSON.stringify({ name: 'workspace' }), 'utf-8')
  try {
    fn(dir)
  } finally {
    rmSync(dir, { recursive: true })
  }
}

function writeExtendsConfig(dir: string, extendsRef: string): void {
  writeFileSync(join(dir, 'component.ts'), 'export class Order {}', 'utf-8')
  writeFileSync(
    join(dir, 'extract.yml'),
    [
      'modules:',
      '  - name: orders',
      '    domain: orders',
      '    path: .',
      '    glob: "*.ts"',
      `    extends: ${extendsRef}`,
      '    api: { notUsed: true }',
      '    useCase: { notUsed: true }',
      '    domainOp: { notUsed: true }',
      '    event: { notUsed: true }',
      '    eventHandler: { notUsed: true }',
      '    ui: { notUsed: true }',
    ].join('\n'),
    'utf-8',
  )
}

describe('ExtractionProjectRepository', () => {
  it('loadFromFullProject returns a project with source files loaded', () => {
    withWorkspace((dir) => {
      writeFileSync(join(dir, 'component.ts'), 'export class Order {}')
      writeFileSync(join(dir, 'extract.config.yml'), VALID_CONFIG)

      const project = new ExtractionProjectRepository().loadFromFullProject({
        configPath: join(dir, 'extract.config.yml'),
        useTsConfig: true,
      })

      expect(project).toBeDefined()
    })
  })

  it('loadFromFullProject respects useTsConfig flag', () => {
    withWorkspace((dir) => {
      writeFileSync(join(dir, 'component.ts'), 'export class Order {}')
      writeFileSync(join(dir, 'extract.config.yml'), VALID_CONFIG)
      writeFileSync(
        join(dir, 'tsconfig.json'),
        JSON.stringify({ compilerOptions: { strict: true } }),
      )

      expect(() =>
        new ExtractionProjectRepository().loadFromFullProject({
          configPath: join(dir, 'extract.config.yml'),
          useTsConfig: true,
        }),
      ).not.toThrow()

      expect(() =>
        new ExtractionProjectRepository().loadFromFullProject({
          configPath: join(dir, 'extract.config.yml'),
          useTsConfig: false,
        }),
      ).not.toThrow()
    })
  })

  it('loadFromFullProject throws ConfigValidationError when config file does not exist', () => {
    expect(() =>
      new ExtractionProjectRepository().loadFromFullProject({
        configPath: '/nonexistent/path/extract.yml',
        useTsConfig: false,
      }),
    ).toThrow(ConfigValidationError)
  })

  it('loadFromFullProject throws ConfigValidationError for invalid YAML', () => {
    withWorkspace((dir) => {
      writeFileSync(join(dir, 'extract.yml'), '}{invalid yaml', 'utf-8')
      expect(() =>
        new ExtractionProjectRepository().loadFromFullProject({
          configPath: join(dir, 'extract.yml'),
          useTsConfig: false,
        }),
      ).toThrow(ConfigValidationError)
    })
  })

  it('loadFromFullProject throws ConfigValidationError for non-object root config', () => {
    withWorkspace((dir) => {
      writeFileSync(join(dir, 'extract.yml'), 'hello\n', 'utf-8')
      expect(() =>
        new ExtractionProjectRepository().loadFromFullProject({
          configPath: join(dir, 'extract.yml'),
          useTsConfig: false,
        }),
      ).toThrow(ConfigValidationError)
    })
  })

  it('loadFromFullProject throws ConfigValidationError for invalid modules array shape', () => {
    withWorkspace((dir) => {
      writeFileSync(join(dir, 'bad-modules.yml'), 'modules: hello\n', 'utf-8')
      expect(() =>
        new ExtractionProjectRepository().loadFromFullProject({
          configPath: join(dir, 'bad-modules.yml'),
          useTsConfig: false,
        }),
      ).toThrow(ConfigValidationError)
    })
  })

  it('loadFromFullProject throws ConfigValidationError for missing $ref module file', () => {
    withWorkspace((dir) => {
      writeFileSync(join(dir, 'extract.yml'), 'modules:\n  - $ref: ./missing.yml\n', 'utf-8')
      expect(() =>
        new ExtractionProjectRepository().loadFromFullProject({
          configPath: join(dir, 'extract.yml'),
          useTsConfig: false,
        }),
      ).toThrow(ConfigValidationError)
    })
  })

  it('loadFromFullProject loads config with valid modules array', () => {
    withWorkspace((dir) => {
      mkdirSync(join(dir, 'src'), { recursive: true })
      writeFileSync(join(dir, 'src', 'component.ts'), 'export const x = 1', 'utf-8')
      writeFileSync(
        join(dir, 'extract.yml'),
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
      expect(
        new ExtractionProjectRepository().loadFromFullProject({
          configPath: join(dir, 'extract.yml'),
          useTsConfig: false,
        }),
      ).toBeDefined()
    })
  })

  it('loadFromFullProject loads config with relative top-level extends reference', () => {
    withWorkspace((dir) => {
      writeFileSync(join(dir, 'extended.yml'), 'api: { notUsed: true }\n', 'utf-8')
      writeExtendsConfig(dir, './extended.yml')
      expect(
        new ExtractionProjectRepository().loadFromFullProject({
          configPath: join(dir, 'extract.yml'),
          useTsConfig: false,
        }),
      ).toBeDefined()
    })
  })

  it('loadFromFullProject throws when extends references a missing file', () => {
    withWorkspace((dir) => {
      writeExtendsConfig(dir, './missing-extended.yml')
      expect(() =>
        new ExtractionProjectRepository().loadFromFullProject({
          configPath: join(dir, 'extract.yml'),
          useTsConfig: false,
        }),
      ).toThrow(/File not found/)
    })
  })

  it('loadFromFullProject loads config with top-level extends using all defaults', () => {
    withWorkspace((dir) => {
      writeFileSync(join(dir, 'extended.yml'), 'useCase: { notUsed: true }\n', 'utf-8')
      writeExtendsConfig(dir, './extended.yml')
      expect(
        new ExtractionProjectRepository().loadFromFullProject({
          configPath: join(dir, 'extract.yml'),
          useTsConfig: false,
        }),
      ).toBeDefined()
    })
  })

  it('loadFromFullProject throws when extends references an invalid config format', () => {
    withWorkspace((dir) => {
      writeFileSync(join(dir, 'extended.yml'), '- nope\n', 'utf-8')
      writeExtendsConfig(dir, './extended.yml')
      expect(() =>
        new ExtractionProjectRepository().loadFromFullProject({
          configPath: join(dir, 'extract.yml'),
          useTsConfig: false,
        }),
      ).toThrow(/Invalid extended config format/)
    })
  })

  it('loadFromFullProject loads extends from a modules-array config file', () => {
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
      writeExtendsConfig(dir, './extended.yml')
      expect(
        new ExtractionProjectRepository().loadFromFullProject({
          configPath: join(dir, 'extract.yml'),
          useTsConfig: false,
        }),
      ).toBeDefined()
    })
  })

  it('loadFromFullProject loads package-based extends from node_modules', () => {
    withWorkspace((dir) => {
      const pkgDir = join(dir, 'node_modules', 'my-config')
      mkdirSync(join(pkgDir, 'src'), { recursive: true })
      writeFileSync(join(pkgDir, 'package.json'), JSON.stringify({ name: 'my-config' }), 'utf-8')
      writeFileSync(
        join(pkgDir, 'src', 'default-extraction.config.json'),
        '{"api":{"notUsed":true}}',
        'utf-8',
      )
      writeExtendsConfig(dir, 'my-config')
      expect(
        new ExtractionProjectRepository().loadFromFullProject({
          configPath: join(dir, 'extract.yml'),
          useTsConfig: false,
        }),
      ).toBeDefined()
    })
  })

  it('loadFromFullProject throws when package extends cannot be resolved from node_modules', () => {
    withWorkspace((dir) => {
      writeExtendsConfig(dir, 'missing-package')
      expect(() =>
        new ExtractionProjectRepository().loadFromFullProject({
          configPath: join(dir, 'extract.yml'),
          useTsConfig: false,
        }),
      ).toThrow(/Cannot resolve package/)
    })
  })

  it('loadFromFullProject throws when package exists without default extraction config', () => {
    withWorkspace((dir) => {
      const pkgDir = join(dir, 'node_modules', 'config-without-default')
      mkdirSync(pkgDir, { recursive: true })
      writeFileSync(
        join(pkgDir, 'package.json'),
        JSON.stringify({ name: 'config-without-default' }),
        'utf-8',
      )
      writeExtendsConfig(dir, 'config-without-default')
      expect(() =>
        new ExtractionProjectRepository().loadFromFullProject({
          configPath: join(dir, 'extract.yml'),
          useTsConfig: false,
        }),
      ).toThrow(/Cannot resolve package/)
    })
  })

  it('loadFromSelectedFiles returns a project containing only the selected files', () => {
    withWorkspace((dir) => {
      writeFileSync(join(dir, 'a.ts'), 'export class A {}')
      writeFileSync(join(dir, 'b.ts'), 'export class B {}')
      writeFileSync(join(dir, 'extract.config.yml'), VALID_CONFIG)

      expect(
        new ExtractionProjectRepository().loadFromSelectedFiles({
          configPath: join(dir, 'extract.config.yml'),
          filePaths: [join(dir, 'a.ts')],
          useTsConfig: false,
        }),
      ).toBeDefined()
    })
  })

  it('loadFromFullProject throws when extends modules-array config fails schema validation', () => {
    withWorkspace((dir) => {
      writeFileSync(
        join(dir, 'extended.yml'),
        'modules:\n  - name: orders\n    domain: orders\n',
        'utf-8',
      )
      writeExtendsConfig(dir, './extended.yml')
      expect(() =>
        new ExtractionProjectRepository().loadFromFullProject({
          configPath: join(dir, 'extract.yml'),
          useTsConfig: false,
        }),
      ).toThrow(/Invalid extended config/)
    })
  })

  it('loadFromFullProject throws when extends modules-array config has empty modules', () => {
    withWorkspace((dir) => {
      writeFileSync(join(dir, 'extended.yml'), 'modules: []\n', 'utf-8')
      writeExtendsConfig(dir, './extended.yml')
      expect(() =>
        new ExtractionProjectRepository().loadFromFullProject({
          configPath: join(dir, 'extract.yml'),
          useTsConfig: false,
        }),
      ).toThrow(/Config has empty modules array/)
    })
  })

  it('loadFromSelectedFiles throws ConfigValidationError when a selected file does not exist', () => {
    withWorkspace((dir) => {
      writeFileSync(join(dir, 'component.ts'), 'export class Order {}')
      writeFileSync(join(dir, 'extract.config.yml'), VALID_CONFIG)

      expect(() =>
        new ExtractionProjectRepository().loadFromSelectedFiles({
          configPath: join(dir, 'extract.config.yml'),
          filePaths: [join(dir, 'nonexistent.ts')],
          useTsConfig: false,
        }),
      ).toThrow(ConfigValidationError)
    })
  })
})
