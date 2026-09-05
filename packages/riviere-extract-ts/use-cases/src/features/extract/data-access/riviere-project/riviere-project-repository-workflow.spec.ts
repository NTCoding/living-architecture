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

afterEach(() => {
  for (const directory of directories.splice(0)) rmSync(directory, { recursive: true })
})

describe('RiviereProjectRepository workflow loading', () => {
  it('materialises legacy extraction as a code extraction stage', () => {
    const directory = workspace()
    writeFileSync(join(directory, 'orders.yaml'), CONFIG)
    writeFileSync(join(directory, 'shipping.yaml'), CONFIG)
    writeWorkflow(
      directory,
      'shipping.yaml',
      'shipping',
      '  name: Combined graph\n  description: Orders and shipping',
    )

    const project = new RiviereProjectRepository().loadByWorkflowName({
      projectRoot: directory,
      workflowName: 'combined',
    })
    const result = project.rebuildGraph('combined')

    expect(result).toMatchObject({
      success: false,
      errorCode: 'STAGE_BEHAVIOUR_UNAVAILABLE',
      reason: "Stage behaviour is unavailable for 'code-extraction'",
      events: [
        { type: 'WorkflowStarted' },
        { type: 'StageStarted', stageKind: 'code-extraction', stageName: 'orders' },
        { type: 'StageFailed', stageKind: 'code-extraction', stageName: 'orders' },
        { type: 'WorkflowFailed' },
      ],
    })
  })

  it('loads the previous completed graph before adding the workflow', () => {
    const directory = workspace()
    writeFileSync(join(directory, 'orders.yaml'), CONFIG)
    writeFileSync(join(directory, 'shipping.yaml'), CONFIG)
    writeWorkflow(directory)
    const previousGraph = RiviereBuilder.new({
      name: 'Previous graph',
      sources: [{ repository: 'workflow-test' }],
      domains: { orders: { description: 'Orders', systemType: 'domain' } },
    }).build()
    writeFileSync(join(directory, '.riviere', 'graph.json'), JSON.stringify(previousGraph))
    const project = new RiviereProjectRepository().loadByWorkflowName({
      projectRoot: directory,
      workflowName: 'combined',
    })
    const loadedGraph = project.build()

    project.rebuildGraph('combined')

    expect(project.build()).toStrictEqual(loadedGraph)
  })

  it('fails before returning the project when a referenced configuration is missing', () => {
    const directory = workspace()
    writeFileSync(join(directory, 'orders.yaml'), CONFIG)
    writeWorkflow(directory, 'missing.yaml')

    expect(() =>
      new RiviereProjectRepository().loadByWorkflowName({
        projectRoot: directory,
        workflowName: 'combined',
      }),
    ).toThrow('Config file not found')
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

  it('rejects a workflow that the aggregate cannot start', () => {
    const directory = workspace()
    writeFileSync(join(directory, 'orders.yaml'), CONFIG)
    writeFileSync(join(directory, 'shipping.yaml'), CONFIG)
    writeWorkflow(directory, 'shipping.yaml', 'orders')

    expect(() =>
      new RiviereProjectRepository().loadByWorkflowName({
        projectRoot: directory,
        workflowName: 'combined',
      }),
    ).toThrow("Duplicate workflow stage name 'orders'")
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
  ])('loads the temporary legacy definition with %s', (_case, stages) => {
    const directory = workspace()
    writeFileSync(join(directory, 'orders.yaml'), CONFIG)
    writeWorkflow(directory, 'shipping.yaml', 'shipping', '', stages)

    expect(() =>
      new RiviereProjectRepository().loadByWorkflowName({
        projectRoot: directory,
        workflowName: 'combined',
      }),
    ).not.toThrow()
  })

  it('rejects duplicate validation stage names', () => {
    const directory = workspace()
    writeFileSync(join(directory, 'orders.yaml'), CONFIG)
    writeWorkflow(
      directory,
      'shipping.yaml',
      'shipping',
      '',
      `  - extract: { name: orders, config: orders.yaml, useTsConfig: false }
  - validate: {}
  - validate: {}`,
    )

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
    writeFileSync(join(directory, 'orders.yaml'), CONFIG)
    writeFileSync(join(directory, 'shipping.yaml'), CONFIG)
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
