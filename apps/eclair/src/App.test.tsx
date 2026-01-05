import {
 render, screen 
} from '@testing-library/react'
import type { RenderResult } from '@testing-library/react'
import { MemoryRouter } from 'react-router-dom'
import {
 beforeEach, describe, expect, it, vi 
} from 'vitest'
import { App } from './App'
import type { RiviereGraph } from '@/types/riviere'
import {
 parseNode, parseDomainMetadata 
} from '@/lib/riviereTestData'

const testSourceLocation = {
 repository: 'test-repo',
filePath: 'src/test.ts' 
}

const mockGraph: RiviereGraph = {
  version: '1.0',
  metadata: {
 domains: parseDomainMetadata({
 'test-domain': {
 description: 'Test domain',
systemType: 'domain' 
} 
}) 
},
  components: [
    parseNode({
 sourceLocation: testSourceLocation,
id: 'ui-1',
type: 'UI',
name: 'Test UI',
domain: 'test',
module: 'ui',
route: '/test' 
}),
  ],
  links: [],
}

type UseGraphReturn = {
  graph: RiviereGraph | null
  hasGraph: boolean
  graphName: string | null
  setGraph: ReturnType<typeof vi.fn>
}

const mockUseGraph = vi.fn<[], UseGraphReturn>()

vi.mock('@/contexts/GraphContext', () => ({
  GraphProvider: ({ children }: { children: React.ReactNode }) => <>{children}</>,
  useGraph: () => mockUseGraph(),
}))

vi.mock('@/features/empty-state/EmptyState', () => ({EmptyState: () => <div data-testid="empty-state">Upload a graph to get started</div>,}))

vi.mock('@/contexts/ThemeContext', () => ({
useTheme: () => ({
 theme: 'stream',
setTheme: vi.fn() 
}),
}))

vi.mock('@/components/Logo/Logo', () => ({Logo: () => <div data-testid="logo">Logo</div>,}))

vi.mock('@/components/ThemeSwitcher/ThemeSwitcher', () => ({ThemeSwitcher: () => <div data-testid="theme-switcher">ThemeSwitcher</div>,}))

function renderWithRouter(initialPath: string): RenderResult {
  return render(
    <MemoryRouter initialEntries={[initialPath]}>
      <App />
    </MemoryRouter>
  )
}

function mockGraphLoaded(): void {
  mockUseGraph.mockReturnValue({
    graph: mockGraph,
    hasGraph: true,
    graphName: 'Test Graph',
    setGraph: vi.fn(),
  })
}

function mockNoGraph(): void {
  mockUseGraph.mockReturnValue({
    graph: null,
    hasGraph: false,
    graphName: null,
    setGraph: vi.fn(),
  })
}

describe('App routing', () => {
  beforeEach(() => {
    mockGraphLoaded()
  })

  it('renders FlowsPage at /flows route', () => {
    renderWithRouter('/flows')

    const heading = screen.getByRole('heading', { name: 'Flows' })
    expect(heading).toBeInTheDocument()
    const searchInput = screen.getByPlaceholderText('Search flows...')
    expect(searchInput).toBeInTheDocument()
  })

  it('renders OverviewPage at / route', () => {
    renderWithRouter('/')

    const heading = screen.getByRole('heading', { name: 'Overview' })
    expect(heading).toBeInTheDocument()
  })

  it('renders FullGraphPage at /full-graph route', () => {
    renderWithRouter('/full-graph')

    const container = screen.getByTestId('force-graph-container')
    expect(container).toBeInTheDocument()
  })

  it('renders DomainMapPage component at /domains route', () => {
    renderWithRouter('/domains')

    const links = screen.getAllByRole('link')
    expect(links.length).toBeGreaterThan(0)
  })

  it('renders with graph provider wrapper', () => {
    renderWithRouter('/flows')

    const logo = screen.getByTestId('logo')
    expect(logo).toBeInTheDocument()
  })

  it('renders app shell with header', () => {
    renderWithRouter('/flows')

    const themeSwitcher = screen.getByTestId('theme-switcher')
    expect(themeSwitcher).toBeInTheDocument()
  })
})

describe('App routing without graph', () => {
  beforeEach(() => {
    mockNoGraph()
  })

  it('renders EmptyState at / route when no graph loaded', () => {
    renderWithRouter('/')

    const emptyState = screen.getByTestId('empty-state')
    expect(emptyState).toBeInTheDocument()
  })

  it('renders EmptyState at /full-graph route when no graph loaded', () => {
    renderWithRouter('/full-graph')

    const emptyState = screen.getByTestId('empty-state')
    expect(emptyState).toBeInTheDocument()
  })

  it('renders EmptyState at /domains route when no graph loaded', () => {
    renderWithRouter('/domains')

    const emptyState = screen.getByTestId('empty-state')
    expect(emptyState).toBeInTheDocument()
  })

  it('renders EmptyState at /flows route when no graph loaded', () => {
    renderWithRouter('/flows')

    const emptyState = screen.getByTestId('empty-state')
    expect(emptyState).toBeInTheDocument()
  })

  it('renders EmptyState at /entities route when no graph loaded', () => {
    renderWithRouter('/entities')

    const emptyState = screen.getByTestId('empty-state')
    expect(emptyState).toBeInTheDocument()
  })

  it('renders EmptyState at /events route when no graph loaded', () => {
    renderWithRouter('/events')

    const emptyState = screen.getByTestId('empty-state')
    expect(emptyState).toBeInTheDocument()
  })

  it('renders EmptyState at /domains/:domainId route when no graph loaded', () => {
    renderWithRouter('/domains/test-domain')

    const emptyState = screen.getByTestId('empty-state')
    expect(emptyState).toBeInTheDocument()
  })
})
