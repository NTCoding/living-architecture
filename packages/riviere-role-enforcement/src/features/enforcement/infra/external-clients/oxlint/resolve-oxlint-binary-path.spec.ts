import {
  afterEach, describe, expect, it, vi 
} from 'vitest'
import { RoleEnforcementExecutionError } from '../../../domain/role-enforcement-execution-error'

vi.mock('../filesystem/find-file-up', () => ({ findFileUp: vi.fn() }))

import { findFileUp } from '../filesystem/find-file-up'
import { resolveOxlintBinaryPath } from './resolve-oxlint-binary-path'

describe('resolveOxlintBinaryPath', () => {
  afterEach(() => {
    vi.restoreAllMocks()
  })

  it('returns the oxlint binary path when found', () => {
    vi.mocked(findFileUp).mockReturnValue('/workspace/node_modules/.bin/oxlint')
    expect(resolveOxlintBinaryPath()).toBe('/workspace/node_modules/.bin/oxlint')
  })

  it('throws RoleEnforcementExecutionError when oxlint binary is not found', () => {
    vi.mocked(findFileUp).mockReturnValue(undefined)
    expect(() => resolveOxlintBinaryPath()).toThrowError(
      new RoleEnforcementExecutionError('Cannot find oxlint binary in node_modules'),
    )
  })
})
