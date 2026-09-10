import { execFileSync } from 'node:child_process'
import { mkdirSync, mkdtempSync, rmSync, writeFileSync } from 'node:fs'
import { tmpdir } from 'node:os'
import { join } from 'node:path'
import { afterEach, describe, expect, it, vi } from 'vitest'
import { RiviereBuilder } from '@living-architecture/riviere-builder-published-language'
import { YamlDocumentReader } from '../../../../infra/external-clients/yaml/yaml-document-reader'
import { RiviereProjectRepository } from './riviere-project-repository'

const CONFIG = `modules:
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

const directories: string[] = []
class UnexpectedParserFailure extends Error {}

function workspace(): string {
  const directory = mkdtempSync(join(tmpdir(), 'project-workflow-test-'))
  directories.push(directory)
  mkdirSync(join(directory, '.riviere', 'workflows'), { recursive: true })
  writeFileSync(join(directory, 'package.json'), '{"name":"workflow-test"}')
  writeFileSync(join(directory, 'component.ts'), 'export class Component {}')
  runIsolatedGit(directory, ['init', '--initial-branch=main'])
  runIsolatedGit(directory, [
    'remote',
    'add',
    'origin',
    'https://github.com/test/workflow-test.git',
  ])
  return directory
}

function runIsolatedGit(directory: string, args: string[]): void {
  const environment = { ...process.env }
  for (const name of Object.keys(environment)) {
    if (name.startsWith('GIT_')) delete environment[name]
  }
  execFileSync('/usr/bin/git', args, { cwd: directory, env: environment, stdio: 'ignore' })
}

function writeWorkflow(
  directory: string,
  stages = '  - validate: {}',
  graphMetadata = '  name: Combined graph\n  description: Orders and shipping',
): void {
  writeFileSync(
    join(directory, '.riviere', 'workflows', 'combined.yaml'),
    `version: 1
graph:
${graphMetadata}
  sources: [{ repository: workflow-test }]
  domains: [{ name: orders }]
  outputPath: .riviere/graph.json
