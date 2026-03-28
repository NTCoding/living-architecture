import '@testing-library/jest-dom/vitest'
import { createElement } from 'react'
import {
  render, screen, waitFor 
} from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { MemoryRouter } from 'react-router-dom'
import {
  beforeEach, describe, expect, it, vi 
} from 'vitest'
import type { RiviereGraph } from '@living-architecture/riviere-schema'
import {
  parseDomainMetadata,
  parseEdge,
  parseNode,
} from '@/platform/infra/__fixtures__/riviere-test-fixtures'

const registerExportHandlersMock = vi.fn()
const clearExportHandlersMock = vi.fn()
const exportElementAsPngMock = vi.fn((element: unknown, filename: unknown, options: unknown) => {
  void element
  void filename
  void options
  return Promise.resolve()
})
const exportSvgAsFileMock = vi.fn((svg: unknown, filename: unknown) => {
  void svg
  void filename
})
const generateExportFilenameMock = vi.fn((name: string, ext: string) => `${name}.${ext}`)
const navigateMock = vi.fn()

const sourceLocation = {
  repository: 'test-repo',
  filePath: 'src/test.ts',
}

function createGraph(): RiviereGraph {
  return {
    version: '1.0',
    metadata: {
      name: 'domain-map-test',
      domains: parseDomainMetadata({
        orders: {
          description: 'Orders',
          systemType: 'domain',
        },
        payments: {
          description: 'Payments',
          systemType: 'domain',
        },
      }),
    },
    components: [
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
        id: 'payments-worker',
        type: 'UseCase',
        name: 'Payments Worker',
        domain: 'payments',
        module: 'core',
      }),
    ],
    links: [
      parseEdge({
        source: 'orders-api',
        target: 'payments-worker',
        type: 'sync',
      }),
    ],
  }
}

function createMouseEvent(clientX: number, clientY: number): MouseEvent {
  return new MouseEvent('mousemove', {
    clientX,
    clientY,
  })
}

function isExportHandlers(value: unknown): value is {
  onPng: () => void
  onSvg: () => void
} {
  return (
    typeof value === 'object' &&
    value !== null &&
    typeof Reflect.get(value, 'onPng') === 'function' &&
    typeof Reflect.get(value, 'onSvg') === 'function'
  )
}

function getExportHandlers(): {
  onPng: () => void
  onSvg: () => void
} {
  const handlers = registerExportHandlersMock.mock.calls[0]?.[0]
  if (!isExportHandlers(handlers)) {
    throw new TypeError('Missing export handlers')
  }

  return handlers
}

vi.mock('react-router-dom', async () => {
  const actual = await vi.importActual<typeof import('react-router-dom')>('react-router-dom')
  return {
    ...actual,
    useNavigate: () => navigateMock,
  }
})

vi.mock('@xyflow/react', async () => {
  const actual = await vi.importActual<typeof import('@xyflow/react')>('@xyflow/react')
  return {
    ...actual,
    Background: () => <div data-testid="background" />,
    Controls: () => <div data-testid="controls" />,
    ReactFlow: (props: {
      readonly children?: React.ReactNode
      readonly onNodeMouseEnter?: (
        event: MouseEvent,
        node: {
          id: string
          data: {
            label: string
            nodeCount: number
            isExternal?: boolean
          }
        },
      ) => void
      readonly onNodeMouseLeave?: () => void
      readonly onNodeClick?: (
        event: MouseEvent,
        node: {
          id: string
          data: { isExternal?: boolean }
        },
      ) => void
      readonly onEdgeMouseEnter?: (
        event: MouseEvent,
        edge: {
          source: string
          target: string
          data?: {
            apiCount: number
            eventCount: number
          }
        },
      ) => void
      readonly onEdgeMouseLeave?: () => void
      readonly onEdgeClick?: (
        event: MouseEvent,
        edge: {
          source: string
          target: string
          data?: {
            apiCount: number
            eventCount: number
            connections: Array<{
              sourceName: string
              targetName: string
              type: string
              targetNodeType: string
            }>
          }
        },
      ) => void
      readonly onPaneClick?: () => void
    }) => (
      <div>
        <button
          type="button"
          onClick={() =>
            props.onNodeMouseEnter?.(createMouseEvent(10, 20), {
              id: 'orders',
              data: {
                label: 'Orders',
                nodeCount: 1,
              },
            })
          }
        >
          node-hover
        </button>
        <button type="button" onClick={() => props.onNodeMouseLeave?.()}>
          node-leave
        </button>
        <button
          type="button"
          onClick={() =>
            props.onNodeClick?.(new MouseEvent('click'), {
              id: 'orders',
              data: {},
            })
          }
        >
          node-click
        </button>
        <button
          type="button"
          onClick={() =>
            props.onEdgeMouseEnter?.(createMouseEvent(30, 40), {
              source: 'orders',
              target: 'payments',
              data: {
                apiCount: 1,
                eventCount: 0,
              },
            })
          }
        >
          edge-hover
        </button>
        <button
          type="button"
          onClick={() =>
            props.onEdgeClick?.(new MouseEvent('click'), {
              source: 'orders',
              target: 'payments',
              data: {
                apiCount: 1,
                eventCount: 1,
                connections: [
                  {
                    sourceName: 'Orders API',
                    targetName: 'Payments Worker',
                    type: 'sync',
                    targetNodeType: 'UseCase',
                  },
                ],
              },
            })
          }
        >
          edge-click
        </button>
        <button type="button" onClick={() => props.onEdgeMouseLeave?.()}>
          edge-leave
        </button>
        <button type="button" onClick={() => props.onPaneClick?.()}>
          pane-click
        </button>
        <svg />
        {props.children}
      </div>
    ),
  }
})

