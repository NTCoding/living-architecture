import { assert, describe, expect, it } from 'vitest'
import { collaborators } from '../__fixtures__/workflow-fixtures'
import type { AsyncApiDocument } from '../ports/load-asyncapi-document'
import {
  asyncApiBuilder,
  asyncApiImportConfig,
  orderPlacedMappings,
} from './__fixtures__/asyncapi-stage-fixtures'
import { executeAsyncApiImportStage } from './execute-asyncapi-import-stage'

const document: AsyncApiDocument = {
  messages: [{ id: 'OrderPlacedMessage', name: 'OrderPlacedMessage' }],
  operations: [
    { id: 'processOrder', action: 'send', messageIds: ['OrderPlacedMessage'], hasReply: false },
  ],
}

async function runStage(
  overrides: Parameters<typeof asyncApiImportConfig>[0] = {},
  doc: AsyncApiDocument = document,
) {
  const graphBuilder = asyncApiBuilder()
  const outcome = await executeAsyncApiImportStage(
    graphBuilder,
    asyncApiImportConfig(overrides),
    collaborators({ domains: [], services: [], events: [] }, doc),
  )
  return { graphBuilder, outcome }
}

describe('executeAsyncApiImportStage', () => {
  it('adds a mapped message as a canonical event component', async () => {
    const { graphBuilder } = await runStage({ mappings: orderPlacedMappings() })

    expect(
      graphBuilder.components().map((component) => ({
        id: component.id,
        type: component.type,
        name: component.name,
        domain: component.domain,
        module: component.module,
        eventName: component.type === 'Event' ? component.eventName : undefined,
        sourceLocation: component.sourceLocation,
      })),
    ).toContainEqual({
      id: 'orders-domain:infrastructure:event:orderplaced',
      type: 'Event',
      name: 'OrderPlaced',
      domain: 'orders-domain',
      module: 'infrastructure',
      eventName: 'OrderPlaced',
      sourceLocation: { repository: 'shop', filePath: 'specs/asyncapi.yaml' },
    })
  })

  it('adds a mapped send operation as the component type its mapping declares', async () => {
    const { graphBuilder } = await runStage({ mappings: orderPlacedMappings() })

    expect(
      graphBuilder.components().map((component) => ({ id: component.id, type: component.type })),
    ).toContainEqual({
      id: 'orders-domain:consumer/order-placed:usecase:processorder',
      type: 'UseCase',
    })
  })

  it.each(['API', 'DomainOp', 'Event', 'EventHandler'] as const)(
    'adds a send operation mapped as %s as a component of that type',
    async (type) => {
      const { graphBuilder } = await runStage({
        mappings: {
          messages: {
            OrderPlacedMessage: {
              domain: 'orders-domain',
              module: 'infrastructure',
              name: 'OrderPlaced',
            },
          },
          operations: {
            processOrder: {
              type,
              domain: 'orders-domain',
              module: 'consumer/order-placed',
              name: 'ProcessOrder',
            },
          },
        },
      })

      expect(
        graphBuilder.components().map((component) => ({ id: component.id, type: component.type })),
      ).toContainEqual({
        id: `orders-domain:consumer/order-placed:${type.toLowerCase()}:processorder`,
        type,
      })
    },
  )

  it('links a send operation component to the message component with async type', async () => {
    const { graphBuilder } = await runStage({ mappings: orderPlacedMappings() })

    expect(
      graphBuilder.links().map((link) => ({
        source: link.source,
        target: link.target,
        type: link.type,
      })),
    ).toStrictEqual([
      {
        source: 'orders-domain:consumer/order-placed:usecase:processorder',
        target: 'orders-domain:infrastructure:event:orderplaced',
        type: 'async',
      },
    ])
  })

  it('links the message component to a receive operation component with async type', async () => {
    const graphBuilder = asyncApiBuilder(['shipping-domain'])
    const outcome = await executeAsyncApiImportStage(
      graphBuilder,
      asyncApiImportConfig({
        mappings: {
          messages: {
            OrderPlacedMessage: {
              domain: 'orders-domain',
              module: 'infrastructure',
              name: 'OrderPlaced',
            },
          },
          operations: {
            handleOrderPlaced: {
              type: 'EventHandler',
              domain: 'shipping-domain',
              module: 'consumer/order-confirmed',
              name: 'HandleOrderPlaced',
            },
          },
        },
      }),
      collaborators(
        { domains: [], services: [], events: [] },
        {
          messages: [{ id: 'OrderPlacedMessage', name: 'OrderPlacedMessage' }],
          operations: [
            {
              id: 'handleOrderPlaced',
              action: 'receive',
              messageIds: ['OrderPlacedMessage'],
              hasReply: false,
            },
          ],
        },
      ),
    )

    expect(outcome.success).toBe(true)
    expect(
      graphBuilder.links().map((link) => ({
        source: link.source,
        target: link.target,
        type: link.type,
      })),
    ).toStrictEqual([
      {
        source: 'orders-domain:infrastructure:event:orderplaced',
        target: 'shipping-domain:consumer/order-confirmed:eventhandler:handleorderplaced',
        type: 'async',
      },
    ])
  })

  it('fails when an operation declares a reply', async () => {
    const outcome = await executeAsyncApiImportStage(
      asyncApiBuilder(),
      asyncApiImportConfig({ mappings: orderPlacedMappings() }),
      collaborators(
        { domains: [], services: [], events: [] },
        {
          messages: [{ id: 'OrderPlacedMessage', name: 'OrderPlacedMessage' }],
          operations: [
            {
              id: 'processOrder',
              action: 'send',
              messageIds: ['OrderPlacedMessage'],
              hasReply: true,
            },
          ],
        },
      ),
    )

    expect(outcome).toStrictEqual({
      success: false,
      errorCode: 'ASYNCAPI_IMPORT_FAILED',
      reason:
        "asyncapi request/reply pattern not supported in Phase 13 (operation: 'processOrder')",
    })
  })

  it('adds no components when an operation declares a reply', async () => {
    const graphBuilder = asyncApiBuilder()

    await executeAsyncApiImportStage(
      graphBuilder,
      asyncApiImportConfig({ mappings: orderPlacedMappings() }),
      collaborators(
        { domains: [], services: [], events: [] },
        {
          messages: [{ id: 'OrderPlacedMessage', name: 'OrderPlacedMessage' }],
          operations: [
            {
              id: 'processOrder',
              action: 'send',
              messageIds: ['OrderPlacedMessage'],
              hasReply: true,
            },
          ],
        },
      ),
    )

    expect(graphBuilder.components()).toStrictEqual([])
  })

  it('fails in strict mode when a message has no mapping', async () => {
    const outcome = await executeAsyncApiImportStage(
      asyncApiBuilder(),
      asyncApiImportConfig(),
      collaborators(
        { domains: [], services: [], events: [] },
        {
          messages: [{ id: 'OrderPlacedMessage', name: 'OrderPlacedMessage' }],
          operations: [],
        },
      ),
    )

    expect(outcome).toStrictEqual({
      success: false,
      errorCode: 'ASYNCAPI_IMPORT_FAILED',
      reason: "Unmapped AsyncAPI records: message 'OrderPlacedMessage'",
    })
  })

  it('fails in strict mode when an operation has no mapping', async () => {
    const outcome = await executeAsyncApiImportStage(
      asyncApiBuilder(),
      asyncApiImportConfig(),
      collaborators(
        { domains: [], services: [], events: [] },
        {
          messages: [],
          operations: [{ id: 'processOrder', action: 'send', messageIds: [], hasReply: false }],
        },
      ),
    )

    expect(outcome).toStrictEqual({
      success: false,
      errorCode: 'ASYNCAPI_IMPORT_FAILED',
      reason: "Unmapped AsyncAPI records: operation 'processOrder'",
    })
  })

  it('skips an unmapped message and records an unmapped-record diagnostic in lenient mode', async () => {
    const outcome = await executeAsyncApiImportStage(
      asyncApiBuilder(),
      asyncApiImportConfig({ allowUnmapped: true }),
      collaborators(
        { domains: [], services: [], events: [] },
        {
          messages: [{ id: 'OrderPlacedMessage', name: 'OrderPlacedMessage' }],
          operations: [],
        },
      ),
    )

    assert(outcome.success)
    expect(outcome.diagnostics.map((diagnostic) => diagnostic.value)).toStrictEqual([
      { kind: 'unmapped-record', recordKind: 'message', recordId: 'OrderPlacedMessage' },
    ])
  })

  it('skips an unmapped operation and records an unmapped-record diagnostic in lenient mode', async () => {
    const outcome = await executeAsyncApiImportStage(
      asyncApiBuilder(),
      asyncApiImportConfig({ allowUnmapped: true }),
      collaborators(
        { domains: [], services: [], events: [] },
        {
          messages: [],
          operations: [{ id: 'processOrder', action: 'send', messageIds: [], hasReply: false }],
        },
      ),
    )

    assert(outcome.success)
    expect(outcome.diagnostics.map((diagnostic) => diagnostic.value)).toStrictEqual([
      { kind: 'unmapped-record', recordKind: 'operation', recordId: 'processOrder' },
    ])
  })

  it('fails when a mapping references an unknown message', async () => {
    const outcome = await executeAsyncApiImportStage(
      asyncApiBuilder(),
      asyncApiImportConfig({
        mappings: {
          messages: {
            GhostMessage: { domain: 'orders-domain', module: 'infrastructure', name: 'Ghost' },
          },
          operations: {},
        },
      }),
      collaborators({ domains: [], services: [], events: [] }, { messages: [], operations: [] }),
    )

    expect(outcome).toStrictEqual({
      success: false,
      errorCode: 'ASYNCAPI_IMPORT_FAILED',
      reason: "AsyncAPI mappings reference unknown message 'GhostMessage'",
    })
  })

  it('fails when a mapping references an unknown operation', async () => {
    const outcome = await executeAsyncApiImportStage(
      asyncApiBuilder(),
      asyncApiImportConfig({
        mappings: {
          messages: {},
          operations: {
            ghostOperation: {
              type: 'UseCase',
              domain: 'orders-domain',
              module: 'checkout',
              name: 'Ghost',
            },
          },
        },
      }),
      collaborators({ domains: [], services: [], events: [] }, { messages: [], operations: [] }),
    )

    expect(outcome).toStrictEqual({
      success: false,
      errorCode: 'ASYNCAPI_IMPORT_FAILED',
      reason: "AsyncAPI mappings reference unknown operation 'ghostOperation'",
    })
  })

  it('adds no components to the graph when the stage fails', async () => {
    const graphBuilder = asyncApiBuilder()

    await executeAsyncApiImportStage(
      graphBuilder,
      asyncApiImportConfig(),
      collaborators(
        { domains: [], services: [], events: [] },
        {
          messages: [{ id: 'OrderPlacedMessage', name: 'OrderPlacedMessage' }],
          operations: [],
        },
      ),
    )

    expect(graphBuilder.components()).toStrictEqual([])
  })

  it('omits a link for an operation whose message is unmapped in lenient mode', async () => {
    const graphBuilder = asyncApiBuilder()

    const outcome = await executeAsyncApiImportStage(
      graphBuilder,
      asyncApiImportConfig({
        allowUnmapped: true,
        mappings: {
          messages: {},
          operations: {
            processOrder: {
              type: 'UseCase',
              domain: 'orders-domain',
              module: 'checkout',
              name: 'ProcessOrder',
            },
          },
        },
      }),
      collaborators({ domains: [], services: [], events: [] }, document),
    )

    expect(outcome.success).toBe(true)
    expect(graphBuilder.links()).toStrictEqual([])
  })

  it('skips a duplicate async link already present in the graph', async () => {
    const graphBuilder = asyncApiBuilder()
    const config = asyncApiImportConfig({ mappings: orderPlacedMappings() })
    const dependency = collaborators({ domains: [], services: [], events: [] }, document)

    await executeAsyncApiImportStage(graphBuilder, config, dependency)
    const rerun = await executeAsyncApiImportStage(graphBuilder, config, dependency)

    expect(rerun.success).toBe(true)
    expect(graphBuilder.links()).toHaveLength(1)
  })
})
