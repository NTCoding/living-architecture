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
import { linkComponents } from './link-components'
import { linkExternal } from './link-external'
import { RiviereBuilderRepository } from '../infra/persistence/riviere-builder-repository'

async function createInvalidGraph(testDir: string): Promise<string> {
  const graphDir = join(testDir, '.riviere')
  await mkdir(graphDir, { recursive: true })
  const graphPath = join(graphDir, 'graph.json')
  await writeFile(graphPath, '{invalid', 'utf-8')
  return graphPath
}

function createBuilder(testDir: string): {
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
    const loaded = createBuilder(ctx.testDir)
    loaded.builder.defineCustomType({ name: 'Queue' })
    vi.spyOn(RiviereBuilderRepository.prototype, 'load').mockReturnValue(loaded)

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
    const loaded = createBuilder(ctx.testDir)
    const enrichSpy = vi
      .spyOn(loaded.builder, 'enrichComponent')
      .mockImplementation(() => undefined)
    vi.spyOn(RiviereBuilderRepository.prototype, 'load').mockReturnValue(loaded)

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
    const loaded = createBuilder(ctx.testDir)
    const enrichSpy = vi
      .spyOn(loaded.builder, 'enrichComponent')
      .mockImplementation(() => undefined)
    vi.spyOn(RiviereBuilderRepository.prototype, 'load').mockReturnValue(loaded)

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
})