runLog: { directory: .riviere/logs }
stages:
${stages}
`,
  )
}

afterEach(() => {
  for (const directory of directories.splice(0)) rmSync(directory, { recursive: true })
})

describe('RiviereProjectRepository workflow loading', () => {
  it('refuses legacy extract workflows at load', () => {
    const directory = workspace()
    writeFileSync(join(directory, 'orders.yaml'), CONFIG)
    writeWorkflow(
      directory,
      `  - extract: { name: orders, config: orders.yaml, useTsConfig: false }
  - validate: {}`,
    )

    expect(() =>
      new RiviereProjectRepository().loadByWorkflowName({
        projectRoot: directory,
        workflowName: 'combined',
      }),
    ).toThrow("uses the legacy 'extract' stage")
  })

  it('refuses legacy link workflows at load', () => {
    const directory = workspace()
    writeFileSync(join(directory, 'orders.yaml'), CONFIG)
    writeWorkflow(
      directory,
      `  - link: { config: orders.yaml, useTsConfig: false }
  - validate: {}`,
    )

    expect(() =>
      new RiviereProjectRepository().loadByWorkflowName({
        projectRoot: directory,
        workflowName: 'combined',
      }),
    ).toThrow("uses the legacy 'link' stage")
  })

  it.each([
    [
      'no extraction stage',
      `  - link: { config: orders.yaml, useTsConfig: false }
  - validate: {}`,
    ],
    [
      'no legacy link stage',
      `  - extract: { name: orders, config: orders.yaml, useTsConfig: false }
  - validate: {}`,
    ],
    [
      'several legacy link stages',
      `  - extract: { name: orders, config: orders.yaml, useTsConfig: false }
  - link: { config: orders.yaml, useTsConfig: false }
  - link: { config: orders.yaml, useTsConfig: false }
  - validate: {}`,
    ],
    [
      'no validation stage',
      `  - extract: { name: orders, config: orders.yaml, useTsConfig: false }
  - link: { config: orders.yaml, useTsConfig: false }`,
    ],
  ])('refuses a legacy stage plan with %s', (_case, stages) => {
    const directory = workspace()
    writeFileSync(join(directory, 'orders.yaml'), CONFIG)
    writeWorkflow(directory, stages)

    expect(() =>
      new RiviereProjectRepository().loadByWorkflowName({
        projectRoot: directory,
        workflowName: 'combined',
      }),
    ).toThrow("Legacy 'extract' and 'link' stages are not supported")
  })

  it('loads the previous completed graph before adding the workflow', () => {
    const directory = workspace()
    const previousGraph = RiviereBuilder.new({
      name: 'Combined graph',
      description: 'Orders and shipping',
      sources: [{ repository: 'workflow-test' }],
      domains: { orders: { description: 'orders domain', systemType: 'domain' } },
    }).build()
    writeFileSync(join(directory, '.riviere', 'graph.json'), JSON.stringify(previousGraph))
    writeWorkflow(directory)

    const project = new RiviereProjectRepository().loadByWorkflowName({
      projectRoot: directory,
      workflowName: 'combined',
    })

    expect(project.build()).toStrictEqual(previousGraph)
    expect(project.rebuildGraph('combined')).toMatchObject({ success: true })
    expect(project.build()).toStrictEqual(previousGraph)
  })

  it('keeps the persisted graph name and description when the workflow omits them', () => {
    const directory = workspace()
    const persistedGraph = RiviereBuilder.new({
      name: 'Persisted graph',
      description: 'Persisted description',
      sources: [{ repository: 'workflow-test' }],
      domains: { orders: { description: 'orders domain', systemType: 'domain' } },
    }).build()
    writeFileSync(join(directory, '.riviere', 'graph.json'), JSON.stringify(persistedGraph))
    writeWorkflow(directory, '  - validate: {}', '')

    const project = new RiviereProjectRepository().loadByWorkflowName({
      projectRoot: directory,
      workflowName: 'combined',
    })

    expect(project.build()).toStrictEqual(persistedGraph)
  })

  it('rejects missing and invalid workflow definitions', () => {
    const directory = workspace()
    const repository = new RiviereProjectRepository()

    expect(() =>
      repository.loadByWorkflowName({ projectRoot: directory, workflowName: 'missing' }),
    ).toThrow('Workflow file not found')

    writeFileSync(join(directory, '.riviere', 'workflows', 'invalid.yaml'), 'version: 1')
    expect(() =>
      repository.loadByWorkflowName({ projectRoot: directory, workflowName: 'invalid' }),
    ).toThrow('Invalid workflow')
  })

  it('rejects workflow names before resolving a definition file', () => {
    const directory = workspace()

    expect(() =>
      new RiviereProjectRepository().loadByWorkflowName({
        projectRoot: directory,
        workflowName: '../combined',
      }),
    ).toThrow('Invalid workflow name')
  })

  it('rejects a workflow with duplicate stage names before returning the project', () => {
    const directory = workspace()
    writeWorkflow(directory, '  - validate: {}\n  - validate: {}')

    expect(() =>
      new RiviereProjectRepository().loadByWorkflowName({
        projectRoot: directory,
        workflowName: 'combined',
      }),
    ).toThrow("Duplicate workflow stage name 'validate'")
  })

  it('translates unexpected workflow document failures', () => {
    const directory = workspace()
    writeFileSync(join(directory, '.riviere', 'workflows', 'broken.yaml'), 'version: 1')
    const parse = vi.spyOn(YamlDocumentReader, 'parse').mockImplementationOnce(() => {
      throw new UnexpectedParserFailure('unexpected parser failure')
    })

    expect(() =>
      new RiviereProjectRepository().loadByWorkflowName({
        projectRoot: directory,
        workflowName: 'broken',
      }),
    ).toThrow('Invalid config file: Error: unexpected parser failure')
    parse.mockRestore()
  })

  it('rejects an invalid existing graph', () => {
    const directory = workspace()
    writeWorkflow(directory)
    mkdirSync(join(directory, '.riviere'), { recursive: true })
    writeFileSync(join(directory, '.riviere', 'graph.json'), '{"invalid":true}')

    expect(() =>
      new RiviereProjectRepository().loadByWorkflowName({
        projectRoot: directory,
        workflowName: 'combined',
      }),
    ).toThrow('Invalid existing graph')
  })
})
