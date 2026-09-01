import { mkdir, writeFile } from 'node:fs/promises'
import { join } from 'node:path'
import { RiviereProject } from '@living-architecture/riviere-extract-ts-domain-model/domain/riviere-project'
import { afterEach, describe, expect, it, vi } from 'vitest'
import {
  type TestContext,
  createTestContext,
  setupCommandTest,
} from '../../../__fixtures__/command-test-fixtures'
import { AddComponent } from './add-component'
import { AddDomain } from './add-domain'
import { AddSource } from './add-source'
import { CheckConsistency } from './check-consistency'
import { DefineCustomType } from './define-custom-type'
import { DefineRelationshipType } from './define-relationship-type'
import { EnrichComponent } from './enrich-component'
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

async function createInvalidGraphPath(testDir: string): Promise<string> {
  const graphDir = join(testDir, '.riviere')
  await mkdir(graphDir, { recursive: true })
  const graphPath = join(graphDir, 'graph.json')
  await writeFile(graphPath, '{invalid', 'utf-8')
  return graphPath
}

function createLoadedProject(): RiviereProject {
  return RiviereProject.start({
    graphDefinition: {
      domains: {
        orders: {
          description: 'Orders',
          systemType: 'domain',
        },
      },
      sources: [{ repository: 'https://github.com/org/repo' }],
    },
  }).data
}

