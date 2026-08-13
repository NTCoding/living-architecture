import { describe, expect, it } from 'vitest'
import {
  BuiltRole,
  createRoleFactory,
  location,
  locationConfiguration,
  role,
  roleEnforcementConfiguration,
  RoleEnforcementConfiguration,
} from './role-enforcement-builder'
import { RoleEnforcementExecutionError } from './role-enforcement-execution-error'

function expectBuiltRole(result: BuiltRole, expected: object): void {
  expect(result).toBeInstanceOf(BuiltRole)
  expect({ ...result }).toStrictEqual(expected)
}

describe('role', () => {
  it('produces a role definition with the given name and options', () => {
    const result = role('aggregate', { targets: ['interface', 'type-alias', 'class'] })

    expectBuiltRole(result, {
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

    expectBuiltRole(result, {
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

    expectBuiltRole(result, {
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

    expectBuiltRole(result, {
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

    expectBuiltRole(result, {
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

    expectBuiltRole(result, {
      name: 'role-b',
      targets: ['class'],
      requiredPrivateMembers: ['brand'],
    })
  })

  it('includes generic class state constraints when provided', () => {
    const result = role('role-b', {
      targets: ['class'],
      requiresDataMembers: true,
      forbiddenCallableDataMembers: true,
      requiresPrivateConstructor: true,
      requiredStaticMethodNamePrefix: 'parse',
    })

    expectBuiltRole(result, {
      name: 'role-b',
      targets: ['class'],
      requiresDataMembers: true,
      forbiddenCallableDataMembers: true,
      requiresPrivateConstructor: true,
      requiredStaticMethodNamePrefix: 'parse',
    })
  })

  it('includes forbiddenMethodCalls when provided', () => {
    const result = role('main', {
      targets: ['function'],
      forbiddenMethodCalls: ['command-use-case', 'aggregate-repository'],
    })

    expectBuiltRole(result, {
      name: 'main',
      targets: ['function'],
      forbiddenMethodCalls: ['command-use-case', 'aggregate-repository'],
    })
  })
})

describe('roleEnforcementConfiguration', () => {
  const testRoles = [
    role('cli-entrypoint', { targets: ['function'] }),
    role('aggregate', { targets: ['class'] }),
  ] as const

  it('applies a named configuration to every assigned package', () => {
    const locations = locationConfiguration(
      location('/features/{feature}')
        .subLocation('/domain', ['aggregate'])
        .subLocation('/entrypoint', ['cli-entrypoint']),
    )
    const result = roleEnforcementConfiguration({
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
    const result = roleEnforcementConfiguration({
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
    const result = roleEnforcementConfiguration({
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
    })

    expect(result).toMatchObject({
      ignorePatterns: ['**/__fixtures__/**'],
      importAliases: { '@/': 'packages/my-app/src/' },
      roleDefinitionsDir: '.riviere/role-definitions',
      roles: testRoles,
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

    const result = roleEnforcementConfiguration({
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
      result.locationHierarchy.map(({ name, parentId, pathTemplate }) => ({
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

describe('RoleEnforcementConfiguration.parse', () => {
  const completeConfiguration = {
    assignedPackages: [],
    ignorePatterns: [],
    include: ['packages/app/src/**/*.ts'],
    locationHierarchy: [],
    roleDefinitionsDir: '.riviere/role-definitions',
    roles: [],
    unassignedPackages: [],
  }

  it('returns the configuration when all required values are present', () => {
    const result = RoleEnforcementConfiguration.parse(completeConfiguration)

    expect(result).toStrictEqual({
      success: true,
      data: expect.any(RoleEnforcementConfiguration),
    })
  })

  it('returns an error when the configuration is not an object', () => {
    const result = RoleEnforcementConfiguration.parse(undefined)

    expect(result).toStrictEqual({
      success: false,
      error: new RoleEnforcementExecutionError('Role enforcement configuration must be an object.'),
    })
  })

  it.each([
    'assignedPackages',
    'include',
    'ignorePatterns',
    'locationHierarchy',
    'roles',
    'roleDefinitionsDir',
    'unassignedPackages',
  ])("returns an error when '%s' is missing", (missingProperty) => {
    const incompleteConfiguration: Record<string, unknown> = { ...completeConfiguration }
    delete incompleteConfiguration[missingProperty]

    const result = RoleEnforcementConfiguration.parse(incompleteConfiguration)

    expect(result).toStrictEqual({
      success: false,
      error: new RoleEnforcementExecutionError(
        `Role enforcement configuration is missing required property '${missingProperty}'.`,
      ),
    })
  })
})

describe('createRoleFactory', () => {
  it('produces a role with typed name constraint', () => {
    type TestRole = 'aggregate' | 'aggregate-repository'
    const typedRole = createRoleFactory<TestRole>()

    const result = typedRole('aggregate', { targets: ['class'] })

    expectBuiltRole(result, {
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

  it.each([
    [{ requiresDecoratorSignature: true }, ['function']],
    [{ requiresStringLiteralConstant: true }, ['variable']],
    [{ requiresDataStructure: true }, ['interface']],
    [{ requiresUnion: true }, ['type-alias']],
    [{ returns: [{ success: true, '*': 'semantic-role' }] }, ['function']],
  ] as const)('infers the declaration target from a semantic role rule', (options, targets) => {
    type TestRole = 'semantic-role'
    const typedRole = createRoleFactory<TestRole>()

    const result = typedRole('semantic-role', options)

    expect(result.targets).toStrictEqual(targets)
  })

  it('rejects a role without a declaration target or semantic rule', () => {
    type TestRole = 'invalid-role'
    const typedRole = createRoleFactory<TestRole>()

    expect(() => {
      // @ts-expect-error untyped JavaScript callers still require runtime protection
      typedRole('invalid-role', {})
    }).toThrow('A role must declare a target or semantic rule.')
  })
})
