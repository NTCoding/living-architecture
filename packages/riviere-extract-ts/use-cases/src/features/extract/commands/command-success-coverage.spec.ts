import { join } from 'node:path'
import { afterEach, assert, describe, expect, it, vi } from 'vitest'
import { RiviereProject } from '@living-architecture/riviere-extract-ts-domain-model/domain/riviere-project'
import { RiviereBuilder } from '@living-architecture/riviere-builder-published-language'
import {
  type TestContext,
  createGraphWithDomain,
  createTestContext,
  setupCommandTest,
} from '../../../__fixtures__/command-test-fixtures'
import type { AddComponentInput } from './add-component-input'
import { AddComponent } from './add-component'
import { AddDomain } from './add-domain'
import { AddSource } from './add-source'
import { CheckConsistency } from './check-consistency'
import { DefineCustomType } from './define-custom-type'
import { DefineRelationshipType } from './define-relationship-type'
import { EnrichComponent } from './enrich-component'
import { FinalizeGraph } from './finalize-graph'
import { InitGraph } from './init-graph'
import { LinkComponents } from './link-components'
import { LinkExternal } from './link-external'
import { ValidateGraph } from './validate-graph'
import { RiviereProjectRepository } from '../data-access/riviere-project/riviere-project-repository'

function createProject(): RiviereProject {
  return RiviereProject.start({
    graphDefinition: {
      domains: { orders: { description: 'Orders', systemType: 'domain' } },
      sources: [{ repository: 'https://github.com/org/repo' }],
    },
  }).data
}

function createProjectWithType(): { project: RiviereProject; id: string } {
  const project = createProject()
  const { id } = project.amendGraph((builder) =>
    builder.addUseCase({
      domain: 'orders',
      module: 'core',
      name: 'Place Order',
      sourceLocation: { repository: 'https://github.com/org/repo', filePath: 'src/place-order.ts' },
    }),
  )
  return { project, id }
}

function createProjectWithApi(): RiviereProject {
  const project = createProject()
  project.amendGraph((builder) =>
    builder.addApi({
      apiType: 'REST',
      domain: 'orders',
      httpMethod: 'POST',
      module: 'core',
      name: 'CreateOrder',
      path: '/orders',
      sourceLocation: {
        repository: 'https://github.com/org/repo',
        filePath: 'src/create-order.ts',
      },
    }),
  )
  return project
}

