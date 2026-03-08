import { findRoleClassifierResult } from './role-classifier-result'
import { compileRoleEnforcementConfig } from '../../../platform/infra/load-role-enforcement-config'
import type { RoleEnforcementConfig } from '../../../platform/domain/role-enforcement-config'

describe('createRoleClassifierResult', () => {
  it('returns the exact assignment text to add for a role', () => {
    const config: RoleEnforcementConfig = {
      roles: [
        {
          name: 'cli-shell',
          targets: ['function'],
          allowedLocation: [
            'packages/riviere-role-enforcement/fixtures/oxlint-spike/src/shell/**/*.ts',
          ],
          allowedNames: ['createProgram', 'main'],
          markdownSpec: 'docs/roles/cli-shell.md',
        },
      ],
    }
    const compiledConfig = compileRoleEnforcementConfig(config)
    const result = findRoleClassifierResult(
      'cli-shell',
      compiledConfig,
      ['This function belongs to the shell layer.'],
      'Add the role annotation above the exported function, rename it to createProgram, and re-run validation.',
    )

    expect(result).not.toBeNull()

    expect(result).toStrictEqual({
      role: 'cli-shell',
      assignmentText: '/** @riviere-role cli-shell */',
      allowedLocation: [
        'packages/riviere-role-enforcement/fixtures/oxlint-spike/src/shell/**/*.ts',
      ],
      markdownSpec: 'docs/roles/cli-shell.md',
      rationale: ['This function belongs to the shell layer.'],
      nextAction:
        'Add the role annotation above the exported function, rename it to createProgram, and re-run validation.',
    })
  })
})
