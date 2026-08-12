import { describe, expect, it } from 'vitest'
import {
  createRoleFactory,
  location,
  locationConfiguration,
  role,
  roleEnforcement,
} from './role-enforcement-builder'

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

  it('combines named configurations that extend common locations', () => {
    const common = locationConfiguration(
      location('/features/{feature}').subLocation('/domain', ['aggregate']),
    )
    const standard = {
      packages: ['packages/backend'],
      locations: common.extend(
        location('/features/{feature}').subLocation('/commands', ['cli-entrypoint']),
      ),
    }
    const frontend = {
      packages: ['apps/frontend'],
      locations: common.extend(location('/features/{feature}').subLocation('/components', [])),
    }

    const result = roleEnforcement({
      configurations: {
        standard,
        frontend,
      },
      ignorePatterns: [],
      roleDefinitionsDir: '.riviere/role-definitions',
      roles: testRoles,
    })

    expect(result.locationHierarchy.map(({ pathTemplate }) => pathTemplate)).toStrictEqual([
      'packages/backend/src',
      'packages/backend/src/features/{feature}',
      'packages/backend/src/features/{feature}/domain',
      'packages/backend/src/features/{feature}/commands',
      'apps/frontend/src',
      'apps/frontend/src/features/{feature}',
      'apps/frontend/src/features/{feature}/domain',
      'apps/frontend/src/features/{feature}/components',
    ])
    expect(result.include).toStrictEqual([
      'packages/backend/src/**/*.ts',
      'packages/backend/src/**/*.tsx',
      'apps/frontend/src/**/*.ts',
      'apps/frontend/src/**/*.tsx',
    ])
  })

  it('preserves common rules unless an extension explicitly replaces them', () => {
    const common = locationConfiguration(
      location('/features/{feature}', ['aggregate'], {dependencyRules: { canImportSiblings: false },}),
    )
    const preserved = roleEnforcement({
      configurations: {
        standard: {
          packages: ['packages/preserved'],
          locations: common.extend(location('/features/{feature}')),
        },
      },
      ignorePatterns: [],
      roleDefinitionsDir: '.riviere/role-definitions',
      roles: testRoles,
    })
    const replaced = roleEnforcement({
      configurations: {
        standard: {
          packages: ['packages/replaced'],
          locations: common.extend(
            location('/features/{feature}', ['cli-entrypoint'], {dependencyRules: { locations: [] },}),
          ),
        },
      },
      ignorePatterns: [],
      roleDefinitionsDir: '.riviere/role-definitions',
      roles: testRoles,
    })

    expect(
      preserved.locationHierarchy.find(({ name }) => name === '/features/{feature}'),
    ).toMatchObject({
      allowedRoles: ['aggregate'],
      dependencyRules: { canImportSiblings: false },
    })
    expect(
      replaced.locationHierarchy.find(({ name }) => name === '/features/{feature}'),
    ).toMatchObject({
      allowedRoles: ['cli-entrypoint'],
      dependencyRules: { locations: [] },
    })
  })

  it('applies a named configuration to every assigned package', () => {
    const locations = locationConfiguration(
      location('/features/{feature}')
        .subLocation('/domain', ['aggregate'])
        .subLocation('/entrypoint', ['cli-entrypoint']),
    )
    const result = roleEnforcement({
      configurations: {
        standard: {
          packages: ['packages/app-a', 'packages/app-b'],
          locations,
        },
      },
      ignorePatterns: [],
      roleDefinitionsDir: '.riviere/role-definitions',
      roles: testRoles,
    })

    expect(result.locationHierarchy.map((location) => location.pathTemplate)).toStrictEqual([
      'packages/app-a/src',
      'packages/app-a/src/features/{feature}',
      'packages/app-a/src/features/{feature}/domain',
      'packages/app-a/src/features/{feature}/entrypoint',
      'packages/app-b/src',
      'packages/app-b/src/features/{feature}',
      'packages/app-b/src/features/{feature}/domain',
      'packages/app-b/src/features/{feature}/entrypoint',
    ])
  })

  it('derives TypeScript and TSX include patterns from every enforced package', () => {
    const locations = locationConfiguration(location('/domain', { allowAnySubLocations: true }))
    const result = roleEnforcement({
      configurations: {
        standard: {
          packages: ['packages/my-app'],
          locations,
        },
        frontend: {
          packages: ['apps/my-app'],
          locations,
        },
      },
      ignorePatterns: [],
      roleDefinitionsDir: '.riviere/role-definitions',
      roles: testRoles,
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
      configurations: {
        standard: {
          packages: ['packages/my-app'],
          locations: locationConfiguration(location('/domain', { allowAnySubLocations: true })),
        },
      },
      ignorePatterns: ['**/__fixtures__/**'],
      importAliases: { '@/': 'packages/my-app/src/' },
      roleDefinitionsDir: '.riviere/role-definitions',
      roles: testRoles,
      workspacePackageSources: { '@generic/pkg': 'packages/pkg/src/index.ts' },
    })

    expect(result).toMatchObject({
      ignorePatterns: ['**/__fixtures__/**'],
      importAliases: { '@/': 'packages/my-app/src/' },
      roleDefinitionsDir: '.riviere/role-definitions',
      roles: testRoles,
      workspacePackageSources: { '@generic/pkg': 'packages/pkg/src/index.ts' },
    })
  })

  it('builds sub-locations relative to their actual parent', () => {
    const locations = locationConfiguration(
      location<(typeof testRoles)[number]['name']>('/features/{feature}').subLocation(
        location<(typeof testRoles)[number]['name']>('/data-access', ['aggregate']).subLocation(
          '/extraction-project',
          [],
        ),
      ),
    )

    const result = roleEnforcement({
      configurations: {
        standard: {
          packages: ['packages/app'],
          locations,
        },
      },
      ignorePatterns: [],
      roleDefinitionsDir: '.riviere/role-definitions',
      roles: testRoles,
    })

    expect(
      result.locationHierarchy.map(({
        name, parentId, pathTemplate 
      }) => ({
        name,
        parentId,
        pathTemplate,
      })),
    ).toStrictEqual([
      {
        name: '/',
        parentId: undefined,
        pathTemplate: 'packages/app/src',
      },
      {
        name: '/features/{feature}',
        parentId: 'packages/app:packages/app/src',
        pathTemplate: 'packages/app/src/features/{feature}',
      },
      {
        name: '/data-access',
        parentId: 'packages/app:packages/app/src/features/{feature}',
        pathTemplate: 'packages/app/src/features/{feature}/data-access',
      },
      {
        name: '/data-access/extraction-project',
        parentId: 'packages/app:packages/app/src/features/{feature}/data-access',
        pathTemplate: 'packages/app/src/features/{feature}/data-access/extraction-project',
      },
    ])
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
