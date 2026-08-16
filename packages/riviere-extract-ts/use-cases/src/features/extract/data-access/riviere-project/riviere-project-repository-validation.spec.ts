import { execFileSync } from 'node:child_process'
import { mkdtempSync, rmSync, writeFileSync } from 'node:fs'
import { tmpdir } from 'node:os'
import { join } from 'node:path'
import { describe, expect, it, vi } from 'vitest'
import { RiviereProject } from '@living-architecture/riviere-extract-ts-domain-model/domain/riviere-project'
import * as publishedLanguage from '@living-architecture/riviere-extract-config-published-language'
import { ValidatedConfiguration } from '@living-architecture/riviere-extract-config-published-language'
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

function withWorkspace(run: (directory: string) => void): void {
  const directory = mkdtempSync(join(tmpdir(), 'extract-validation-test-'))
  writeFileSync(join(directory, 'package.json'), JSON.stringify({ name: 'workspace' }))
  writeFileSync(join(directory, 'component.ts'), 'export class Order {}')
  execFileSync('/usr/bin/git', ['init', '--initial-branch=main'], {
    cwd: directory,
    stdio: 'ignore',
  })
  execFileSync('/usr/bin/git', ['remote', 'add', 'origin', 'https://github.com/test/repo.git'], {
    cwd: directory,
    stdio: 'ignore',
  })
  try {
    run(directory)
  } finally {
    rmSync(directory, { recursive: true })
  }
}

function loadProject(params: {
  configPath: string
  projectRoot?: string
  useTsConfig: boolean
}): void {
  new RiviereProjectRepository().load({
    projectRoot: params.projectRoot ?? process.cwd(),
    configPath: params.configPath,
    useTsConfig: params.useTsConfig,
  })
}

function load(directory: string): void {
  loadProject({
    configPath: 'extract.yml',
    projectRoot: directory,
    useTsConfig: false,
  })
}

describe('RiviereProjectRepository validation', () => {
  it('inherits every rule from a modules-array configuration', () => {
    withWorkspace((directory) => {
      writeFileSync(
        join(directory, 'extended.yml'),
        `modules:
  - name: base
    domain: base
    path: src
    glob: "**/*.ts"
    modules: "/src/{module}/"
    api: { notUsed: true }
    useCase: { notUsed: true }
    domainOp: { notUsed: true }
    event: { notUsed: true }
    eventHandler: { notUsed: true }
    ui: { notUsed: true }
    customTypes:
      service:
        find: classes
        where: { nameEndsWith: { suffix: Service } }
`,
      )
      writeFileSync(
        join(directory, 'extract.yml'),
        `modules:
  - name: orders
    domain: orders
    path: .
    glob: "*.ts"
    modules: "/src/{module}/"
    extends: ./extended.yml
`,
      )
      expect(() => load(directory)).not.toThrow()
    })
  })

  it('rejects a resolved configuration missing required extraction metadata', () => {
    withWorkspace((directory) => {
      writeFileSync(
        join(directory, 'extract.yml'),
        VALID_CONFIG.replace(
          'api: { notUsed: true }',
          'api: { find: classes, where: { nameEndsWith: { suffix: Controller } } }',
        ),
      )
      expect(() => load(directory)).toThrow(/Missing required extraction rules: apiType/)
    })
  })

  it('maps an invalid aggregate result to a configuration error', () => {
    withWorkspace((directory) => {
      writeFileSync(join(directory, 'extract.yml'), VALID_CONFIG)
      const parse = vi.spyOn(RiviereProject, 'parse').mockReturnValueOnce({
        success: false,
        error: 'Invalid module sources',
      })
      expect(() => load(directory)).toThrow(/Invalid module sources/)
      parse.mockRestore()
    })
  })

  it('maps a resolved configuration validation failure to a configuration error', () => {
    withWorkspace((directory) => {
      writeFileSync(join(directory, 'extract.yml'), VALID_CONFIG)
      const parse = vi.spyOn(ValidatedConfiguration, 'parse').mockReturnValueOnce({
        success: false,
        errors: [{ path: 'modules', message: 'Invalid resolved modules' }],
      })
      expect(() => load(directory)).toThrow(/modules: Invalid resolved modules/)
      parse.mockRestore()
    })
  })

  it('reports a resolved configuration failure without specific errors', () => {
    withWorkspace((directory) => {
      writeFileSync(join(directory, 'extract.yml'), VALID_CONFIG)
      const parse = vi.spyOn(ValidatedConfiguration, 'parse').mockReturnValueOnce({
        success: false,
        errors: [],
      })
      expect(() => load(directory)).toThrow(/validation failed without specific errors/)
      parse.mockRestore()
    })
  })

  it('rejects an extended configuration that resolves without a module', () => {
    withWorkspace((directory) => {
      const extendedPath = join(directory, 'extended.yml')
      writeFileSync(extendedPath, 'modules:\n  - name: base\n')
      const repository = new RiviereProjectRepository()
      vi.spyOn(publishedLanguage, 'parseExtractionConfig').mockReturnValueOnce({
        success: true,
        configuration: { modules: [{}] },
      } as never)
      vi.spyOn(ValidatedConfiguration, 'parse').mockReturnValueOnce({
        success: true,
        data: { modules: [] },
      } as never)

      expect(() =>
        (repository as unknown as {
          loadExtendedModule: (source: string, configDir: string) => unknown
        }).loadExtendedModule(extendedPath, directory),
      ).toThrow(/Config has no resolved modules/)
    })
  })
})
