import { createRiviereProjectRepository } from '../../../../__fixtures__/riviere-project-repository-fixtures'
import {
  cleanupWorkflowWorkspaces,
  createWorkflowWorkspace as workspace,
} from '../../../../__fixtures__/riviere-project-workspace-fixtures'
import { mkdirSync, writeFileSync } from 'node:fs'
import { join } from 'node:path'
import { afterEach, describe, expect, it, vi } from 'vitest'
import { RiviereBuilder } from '@living-architecture/riviere-builder-published-language'
import { RiviereProject } from '@living-architecture/riviere-extract-ts-domain-model/domain/riviere-project'
import { InvalidWorkflowDefinitionError } from '@living-architecture/riviere-extract-ts-domain-model/domain/riviere-project-errors'
import { YamlDocumentReader } from '../../../../infra/external-clients/yaml/yaml-document-reader'
import * as fileReader from '../../../../infra/external-clients/filesystem/file-reader'

class UnexpectedParserFailure extends Error {}
class UnexpectedGraphReadFailure extends Error {}
class UnexpectedRehydrateFailure extends Error {}

function writeWorkflow(
  directory: string,
  stages = '  - kind: schema-validate\n    name: validate',
): void {
  writeFileSync(
    join(directory, '.riviere', 'workflows', 'combined.yaml'),
    [
      'apiVersion: v1',
      'name: combined-graph',
      'description: Orders and shipping',
      'output: ../graph.json',
      'sources:',
      '  - repository: workflow-test',
      'domains:',
      '  orders:',
      '    description: orders domain',
      'stages:',
      stages,
    ].join('\n'),
  )
}

function loadWorkflow(directory: string, name: string) {
  return createRiviereProjectRepository().load({
    kind: 'workflow',
    workflowPath: join(directory, '.riviere', 'workflows', `${name}.yaml`),
  })
}

afterEach(cleanupWorkflowWorkspaces)

