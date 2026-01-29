import {
  describe, it, expect, vi 
} from 'vitest'
import {
  render, screen 
} from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { FlowTrace } from './FlowTrace'
import type { FlowStep } from '../../extractFlows'
import type { RiviereGraph } from '@living-architecture/riviere-schema'
import {
  parseNode, parseEdge, parseDomainMetadata 
} from '@/platform/infra/__fixtures__/riviere-test-fixtures'
const testSourceLocation = {
  repository: 'test-repo',
  filePath: 'src/test.ts',
}

vi.mock('@/platform/infra/theme/ThemeContext', () => ({ useTheme: () => ({ theme: 'stream' }) }))

vi.mock('@/features/full-graph/components/ForceGraph/ForceGraph', () => ({
  ForceGraph: ({ graph }: { graph: { components: Array<{ name: string }> } }) => (
    <div data-testid="force-graph-mock">
      {graph.components.map((node) => (
        <span key={node.name}>{node.name}</span>
      ))}
    </div>
  ),
}))

function createTestSteps(): FlowStep[] {
  return [
    {
      node: parseNode({
        sourceLocation: testSourceLocation,
        id: 'ui-1',
        type: 'UI',
        name: 'Order Form',
        domain: 'checkout',
        module: 'ui',
        route: '/checkout',
      }),
      edgeType: 'sync',
      depth: 0,
      externalLinks: [],
    },
    {
      node: parseNode({
        sourceLocation: testSourceLocation,
        id: 'api-1',
        type: 'API',
        name: 'POST /orders',
        domain: 'orders',
        module: 'api',
        httpMethod: 'POST',
        path: '/orders',
      }),
      edgeType: 'sync',
      depth: 1,
      externalLinks: [],
    },
    {
      node: parseNode({
        sourceLocation: testSourceLocation,
        id: 'uc-1',
        type: 'UseCase',
        name: 'Place Order',
        domain: 'orders',
        module: 'checkout',
      }),
      edgeType: 'async',
      depth: 2,
      externalLinks: [],
    },
    {
      node: parseNode({
        sourceLocation: testSourceLocation,
        id: 'evt-1',
        type: 'Event',
        name: 'OrderPlaced',
        domain: 'orders',
        module: 'events',
        eventName: 'OrderPlaced',
      }),
      edgeType: null,
      depth: 3,
      externalLinks: [],
    },
  ]
}

function createTestGraph(): RiviereGraph {
  return {
    version: '1.0',
    metadata: {
      domains: parseDomainMetadata({
        'test-domain': {
          description: 'Test domain',
          systemType: 'domain',
        },
      }),
    },
    components: [
      parseNode({
        sourceLocation: testSourceLocation,
        id: 'ui-1',
        type: 'UI',
        name: 'Order Form',
        domain: 'checkout',
        module: 'ui',
        route: '/checkout',
      }),
      parseNode({
        sourceLocation: testSourceLocation,
        id: 'api-1',
        type: 'API',
        name: 'POST /orders',
        domain: 'orders',
        module: 'api',
        httpMethod: 'POST',
        path: '/orders',
      }),
      parseNode({
        sourceLocation: testSourceLocation,
        id: 'uc-1',
        type: 'UseCase',
        name: 'Place Order',
        domain: 'orders',
        module: 'checkout',
      }),
      parseNode({
        sourceLocation: testSourceLocation,
        id: 'evt-1',
        type: 'Event',
        name: 'OrderPlaced',
        domain: 'orders',
        module: 'events',
        eventName: 'OrderPlaced',
      }),
    ],
    links: [
      parseEdge({
        source: 'ui-1',
        target: 'api-1',
        type: 'sync',
      }),
      parseEdge({
        source: 'api-1',
        target: 'uc-1',
        type: 'sync',
      }),
      parseEdge({
        source: 'uc-1',
        target: 'evt-1',
        type: 'async',
      }),
    ],
  }
}

