import {
  mkdir, writeFile 
} from 'node:fs/promises'
import { join } from 'node:path'
import type { ApiComponent } from '../domain/api-component-queries'
import { RiviereBuilder } from '@living-architecture/riviere-builder'
import {
  afterEach, describe, expect, it, vi 
} from 'vitest'
import {
  type TestContext,
  createTestContext,
  setupCommandTest,
} from '../../../platform/__fixtures__/command-test-fixtures'
import * as addComponentDomain from '../../../platform/domain/add-component'
import * as apiQueries from '../domain/api-component-queries'
import { AddComponent } from './add-component'
import { AddDomain } from './add-domain'
import { AddSource } from './add-source'
import { CheckConsistency } from './check-consistency'
import { ComponentSummary } from './component-summary'
import { DefineCustomType } from './define-custom-type'
import { EnrichComponent } from './enrich-component'
import { LinkComponents } from './link-components'
import { LinkExternal } from './link-external'
import { LinkHttp } from './link-http'
import { ValidateGraph } from './validate-graph'
import { RiviereBuilderRepository } from '../infra/persistence/riviere-builder-repository'

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

function createLoadedBuilder(testDir: string): RiviereBuilder {
  return RiviereBuilder.new(
    {
      domains: {
        orders: {
          description: 'Orders',
          systemType: 'domain',
        },
      },
      sources: [{ repository: 'https://github.com/org/repo' }],
    },
    join(testDir, '.riviere', 'graph.json'),
  )
}

