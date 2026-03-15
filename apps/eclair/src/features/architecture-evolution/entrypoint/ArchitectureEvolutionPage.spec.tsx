import '@testing-library/jest-dom/vitest'
import {
  render, screen, within 
} from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import {
  describe, expect, it 
} from 'vitest'
import { ExportProvider } from '@/platform/infra/export/ExportContext'
import { ArchitectureEvolutionPage } from './ArchitectureEvolutionPage'

function renderPage(): ReturnType<typeof render> {
  return render(
    <ExportProvider>
      <ArchitectureEvolutionPage />
    </ExportProvider>,
  )
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
  it('renders the compact header and first commit summary', () => {
    renderPage()
    const page = screen.getByTestId('arch-evolution-page')
    const commitCard = screen.getByTestId('arch-evolution-commit-card')

    expect(page).toContainElement(screen.getByTestId('arch-evolution-flow'))
    expect(commitCard).toHaveTextContent('Architecture Evolution')
    expect(commitCard).toHaveTextContent('2026-01-08')
    expect(commitCard).toHaveTextContent('Initial split architecture')
  })

  it('expands commit details on demand', async () => {
    const user = userEvent.setup()
    renderPage()

    await user.click(screen.getByTestId('arch-evolution-details-toggle'))

    expect(screen.getByTestId('arch-evolution-commit-card')).toHaveTextContent('a18b3f2')
    expect(screen.getByTestId('arch-evolution-commit-card')).toHaveTextContent('Nick Tune')
  })

  it('disables previous on the first step and next on the last step', async () => {
    const user = userEvent.setup()
    renderPage()

    const previousButton = screen.getByRole('button', { name: /previous commit/i })
    const nextButton = screen.getByRole('button', { name: /next commit/i })

    expect(previousButton).toBeDisabled()
    expect(nextButton).not.toBeDisabled()

    await advanceToNextCommit(user, 8)

    expect(nextButton).toBeDisabled()
    expect(screen.getByTestId('arch-evolution-commit-card')).toHaveTextContent(
      'Remove Orders Service C',
    )
  })

  it('shows changed labels even when stable labels are off', async () => {
    const user = userEvent.setup()
    renderPage()

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

    await user.click(screen.getByTestId('arch-evolution-label-toggle'))

    expect(screen.getByTestId('arch-evo-edge-label-web-a-read')).toHaveTextContent('GET /orders')
    expect(screen.getByTestId('arch-evo-edge-label-a-b-event')).toHaveTextContent('OrderPlaced')
  })

  it('opens the connection inspector when a line is clicked', async () => {
    const user = userEvent.setup()
    const { container } = renderPage()

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

    await advanceToNextCommit(user, 2)

    const serviceB = screen.getByTestId('arch-evo-node-service-b')
    const removedCapability = within(serviceB).getByText('POST /orders')

    expect(serviceB).toHaveAttribute('data-evolution-state', 'changed')
    expect(removedCapability).toHaveAttribute('data-evolution-state', 'ghosted')
  })
})
