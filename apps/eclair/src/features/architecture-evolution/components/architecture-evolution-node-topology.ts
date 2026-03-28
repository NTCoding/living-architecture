import type { NodeDefinition } from './architecture-evolution-types'

export const NODE_DEFINITIONS: readonly NodeDefinition[] = [
  {
    id: 'website',
    label: 'Website',
    subtitle: 'Client app',
    icon: 'browser',
    kind: 'client',
    position: {
      x: 320,
      y: 24,
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
      x: 840,
      y: 24,
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
      x: 200,
      y: 260,
    },
    capabilities: [
      {
        id: 'service-a:query',
        label: 'GET /orders',
      },
      {
        id: 'service-a:place-order',
        label: 'POST /orders',
      },
      {
        id: 'service-a:event-sync',
        label: 'Publishes OrderPlaced',
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
      x: 620,
      y: 260,
    },
    capabilities: [
      {
        id: 'service-b:query',
        label: 'GET /orders',
      },
      {
        id: 'service-b:place-order',
        label: 'POST /orders',
      },
      {
        id: 'service-b:event-sync',
        label: 'Consumes OrderPlaced',
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
      x: 1040,
      y: 260,
    },
    capabilities: [
      {
        id: 'service-c:query',
        label: 'GET /orders',
      },
      {
        id: 'service-c:place-order',
        label: 'POST /orders',
      },
      {
        id: 'service-c:event-sync',
        label: 'Consumes OrderPlaced',
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
      x: 200,
      y: 560,
    },
    capabilities: [
      {
        id: 'db-a:orders',
        label: 'Orders table',
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
      x: 620,
      y: 560,
    },
    capabilities: [
      {
        id: 'db-b:orders',
        label: 'Orders table',
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
      x: 1040,
      y: 560,
    },
    capabilities: [
      {
        id: 'db-c:orders',
        label: 'Orders table',
      },
    ],
  },
] as const