describe('builder command coverage', () => {
  const ctx: TestContext = createTestContext()
  setupCommandTest(ctx)

  afterEach(() => {
    vi.restoreAllMocks()
  })

  it('returns graph corrupted for add-source and check-consistency', async () => {
    const graphPath = await createInvalidGraphPath(ctx.testDir)

    const repo = new RiviereBuilderRepository()
    expect(
      new AddSource(repo).execute({
        graphPathOption: graphPath,
        repository: 'https://github.com/org/repo',
      }),
    ).toMatchObject({
      code: 'GRAPH_CORRUPTED',
      success: false,
    })
    expect(new CheckConsistency(repo).execute({ graphPathOption: graphPath })).toMatchObject({
      code: 'GRAPH_CORRUPTED',
      success: false,
    })
  })

  it('returns graph corrupted for component-summary and validate-graph', async () => {
    const graphPath = await createInvalidGraphPath(ctx.testDir)

    const repo = new RiviereBuilderRepository()
    expect(new ComponentSummary(repo).execute({ graphPathOption: graphPath })).toMatchObject({
      code: 'GRAPH_CORRUPTED',
      success: false,
    })
    expect(new ValidateGraph(repo).execute({ graphPathOption: graphPath })).toMatchObject({
      code: 'GRAPH_CORRUPTED',
      success: false,
    })
  })

  it('returns graph corrupted for add-domain', async () => {
    const graphPath = await createInvalidGraphPath(ctx.testDir)

    expect(
      new AddDomain(new RiviereBuilderRepository()).execute({
        description: 'Orders',
        graphPathOption: graphPath,
        name: 'orders',
        systemType: 'domain',
      }),
    ).toMatchObject({
      code: 'GRAPH_CORRUPTED',
      success: false,
    })
  })

  it('rethrows unknown define-custom-type errors', () => {
    const builder = createLoadedBuilder(ctx.testDir)
    vi.spyOn(RiviereBuilderRepository.prototype, 'load').mockReturnValue(builder)
    vi.spyOn(builder, 'defineCustomType').mockImplementation(() => {
      throw new UnexpectedBuilderFailure('explode')
    })

    expect(() =>
      new DefineCustomType(new RiviereBuilderRepository()).execute({
        description: undefined,
        graphPathOption: undefined,
        name: 'Queue',
        optionalProperties: {},
        requiredProperties: {},
      }),
    ).toThrow('explode')
  })

  it('rethrows unknown enrich and link errors', () => {
    const enrichBuilder = createLoadedBuilder(ctx.testDir)
    const linkBuilder = createLoadedBuilder(ctx.testDir)
    const externalBuilder = createLoadedBuilder(ctx.testDir)

    vi.spyOn(RiviereBuilderRepository.prototype, 'load')
      .mockReturnValueOnce(enrichBuilder)
      .mockReturnValueOnce(linkBuilder)
      .mockReturnValueOnce(externalBuilder)
    vi.spyOn(enrichBuilder, 'enrichComponent').mockImplementation(() => {
      throw new UnexpectedBuilderFailure('enrich explode')
    })
    vi.spyOn(linkBuilder, 'link').mockImplementation(() => {
      throw new UnexpectedBuilderFailure('link explode')
    })
    vi.spyOn(externalBuilder, 'linkExternal').mockImplementation(() => {
      throw new UnexpectedBuilderFailure('external explode')
    })

    expect(() =>
      new EnrichComponent(new RiviereBuilderRepository()).execute({
        businessRules: [],
        entity: undefined,
        emits: [],
        graphPathOption: undefined,
        id: 'orders:core:domainop:place-order',
        modifies: [],
        reads: [],
        signature: undefined,
        stateChanges: [],
        validates: [],
      }),
    ).toThrow('enrich explode')
    expect(() =>
      new LinkComponents(new RiviereBuilderRepository()).execute({
        from: 'a',
        graphPathOption: undefined,
        to: 'b',
        type: undefined,
      }),
    ).toThrow('link explode')
    expect(() =>
      new LinkExternal(new RiviereBuilderRepository()).execute({
        from: 'a',
        graphPathOption: undefined,
        target: { name: 'Stripe' },
        type: undefined,
      }),
    ).toThrow('external explode')
  })

  it('returns graph corrupted in link-http', async () => {
    const graphPath = await createInvalidGraphPath(ctx.testDir)

    expect(
      new LinkHttp(new RiviereBuilderRepository()).execute({
        graphPathOption: graphPath,
        httpMethod: undefined,
        linkType: undefined,
        path: '/orders',
        targetId: 'orders:core:usecase:place-order',
      }),
    ).toMatchObject({
      code: 'GRAPH_CORRUPTED',
      success: false,
    })
  })

  it('includes ambiguous suggestions in link-http results', () => {
    const builder = createLoadedBuilder(ctx.testDir)
    vi.spyOn(RiviereBuilderRepository.prototype, 'load').mockReturnValue(builder)
    vi.spyOn(builder, 'build').mockReturnValue({
      components: [],
      links: [],
      metadata: {
        domains: {},
        sources: [],
      },
      version: '1.0',
    })
    const matchingApis: ApiComponent[] = [
      {
        domain: 'orders',
        httpMethod: 'POST',
        id: 'api-a',
        name: 'CreateOrder',
        path: '/orders',
        type: 'API',
      },
      {
        domain: 'orders',
        httpMethod: 'GET',
        id: 'api-b',
        name: 'ListOrders',
        path: '/orders',
        type: 'API',
      },
    ]
    vi.spyOn(apiQueries, 'findApisByPath').mockReturnValue(matchingApis)

    expect(
      new LinkHttp(new RiviereBuilderRepository()).execute({
        graphPathOption: undefined,
        httpMethod: undefined,
        linkType: undefined,
        path: '/orders',
        targetId: 'orders:core:usecase:place-order',
      }),
    ).toMatchObject({
      code: 'AMBIGUOUS_API_MATCH',
      success: false,
      suggestions: ['POST /orders', 'GET /orders'],
    })
  })

  it('maps generic Error in add-component', () => {
    const builder = createLoadedBuilder(ctx.testDir)
    vi.spyOn(RiviereBuilderRepository.prototype, 'load').mockReturnValue(builder)
    vi.spyOn(addComponentDomain, 'addComponentToBuilder').mockImplementation(() => {
      throw new UnexpectedBuilderFailure('builder exploded')
    })

    expect(
      new AddComponent(new RiviereBuilderRepository()).execute({
        componentType: 'UI',
        domain: 'orders',
        filePath: 'src/checkout.tsx',
        module: 'checkout',
        name: 'Checkout',
        repository: 'https://github.com/org/repo',
        route: '/checkout',
      }),
    ).toMatchObject({
      code: 'VALIDATION_ERROR',
      message: 'builder exploded',
      success: false,
    })
  })

  it('rethrows non-Error values in add-component', () => {
    const builder = createLoadedBuilder(ctx.testDir)
    vi.spyOn(RiviereBuilderRepository.prototype, 'load').mockReturnValue(builder)
    vi.spyOn(addComponentDomain, 'addComponentToBuilder').mockImplementation(() => {
      throw 'boom'
    })

    expect(() =>
      new AddComponent(new RiviereBuilderRepository()).execute({
        componentType: 'UI',
        domain: 'orders',
        filePath: 'src/checkout.tsx',
        module: 'checkout',
        name: 'Checkout',
        repository: 'https://github.com/org/repo',
        route: '/checkout',
      }),
    ).toThrow('boom')
  })

  it('rethrows unknown load errors from add-source, check-consistency, component-summary, and validate-graph', () => {
    vi.spyOn(RiviereBuilderRepository.prototype, 'load').mockImplementation(() => {
      throw new UnexpectedBuilderFailure('unexpected load failure')
    })

    const repo = new RiviereBuilderRepository()
    expect(() =>
      new AddSource(repo).execute({
        graphPathOption: undefined,
        repository: 'https://github.com/org/repo',
      }),
    ).toThrow('unexpected load failure')

    expect(() => new CheckConsistency(repo).execute({ graphPathOption: undefined })).toThrow(
      'unexpected load failure',
    )

    expect(() => new ComponentSummary(repo).execute({ graphPathOption: undefined })).toThrow(
      'unexpected load failure',
    )

    expect(() => new ValidateGraph(repo).execute({ graphPathOption: undefined })).toThrow(
      'unexpected load failure',
    )
  })

  it('rethrows unknown load errors from link-http', () => {
    vi.spyOn(RiviereBuilderRepository.prototype, 'load').mockImplementation(() => {
      throw new UnexpectedBuilderFailure('unexpected load failure')
    })

    expect(() =>
      new LinkHttp(new RiviereBuilderRepository()).execute({
        graphPathOption: undefined,
        httpMethod: undefined,
        linkType: undefined,
        path: '/orders',
        targetId: 'orders:core:usecase:place-order',
      }),
    ).toThrow('unexpected load failure')
  })
})
