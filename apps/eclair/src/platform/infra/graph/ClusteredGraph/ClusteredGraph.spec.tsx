import * as d3 from 'd3'
import {
  fireEvent,
  render,
  screen,
} from '@testing-library/react'
import {
  beforeEach,
  describe,
  expect,
  it,
  vi,
} from 'vitest'
import {
  parseEdge,
  parseNode,
} from '../../__fixtures__/riviere-test-fixtures'
import {
  createSimulationLinks,
  createSimulationNodes,
} from '../ForceGraph/VisualizationDataAdapters'
import type { TooltipData } from '../graph-types'

const sourceLocation = {
  repository: 'test-repo',
  filePath: 'src/test.ts',
}

const {
  applyClusteredPresentationMock,
  calculateCircleFocusTransformMock,
  calculateViewportTransformMock,
  createUpdatePositionsFunctionMock,
  getDomainColorMock,
  getNodeColorMock,
  getNodeRadiusMock,
  getSemanticEdgeColorMock,
  getSemanticEdgeTypeMock,
  isAsyncEdgeMock,
  setupClusteredNodeEventsMock,
  setupLinksMock,
  setupNodesMock,
  setupSVGFiltersAndMarkersMock,
  setupZoomBehaviorMock,
  truncateClusteredNodeLabelMock,
  updateHighlightMock,
  zoomTransformMock,
} = vi.hoisted(() => ({
  applyClusteredPresentationMock: vi.fn(),
  calculateCircleFocusTransformMock: vi.fn(() => ({
    scale: 1.75,
    translateX: 120,
    translateY: 160,
  })),
  calculateViewportTransformMock: vi.fn(() => ({
    scale: 1.2,
    translateX: 32,
    translateY: 48,
  })),
  createUpdatePositionsFunctionMock: vi.fn(() => vi.fn()),
  getDomainColorMock: vi.fn(() => '#445566'),
  getNodeColorMock: vi.fn(() => '#112233'),
  getNodeRadiusMock: vi.fn(() => 12),
  getSemanticEdgeColorMock: vi.fn(() => '#778899'),
  getSemanticEdgeTypeMock: vi.fn(() => 'default'),
  isAsyncEdgeMock: vi.fn(() => false),
  setupClusteredNodeEventsMock: vi.fn(),
  setupLinksMock: vi.fn(),
  setupNodesMock: vi.fn(),
  setupSVGFiltersAndMarkersMock: vi.fn(),
  setupZoomBehaviorMock: vi.fn(),
  truncateClusteredNodeLabelMock: vi.fn((label: string) => `trim:${label}`),
  updateHighlightMock: vi.fn(),
  zoomTransformMock: vi.fn(),
}))

vi.mock('./applyClusteredPresentation', () => ({ applyClusteredPresentation: applyClusteredPresentationMock }))

vi.mock('./clusteredGraphGeometry', () => ({
  calculateCircleFocusTransform: calculateCircleFocusTransformMock,
  calculateViewportTransform: calculateViewportTransformMock,
  CLUSTER_LABEL_STROKE_WIDTH: 3,
  getClusterLabelFontSize: vi.fn(() => 18),
  getClusterLabelY: vi.fn((circle: { y: number }) => circle.y - 10),
}))

vi.mock('./computeCircleEnclosures', () => ({ truncateClusteredNodeLabel: truncateClusteredNodeLabelMock }))

vi.mock('./setupClusteredNodeEvents', () => ({ setupClusteredNodeEvents: setupClusteredNodeEventsMock }))

vi.mock('../ForceGraph/VisualizationDataAdapters', async () => {
  const actual = await vi.importActual<typeof import('../ForceGraph/VisualizationDataAdapters')>(
    '../ForceGraph/VisualizationDataAdapters',
  )

  return {
    ...actual,
    getDomainColor: getDomainColorMock,
    getNodeColor: getNodeColorMock,
    getNodeRadius: getNodeRadiusMock,
    getSemanticEdgeColor: getSemanticEdgeColorMock,
    getSemanticEdgeType: getSemanticEdgeTypeMock,
    isAsyncEdge: isAsyncEdgeMock,
  }
})

vi.mock('../ForceGraph/GraphRenderingSetup', () => ({
  createUpdatePositionsFunction: createUpdatePositionsFunctionMock,
  setupLinks: setupLinksMock,
  setupNodes: setupNodesMock,
  setupSVGFiltersAndMarkers: setupSVGFiltersAndMarkersMock,
  setupZoomBehavior: setupZoomBehaviorMock,
  updateHighlight: updateHighlightMock,
}))

