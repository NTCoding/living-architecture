import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { UrlInput } from './UrlInput'

describe('UrlInput', () => {
  it('renders input and button', () => {
    const mockLoad = vi.fn()
    render(<UrlInput onLoadFromUrl={mockLoad} isLoading={false} />)

    expect(screen.getByLabelText('Graph URL')).toBeInTheDocument()
    expect(screen.getByRole('button', { name: /load from url/i })).toBeInTheDocument()
  })

  it('button is disabled when URL is empty', () => {
    const mockLoad = vi.fn()
    render(<UrlInput onLoadFromUrl={mockLoad} isLoading={false} />)

    expect(screen.getByRole('button', { name: /load from url/i })).toBeDisabled()
  })

  it('button is enabled when URL is entered', async () => {
    const user = userEvent.setup()
    const mockLoad = vi.fn()
    render(<UrlInput onLoadFromUrl={mockLoad} isLoading={false} />)

    const input = screen.getByLabelText('Graph URL')
    await user.type(input, 'https://example.com/graph.json')

    expect(screen.getByRole('button', { name: /load from url/i })).not.toBeDisabled()
  })

  it('shows error for invalid URL format', async () => {
    const user = userEvent.setup()
    const mockLoad = vi.fn()
    render(<UrlInput onLoadFromUrl={mockLoad} isLoading={false} />)

    const input = screen.getByLabelText('Graph URL')
    await user.type(input, 'not-a-url')
    await user.click(screen.getByRole('button', { name: /load from url/i }))

    expect(screen.getByText(/invalid url format/i)).toBeInTheDocument()
    expect(mockLoad).not.toHaveBeenCalled()
  })

  it('accepts https URLs', async () => {
    const user = userEvent.setup()
    const mockLoad = vi.fn().mockResolvedValue(undefined)
    render(<UrlInput onLoadFromUrl={mockLoad} isLoading={false} />)

    const input = screen.getByLabelText('Graph URL')
    await user.type(input, 'https://example.com/graph.json')
    await user.click(screen.getByRole('button', { name: /load from url/i }))

    expect(mockLoad).toHaveBeenCalledWith('https://example.com/graph.json')
  })

  it('accepts http URLs', async () => {
    const user = userEvent.setup()
    const mockLoad = vi.fn().mockResolvedValue(undefined)
    render(<UrlInput onLoadFromUrl={mockLoad} isLoading={false} />)

    const input = screen.getByLabelText('Graph URL')
    await user.type(input, 'http://localhost:5173/graph.json')
    await user.click(screen.getByRole('button', { name: /load from url/i }))

    expect(mockLoad).toHaveBeenCalledWith('http://localhost:5173/graph.json')
  })

  it('shows loading state', () => {
    const mockLoad = vi.fn()
    render(<UrlInput onLoadFromUrl={mockLoad} isLoading={true} />)

    expect(screen.getByRole('button', { name: /loading/i })).toBeInTheDocument()
    expect(screen.getByLabelText('Graph URL')).toBeDisabled()
  })

  it('clears error when user types', async () => {
    const user = userEvent.setup()
    const mockLoad = vi.fn()
    render(<UrlInput onLoadFromUrl={mockLoad} isLoading={false} />)

    const input = screen.getByLabelText('Graph URL')

    await user.type(input, 'bad-url')
    await user.click(screen.getByRole('button', { name: /load from url/i }))
    expect(screen.getByText(/invalid url format/i)).toBeInTheDocument()

    await user.clear(input)
    await user.type(input, 'https://example.com/graph.json')
    expect(screen.queryByText(/invalid url format/i)).not.toBeInTheDocument()
  })

  it('submits on Enter key press', async () => {
    const user = userEvent.setup()
    const mockLoad = vi.fn().mockResolvedValue(undefined)
    render(<UrlInput onLoadFromUrl={mockLoad} isLoading={false} />)

    const input = screen.getByLabelText('Graph URL')
    await user.type(input, 'https://example.com/graph.json{Enter}')

    expect(mockLoad).toHaveBeenCalledWith('https://example.com/graph.json')
  })
})
