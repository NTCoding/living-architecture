import { join } from 'node:path'
import { afterEach, describe, expect, it, vi } from 'vitest'
import { RiviereProject } from '@living-architecture/riviere-extract-ts-domain-model/domain/riviere-project'
import {
  type TestContext,
  createTestContext,
  setupCommandTest,
} from '../../../__fixtures__/command-test-fixtures'
import { AddDomain } from './add-domain'
import { AddComponent } from './add-component'
import { AddSource } from './add-source'
import { DefineCustomType } from './define-custom-type'
import { DefineRelationshipType } from './define-relationship-type'
import { EnrichComponent } from './enrich-component'
import { FinalizeGraph } from './finalize-graph'
import { InitGraph } from './init-graph'
import { LinkComponents } from './link-components'
import { LinkExternal } from './link-external'
import { LinkHttp } from './link-http'
import { ValidateGraph } from './validate-graph'
import { RiviereProjectRepository } from '../data-access/riviere-project/riviere-project-repository'

class UnexpectedBuilderFailure extends Error {
  constructor(message: string) {
    super(message)
    this.name = 'UnexpectedBuilderFailure'
  }
}

function createProject(): RiviereProject {
  return RiviereProject.start({
    graphDefinition: {
      domains: { orders: { description: 'Orders', systemType: 'domain' } },
      sources: [{ repository: 'https://github.com/org/repo' }],
    },
  }).data
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

describe('command error path coverage', () => {
  const ctx: TestContext = createTestContext()
  setupCommandTest(ctx)
  afterEach(() => vi.restoreAllMocks())

  function graphLocation(): string {
    return join(ctx.testDir, '.riviere', 'graph.json')
  }

  it('returns a validation error from add-domain for an unsupported system type', () => {
    const result = new AddDomain(new RiviereProjectRepository()).execute({
      description: 'x',
      graphFileLocation: graphLocation(),
      name: 'payments',
      systemType: 'bogus',
    })
    expect(result.result).toMatchObject({ code: 'VALIDATION_ERROR', success: false })
  })

  it('returns duplicate domain from add-domain', () => {
    const project = createProject()
    vi.spyOn(RiviereProjectRepository.prototype, 'load').mockReturnValue(project)
    const result = new AddDomain(new RiviereProjectRepository()).execute({
      description: 'x',
      graphFileLocation: graphLocation(),
      name: 'orders',
      systemType: 'domain',
    })
    expect(result.result).toMatchObject({ code: 'DUPLICATE_DOMAIN', success: false })
  })

  it('returns graph exists from init-graph for a corrupted graph file', async () => {
    const { mkdir, writeFile } = await import('node:fs/promises')
    await mkdir(join(ctx.testDir, '.riviere'), { recursive: true })
    await writeFile(graphLocation(), '{invalid', 'utf-8')
    const result = new InitGraph(new RiviereProjectRepository()).execute({
      domains: [{ description: 'Orders', name: 'orders', systemType: 'domain' }],
      graphFileLocation: graphLocation(),
      name: 'combined',
      sources: ['https://github.com/org/repo'],
    })
    expect(result.result).toMatchObject({ code: 'GRAPH_EXISTS', success: false })
  })

  it('returns a validation error from define-relationship-type for a duplicate relationship', () => {
    const project = createProject()
    project.amendGraph((builder) =>
      builder.defineRelationshipType({ name: 'reads', description: 'Reads' }),
    )
    vi.spyOn(RiviereProjectRepository.prototype, 'load').mockReturnValue(project)
    const result = new DefineRelationshipType(new RiviereProjectRepository()).execute({
      description: 'Reads',
      graphFileLocation: graphLocation(),
      name: 'reads',
    })
    expect(result.result).toMatchObject({ code: 'VALIDATION_ERROR', success: false })
  })

  it('returns validation errors from define-custom-type for invalid property types', () => {
    expect(
      new DefineCustomType(new RiviereProjectRepository()).execute({
        description: undefined,
        graphFileLocation: graphLocation(),
        name: 'Queue',
        optionalProperties: {},
        requiredProperties: { retries: { type: 'not-a-type' } },
      }).result,
    ).toMatchObject({ code: 'VALIDATION_ERROR', success: false })
    expect(
      new DefineCustomType(new RiviereProjectRepository()).execute({
        description: undefined,
        graphFileLocation: graphLocation(),
        name: 'Queue',
        optionalProperties: { retries: { type: 'not-a-type' } },
        requiredProperties: {},
      }).result,
    ).toMatchObject({ code: 'VALIDATION_ERROR', success: false })
  })

  it('returns a validation error from finalize-graph for an invalid graph', () => {
    const project = createProject()
    const { id } = project.amendGraph((builder) =>
      builder.addUseCase({
        domain: 'orders',
        module: 'core',
        name: 'Place Order',
        sourceLocation: { repository: 'https://github.com/org/repo', filePath: 'src/p.ts' },
      }),
    )
    project.amendGraph((builder) =>
      builder.defineRelationshipType({ name: 'reads', description: 'Reads' }),
    )
    project.amendGraph((builder) =>
      builder.link({ from: id, to: 'orders:core:domainop:missing', relationshipType: 'reads' }),
    )
    vi.spyOn(RiviereProjectRepository.prototype, 'load').mockReturnValue(project)
    const result = new FinalizeGraph(new RiviereProjectRepository()).execute({
      graphFileLocation: graphLocation(),
      outputPath: '/out',
    })
    expect(result.result).toMatchObject({ code: 'VALIDATION_ERROR', success: false })
  })

  it('returns graph not found from link-components', () => {
    expect(
      new LinkComponents(new RiviereProjectRepository()).execute({
        from: 'orders:core:api:source',
        graphFileLocation: graphLocation(),
        targetDomain: 'orders',
        targetModule: 'core',
        targetName: 'Place Order',
        targetType: 'UseCase',
        type: undefined,
      }).result,
    ).toMatchObject({ code: 'GRAPH_NOT_FOUND', success: false })
  })

  it('returns graph not found from link-external', () => {
    expect(
      new LinkExternal(new RiviereProjectRepository()).execute({
        from: 'orders:core:api:source',
        graphFileLocation: graphLocation(),
        targetDomain: undefined,
        targetName: 'Stripe',
        targetUrl: undefined,
        type: undefined,
      }).result,
    ).toMatchObject({ code: 'GRAPH_NOT_FOUND', success: false })
  })

  it('returns graph not found from link-http', () => {
    expect(
      new LinkHttp(new RiviereProjectRepository()).execute({
        graphFileLocation: graphLocation(),
        httpMethod: undefined,
        linkType: undefined,
        path: '/orders',
        targetDomain: 'orders',
        targetModule: 'core',
        targetName: 'Place Order',
        targetType: 'UseCase',
      }).result,
    ).toMatchObject({ code: 'GRAPH_NOT_FOUND', success: false })
  })

  it('returns component not found from link-external and a validation error from link-components', () => {
    const project = createProject()
    vi.spyOn(RiviereProjectRepository.prototype, 'load').mockReturnValue(project)
    expect(
      new LinkExternal(new RiviereProjectRepository()).execute({
        from: 'orders:core:api:source',
        graphFileLocation: graphLocation(),
        targetDomain: undefined,
        targetName: 'Stripe',
        targetUrl: undefined,
        type: undefined,
      }).result,
    ).toMatchObject({ code: 'COMPONENT_NOT_FOUND', success: false })
    expect(
      new LinkComponents(new RiviereProjectRepository()).execute({
        from: 'not-a-valid-id',
        graphFileLocation: graphLocation(),
        targetDomain: 'orders',
        targetModule: 'core',
        targetName: 'Place Order',
        targetType: 'UseCase',
        type: undefined,
      }).result,
    ).toMatchObject({ code: 'VALIDATION_ERROR', success: false })
  })

  it('returns a graph corrupted error from add-domain and link-external', async () => {
    const { mkdir, writeFile } = await import('node:fs/promises')
    await mkdir(join(ctx.testDir, '.riviere'), { recursive: true })
    await writeFile(graphLocation(), '{invalid', 'utf-8')
    expect(
      new AddDomain(new RiviereProjectRepository()).execute({
        description: 'x',
        graphFileLocation: graphLocation(),
        name: 'payments',
        systemType: 'domain',
      }).result,
    ).toMatchObject({ code: 'GRAPH_CORRUPTED', success: false })
    expect(
      new LinkExternal(new RiviereProjectRepository()).execute({
        from: 'orders:core:api:source',
        graphFileLocation: graphLocation(),
        targetDomain: undefined,
        targetName: 'Stripe',
        targetUrl: undefined,
        type: undefined,
      }).result,
    ).toMatchObject({ code: 'GRAPH_CORRUPTED', success: false })
  })

  it('rethrows unexpected errors from add-source, add-domain, validate-graph, and finalize-graph', () => {
    const project = createProject()
    vi.spyOn(RiviereProjectRepository.prototype, 'load').mockReturnValue(project)
    vi.spyOn(project, 'amendGraph').mockImplementation(() => {
      throw new UnexpectedBuilderFailure('boom')
    })
    expect(() =>
      new AddSource(new RiviereProjectRepository()).execute({
        graphFileLocation: graphLocation(),
        repository: 'https://github.com/org/x',
      }),
    ).toThrow(UnexpectedBuilderFailure)
    expect(() =>
      new AddDomain(new RiviereProjectRepository()).execute({
        description: 'x',
        graphFileLocation: graphLocation(),
        name: 'payments',
        systemType: 'domain',
      }),
    ).toThrow(UnexpectedBuilderFailure)
    expect(() =>
      new ValidateGraph(new RiviereProjectRepository()).execute({
        graphFileLocation: graphLocation(),
      }),
    ).toThrow(UnexpectedBuilderFailure)
    expect(() =>
      new FinalizeGraph(new RiviereProjectRepository()).execute({
        graphFileLocation: graphLocation(),
        outputPath: '/out',
      }),
    ).toThrow(UnexpectedBuilderFailure)
  })

  it('rethrows unexpected errors from enrich, link-components, and link-external', () => {
    const project = createProject()
    vi.spyOn(RiviereProjectRepository.prototype, 'load').mockReturnValue(project)
    vi.spyOn(project, 'amendGraph').mockImplementation(() => {
      throw new UnexpectedBuilderFailure('boom')
    })
    expect(() =>
      new EnrichComponent(new RiviereProjectRepository()).execute({
        businessRules: [],
        entity: undefined,
        emits: [],
        graphFileLocation: graphLocation(),
        id: 'orders:core:domainop:place-order',
        modifies: [],
        reads: [],
        signature: undefined,
        stateChanges: [],
        validates: [],
      }),
    ).toThrow(UnexpectedBuilderFailure)
    expect(() =>
      new LinkComponents(new RiviereProjectRepository()).execute({
        from: 'orders:core:api:source',
        graphFileLocation: graphLocation(),
        targetDomain: 'orders',
        targetModule: 'core',
        targetName: 'Place Order',
        targetType: 'UseCase',
        type: undefined,
      }),
    ).toThrow(UnexpectedBuilderFailure)
    expect(() =>
      new LinkExternal(new RiviereProjectRepository()).execute({
        from: 'orders:core:api:source',
        graphFileLocation: graphLocation(),
        targetDomain: undefined,
        targetName: 'Stripe',
        targetUrl: undefined,
        type: undefined,
      }),
    ).toThrow(UnexpectedBuilderFailure)
  })

  it('rethrows unexpected errors from link-http', () => {
    const project = createProjectWithApi()
    vi.spyOn(RiviereProjectRepository.prototype, 'load').mockReturnValue(project)
    vi.spyOn(project, 'amendGraph').mockImplementation(() => {
      throw new UnexpectedBuilderFailure('link-http boom')
    })
    expect(() =>
      new LinkHttp(new RiviereProjectRepository()).execute({
        graphFileLocation: graphLocation(),
        httpMethod: 'POST',
        linkType: undefined,
        path: '/orders',
        targetDomain: 'orders',
        targetModule: 'core',
        targetName: 'Place Order',
        targetType: 'UseCase',
      }),
    ).toThrow('link-http boom')
  })
  it('returns graph not found and a validation error from add-component', async () => {
    const base = {
      componentType: 'UseCase',
      domain: 'orders',
      filePath: 'f',
      graphFileLocation: graphLocation(),
      module: 'core',
      name: 'x',
      repository: 'r',
    }
    expect(new AddComponent(new RiviereProjectRepository()).execute(base).result).toMatchObject({
      code: 'GRAPH_NOT_FOUND',
      success: false,
    })
    const { mkdir, writeFile } = await import('node:fs/promises')
    await mkdir(join(ctx.testDir, '.riviere'), { recursive: true })
    await writeFile(graphLocation(), '{invalid', 'utf-8')
    expect(new AddComponent(new RiviereProjectRepository()).execute(base).result).toMatchObject({
      code: 'VALIDATION_ERROR',
      success: false,
    })
  })

  it('returns validation errors from link-external for invalid input', () => {
    expect(
      new LinkExternal(new RiviereProjectRepository()).execute({
        from: 'not-an-id',
        graphFileLocation: graphLocation(),
        targetDomain: undefined,
        targetName: 'Stripe',
        targetUrl: undefined,
        type: undefined,
      }).result,
    ).toMatchObject({ code: 'VALIDATION_ERROR', success: false })
    expect(
      new LinkExternal(new RiviereProjectRepository()).execute({
        from: 'orders:core:api:source',
        graphFileLocation: graphLocation(),
        targetDomain: undefined,
        targetName: 'Stripe',
        targetUrl: undefined,
        type: 'bogus',
      }).result,
    ).toMatchObject({ code: 'VALIDATION_ERROR', success: false })
  })

  it('returns graph corrupted for a structurally invalid graph', async () => {
    const { mkdir, writeFile } = await import('node:fs/promises')
    await mkdir(join(ctx.testDir, '.riviere'), { recursive: true })
    await writeFile(graphLocation(), '{"apiVersion": 99}', 'utf-8')
    expect(
      new AddDomain(new RiviereProjectRepository()).execute({
        description: 'x',
        graphFileLocation: graphLocation(),
        name: 'payments',
        systemType: 'domain',
      }).result,
    ).toMatchObject({ code: 'GRAPH_CORRUPTED', success: false })
  })

  it('rethrows unexpected load errors from init-graph', () => {
    vi.spyOn(RiviereProjectRepository.prototype, 'load').mockImplementation(() => {
      throw new UnexpectedBuilderFailure('init boom')
    })
    expect(() =>
      new InitGraph(new RiviereProjectRepository()).execute({
        domains: [{ description: 'Orders', name: 'orders', systemType: 'domain' }],
        graphFileLocation: graphLocation(),
        name: 'combined',
        sources: ['https://github.com/org/repo'],
      }),
    ).toThrow('init boom')
  })
})
