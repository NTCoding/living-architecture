import '@testing-library/jest-dom/vitest'
import {
  describe, it, expect 
} from 'vitest'
import {
  render, screen, within 
} from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { ExportProvider } from '@/platform/infra/export/ExportContext'
import { ArchitectureEvolutionPage } from './ArchitectureEvolutionPage'

function renderPage(): ReturnType<typeof render> {
  return render(
    <ExportProvider>
      <ArchitectureEvolutionPage />
    </ExportProvider>,
  )
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
  it('renders the page shell and first commit metadata', () => {
    renderPage()
    const page = screen.getByTestId('arch-evolution-page')
    const commitCard = screen.getByTestId('arch-evolution-commit-card')

    expect(page).toContainElement(screen.getByTestId('arch-evolution-flow'))
    expect(commitCard).toHaveTextContent('Architecture Evolution')
    expect(commitCard).toHaveTextContent('Initial split architecture')
    expect(commitCard).toHaveTextContent('2026-01-08')
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
    expect(screen.getByText('Remove Orders Service C')).toBeInTheDocument()
  })

  it('moves through commits with the navigation arrows', async () => {
    const user = userEvent.setup()
    renderPage()

    await user.click(screen.getByRole('button', { name: /next commit/i }))
    await user.click(screen.getByRole('button', { name: /next commit/i }))

    expect(screen.getByText('Remove place order API from Orders Service B')).toBeInTheDocument()
    expect(screen.getByText('d9254be')).toBeInTheDocument()
    expect(screen.getByText('2026-01-22')).toBeInTheDocument()
  })

  it('ghosts service B and its database on the removal step', async () => {
    const user = userEvent.setup()
    renderPage()

    await advanceToNextCommit(user, 4)

    expect(screen.getByTestId('arch-evo-node-service-b')).toHaveAttribute(
      'data-evolution-state',
      'ghosted',
    )
    expect(screen.getByTestId('arch-evo-node-db-b')).toHaveAttribute(
      'data-evolution-state',
      'ghosted',
    )
  })

  it('shows removed capabilities as ghosted before the service is deleted', async () => {
    const user = userEvent.setup()
    renderPage()

    await user.click(screen.getByRole('button', { name: /next commit/i }))
    await user.click(screen.getByRole('button', { name: /next commit/i }))

    const serviceB = screen.getByTestId('arch-evo-node-service-b')
    const placeOrderBadge = within(serviceB).getByText('Place order API')

    expect(placeOrderBadge).toHaveAttribute('data-evolution-state', 'ghosted')
  })
})
