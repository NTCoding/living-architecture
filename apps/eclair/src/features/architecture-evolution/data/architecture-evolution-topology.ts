import type {
  EdgeDefinition, NodeDefinition 
} from './architecture-evolution-types'

export const NODE_DEFINITIONS: readonly NodeDefinition[] = [
  {
    id: 'website',
    label: 'Website',
    subtitle: 'Client app',
    icon: 'browser',
    kind: 'client',
    position: {
      x: 40,
      y: 70,
    },
    capabilities: [
      {
        id: 'website:read-orders',
        label: 'Reads orders',
      },
    ],
  },
  {
    id: 'mobile',
    label: 'Mobile App',
    subtitle: 'Client app',
    icon: 'device-mobile-camera',
    kind: 'client',
    position: {
      x: 40,
      y: 295,
    },
    capabilities: [
      {
        id: 'mobile:read-orders',
        label: 'Reads orders',
      },
    ],
  },
  {
    id: 'service-a',
    label: 'Orders Service A',
    subtitle: 'Primary service',
    icon: 'stack-simple',
    kind: 'service',
    position: {
      x: 360,
      y: 70,
    },
    capabilities: [
      {
        id: 'service-a:query',
        label: 'Query API',
      },
      {
        id: 'service-a:place-order',
        label: 'Place order API',
      },
      {
        id: 'service-a:event-sync',
        label: 'Order placed sync',
      },
    ],
  },
  {
    id: 'service-b',
    label: 'Orders Service B',
    subtitle: 'Legacy service',
    icon: 'stack-simple',
    kind: 'service',
    position: {
      x: 650,
      y: 70,
    },
    capabilities: [
      {
        id: 'service-b:query',
        label: 'Query API',
      },
      {
        id: 'service-b:place-order',
        label: 'Place order API',
      },
      {
        id: 'service-b:event-sync',
        label: 'Order placed sync',
      },
    ],
  },
  {
    id: 'service-c',
    label: 'Orders Service C',
    subtitle: 'Legacy service',
    icon: 'stack-simple',
    kind: 'service',
    position: {
      x: 940,
      y: 70,
    },
    capabilities: [
      {
        id: 'service-c:query',
        label: 'Query API',
      },
      {
        id: 'service-c:place-order',
        label: 'Place order API',
      },
      {
        id: 'service-c:event-sync',
        label: 'Order placed sync',
      },
    ],
  },
  {
    id: 'db-a',
    label: 'Orders DB A',
    subtitle: 'Database',
    icon: 'database',
    kind: 'database',
    position: {
      x: 360,
      y: 360,
    },
    capabilities: [
      {
        id: 'db-a:orders',
        label: 'Orders data',
      },
    ],
  },
  {
    id: 'db-b',
    label: 'Orders DB B',
    subtitle: 'Database',
    icon: 'database',
    kind: 'database',
    position: {
      x: 650,
      y: 360,
    },
    capabilities: [
      {
        id: 'db-b:orders',
        label: 'Orders data',
      },
    ],
  },
  {
    id: 'db-c',
    label: 'Orders DB C',
    subtitle: 'Database',
    icon: 'database',
    kind: 'database',
    position: {
      x: 940,
      y: 360,
    },
    capabilities: [
      {
        id: 'db-c:orders',
        label: 'Orders data',
      },
    ],
  },
] as const

export const EDGE_DEFINITIONS: readonly EdgeDefinition[] = [
  {
    id: 'web-a-read',
    source: 'website',
    target: 'service-a',
    label: 'Read orders',
    kind: 'query',
  },
  {
    id: 'web-b-read',
    source: 'website',
    target: 'service-b',
    label: 'Read orders',
    kind: 'query',
  },
  {
    id: 'mobile-a-read',
    source: 'mobile',
    target: 'service-a',
    label: 'Read orders',
    kind: 'query',
  },
  {
    id: 'mobile-b-read',
    source: 'mobile',
    target: 'service-b',
    label: 'Read orders',
    kind: 'query',
  },
  {
    id: 'mobile-c-read',
    source: 'mobile',
    target: 'service-c',
    label: 'Read orders',
    kind: 'query',
  },
  {
    id: 'a-db-a-write',
    source: 'service-a',
    target: 'db-a',
    label: 'Write orders',
    kind: 'write',
  },
  {
    id: 'b-db-b-write',
    source: 'service-b',
    target: 'db-b',
    label: 'Write orders',
    kind: 'write',
  },
  {
    id: 'c-db-c-write',
    source: 'service-c',
    target: 'db-c',
    label: 'Write orders',
    kind: 'write',
  },
  {
    id: 'a-db-b-write',
    source: 'service-a',
    target: 'db-b',
    label: 'Dual write',
    kind: 'write',
  },
  {
    id: 'a-db-c-write',
    source: 'service-a',
    target: 'db-c',
    label: 'Dual write',
    kind: 'write',
  },
  {
    id: 'a-b-event',
    source: 'service-a',
    target: 'service-b',
    label: 'Order placed sync',
    kind: 'event',
    bidirectional: true,
  },
  {
    id: 'a-c-event',
    source: 'service-a',
    target: 'service-c',
    label: 'Order placed sync',
    kind: 'event',
    bidirectional: true,
  },
  {
    id: 'b-c-event',
    source: 'service-b',
    target: 'service-c',
    label: 'Order placed sync',
    kind: 'event',
    bidirectional: true,
  },
] as const
