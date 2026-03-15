import '@testing-library/jest-dom/vitest'
import { render, screen, waitFor, within } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { describe, expect, it } from 'vitest'
import { ExportProvider } from '@/platform/infra/export/ExportContext'
import { ArchitectureEvolutionPage } from './ArchitectureEvolutionPage'

function renderPage(): ReturnType<typeof render> {
  return render(
    <ExportProvider>
      <ArchitectureEvolutionPage />
    </ExportProvider>,
  )
}

async function findPageHeader(): Promise<HTMLElement> {
  return screen.findByText((_, node) => {
    return (
      node instanceof HTMLSpanElement && node.textContent?.includes('Initial split architecture')
    )
  })
}

function hasCommitTitle(title: string): (content: string, node: Element | null) => boolean {
  return (_, node) => node instanceof HTMLSpanElement && node.textContent?.includes(title)
}

function getRequiredElement(container: ParentNode, selector: string): Element {
  const element = container.querySelector(selector)
  if (element === null) {
    throw new TypeError(`Expected element matching selector: ${selector}`)
  }

  return element
}

async function advanceToNextCommit(
  user: ReturnType<typeof userEvent.setup>,
  remainingClicks: number,
): Promise<void> {
  if (remainingClicks <= 0) return

  await user.click(screen.getByRole('button', { name: /next commit/i }))
  await advanceToNextCommit(user, remainingClicks - 1)
}

describe('ArchitectureEvolutionPage', () => {
  it('renders the compact header and first commit summary', async () => {
    renderPage()
    const page = screen.getByTestId('arch-evolution-page')
    const summary = await findPageHeader()

    expect(page).toContainElement(screen.getByTestId('arch-evolution-flow'))
    expect(summary).toBeInTheDocument()
    expect(screen.getByText('Architecture Evolution')).toBeInTheDocument()
    expect(screen.getByText(/2026-01-08/)).toBeInTheDocument()
  })

  it('expands commit details on demand', async () => {
    const user = userEvent.setup()
    renderPage()
    await findPageHeader()

    await user.click(screen.getByTestId('arch-evolution-details-toggle'))

    expect(screen.getByText('a18b3f2')).toBeInTheDocument()
    expect(screen.getByText('Nick Tune')).toBeInTheDocument()
  })

  it('disables previous on the first step and next on the last step', async () => {
    const user = userEvent.setup()
    renderPage()
    await findPageHeader()

    const previousButton = screen.getByRole('button', { name: /previous commit/i })
    const nextButton = screen.getByRole('button', { name: /next commit/i })

    expect(previousButton).toBeDisabled()
    expect(nextButton).not.toBeDisabled()

    await advanceToNextCommit(user, 8)

    expect(nextButton).toBeDisabled()
    expect(screen.getByText(hasCommitTitle('Remove Orders Service C'))).toBeInTheDocument()
  })

  it('shows changed labels even when stable labels are off', async () => {
    const user = userEvent.setup()
    renderPage()
    await findPageHeader()

    expect(screen.queryByTestId('arch-evo-edge-label-web-a-read')).not.toBeInTheDocument()

    await user.click(screen.getByRole('button', { name: /next commit/i }))

    expect(screen.getByTestId('arch-evo-edge-label-a-db-b-write')).toHaveTextContent(
      'Replicate order',
    )
    expect(screen.getByTestId('arch-evolution-label-toggle')).toHaveAttribute(
      'aria-pressed',
      'false',
    )
  })

  it('shows stable labels when the toggle is enabled', async () => {
    const user = userEvent.setup()
    renderPage()
    await findPageHeader()

    await user.click(screen.getByTestId('arch-evolution-label-toggle'))

    expect(screen.getByTestId('arch-evo-edge-label-web-a-read')).toHaveTextContent('GET /orders')
    expect(screen.getByTestId('arch-evo-edge-label-a-b-event')).toHaveTextContent('OrderPlaced')
  })

  it('opens the connection inspector when a line is clicked', async () => {
    const user = userEvent.setup()
    const { container } = renderPage()
    await findPageHeader()

    await waitFor(() => {
      expect(container.querySelector('.react-flow__edge-interaction')).not.toBeNull()
    })

    const clickablePath = getRequiredElement(container, '.react-flow__edge-interaction')

    await user.click(clickablePath)

    const inspector = screen.getByTestId('arch-evolution-inspector')
    expect(inspector).toHaveTextContent('Connection Details')
    expect(inspector).toHaveTextContent('GET /orders')
    expect(inspector).toHaveTextContent('Website client')
    expect(inspector).toHaveTextContent('Query API')
  })

  it('ghosts service B and its removed capability before deletion', async () => {
    const user = userEvent.setup()
    renderPage()
    await findPageHeader()

    await advanceToNextCommit(user, 2)

    const serviceB = await screen.findByTestId('arch-evo-node-service-b')
    const removedCapability = within(serviceB).getByText('POST /orders')

    expect(serviceB).toHaveAttribute('data-evolution-state', 'changed')
    expect(removedCapability).toHaveAttribute('data-evolution-state', 'ghosted')
  })
})
