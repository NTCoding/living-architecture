import {
  mkdir, writeFile 
} from 'node:fs/promises'
import { join } from 'node:path'
import {
  describe, expect, it, vi 
} from 'vitest'
import { RiviereBuilder } from '@living-architecture/riviere-builder'
import {
  type TestContext,
  createTestContext,
  setupCommandTest,
} from '../../../platform/__fixtures__/command-test-fixtures'
import { componentChecklist } from './component-checklist'
import { defineCustomType } from './define-custom-type'
import { enrichComponent } from './enrich-component'
import { finalizeGraph } from './finalize-graph'
import { initGraph } from './init-graph'
import { linkComponents } from './link-components'
import { linkExternal } from './link-external'
import { RiviereBuilderRepository } from '../infra/persistence/riviere-builder-repository'

class UnexpectedError extends Error {
  constructor(message: string) {
    super(message)
    this.name = 'UnexpectedError'
  }
}

async function createInvalidGraph(testDir: string): Promise<string> {
  const graphDir = join(testDir, '.riviere')
  await mkdir(graphDir, { recursive: true })
  const graphPath = join(graphDir, 'graph.json')
  await writeFile(graphPath, '{invalid', 'utf-8')
  return graphPath
}

function createBuilder(testDir: string): RiviereBuilder {
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

describe('additional builder command coverage', () => {
  const ctx: TestContext = createTestContext()
  setupCommandTest(ctx)

  it('returns graph corrupted for checklist, finalize, link components, and link external', async () => {
    const graphPath = await createInvalidGraph(ctx.testDir)

    expect(
      componentChecklist({
        graphPathOption: graphPath,
        type: undefined,
      }),
    ).toMatchObject({ code: 'GRAPH_CORRUPTED' })
    expect(finalizeGraph({ graphPathOption: graphPath })).toMatchObject({ code: 'GRAPH_CORRUPTED' })
    expect(
      linkComponents({
        from: 'a',
        graphPathOption: graphPath,
        to: 'b',
        type: undefined,
      }),
    ).toMatchObject({ code: 'GRAPH_CORRUPTED' })
    expect(
      linkExternal({
        from: 'a',
        graphPathOption: graphPath,
        target: { name: 'Stripe' },
        type: undefined,
      }),
    ).toMatchObject({ code: 'GRAPH_CORRUPTED' })
  })

  it('returns duplicate custom type validation error', () => {
    const builder = createBuilder(ctx.testDir)
    builder.defineCustomType({ name: 'Queue' })
    vi.spyOn(RiviereBuilderRepository.prototype, 'load').mockReturnValue(builder)

    expect(
      defineCustomType({
        description: undefined,
        graphPathOption: undefined,
        name: 'Queue',
        optionalProperties: {},
        requiredProperties: {},
      }),
    ).toMatchObject({
      code: 'VALIDATION_ERROR',
      success: false,
    })
  })

  it('returns graph not found for define-custom-type and enrich-component', () => {
    const missingGraphPath = join(ctx.testDir, 'missing.json')

    expect(
      defineCustomType({
        description: undefined,
        graphPathOption: missingGraphPath,
        name: 'Queue',
        optionalProperties: {},
        requiredProperties: {},
      }),
    ).toMatchObject({
      code: 'GRAPH_NOT_FOUND',
      success: false,
    })

    expect(
      enrichComponent({
        businessRules: [],
        entity: undefined,
        emits: [],
        graphPathOption: missingGraphPath,
        id: 'orders:checkout:domainop:place-order',
        modifies: [],
        reads: [],
        signature: undefined,
        stateChanges: [],
        validates: [],
      }),
    ).toMatchObject({
      code: 'GRAPH_NOT_FOUND',
      success: false,
    })
  })

  it('includes reads in enrichment behavior', () => {
    const builder = createBuilder(ctx.testDir)
    const enrichSpy = vi.spyOn(builder, 'enrichComponent').mockImplementation(() => undefined)
    vi.spyOn(RiviereBuilderRepository.prototype, 'load').mockReturnValue(builder)

    enrichComponent({
      businessRules: [],
      entity: undefined,
      emits: [],
      graphPathOption: undefined,
      id: 'orders:checkout:domainop:place-order',
      modifies: [],
      reads: ['order.items'],
      signature: undefined,
      stateChanges: [],
      validates: [],
    })

    expect(enrichSpy).toHaveBeenCalledWith('orders:checkout:domainop:place-order', {behavior: { reads: ['order.items'] },})
  })

  it('includes validates in enrichment behavior', () => {
    const builder = createBuilder(ctx.testDir)
    const enrichSpy = vi.spyOn(builder, 'enrichComponent').mockImplementation(() => undefined)
    vi.spyOn(RiviereBuilderRepository.prototype, 'load').mockReturnValue(builder)

    enrichComponent({
      businessRules: [],
      entity: undefined,
      emits: [],
      graphPathOption: undefined,
      id: 'orders:checkout:domainop:place-order',
      modifies: [],
      reads: [],
      signature: undefined,
      stateChanges: [],
      validates: ['order.total'],
    })

    expect(enrichSpy).toHaveBeenCalledWith('orders:checkout:domainop:place-order', {behavior: { validates: ['order.total'] },})
  })

  it('returns graph corrupted for define-custom-type and enrich-component', async () => {
    const graphPath = await createInvalidGraph(ctx.testDir)

    expect(
      defineCustomType({
        description: undefined,
        graphPathOption: graphPath,
        name: 'Queue',
        optionalProperties: {},
        requiredProperties: {},
      }),
    ).toMatchObject({
      code: 'GRAPH_CORRUPTED',
      success: false,
    })

    expect(
      enrichComponent({
        businessRules: [],
        entity: undefined,
        emits: [],
        graphPathOption: graphPath,
        id: 'orders:checkout:domainop:place-order',
        modifies: [],
        reads: [],
        signature: undefined,
        stateChanges: [],
        validates: [],
      }),
    ).toMatchObject({
      code: 'GRAPH_CORRUPTED',
      success: false,
    })
  })

  it('rethrows unknown errors from component-checklist, finalize-graph, and init-graph', () => {
    vi.spyOn(RiviereBuilderRepository.prototype, 'load').mockImplementation(() => {
      throw new UnexpectedError('unexpected')
    })

    expect(() =>
      componentChecklist({
        graphPathOption: undefined,
        type: undefined,
      }),
    ).toThrow('unexpected')

    expect(() => finalizeGraph({ graphPathOption: undefined })).toThrow('unexpected')

    expect(() =>
      initGraph({
        domains: [
          {
            description: 'Orders',
            name: 'orders',
            systemType: 'domain',
          },
        ],
        graphPathOption: undefined,
        name: undefined,
        sources: ['https://github.com/org/repo'],
      }),
    ).toThrow('unexpected')
  })
})
