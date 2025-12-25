import { describe, it, expect, vi } from 'vitest'
import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { MemoryRouter } from 'react-router-dom'
import { AboutPage } from './AboutPage'

function renderAboutPage(): ReturnType<typeof render> {
  return render(
    <MemoryRouter>
      <AboutPage />
    </MemoryRouter>
  )
}

describe('AboutPage', () => {
  describe('page header', () => {
    it('renders the page title', () => {
      renderAboutPage()
      expect(screen.getByRole('heading', { name: 'About Rivière', level: 1 })).toBeInTheDocument()
    })

    it('renders the introductory description', () => {
      renderAboutPage()
      expect(screen.getByText(/language-agnostic JSON format/)).toBeInTheDocument()
    })

    it('renders the name etymology callout', () => {
      renderAboutPage()
      expect(screen.getByText(/French for "river"/)).toBeInTheDocument()
    })
  })

  describe('node types section', () => {
    it('renders the Node Types heading', () => {
      renderAboutPage()
      expect(screen.getByRole('heading', { name: 'Node Types', level: 2 })).toBeInTheDocument()
    })

    it('renders all seven node type cards', () => {
      renderAboutPage()
      expect(screen.getByRole('heading', { name: 'UI', level: 3 })).toBeInTheDocument()
      expect(screen.getByRole('heading', { name: 'API', level: 3 })).toBeInTheDocument()
      expect(screen.getByRole('heading', { name: 'Use Case', level: 3 })).toBeInTheDocument()
      expect(screen.getByRole('heading', { name: 'Domain Operation', level: 3 })).toBeInTheDocument()
      expect(screen.getByRole('heading', { name: 'Domain Event', level: 3 })).toBeInTheDocument()
      expect(screen.getByRole('heading', { name: 'Event Handler', level: 3 })).toBeInTheDocument()
      expect(screen.getByRole('heading', { name: 'Custom', level: 3 })).toBeInTheDocument()
    })

    it('includes descriptions for node types', () => {
      renderAboutPage()
      expect(screen.getByText(/User-facing screens/)).toBeInTheDocument()
      expect(screen.getByText(/REST endpoints/)).toBeInTheDocument()
      expect(screen.getByText(/Actions that happen in the domain/)).toBeInTheDocument()
    })
  })

  describe('edge types section', () => {
    it('renders the Edge Types heading', () => {
      renderAboutPage()
      expect(screen.getByRole('heading', { name: 'Edge Types', level: 2 })).toBeInTheDocument()
    })

    it('lists all edge types', () => {
      renderAboutPage()
      expect(screen.getByText('invokes')).toBeInTheDocument()
      expect(screen.getByText('publishes')).toBeInTheDocument()
    })
  })

  describe('example schema section', () => {
    it('renders the Example Schema heading', () => {
      renderAboutPage()
      expect(screen.getByRole('heading', { name: 'Example Schema', level: 2 })).toBeInTheDocument()
    })

    it('displays the JSON example with key fields', () => {
      renderAboutPage()
      expect(screen.getByText(/"version": "1.0"/)).toBeInTheDocument()
      expect(screen.getByText(/"type": "UI"/)).toBeInTheDocument()
      expect(screen.getByText(/"sourceLocation"/)).toBeInTheDocument()
    })

    it('shows the filename label', () => {
      renderAboutPage()
      expect(screen.getByText('order-flow.json')).toBeInTheDocument()
    })

    it('has a copy button', () => {
      renderAboutPage()
      expect(screen.getByRole('button', { name: /copy/i })).toBeInTheDocument()
    })

    it('copies schema to clipboard when copy button clicked', async () => {
      const user = userEvent.setup()
      const writeTextMock = vi.fn().mockResolvedValue(undefined)
      vi.stubGlobal('navigator', { clipboard: { writeText: writeTextMock } })

      renderAboutPage()
      await user.click(screen.getByRole('button', { name: /copy/i }))

      expect(writeTextMock).toHaveBeenCalledWith(expect.stringContaining('"version": "1.0"'))
      vi.unstubAllGlobals()
    })
  })

  describe('get started section', () => {
    it('renders the Get Started heading', () => {
      renderAboutPage()
      expect(screen.getByRole('heading', { name: 'Get Started', level: 2 })).toBeInTheDocument()
    })

    it('renders GitHub link with correct URL', () => {
      renderAboutPage()
      const githubLink = screen.getByRole('link', { name: /View on GitHub/i })
      expect(githubLink).toHaveAttribute('href', 'https://github.com/ntcoding/riviere')
    })

    it('opens GitHub link in new tab securely', () => {
      renderAboutPage()
      const githubLink = screen.getByRole('link', { name: /View on GitHub/i })
      expect(githubLink).toHaveAttribute('target', '_blank')
      expect(githubLink).toHaveAttribute('rel', 'noopener noreferrer')
    })
  })
})
