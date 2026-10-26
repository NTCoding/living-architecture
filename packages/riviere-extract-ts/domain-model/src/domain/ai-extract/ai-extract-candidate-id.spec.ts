import { assert, describe, expect, it } from 'vitest'
import { ComponentType } from '@living-architecture/riviere-builder-published-language'
import type { AiExtractComponentDraft } from '@living-architecture/riviere-extract-config-published-language'
import { AiExtractCandidateId } from './ai-extract-candidate-id'

const drafts: readonly AiExtractComponentDraft[] = [
  { type: 'UI', name: 'Checkout', domain: 'orders', module: 'ordering', route: '/checkout' },
  { type: 'API', name: 'PlaceOrder', domain: 'orders', module: 'ordering', apiType: 'REST' },
  { type: 'UseCase', name: 'PlaceOrder', domain: 'orders', module: 'ordering' },
  {
    type: 'DomainOp',
    name: 'PlaceOrder',
    domain: 'orders',
    module: 'ordering',
    operationName: 'place',
  },
  {
    type: 'Event',
    name: 'OrderPlaced',
    domain: 'orders',
    module: 'ordering',
    eventName: 'order-placed',
  },
  {
    type: 'EventHandler',
    name: 'OrderPlacedHandler',
    domain: 'orders',
    module: 'ordering',
    subscribedEvents: ['order-placed'],
  },
  { type: 'Custom', name: 'Queue', domain: 'orders', module: 'ordering', customTypeName: 'Queue' },
]

describe('AiExtractCandidateId', () => {
  it('derives the component slug from the published ComponentType identity rule', () => {
    for (const draft of drafts) {
      const parsed = ComponentType.parse(draft.type)
      assert(parsed.success)
      expect(AiExtractCandidateId.fromDraft(draft).toString().split(':')[2]).toStrictEqual(
        parsed.data.componentIdValue,
      )
    }
  })

  it('builds a candidate id from an Event draft', () => {
    expect(
      AiExtractCandidateId.fromDraft({
        type: 'Event',
        name: 'OrderPlaced',
        domain: 'orders',
        module: 'ordering',
        eventName: 'order-placed',
      }).toString(),
    ).toStrictEqual('orders:ordering:event:orderplaced')
  })

  it('normalizes the candidate name', () => {
    expect(
      AiExtractCandidateId.fromParts({
        domain: 'orders',
        module: 'ordering',
        type: 'Event',
        name: 'Cancel Order',
      }).toString(),
    ).toStrictEqual('orders:ordering:event:cancel-order')
  })
})
