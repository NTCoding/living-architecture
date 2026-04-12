import {
  afterEach, describe, expect, it, vi 
} from 'vitest'
import { RoleEnforcementExecutionError } from '../../../domain/role-enforcement-execution-error'

vi.mock('./find-file-up', () => ({ findFileUp: vi.fn() }))

import { findFileUp } from './find-file-up'
import { resolvePluginPath } from './resolve-plugin-path'

describe('resolvePluginPath', () => {
  afterEach(() => {
    vi.restoreAllMocks()
  })

  it('returns the plugin path when found', () => {
    vi.mocked(findFileUp).mockReturnValue('/pkg/role-enforcement-plugin.mjs')
    expect(resolvePluginPath()).toBe('/pkg/role-enforcement-plugin.mjs')
  })

  it('throws RoleEnforcementExecutionError when plugin is not found', () => {
    vi.mocked(findFileUp).mockReturnValue(undefined)
    expect(() => resolvePluginPath()).toThrowError(
      new RoleEnforcementExecutionError('Cannot find role-enforcement-plugin.mjs'),
    )
  })
})
