import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { ThemeProvider, useTheme } from './ThemeContext'

function TestConsumer(): React.ReactElement {
  const { theme, setTheme } = useTheme()
  return (
    <div>
      <span data-testid="current-theme">{theme}</span>
      <button onClick={() => setTheme('voltage')}>Set Voltage</button>
      <button onClick={() => setTheme('circuit')}>Set Circuit</button>
      <button onClick={() => setTheme('stream')}>Set Stream</button>
    </div>
  )
}

describe('ThemeContext', () => {
  beforeEach(() => {
    localStorage.clear()
    document.body.className = ''
  })

  it('provides default stream theme when no stored preference', () => {
    render(
      <ThemeProvider>
        <TestConsumer />
      </ThemeProvider>
    )

    expect(screen.getByTestId('current-theme')).toHaveTextContent('stream')
  })

  it('applies theme class to document body', () => {
    render(
      <ThemeProvider>
        <TestConsumer />
      </ThemeProvider>
    )

    expect(document.body.classList.contains('theme-stream')).toBe(true)
  })

  it('changes theme when setTheme is called', async () => {
    const user = userEvent.setup()

    render(
      <ThemeProvider>
        <TestConsumer />
      </ThemeProvider>
    )

    await user.click(screen.getByRole('button', { name: 'Set Voltage' }))

    expect(screen.getByTestId('current-theme')).toHaveTextContent('voltage')
    expect(document.body.classList.contains('theme-voltage')).toBe(true)
    expect(document.body.classList.contains('theme-stream')).toBe(false)
  })

  it('persists theme to localStorage', async () => {
    const user = userEvent.setup()

    render(
      <ThemeProvider>
        <TestConsumer />
      </ThemeProvider>
    )

    await user.click(screen.getByRole('button', { name: 'Set Circuit' }))

    expect(localStorage.getItem('eclair-theme')).toBe('circuit')
  })

  it('loads theme from localStorage on mount', () => {
    localStorage.setItem('eclair-theme', 'voltage')

    render(
      <ThemeProvider>
        <TestConsumer />
      </ThemeProvider>
    )

    expect(screen.getByTestId('current-theme')).toHaveTextContent('voltage')
    expect(document.body.classList.contains('theme-voltage')).toBe(true)
  })

  it('falls back to default when invalid theme stored', () => {
    localStorage.setItem('eclair-theme', 'invalid-theme')

    render(
      <ThemeProvider>
        <TestConsumer />
      </ThemeProvider>
    )

    expect(screen.getByTestId('current-theme')).toHaveTextContent('stream')
  })

  it('throws error when useTheme called outside provider', () => {
    const consoleError = vi.spyOn(console, 'error').mockImplementation(() => {})

    expect(() => {
      render(<TestConsumer />)
    }).toThrow('useTheme must be used within a ThemeProvider')

    consoleError.mockRestore()
  })
})
