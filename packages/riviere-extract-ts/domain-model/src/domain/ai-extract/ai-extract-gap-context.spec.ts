import { describe, expect, it } from 'vitest'
import { RiviereBuilder } from '@living-architecture/riviere-builder-published-language'
import { WorkflowDiagnostic } from '../workflow-diagnostic'
import { aiExtractGapContext } from './ai-extract-gap-context'

function buildContext() {
  const subject = RiviereBuilder.parse({
    name: 'Shop',
    sources: [{ repository: 'shop' }],
    domains: { orders: { description: 'Orders', systemType: 'domain' } },
  })
  subject.upsertEvent({
    name: 'OrderPlaced',
    domain: 'orders',
    module: 'ordering',
    eventName: 'order-placed',
    sourceLocation: { repository: 'shop', filePath: 'src/orders/order.ts' },
  })
  subject.upsertEvent({
    name: 'PaymentCaptured',
    domain: 'orders',
    module: 'ordering',
    eventName: 'payment-captured',
    sourceLocation: { repository: 'shop', filePath: 'src/orders/payment.ts' },
  })
  subject.upsertEventHandler({
    name: 'HandlePayment',
    domain: 'orders',
    module: 'ordering',
    subscribedEvents: ['payment-captured'],
    sourceLocation: { repository: 'shop', filePath: 'src/orders/handler.ts' },
  })
  subject.upsertUseCase({
    name: 'PlaceOrder',
    domain: 'orders',
    module: 'ordering',
    sourceLocation: { repository: 'shop', filePath: 'src/orders/place-order.ts' },
  })
  const handler = subject
    .components()
    .find((component) => component.type === 'EventHandler' && component.name === 'HandlePayment')
  const captured = subject
    .components()
    .find((component) => component.type === 'Event' && component.name === 'PaymentCaptured')
  class MissingComponentError extends Error {}
  if (handler === undefined || captured === undefined)
    throw new MissingComponentError('missing component')
  subject.upsertLink({
    from: captured.id,
    to: handler.id,
    type: 'async',
    sourceLocation: { repository: 'shop', filePath: 'src/orders/handler.ts' },
  })

  const context = aiExtractGapContext(subject.components(), subject.links(), [
    WorkflowDiagnostic.fromUncertainLink({
      source: 'orders:ordering:Api:place',
      target: 'orders:ordering:UseCase:place-order',
    }),
  ])
  return context
}

describe('aiExtractGapContext', () => {
  it('collects existing component and use-case identifiers', () => {
    const context = buildContext()
    expect(context.existingComponentIds).toContain('orders:ordering:event:orderplaced')
    expect(context.existingEventIds).toContain('orders:ordering:event:orderplaced')
    expect(context.existingEventIds).toContain('orders:ordering:event:paymentcaptured')
    expect(context.existingUseCaseIds).toContain('orders:ordering:usecase:placeorder')
  })

  it('collects events without handlers, links, and uncertain links', () => {
    const context = buildContext()
    expect(context.eventsWithoutHandler).toStrictEqual([
      { componentId: 'orders:ordering:event:orderplaced', eventName: 'order-placed' },
    ])
    expect(context.existingLinks).toStrictEqual([
      {
        source: 'orders:ordering:event:paymentcaptured',
        target: 'orders:ordering:eventhandler:handlepayment',
      },
    ])
    expect(context.uncertainLinks).toHaveLength(1)
  })

  it('filters uncertain-link diagnostics only', () => {
    const context = aiExtractGapContext(
      [],
      [],
      [
        WorkflowDiagnostic.fromMissingField('orders:ordering:Api:place', 'path'),
        WorkflowDiagnostic.fromUnmappedRecord('operation', 'orders:ordering:DomainOp:ship'),
      ],
    )

    expect(context.uncertainLinks).toStrictEqual([])
  })
})
