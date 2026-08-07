import {
  render, screen,
} from '@testing-library/react'
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
})
