import { existsSync } from 'node:fs'
import {
  classifyRoleRequest, findRoleClassifierResult 
} from './role-classifier-result'
import type { RoleEnforcementConfig } from '../../../platform/domain/role-enforcement-config'
import {
  compileRoleEnforcementConfig,
  loadRoleEnforcementConfig,
} from '../../../platform/infra/load-role-enforcement-config'

function createCompiledConfig() {
  const config: RoleEnforcementConfig = {
    roles: [
      {
        name: 'cli-shell',
        targets: ['function'],
        allowedLocation: ['packages/demo/src/shell/**/*.ts'],
        allowedNames: ['createProgram', 'main'],
        markdownSpec: 'docs/roles/cli-shell.md',
      },
      {
        name: 'git-changed-files-reader',
        targets: ['class'],
        allowedLocation: ['packages/demo/src/platform/infra/**/*.ts'],
        nameMatches: '^.*Reader$',
        allowedPublicMethods: ['read'],
        markdownSpec: 'docs/roles/git-changed-files-reader.md',
      },
      {
        name: 'workflow-state-reader',
        targets: ['class'],
        allowedLocation: ['packages/demo/src/platform/infra/**/*.ts'],
        nameMatches: '^.*Reader$',
        allowedPublicMethods: ['read'],
        markdownSpec: 'docs/roles/workflow-state-reader.md',
      },
    ],
  }

  return compileRoleEnforcementConfig(config)
}

describe('role classifier flow', () => {
  it('resolves markdown specs referenced by the spike config', () => {
    const config = loadRoleEnforcementConfig(
      'packages/riviere-role-enforcement/fixtures/oxlint-spike/riviere-role-enforcement.yaml',
    )

    expect(config.roles).toHaveLength(2)

    for (const role of config.roles) {
      expect(existsSync(role.markdownSpec)).toBe(true)
    }
  })

  it('returns the exact assignment text to add for a known role lookup', () => {
    const result = findRoleClassifierResult(
      'cli-shell',
      createCompiledConfig(),
      ['This function belongs to the shell layer.'],
      'Add the role annotation above the exported function, rename it to createProgram, and re-run validation.',
    )

    expect(result).toStrictEqual({
      status: 'clear',
      layer: 'shell',
      role: 'cli-shell',
      assignmentText: '/** @riviere-role cli-shell */',
      allowedLocation: ['packages/demo/src/shell/**/*.ts'],
      markdownSpec: 'docs/roles/cli-shell.md',
      rationale: ['This function belongs to the shell layer.'],
      nextAction:
        'Add the role annotation above the exported function, rename it to createProgram, and re-run validation.',
      ambiguity: {
        status: 'clear',
        alternatives: [],
      },
    })
  })

  it('classifies a clear request against the role catalog', () => {
    const result = classifyRoleRequest(
      {
        requestedChange: 'Add shell wiring that creates the CLI program at startup.',
        targetKind: 'function',
      },
      createCompiledConfig(),
    )

    expect(result).toStrictEqual({
      status: 'clear',
      layer: 'shell',
      role: 'cli-shell',
      assignmentText: '/** @riviere-role cli-shell */',
      allowedLocation: ['packages/demo/src/shell/**/*.ts'],
      markdownSpec: 'docs/roles/cli-shell.md',
      rationale: [
        "Role 'cli-shell' best matches the requested change.",
        "Its allowed locations place the code in the 'shell' layer.",
      ],
      nextAction:
        'Add /** @riviere-role cli-shell */ above the target and implement it in an allowed location.',
      ambiguity: {
        status: 'clear',
        alternatives: [],
      },
    })
  })

  it('returns an ambiguous result when multiple roles tie', () => {
    const result = classifyRoleRequest(
      {
        requestedChange: 'Add a reader that loads data from disk.',
        targetKind: 'class',
      },
      createCompiledConfig(),
    )

    expect(result).toStrictEqual({
      status: 'ambiguous',
      layer: 'infra',
      role: null,
      assignmentText: null,
      allowedLocation: [],
      markdownSpec: null,
      rationale: ['Multiple repository roles match the requested change equally well.'],
      nextAction:
        'Do not write code yet. Review the candidate roles and resolve the ambiguity first.',
      ambiguity: {
        status: 'ambiguous',
        alternatives: ['git-changed-files-reader', 'workflow-state-reader'],
      },
    })
  })

  it('returns an unknown-role result for a missing requested role', () => {
    const result = classifyRoleRequest(
      {
        requestedChange: 'Add shell wiring that creates the CLI program at startup.',
        requestedRoleName: 'cli-runner',
        targetKind: 'function',
      },
      createCompiledConfig(),
    )

    expect(result).toStrictEqual({
      status: 'unknown-role',
      layer: 'shell',
      role: null,
      assignmentText: null,
      allowedLocation: [],
      markdownSpec: null,
      rationale: ["No role named 'cli-runner' exists in the repository role catalog."],
      nextAction:
        'Do not write code yet. Choose a valid repository role and then add the explicit assignment.',
      ambiguity: {
        status: 'clear',
        alternatives: ['cli-shell'],
      },
    })
  })
})
