import { render } from '@testing-library/react'
import {
  describe, expect, it, vi 
} from 'vitest'
import { Logo } from './Logo'

const mockSetTheme = vi.fn()

vi.mock('@/platform/infra/theme/ThemeContext', () => ({
  useTheme: vi.fn(() => ({
    theme: 'stream',
    setTheme: mockSetTheme,
  })),
}))

import { useTheme } from '@/platform/infra/theme/ThemeContext'

const mockUseTheme = vi.mocked(useTheme)

describe('Logo', () => {
  it('renders SVG element', () => {
    render(<Logo />)

    const svg = document.querySelector('svg')
    expect(svg).toBeInTheDocument()
  })

  it('renders with default size of 36', () => {
    render(<Logo />)

    const svg = document.querySelector('svg')
    expect(svg).toHaveAttribute('width', '36')
    expect(svg).toHaveAttribute('height', '36')
  })

  it('renders with custom size', () => {
    render(<Logo size={48} />)

    const svg = document.querySelector('svg')
    expect(svg).toHaveAttribute('width', '48')
    expect(svg).toHaveAttribute('height', '48')
  })

  it('renders Stream logo with teal gradient when theme is stream', () => {
    mockUseTheme.mockReturnValue({
      theme: 'stream',
      setTheme: mockSetTheme,
    })
    render(<Logo />)

    const gradient = document.querySelector('linearGradient')
    expect(gradient).toBeInTheDocument()

    const stops = document.querySelectorAll('stop')
    expect(stops[0]).toHaveAttribute('stop-color', '#0D9488')
    expect(stops[1]).toHaveAttribute('stop-color', '#06B6D4')
  })

  it('renders Voltage logo with colored nodes when theme is voltage', () => {
    mockUseTheme.mockReturnValue({
      theme: 'voltage',
      setTheme: mockSetTheme,
    })
    render(<Logo />)

    const circles = document.querySelectorAll('circle')
    expect(circles).toHaveLength(5)

    const cyanNodes = Array.from(circles).filter((c) => c.getAttribute('fill') === '#00D4FF')
    const pinkNode = Array.from(circles).filter((c) => c.getAttribute('fill') === '#FF006E')
    const greenNode = Array.from(circles).filter((c) => c.getAttribute('fill') === '#39FF14')

    expect(cyanNodes).toHaveLength(3)
    expect(pinkNode).toHaveLength(1)
    expect(greenNode).toHaveLength(1)
  })

  it('renders Circuit logo with black background when theme is circuit', () => {
    mockUseTheme.mockReturnValue({
      theme: 'circuit',
      setTheme: mockSetTheme,
    })
    render(<Logo />)

    const rect = document.querySelector('rect')
    expect(rect).toHaveAttribute('fill', '#000000')

    const circles = document.querySelectorAll('circle')
    const whiteNodes = Array.from(circles).filter((c) => c.getAttribute('fill') === 'white')
    expect(whiteNodes).toHaveLength(5)
  })

  it('renders 5 nodes and 4 connecting lines', () => {
    render(<Logo />)

    const circles = document.querySelectorAll('circle')
    const lines = document.querySelectorAll('line')

    expect(circles).toHaveLength(5)
    expect(lines).toHaveLength(4)
  })
})