describe('RiviereProjectRepository workflow loading', () => {
  it('creates a new graph from a workflow when none exists', () => {
    const directory = workspace()
    writeWorkflow(directory)

    const project = loadWorkflow(directory, 'combined')

    expect(project.build().metadata).toMatchObject({ name: 'combined-graph' })
  })

  it('loads the previous completed graph before adding the workflow', async () => {
    const directory = workspace()
    const previousGraph = RiviereBuilder.parse({
      name: 'previous-graph',
      description: 'Orders and shipping',
      sources: [{ repository: 'workflow-test' }],
      domains: { orders: { description: 'orders domain', systemType: 'domain' } },
    }).build()
    writeFileSync(join(directory, '.riviere', 'graph.json'), JSON.stringify(previousGraph))
    writeWorkflow(directory)

    const project = loadWorkflow(directory, 'combined')

    expect(project.build().metadata.name).toBe('previous-graph')
    await expect(project.rebuildGraph()).resolves.toMatchObject({ success: true })
  })

  it('rejects missing and invalid workflow definitions', () => {
    const directory = workspace()

    expect(() => loadWorkflow(directory, 'missing')).toThrow('Config file not found')

    writeFileSync(join(directory, '.riviere', 'workflows', 'invalid.yaml'), 'apiVersion: v1')
    expect(() => loadWorkflow(directory, 'invalid')).toThrow('Invalid workflow')
  })

  it('rejects a workflow with duplicate stage names before returning the project', () => {
    const directory = workspace()
    const previousGraph = RiviereBuilder.parse({
      name: 'previous-graph',
      description: 'Orders and shipping',
      sources: [{ repository: 'workflow-test' }],
      domains: { orders: { description: 'orders domain', systemType: 'domain' } },
    }).build()
    writeFileSync(join(directory, '.riviere', 'graph.json'), JSON.stringify(previousGraph))
    writeWorkflow(
      directory,
      '  - kind: schema-validate\n    name: validate\n  - kind: schema-validate\n    name: validate',
    )

    expect(() => loadWorkflow(directory, 'combined')).toThrow('Invalid workflow')
  })

  it('translates an unreadable existing graph', () => {
    const directory = workspace()
    writeWorkflow(directory)
    writeFileSync(join(directory, '.riviere', 'graph.json'), '{invalid json')

    expect(() => loadWorkflow(directory, 'combined')).toThrow('Invalid existing graph')
  })

  it('preserves an invalid workflow while rehydrating an existing graph', () => {
    const directory = workspace()
    writeWorkflow(directory)
    const previousGraph = RiviereBuilder.parse({
      name: 'previous-graph',
      description: 'Orders and shipping',
      sources: [{ repository: 'workflow-test' }],
      domains: { orders: { description: 'orders domain', systemType: 'domain' } },
    }).build()
    writeFileSync(join(directory, '.riviere', 'graph.json'), JSON.stringify(previousGraph))
    const rehydrate = vi.spyOn(RiviereProject, 'rehydrate').mockImplementationOnce(() => {
      throw new InvalidWorkflowDefinitionError('invalid workflow')
    })

    try {
      expect(() => loadWorkflow(directory, 'combined')).toThrow(InvalidWorkflowDefinitionError)
    } finally {
      rehydrate.mockRestore()
    }
  })

  it('rethrows unexpected rehydration failures', () => {
    const directory = workspace()
    writeWorkflow(directory)
    const previousGraph = RiviereBuilder.parse({
      name: 'previous-graph',
      description: 'Orders and shipping',
      sources: [{ repository: 'workflow-test' }],
      domains: { orders: { description: 'orders domain', systemType: 'domain' } },
    }).build()
    writeFileSync(join(directory, '.riviere', 'graph.json'), JSON.stringify(previousGraph))
    const rehydrate = vi.spyOn(RiviereProject, 'rehydrate').mockImplementationOnce(() => {
      throw new UnexpectedRehydrateFailure('unexpected rehydration failure')
    })

    try {
      expect(() => loadWorkflow(directory, 'combined')).toThrow('unexpected rehydration failure')
    } finally {
      rehydrate.mockRestore()
    }
  })

  it('rethrows unexpected existing graph read failures', () => {
    const directory = workspace()
    writeWorkflow(directory)
    writeFileSync(join(directory, '.riviere', 'graph.json'), '{}')
    const readJson = vi.spyOn(fileReader, 'readJsonFile').mockImplementationOnce(() => {
      throw new UnexpectedGraphReadFailure('unexpected graph read failure')
    })

    try {
      expect(() => loadWorkflow(directory, 'combined')).toThrow('unexpected graph read failure')
    } finally {
      readJson.mockRestore()
    }
  })

  it('translates unexpected workflow document failures', () => {
    const directory = workspace()
    writeFileSync(join(directory, '.riviere', 'workflows', 'broken.yaml'), 'apiVersion: v1')
    const parse = vi.spyOn(YamlDocumentReader, 'parse').mockImplementationOnce(() => {
      throw new UnexpectedParserFailure('unexpected parser failure')
    })

    expect(() => loadWorkflow(directory, 'broken')).toThrow(
      'Invalid config file: Error: unexpected parser failure',
    )
    parse.mockRestore()
  })

  it('rejects an invalid existing graph', () => {
    const directory = workspace()
    writeWorkflow(directory)
    mkdirSync(join(directory, '.riviere'), { recursive: true })
    writeFileSync(join(directory, '.riviere', 'graph.json'), '[]')

    expect(() => loadWorkflow(directory, 'combined')).toThrow('Invalid existing graph')
  })

  it('resolves output relative to the workflow file at an arbitrary location', () => {
    const directory = workspace()
    const workflowDirectory = join(directory, 'config')
    mkdirSync(workflowDirectory, { recursive: true })
    writeFileSync(
      join(workflowDirectory, 'workflow.yaml'),
      [
        'apiVersion: v1',
        'name: combined-graph',
        'output: ./out.json',
        'sources:',
        '  - repository: workflow-test',
        'domains:',
        '  orders:',
        '    description: orders domain',
        'stages:',
        '  - kind: schema-validate',
        '    name: validate',
      ].join('\n'),
    )
    const previousGraph = RiviereBuilder.parse({
      name: 'previous-graph',
      description: 'Orders and shipping',
      sources: [{ repository: 'workflow-test' }],
      domains: { orders: { description: 'orders domain', systemType: 'domain' } },
    }).build()
    writeFileSync(join(workflowDirectory, 'out.json'), JSON.stringify(previousGraph))

    const project = createRiviereProjectRepository().load({
      kind: 'workflow',
      workflowPath: join(workflowDirectory, 'workflow.yaml'),
    })

    expect(project.build().metadata.name).toBe('previous-graph')
  })
})
it.each([
  ['asyncapi-import', 'source: imported.json\nmappings: mappings.json\nallow-unmapped: false\n'],
] as const)('materializes an %s stage', (kind, configYaml) => {
  const directory = workspace()
  writeFileSync(join(directory, '.riviere', 'workflows', 'import.yaml'), configYaml)
  writeWorkflow(directory, `  - kind: ${kind}\n    name: import\n    config: import.yaml`)

  expect(loadWorkflow(directory, 'combined')).toBeDefined()
})

it('materializes an eventcatalog-import stage with validated mappings', () => {
  const directory = workspace()
  writeFileSync(
    join(directory, '.riviere', 'workflows', 'import.yaml'),
    'source: imported.json\nmappings: mappings.yaml\nallow-unmapped: false\n',
  )
  writeFileSync(
    join(directory, '.riviere', 'workflows', 'mappings.yaml'),
    [
      'domains:',
      '  OrdersDomain: orders',
      'services:',
      '  OrdersService:',
      '    type: UseCase',
      '    domain: orders',
      '    module: checkout',
      '    name: PlaceOrder',
      'events:',
      '  OrderCreated:',
      '    name: OrderPlaced',
    ].join('\n'),
  )
  writeWorkflow(
    directory,
    '  - kind: eventcatalog-import\n    name: import\n    config: import.yaml',
  )

  const project = loadWorkflow(directory, 'combined')

  expect(project.build().metadata.name).toBe('combined-graph')
})

