import {
  describe, expect, it, vi, beforeEach 
} from 'vitest'
import {
  render, screen, act 
} from '@testing-library/react'
import { userEvent } from '@testing-library/user-event'
import { MemoryRouter } from 'react-router-dom'
import type { RiviereGraph } from '@living-architecture/riviere-schema'
import {
  parseNode,
  parseEdge,
  parseDomainKey,
} from '@/platform/infra/__fixtures__/riviere-test-fixtures'

const {
  capturedClusteredProps,
  registerExportHandlersMock,
  clearExportHandlersMock,
  exportElementAsPngMock,
  exportSvgAsFileMock,
  generateExportFilenameMock,
  computeClusteredGraphLayoutMock,
} = vi.hoisted(() => {
  const clusteredPropsRef: { current: Record<string, unknown> | undefined } = { current: undefined }
  return {
    capturedClusteredProps: clusteredPropsRef,
    registerExportHandlersMock: vi.fn(),
    clearExportHandlersMock: vi.fn(),
    exportElementAsPngMock: vi.fn((element: unknown, filename: unknown, options: unknown) => {
      void element
      void filename
      void options
      return Promise.resolve()
    }),
    exportSvgAsFileMock: vi.fn((svg: unknown, filename: unknown) => {
      void svg
      void filename
    }),
    generateExportFilenameMock: vi.fn(
      (name: unknown, ext: unknown) => `${String(name)}.${String(ext)}`,
    ),
    computeClusteredGraphLayoutMock: vi.fn<(input: unknown) => Promise<unknown>>(),
  }
})

const sourceLocation = {
  repository: 'test-repo',
  filePath: 'src/test.ts',
}

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
      sourceLocation,
      id: 'node-1',
      type: 'API',
      name: 'Test API',
      domain: 'orders',
      module: 'api',
    }),
    parseNode({
      sourceLocation,
      id: 'node-2',
      type: 'UseCase',
      name: 'Test UseCase',
      domain: 'orders',
      module: 'core',
    }),
    parseNode({
      sourceLocation,
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

vi.mock('@/platform/infra/theme/ThemeContext', () => ({
  useTheme: () => ({
    theme: 'stream',
    setTheme: vi.fn(),
  }),
}))

vi.mock('@/platform/infra/graph/ForceGraph/ForceGraph', () => ({ForceGraph: () => <div data-testid="force-graph-container" />,}))

vi.mock('@/platform/infra/graph/ClusteredGraph/ClusteredGraph', () => ({
  ClusteredGraph: (props: Record<string, unknown>) => {
    capturedClusteredProps.current = props
    return <div data-testid="clustered-graph-container" />
  },
}))

vi.mock('@/platform/infra/export/ExportContext', () => ({
  ExportProvider: ({ children }: { children: React.ReactNode }) => <>{children}</>,
  useExport: () => ({
    registerExportHandlers: registerExportHandlersMock,
    clearExportHandlers: clearExportHandlersMock,
  }),
}))

vi.mock('@/platform/infra/export/export-graph', () => ({
  exportElementAsPng: (element: unknown, filename: unknown, options: unknown) =>
    exportElementAsPngMock(element, filename, options),
  exportSvgAsFile: (svg: unknown, filename: unknown) => exportSvgAsFileMock(svg, filename),
  generateExportFilename: (name: unknown, ext: unknown) => generateExportFilenameMock(name, ext),
  UNNAMED_GRAPH_EXPORT_NAME: 'unnamed-graph',
}))

vi.mock('../queries/computeClusteredGraphLayout', () => ({computeClusteredGraphLayout: (input: unknown) => computeClusteredGraphLayoutMock(input),}))

import { FullGraphPage } from './FullGraphPage'

function renderWithRouter() {
  return render(
    <MemoryRouter initialEntries={['/']}>
      <FullGraphPage graph={mockGraph} />
    </MemoryRouter>,
  )
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

describe('FullGraphPage clustered mode and exports', () => {
  beforeEach(() => {
    capturedClusteredProps.current = undefined
    registerExportHandlersMock.mockReset()
    clearExportHandlersMock.mockReset()
    exportElementAsPngMock.mockClear()
    exportSvgAsFileMock.mockClear()
    generateExportFilenameMock.mockClear()
    computeClusteredGraphLayoutMock.mockReset()
    computeClusteredGraphLayoutMock.mockResolvedValue({
      nodes: [],
      links: [],
      circles: [],
      uniqueDomains: [],
    })
    document.documentElement.style.setProperty('--bg-primary', '#ffffff')
  })

  it('switches to clustered mode and computes clustered layout', async () => {
    const user = userEvent.setup()
    renderWithRouter()

    await user.click(screen.getByRole('tab', { name: 'Clustered' }))

    expect(await screen.findByTestId('clustered-graph-container')).toBeInTheDocument()
    expect(computeClusteredGraphLayoutMock).toHaveBeenCalledOnce()
    expect(capturedClusteredProps.current).toStrictEqual(
      expect.objectContaining({
        theme: 'stream',
        layout: expect.objectContaining({ uniqueDomains: [] }),
      }),
    )
  })

  it('registers export handlers that export png and svg', async () => {
    renderWithRouter()

    const handlers = getExportHandlers()

    screen
      .getByTestId('full-graph-page')
      .append(document.createElementNS('http://www.w3.org/2000/svg', 'svg'))

    handlers.onPng()
    handlers.onSvg()

    await act(async () => {
      await Promise.resolve()
    })

    expect(exportElementAsPngMock).toHaveBeenCalledOnce()
    expect(exportSvgAsFileMock).toHaveBeenCalledOnce()
  })
})
