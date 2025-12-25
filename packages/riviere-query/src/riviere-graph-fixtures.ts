import type {
  RiviereGraph,
  APIComponent,
  EventComponent,
  EventHandlerComponent,
  CustomComponent,
  UseCaseComponent,
  DomainOpComponent,
  SourceLocation,
} from '@living-architecture/riviere-schema'

export const defaultSourceLocation: SourceLocation = { repository: 'test-repo', filePath: 'test.ts' }

export function createMinimalValidGraph(): RiviereGraph {
  return {
    version: '1.0',
    metadata: {
      domains: { test: { description: 'Test domain', systemType: 'domain' } },
    },
    components: [
      {
        id: 'test:mod:ui:page',
        type: 'UI',
        name: 'Test Page',
        domain: 'test',
        module: 'mod',
        route: '/test',
        sourceLocation: defaultSourceLocation,
      },
    ],
    links: [],
  }
}

export function createAPIComponent(
  overrides: Partial<APIComponent> & { id: string; name: string; domain: string },
): APIComponent {
  return {
    type: 'API',
    module: 'mod',
    apiType: 'REST',
    httpMethod: 'GET',
    path: '/test',
    sourceLocation: defaultSourceLocation,
    ...overrides,
  }
}

export function createEventComponent(
  overrides: Partial<EventComponent> & { id: string; name: string; domain: string; eventName: string },
): EventComponent {
  return {
    type: 'Event',
    module: 'mod',
    sourceLocation: defaultSourceLocation,
    ...overrides,
  }
}

export function createEventHandlerComponent(
  overrides: Partial<EventHandlerComponent> & { id: string; name: string; domain: string },
): EventHandlerComponent {
  return {
    type: 'EventHandler',
    module: 'mod',
    subscribedEvents: ['TestEvent'],
    sourceLocation: defaultSourceLocation,
    ...overrides,
  }
}

export function createCustomComponent(
  overrides: Partial<CustomComponent> & { id: string; name: string; domain: string; customTypeName: string },
): CustomComponent {
  return {
    type: 'Custom',
    module: 'mod',
    sourceLocation: defaultSourceLocation,
    ...overrides,
  }
}

export function createUseCaseComponent(
  overrides: Partial<UseCaseComponent> & { id: string; name: string; domain: string },
): UseCaseComponent {
  return {
    type: 'UseCase',
    module: 'mod',
    sourceLocation: defaultSourceLocation,
    ...overrides,
  }
}

export function createDomainOpComponent(
  overrides: Partial<DomainOpComponent> & { id: string; name: string; domain: string; operationName: string },
): DomainOpComponent {
  return {
    type: 'DomainOp',
    module: 'mod',
    sourceLocation: defaultSourceLocation,
    ...overrides,
  }
}
