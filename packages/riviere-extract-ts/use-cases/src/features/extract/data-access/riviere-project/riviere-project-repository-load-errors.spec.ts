import { describe, expect, it, vi } from 'vitest'
import { execFileSync } from 'node:child_process'
import { mkdirSync, mkdtempSync, rmSync, writeFileSync } from 'node:fs'
import { join } from 'node:path'
import { tmpdir } from 'node:os'
import { ExtractionConfigError } from './riviere-config-error'
import { ExtractionDataAccessError } from './riviere-project-error'
import { RiviereProjectRepository } from './riviere-project-repository'

class UnexpectedGitFailure extends Error {
  constructor() {
    super('boom')
    this.name = 'UnexpectedGitFailure'
  }
}

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

const GIT_EXECUTABLE = process.env['GIT_EXECUTABLE'] ?? '/usr/bin/git'

function runGit(args: string[], cwd: string): void {
  execFileSync(GIT_EXECUTABLE, args, {
    cwd,
    env: Object.fromEntries(
      Object.entries(process.env).filter(([name]) => !name.startsWith('GIT_')),
    ),
    stdio: 'ignore',
  })
}

function withWorkspace(fn: (dir: string) => void): void {
  const dir = mkdtempSync(join(tmpdir(), 'extract-project-test-'))
  writeFileSync(join(dir, 'package.json'), JSON.stringify({ name: 'workspace' }), 'utf-8')
  runGit(['init', '--initial-branch=main'], dir)
  runGit(['remote', 'add', 'origin', 'https://github.com/test/repo.git'], dir)
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
}): ReturnType<RiviereProjectRepository['load']> {
  return new RiviereProjectRepository().load({
    kind: 'extraction',
    projectRoot: params.projectRoot ?? process.cwd(),
    configPath: params.configPath,
    useTsConfig: params.useTsConfig,
  })
}

describe('RiviereProjectRepository load errors', () => {
  it('translates a missing Git remote into a data access error', () => {
    withWorkspace((dir) => {
      runGit(['remote', 'remove', 'origin'], dir)
      writeFileSync(join(dir, 'component.ts'), 'export class Order {}')
      writeFileSync(join(dir, 'extract.config.yml'), VALID_CONFIG)

      const load = () =>
        loadProject({
          configPath: join(dir, 'extract.config.yml'),
          projectRoot: dir,
          useTsConfig: false,
        })
      expect(load).toThrow(ExtractionDataAccessError)
      expect(load).toThrow(expect.objectContaining({ code: 'NO_REMOTE' }))
    })
  })

  it('rethrows non-GitError failures from repository name resolution', async () => {
    const gitModule = await import('../../../../infra/external-clients/git/git-repository-info')
    const spy = vi.spyOn(gitModule, 'getRepositoryInfo').mockImplementation(() => {
      throw new UnexpectedGitFailure()
    })
    withWorkspace((dir) => {
      writeFileSync(join(dir, 'component.ts'), 'export class Order {}')
      writeFileSync(join(dir, 'extract.config.yml'), VALID_CONFIG)
      expect(() =>
        loadProject({
          configPath: join(dir, 'extract.config.yml'),
          projectRoot: dir,
          useTsConfig: false,
        }),
      ).toThrow('boom')
    })
    spy.mockRestore()
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
})