import { ClusteredGraph } from './ClusteredGraph'

interface TestLayout {
  readonly nodes: ReturnType<typeof createSimulationNodes>
  readonly links: ReturnType<typeof createSimulationLinks>
  readonly circles: readonly {
    readonly id: string
    readonly domain: string
    readonly label: string
    readonly x: number
    readonly y: number
    readonly r: number
    readonly nodeIds: readonly string[]
  }[]
  readonly uniqueDomains: readonly string[]
}

function requireValue<T>(value: T | undefined, message: string): T {
  if (value === undefined) {
    throw new TypeError(message)
  }

  return value
}

function createLayout(): TestLayout {
  const nodes = createSimulationNodes([
    parseNode({
      sourceLocation,
      id: 'orders-api',
      type: 'API',
      name: 'Orders API',
      domain: 'orders',
      module: 'api',
    }),
    parseNode({
      sourceLocation,
      id: 'billing-worker',
      type: 'UseCase',
      name: 'Billing Worker',
      domain: 'billing',
      module: 'core',
    }),
  ])

  const firstNode = requireValue(nodes[0], 'Missing first node')
  const secondNode = requireValue(nodes[1], 'Missing second node')

  firstNode.x = 100
  firstNode.y = 140
  secondNode.x = 280
  secondNode.y = 160

  const links = createSimulationLinks([
    parseEdge({
      source: 'orders-api',
      target: 'billing-worker',
      type: 'sync',
    }),
  ])

  return {
    nodes,
    links,
    circles: [
      {
        id: 'orders',
        domain: 'orders',
        label: 'Orders',
        x: 140,
        y: 180,
        r: 90,
        nodeIds: ['orders-api'],
      },
      {
        id: 'billing',
        domain: 'billing',
        label: 'Billing',
        x: 320,
        y: 180,
        r: 80,
        nodeIds: ['billing-worker'],
      },
    ],
    uniqueDomains: [],
  }
}

function createReorderedLayout(): TestLayout {
  const layout = createLayout()
  const firstNode = requireValue(layout.nodes[0], 'Missing first node')
  const secondNode = requireValue(layout.nodes[1], 'Missing second node')
  const firstLink = requireValue(layout.links[0], 'Missing first link')
  const firstCircle = requireValue(layout.circles[0], 'Missing first circle')
  const secondCircle = requireValue(layout.circles[1], 'Missing second circle')

  return {
    ...layout,
    nodes: [secondNode, firstNode],
    links: [firstLink],
    circles: [secondCircle, firstCircle],
  }
}

class MockResizeObserver {
  public observe = vi.fn()

  public disconnect = vi.fn()

  public constructor(public readonly callback: ResizeObserverCallback) {}
}