describe('FlowTrace', () => {
  describe('container', () => {
    it('renders with flow-trace-container class', () => {
      render(<FlowTrace steps={createTestSteps()} graph={createTestGraph()} />)

      expect(screen.getByTestId('flow-trace')).toHaveClass('flow-trace-container')
    })
  })

  describe('header', () => {
    it('renders FLOW TRACE label with flow-trace-header-label class', () => {
      render(<FlowTrace steps={createTestSteps()} graph={createTestGraph()} />)

      const label = screen.getByText('FLOW TRACE')
      expect(label).toHaveClass('flow-trace-header-label')
    })

    it('renders view mode switcher with Waterfall and Graph buttons', () => {
      render(<FlowTrace steps={createTestSteps()} graph={createTestGraph()} />)

      expect(screen.getByRole('button', { name: 'Waterfall' })).toHaveClass('view-mode-btn')
      expect(screen.getByRole('button', { name: 'Graph' })).toHaveClass('view-mode-btn')
    })

    it('marks Waterfall as active by default', () => {
      render(<FlowTrace steps={createTestSteps()} graph={createTestGraph()} />)

      expect(screen.getByRole('button', { name: 'Waterfall' })).toHaveClass('active')
      expect(screen.getByRole('button', { name: 'Graph' })).not.toHaveClass('active')
    })
  })

  describe('step circles', () => {
    it('renders step circles with flow-step-circle class', () => {
      render(<FlowTrace steps={createTestSteps()} graph={createTestGraph()} />)

      const circle = screen.getByText('1').closest('div')
      expect(circle).toHaveClass('flow-step-circle')
    })

    it('renders UI step circle with flow-step-circle-ui class', () => {
      render(<FlowTrace steps={createTestSteps()} graph={createTestGraph()} />)

      const circle = screen.getByText('1').closest('div')
      expect(circle).toHaveClass('flow-step-circle-ui')
    })

    it('renders API step circle with flow-step-circle-api class', () => {
      render(<FlowTrace steps={createTestSteps()} graph={createTestGraph()} />)

      const circle = screen.getByText('2').closest('div')
      expect(circle).toHaveClass('flow-step-circle-api')
    })

    it('renders UseCase step circle with flow-step-circle-usecase class', () => {
      render(<FlowTrace steps={createTestSteps()} graph={createTestGraph()} />)

      const circle = screen.getByText('3').closest('div')
      expect(circle).toHaveClass('flow-step-circle-usecase')
    })

    it('renders Event step circle with flow-step-circle-event class', () => {
      render(<FlowTrace steps={createTestSteps()} graph={createTestGraph()} />)

      const circle = screen.getByText('4').closest('div')
      expect(circle).toHaveClass('flow-step-circle-event')
    })

    it('renders External step circle with flow-step-circle-external class', () => {
      const externalStep: FlowStep = {
        node: {
          id: 'external:Stripe',
          type: 'External',
          name: 'Stripe',
          domain: 'external',
          module: 'external',
        },
        edgeType: null,
        depth: 0,
        externalLinks: [],
      }
      render(<FlowTrace steps={[externalStep]} graph={createTestGraph()} />)

      const circle = screen.getByText('1').closest('div')
      expect(circle).toHaveClass('flow-step-circle-external')
    })
  })

  describe('step content', () => {
    it('renders step names with flow-step-name class', () => {
      render(<FlowTrace steps={createTestSteps()} graph={createTestGraph()} />)

      expect(screen.getByText('Order Form')).toHaveClass('flow-step-name')
    })

    it('renders step metadata with flow-step-meta class', () => {
      render(<FlowTrace steps={createTestSteps()} graph={createTestGraph()} />)

      expect(screen.getByText('ui · checkout · UI')).toHaveClass('flow-step-meta')
    })

    it('displays title attribute with full node name for tooltip', () => {
      render(<FlowTrace steps={createTestSteps()} graph={createTestGraph()} />)

      const stepName = screen.getByText('Order Form')
      expect(stepName).toHaveAttribute('title', 'Order Form')
    })
  })

  describe('edge indicators', () => {
    it('renders edge type for non-terminal steps', () => {
      render(<FlowTrace steps={createTestSteps()} graph={createTestGraph()} />)

      expect(screen.getAllByText('sync →').length).toBeGreaterThan(0)
      expect(screen.getByText('async →')).toBeInTheDocument()
    })

    it('does not render edge indicator for last step', () => {
      render(<FlowTrace steps={createTestSteps()} graph={createTestGraph()} />)

      expect(screen.queryAllByText(/→/)).toHaveLength(3)
    })
  })

  describe('empty state', () => {
    it('renders empty state when no steps', () => {
      render(<FlowTrace steps={[]} graph={createTestGraph()} />)

      expect(screen.getByText('No steps in this flow')).toBeInTheDocument()
    })
  })

  describe('view mode switching', () => {
    it('switches to Graph view when Graph button clicked', async () => {
      const user = userEvent.setup()
      render(<FlowTrace steps={createTestSteps()} graph={createTestGraph()} />)

      await user.click(screen.getByRole('button', { name: 'Graph' }))

      expect(screen.getByRole('button', { name: 'Graph' })).toHaveClass('active')
      expect(screen.getByRole('button', { name: 'Waterfall' })).not.toHaveClass('active')
    })

    it('hides waterfall view when Graph is selected', async () => {
      const user = userEvent.setup()
      render(<FlowTrace steps={createTestSteps()} graph={createTestGraph()} />)

      await user.click(screen.getByRole('button', { name: 'Graph' }))

      const container = screen.getByTestId('flow-trace')
      expect(container.querySelector('.flow-waterfall-view')).not.toBeInTheDocument()
    })

    it('shows graph container when Graph is selected', async () => {
      const user = userEvent.setup()
      render(<FlowTrace steps={createTestSteps()} graph={createTestGraph()} />)

      await user.click(screen.getByRole('button', { name: 'Graph' }))

      expect(screen.getByTestId('flow-graph-view')).toBeInTheDocument()
    })

    it('switches back to Waterfall view when Waterfall button clicked', async () => {
      const user = userEvent.setup()
      render(<FlowTrace steps={createTestSteps()} graph={createTestGraph()} />)

      await user.click(screen.getByRole('button', { name: 'Graph' }))
      await user.click(screen.getByRole('button', { name: 'Waterfall' }))

      expect(screen.getByRole('button', { name: 'Waterfall' })).toHaveClass('active')
      expect(screen.getByText('Order Form')).toBeInTheDocument()
    })
  })

  describe('graph view content', () => {
    it('renders nodes in graph view', async () => {
      const user = userEvent.setup()
      render(<FlowTrace steps={createTestSteps()} graph={createTestGraph()} />)

      await user.click(screen.getByRole('button', { name: 'Graph' }))

      expect(screen.getByText('Order Form')).toBeInTheDocument()
      expect(screen.getByText('POST /orders')).toBeInTheDocument()
      expect(screen.getByText('Place Order')).toBeInTheDocument()
      expect(screen.getByText('OrderPlaced')).toBeInTheDocument()
    })
  })

  describe('subscribed events', () => {
    it('renders subscribed events for EventHandler steps', () => {
      const eventHandlerStep: FlowStep[] = [
        {
          node: {
            id: 'eh-1',
            type: 'EventHandler',
            name: 'Reserve Inventory',
            domain: 'inventory',
            module: 'handlers',
            subscribedEvents: ['OrderPlaced'],
          },
          edgeType: null,
          depth: 0,
          externalLinks: [],
        },
      ]
      render(<FlowTrace steps={eventHandlerStep} graph={createTestGraph()} />)

      expect(screen.getByText('Handles: OrderPlaced')).toBeInTheDocument()
    })

    it('renders multiple subscribed events comma-separated', () => {
      const eventHandlerStep: FlowStep[] = [
        {
          node: {
            id: 'eh-1',
            type: 'EventHandler',
            name: 'Multi-Event Handler',
            domain: 'inventory',
            module: 'handlers',
            subscribedEvents: ['OrderPlaced', 'OrderCancelled'],
          },
          edgeType: null,
          depth: 0,
          externalLinks: [],
        },
      ]
      render(<FlowTrace steps={eventHandlerStep} graph={createTestGraph()} />)

      expect(screen.getByText('Handles: OrderPlaced, OrderCancelled')).toBeInTheDocument()
    })

    it('does not render subscribed events for non-EventHandler nodes', () => {
      render(<FlowTrace steps={createTestSteps()} graph={createTestGraph()} />)

      expect(screen.queryByText(/^Handles:/)).not.toBeInTheDocument()
    })

    it('does not render subscribed events when empty array', () => {
      const eventHandlerStep: FlowStep[] = [
        {
          node: {
            id: 'eh-1',
            type: 'EventHandler',
            name: 'Handler Without Events',
            domain: 'inventory',
            module: 'handlers',
            subscribedEvents: [],
          },
          edgeType: null,
          depth: 0,
          externalLinks: [],
        },
      ]
      render(<FlowTrace steps={eventHandlerStep} graph={createTestGraph()} />)

      expect(screen.queryByText(/^Handles:/)).not.toBeInTheDocument()
    })
  })

  describe('external links', () => {
    it('renders external links for steps that have them', () => {
      const stepsWithExternalLinks: FlowStep[] = [
        {
          node: parseNode({
            sourceLocation: testSourceLocation,
            id: 'api-1',
            type: 'API',
            name: 'POST /orders',
            domain: 'orders',
            module: 'api',
            httpMethod: 'POST',
            path: '/orders',
          }),
          edgeType: 'sync',
          depth: 0,
          externalLinks: [
            {
              source: 'api-1',
              target: {
                name: 'Stripe',
                url: 'https://stripe.com',
              },
              type: 'sync',
            },
          ],
        },
      ]
      render(<FlowTrace steps={stepsWithExternalLinks} graph={createTestGraph()} />)

      expect(screen.getByText('Stripe')).toBeInTheDocument()
      expect(screen.getByText('External · sync')).toBeInTheDocument()
    })

    it('does not render external links section when step has no external links', () => {
      render(<FlowTrace steps={createTestSteps()} graph={createTestGraph()} />)

      expect(screen.queryByText('External ·')).not.toBeInTheDocument()
    })

    it('renders multiple external links for a single step', () => {
      const stepsWithMultipleExternalLinks: FlowStep[] = [
        {
          node: parseNode({
            sourceLocation: testSourceLocation,
            id: 'api-1',
            type: 'API',
            name: 'POST /orders',
            domain: 'orders',
            module: 'api',
            httpMethod: 'POST',
            path: '/orders',
          }),
          edgeType: 'sync',
          depth: 0,
          externalLinks: [
            {
              source: 'api-1',
              target: { name: 'Stripe' },
              type: 'sync',
            },
            {
              source: 'api-1',
              target: { name: 'SendGrid' },
              type: 'async',
            },
          ],
        },
      ]
      render(<FlowTrace steps={stepsWithMultipleExternalLinks} graph={createTestGraph()} />)

      expect(screen.getByText('Stripe')).toBeInTheDocument()
      expect(screen.getByText('SendGrid')).toBeInTheDocument()
    })
  })
})
