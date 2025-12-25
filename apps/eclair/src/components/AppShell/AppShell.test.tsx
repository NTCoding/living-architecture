import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { MemoryRouter } from 'react-router-dom'
import { describe, expect, it, vi } from 'vitest'
import { AppShell } from './AppShell'
import { ExportProvider } from '@/contexts/ExportContext'
import type { GraphName, RiviereGraph } from '@/types/riviere'
import { GraphNameSchema, NodeIdSchema, DomainNameSchema, ModuleNameSchema } from '@/types/riviere'


const testSourceLocation = { repository: 'test-repo', filePath: 'src/test.ts' }
function createGraphName(name: string): GraphName {
  return GraphNameSchema.parse(name)
}

function createTestGraph(name: string): RiviereGraph {
  return {
    version: '1.0.0',
    metadata: {
      name,
      description: 'Test graph',
      generated: '2024-01-15T10:30:00Z',
      domains: {
        orders: { description: 'Order management', systemType: 'domain' },
      },
    },
    components: [
      {
        sourceLocation: testSourceLocation,
        id: NodeIdSchema.parse('node-1'),
        type: 'API',
        apiType: 'REST',
        name: 'POST /orders',
        domain: DomainNameSchema.parse('orders'),
        module: ModuleNameSchema.parse('api'),
      },
    ],
    links: [],
  }
}

vi.mock('@/contexts/ThemeContext', () => ({
  useTheme: () => ({ theme: 'stream', setTheme: vi.fn() }),
}))

vi.mock('@/contexts/GraphContext', () => ({
  useGraph: () => ({ clearGraph: vi.fn() }),
}))

vi.mock('@/components/Logo', () => ({
  Logo: () => <div data-testid="logo">Logo</div>,
}))

vi.mock('@/components/ThemeSwitcher', () => ({
  ThemeSwitcher: () => <div data-testid="theme-switcher">ThemeSwitcher</div>,
}))

function renderWithRouter(ui: React.ReactElement): ReturnType<typeof render> {
  return render(<MemoryRouter><ExportProvider>{ui}</ExportProvider></MemoryRouter>)
}

function setViewportWidth(width: number): void {
  Object.defineProperty(window, 'innerWidth', {
    writable: true,
    configurable: true,
    value: width,
  })
}

describe('AppShell', () => {
  it('starts with sidebar collapsed on mobile viewport regardless of route', () => {
    setViewportWidth(767)

    render(
      <MemoryRouter initialEntries={['/']}>
        <ExportProvider>
          <AppShell hasGraph={false} graphName={undefined} graph={null}>
            <div>Content</div>
          </AppShell>
        </ExportProvider>
      </MemoryRouter>
    )

    const sidebar = screen.getByRole('complementary')
    expect(sidebar).toHaveClass('w-16')
  })

  it('starts with sidebar expanded on desktop viewport for non-collapsed routes', () => {
    setViewportWidth(1024)

    render(
      <MemoryRouter initialEntries={['/']}>
        <ExportProvider>
          <AppShell hasGraph={false} graphName={undefined} graph={null}>
            <div>Content</div>
          </AppShell>
        </ExportProvider>
      </MemoryRouter>
    )

    const sidebar = screen.getByRole('complementary')
    expect(sidebar).toHaveClass('w-60')
  })

  it('starts with sidebar collapsed on desktop viewport for collapsed-by-default routes', () => {
    setViewportWidth(1024)

    render(
      <MemoryRouter initialEntries={['/full-graph']}>
        <ExportProvider>
          <AppShell hasGraph={false} graphName={undefined} graph={null}>
            <div>Content</div>
          </AppShell>
        </ExportProvider>
      </MemoryRouter>
    )

    const sidebar = screen.getByRole('complementary')
    expect(sidebar).toHaveClass('w-16')
  })

  it('renders children content', () => {
    renderWithRouter(
      <AppShell hasGraph={false} graphName={undefined} graph={null}>
        <div data-testid="child-content">Main Content</div>
      </AppShell>
    )

    expect(screen.getByTestId('child-content')).toBeInTheDocument()
    expect(screen.getByText('Main Content')).toBeInTheDocument()
  })

  it('renders Sidebar component', () => {
    renderWithRouter(
      <AppShell hasGraph={false} graphName={undefined} graph={null}>
        <div>Content</div>
      </AppShell>
    )

    expect(screen.getByText('Éclair')).toBeInTheDocument()
    expect(screen.getByRole('link', { name: /Overview/i })).toBeInTheDocument()
  })

  it('renders Header component', () => {
    renderWithRouter(
      <AppShell hasGraph={false} graphName={undefined} graph={null}>
        <div>Content</div>
      </AppShell>
    )

    expect(screen.getByRole('button', { name: /Upload Graph/i })).toBeInTheDocument()
  })

  it('passes graph to Header and displays metadata name', () => {
    const graph = createTestGraph('Test Graph')
    renderWithRouter(
      <AppShell hasGraph={true} graphName={createGraphName('test-graph.json')} graph={graph}>
        <div>Content</div>
      </AppShell>
    )

    expect(screen.getByText('Test Graph')).toBeInTheDocument()
  })

  it('passes hasGraph to Sidebar for enabling/disabling nav items', () => {
    renderWithRouter(
      <AppShell hasGraph={false} graphName={undefined} graph={null}>
        <div>Content</div>
      </AppShell>
    )

    expect(screen.getByText('Flows').closest('span[aria-disabled]')).toHaveAttribute('aria-disabled', 'true')
    expect(screen.getByText('Domain Map').closest('span[aria-disabled]')).toHaveAttribute('aria-disabled', 'true')
  })

  it('renders main content area', () => {
    renderWithRouter(
      <AppShell hasGraph={false} graphName={undefined} graph={null}>
        <div>Content</div>
      </AppShell>
    )

    const main = document.querySelector('main')
    expect(main).toBeInTheDocument()
  })

  it('toggles sidebar collapsed state when toggle button clicked', async () => {
    const user = userEvent.setup()

    renderWithRouter(
      <AppShell hasGraph={false} graphName={undefined} graph={null}>
        <div>Content</div>
      </AppShell>
    )

    const toggleButton = screen.getByTestId('sidebar-toggle')
    await user.click(toggleButton)

    expect(toggleButton).toBeInTheDocument()
  })

  it('renders author attribution footer with links', () => {
    renderWithRouter(
      <AppShell hasGraph={false} graphName={undefined} graph={null}>
        <div>Content</div>
      </AppShell>
    )

    const footer = document.querySelector('footer')
    expect(footer).toBeInTheDocument()

    const nickTuneLink = screen.getByRole('link', { name: 'Nick Tune' })
    expect(nickTuneLink).toHaveAttribute('href', 'https://nick-tune.me')
    expect(nickTuneLink).toHaveAttribute('target', '_blank')

    const linkedInLink = screen.getByRole('link', { name: 'LinkedIn' })
    expect(linkedInLink).toHaveAttribute('href', 'https://linkedin.com/in/nick-tune')
    expect(linkedInLink).toHaveAttribute('target', '_blank')

    const githubLink = screen.getByRole('link', { name: 'GitHub' })
    expect(githubLink).toHaveAttribute('href', 'https://github.com/ntcoding')
    expect(githubLink).toHaveAttribute('target', '_blank')

    const blueskyLink = screen.getByRole('link', { name: 'Bluesky' })
    expect(blueskyLink).toHaveAttribute('href', 'https://bsky.app/profile/nick-tune.me')
    expect(blueskyLink).toHaveAttribute('target', '_blank')
  })
})
