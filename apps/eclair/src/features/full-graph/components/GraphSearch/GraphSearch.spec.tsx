import {
  describe, expect, it, vi 
} from 'vitest'
import {
  render, screen 
} from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { GraphSearch } from './GraphSearch'

describe('GraphSearch', () => {
  it('renders search input', () => {
    render(<GraphSearch onSearch={vi.fn()} />)
    expect(screen.getByTestId('graph-search-input')).toBeInTheDocument()
  })

  it('has correct placeholder', () => {
    render(<GraphSearch onSearch={vi.fn()} placeholder="Find nodes..." />)
    expect(screen.getByPlaceholderText('Find nodes...')).toBeInTheDocument()
  })

  it('calls onSearch when typing', async () => {
    const user = userEvent.setup()
    const onSearch = vi.fn()

    render(<GraphSearch onSearch={onSearch} />)

    await user.type(screen.getByTestId('graph-search-input'), 'API')

    expect(onSearch).toHaveBeenCalledWith('A')
    expect(onSearch).toHaveBeenCalledWith('AP')
    expect(onSearch).toHaveBeenCalledWith('API')
  })

  it('shows clear button when query is not empty', async () => {
    const user = userEvent.setup()

    render(<GraphSearch onSearch={vi.fn()} />)

    expect(screen.queryByTestId('graph-search-clear')).not.toBeInTheDocument()

    await user.type(screen.getByTestId('graph-search-input'), 'test')

    expect(screen.getByTestId('graph-search-clear')).toBeInTheDocument()
  })

  it('clears search when clear button is clicked', async () => {
    const user = userEvent.setup()
    const onSearch = vi.fn()

    render(<GraphSearch onSearch={onSearch} />)

    await user.type(screen.getByTestId('graph-search-input'), 'test')
    await user.click(screen.getByTestId('graph-search-clear'))

    expect(screen.getByTestId('graph-search-input')).toHaveValue('')
    expect(onSearch).toHaveBeenLastCalledWith('')
  })

  it('clears search when Escape key is pressed', async () => {
    const user = userEvent.setup()
    const onSearch = vi.fn()

    render(<GraphSearch onSearch={onSearch} />)

    const input = screen.getByTestId('graph-search-input')
    await user.type(input, 'test')
    await user.keyboard('{Escape}')

    expect(input).toHaveValue('')
    expect(onSearch).toHaveBeenLastCalledWith('')
  })

  it('has accessible label', () => {
    render(<GraphSearch onSearch={vi.fn()} />)
    expect(screen.getByLabelText('Search nodes')).toBeInTheDocument()
  })

  it('clear button has accessible label', async () => {
    const user = userEvent.setup()

    render(<GraphSearch onSearch={vi.fn()} />)
    await user.type(screen.getByTestId('graph-search-input'), 'test')

    expect(screen.getByLabelText('Clear search')).toBeInTheDocument()
  })
})
