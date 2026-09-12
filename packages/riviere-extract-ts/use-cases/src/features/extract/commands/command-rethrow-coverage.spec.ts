import { join } from 'node:path'
import { createRiviereProjectRepository } from '../../../__fixtures__/riviere-project-repository-fixtures'
import { afterEach, describe, expect, it, vi } from 'vitest'
import { RiviereProject } from '@living-architecture/riviere-extract-ts-domain-model/domain/riviere-project'
import {
  type TestContext,
  collaborators,
  createTestContext,
  setupCommandTest,
} from '../../../__fixtures__/command-test-fixtures'
import { AddDomain } from './add-domain'
import { AddSource } from './add-source'
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
  return RiviereProject.start(
    {
      graphDefinition: {
        domains: { orders: { description: 'Orders', systemType: 'domain' } },
        sources: [{ repository: 'https://github.com/org/repo' }],
      },
    },
    collaborators(),
  ).project
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

function stubBuilderToThrow(): void {
  const project = createProject()
  vi.spyOn(RiviereProjectRepository.prototype, 'load').mockReturnValue(project)
  vi.spyOn(project, 'amendGraph').mockImplementation(() => {
    throw new UnexpectedBuilderFailure('boom')
  })
}

describe('command unexpected error propagation', () => {
  const ctx: TestContext = createTestContext()
  setupCommandTest(ctx)
  afterEach(() => vi.restoreAllMocks())

  function graphLocation(): string {
    return join(ctx.testDir, '.riviere', 'graph.json')
  }

  it('rethrows unexpected errors from add-source', () => {
    stubBuilderToThrow()
    expect(() =>
      new AddSource(createRiviereProjectRepository()).execute({
        graphFileLocation: graphLocation(),
        repository: 'https://github.com/org/x',
      }),
    ).toThrow(UnexpectedBuilderFailure)
  })

  it('rethrows unexpected errors from add-domain', () => {
    stubBuilderToThrow()
    expect(() =>
      new AddDomain(createRiviereProjectRepository()).execute({
        description: 'x',
        graphFileLocation: graphLocation(),
        name: 'payments',
        systemType: 'domain',
      }),
    ).toThrow(UnexpectedBuilderFailure)
  })

  it('rethrows unexpected errors from validate-graph', () => {
    stubBuilderToThrow()
    expect(() =>
      new ValidateGraph(createRiviereProjectRepository()).execute({
        graphFileLocation: graphLocation(),
      }),
    ).toThrow(UnexpectedBuilderFailure)
  })

  it('rethrows unexpected errors from finalize-graph', () => {
    stubBuilderToThrow()
    expect(() =>
      new FinalizeGraph(createRiviereProjectRepository()).execute({
        graphFileLocation: graphLocation(),
        outputPath: '/out',
      }),
    ).toThrow(UnexpectedBuilderFailure)
  })

  it('rethrows unexpected errors from enrich', () => {
    stubBuilderToThrow()
    expect(() =>
      new EnrichComponent(createRiviereProjectRepository()).execute({
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
  })

  it('rethrows unexpected errors from link-components', () => {
    stubBuilderToThrow()
    expect(() =>
      new LinkComponents(createRiviereProjectRepository()).execute({
        from: 'orders:core:api:source',
        graphFileLocation: graphLocation(),
        targetDomain: 'orders',
        targetModule: 'core',
        targetName: 'Place Order',
        targetType: 'UseCase',
        type: undefined,
      }),
    ).toThrow(UnexpectedBuilderFailure)
  })

  it('rethrows unexpected errors from link-external', () => {
    stubBuilderToThrow()
    expect(() =>
      new LinkExternal(createRiviereProjectRepository()).execute({
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
      new LinkHttp(createRiviereProjectRepository()).execute({
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

  it('rethrows unexpected load errors from init-graph', () => {
    vi.spyOn(RiviereProjectRepository.prototype, 'load').mockImplementation(() => {
      throw new UnexpectedBuilderFailure('init boom')
    })
    expect(() =>
      new InitGraph(
        createRiviereProjectRepository(),
        collaborators().loadEventCatalogSource,
      ).execute({
        domains: [{ description: 'Orders', name: 'orders', systemType: 'domain' }],
        graphFileLocation: graphLocation(),
        name: 'combined',
        sources: ['https://github.com/org/repo'],
      }),
    ).toThrow('init boom')
  })
})
