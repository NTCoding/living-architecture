import { execFileSync } from 'node:child_process'
import { mkdirSync, mkdtempSync, rmSync, writeFileSync } from 'node:fs'
import { tmpdir } from 'node:os'
import { join } from 'node:path'
import { afterEach, describe, expect, it, vi } from 'vitest'
import { RiviereProject } from '@living-architecture/riviere-extract-ts-domain-model/domain/riviere-project'
import { RiviereProjectRepository } from './riviere-project-repository'

const GIT_EXECUTABLE = process.env['GIT_EXECUTABLE'] ?? '/usr/bin/git'
const extractionConfig = `modules:
  - name: orders
    domain: orders
    path: ..
    glob: "*.ts"
    api: { notUsed: true }
    useCase: { notUsed: true }
    domainOp: { notUsed: true }
    event: { notUsed: true }
    eventHandler: { notUsed: true }
    ui: { notUsed: true }
`

function withWorkspace(run: (directory: string) => void): void {
  const directory = mkdtempSync(join(tmpdir(), 'workflow-repository-test-'))
  mkdirSync(join(directory, '.riviere', 'workflows'), { recursive: true })
  writeFileSync(join(directory, 'component.ts'), 'export class Order {}')
  writeFileSync(join(directory, 'tsconfig.json'), JSON.stringify({ compilerOptions: {} }))
  writeFileSync(join(directory, '.riviere', 'config.yml'), extractionConfig)
  execFileSync(GIT_EXECUTABLE, ['init', '--initial-branch=main'], { cwd: directory, stdio: 'ignore' })
  execFileSync(GIT_EXECUTABLE, ['remote', 'add', 'origin', 'https://github.com/test/orders.git'], {
    cwd: directory,
    stdio: 'ignore',
  })
  try {
    run(directory)
  } finally {
    rmSync(directory, { recursive: true })
  }
}

function writeWorkflow(directory: string, content: string): void {
  writeFileSync(join(directory, '.riviere', 'workflows', 'main.yaml'), content)
}

const validWorkflow = `version: 1
graph:
  sources:
    - name: orders
      repository: https://github.com/test/orders
  domains:
    - name: orders
  outputPath: .riviere/graph.json
runLog:
  directory: .riviere/logs/workflows
stages:
  - extract:
      name: extract-orders
      config: .riviere/config.yml
  - link:
      config: .riviere/config.yml
  - validate: {}
`

describe('RiviereProjectRepository workflow loading', () => {
  afterEach(() => {
    vi.restoreAllMocks()
  })

  it('loads a named workflow as aggregate state without executing it', () => {
    withWorkspace((directory) => {
      writeWorkflow(directory, validWorkflow)
      const project = new RiviereProjectRepository().load({ projectRoot: directory, workflowName: 'main' })

      expect(project.workflowState).toMatchObject({
        graph: {
          outputPath: join(directory, '.riviere', 'graph.json'),
          sources: [{ repository: 'https://github.com/test/orders' }],
          domains: { orders: { description: 'orders', systemType: 'domain' } },
        },
        runLogDirectory: join(directory, '.riviere', 'logs', 'workflows'),
      })
      expect(project.workflowState?.stages.map((stage) => stage.kind)).toStrictEqual([
        'extract',
        'link',
        'validate',
      ])
    })
  })

  it.each([
    ['invalid workflow name', '../main', validWorkflow, /Invalid workflow name/],
    ['missing graph output', 'main', validWorkflow.replace('  outputPath: .riviere/graph.json\n', ''), /outputPath is required/],
    [
      'invalid stage order',
      'main',
      validWorkflow.replace(
        '  - link:\n      config: .riviere/config.yml\n  - validate: {}',
        '  - validate: {}\n  - link:\n      config: .riviere/config.yml',
      ),
      /ordered as extract, link, validate/,
    ],
  ])('rejects %s before stages run', (_label, workflowName, workflow, error) => {
    withWorkspace((directory) => {
      writeWorkflow(directory, workflow)
      expect(() => new RiviereProjectRepository().load({ projectRoot: directory, workflowName })).toThrow(error)
    })
  })

  it('reports a missing named workflow file', () => {
    withWorkspace((directory) => {
      expect(() =>
        new RiviereProjectRepository().load({ projectRoot: directory, workflowName: 'missing' }),
      ).toThrow(/Workflow file not found/)
    })
  })

  it('translates an aggregate validation failure into a configuration error', () => {
    vi.spyOn(RiviereProject, 'parseWorkflow').mockReturnValue({
      success: false,
      error: 'Workflow project state is invalid',
    })

    withWorkspace((directory) => {
      writeWorkflow(directory, validWorkflow)

      expect(() =>
        new RiviereProjectRepository().load({ projectRoot: directory, workflowName: 'main' }),
      ).toThrow(/Workflow project state is invalid/)
    })
  })
})
