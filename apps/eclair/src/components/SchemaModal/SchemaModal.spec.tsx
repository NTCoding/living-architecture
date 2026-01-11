import {
  describe, it, expect, vi
} from 'vitest'
import {
  render, screen, waitFor, within, fireEvent
} from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import {
  SchemaModal, validateDownloadGraphName
} from './SchemaModal'
import type {
  RiviereGraph, GraphName
} from '@/types/riviere'
import {
  nodeIdSchema, domainNameSchema, moduleNameSchema, graphNameSchema
} from '@/types/riviere'
import { assertDefined } from '@/test-assertions'
import { SchemaError } from '@/errors'

const testSourceLocation = {
  repository: 'test-repo',
  filePath: 'src/test.ts',
}

function createGraphName(name: string): GraphName {
  return graphNameSchema.parse(name)
}

function renderSchemaModalWithGraph(graph: RiviereGraph): void {
  render(
    <SchemaModal graph={graph} graphName={createGraphName('test.json')} isOpen={true} onClose={vi.fn()} />,
  )
}

function createTestGraph(overrides: Partial<RiviereGraph> = {}): RiviereGraph {
  return {
    version: '1.0',
    metadata: {
      name: 'test-graph',
      description: 'Test graph description',
      generated: '2024-01-15T10:30:00Z',
      domains: {
        orders: {
          description: 'Order management',
          systemType: 'domain',
        },
        inventory: {
          description: 'Inventory management',
          systemType: 'domain',
        },
      },
    },
    components: [
      {
        sourceLocation: testSourceLocation,
        id: nodeIdSchema.parse('node-1'),
        type: 'API',
        apiType: 'REST',
        name: 'POST /orders',
        domain: domainNameSchema.parse('orders'),
        module: moduleNameSchema.parse('api'),
      },
      {
        sourceLocation: testSourceLocation,
        id: nodeIdSchema.parse('node-2'),
        type: 'UseCase',
        name: 'PlaceOrder',
        domain: domainNameSchema.parse('orders'),
        module: moduleNameSchema.parse('usecases'),
      },
    ],
    links: [
      {
        source: nodeIdSchema.parse('node-1'),
        target: nodeIdSchema.parse('node-2'),
        type: 'sync',
      },
    ],
    ...overrides,
  }
}

