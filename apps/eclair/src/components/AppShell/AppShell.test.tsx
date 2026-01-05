import {
 render, screen 
} from '@testing-library/react'
import type { RenderResult } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { MemoryRouter } from 'react-router-dom'
import {
 describe, expect, it, vi 
} from 'vitest'
import { AppShell } from './AppShell'
import { ExportProvider } from '@/contexts/ExportContext'
import type {
 GraphName, RiviereGraph 
} from '@/types/riviere'
import {
 graphNameSchema, nodeIdSchema, domainNameSchema, moduleNameSchema 
} from '@/types/riviere'
import { parseDomainMetadata } from '@/lib/riviereTestData'


const testSourceLocation = {
 repository: 'test-repo',
filePath: 'src/test.ts' 
}
function createGraphName(name: string): GraphName {
  return graphNameSchema.parse(name)
}

function createTestGraph(name: string): RiviereGraph {
  return {
    version: '1.0',
    metadata: {
      name,
      description: 'Test graph',
      generated: '2024-01-15T10:30:00Z',
      domains: parseDomainMetadata({
orders: {
 description: 'Order management',
systemType: 'domain' 
},
}),
    },
    components: [
      {
        sourceLocation: testSourceLocation,
        id: nodeIdSchema.parse('node-1'),
        type: 'API',
        apiType: 'REST',
        httpMethod: 'POST',
        path: '/orders',
        name: 'POST /orders',
        domain: domainNameSchema.parse('orders'),
        module: moduleNameSchema.parse('api'),
      },
    ],
    links: [],
  }
}

vi.mock('@/contexts/ThemeContext', () => ({
useTheme: () => ({
 theme: 'stream',
setTheme: vi.fn() 
}),
}))

vi.mock('@/contexts/GraphContext', () => ({useGraph: () => ({ clearGraph: vi.fn() }),}))

vi.mock('@/components/Logo/Logo', () => ({Logo: () => <div data-testid="logo">Logo</div>,}))

vi.mock('@/components/ThemeSwitcher/ThemeSwitcher', () => ({ThemeSwitcher: () => <div data-testid="theme-switcher">ThemeSwitcher</div>,}))

function renderWithRouter(ui: React.ReactElement): RenderResult {
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

    const childContent = screen.getByTestId('child-content')
    expect(childContent).toBeInTheDocument()
    const mainContent = screen.getByText('Main Content')
    expect(mainContent).toBeInTheDocument()
  })

  it('renders Sidebar component', () => {
    renderWithRouter(
      <AppShell hasGraph={false} graphName={undefined} graph={null}>
        <div>Content</div>
      </AppShell>
    )

    const eclairText = screen.getByText('Éclair')
    expect(eclairText).toBeInTheDocument()
    const overviewLink = screen.getByRole('link', { name: /Overview/i })
    expect(overviewLink).toBeInTheDocument()
  })

  it('renders Header component', () => {
    renderWithRouter(
      <AppShell hasGraph={false} graphName={undefined} graph={null}>
        <div>Content</div>
      </AppShell>
    )

    const uploadButton = screen.getByRole('button', { name: /Upload Graph/i })
    expect(uploadButton).toBeInTheDocument()
  })

  it('passes graph to Header and displays metadata name', () => {
    const graph = createTestGraph('Test Graph')
    renderWithRouter(
      <AppShell hasGraph={true} graphName={createGraphName('test-graph.json')} graph={graph}>
        <div>Content</div>
      </AppShell>
    )

    const graphName = screen.getByText('Test Graph')
    expect(graphName).toBeInTheDocument()
  })

  it('passes hasGraph to Sidebar for enabling/disabling nav items', () => {
    renderWithRouter(
      <AppShell hasGraph={false} graphName={undefined} graph={null}>
        <div>Content</div>
      </AppShell>
    )

    const flowsText = screen.getByText('Flows')
    const flowsDisabled = flowsText.closest('span[aria-disabled]')
    expect(flowsDisabled).toHaveAttribute('aria-disabled', 'true')
    const domainMapText = screen.getByText('Domain Map')
    const domainMapDisabled = domainMapText.closest('span[aria-disabled]')
    expect(domainMapDisabled).toHaveAttribute('aria-disabled', 'true')
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