describe('builder command coverage', () => {
  const ctx: TestContext = createTestContext()
  setupCommandTest(ctx)

  afterEach(() => {
    vi.restoreAllMocks()
  })

  it('returns graph corrupted for add-source and check-consistency.', async () => {
    const graphPath = await createInvalidGraphPath(ctx.testDir)

    const repo = new RiviereProjectRepository()
    expect(
      new AddSource(repo).execute({
        graphFileLocation: graphPath,
        repository: 'https://github.com/org/repo',
      }),
    ).toMatchObject({
      result: {
        code: 'GRAPH_CORRUPTED',
        success: false,
      },
    })
    expect(new CheckConsistency(repo).execute({ graphFileLocation: graphPath })).toMatchObject({
      result: {
        code: 'GRAPH_CORRUPTED',
        success: false,
      },
    })
  })

  it('returns graph corrupted for validate-graph', async () => {
    const graphPath = await createInvalidGraphPath(ctx.testDir)

    const repo = new RiviereProjectRepository()
    expect(new ValidateGraph(repo).execute({ graphFileLocation: graphPath })).toMatchObject({
      result: {
        code: 'GRAPH_CORRUPTED',
        success: false,
      },
    })
  })

  it('returns graph corrupted for add-domain', async () => {
    const graphPath = await createInvalidGraphPath(ctx.testDir)

    expect(
      new AddDomain(new RiviereProjectRepository()).execute({
        description: 'Orders',
        graphFileLocation: graphPath,
        name: 'orders',
        systemType: 'domain',
      }),
    ).toMatchObject({
      result: {
        code: 'GRAPH_CORRUPTED',
        success: false,
      },
    })
  })

  it('rethrows unexpected add-domain errors', () => {
    const project = createLoadedProject()
    vi.spyOn(RiviereProjectRepository.prototype, 'loadByGraphPath').mockReturnValue(project)
    vi.spyOn(project, 'addDomain').mockImplementation(() => {
      throw new UnexpectedBuilderFailure('domain explode')
    })

    expect(() =>
      new AddDomain(new RiviereProjectRepository()).execute({
        description: 'Payments',
        graphFileLocation: join(ctx.testDir, '.riviere', 'graph.json'),
        name: 'payments',
        systemType: 'domain',
      }),
    ).toThrow('domain explode')
  })

  it('returns graph corrupted for define-relationship-type', async () => {
    const graphPath = await createInvalidGraphPath(ctx.testDir)

    expect(
      new DefineRelationshipType(new RiviereProjectRepository()).execute({
        description: 'Reads data from the target',
        graphFileLocation: graphPath,
        name: 'reads',
      }),
    ).toMatchObject({
      result: {
        code: 'GRAPH_CORRUPTED',
        success: false,
      },
    })
  })

  it('rethrows unknown define-relationship-type errors', () => {
    const project = createLoadedProject()
    vi.spyOn(RiviereProjectRepository.prototype, 'loadByGraphPath').mockReturnValue(project)
    vi.spyOn(project, 'defineRelationshipType').mockImplementation(() => {
      throw new UnexpectedBuilderFailure('relationship explode')
    })

    expect(() =>
      new DefineRelationshipType(new RiviereProjectRepository()).execute({
        description: 'Reads data from the target',
        graphFileLocation: join(ctx.testDir, '.riviere', 'graph.json'),
        name: 'reads',
      }),
    ).toThrow('relationship explode')
  })

  it('rethrows unknown define-custom-type errors', () => {
    const project = createLoadedProject()
    vi.spyOn(RiviereProjectRepository.prototype, 'loadByGraphPath').mockReturnValue(project)
    vi.spyOn(project, 'defineCustomType').mockImplementation(() => {
      throw new UnexpectedBuilderFailure('explode')
    })

    expect(() =>
      new DefineCustomType(new RiviereProjectRepository()).execute({
        description: undefined,
        graphFileLocation: join(ctx.testDir, '.riviere', 'graph.json'),
        name: 'Queue',
        optionalProperties: {},
        requiredProperties: {},
      }),
    ).toThrow('explode')
  })

  it('rethrows unknown enrich and link errors', () => {
    const enrichProject = createLoadedProject()
    const linkProject = createLoadedProject()
    const externalProject = createLoadedProject()

    vi.spyOn(RiviereProjectRepository.prototype, 'loadByGraphPath')
      .mockReturnValueOnce(enrichProject)
      .mockReturnValueOnce(linkProject)
      .mockReturnValueOnce(externalProject)
    vi.spyOn(enrichProject, 'enrichComponent').mockImplementation(() => {
      throw new UnexpectedBuilderFailure('enrich explode')
    })
    vi.spyOn(linkProject, 'link').mockImplementation(() => {
      throw new UnexpectedBuilderFailure('link explode')
    })
    vi.spyOn(externalProject, 'linkExternal').mockImplementation(() => {
      throw new UnexpectedBuilderFailure('external explode')
    })

    expect(() =>
      new EnrichComponent(new RiviereProjectRepository()).execute({
        businessRules: [],
        entity: undefined,
        emits: [],
        graphFileLocation: join(ctx.testDir, '.riviere', 'graph.json'),
        id: 'orders:core:domainop:place-order',
        modifies: [],
        reads: [],
        signature: undefined,
        stateChanges: [],
        validates: [],
      }),
    ).toThrow('enrich explode')
    expect(() =>
      new LinkComponents(new RiviereProjectRepository()).execute({
        from: 'orders:core:api:source',
        graphFileLocation: join(ctx.testDir, '.riviere', 'graph.json'),
        targetDomain: 'orders',
        targetModule: 'core',
        targetName: 'Place Order',
        targetType: 'UseCase',
        type: undefined,
      }),
    ).toThrow('link explode')
    expect(() =>
      new LinkExternal(new RiviereProjectRepository()).execute({
        from: 'orders:core:api:source',
        graphFileLocation: join(ctx.testDir, '.riviere', 'graph.json'),
        targetDomain: undefined,
        targetName: 'Stripe',
        targetUrl: undefined,
        type: undefined,
      }),
    ).toThrow('external explode')
  })

  it('returns graph corrupted in link-http', async () => {
    const graphPath = await createInvalidGraphPath(ctx.testDir)

    expect(
      new LinkHttp(new RiviereProjectRepository()).execute({
        graphFileLocation: graphPath,
        httpMethod: undefined,
        linkType: undefined,
        path: '/orders',
        targetDomain: 'orders',
        targetModule: 'core',
        targetName: 'Place Order',
        targetType: 'UseCase',
      }),
    ).toMatchObject({
      result: {
        code: 'GRAPH_CORRUPTED',
        success: false,
      },
    })
  })

  it('includes ambiguous suggestions in link-http results', () => {
    const project = createLoadedProject()
    vi.spyOn(RiviereProjectRepository.prototype, 'loadByGraphPath').mockReturnValue(project)
    project.addComponent({
      type: 'API',
      input: {
        apiType: 'REST',
        domain: 'orders',
        httpMethod: 'POST',
        module: 'core',
        name: 'CreateOrder',
        path: '/orders',
        sourceLocation: {
          filePath: 'src/create-order.ts',
          repository: 'https://github.com/org/repo',
        },
      },
    })
    project.addComponent({
      type: 'API',
      input: {
        apiType: 'REST',
        domain: 'orders',
        httpMethod: 'GET',
        module: 'core',
        name: 'ListOrders',
        path: '/orders',
        sourceLocation: {
          filePath: 'src/list-orders.ts',
          repository: 'https://github.com/org/repo',
        },
      },
    })

    expect(
      new LinkHttp(new RiviereProjectRepository()).execute({
        graphFileLocation: join(ctx.testDir, '.riviere', 'graph.json'),
        httpMethod: undefined,
        linkType: undefined,
        path: '/orders',
        targetDomain: 'orders',
        targetModule: 'core',
        targetName: 'Place Order',
        targetType: 'UseCase',
      }),
    ).toMatchObject({
      result: {
        code: 'AMBIGUOUS_API_MATCH',
        success: false,
        suggestions: ['POST /orders', 'GET /orders'],
      },
    })
  })

  it('maps generic Error in add-component', () => {
    const project = createLoadedProject()
    vi.spyOn(RiviereProjectRepository.prototype, 'loadByGraphPath').mockReturnValue(project)
    vi.spyOn(project, 'addComponent').mockImplementation(() => {
      throw new UnexpectedBuilderFailure('builder exploded')
    })

    expect(
      new AddComponent(new RiviereProjectRepository()).execute({
        componentType: 'UI',
        domain: 'orders',
        filePath: 'src/checkout.tsx',
        graphFileLocation: join(ctx.testDir, '.riviere', 'graph.json'),
        module: 'checkout',
        name: 'Checkout',
        repository: 'https://github.com/org/repo',
        route: '/checkout',
      }),
    ).toMatchObject({
      result: {
        code: 'VALIDATION_ERROR',
        message: 'builder exploded',
        success: false,
      },
    })
  })

  it('rethrows non-Error values in add-component', () => {
    const project = createLoadedProject()
    vi.spyOn(RiviereProjectRepository.prototype, 'loadByGraphPath').mockReturnValue(project)
    vi.spyOn(project, 'addComponent').mockImplementation(() => {
      throw 'boom'
    })

    expect(() =>
      new AddComponent(new RiviereProjectRepository()).execute({
        componentType: 'UI',
        domain: 'orders',
        filePath: 'src/checkout.tsx',
        graphFileLocation: join(ctx.testDir, '.riviere', 'graph.json'),
        module: 'checkout',
        name: 'Checkout',
        repository: 'https://github.com/org/repo',
        route: '/checkout',
      }),
    ).toThrow('boom')
  })

  it('rethrows unknown load errors from add-source, check-consistency, and validate-graph', () => {
    vi.spyOn(RiviereProjectRepository.prototype, 'loadByGraphPath').mockImplementation(() => {
      throw new UnexpectedBuilderFailure('unexpected load failure')
    })

    const repo = new RiviereProjectRepository()
    expect(() =>
      new AddSource(repo).execute({
        graphFileLocation: join(ctx.testDir, '.riviere', 'graph.json'),
        repository: 'https://github.com/org/repo',
      }),
    ).toThrow('unexpected load failure')

    expect(() =>
      new CheckConsistency(repo).execute({
        graphFileLocation: join(ctx.testDir, '.riviere', 'graph.json'),
      }),
    ).toThrow('unexpected load failure')

    expect(() =>
      new ValidateGraph(repo).execute({
        graphFileLocation: join(ctx.testDir, '.riviere', 'graph.json'),
      }),
    ).toThrow('unexpected load failure')
  })

  it('rethrows unknown load errors from link-http', () => {
    vi.spyOn(RiviereProjectRepository.prototype, 'loadByGraphPath').mockImplementation(() => {
      throw new UnexpectedBuilderFailure('unexpected load failure')
    })

    expect(() =>
      new LinkHttp(new RiviereProjectRepository()).execute({
        graphFileLocation: join(ctx.testDir, '.riviere', 'graph.json'),
        httpMethod: undefined,
        linkType: undefined,
        path: '/orders',
        targetDomain: 'orders',
        targetModule: 'core',
        targetName: 'Place Order',
        targetType: 'UseCase',
      }),
    ).toThrow('unexpected load failure')
  })
})