vi.mock('@/platform/infra/export/ExportContext', () => ({
  useExport: () => ({
    registerExportHandlers: registerExportHandlersMock,
    clearExportHandlers: clearExportHandlersMock,
  }),
}))

vi.mock('@/platform/infra/export/export-graph', () => ({
  exportElementAsPng: (element: unknown, filename: unknown, options: unknown) =>
    exportElementAsPngMock(element, filename, options),
  exportSvgAsFile: (svg: unknown, filename: unknown) => exportSvgAsFileMock(svg, filename),
  generateExportFilename: (name: string, ext: string) => generateExportFilenameMock(name, ext),
  UNNAMED_GRAPH_EXPORT_NAME: 'unnamed-graph',
}))

describe('DomainMapPage interactions', () => {
  beforeEach(() => {
    navigateMock.mockReset()
    registerExportHandlersMock.mockReset()
    clearExportHandlersMock.mockReset()
    exportElementAsPngMock.mockClear()
    exportSvgAsFileMock.mockClear()
    generateExportFilenameMock.mockClear()
    document.documentElement.style.setProperty('--bg-primary', '#ffffff')
  })

  it('shows tooltip, opens inspector, and navigates', async () => {
    const { DomainMapPage: domainMapPage } = await import('./DomainMapPage')
    const user = userEvent.setup()

    render(<MemoryRouter>{createElement(domainMapPage, { graph: createGraph() })}</MemoryRouter>)

    await user.click(screen.getByRole('button', { name: 'node-hover' }))
    await user.click(screen.getByRole('button', { name: 'edge-hover' }))
    await user.click(screen.getByRole('button', { name: 'edge-click' }))
    await user.click(screen.getByRole('button', { name: 'node-click' }))
    expect([
      screen.getByTestId('domain-map-inspector').className,
      screen.getByText('Orders API').textContent,
      navigateMock.mock.calls[0]?.[0],
    ]).toStrictEqual([
      expect.stringContaining('inspector-panel-expanded'),
      'Orders API',
      '/domains/orders',
    ])

    await user.click(screen.getByRole('button', { name: 'node-leave' }))
    await user.click(screen.getByRole('button', { name: 'edge-leave' }))
    await user.click(screen.getByRole('button', { name: 'pane-click' }))
    await user.click(screen.getByRole('button', { name: /close inspector/i }))
  })

  it('registers export handlers that export png and svg', async () => {
    const { DomainMapPage: domainMapPage } = await import('./DomainMapPage')

    render(<MemoryRouter>{createElement(domainMapPage, { graph: createGraph() })}</MemoryRouter>)

    const handlers = getExportHandlers()
    handlers.onPng()
    handlers.onSvg()

    await waitFor(() => {
      expect(exportElementAsPngMock).toHaveBeenCalledOnce()
      expect(exportSvgAsFileMock).toHaveBeenCalledOnce()
    })
  })
})
