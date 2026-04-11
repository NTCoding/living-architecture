import {
  checkWriteAllowed, isWriteAllowed 
} from './workflow-predicates'
import type { WorkflowState } from './workflow-types'

const BASE_STATE: WorkflowState = {
  currentStateMachineState: 'IMPLEMENTING',
  architectureReviewPassed: false,
  codeReviewPassed: false,
  bugScannerPassed: false,
  taskCheckPassed: false,
  ciPassed: false,
  feedbackClean: false,
  feedbackAddressed: false,
}

describe('checkWriteAllowed predicate', () => {
  it('allows writes to normal files', () => {
    expect(checkWriteAllowed('/src/foo.ts')).toBe(true)
  })

  it('blocks writes to nx.json', () => {
    expect(checkWriteAllowed('/project/nx.json')).toBe(false)
  })

  it('blocks writes to tsconfig.base.json', () => {
    expect(checkWriteAllowed('/project/tsconfig.base.json')).toBe(false)
  })

  it('blocks writes to eslint.config.mjs', () => {
    expect(checkWriteAllowed('/project/eslint.config.mjs')).toBe(false)
  })

  it('blocks writes to vitest.config.ts', () => {
    expect(checkWriteAllowed('/project/vitest.config.ts')).toBe(false)
  })

  it('blocks writes to vite.config.ts', () => {
    expect(checkWriteAllowed('/project/vite.config.ts')).toBe(false)
  })

  it('allows writes to project-level tsconfig.json', () => {
    expect(checkWriteAllowed('/project/packages/foo/tsconfig.json')).toBe(true)
  })

  it('delegates hook-based checks through isWriteAllowed', () => {
    expect(isWriteAllowed('/project/nx.json', BASE_STATE)).toBe(false)
  })
})