it('rejects eventcatalog-import mappings with unknown keys', () => {
  const directory = workspace()
  writeFileSync(
    join(directory, '.riviere', 'workflows', 'import.yaml'),
    'source: imported.json\nmappings: mappings.yaml\nallow-unmapped: false\n',
  )
  writeFileSync(
    join(directory, '.riviere', 'workflows', 'mappings.yaml'),
    ['domains: {}', 'services: {}', 'events: {}', 'unexpected: true'].join('\n'),
  )
  writeWorkflow(
    directory,
    '  - kind: eventcatalog-import\n    name: import\n    config: import.yaml',
  )

  expect(() => loadWorkflow(directory, 'combined')).toThrow(/Invalid EventCatalog mappings/)
})

it('materializes an ai-extract stage', () => {
  const directory = workspace()
  writeFileSync(
    join(directory, '.riviere', 'workflows', 'ai.yaml'),
    [
      'command: extract',
      'args: [extract]',
      'timeout-seconds: 10',
      'sources: [src]',
      'selection:',
      '  from: [uncertain-links]',
      '  component-types: [UseCase]',
      'outputs:',
      '  add-components: true',
      '  add-links: true',
      'context:',
      '  exclude: []',
      '  max-files-per-batch: 5',
      '  max-batches: 2',
    ].join('\n'),
  )
  writeWorkflow(directory, '  - kind: ai-extract\n    name: extract\n    config: ai.yaml')

  expect(loadWorkflow(directory, 'combined')).toBeDefined()
})

it('materializes an ai-enrich stage', () => {
  const directory = workspace()
  writeFileSync(
    join(directory, '.riviere', 'workflows', 'ai.yaml'),
    [
      'command: enrich',
      'args: [enrich]',
      'timeout-seconds: 10',
      'sources: [src]',
      'memory: memory.md',
      'prompt-append: prompt.md',
      'selection:',
      '  component-types: [UseCase]',
      '  missing-fields-only: true',
      'fields: [operationName]',
      'context:',
      '  exclude: []',
      '  max-files-per-component: 5',
    ].join('\n'),
  )
  writeWorkflow(directory, '  - kind: ai-enrich\n    name: enrich\n    config: ai.yaml')

  expect(loadWorkflow(directory, 'combined')).toBeDefined()
})

it.each([
  ['eventcatalog-import', 'source: a.json\n'],
  [
    'eventcatalog-import',
    'source: a.json\nmappings: m.yaml\nallow-unmapped: false\nunexpected: true\n',
  ],
  ['eventcatalog-import', "source: ''\nmappings: m.yaml\nallow-unmapped: false\n"],
  ['asyncapi-import', 'source: a.json\n'],
  ['ai-extract', 'command: extract\n'],
  ['ai-enrich', 'command: enrich\n'],
])('rejects an %s stage with an invalid config', (kind, configYaml) => {
  const directory = workspace()
  writeFileSync(join(directory, '.riviere', 'workflows', 'stage.yaml'), configYaml)
  writeFileSync(
    join(directory, '.riviere', 'workflows', 'm.yaml'),
    'domains: {}\nservices: {}\nevents: {}\n',
  )
  writeWorkflow(directory, `  - kind: ${kind}\n    name: stage\n    config: stage.yaml`)

  expect(() => loadWorkflow(directory, 'combined')).toThrow(/./)
})

it('materializes a code-extraction stage', () => {
  const directory = workspace()
  writeFileSync(
    join(directory, '.riviere', 'workflows', 'extract.yaml'),
    [
      'modules:',
      '  - name: orders',
      '    domain: orders',
      '    path: .',
      '    glob: "*.ts"',
      '    api: { notUsed: true }',
      '    useCase: { notUsed: true }',
      '    domainOp: { notUsed: true }',
      '    event: { notUsed: true }',
      '    eventHandler: { notUsed: true }',
      '    ui: { notUsed: true }',
    ].join('\n'),
  )
  writeWorkflow(directory, '  - kind: code-extraction\n    name: extract\n    config: extract.yaml')

  expect(loadWorkflow(directory, 'combined')).toBeDefined()
})

it('rejects a workflow whose name is invalid for the workflow runner', () => {
  const directory = workspace()
  writeFileSync(
    join(directory, '.riviere', 'workflows', 'combined.yaml'),
    [
      'apiVersion: v1',
      'name: Has Spaces',
      'output: .riviere/graph.json',
      'sources:',
      '  - repository: workflow-test',
      'domains:',
      '  orders:',
      '    description: orders domain',
      'stages:',
      '  - kind: schema-validate',
      '    name: validate',
    ].join('\n'),
  )

  expect(() => loadWorkflow(directory, 'combined')).toThrow(/Workflow name 'Has Spaces' must match/)
})