describe('SchemaModal', () => {
  describe('when not open', () => {
    it('renders nothing when graph is null', () => {
      const { container } = render(
        <SchemaModal graph={null} graphName={undefined} isOpen={true} onClose={vi.fn()} />,
      )

      expect(container.firstChild).toBeNull()
    })

    it('renders nothing when isOpen is false', () => {
      const { container } = render(
        <SchemaModal
          graph={createTestGraph()}
          graphName={createGraphName('test.json')}
          isOpen={false}
          onClose={vi.fn()}
        />,
      )

      expect(container.firstChild).toBeNull()
    })
  })

  describe('generated date validation', () => {
    it('throws SchemaError when date part is empty', () => {
      const graph = createTestGraph()
      graph.metadata.generated = 'T10:30:00Z'

      expect(() => renderSchemaModalWithGraph(graph)).toThrow(SchemaError)
    })

    it('throws SchemaError with descriptive message for invalid date', () => {
      const graph = createTestGraph()
      graph.metadata.generated = 'T10:30:00Z'

      expect(() => renderSchemaModalWithGraph(graph)).toThrow('Invalid ISO date string')
    })
  })

  describe('when open', () => {
    describe('header', () => {
      it('renders filename in title', () => {
        render(
          <SchemaModal
            graph={createTestGraph()}
            graphName={createGraphName('ecommerce-complete.json')}
            isOpen={true}
            onClose={vi.fn()}
          />,
        )

        expect(screen.getByText('ecommerce-complete.json')).toBeInTheDocument()
      })

      it('renders empty title when graphName undefined', () => {
        render(
          <SchemaModal
            graph={createTestGraph()}
            graphName={undefined}
            isOpen={true}
            onClose={vi.fn()}
          />,
        )

        const dialog = screen.getByRole('dialog')
        const labelledBy = assertDefined(
          dialog.getAttribute('aria-labelledby'),
          'Expected dialog to have aria-labelledby attribute',
        )
        const titleElement = document.getElementById(labelledBy)
        expect(titleElement).toBeInTheDocument()
        expect(titleElement?.textContent).toBe('')
      })

      it('renders close button', () => {
        render(
          <SchemaModal
            graph={createTestGraph()}
            graphName={createGraphName('test.json')}
            isOpen={true}
            onClose={vi.fn()}
          />,
        )

        expect(screen.getByRole('button', { name: 'Close' })).toBeInTheDocument()
      })

      it('calls onClose when close button clicked', async () => {
        const user = userEvent.setup()
        const onClose = vi.fn()

        render(
          <SchemaModal
            graph={createTestGraph()}
            graphName={createGraphName('test.json')}
            isOpen={true}
            onClose={onClose}
          />,
        )

        await user.click(screen.getByRole('button', { name: 'Close' }))

        expect(onClose).toHaveBeenCalledWith(expect.anything())
      })

      it('renders copy button', () => {
        render(
          <SchemaModal
            graph={createTestGraph()}
            graphName={createGraphName('test.json')}
            isOpen={true}
            onClose={vi.fn()}
          />,
        )

        expect(screen.getByRole('button', { name: /copy/i })).toBeInTheDocument()
      })

      it('renders download button', () => {
        render(
          <SchemaModal
            graph={createTestGraph()}
            graphName={createGraphName('test.json')}
            isOpen={true}
            onClose={vi.fn()}
          />,
        )

        expect(screen.getByRole('button', { name: /download/i })).toBeInTheDocument()
      })
    })

    describe('metadata section', () => {
      it('renders schema version', () => {
        const graph = createTestGraph({ version: '2.5.0' })

        render(
          <SchemaModal
            graph={graph}
            graphName={createGraphName('test.json')}
            isOpen={true}
            onClose={vi.fn()}
          />,
        )

        expect(screen.getByText('Schema Version')).toBeInTheDocument()
        expect(screen.getByText('2.5.0')).toBeInTheDocument()
      })

      it('renders node count', () => {
        const graph = createTestGraph({
          components: [
            {
              sourceLocation: testSourceLocation,
              id: nodeIdSchema.parse('node-1'),
              type: 'API',
              apiType: 'REST',
              name: 'POST /orders',
              domain: domainNameSchema.parse('orders'),
              module: moduleNameSchema.parse('api'),
            },
            {
              sourceLocation: testSourceLocation,
              id: nodeIdSchema.parse('node-2'),
              type: 'API',
              apiType: 'REST',
              name: 'POST /items',
              domain: domainNameSchema.parse('orders'),
              module: moduleNameSchema.parse('api'),
            },
            {
              sourceLocation: testSourceLocation,
              id: nodeIdSchema.parse('node-3'),
              type: 'UseCase',
              name: 'PlaceOrder',
              domain: domainNameSchema.parse('orders'),
              module: moduleNameSchema.parse('usecases'),
            },
          ],
        })

        render(
          <SchemaModal
            graph={graph}
            graphName={createGraphName('test.json')}
            isOpen={true}
            onClose={vi.fn()}
          />,
        )

        expect(screen.getByText('Total Nodes')).toBeInTheDocument()
        expect(screen.getByText('3')).toBeInTheDocument()
      })

      it('renders edge count', () => {
        render(
          <SchemaModal
            graph={createTestGraph()}
            graphName={createGraphName('test.json')}
            isOpen={true}
            onClose={vi.fn()}
          />,
        )

        expect(screen.getByText('Total Edges')).toBeInTheDocument()
        expect(screen.getByText('1')).toBeInTheDocument()
      })

      it('renders domain count', () => {
        const graph = createTestGraph({
          metadata: {
            name: 'test-graph',
            description: 'Test',
            generated: '2024-01-15T10:30:00Z',
            domains: {
              orders: {
                description: 'Order',
                systemType: 'domain',
              },
              inventory: {
                description: 'Inventory',
                systemType: 'domain',
              },
              shipping: {
                description: 'Shipping',
                systemType: 'domain',
              },
              payments: {
                description: 'Payments',
                systemType: 'domain',
              },
            },
          },
        })

        render(
          <SchemaModal
            graph={graph}
            graphName={createGraphName('test.json')}
            isOpen={true}
            onClose={vi.fn()}
          />,
        )

        expect(screen.getByText('Domains')).toBeInTheDocument()
        expect(screen.getByText('4')).toBeInTheDocument()
      })

      it('renders generated date when available', () => {
        const graph = createTestGraph()
        graph.metadata.generated = '2024-06-15T14:30:00Z'

        render(
          <SchemaModal
            graph={graph}
            graphName={createGraphName('test.json')}
            isOpen={true}
            onClose={vi.fn()}
          />,
        )

        expect(screen.getByText('Generated')).toBeInTheDocument()
        expect(screen.getByText('2024-06-15')).toBeInTheDocument()
      })

      it('renders unknown when generated date missing', () => {
        const graph = createTestGraph()
        delete graph.metadata.generated

        render(
          <SchemaModal
            graph={graph}
            graphName={createGraphName('test.json')}
            isOpen={true}
            onClose={vi.fn()}
          />,
        )

        expect(screen.getByText('Generated')).toBeInTheDocument()
        expect(screen.getByText('Unknown')).toBeInTheDocument()
      })
    })

    describe('JSON viewer', () => {
      it('renders formatted JSON content', () => {
        render(
          <SchemaModal
            graph={createTestGraph()}
            graphName={createGraphName('test.json')}
            isOpen={true}
            onClose={vi.fn()}
          />,
        )

        const jsonViewer = screen.getByTestId('json-viewer')
        expect(jsonViewer).toBeInTheDocument()
        expect(jsonViewer.textContent).toContain('"version"')
        expect(jsonViewer.textContent).toContain('"1.0"')
      })

      it('renders JSON as collapsible tree', () => {
        render(
          <SchemaModal
            graph={createTestGraph()}
            graphName={createGraphName('test.json')}
            isOpen={true}
            onClose={vi.fn()}
          />,
        )

        const jsonViewer = screen.getByTestId('json-viewer')
        const treeView = within(jsonViewer).getByRole('tree')
        expect(treeView).toBeInTheDocument()
      })
    })

    it('copy: copies JSON to clipboard when copy clicked', async () => {
      const user = userEvent.setup()
      const writeText = vi.fn().mockResolvedValue(undefined)
      vi.stubGlobal('navigator', { clipboard: { writeText } })

      render(
        <SchemaModal
          graph={createTestGraph()}
          graphName={createGraphName('test.json')}
          isOpen={true}
          onClose={vi.fn()}
        />,
      )

      await user.click(screen.getByRole('button', { name: /copy/i }))

      expect(writeText).toHaveBeenCalledWith(expect.any(String))
      const firstCall = assertDefined(
        writeText.mock.calls[0],
        'Expected writeText to have been called with arguments',
      )
      const copiedContent = String(firstCall[0])
      expect(copiedContent).toContain('"version": "1.0"')

      vi.unstubAllGlobals()
    })

    it('copy: shows success feedback after copy', async () => {
      const user = userEvent.setup()
      const writeText = vi.fn().mockResolvedValue(undefined)
      vi.stubGlobal('navigator', { clipboard: { writeText } })

      render(
        <SchemaModal
          graph={createTestGraph()}
          graphName={createGraphName('test.json')}
          isOpen={true}
          onClose={vi.fn()}
        />,
      )

      await user.click(screen.getByRole('button', { name: /copy/i }))

      await waitFor(() => {
        expect(screen.getByText(/copied/i)).toBeInTheDocument()
      })

      vi.unstubAllGlobals()
    })

    it('copy: clears copy feedback after timeout', async () => {
      vi.useFakeTimers()
      const writeText = vi.fn().mockResolvedValue(undefined)
      vi.stubGlobal('navigator', { clipboard: { writeText } })

      render(
        <SchemaModal
          graph={createTestGraph()}
          graphName={createGraphName('test.json')}
          isOpen={true}
          onClose={vi.fn()}
        />,
      )

      const copyButton = screen.getByRole('button', { name: /copy/i })
      fireEvent.click(copyButton)

      await vi.waitFor(() => {
        expect(screen.getByText(/copied/i)).toBeInTheDocument()
      })

      vi.advanceTimersByTime(2000)

      await vi.waitFor(() => {
        expect(screen.getByRole('button', { name: /copy/i })).toHaveTextContent('Copy')
      })

      vi.unstubAllGlobals()
      vi.useRealTimers()
    })

    it('download: triggers download when download clicked', async () => {
      const user = userEvent.setup()
      const createObjectURL = vi.fn().mockReturnValue('blob:test-url')
      const revokeObjectURL = vi.fn()
      URL.createObjectURL = createObjectURL
      URL.revokeObjectURL = revokeObjectURL

      const clickSpy = vi.fn()
      const createElementOriginal = document.createElement.bind(document)
      vi.spyOn(document, 'createElement').mockImplementation((tagName: string) => {
        const element = createElementOriginal(tagName)
        if (tagName === 'a') {
          element.click = clickSpy
        }
        return element
      })

      render(
        <SchemaModal
          graph={createTestGraph()}
          graphName={createGraphName('my-schema.json')}
          isOpen={true}
          onClose={vi.fn()}
        />,
      )

      await user.click(screen.getByRole('button', { name: /download/i }))

      expect(createObjectURL).toHaveBeenCalledWith(expect.any(Blob))
      expect(clickSpy).toHaveBeenCalledWith()
      expect(revokeObjectURL).toHaveBeenCalledWith('blob:test-url')

      vi.restoreAllMocks()
    })

    it('download: disables download button when graphName is undefined', () => {
      render(
        <SchemaModal
          graph={createTestGraph()}
          graphName={undefined}
          isOpen={true}
          onClose={vi.fn()}
        />,
      )

      const downloadButton = screen.getByRole('button', { name: /download/i })
      expect(downloadButton).toBeDisabled()
    })

    it('download: throws SchemaError when graphName is undefined', () => {
      expect(() => validateDownloadGraphName(undefined)).toThrow(SchemaError)
    })

    it('download: throws SchemaError with descriptive message', () => {
      expect(() => validateDownloadGraphName(undefined)).toThrow('Cannot download: graphName is required')
    })

    it('download: passes validation when graphName is defined', () => {
      expect(() => validateDownloadGraphName('test.json')).not.toThrow()
    })

    describe('backdrop interaction', () => {
      it('calls onClose when backdrop clicked', async () => {
        const user = userEvent.setup()
        const onClose = vi.fn()

        render(
          <SchemaModal
            graph={createTestGraph()}
            graphName={createGraphName('test.json')}
            isOpen={true}
            onClose={onClose}
          />,
        )

        await user.click(screen.getByTestId('modal-backdrop'))

        expect(onClose).toHaveBeenCalledWith(expect.anything())
      })

      it('backdrop is a button element for native keyboard accessibility', async () => {
        render(
          <SchemaModal
            graph={createTestGraph()}
            graphName={createGraphName('test.json')}
            isOpen={true}
            onClose={vi.fn()}
          />,
        )

        const backdrop = screen.getByTestId('modal-backdrop')
        expect(backdrop.tagName).toBe('BUTTON')
      })

      it('does not close on other keys pressed on backdrop', () => {
        const onClose = vi.fn()

        render(
          <SchemaModal
            graph={createTestGraph()}
            graphName={createGraphName('test.json')}
            isOpen={true}
            onClose={onClose}
          />,
        )

        const backdrop = screen.getByTestId('modal-backdrop')
        fireEvent.keyDown(backdrop, { key: 'Tab' })

        expect(onClose).not.toHaveBeenCalled()
      })

      it('does not close when clicking modal content', async () => {
        const user = userEvent.setup()
        const onClose = vi.fn()

        render(
          <SchemaModal
            graph={createTestGraph()}
            graphName={createGraphName('test.json')}
            isOpen={true}
            onClose={onClose}
          />,
        )

        await user.click(screen.getByTestId('json-viewer'))

        expect(onClose).not.toHaveBeenCalled()
      })
    })

    describe('keyboard navigation', () => {
      it('calls onClose when Escape pressed', async () => {
        const user = userEvent.setup()
        const onClose = vi.fn()

        render(
          <SchemaModal
            graph={createTestGraph()}
            graphName={createGraphName('test.json')}
            isOpen={true}
            onClose={onClose}
          />,
        )

        await user.keyboard('{Escape}')

        expect(onClose).toHaveBeenCalledWith()
      })
    })

    describe('accessibility', () => {
      it('has role dialog', () => {
        render(
          <SchemaModal
            graph={createTestGraph()}
            graphName={createGraphName('test.json')}
            isOpen={true}
            onClose={vi.fn()}
          />,
        )

        expect(screen.getByRole('dialog')).toBeInTheDocument()
      })

      it('uses semantic dialog element', () => {
        render(
          <SchemaModal
            graph={createTestGraph()}
            graphName={createGraphName('test.json')}
            isOpen={true}
            onClose={vi.fn()}
          />,
        )

        const dialog = screen.getByRole('dialog')
        expect(dialog.tagName).toBe('DIALOG')
      })

      it('has aria-labelledby pointing to title', () => {
        render(
          <SchemaModal
            graph={createTestGraph()}
            graphName={createGraphName('test.json')}
            isOpen={true}
            onClose={vi.fn()}
          />,
        )

        const dialog = screen.getByRole('dialog')
        const labelledBy = assertDefined(
          dialog.getAttribute('aria-labelledby'),
          'Expected dialog to have aria-labelledby attribute',
        )

        const title = document.getElementById(labelledBy)
        expect(title).toBeInTheDocument()
      })
    })
  })
})
