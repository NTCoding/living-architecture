import {
  render, screen,
} from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import {
  describe, expect, it,
} from 'vitest'
import type { RiviereGraph } from '@living-architecture/riviere-schema'
import { ThemeProvider } from '@/platform/infra/theme/ThemeContext'
import { ModulesPage } from './ModulesPage'

const graph: RiviereGraph = {
  version: '1.0',
  metadata: {
    domains: {
      operations: {
        description: 'Operations',
        systemType: 'other',
      },
    },
    customTypes: {Job: { description: 'A scheduled unit of work' },},
  },
  components: [
    {
      id: 'job-1',
      type: 'Custom',
      customTypeName: 'Job',
      name: 'Load warehouse',
      domain: 'operations',
      module: 'Scheduler',
      sourceLocation: { filePath: 'jobs.csv' },
    },
  ],
  links: [],
}

describe('ModulesPage', () => {
  it('shows modules grouped under their domains with actual node types', () => {
    render(
      <ThemeProvider>
        <ModulesPage graph={graph} />
      </ThemeProvider>,
    )

    expect(screen.getByRole('heading', { name: 'operations' })).toBeInTheDocument()
    expect(screen.getByRole('heading', { name: 'Scheduler' })).toBeInTheDocument()
    expect(screen.getByText('Load warehouse')).toBeInTheDocument()
    expect(screen.getByText('Job')).toHaveAttribute('title', 'A scheduled unit of work')
  })

  it('lets domains and modules be collapsed independently', async () => {
    const user = userEvent.setup()
    render(
      <ThemeProvider>
        <ModulesPage graph={graph} />
      </ThemeProvider>,
    )

    const domainGroup = screen.getByTestId('domain-group-operations')
    const moduleGroup = screen.getByTestId('module-group-Scheduler')
    expect(domainGroup).toHaveAttribute('open')
    expect(moduleGroup).toHaveAttribute('open')

    await user.click(screen.getByRole('heading', { name: 'Scheduler' }))
    expect(moduleGroup).not.toHaveAttribute('open')

    await user.click(screen.getByRole('heading', { name: 'operations' }))
    expect(domainGroup).not.toHaveAttribute('open')
  })
})
