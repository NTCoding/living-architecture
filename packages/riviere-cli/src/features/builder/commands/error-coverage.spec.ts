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
import { addComponent } from './add-component'
import { addDomain } from './add-domain'
import { addSource } from './add-source'
import { checkConsistency } from './check-consistency'
import { componentSummary } from './component-summary'
import { defineCustomType } from './define-custom-type'
import { enrichComponent } from './enrich-component'
import { linkComponents } from './link-components'
import { linkExternal } from './link-external'
import { linkHttp } from './link-http'
import { validateGraph } from './validate-graph'
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

function createLoadedBuilder(testDir: string): {
  success: true
  graphPath: string
  builder: RiviereBuilder
} {
  return {
    success: true,
    graphPath: join(testDir, '.riviere', 'graph.json'),
    builder: RiviereBuilder.new({
      domains: {
        orders: {
          description: 'Orders',
          systemType: 'domain',
        },
      },
      sources: [{ repository: 'https://github.com/org/repo' }],
    }),
  }
}

describe('builder command coverage', () => {
  const ctx: TestContext = createTestContext()
  setupCommandTest(ctx)

  afterEach(() => {
    vi.restoreAllMocks()
  })

  it('returns graph corrupted for add-source and check-consistency', async () => {
    const graphPath = await createInvalidGraphPath(ctx.testDir)

    expect(
      addSource({
        graphPathOption: graphPath,
        repository: 'https://github.com/org/repo',
      }),
    ).toMatchObject({
      code: 'GRAPH_CORRUPTED',
      success: false,
    })
    expect(checkConsistency({ graphPathOption: graphPath })).toMatchObject({
      code: 'GRAPH_CORRUPTED',
      success: false,
    })
  })

  it('returns graph corrupted for component-summary and validate-graph', async () => {
    const graphPath = await createInvalidGraphPath(ctx.testDir)

    expect(componentSummary({ graphPathOption: graphPath })).toMatchObject({
      code: 'GRAPH_CORRUPTED',
      success: false,
    })
    expect(validateGraph({ graphPathOption: graphPath })).toMatchObject({
      code: 'GRAPH_CORRUPTED',
      success: false,
    })
  })

  it('returns graph corrupted for add-domain', async () => {
    const graphPath = await createInvalidGraphPath(ctx.testDir)

    expect(
      addDomain({
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
    const loadedBuilder = createLoadedBuilder(ctx.testDir)
    vi.spyOn(RiviereBuilderRepository.prototype, 'load').mockReturnValue(loadedBuilder)
    vi.spyOn(loadedBuilder.builder, 'defineCustomType').mockImplementation(() => {
      throw new UnexpectedBuilderFailure('explode')
    })

    expect(() =>
      defineCustomType({
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
    vi.spyOn(enrichBuilder.builder, 'enrichComponent').mockImplementation(() => {
      throw new UnexpectedBuilderFailure('enrich explode')
    })
    vi.spyOn(linkBuilder.builder, 'link').mockImplementation(() => {
      throw new UnexpectedBuilderFailure('link explode')
    })
    vi.spyOn(externalBuilder.builder, 'linkExternal').mockImplementation(() => {
      throw new UnexpectedBuilderFailure('external explode')
    })

    expect(() =>
      enrichComponent({
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
      linkComponents({
        from: 'a',
        graphPathOption: undefined,
        to: 'b',
        type: undefined,
      }),
    ).toThrow('link explode')
    expect(() =>
      linkExternal({
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
      linkHttp({
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
    const loadedBuilder = createLoadedBuilder(ctx.testDir)
    vi.spyOn(RiviereBuilderRepository.prototype, 'load').mockReturnValue(loadedBuilder)
    vi.spyOn(loadedBuilder.builder, 'build').mockReturnValue({
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
      linkHttp({
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
    const loadedBuilder = createLoadedBuilder(ctx.testDir)
    vi.spyOn(RiviereBuilderRepository.prototype, 'load').mockReturnValue(loadedBuilder)
    vi.spyOn(addComponentDomain, 'addComponentToBuilder').mockImplementation(() => {
      throw new UnexpectedBuilderFailure('builder exploded')
    })

    expect(
      addComponent({
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
    const loadedBuilder = createLoadedBuilder(ctx.testDir)
    vi.spyOn(RiviereBuilderRepository.prototype, 'load').mockReturnValue(loadedBuilder)
    vi.spyOn(addComponentDomain, 'addComponentToBuilder').mockImplementation(() => {
      throw 'boom'
    })

    expect(() =>
      addComponent({
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
})