describe('command success path coverage', () => {
  const ctx: TestContext = createTestContext()
  setupCommandTest(ctx)
  afterEach(() => vi.restoreAllMocks())

  function graphLocation(): string {
    return join(ctx.testDir, '.riviere', 'graph.json')
  }

  const addComponentBase = {
    componentType: 'UseCase',
    domain: 'orders',
    filePath: 'src/component.ts',
    graphFileLocation: graphLocation(),
    module: 'core',
    name: 'Component',
    repository: 'https://github.com/org/repo',
  }
  const runAddComponent = (input: Partial<AddComponentInput>) =>
    new AddComponent(new RiviereProjectRepository()).execute({ ...addComponentBase, ...input })
      .result

  it('initializes a new graph', () => {
    const result = new InitGraph(new RiviereProjectRepository()).execute({
      domains: [{ description: 'Orders', name: 'orders', systemType: 'domain' }],
      graphFileLocation: graphLocation(),
      name: 'Combined graph',
      sources: ['https://github.com/org/repo'],
    })
    expect(result.result.success).toBe(true)
  })

  it('reports an existing graph from init-graph', () => {
    const input = {
      domains: [{ description: 'Orders', name: 'orders', systemType: 'domain' }],
      graphFileLocation: graphLocation(),
      name: 'combined',
      sources: ['https://github.com/org/repo'],
    }
    new InitGraph(new RiviereProjectRepository()).execute(input)
    const result = new InitGraph(new RiviereProjectRepository()).execute(input)
    expect(result.result).toMatchObject({ code: 'GRAPH_EXISTS', success: false })
  })

  it('returns a validation error from init-graph for an unsupported system type', () => {
    const result = new InitGraph(new RiviereProjectRepository()).execute({
      domains: [{ description: 'Orders', name: 'orders', systemType: 'unsupported' }],
      graphFileLocation: graphLocation(),
      name: 'combined',
      sources: [],
    })
    expect(result.result).toMatchObject({ code: 'VALIDATION_ERROR', success: false })
  })

  it('adds a domain', async () => {
    await createGraphWithDomain(ctx.testDir, 'orders')
    const result = new AddDomain(new RiviereProjectRepository()).execute({
      description: 'Payments',
      graphFileLocation: graphLocation(),
      name: 'payments',
      systemType: 'domain',
    })
    expect(result.result.success).toBe(true)
  })

  it('adds a source', () => {
    const project = createProject()
    vi.spyOn(RiviereProjectRepository.prototype, 'load').mockReturnValue(project)
    const result = new AddSource(new RiviereProjectRepository()).execute({
      graphFileLocation: graphLocation(),
      repository: 'https://github.com/org/payments',
    })
    expect(result.result).toStrictEqual({
      repository: 'https://github.com/org/payments',
      success: true,
    })
  })

  it('reports an inconsistent graph', async () => {
    const { mkdir, writeFile } = await import('node:fs/promises')
    await mkdir(join(ctx.testDir, '.riviere'), { recursive: true })
    await writeFile(
      join(ctx.testDir, '.riviere', 'graph.json'),
      JSON.stringify({
        components: [
          {
            id: 'orders:core:usecase:orphan',
            name: 'Orphan',
            domain: 'orders',
            module: 'core',
            type: 'UseCase',
            sourceLocation: {
              repository: 'https://github.com/org/repo',
              filePath: 'src/orphan.ts',
            },
          },
        ],
        links: [],
        metadata: {
          domains: { orders: { description: 'Orders', systemType: 'domain' } },
          sources: [{ repository: 'https://github.com/org/repo' }],
        },
        version: '1.0',
      }),
      'utf-8',
    )
    const result = new CheckConsistency(new RiviereProjectRepository()).execute({
      graphFileLocation: graphLocation(),
    })
    expect(result.result).toMatchObject({
      success: true,
      consistent: false,
      warnings: [
        {
          code: 'ORPHAN_COMPONENT',
          componentId: 'orders:core:usecase:orphan',
        },
      ],
    })
  })

  it('validates a graph', async () => {
    await createGraphWithDomain(ctx.testDir, 'orders')
    const result = new ValidateGraph(new RiviereProjectRepository()).execute({
      graphFileLocation: graphLocation(),
    })
    expect(result.result.success).toBe(true)
  })

  it('finalizes a graph', () => {
    const project = createProjectWithType().project
    vi.spyOn(RiviereProjectRepository.prototype, 'load').mockReturnValue(project)
    const result = new FinalizeGraph(new RiviereProjectRepository()).execute({
      graphFileLocation: graphLocation(),
      outputPath: '/out',
    })
    expect(result.result.success).toBe(true)
  })

  it('defines a custom type', async () => {
    await createGraphWithDomain(ctx.testDir, 'orders')
    const result = new DefineCustomType(new RiviereProjectRepository()).execute({
      description: undefined,
      graphFileLocation: graphLocation(),
      name: 'Queue',
      optionalProperties: { priority: { description: 'High', type: 'number' } },
      requiredProperties: { retries: { description: 'Retry count', type: 'number' } },
    })
    expect(result.result.success).toBe(true)
  })

  it('defines a custom relationship type', async () => {
    await createGraphWithDomain(ctx.testDir, 'orders')
    const result = new DefineRelationshipType(new RiviereProjectRepository()).execute({
      description: 'Reads data',
      graphFileLocation: graphLocation(),
      name: 'reads',
    })
    expect(result.result.success).toBe(true)
  })

  it('adds an api component', () => {
    const project = createProject()
    vi.spyOn(RiviereProjectRepository.prototype, 'load').mockReturnValue(project)
    expect(
      runAddComponent({
        apiType: 'REST',
        componentType: 'API',
        httpMethod: 'POST',
        httpPath: '/orders',
        name: 'CreateOrder',
      }),
    ).toMatchObject({ success: true })
  })

  it('adds a use-case component', () => {
    const project = createProject()
    vi.spyOn(RiviereProjectRepository.prototype, 'load').mockReturnValue(project)
    expect(runAddComponent({ componentType: 'UseCase', name: 'Place Order' })).toMatchObject({
      success: true,
    })
  })

  it('adds a domain-op component', () => {
    const project = createProject()
    vi.spyOn(RiviereProjectRepository.prototype, 'load').mockReturnValue(project)
    expect(
      runAddComponent({ componentType: 'DomainOp', name: 'place order', operationName: 'place' }),
    ).toMatchObject({ success: true })
  })

  it('adds an event component', () => {
    const project = createProject()
    vi.spyOn(RiviereProjectRepository.prototype, 'load').mockReturnValue(project)
    expect(
      runAddComponent({ componentType: 'Event', eventName: 'order.placed', name: 'order placed' }),
    ).toMatchObject({ success: true })
  })

  it('adds an event-handler component', () => {
    const project = createProject()
    vi.spyOn(RiviereProjectRepository.prototype, 'load').mockReturnValue(project)
    expect(
      runAddComponent({
        componentType: 'EventHandler',
        name: 'on placed',
        subscribedEvents: 'order.placed',
      }),
    ).toMatchObject({ success: true })
  })

  it('enriches a component with every behavior field', () => {
    const { project, id } = createProjectWithType()
    vi.spyOn(RiviereProjectRepository.prototype, 'load').mockReturnValue(project)
    vi.spyOn(RiviereBuilder.prototype, 'enrichComponent').mockReturnValue(undefined)
    const result = new EnrichComponent(new RiviereProjectRepository()).execute({
      businessRules: ['rule'],
      entity: 'Order',
      emits: ['OrderPlaced'],
      graphFileLocation: graphLocation(),
      id,
      modifies: ['total'],
      reads: ['items'],
      signature: { parameters: [], returnType: 'Order' },
      stateChanges: [{ from: 'draft', to: 'created' }],
      validates: ['total'],
    })
    expect(result.result.success).toBe(true)
  })

  it('links an external target with a domain and url', () => {
    const { project, id } = createProjectWithType()
    vi.spyOn(RiviereProjectRepository.prototype, 'load').mockReturnValue(project)
    const result = new LinkExternal(new RiviereProjectRepository()).execute({
      from: id,
      graphFileLocation: graphLocation(),
      targetDomain: 'payments',
      targetName: 'Stripe',
      targetUrl: 'https://stripe.com',
      type: 'sync',
    })
    expect(result.result.success).toBe(true)
  })

  it('links components with every optional input', () => {
    const project = createProjectWithApi()
    const source = project.build().components[0]
    assert(source)
    project.amendGraph((builder) =>
      builder.defineRelationshipType({ name: 'reads', description: 'Reads' }),
    )
    vi.spyOn(RiviereProjectRepository.prototype, 'load').mockReturnValue(project)
    const result = new LinkComponents(new RiviereProjectRepository()).execute({
      condition: 'orders.total > 100',
      from: source.id,
      graphFileLocation: graphLocation(),
      relationshipType: 'reads',
      sourceLocation: {
        repository: 'https://github.com/org/repo',
        filePath: 'src/create-order.ts',
        lineNumber: 1,
        columnNumber: 1,
      },
      targetDomain: 'orders',
      targetModule: 'core',
      targetName: 'Place Order',
      targetType: 'UseCase',
      type: 'sync',
    })
    expect(result.result.success).toBe(true)
  })

  it('returns validation error from link-components for invalid input', () => {
    expect(
      new LinkComponents(new RiviereProjectRepository()).execute({
        from: 'orders:core:api:source',
        graphFileLocation: graphLocation(),
        targetDomain: 'orders',
        targetModule: 'core',
        targetName: 'Place Order',
        targetType: 'Bogus',
        type: undefined,
      }).result,
    ).toMatchObject({ code: 'VALIDATION_ERROR', success: false })
  })

  it('returns graph not found from add-domain', () => {
    expect(
      new AddDomain(new RiviereProjectRepository()).execute({
        description: 'x',
        graphFileLocation: graphLocation(),
        name: 'payments',
        systemType: 'domain',
      }).result,
    ).toMatchObject({ code: 'GRAPH_NOT_FOUND', success: false })
  })
})
