import { expect, it } from 'vitest'
import { defineWorkflowRoutes } from './define-workflow-routes'

it('returns the supplied route definitions', () => {
  const routes = {
    init: { type: 'session-start' as const },
  }

  expect(defineWorkflowRoutes(routes)).toBe(routes)
})