describe('ClusteredGraph', () => {
  beforeEach(() => {
    vi.clearAllMocks()

    vi.stubGlobal('ResizeObserver', MockResizeObserver)
    vi.spyOn(HTMLElement.prototype, 'getBoundingClientRect').mockReturnValue({
      x: 0,
      y: 0,
      left: 0,
      top: 0,
      right: 640,
      bottom: 480,
      width: 640,
      height: 480,
      toJSON: () => ({}),
    })

    setupLinksMock.mockImplementation(
      ({
        linkGroup,
        links,
      }: {
        linkGroup: d3.Selection<SVGGElement, unknown, null, undefined>
        links: unknown[]
      }) => linkGroup.selectAll<SVGPathElement, unknown>('path').data(links).join('path'),
    )

    setupNodesMock.mockImplementation(
      ({
        nodeGroup,
        nodes,
      }: {
        nodeGroup: d3.Selection<SVGGElement, unknown, null, undefined>
        nodes: unknown[]
      }) => {
        const selection = nodeGroup.selectAll<SVGGElement, unknown>('g').data(nodes).join('g')
        selection.append('circle').attr('class', 'node-circle')
        selection.append('text').attr('class', 'node-label')
        selection.append('text').attr('class', 'node-domain-label')
        return selection
      },
    )

    setupZoomBehaviorMock.mockReturnValue({ transform: zoomTransformMock })
  })

  it('shows loading state until layout is ready', () => {
    render(<ClusteredGraph layout={null} theme="stream" highlightedNodeId="orders-api" />)

    expect(screen.getByText('Arranging domain clusters...')).toBeInTheDocument()
    expect(screen.getByTestId('clustered-graph-container')).toHaveAttribute(
      'data-highlighted-node',
      'orders-api',
    )
    expect(applyClusteredPresentationMock).not.toHaveBeenCalled()
  })

  it('renders the graph with external fallback domains and background clicks', () => {
    const layout = createLayout()
    const onBackgroundClick = vi.fn()

    render(<ClusteredGraph layout={layout} theme="stream" onBackgroundClick={onBackgroundClick} />)

    expect(setupSVGFiltersAndMarkersMock).toHaveBeenCalledOnce()
    expect(setupNodesMock).toHaveBeenCalledWith(
      expect.objectContaining({
        truncateName: expect.any(Function),
        uniqueDomains: ['external'],
      }),
    )
    expect(applyClusteredPresentationMock).toHaveBeenCalledWith(
      expect.objectContaining({
        focusedDomain: undefined,
        shouldFitViewport: true,
        width: 640,
        height: 480,
      }),
    )

    fireEvent.click(screen.getByTestId('clustered-graph-svg'))
    expect(onBackgroundClick).toHaveBeenCalledOnce()
  })

  it('uses the latest hover callback without rebuilding node events', () => {
    const layout = createLayout()
    const onBackgroundClick = vi.fn()
    const firstHover = vi.fn<(data: TooltipData | null) => void>()
    const secondHover = vi.fn<(data: TooltipData | null) => void>()

    const { rerender } = render(
      <ClusteredGraph
        layout={layout}
        theme="stream"
        onBackgroundClick={onBackgroundClick}
        onNodeHover={firstHover}
      />,
    )

    const firstEventArgs = requireValue(
      setupClusteredNodeEventsMock.mock.calls[0]?.[0],
      'Missing clustered node event args',
    )
    const hoverHandler: (data: TooltipData | null) => void = firstEventArgs.onNodeHover

    rerender(
      <ClusteredGraph
        layout={layout}
        theme="stream"
        onBackgroundClick={onBackgroundClick}
        onNodeHover={secondHover}
      />,
    )

    const firstNode = requireValue(layout.nodes[0], 'Missing first node')

    hoverHandler({
      incomingCount: 1,
      node: firstNode,
      outgoingCount: 0,
      x: 12,
      y: 24,
    })

    expect(setupClusteredNodeEventsMock).toHaveBeenCalledOnce()
    expect(firstHover).not.toHaveBeenCalled()
    expect(secondHover).toHaveBeenCalledWith(
      expect.objectContaining({
        x: 12,
        y: 24,
      }),
    )
  })

  it('skips viewport refits when graph contents are unchanged', () => {
    const layout = createLayout()

    const { rerender } = render(<ClusteredGraph layout={layout} theme="stream" />)

    rerender(<ClusteredGraph layout={createReorderedLayout()} theme="stream" />)

    expect(applyClusteredPresentationMock).toHaveBeenLastCalledWith(
      expect.objectContaining({ shouldFitViewport: false }),
    )
  })

  it('restores focused-domain zoom when highlighted nodes are cleared', () => {
    const layout = createLayout()
    const { rerender } = render(
      <ClusteredGraph
        focusedDomain="orders"
        highlightedNodeIds={new Set(['orders-api'])}
        layout={layout}
        theme="stream"
      />,
    )

    rerender(
      <ClusteredGraph
        focusedDomain="orders"
        highlightedNodeIds={new Set()}
        layout={layout}
        theme="stream"
      />,
    )

    expect(updateHighlightMock).toHaveBeenCalledTimes(2)
    expect(calculateCircleFocusTransformMock).toHaveBeenCalledWith(
      expect.objectContaining({
        circle: expect.objectContaining({ domain: 'orders' }),
        height: 480,
        width: 640,
      }),
    )
    expect(zoomTransformMock).toHaveBeenCalledWith(expect.anything(), expect.anything())
  })

  it('fits the viewport again when highlights clear without a focused domain', () => {
    const layout = createLayout()
    const { rerender } = render(
      <ClusteredGraph
        highlightedNodeIds={new Set(['orders-api'])}
        layout={layout}
        theme="stream"
      />,
    )

    rerender(<ClusteredGraph highlightedNodeIds={new Set()} layout={layout} theme="stream" />)

    expect(calculateViewportTransformMock).toHaveBeenCalledWith(
      expect.objectContaining({
        circles: layout.circles,
        height: 480,
        nodes: layout.nodes,
        padding: 80,
        width: 640,
      }),
    )
    expect(zoomTransformMock).toHaveBeenCalledWith(expect.anything(), expect.anything())
  })
})
