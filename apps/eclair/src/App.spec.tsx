import {
  render, screen
} from '@testing-library/react'
import type { RenderResult } from '@testing-library/react'
import { MemoryRouter } from 'react-router-dom'
import {useEffect} from 'react'
import {
  beforeEach, describe, expect, it
} from 'vitest'
import {
  AppContent, useRequiredGraph
} from './App'
import { GraphError } from '@/errors'
import {
  GraphProvider, useGraph
} from '@/contexts/GraphContext'
import { ExportProvider } from '@/contexts/ExportContext'
import { ThemeProvider } from '@/contexts/ThemeContext'
import type { RiviereGraph } from '@/types/riviere'
import {
  parseNode, parseDomainMetadata
} from '@/lib/riviereTestFixtures'

const testSourceLocation = {
  repository: 'test-repo',
  filePath: 'src/test.ts',
}

const mockGraph: RiviereGraph = {
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
      name: 'Test UI',
      domain: 'test',
      module: 'ui',
      route: '/test',
    }),
  ],
  links: [],
}

function GraphLoader({ graph }: { graph: RiviereGraph | null }): null {
  const {
    setGraph, clearGraph 
  } = useGraph()
  useEffect(() => {
    if (graph === null) {
      clearGraph()
    } else {
      setGraph(graph)
    }
  }, [graph, setGraph, clearGraph])
  return null
}

function renderWithRouter(
  initialPath: string,
  options: { graph: RiviereGraph | null } = { graph: null },
): RenderResult {
  return render(
    <ThemeProvider>
      <GraphProvider>
        <ExportProvider>
          <GraphLoader graph={options.graph} />
          <MemoryRouter initialEntries={[initialPath]}>
            <AppContent />
          </MemoryRouter>
        </ExportProvider>
      </GraphProvider>
    </ThemeProvider>,
  )
}

describe('App routing', () => {
  beforeEach(() => {
    localStorage.clear()
  })

  it('renders FlowsPage at /flows route', async () => {
    renderWithRouter('/flows', { graph: mockGraph })

    await screen.findByRole('heading', { name: 'Flows' })
    expect(screen.getByPlaceholderText('Search flows...')).toBeInTheDocument()
  })

  it('renders OverviewPage at / route', async () => {
    renderWithRouter('/', { graph: mockGraph })

    expect(await screen.findByRole('heading', { name: 'Overview' })).toBeInTheDocument()
  })

  it('renders FullGraphPage at /full-graph route', async () => {
    renderWithRouter('/full-graph', { graph: mockGraph })

    expect(await screen.findByTestId('force-graph-container')).toBeInTheDocument()
  })

  it('renders DomainMapPage component at /domains route', async () => {
    renderWithRouter('/domains', { graph: mockGraph })

    const links = await screen.findAllByRole('link')
    expect(links.length).toBeGreaterThan(0)
  })

  it('renders with app shell sidebar', async () => {
    renderWithRouter('/flows', { graph: mockGraph })

    await screen.findByRole('heading', { name: 'Flows' })
    expect(screen.getByRole('complementary')).toBeInTheDocument()
  })

  it('renders app shell with sidebar toggle', async () => {
    renderWithRouter('/flows', { graph: mockGraph })

    await screen.findByRole('heading', { name: 'Flows' })
    expect(screen.getByTestId('sidebar-toggle')).toBeInTheDocument()
  })
})

describe('App routing without graph', () => {
  beforeEach(() => {
    localStorage.clear()
  })

  it('renders EmptyState at / route when no graph loaded', () => {
    renderWithRouter('/')

    expect(screen.getByText(/welcome to éclair/i)).toBeInTheDocument()
  })

  it('renders EmptyState at /full-graph route when no graph loaded', () => {
    renderWithRouter('/full-graph')

    expect(screen.getByText(/welcome to éclair/i)).toBeInTheDocument()
  })

  it('renders EmptyState at /domains route when no graph loaded', () => {
    renderWithRouter('/domains')

    expect(screen.getByText(/welcome to éclair/i)).toBeInTheDocument()
  })

  it('renders EmptyState at /flows route when no graph loaded', () => {
    renderWithRouter('/flows')

    expect(screen.getByText(/welcome to éclair/i)).toBeInTheDocument()
  })

  it('renders EmptyState at /entities route when no graph loaded', () => {
    renderWithRouter('/entities')

    expect(screen.getByText(/welcome to éclair/i)).toBeInTheDocument()
  })

  it('renders EmptyState at /events route when no graph loaded', () => {
    renderWithRouter('/events')

    expect(screen.getByText(/welcome to éclair/i)).toBeInTheDocument()
  })

  it('renders EmptyState at /domains/:domainId route when no graph loaded', () => {
    renderWithRouter('/domains/test-domain')

    expect(screen.getByText(/welcome to éclair/i)).toBeInTheDocument()
  })
})

describe('useRequiredGraph', () => {
  function TestComponent(): React.ReactElement {
    const graph = useRequiredGraph()
    return <div>{graph.version}</div>
  }

  it('throws GraphError when graph is null', () => {
    expect(() => {
      render(
        <ThemeProvider>
          <GraphProvider>
            <TestComponent />
          </GraphProvider>
        </ThemeProvider>,
      )
    }).toThrow(GraphError)
  })

  it('throws with descriptive message when graph is null', () => {
    expect(() => {
      render(
        <ThemeProvider>
          <GraphProvider>
            <TestComponent />
          </GraphProvider>
        </ThemeProvider>,
      )
    }).toThrow('useRequiredGraph called without a graph')
  })

})
