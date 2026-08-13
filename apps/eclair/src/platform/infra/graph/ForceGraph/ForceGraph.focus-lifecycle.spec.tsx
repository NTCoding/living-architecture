import {
  afterEach, describe, expect, it, vi,
} from 'vitest'
import {
  act, render, waitFor,
} from '@testing-library/react'
import type { RiviereGraph } from '@living-architecture/riviere-schema/schema'
import { ForceGraph } from './ForceGraph'
import {
  parseDomainMetadata, parseNode,
} from '@/platform/infra/__fixtures__/riviere-test-fixtures'

const {
  applyFocusModeMock, applyResetModeMock,
} = vi.hoisted(() => ({
  applyFocusModeMock: vi.fn(),
  applyResetModeMock: vi.fn(),
}))

vi.mock('./applyFocusModeBehavior', () => ({
  applyFocusMode: applyFocusModeMock,
  applyResetMode: applyResetModeMock,
}))

const graph: RiviereGraph = {
  version: '1.0',
  metadata: {
    domains: parseDomainMetadata({
      orders: {
        description: 'Orders',
        systemType: 'domain',
      },
    }),
  },
  components: [
    parseNode({
      id: 'orders-api',
      type: 'API',
      name: 'Orders API',
      domain: 'orders',
      module: 'api',
      sourceLocation: {
        repository: 'test-repository',
        filePath: 'orders.ts',
      },
    }),
  ],
  links: [],
}

type ResizeCallback = (
  entries: ReadonlyArray<{
    readonly contentRect: {
      readonly width: number
      readonly height: number
    }
  }>,
) => void
type ResizeGraph = (width: number, height: number) => void

describe('ForceGraph focus lifecycle', () => {
  afterEach(() => {
    vi.unstubAllGlobals()
  })

  it('reapplies focus mode after the SVG is rebuilt on resize', async () => {
    const resizeController: { resize: ResizeGraph | undefined } = { resize: undefined }
    class SizedResizeObserver {
      constructor(callback: ResizeCallback) {
        resizeController.resize = (width, height) =>
          callback([
            {
              contentRect: {
                width,
                height,
              },
            },
          ])
      }

      observe(target: Element): void {
        const svg = target.querySelector('svg')
        if (!(svg instanceof SVGSVGElement)) {
          throw new TypeError('Expected ForceGraph SVG before observing its container')
        }
        Object.defineProperties(svg, {
          width: { value: { baseVal: { value: 800 } } },
          height: { value: { baseVal: { value: 600 } } },
        })
        resizeController.resize?.(800, 600)
      }

      disconnect(): void {
        return
      }
    }
    vi.stubGlobal('ResizeObserver', SizedResizeObserver)

    render(<ForceGraph graph={graph} theme="stream" focusedDomain="orders" />)

    await waitFor(() =>
      expect(applyFocusModeMock).toHaveBeenCalledWith(
        expect.objectContaining({ domain: 'orders' }),
      ),
    )
    applyFocusModeMock.mockClear()

    act(() => resizeController.resize?.(1024, 768))

    await waitFor(() =>
      expect(applyFocusModeMock).toHaveBeenCalledWith(
        expect.objectContaining({ domain: 'orders' }),
      ),
    )
  })
})
