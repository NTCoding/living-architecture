import {
  render, screen, waitFor
} from '@testing-library/react'
import {
  GraphProvider, useGraph
} from '@/contexts/GraphContext'
import { EmptyState } from './EmptyState'
import {
  parseNode, parseDomainMetadata
} from '@/lib/riviereTestFixtures'
import type {
  RiviereGraph, SourceLocation
} from '@/types/riviere'
import {
  dropFilesOnElement, getDropZone
} from '@/test/setup'

const testSourceLocation: SourceLocation = {
  repository: 'test-repo',
  filePath: 'src/test.ts',
}

const validGraph: RiviereGraph = {
  version: '1.0',
  metadata: {
    name: 'Test Graph',
    domains: parseDomainMetadata({
      test: {
        description: 'Test',
        systemType: 'domain',
      },
    }),
  },
  components: [
    parseNode({
      sourceLocation: testSourceLocation,
      id: 'n1',
      type: 'UseCase',
      name: 'Test',
      domain: 'test',
      module: 'test',
    }),
  ],
  links: [],
}

function GraphStateDisplay(): React.ReactElement {
  const {
    hasGraph, graphName
  } = useGraph()
  return (
    <div>
      <span data-testid="has-graph">{hasGraph ? 'yes' : 'no'}</span>
      <span data-testid="graph-name">{graphName ?? 'none'}</span>
    </div>
  )
}

function renderEmptyState(): void {
  render(
    <GraphProvider>
      <EmptyState />
      <GraphStateDisplay />
    </GraphProvider>,
  )
}

describe('EmptyState', () => {
  it('renders welcome message', () => {
    renderEmptyState()

    expect(screen.getByText(/welcome to éclair/i)).toBeInTheDocument()
    expect(screen.getByText(/upload a rivière architecture graph/i)).toBeInTheDocument()
  })

  it('displays FileUpload component', () => {
    renderEmptyState()

    expect(screen.getByText(/drop your rivière graph here/i)).toBeInTheDocument()
    expect(screen.getByRole('button', { name: /select file/i })).toBeInTheDocument()
  })

  it('displays explanatory content about Rivière graphs', () => {
    renderEmptyState()

    expect(screen.getByText(/what is a rivière graph/i)).toBeInTheDocument()
    expect(
      screen.getByText(/json format for describing flow-based software architecture/i),
    ).toBeInTheDocument()
  })

  it('shows error when file validation fails', async () => {
    renderEmptyState()

    const dropZone = getDropZone()

    await dropFilesOnElement(dropZone, [
      {
        name: 'bad.json',
        content: '{"not": "valid graph"}',
        type: 'application/json' 
      },
    ])

    await waitFor(() => {
      expect(screen.getByText(/validation failed/i)).toBeInTheDocument()
    })
  })

  it('sets graph in context when valid file loaded', async () => {
    const validJsonString = JSON.stringify(validGraph)

    renderEmptyState()

    expect(screen.getByTestId('has-graph')).toHaveTextContent('no')

    const dropZone = getDropZone()

    await dropFilesOnElement(dropZone, [
      {
        name: 'valid.json',
        content: validJsonString,
        type: 'application/json' 
      },
    ])

    await waitFor(() => {
      expect(screen.getByTestId('has-graph')).toHaveTextContent('yes')
    })
    expect(screen.getByTestId('graph-name')).toHaveTextContent('Test Graph')
  })

  it('clears previous error when new valid file loaded', async () => {
    const invalidJson = '{"not": "valid"}'
    const validJsonString = JSON.stringify(validGraph)

    renderEmptyState()

    const dropZone = getDropZone()

    await dropFilesOnElement(dropZone, [
      {
        name: 'bad.json',
        content: invalidJson,
        type: 'application/json' 
      },
    ])

    await waitFor(() => {
      expect(screen.getByText(/validation failed/i)).toBeInTheDocument()
    })

    await dropFilesOnElement(dropZone, [
      {
        name: 'valid.json',
        content: validJsonString,
        type: 'application/json' 
      },
    ])

    await waitFor(() => {
      expect(screen.queryByText(/validation failed/i)).not.toBeInTheDocument()
    })
  })

  describe('View Demo', () => {
    it('renders View Demo link', () => {
      renderEmptyState()
      expect(screen.getByRole('link', { name: /view demo/i })).toBeInTheDocument()
    })

    it('View Demo link navigates to demo mode', () => {
      renderEmptyState()
      const link = screen.getByRole('link', { name: /view demo/i })
      expect(link).toHaveAttribute('href', '?demo=true')
    })

    it('displays explanatory text for demo', () => {
      renderEmptyState()
      expect(screen.getByText(/want to see it in action/i)).toBeInTheDocument()
    })
  })
})
