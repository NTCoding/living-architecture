import {
 render, screen 
} from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import {
 MemoryRouter, Routes, Route, useLocation 
} from 'react-router-dom'
import {
 describe, expect, it, vi 
} from 'vitest'
import { Sidebar } from './Sidebar'

function LocationDisplay(): React.ReactElement {
  const location = useLocation()
  return <div data-testid="location">{location.pathname}</div>
}

vi.mock('@/contexts/ThemeContext', () => ({
useTheme: () => ({
 theme: 'stream',
setTheme: vi.fn() 
}),
}))

vi.mock('@/components/Logo/Logo', () => ({Logo: () => <div data-testid="logo">Logo</div>,}))

vi.mock('@/components/ThemeSwitcher/ThemeSwitcher', () => ({ThemeSwitcher: () => <div data-testid="theme-switcher">ThemeSwitcher</div>,}))

function renderWithRouter(ui: React.ReactElement, initialPath = '/'): ReturnType<typeof render> {
  return render(<MemoryRouter initialEntries={[initialPath]}>{ui}</MemoryRouter>)
}

describe('Sidebar', () => {
  it('renders all expected navigation items', () => {
    renderWithRouter(<Sidebar hasGraph={true} />)

    expect(screen.getByRole('link', { name: /Overview/i })).toBeInTheDocument()
    expect(screen.getByRole('link', { name: /Flows/i })).toBeInTheDocument()
    expect(screen.getByRole('link', { name: /Domain Map/i })).toBeInTheDocument()
    expect(screen.getByRole('link', { name: /Full Graph/i })).toBeInTheDocument()
    expect(screen.getByRole('link', { name: /Entities/i })).toBeInTheDocument()
    expect(screen.getByRole('link', { name: /Events/i })).toBeInTheDocument()
    expect(screen.getByRole('link', { name: /About Rivière/i })).toBeInTheDocument()
  })

  it('renders Éclair brand name', () => {
    renderWithRouter(<Sidebar hasGraph={true} />)

    expect(screen.getByText('Éclair')).toBeInTheDocument()
  })

  it('renders logo component', () => {
    renderWithRouter(<Sidebar hasGraph={true} />)

    expect(screen.getByTestId('logo')).toBeInTheDocument()
  })

  it('renders theme switcher in sidebar footer', () => {
    renderWithRouter(<Sidebar hasGraph={true} />)

    expect(screen.getByTestId('theme-switcher')).toBeInTheDocument()
    expect(screen.getByText('Theme')).toBeInTheDocument()
  })

  it('disables graph-dependent items when no graph loaded', () => {
    renderWithRouter(<Sidebar hasGraph={false} />)

    expect(screen.getByRole('link', { name: /Overview/i })).toBeInTheDocument()
    expect(screen.getByText('Flows').closest('span[aria-disabled]')).toHaveAttribute('aria-disabled', 'true')
    expect(screen.getByText('Domain Map').closest('span[aria-disabled]')).toHaveAttribute('aria-disabled', 'true')
    expect(screen.getByText('Full Graph').closest('span[aria-disabled]')).toHaveAttribute('aria-disabled', 'true')
    expect(screen.getByText('Entities').closest('span[aria-disabled]')).toHaveAttribute('aria-disabled', 'true')
    expect(screen.getByText('Events').closest('span[aria-disabled]')).toHaveAttribute('aria-disabled', 'true')
  })

  it('enables graph-dependent items when graph is loaded', () => {
    renderWithRouter(<Sidebar hasGraph={true} />)

    expect(screen.getByRole('link', { name: /Overview/i })).toBeInTheDocument()
    expect(screen.getByRole('link', { name: /Flows/i })).toBeInTheDocument()
    expect(screen.getByRole('link', { name: /Domain Map/i })).toBeInTheDocument()
    expect(screen.getByRole('link', { name: /Full Graph/i })).toBeInTheDocument()
    expect(screen.getByRole('link', { name: /Entities/i })).toBeInTheDocument()
    expect(screen.getByRole('link', { name: /Events/i })).toBeInTheDocument()
  })

  it('always enables non-graph items', () => {
    renderWithRouter(<Sidebar hasGraph={false} />)

    expect(screen.getByRole('link', { name: /About Rivière/i })).toBeInTheDocument()
  })

  it('highlights Overview as active when on root path', () => {
    renderWithRouter(<Sidebar hasGraph={true} />, '/')

    const overviewLink = screen.getByRole('link', { name: /Overview/i })
    expect(overviewLink).toHaveClass('text-[var(--primary)]')
  })

  it('navigates to /full-graph when Full Graph is clicked', async () => {
    const user = userEvent.setup()

    render(
      <MemoryRouter initialEntries={['/']}>
        <Sidebar hasGraph={true} />
        <Routes>
          <Route path="*" element={<LocationDisplay />} />
        </Routes>
      </MemoryRouter>
    )

    expect(screen.getByTestId('location')).toHaveTextContent('/')

    await user.click(screen.getByRole('link', { name: /Full Graph/i }))

    expect(screen.getByTestId('location')).toHaveTextContent('/full-graph')
  })

  it('renders collapse toggle button', () => {
    renderWithRouter(<Sidebar hasGraph={true} />)

    expect(screen.getByTestId('sidebar-toggle')).toBeInTheDocument()
    expect(screen.getByText('Collapse')).toBeInTheDocument()
  })

  it('calls onToggleCollapse when toggle button is clicked', async () => {
    const user = userEvent.setup()
    const onToggleCollapse = vi.fn()

    renderWithRouter(<Sidebar hasGraph={true} onToggleCollapse={onToggleCollapse} />)

    await user.click(screen.getByTestId('sidebar-toggle'))

    expect(onToggleCollapse).toHaveBeenCalledTimes(1)
  })

  it('hides text labels when collapsed', () => {
    renderWithRouter(<Sidebar hasGraph={true} collapsed={true} />)

    expect(screen.queryByText('Éclair')).not.toBeInTheDocument()
    expect(screen.queryByText('Overview')).not.toBeInTheDocument()
    expect(screen.queryByText('Theme')).not.toBeInTheDocument()
    expect(screen.queryByText('Collapse')).not.toBeInTheDocument()
  })

  it('shows tooltip on collapsed nav items', () => {
    renderWithRouter(<Sidebar hasGraph={true} collapsed={true} />)

    const overviewLink = screen.getByRole('link', { name: /Overview/i })
    expect(overviewLink).toHaveAttribute('title', 'Overview')
  })
})
