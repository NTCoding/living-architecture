import '@testing-library/jest-dom/vitest'
import {
  render,
  screen,
  within,
} from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import {
  describe,
  expect,
  it,
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

  it('keeps label visibility controlled by the toggle', async () => {
    const user = userEvent.setup()
    renderPage()
    await findPageHeader()

    await user.click(screen.getByTestId('arch-evolution-label-toggle'))

    expect(screen.getByTestId('arch-evolution-label-toggle')).toHaveAttribute(
      'aria-pressed',
      'true',
    )
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
