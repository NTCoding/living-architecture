import { existsSync } from 'node:fs'
import { resolve } from 'node:path'
import { fileURLToPath } from 'node:url'
import {
  classifyRoleRequest,
  createRoleClassifierResult,
  findRoleClassifierResult,
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
        markdownSpec: 'docs/architecture/roles/cli-shell.md',
      },
      {
        name: 'git-changed-files-reader',
        targets: ['class'],
        allowedLocation: ['packages/demo/src/platform/infra/**/*.ts'],
        nameMatches: '^.*Reader$',
        allowedPublicMethods: ['read'],
        markdownSpec: 'docs/architecture/roles/git-changed-files-reader.md',
      },
      {
        name: 'workflow-state-reader',
        targets: ['class'],
        allowedLocation: ['packages/demo/src/platform/infra/**/*.ts'],
        nameMatches: '^.*Reader$',
        allowedPublicMethods: ['read'],
        markdownSpec: 'docs/architecture/roles/workflow-state-reader.md',
      },
    ],
  }

  return compileRoleEnforcementConfig(config)
}

function requireFirstRole() {
  const [role] = createCompiledConfig().roles

  if (role === undefined) {
    throw new TypeError('Expected a compiled role definition.')
  }

  return role
}

describe('role classifier flow', () => {
  it('resolves markdown specs referenced by the spike config', () => {
    const repoRoot = fileURLToPath(new URL('../../../../../..', import.meta.url))
    const config = loadRoleEnforcementConfig(
      fileURLToPath(
        new URL('../../../../fixtures/oxlint-spike/riviere-role-enforcement.yaml', import.meta.url),
      ),
    )

    expect(config.roles).toHaveLength(2)

    for (const role of config.roles) {
      expect(
        existsSync(role.markdownSpec) || existsSync(resolve(repoRoot, role.markdownSpec)),
      ).toBe(true)
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
      markdownSpec: 'docs/architecture/roles/cli-shell.md',
      rationale: ['This function belongs to the shell layer.'],
      nextAction:
        'Add the role annotation above the exported function, rename it to createProgram, and re-run validation.',
      ambiguity: {
        status: 'clear',
        alternatives: [],
      },
    })
  })

  it('returns null when a named role does not exist', () => {
    expect(
      findRoleClassifierResult('missing-role', createCompiledConfig(), ['Missing'], 'Stop.'),
    ).toBeNull()
  })

  it('creates a clear result directly from a role definition', () => {
    expect(
      createRoleClassifierResult(
        requireFirstRole(),
        ['Use the shell layer.'],
        'Add the annotation.',
      ),
    ).toMatchObject({
      status: 'clear',
      role: 'cli-shell',
      layer: 'shell',
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
      markdownSpec: 'docs/architecture/roles/cli-shell.md',
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

  it('returns a clear result when the requested role exists', () => {
    const result = classifyRoleRequest(
      {
        requestedChange: 'Use the configured shell role directly.',
        requestedRoleName: 'cli-shell',
        targetKind: 'function',
      },
      createCompiledConfig(),
    )

    expect(result.role).toBe('cli-shell')
    expect(result.assignmentText).toBe('/** @riviere-role cli-shell */')
  })

  it('returns an unknown-role result when no catalog role matches the request', () => {
    const result = classifyRoleRequest(
      {
        requestedChange: 'Add a presenter for a browser-only canvas widget.',
        targetKind: 'function',
      },
      createCompiledConfig(),
    )

    expect(result).toMatchObject({
      status: 'unknown-role',
      role: null,
      ambiguity: { alternatives: [] },
    })
  })

  it('infers non-shell layers from the requested change text', () => {
    const requests = [
      {
        requestedChange: 'Add a command coordinator.',
        targetKind: 'function' as const,
      },
      {
        requestedChange: 'Add query helpers for graph reads.',
        targetKind: 'class' as const,
      },
      {
        requestedChange: 'Add domain rules for aggregate validation.',
        targetKind: 'function' as const,
      },
      {
        requestedChange: 'Add infrastructure adapters for file loading.',
        targetKind: 'class' as const,
      },
    ]

    const results = requests.map((request) => classifyRoleRequest(request, createCompiledConfig()))

    expect(results.map((result) => result.layer)).toStrictEqual([
      'command',
      'query',
      'domain',
      'infra',
    ])
  })

  it('returns a null shared layer when ambiguous roles span multiple layers', () => {
    const config = compileRoleEnforcementConfig({
      roles: [
        {
          name: 'command-reader',
          targets: ['class'],
          allowedLocation: ['packages/demo/src/features/demo/commands/**/*.ts'],
          nameMatches: '^.*Reader$',
          allowedPublicMethods: ['read'],
          markdownSpec: 'docs/architecture/roles/command-reader.md',
        },
        {
          name: 'infra-reader',
          targets: ['class'],
          allowedLocation: ['packages/demo/src/platform/infra/**/*.ts'],
          nameMatches: '^.*Reader$',
          allowedPublicMethods: ['read'],
          markdownSpec: 'docs/architecture/roles/infra-reader.md',
        },
      ],
    })

    const result = classifyRoleRequest(
      {
        requestedChange: 'Add a reader for loading workflow state.',
        targetKind: 'class',
      },
      config,
    )

    expect(result.layer).toBeNull()
  })

  it('infers layers from role locations for non-shell clear results', () => {
    const config = compileRoleEnforcementConfig({
      roles: [
        {
          name: 'feature-entrypoint',
          targets: ['function'],
          allowedLocation: ['packages/demo/src/features/demo/entrypoint/**/*.ts'],
          allowedNames: ['createDemoCommand'],
          markdownSpec: 'docs/architecture/roles/feature-entrypoint.md',
        },
        {
          name: 'command-use-case',
          targets: ['function'],
          allowedLocation: ['packages/demo/src/features/demo/commands/**/*.ts'],
          allowedNames: ['runDemo'],
          markdownSpec: 'docs/architecture/roles/command-use-case.md',
        },
        {
          name: 'query-service',
          targets: ['function'],
          allowedLocation: ['packages/demo/src/features/demo/queries/**/*.ts'],
          allowedNames: ['findDemo'],
          markdownSpec: 'docs/architecture/roles/query-service.md',
        },
        {
          name: 'domain-service',
          targets: ['function'],
          allowedLocation: ['packages/demo/src/features/demo/domain/**/*.ts'],
          allowedNames: ['evaluateDemo'],
          markdownSpec: 'docs/architecture/roles/domain-service.md',
        },
        {
          name: 'infra-loader',
          targets: ['function'],
          allowedLocation: ['packages/demo/src/platform/infra/**/*.ts'],
          allowedNames: ['loadDemo'],
          markdownSpec: 'docs/architecture/roles/infra-loader.md',
        },
      ],
    })

    expect({
      entrypoint: findRoleClassifierResult('feature-entrypoint', config, [], 'next')?.layer,
      command: findRoleClassifierResult('command-use-case', config, [], 'next')?.layer,
      query: findRoleClassifierResult('query-service', config, [], 'next')?.layer,
      domain: findRoleClassifierResult('domain-service', config, [], 'next')?.layer,
      infra: findRoleClassifierResult('infra-loader', config, [], 'next')?.layer,
    }).toStrictEqual({
      entrypoint: 'entrypoint',
      command: 'command',
      query: 'query',
      domain: 'domain',
      infra: 'infra',
    })
  })

  it('returns null for roles whose allowed locations do not map to a known layer', () => {
    const config = compileRoleEnforcementConfig({
      roles: [
        {
          name: 'misc-helper',
          targets: ['function'],
          allowedLocation: ['packages/demo/src/misc/**/*.ts'],
          allowedNames: ['help'],
          markdownSpec: 'docs/architecture/roles/misc-helper.md',
        },
      ],
    })

    expect(findRoleClassifierResult('misc-helper', config, [], 'next')?.layer).toBeNull()
  })

  it('infers the entrypoint layer from the request text', () => {
    const result = classifyRoleRequest(
      {
        requestedChange: 'Add an entrypoint that assembles the CLI command.',
        targetKind: 'function',
      },
      compileRoleEnforcementConfig({
        roles: [
          {
            name: 'feature-entrypoint',
            targets: ['function'],
            allowedLocation: ['packages/demo/src/features/demo/entrypoint/**/*.ts'],
            allowedNames: ['createDemoCommand'],
            markdownSpec: 'docs/architecture/roles/feature-entrypoint.md',
          },
        ],
      }),
    )

    expect(result.layer).toBe('entrypoint')
  })

  it('uses an unknown layer label when a clear role has no known layer mapping', () => {
    const config = compileRoleEnforcementConfig({
      roles: [
        {
          name: 'misc-helper',
          targets: ['function'],
          allowedLocation: ['packages/demo/src/misc/**/*.ts'],
          allowedNames: ['help'],
          markdownSpec: 'docs/architecture/roles/misc-helper.md',
        },
      ],
    })

    const result = classifyRoleRequest(
      {
        requestedChange: 'Add a misc helper for legacy support.',
        targetKind: 'function',
      },
      config,
    )

    expect(result.rationale[1]).toBe("Its allowed locations place the code in the 'unknown' layer.")
  })
})
