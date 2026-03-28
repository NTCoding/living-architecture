import '@testing-library/jest-dom/vitest'
import {
  render, screen 
} from '@testing-library/react'
import type { RenderResult } from '@testing-library/react'
import { MemoryRouter } from 'react-router-dom'
import { useEffect } from 'react'
import {
  beforeEach, describe, expect, it 
} from 'vitest'
import {
  AppContent, useRequiredGraph 
} from './App'
import { GraphError } from '@/platform/infra/errors/errors'
import {
  GraphProvider, useGraph 
} from '@/platform/infra/graph-state/GraphContext'
import { ExportProvider } from '@/platform/infra/export/ExportContext'
import { ThemeProvider } from '@/platform/infra/theme/ThemeContext'
import type { RiviereGraph } from '@living-architecture/riviere-schema'
import {
  parseNode, parseDomainMetadata 
} from '@/platform/infra/__fixtures__/riviere-test-fixtures'

function hasInitialEvolutionSummary(node: Element | null): boolean {
  return node instanceof HTMLSpanElement && node.textContent?.includes('Initial split architecture')
}

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

  it('renders ArchitectureEvolutionPage at /evolution route', async () => {
    renderWithRouter('/evolution', { graph: mockGraph })

    expect(await screen.findByText('Architecture Evolution')).toBeInTheDocument()
    expect(
      await screen.findByText((_, node) => hasInitialEvolutionSummary(node)),
    ).toBeInTheDocument()
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

  it('renders ArchitectureEvolutionPage at /evolution route when no graph loaded', async () => {
    renderWithRouter('/evolution')

    expect(await screen.findByText('Architecture Evolution')).toBeInTheDocument()
    expect(
      await screen.findByText((_, node) => hasInitialEvolutionSummary(node)),
    ).toBeInTheDocument()
  })

  it('renders ComparisonPage at /compare when no graph loaded', async () => {
    renderWithRouter('/compare')

    expect(await screen.findByRole('heading', { name: /compare versions/i })).toBeInTheDocument()
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

  it('returns graph when available', async () => {
    function TestComponent(): React.ReactElement {
      const graph = useRequiredGraph()
      return <div>{graph.version}</div>
    }

    function SetGraphAndRender(): React.ReactElement | null {
      const {
        graph, setGraph 
      } = useGraph()

      useEffect(() => {
        setGraph(mockGraph)
      }, [setGraph])

      if (graph === null) {
        return null
      }

      return <TestComponent />
    }

    render(
      <ThemeProvider>
        <GraphProvider>
          <SetGraphAndRender />
        </GraphProvider>
      </ThemeProvider>,
    )

    expect(await screen.findByText('1.0')).toBeInTheDocument()
  })
})
