import { vi } from 'vitest'
import { createWorkflowVerificationRunner } from './workflow-verification-runner'

it('runs full uncached repository verification without an interactive dependency prompt', () => {
  const execute = vi.fn()
  createWorkflowVerificationRunner(execute)()
  expect(execute).toHaveBeenCalledWith({
    command: 'pnpm',
    arguments: ['verify'],
    environment: { CI: 'true', NX_SKIP_NX_CACHE: 'true' },
  })
})
