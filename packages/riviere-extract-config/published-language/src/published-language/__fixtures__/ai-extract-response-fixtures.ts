export function uiComponentDraft(overrides: Record<string, unknown> = {}) {
  return {
    type: 'UI',
    name: 'OrdersPage',
    domain: 'orders',
    module: 'ordering-ui',
    sourceLocation: { repository: 'ecommerce', filePath: 'src/orders/orders-page.tsx' },
    route: '/orders',
    ...overrides,
  }
}

export function apiComponentDraft(overrides: Record<string, unknown> = {}) {
  return {
    type: 'API',
    name: 'OrdersResource',
    domain: 'orders',
    module: 'orders-api',
    sourceLocation: { repository: 'ecommerce', filePath: 'src/orders/orders-resource.ts' },
    apiType: 'REST',
    httpMethod: 'POST',
    path: '/orders',
    operationName: 'createOrder',
    ...overrides,
  }
}

export function useCaseComponentDraft(overrides: Record<string, unknown> = {}) {
  return {
    type: 'UseCase',
    name: 'PlaceOrder',
    domain: 'orders',
    module: 'ordering',
    sourceLocation: { repository: 'ecommerce', filePath: 'src/orders/place-order.ts' },
    ...overrides,
  }
}

export function domainOpComponentDraft(overrides: Record<string, unknown> = {}) {
  return {
    type: 'DomainOp',
    name: 'ReserveStock',
    domain: 'inventory',
    module: 'stock',
    sourceLocation: { repository: 'ecommerce', filePath: 'src/inventory/reserve-stock.ts' },
    operationName: 'reserveStock',
    entity: 'Stock',
    businessRules: ['stock must remain non-negative'],
    ...overrides,
  }
}

export function eventComponentDraft(overrides: Record<string, unknown> = {}) {
  return {
    type: 'Event',
    name: 'OrderPlaced',
    domain: 'orders',
    module: 'ordering',
    sourceLocation: { repository: 'ecommerce', filePath: 'src/orders/place-order.ts' },
    eventName: 'order-placed',
    ...overrides,
  }
}

export function eventHandlerComponentDraft(overrides: Record<string, unknown> = {}) {
  return {
    type: 'EventHandler',
    name: 'OrderPlacedHandler',
    domain: 'notifications',
    module: 'notifications',
    sourceLocation: {
      repository: 'ecommerce',
      filePath: 'src/notifications/order-placed-handler.ts',
    },
    subscribedEvents: ['order-placed'],
    ...overrides,
  }
}

export function customComponentDraft(overrides: Record<string, unknown> = {}) {
  return {
    type: 'Custom',
    name: 'Ledger',
    domain: 'payments',
    module: 'ledger',
    sourceLocation: { repository: 'ecommerce', filePath: 'src/payments/ledger.ts' },
    customTypeName: 'ledger',
    ...overrides,
  }
}

export function internalLinkEntry(overrides: Record<string, unknown> = {}) {
  return {
    source: 'orders:ordering:UseCase:place-order',
    target: 'orders:ordering:Event:order-placed',
    type: 'sync',
    sourceLocation: { repository: 'ecommerce', filePath: 'src/orders/place-order.ts' },
    ...overrides,
  }
}

export function aiExtractResponse(components: readonly unknown[], links: readonly unknown[] = []) {
  return { components, links }
}
