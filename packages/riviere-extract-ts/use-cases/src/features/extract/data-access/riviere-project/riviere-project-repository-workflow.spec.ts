import { createRiviereProjectRepository } from '../../../../__fixtures__/riviere-project-repository-fixtures'
import {
  loadWorkflow,
  writeWorkflow,
} from '../../../../__fixtures__/riviere-project-workflow-fixtures'
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

it('rejects an eventcatalog-import stage whose source does not exist', () => {
  const directory = workspace()
  writeFileSync(
    join(directory, '.riviere', 'workflows', 'import.yaml'),
    'source: imported.json\nmappings: mappings.yaml\nallow-unmapped: false\n',
  )
  writeFileSync(
    join(directory, '.riviere', 'workflows', 'mappings.yaml'),
    ['domains: {}', 'services: {}', 'events: {}'].join('\n'),
  )
  writeWorkflow(
    directory,
    '  - kind: eventcatalog-import\n    name: import\n    config: import.yaml',
  )

  expect(() => loadWorkflow(directory, 'combined')).toThrow(
    /File not found: .*workflows.imported\.json/,
  )
})

it('rejects an asyncapi-import stage whose source does not exist', () => {
  const directory = workspace()
  writeFileSync(
    join(directory, '.riviere', 'workflows', 'import.yaml'),
    'source: imported.json\nmappings: mappings.yaml\nallow-unmapped: false\n',
  )
  writeFileSync(
    join(directory, '.riviere', 'workflows', 'mappings.yaml'),
    ['messages: {}', 'operations: {}'].join('\n'),
  )
  writeWorkflow(directory, '  - kind: asyncapi-import\n    name: import\n    config: import.yaml')

  expect(() => loadWorkflow(directory, 'combined')).toThrow(
    /File not found: .*workflows.imported\.json/,
  )
})

it('rejects a stage mapping that references an undeclared domain', () => {
  const directory = workspace()
  writeFileSync(
    join(directory, '.riviere', 'workflows', 'import.yaml'),
    'source: imported.json\nmappings: mappings.yaml\nallow-unmapped: false\n',
  )
  writeFileSync(join(directory, '.riviere', 'workflows', 'imported.json'), '{}')
  writeFileSync(
    join(directory, '.riviere', 'workflows', 'mappings.yaml'),
    [
      'domains:',
      '  OrdersDomain: orders',
      'services:',
      '  OrdersService:',
      '    domain: fulfilment',
      '    module: checkout',
      '    name: PlaceOrder',
      'events: {}',
    ].join('\n'),
  )
  writeWorkflow(
    directory,
    '  - kind: eventcatalog-import\n    name: import\n    config: import.yaml',
  )

  expect(() => loadWorkflow(directory, 'combined')).toThrow(
    'Workflow stages reference undeclared domains: fulfilment. Declared workflow domains: orders',
  )
})
