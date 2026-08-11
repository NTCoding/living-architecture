import { describe, expect, it } from 'vitest'
import { createRoleFactory, role, roleEnforcement } from './role-enforcement-builder'

describe('role', () => {
  it('produces a role definition with the given name and options', () => {
    const result = role('aggregate', { targets: ['interface', 'type-alias', 'class'] })

    expect(result).toStrictEqual({
      name: 'aggregate',
      targets: ['interface', 'type-alias', 'class'],
    })
  })

  it('includes optional constraints when provided', () => {
    const result = role('command-use-case', {
      targets: ['function'],
      allowedInputs: ['command-use-case-input'],
      allowedOutputs: ['command-use-case-result'],
      forbiddenDependencies: ['command-use-case'],
      nameMatches: '.*UseCase$',
    })

    expect(result).toStrictEqual({
      name: 'command-use-case',
      targets: ['function'],
      allowedInputs: ['command-use-case-input'],
      allowedOutputs: ['command-use-case-result'],
      forbiddenDependencies: ['command-use-case'],
      nameMatches: '.*UseCase$',
    })
  })

  it('includes allowedNames when provided', () => {
    const result = role('cli-entrypoint', {
      targets: ['function'],
      allowedNames: ['main', 'run'],
    })

    expect(result).toStrictEqual({
      name: 'cli-entrypoint',
      targets: ['function'],
      allowedNames: ['main', 'run'],
    })
  })

  it('includes maxPublicMethods when provided', () => {
    const result = role('command-use-case', {
      targets: ['class'],
      minPublicMethods: 1,
      maxPublicMethods: 1,
    })

    expect(result).toStrictEqual({
      name: 'command-use-case',
      targets: ['class'],
      minPublicMethods: 1,
      maxPublicMethods: 1,
    })
  })

  it('includes approvedInstances when provided', () => {
    const result = role('aggregate', {
      targets: ['interface', 'type-alias', 'class'],
      minPublicMethods: 1,
      approvedInstances: [
        {
          name: 'ExtractionProject',
          userHasApproved: true,
        },
      ],
    })

    expect(result).toStrictEqual({
      name: 'aggregate',
      targets: ['interface', 'type-alias', 'class'],
      minPublicMethods: 1,
      approvedInstances: [
        {
          name: 'ExtractionProject',
          userHasApproved: true,
        },
      ],
    })
  })

  it('includes requiredPrivateMembers when provided', () => {
    const result = role('role-b', {
      targets: ['class'],
      requiredPrivateMembers: ['brand'],
    })

    expect(result).toStrictEqual({
      name: 'role-b',
      targets: ['class'],
      requiredPrivateMembers: ['brand'],
    })
  })

  it('includes generic class state constraints when provided', () => {
    const result = role('role-b', {
      targets: ['class'],
      requiresDataMembers: true,
      forbiddenCallableMembers: true,
    })

    expect(result).toStrictEqual({
      name: 'role-b',
      targets: ['class'],
      requiresDataMembers: true,
      forbiddenCallableMembers: true,
    })
  })

  it('includes forbiddenMethodCalls when provided', () => {
    const result = role('main', {
      targets: ['function'],
      forbiddenMethodCalls: ['command-use-case', 'aggregate-repository'],
    })

    expect(result).toStrictEqual({
      name: 'main',
      targets: ['function'],
      forbiddenMethodCalls: ['command-use-case', 'aggregate-repository'],
    })
  })
})

describe('roleEnforcement', () => {
  const testRoles = [
    role('cli-entrypoint', { targets: ['function'] }),
    role('aggregate', { targets: ['class'] }),
  ] as const

  it('builds the configured location hierarchy for every package', () => {
    const result = roleEnforcement({
      packages: ['packages/app-a', 'packages/app-b'],
      ignorePatterns: [],
      roleDefinitionsDir: '.riviere/role-definitions',
      roles: testRoles,
      locations: {
        source: {
          path: 'src',
          subLocations: {
            features: {
              subLocations: {
                '{feature}': {
                  subLocations: {
                    domain: { rules: { roles: ['aggregate'] } },
                    entrypoint: { rules: { roles: ['cli-entrypoint'] } },
                  },
                },
              },
            },
          },
        },
      },
    })

    expect(result.locationHierarchy.map((location) => location.pathTemplate)).toStrictEqual([
      'packages/app-a/src',
      'packages/app-a/src/features',
      'packages/app-a/src/features/{feature}',
      'packages/app-a/src/features/{feature}/domain',
      'packages/app-a/src/features/{feature}/entrypoint',
      'packages/app-b/src',
      'packages/app-b/src/features',
      'packages/app-b/src/features/{feature}',
      'packages/app-b/src/features/{feature}/domain',
      'packages/app-b/src/features/{feature}/entrypoint',
    ])
  })

  it('derives TypeScript and TSX include patterns from every enforced package', () => {
    const result = roleEnforcement({
      packages: ['packages/my-app'],
      additionalLocationEnforcement: [
        {
          packages: ['apps/my-app'],
          locations: {
            source: {
              path: 'src',
              allowAnySubLocations: true,
            },
          },
        },
      ],
      ignorePatterns: [],
      roleDefinitionsDir: '.riviere/role-definitions',
      roles: testRoles,
      locations: {
        source: {
          path: 'src',
          allowAnySubLocations: true,
        },
      },
    })

    expect(result.include).toStrictEqual([
      'packages/my-app/src/**/*.ts',
      'packages/my-app/src/**/*.tsx',
      'apps/my-app/src/**/*.ts',
      'apps/my-app/src/**/*.tsx',
    ])
  })

  it('keeps configuration values needed by the runner', () => {
    const result = roleEnforcement({
      packages: ['packages/my-app'],
      ignorePatterns: ['**/__fixtures__/**'],
      importAliases: { '@/': 'packages/my-app/src/' },
      roleDefinitionsDir: '.riviere/role-definitions',
      roles: testRoles,
      workspacePackageSources: { '@generic/pkg': 'packages/pkg/src/index.ts' },
      locations: {
        source: {
          path: 'src',
          allowAnySubLocations: true,
        },
      },
    })

    expect(result).toMatchObject({
      ignorePatterns: ['**/__fixtures__/**'],
      importAliases: { '@/': 'packages/my-app/src/' },
      roleDefinitionsDir: '.riviere/role-definitions',
      roles: testRoles,
      workspacePackageSources: { '@generic/pkg': 'packages/pkg/src/index.ts' },
    })
  })
})

describe('createRoleFactory', () => {
  it('produces a role with typed name constraint', () => {
    type TestRole = 'aggregate' | 'aggregate-repository'
    const typedRole = createRoleFactory<TestRole>()

    const result = typedRole('aggregate', { targets: ['class'] })

    expect(result).toStrictEqual({
      name: 'aggregate',
      targets: ['class'],
    })
  })

  it('type-checks role references in options', () => {
    type TestRole = 'command-use-case' | 'command-use-case-input' | 'command-use-case-result'
    const typedRole = createRoleFactory<TestRole>()

    const result = typedRole('command-use-case', {
      targets: ['class'],
      allowedInputs: ['command-use-case-input'],
      allowedOutputs: ['command-use-case-result'],
      forbiddenDependencies: ['command-use-case'],
    })

    expect(result.allowedInputs).toStrictEqual(['command-use-case-input'])
    expect(result.forbiddenDependencies).toStrictEqual(['command-use-case'])
  })
})
