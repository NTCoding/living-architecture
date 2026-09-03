import { render } from '@testing-library/react'
import { MemoryRouter } from 'react-router-dom'
import { vi } from 'vitest'
import type { RiviereGraph } from '@living-architecture/riviere-schema-published-language/schema'
import { ExportProvider } from '@/platform/infra/export/ExportContext'
import type { SimulationNode, TooltipData } from '@/platform/infra/graph/graph-types'
import {
  parseDomainKey,
  parseEdge,
  parseNode,
} from '@/platform/infra/__fixtures__/riviere-test-fixtures'
import { FullGraphPage } from './FullGraphPage'

const testSourceLocation = {
  repository: 'test-repo',
  filePath: 'src/test.ts',
}

interface CapturedCallbacks {
  capturedOnNodeHover: { current: ((data: TooltipData | null) => void) | undefined }
  capturedOnBackgroundClick: { current: (() => void) | undefined }
  capturedGraph: { current: RiviereGraph | undefined }
}

const {
  capturedOnNodeHover,
  capturedOnBackgroundClick,
  capturedGraph,
} = vi.hoisted(
  (): CapturedCallbacks => ({
    capturedOnNodeHover: { current: undefined },
    capturedOnBackgroundClick: { current: undefined },
    capturedGraph: { current: undefined },
  }),
)

vi.mock('@/platform/infra/theme/ThemeContext', () => ({
  useTheme: () => ({
    theme: 'stream',
    setTheme: vi.fn(),
  }),
}))

vi.mock('@/platform/infra/graph/ForceGraph/ForceGraph', () => ({
  ForceGraph: (props: {
    graph: RiviereGraph
    onNodeHover?: (data: TooltipData | null) => void
    onBackgroundClick?: () => void
    highlightedNodeId?: string | null
    focusedDomain?: string | null
  }) => {
    capturedGraph.current = props.graph
    capturedOnNodeHover.current = props.onNodeHover
    capturedOnBackgroundClick.current = props.onBackgroundClick
    return (
      <div
        data-testid="force-graph-container"
        data-highlighted-node={props.highlightedNodeId}
        data-focused-domain={props.focusedDomain}
      />
    )
  },
}))

const mockGraph: RiviereGraph = {
  version: '1.0',
  metadata: {
    name: 'Test Graph',
    domains: {
      [parseDomainKey('orders')]: {
        description: 'Orders domain',
        systemType: 'domain',
      },
      [parseDomainKey('shipping')]: {
        description: 'Shipping domain',
        systemType: 'domain',
      },
    },
  },
  components: [
    parseNode({
      sourceLocation: testSourceLocation,
      id: 'node-1',
      type: 'API',
      name: 'Test API',
      domain: 'orders',
      module: 'api',
    }),
    parseNode({
      sourceLocation: testSourceLocation,
      id: 'node-2',
      type: 'UseCase',
      name: 'Test UseCase',
      domain: 'orders',
      module: 'core',
    }),
    parseNode({
      sourceLocation: testSourceLocation,
      id: 'node-3',
      type: 'DomainOp',
      name: 'Ship Order',
      domain: 'shipping',
      module: 'core',
      operationName: 'ship',
    }),
  ],
  links: [
    parseEdge({
      source: 'node-1',
      target: 'node-2',
      type: 'sync',
    }),
    parseEdge({
      source: 'node-2',
      target: 'node-3',
      type: 'async',
    }),
  ],
}

export const mockGraphWithExternals: RiviereGraph = {
  ...mockGraph,
  externalLinks: [
    {
      source: 'node-1',
      target: {
        name: 'Stripe',
        url: 'https://api.stripe.com',
      },
      type: 'sync',
    },
  ],
}

const mockSimulationNode: SimulationNode = {
  id: 'node-1',
  type: 'API',
  apiType: 'other',
  name: 'Test API',
  domain: 'orders',
  originalNode: parseNode({
    sourceLocation: testSourceLocation,
    id: 'node-1',
    type: 'API',
    apiType: 'other',
    name: 'Test API',
    domain: 'orders',
    module: 'api',
  }),
}

export const mockTooltipData: TooltipData = {
  node: mockSimulationNode,
  x: 100,
  y: 200,
  incomingCount: 1,
  outgoingCount: 2,
}

export function renderFullGraphPage(initialEntries: string[] = ['/']) {
  return render(
    <MemoryRouter initialEntries={initialEntries}>
      <ExportProvider>
        <FullGraphPage graph={mockGraph} />
      </ExportProvider>
    </MemoryRouter>,
  )
}

export function renderFullGraphPageWithExternals() {
  return render(
    <MemoryRouter initialEntries={['/']}>
      <ExportProvider>
        <FullGraphPage graph={mockGraphWithExternals} />
      </ExportProvider>
    </MemoryRouter>,
  )
}

export function resetCapturedCallbacks(): void {
  capturedOnNodeHover.current = undefined
  capturedOnBackgroundClick.current = undefined
  capturedGraph.current = undefined
}

export function triggerNodeHover(data: TooltipData): void {
  capturedOnNodeHover.current?.(data)
}

export function triggerBackgroundClick(): void {
  capturedOnBackgroundClick.current?.()
}

export function hasCapturedNodeHoverCallback(): boolean {
  return capturedOnNodeHover.current !== undefined
}

export function capturedExternalLinks() {
  return capturedGraph.current?.externalLinks
}
