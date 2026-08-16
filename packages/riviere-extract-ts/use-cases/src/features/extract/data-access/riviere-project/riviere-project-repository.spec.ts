import { describe, expect, it } from 'vitest'
import { mkdirSync, mkdtempSync, rmSync, writeFileSync } from 'node:fs'
import { join } from 'node:path'
import { tmpdir } from 'node:os'
import { ExtractionConfigError } from './riviere-config-error'
import { ExtractionDataAccessError } from './riviere-project-error'
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

class UnexpectedSuccessfulLoadError extends Error {}

function withWorkspace(fn: (dir: string) => void): void {
  const dir = mkdtempSync(join(tmpdir(), 'extract-project-test-'))
  writeFileSync(join(dir, 'package.json'), JSON.stringify({ name: 'workspace' }), 'utf-8')
  try {
    fn(dir)
  } finally {
    rmSync(dir, { recursive: true })
  }
}

function loadProject(params: {
  configPath: string
  projectRoot?: string
  useTsConfig: boolean
  filePaths?: string[]
}): ReturnType<RiviereProjectRepository['load']> {
  return new RiviereProjectRepository().load({
    projectRoot: params.projectRoot ?? process.cwd(),
    configPath: params.configPath,
    useTsConfig: params.useTsConfig,
  })
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

describe('RiviereProjectRepository', () => {
  it('load returns a project with source files loaded.', () => {
    withWorkspace((dir) => {
      writeFileSync(join(dir, 'component.ts'), 'export class Order {}')
      writeFileSync(join(dir, 'extract.config.yml'), VALID_CONFIG)

      const project = loadProject({
        configPath: join(dir, 'extract.config.yml'),
        useTsConfig: true,
      })

      expect(project).toBeDefined()
    })
  })

  it('load respects useTsConfig flag', () => {
    withWorkspace((dir) => {
      writeFileSync(join(dir, 'component.ts'), 'export class Order {}')
      writeFileSync(join(dir, 'extract.config.yml'), VALID_CONFIG)
      writeFileSync(
        join(dir, 'tsconfig.json'),
        JSON.stringify({ compilerOptions: { strict: true } }),
      )

      expect(() =>
        loadProject({
          configPath: join(dir, 'extract.config.yml'),
          useTsConfig: true,
        }),
      ).not.toThrow()

      expect(() =>
        loadProject({
          configPath: join(dir, 'extract.config.yml'),
          useTsConfig: false,
        }),
      ).not.toThrow()
    })
  })

  it('load throws ExtractionConfigError when config file does not exist', () => {
    expect(() =>
      loadProject({
        configPath: '/nonexistent/path/extract.yml',
        useTsConfig: false,
      }),
    ).toThrow(ExtractionConfigError)
  })

  it('translates a missing Git remote into a data access error', () => {
    withWorkspace((dir) => {
      writeFileSync(join(dir, 'component.ts'), 'export class Order {}')
      writeFileSync(join(dir, 'extract.config.yml'), VALID_CONFIG)

      let caughtError: unknown
      try {
        loadProject({
          configPath: join(dir, 'extract.config.yml'),
          projectRoot: dir,
          useTsConfig: false,
        })
      } catch (error) {
        caughtError = error
      }
      if (caughtError === undefined) throw new UnexpectedSuccessfulLoadError()
      expect(caughtError).toBeInstanceOf(ExtractionDataAccessError)
      expect(caughtError).toMatchObject({ code: 'NO_REMOTE' })
    })
  })

  it('load throws ExtractionConfigError for invalid YAML', () => {
    withWorkspace((dir) => {
      writeFileSync(join(dir, 'extract.yml'), '}{invalid yaml', 'utf-8')
      expect(() =>
        loadProject({
          configPath: join(dir, 'extract.yml'),
          useTsConfig: false,
        }),
      ).toThrow(ExtractionConfigError)
    })
  })

  it('load throws ExtractionConfigError for non-object root config', () => {
    withWorkspace((dir) => {
      writeFileSync(join(dir, 'extract.yml'), 'hello\n', 'utf-8')
      expect(() =>
        loadProject({
          configPath: join(dir, 'extract.yml'),
          useTsConfig: false,
        }),
      ).toThrow(ExtractionConfigError)
    })
  })

  it('load throws ExtractionConfigError for invalid modules array shape', () => {
    withWorkspace((dir) => {
      writeFileSync(join(dir, 'bad-modules.yml'), 'modules: hello\n', 'utf-8')
      expect(() =>
        loadProject({
          configPath: join(dir, 'bad-modules.yml'),
          useTsConfig: false,
        }),
      ).toThrow(ExtractionConfigError)
    })
  })

  it('load throws ExtractionConfigError for missing $ref module file', () => {
    withWorkspace((dir) => {
      writeFileSync(join(dir, 'extract.yml'), 'modules:\n  - $ref: ./missing.yml\n', 'utf-8')
      expect(() =>
        loadProject({
          configPath: join(dir, 'extract.yml'),
          useTsConfig: false,
        }),
      ).toThrow(ExtractionConfigError)
    })
  })

  it('load loads config with valid modules array', () => {
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
          '    modules: "/src/{module}/"',
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
        loadProject({
          configPath: join(dir, 'extract.yml'),
          useTsConfig: false,
        }),
      ).toBeDefined()
    })
  })

  it('load loads config with relative top-level extends reference', () => {
    withWorkspace((dir) => {
      writeFileSync(join(dir, 'extended.yml'), 'api: { notUsed: true }\n', 'utf-8')
      writeExtendsConfig(dir, './extended.yml')
      expect(
        loadProject({
          configPath: join(dir, 'extract.yml'),
          useTsConfig: false,
        }),
      ).toBeDefined()
    })
  })

  it('load throws when extends references a missing file', () => {
    withWorkspace((dir) => {
      writeExtendsConfig(dir, './missing-extended.yml')
      expect(() =>
        loadProject({
          configPath: join(dir, 'extract.yml'),
          useTsConfig: false,
        }),
      ).toThrow(/File not found/)
    })
  })

  it('load loads config with top-level extends using all defaults', () => {
    withWorkspace((dir) => {
      writeFileSync(join(dir, 'extended.yml'), 'useCase: { notUsed: true }\n', 'utf-8')
      writeExtendsConfig(dir, './extended.yml')
      expect(
        loadProject({
          configPath: join(dir, 'extract.yml'),
          useTsConfig: false,
        }),
      ).toBeDefined()
    })
  })

  it('load throws when extends references an invalid config format', () => {
    withWorkspace((dir) => {
      writeFileSync(join(dir, 'extended.yml'), '- nope\n', 'utf-8')
      writeExtendsConfig(dir, './extended.yml')
      expect(() =>
        loadProject({
          configPath: join(dir, 'extract.yml'),
          useTsConfig: false,
        }),
      ).toThrow(/Invalid extended config format/)
    })
  })

  it('load merges customTypes from base and local extends config', () => {
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
          '    customTypes:',
          '      service:',
          '        find: classes',
          '        where: { nameEndsWith: { suffix: Service } }',
        ].join('\n'),
        'utf-8',
      )
      writeFileSync(join(dir, 'component.ts'), 'export class Order {}', 'utf-8')
      writeFileSync(
        join(dir, 'extract.yml'),
        [
          'modules:',
          '  - name: orders',
          '    domain: orders',
          '    path: .',
          '    glob: "*.ts"',
          '    extends: ./extended.yml',
          '    api: { notUsed: true }',
          '    useCase: { notUsed: true }',
          '    domainOp: { notUsed: true }',
          '    event: { notUsed: true }',
          '    eventHandler: { notUsed: true }',
          '    ui: { notUsed: true }',
          '    customTypes:',
          '      repository:',
          '        find: classes',
          '        where: { nameEndsWith: { suffix: Repository } }',
        ].join('\n'),
        'utf-8',
      )

      expect(
        loadProject({
          configPath: join(dir, 'extract.yml'),
          useTsConfig: false,
        }),
      ).toBeDefined()
    })
  })

  it('load loads package-based extends from node_modules', () => {
    withWorkspace((dir) => {
      const pkgDir = join(dir, 'node_modules', 'my-config')
      mkdirSync(join(pkgDir, 'src', 'published-language'), { recursive: true })
      writeFileSync(join(pkgDir, 'package.json'), JSON.stringify({ name: 'my-config' }), 'utf-8')
      writeFileSync(
        join(pkgDir, 'src', 'published-language', 'default-extraction.config.json'),
        '{"api":{"notUsed":true}}',
        'utf-8',
      )
      writeExtendsConfig(dir, 'my-config')
      expect(
        loadProject({
          configPath: join(dir, 'extract.yml'),
          useTsConfig: false,
        }),
      ).toBeDefined()
    })
  })

  it('load throws when package extends cannot be resolved from node_modules', () => {
    withWorkspace((dir) => {
      writeExtendsConfig(dir, 'missing-package')
      expect(() =>
        loadProject({
          configPath: join(dir, 'extract.yml'),
          useTsConfig: false,
        }),
      ).toThrow(/Cannot resolve package/)
    })
  })

  it('load throws when package exists without default extraction config', () => {
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
        loadProject({
          configPath: join(dir, 'extract.yml'),
          useTsConfig: false,
        }),
      ).toThrow(/Cannot resolve package/)
    })
  })

  it('load returns a project containing all configured files', () => {
    withWorkspace((dir) => {
      writeFileSync(join(dir, 'a.ts'), 'export class A {}')
      writeFileSync(join(dir, 'b.ts'), 'export class B {}')
      writeFileSync(join(dir, 'extract.config.yml'), VALID_CONFIG)

      const project = loadProject({
        configPath: join(dir, 'extract.config.yml'),
        projectRoot: dir,
        useTsConfig: false,
      })

      expect(project.stage.moduleContexts[0]?.files).toEqual(
        expect.arrayContaining([join(dir, 'a.ts'), join(dir, 'b.ts')]),
      )
    })
  })

  it('load throws when extends modules-array config fails schema validation', () => {
    withWorkspace((dir) => {
      writeFileSync(
        join(dir, 'extended.yml'),
        'modules:\n  - name: orders\n    domain: orders\n',
        'utf-8',
      )
      writeExtendsConfig(dir, './extended.yml')
      expect(() =>
        loadProject({
          configPath: join(dir, 'extract.yml'),
          useTsConfig: false,
        }),
      ).toThrow(/Invalid extended config/)
    })
  })

  it('load throws when extends modules-array config has empty modules', () => {
    withWorkspace((dir) => {
      writeFileSync(join(dir, 'extended.yml'), 'modules: []\n', 'utf-8')
      writeExtendsConfig(dir, './extended.yml')
      expect(() =>
        loadProject({
          configPath: join(dir, 'extract.yml'),
          useTsConfig: false,
        }),
      ).toThrow(/Config has empty modules array/)
    })
  })
})
