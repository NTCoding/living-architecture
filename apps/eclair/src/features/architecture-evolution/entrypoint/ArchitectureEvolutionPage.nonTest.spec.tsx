import '@testing-library/jest-dom/vitest'
import {
  createElement, useEffect, useRef 
} from 'react'
import {
  render, screen, waitFor 
} from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import {
  beforeEach, describe, expect, it, vi 
} from 'vitest'

const fitBoundsMock = vi.fn(() => Promise.resolve())
const zoomInMock = vi.fn(() => Promise.resolve())
const zoomOutMock = vi.fn(() => Promise.resolve())
const applyGraphvizLayoutMock = vi.fn<(...args: unknown[]) => Promise<unknown>>()
const getRenderedFlowBoundsMock = vi.fn<(...args: unknown[]) => unknown>()
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
const generateExportFilenameMock = vi.fn(
  (name: unknown, ext: unknown) => `${String(name)}.${String(ext)}`,
)

interface ExportHandlers {
  readonly onPng: () => void
  readonly onSvg: () => void
}

function isExportHandlers(value: unknown): value is ExportHandlers {
  return (
    typeof value === 'object' &&
    value !== null &&
    typeof Reflect.get(value, 'onPng') === 'function' &&
    typeof Reflect.get(value, 'onSvg') === 'function'
  )
}

function getExportHandlers(): ExportHandlers {
  const handlers = registerExportHandlersMock.mock.calls[0]?.[0]
  if (!isExportHandlers(handlers)) {
    throw new TypeError('Missing export handlers')
  }

  return handlers
}

vi.mock('@xyflow/react', async () => {
  const actual = await vi.importActual<typeof import('@xyflow/react')>('@xyflow/react')

  function ReactFlowMock(props: {
    readonly onInit?: (instance: unknown) => void
    readonly onEdgeClick?: (event: unknown, edge: { id: string }) => void
    readonly onPaneClick?: () => void
  }): React.ReactElement {
    const didInit = useRef(false)

    useEffect(() => {
      if (!didInit.current) {
        didInit.current = true
        props.onInit?.({
          fitBounds: fitBoundsMock,
          zoomIn: zoomInMock,
          zoomOut: zoomOutMock,
        })
      }
    }, [props])

    return (
      <div>
        <button
          type="button"
          onClick={() => props.onEdgeClick?.({}, { id: 'step-0-ui-web-a_to_api-service-a' })}
        >
          edge
        </button>
        <button type="button" onClick={() => props.onPaneClick?.()}>
          pane
        </button>
        <svg />
      </div>
    )
  }

  return {
    ...actual,
    ReactFlow: ReactFlowMock,
  }
})

vi.mock('../components/architecture-evolution-layout', () => ({applyGraphvizLayout: (nodes: unknown, edges: unknown) => applyGraphvizLayoutMock(nodes, edges),}))

vi.mock('../components/ArchitectureEvolutionPageChrome', async () => {
  const actual = await vi.importActual<
    typeof import('../components/ArchitectureEvolutionPageChrome')
  >('../components/ArchitectureEvolutionPageChrome')
  return {
    ...actual,
    getRenderedFlowBounds: (container: unknown, instance: unknown) =>
      getRenderedFlowBoundsMock(container, instance),
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
  generateExportFilename: (name: unknown, ext: unknown) => generateExportFilenameMock(name, ext),
}))

describe('ArchitectureEvolutionPage non-test mode', () => {
  beforeEach(() => {
    vi.resetModules()
    vi.stubEnv('MODE', 'production')
    fitBoundsMock.mockClear()
    zoomInMock.mockClear()
    zoomOutMock.mockClear()
    applyGraphvizLayoutMock.mockReset()
    getRenderedFlowBoundsMock.mockReset()
    registerExportHandlersMock.mockReset()
    clearExportHandlersMock.mockReset()
    exportElementAsPngMock.mockClear()
    exportSvgAsFileMock.mockClear()
    generateExportFilenameMock.mockClear()
    applyGraphvizLayoutMock.mockResolvedValue({
      nodes: [
        {
          id: 'ui-web-a',
          position: {
            x: 100,
            y: 120,
          },
          data: { label: 'Web UI' },
        },
      ],
      boundaries: [
        {
          id: 'slice-a',
          label: 'Slice A',
          kind: 'slice',
          x: 50,
          y: 60,
          width: 200,
          height: 120,
        },
      ],
      edgePathsById: new Map([['step-0-ui-web-a_to_api-service-a', 'M0,0 L1,1']]),
    })
    getRenderedFlowBoundsMock.mockReturnValue({
      x: 0,
      y: 0,
      width: 400,
      height: 300,
    })
    vi.spyOn(window, 'requestAnimationFrame').mockImplementation(
      (callback: FrameRequestCallback) => {
        callback(0)
        return 1
      },
    )
    Object.defineProperty(document, 'fullscreenElement', {
      configurable: true,
      value: null,
      writable: true,
    })
  })

  it('runs layout, fits bounds, toggles controls, and clears inspector', async () => {
    const requestFullscreenMock = vi.fn(() => Promise.resolve())
    Object.defineProperty(HTMLElement.prototype, 'requestFullscreen', {
      configurable: true,
      value: requestFullscreenMock,
    })

    const { ArchitectureEvolutionPage: architectureEvolutionPageComponent } =
      await import('./ArchitectureEvolutionPage')
    render(createElement(architectureEvolutionPageComponent))

    await waitFor(() => {
      expect(applyGraphvizLayoutMock).toHaveBeenCalledOnce()
      expect(fitBoundsMock).toHaveBeenCalledOnce()
      expect(registerExportHandlersMock).toHaveBeenCalledOnce()
    })

    const user = userEvent.setup()
    await user.click(screen.getByRole('button', { name: /zoom in/i }))
    await user.click(screen.getByRole('button', { name: /zoom out/i }))
    await user.click(screen.getByRole('button', { name: /fullscreen/i }))
    await user.click(screen.getByRole('button', { name: 'edge' }))
    await user.click(screen.getByRole('button', { name: 'pane' }))

    expect([
      zoomInMock.mock.calls.length,
      zoomOutMock.mock.calls.length,
      requestFullscreenMock.mock.calls.length,
    ]).toStrictEqual([1, 1, 1])
  })

  it('registers export handlers that export png and svg', async () => {
    document.documentElement.style.setProperty('--bg-primary', '#ffffff')

    const { ArchitectureEvolutionPage: architectureEvolutionPageComponent } =
      await import('./ArchitectureEvolutionPage')
    render(createElement(architectureEvolutionPageComponent))

    await waitFor(() => {
      expect(registerExportHandlersMock).toHaveBeenCalledOnce()
    })

    const handlers = getExportHandlers()
    handlers.onPng()
    handlers.onSvg()

    await waitFor(() => {
      expect([
        exportElementAsPngMock.mock.calls.length,
        exportSvgAsFileMock.mock.calls.length,
      ]).toStrictEqual([1, 1])
    })
  })
})
