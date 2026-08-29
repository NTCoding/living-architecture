import { execFileSync } from 'node:child_process'
import { mkdirSync, mkdtempSync, rmSync, writeFileSync } from 'node:fs'
import { tmpdir } from 'node:os'
import { join } from 'node:path'
import { afterEach, describe, expect, it, vi } from 'vitest'
import { RiviereProjectRepository } from './riviere-project-repository'
import type { RiviereGraph } from '@living-architecture/riviere-schema-published-language/schema'
import { YamlDocumentReader } from '../../../../infra/external-clients/yaml/yaml-document-reader'

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
class UnexpectedWorkflowFailure extends Error {}
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
  secondConfig = 'shipping.yaml',
  secondStageName = 'shipping',
  graphMetadata = '',
  stages = `  - extract: { name: orders, config: orders.yaml, useTsConfig: false }
  - extract: { name: ${secondStageName}, config: ${secondConfig}, useTsConfig: false }
  - link: { config: orders.yaml, useTsConfig: false }
  - validate: {}`,
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

function completedGraph(
  result: ReturnType<ReturnType<RiviereProjectRepository['loadWorkflow']>['rebuildGraph']>,
): RiviereGraph {
  if (!result.success) throw new UnexpectedWorkflowFailure(result.reason)
  return result.graph
}

afterEach(() => {
  for (const directory of directories.splice(0)) rmSync(directory, { recursive: true })
})

