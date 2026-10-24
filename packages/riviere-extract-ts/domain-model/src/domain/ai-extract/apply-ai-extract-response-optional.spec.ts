import { describe, expect, it } from 'vitest'
import type {
  AiExtractConfig,
  AiExtractResponse,
} from '@living-architecture/riviere-extract-config-published-language'
import { RiviereBuilder } from '@living-architecture/riviere-builder-published-language'
import type { RiviereGraph } from '@living-architecture/riviere-schema-published-language'
import { applyAiExtractResponse } from './apply-ai-extract-response'

function builder() {
  return RiviereBuilder.parse({
    name: 'Shop',
    sources: [{ repository: 'shop' }],
    domains: { orders: { description: 'Orders', systemType: 'domain' } },
  })
}

function config(overrides: Partial<AiExtractConfig> = {}): AiExtractConfig {
  return {
    command: 'claude',
    args: [],
    timeoutSeconds: 60,
    sources: ['src/**/*.ts'],
    selection: {
      from: ['missing-events'],
      componentTypes: ['Event', 'UseCase', 'DomainOp', 'API', 'UI', 'EventHandler', 'Custom'],
    },
    outputs: { addComponents: true, addLinks: true },
    context: { exclude: [], maxFilesPerBatch: 10, maxBatches: 2 },
    ...overrides,
  }
}

function response(overrides: Partial<AiExtractResponse> = {}): AiExtractResponse {
  return { components: [], links: [], ...overrides }
}

const sourceLocation = { repository: 'ai-repo', filePath: 'src/orders/checkout.ts' }

describe('applyAiExtractResponse optional fields', () => {
  it('adds minimal drafts without optional fields', () => {
    const subject = builder()
    const result = applyAiExtractResponse(
      subject,
      response({
        components: [
          {
            type: 'API',
            name: 'MinimalApi',
            domain: 'orders',
            module: 'ordering',
            apiType: 'REST',
            sourceLocation,
          },
          {
            type: 'DomainOp',
            name: 'MinimalOp',
            domain: 'orders',
            module: 'ordering',
            operationName: 'minimal',
            signature: {},
            behavior: {},
            stateChanges: [{ from: 'a', to: 'b' }],
            sourceLocation,
          },
          {
            type: 'Event',
            name: 'MinimalEvent',
            domain: 'orders',
            module: 'ordering',
            eventName: 'minimal-event',
            sourceLocation,
          },
        ],
      }),
      { repositoryName: 'shop', config: config(), suppressedComponentIds: [] },
    )

    expect(result).toStrictEqual({ success: true, warnings: [] })
    const minimalApiComponent = subject.components().find((item) => item.name === 'MinimalApi')
    const minimalApi = minimalApiComponent?.type === 'API' ? minimalApiComponent : undefined
    const minimalOpComponent = subject.components().find((item) => item.name === 'MinimalOp')
    const minimalOp = minimalOpComponent?.type === 'DomainOp' ? minimalOpComponent : undefined
    const minimalEventComponent = subject.components().find((item) => item.name === 'MinimalEvent')
    const minimalEvent = minimalEventComponent?.type === 'Event' ? minimalEventComponent : undefined
    expect(Object.keys(minimalApi ?? {})).toStrictEqual(
      expect.not.arrayContaining(['httpMethod', 'path', 'operationName']),
    )
    expect(Object.keys(minimalOp ?? {})).toStrictEqual(
      expect.not.arrayContaining([
        'entity',
        'signature',
        'behavior',
        'stateChanges',
        'businessRules',
      ]),
    )
    expect(Object.keys(minimalEvent ?? {})).toStrictEqual(
      expect.not.arrayContaining(['eventSchema']),
    )
  })
})

it('covers absent optional branches', () => {
  const subject = builder()
  const result = applyAiExtractResponse(
    subject,
    response({
      components: [
        {
          type: 'DomainOp',
          name: 'BareOp',
          domain: 'orders',
          module: 'ordering',
          operationName: 'bare',
          sourceLocation,
        },
        {
          type: 'DomainOp',
          name: 'PartialOp',
          domain: 'orders',
          module: 'ordering',
          operationName: 'partial',
          signature: { parameters: [{ name: 'x', type: 'string' }] },
          behavior: { reads: ['Order'] },
          sourceLocation,
        },
        {
          type: 'Event',
          name: 'SchemaEvent',
          domain: 'orders',
          module: 'ordering',
          eventName: 'schema-event',
          eventSchema: 'OrderSchema',
          sourceLocation,
        },
      ],
    }),
    { repositoryName: 'shop', config: config(), suppressedComponentIds: [] },
  )

  expect(result).toStrictEqual({ success: true, warnings: [] })
  const bareOpComponent = subject.components().find((item) => item.name === 'BareOp')
  const bareOp = bareOpComponent?.type === 'DomainOp' ? bareOpComponent : undefined
  const partialOpComponent = subject.components().find((item) => item.name === 'PartialOp')
  const partialOp = partialOpComponent?.type === 'DomainOp' ? partialOpComponent : undefined
  const schemaEventComponent = subject.components().find((item) => item.name === 'SchemaEvent')
  const schemaEvent = schemaEventComponent?.type === 'Event' ? schemaEventComponent : undefined
  expect(Object.keys(bareOp ?? {})).toStrictEqual(
    expect.not.arrayContaining([
      'entity',
      'signature',
      'behavior',
      'stateChanges',
      'businessRules',
    ]),
  )
  expect(partialOp).toStrictEqual(
    expect.objectContaining({
      signature: { parameters: expect.any(Array) },
      behavior: { reads: ['Order'] },
    }),
  )
  expect(schemaEvent?.eventSchema).toBe('OrderSchema')
})

describe('applyAiExtractResponse custom type', () => {
  it('adds a custom draft when the custom type is declared', () => {
    const graph: RiviereGraph = {
      version: '1.0',
      metadata: {
        sources: [{ repository: 'shop' }],
        domains: { orders: { description: 'Orders', systemType: 'domain' } },
        customTypes: { Queue: {} },
      },
      components: [],
      links: [],
    }
    const subject = RiviereBuilder.fromGraph(graph)
    const result = applyAiExtractResponse(
      subject,
      response({
        components: [
          {
            type: 'Custom',
            name: 'OrderQueue',
            domain: 'orders',
            module: 'ordering',
            customTypeName: 'Queue',
            sourceLocation,
          },
        ],
      }),
      { repositoryName: 'shop', config: config(), suppressedComponentIds: [] },
    )

    expect(result).toStrictEqual({ success: true, warnings: [] })
    expect(subject.components().some((item) => item.type === 'Custom')).toBe(true)
  })
})
