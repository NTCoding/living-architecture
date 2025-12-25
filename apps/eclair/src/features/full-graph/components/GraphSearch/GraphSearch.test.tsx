import { describe, expect, test, vi } from 'vitest'
import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { GraphSearch } from './GraphSearch'

describe('GraphSearch', () => {
  test('renders search input', () => {
    render(<GraphSearch onSearch={vi.fn()} />)
    expect(screen.getByTestId('graph-search-input')).toBeInTheDocument()
  })

  test('has correct placeholder', () => {
    render(<GraphSearch onSearch={vi.fn()} placeholder="Find nodes..." />)
    expect(screen.getByPlaceholderText('Find nodes...')).toBeInTheDocument()
  })

  test('calls onSearch when typing', async () => {
    const user = userEvent.setup()
    const onSearch = vi.fn()

    render(<GraphSearch onSearch={onSearch} />)

    await user.type(screen.getByTestId('graph-search-input'), 'API')

    expect(onSearch).toHaveBeenCalledWith('A')
    expect(onSearch).toHaveBeenCalledWith('AP')
    expect(onSearch).toHaveBeenCalledWith('API')
  })

  test('shows clear button when query is not empty', async () => {
    const user = userEvent.setup()

    render(<GraphSearch onSearch={vi.fn()} />)

    expect(screen.queryByTestId('graph-search-clear')).not.toBeInTheDocument()

    await user.type(screen.getByTestId('graph-search-input'), 'test')

    expect(screen.getByTestId('graph-search-clear')).toBeInTheDocument()
  })

  test('clears search when clear button is clicked', async () => {
    const user = userEvent.setup()
    const onSearch = vi.fn()

    render(<GraphSearch onSearch={onSearch} />)

    await user.type(screen.getByTestId('graph-search-input'), 'test')
    await user.click(screen.getByTestId('graph-search-clear'))

    expect(screen.getByTestId('graph-search-input')).toHaveValue('')
    expect(onSearch).toHaveBeenLastCalledWith('')
  })

  test('clears search when Escape key is pressed', async () => {
    const user = userEvent.setup()
    const onSearch = vi.fn()

    render(<GraphSearch onSearch={onSearch} />)

    const input = screen.getByTestId('graph-search-input')
    await user.type(input, 'test')
    await user.keyboard('{Escape}')

    expect(input).toHaveValue('')
    expect(onSearch).toHaveBeenLastCalledWith('')
  })

  test('has accessible label', () => {
    render(<GraphSearch onSearch={vi.fn()} />)
    expect(screen.getByLabelText('Search nodes')).toBeInTheDocument()
  })

  test('clear button has accessible label', async () => {
    const user = userEvent.setup()

    render(<GraphSearch onSearch={vi.fn()} />)
    await user.type(screen.getByTestId('graph-search-input'), 'test')

    expect(screen.getByLabelText('Clear search')).toBeInTheDocument()
  })
})
