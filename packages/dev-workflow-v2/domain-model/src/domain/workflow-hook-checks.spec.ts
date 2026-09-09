import { isWriteAllowed } from './workflow-predicates'
import { ReviewStatuses } from './reviews/statuses'
import { WorkflowState } from './workflow-types'

const BASE_STATE = WorkflowState.parse({
  currentStateMachineState: 'IMPLEMENTING',
  reviewerStatuses: ReviewStatuses.pending(),
})

describe('isWriteAllowed predicate', () => {
  it('allows writes to normal files', () => {
    expect(isWriteAllowed('/src/foo.ts', BASE_STATE)).toBe(true)
  })

  it('blocks writes to nx.json', () => {
    expect(isWriteAllowed('/project/nx.json', BASE_STATE)).toBe(false)
  })

  it('blocks writes to tsconfig.base.json', () => {
    expect(isWriteAllowed('/project/tsconfig.base.json', BASE_STATE)).toBe(false)
  })

  it('blocks writes to eslint.config.mjs', () => {
    expect(isWriteAllowed('/project/eslint.config.mjs', BASE_STATE)).toBe(false)
  })

  it('blocks writes to vitest.config.ts', () => {
    expect(isWriteAllowed('/project/vitest.config.ts', BASE_STATE)).toBe(false)
  })

  it('blocks writes to vite.config.ts', () => {
    expect(isWriteAllowed('/project/vite.config.ts', BASE_STATE)).toBe(false)
  })

  it('allows writes to project-level tsconfig.json', () => {
    expect(isWriteAllowed('/project/packages/foo/tsconfig.json', BASE_STATE)).toBe(true)
  })
})
