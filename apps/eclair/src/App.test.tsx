import { render, screen } from '@testing-library/react'
import { MemoryRouter } from 'react-router-dom'
import { beforeEach, describe, expect, it, vi } from 'vitest'
import { App } from './App'
import type { RiviereGraph } from '@/types/riviere'
import { parseNode } from '@/lib/riviereTestData'

const testSourceLocation = { repository: 'test-repo', filePath: 'src/test.ts' }

const mockGraph: RiviereGraph = {
  version: '1.0',
  metadata: { domains: {} },
  components: [
    parseNode({ sourceLocation: testSourceLocation, id: 'ui-1', type: 'UI', name: 'Test UI', domain: 'test', module: 'ui', route: '/test' }),
  ],
  links: [],
}

const mockUseGraph = vi.fn()

vi.mock('@/contexts/GraphContext', () => ({
  GraphProvider: ({ children }: { children: React.ReactNode }) => <>{children}</>,
  useGraph: () => mockUseGraph(),
}))

vi.mock('@/features/empty-state', () => ({
  EmptyState: () => <div data-testid="empty-state">Upload a graph to get started</div>,
}))

vi.mock('@/contexts/ThemeContext', () => ({
  useTheme: () => ({ theme: 'stream', setTheme: vi.fn() }),
}))

vi.mock('@/components/Logo', () => ({
  Logo: () => <div data-testid="logo">Logo</div>,
}))

vi.mock('@/components/ThemeSwitcher', () => ({
  ThemeSwitcher: () => <div data-testid="theme-switcher">ThemeSwitcher</div>,
}))

function renderWithRouter(initialPath: string): ReturnType<typeof render> {
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

    expect(screen.getByRole('heading', { name: 'Flows' })).toBeInTheDocument()
    expect(screen.getByPlaceholderText('Search flows...')).toBeInTheDocument()
  })

  it('renders OverviewPage at / route', () => {
    renderWithRouter('/')

    expect(screen.getByRole('heading', { name: 'Overview' })).toBeInTheDocument()
  })

  it('renders FullGraphPage at /full-graph route', () => {
    renderWithRouter('/full-graph')

    expect(screen.getByTestId('force-graph-container')).toBeInTheDocument()
  })

  it('renders DomainMapPage component at /domains route', () => {
    renderWithRouter('/domains')

    expect(screen.getAllByRole('link').length).toBeGreaterThan(0)
  })

  it('renders with graph provider wrapper', () => {
    renderWithRouter('/flows')

    expect(screen.getByTestId('logo')).toBeInTheDocument()
  })

  it('renders app shell with header', () => {
    renderWithRouter('/flows')

    expect(screen.getByTestId('theme-switcher')).toBeInTheDocument()
  })
})

describe('App routing without graph', () => {
  beforeEach(() => {
    mockNoGraph()
  })

  it('renders EmptyState at / route when no graph loaded', () => {
    renderWithRouter('/')

    expect(screen.getByTestId('empty-state')).toBeInTheDocument()
  })

  it('renders EmptyState at /full-graph route when no graph loaded', () => {
    renderWithRouter('/full-graph')

    expect(screen.getByTestId('empty-state')).toBeInTheDocument()
  })

  it('renders EmptyState at /domains route when no graph loaded', () => {
    renderWithRouter('/domains')

    expect(screen.getByTestId('empty-state')).toBeInTheDocument()
  })

  it('renders EmptyState at /flows route when no graph loaded', () => {
    renderWithRouter('/flows')

    expect(screen.getByTestId('empty-state')).toBeInTheDocument()
  })

  it('renders EmptyState at /entities route when no graph loaded', () => {
    renderWithRouter('/entities')

    expect(screen.getByTestId('empty-state')).toBeInTheDocument()
  })

  it('renders EmptyState at /events route when no graph loaded', () => {
    renderWithRouter('/events')

    expect(screen.getByTestId('empty-state')).toBeInTheDocument()
  })

  it('renders EmptyState at /domains/:domainId route when no graph loaded', () => {
    renderWithRouter('/domains/test-domain')

    expect(screen.getByTestId('empty-state')).toBeInTheDocument()
  })
})
