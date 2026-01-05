import { RiviereQuery } from './RiviereQuery'
import {
  createMinimalValidGraph,
  createEventComponent,
  createEventHandlerComponent,
} from './riviere-graph-fixtures'

describe('publishedEvents', () => {
  it('returns empty array when no Event components exist', () => {
    const graph = createMinimalValidGraph()
    const query = new RiviereQuery(graph)

    const events = query.publishedEvents()

    expect(events).toEqual([])
  })

  it('returns event with handlers that subscribe to it', () => {
    const graph = createMinimalValidGraph()
    graph.components.push(
      createEventComponent({
        id: 'orders:events:OrderCreated',
        name: 'Order Created Event',
        domain: 'orders',
        eventName: 'OrderCreated',
      }),
      createEventHandlerComponent({
        id: 'shipping:handlers:OnOrderCreated',
        name: 'On Order Created',
        domain: 'shipping',
        subscribedEvents: ['OrderCreated'],
      }),
    )
    const query = new RiviereQuery(graph)

    const events = query.publishedEvents()

    expect(events).toEqual([
      {
        id: 'orders:events:OrderCreated',
        eventName: 'OrderCreated',
        domain: 'orders',
        handlers: [
          {
            handlerId: 'shipping:handlers:OnOrderCreated',
            handlerName: 'On Order Created',
            domain: 'shipping',
          },
        ],
      },
    ])
  })

  it('filters events by domain when domainName provided', () => {
    const graph = createMinimalValidGraph()
    graph.metadata.domains['orders'] = {
      description: 'Orders',
      systemType: 'domain',
    }
    graph.metadata.domains['billing'] = {
      description: 'Billing',
      systemType: 'domain',
    }
    graph.components.push(
      createEventComponent({
        id: 'orders:events:OrderCreated',
        name: 'Order Created Event',
        domain: 'orders',
        eventName: 'OrderCreated',
      }),
      createEventComponent({
        id: 'billing:events:InvoiceSent',
        name: 'Invoice Sent Event',
        domain: 'billing',
        eventName: 'InvoiceSent',
      }),
    )
    const query = new RiviereQuery(graph)

    const events = query.publishedEvents('orders')

    expect(events).toEqual([
      {
        id: 'orders:events:OrderCreated',
        eventName: 'OrderCreated',
        domain: 'orders',
        handlers: [],
      },
    ])
  })
})

describe('eventHandlers', () => {
  it('returns empty array when no EventHandler components exist', () => {
    const graph = createMinimalValidGraph()
    const query = new RiviereQuery(graph)

    const handlers = query.eventHandlers()

    expect(handlers).toEqual([])
  })

  it('returns handler with subscribedEventsWithDomain including source domain', () => {
    const graph = createMinimalValidGraph()
    graph.metadata.domains['orders'] = {
      description: 'Orders',
      systemType: 'domain',
    }
    graph.metadata.domains['shipping'] = {
      description: 'Shipping',
      systemType: 'domain',
    }
    graph.components.push(
      createEventComponent({
        id: 'orders:events:OrderCreated',
        name: 'Order Created Event',
        domain: 'orders',
        eventName: 'OrderCreated',
      }),
      createEventHandlerComponent({
        id: 'shipping:handlers:OnOrderCreated',
        name: 'On Order Created',
        domain: 'shipping',
        subscribedEvents: ['OrderCreated'],
      }),
    )
    const query = new RiviereQuery(graph)

    const handlers = query.eventHandlers()

    expect(handlers).toEqual([
      {
        id: 'shipping:handlers:OnOrderCreated',
        handlerName: 'On Order Created',
        domain: 'shipping',
        subscribedEvents: ['OrderCreated'],
        subscribedEventsWithDomain: [
          {
            eventName: 'OrderCreated',
            sourceDomain: 'orders',
            sourceKnown: true,
          },
        ],
      },
    ])
  })

  it('returns sourceKnown false when event not found in graph', () => {
    const graph = createMinimalValidGraph()
    graph.metadata.domains['shipping'] = {
      description: 'Shipping',
      systemType: 'domain',
    }
    graph.components.push(
      createEventHandlerComponent({
        id: 'shipping:handlers:OnUnknownEvent',
        name: 'On Unknown Event',
        domain: 'shipping',
        subscribedEvents: ['UnknownEvent'],
      }),
    )
    const query = new RiviereQuery(graph)

    const handlers = query.eventHandlers()

    expect(handlers).toEqual([
      {
        id: 'shipping:handlers:OnUnknownEvent',
        handlerName: 'On Unknown Event',
        domain: 'shipping',
        subscribedEvents: ['UnknownEvent'],
        subscribedEventsWithDomain: [
          {
            eventName: 'UnknownEvent',
            sourceKnown: false,
          },
        ],
      },
    ])
  })

  it('filters handlers by eventName when provided', () => {
    const graph = createMinimalValidGraph()
    graph.metadata.domains['orders'] = {
      description: 'Orders',
      systemType: 'domain',
    }
    graph.metadata.domains['shipping'] = {
      description: 'Shipping',
      systemType: 'domain',
    }
    graph.metadata.domains['billing'] = {
      description: 'Billing',
      systemType: 'domain',
    }
    graph.components.push(
      createEventComponent({
        id: 'orders:events:OrderCreated',
        name: 'Order Created Event',
        domain: 'orders',
        eventName: 'OrderCreated',
      }),
      createEventHandlerComponent({
        id: 'shipping:handlers:OnOrderCreated',
        name: 'On Order Created',
        domain: 'shipping',
        subscribedEvents: ['OrderCreated'],
      }),
      createEventHandlerComponent({
        id: 'billing:handlers:OnPaymentReceived',
        name: 'On Payment Received',
        domain: 'billing',
        subscribedEvents: ['PaymentReceived'],
      }),
    )
    const query = new RiviereQuery(graph)

    const handlers = query.eventHandlers('OrderCreated')

    expect(handlers).toEqual([
      {
        id: 'shipping:handlers:OnOrderCreated',
        handlerName: 'On Order Created',
        domain: 'shipping',
        subscribedEvents: ['OrderCreated'],
        subscribedEventsWithDomain: [
          {
            eventName: 'OrderCreated',
            sourceDomain: 'orders',
            sourceKnown: true,
          },
        ],
      },
    ])
  })
})