describe('RiviereProjectRepository workflow loading', () => {
  it('loads every configuration and materialises the named workflow inside the project', () => {
    const directory = workspace()
    writeFileSync(join(directory, 'orders.yaml'), CONFIG)
    writeFileSync(join(directory, 'shipping.yaml'), CONFIG)
    writeWorkflow(
      directory,
      'shipping.yaml',
      'shipping',
      '  name: Combined graph\n  description: Orders and shipping',
    )

    const project = new RiviereProjectRepository().loadWorkflow({
      projectRoot: directory,
      workflowName: 'combined',
    })
    const result = project.rebuildGraph('combined')

    expect(result.success).toBe(true)
    expect(result.events.map((event) => event.type)).toStrictEqual([
      'WorkflowStarted',
      'StageStarted',
      'StageCompleted',
      'StageStarted',
      'StageCompleted',
      'StageStarted',
      'StageCompleted',
      'StageStarted',
      'StageCompleted',
      'WorkflowCompleted',
    ])
  })

  it('loads the previous completed graph before adding the workflow', () => {
    const directory = workspace()
    writeFileSync(join(directory, 'orders.yaml'), CONFIG)
    writeFileSync(join(directory, 'shipping.yaml'), CONFIG)
    writeWorkflow(directory)
    const repository = new RiviereProjectRepository()
    const first = completedGraph(
      repository
        .loadWorkflow({ projectRoot: directory, workflowName: 'combined' })
        .rebuildGraph('combined'),
    )
    writeFileSync(join(directory, '.riviere', 'graph.json'), JSON.stringify(first))

    expect(
      repository.loadWorkflow({ projectRoot: directory, workflowName: 'combined' }).build(),
    ).toStrictEqual(first)
  })

  it('fails before returning the project when a referenced configuration is missing', () => {
    const directory = workspace()
    writeFileSync(join(directory, 'orders.yaml'), CONFIG)
    writeWorkflow(directory, 'missing.yaml')

    expect(() =>
      new RiviereProjectRepository().loadWorkflow({
        projectRoot: directory,
        workflowName: 'combined',
      }),
    ).toThrow('Config file not found')
  })

  it('rejects missing and invalid workflow definitions', () => {
    const directory = workspace()
    const repository = new RiviereProjectRepository()

    expect(() =>
      repository.loadWorkflow({ projectRoot: directory, workflowName: 'missing' }),
    ).toThrow('Workflow file not found')

    writeFileSync(join(directory, '.riviere', 'workflows', 'invalid.yaml'), 'version: 1')
    expect(() =>
      repository.loadWorkflow({ projectRoot: directory, workflowName: 'invalid' }),
    ).toThrow('Invalid workflow')
  })

  it('rejects workflow names before resolving a definition file', () => {
    const directory = workspace()

    expect(() =>
      new RiviereProjectRepository().loadWorkflow({
        projectRoot: directory,
        workflowName: '../combined',
      }),
    ).toThrow('Invalid workflow name')
  })

  it('rejects a workflow that the aggregate cannot start', () => {
    const directory = workspace()
    writeFileSync(join(directory, 'orders.yaml'), CONFIG)
    writeFileSync(join(directory, 'shipping.yaml'), CONFIG)
    writeWorkflow(directory, 'shipping.yaml', 'orders')

    expect(() =>
      new RiviereProjectRepository().loadWorkflow({
        projectRoot: directory,
        workflowName: 'combined',
      }),
    ).toThrow("Duplicate workflow stage name 'orders'")
  })

  it.each([
    [
      'missing extract stages',
      `  - link: { config: orders.yaml, useTsConfig: false }
  - validate: {}`,
      'one or more extract stages',
    ],
    [
      'missing the link stage',
      `  - extract: { name: orders, config: orders.yaml, useTsConfig: false }
  - validate: {}`,
      'exactly one link stage',
    ],
    [
      'multiple link stages',
      `  - extract: { name: orders, config: orders.yaml, useTsConfig: false }
  - link: { config: orders.yaml, useTsConfig: false }
  - link: { config: orders.yaml, useTsConfig: false }
  - validate: {}`,
      "Duplicate workflow stage name 'link'",
    ],
    [
      'missing the validate stage',
      `  - extract: { name: orders, config: orders.yaml, useTsConfig: false }
  - link: { config: orders.yaml, useTsConfig: false }`,
      'exactly one validate stage',
    ],
    [
      'multiple validate stages',
      `  - extract: { name: orders, config: orders.yaml, useTsConfig: false }
  - link: { config: orders.yaml, useTsConfig: false }
  - validate: {}
  - validate: {}`,
      "Duplicate workflow stage name 'validate'",
    ],
  ])('rejects workflows with %s before stages run', (_case, stages, reason) => {
    const directory = workspace()
    writeFileSync(join(directory, 'orders.yaml'), CONFIG)
    writeWorkflow(directory, 'shipping.yaml', 'shipping', '', stages)

    expect(() =>
      new RiviereProjectRepository().loadWorkflow({
        projectRoot: directory,
        workflowName: 'combined',
      }),
    ).toThrow(reason)
  })

  it('translates unexpected workflow document failures', () => {
    const directory = workspace()
    writeFileSync(join(directory, '.riviere', 'workflows', 'broken.yaml'), 'version: 1')
    const parse = vi.spyOn(YamlDocumentReader, 'parse').mockImplementationOnce(() => {
      throw new UnexpectedParserFailure('unexpected parser failure')
    })

    expect(() =>
      new RiviereProjectRepository().loadWorkflow({
        projectRoot: directory,
        workflowName: 'broken',
      }),
    ).toThrow('Invalid config file: Error: unexpected parser failure')
    parse.mockRestore()
  })

  it('rejects an invalid existing graph', () => {
    const directory = workspace()
    writeFileSync(join(directory, 'orders.yaml'), CONFIG)
    writeFileSync(join(directory, 'shipping.yaml'), CONFIG)
    writeWorkflow(directory)
    mkdirSync(join(directory, '.riviere'), { recursive: true })
    writeFileSync(join(directory, '.riviere', 'graph.json'), '{"invalid":true}')

    expect(() =>
      new RiviereProjectRepository().loadWorkflow({
        projectRoot: directory,
        workflowName: 'combined',
      }),
    ).toThrow('Invalid existing graph')
  })
})
