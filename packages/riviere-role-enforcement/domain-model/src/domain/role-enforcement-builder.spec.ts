import { describe, expect, it } from 'vitest'
import {
  BuiltRole,
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

  it('applies a package-pattern configuration to every matching package', () => {
    const locations = locationConfiguration(
      location('/features/{feature}', {
        domain: ['aggregate'],
        entrypoint: ['cli-entrypoint'],
      }),
    )
    const result = roleEnforcementConfiguration({
      configurations: {
        'packages/{app}': { locations },
      },
      ignorePatterns: [],
      roleDefinitionsDir: '.riviere/role-definitions',
      roles: testRoles,
    })

    expect(result.locationHierarchy.map((location) => location.pathTemplate)).toStrictEqual([
      'packages/{app}/src',
      'packages/{app}/src/features/{feature}',
      'packages/{app}/src/features/{feature}/domain',
      'packages/{app}/src/features/{feature}/entrypoint',
    ])
  })

  it('applies a package configuration to each package directly inside its configured folder', () => {
    const locations = locationConfiguration(location('/features', []))

    const result = roleEnforcementConfiguration({
      configurations: {
        'apps/': { locations },
      },
      ignorePatterns: [],
      roleDefinitionsDir: '.riviere/role-definitions',
      roles: testRoles,
    })

    expect(result.assignedPackages).toStrictEqual(['apps/{package}'])
    expect(result.include).toStrictEqual(['apps/*/src/**/*.ts', 'apps/*/src/**/*.tsx'])
  })

  it('assigns explicitly named packages beneath the same parent pattern', () => {
    const domainLocations = locationConfiguration(
      location('/domain', { allowAnySubLocations: true }),
    )
    const useCaseLocations = locationConfiguration(location('/features', []))

    const result = roleEnforcementConfiguration({
      configurations: {
        'packages/{subdomain}/domain-model': { locations: domainLocations },
        'packages/{subdomain}/use-cases': { locations: useCaseLocations },
      },
      ignorePatterns: [],
      roleDefinitionsDir: '.riviere/role-definitions',
      roles: testRoles,
    })

    expect(result.assignedPackages).toStrictEqual([
      'packages/{subdomain}/domain-model',
      'packages/{subdomain}/use-cases',
    ])
    expect(result.include).toStrictEqual([
      'packages/*/domain-model/src/**/*.ts',
      'packages/*/domain-model/src/**/*.tsx',
      'packages/*/use-cases/src/**/*.ts',
      'packages/*/use-cases/src/**/*.tsx',
    ])
  })

  it('derives TypeScript and TSX include patterns from every enforced package', () => {
    const locations = locationConfiguration(location('/domain', { allowAnySubLocations: true }))
    const result = roleEnforcementConfiguration({
      configurations: {
        'packages/my-app': { locations },
        'apps/my-app': { locations },
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
        'packages/my-app': {
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
      location<(typeof testRoles)[number]['name']>('/features/{feature}', {
        'data-access': {
          roles: ['aggregate'],
          'extraction-project': [],
        },
      }),
    )

    const result = roleEnforcementConfiguration({
      configurations: {
        'packages/app': { locations },
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

  it('adds unassigned packages to ignored source paths', () => {
    const result = roleEnforcementConfiguration({
      configurations: {
        'packages/app': {
          locations: locationConfiguration(location('/domain', [])),
        },
      },
      ignorePatterns: [],
      roleDefinitionsDir: '.riviere/role-definitions',
      roles: testRoles,
      unassignedPackages: ['apps/eclair'],
    })

    expect(result.ignorePatterns).toStrictEqual(['apps/eclair/src/**'])
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

describe('semantic role rules', () => {
  it.each([
    [{ requiresDecoratorSignature: true }, ['function']],
    [{ requiresStringLiteralConstant: true }, ['variable']],
    [{ mustBeDataStructure: true }, ['interface', 'type-alias']],
    [{ requiresUnion: true }, ['type-alias']],
    [{ returns: [{ success: true, '*': 'semantic-role' }] }, ['function']],
  ] as const)('infers the declaration target from a semantic role rule', (options, targets) => {
    const result = role('semantic-role', options)

    expect(result.targets).toStrictEqual(targets)
  })

  it('rejects a role without a declaration target or semantic rule', () => {
    expect(() => {
      // @ts-expect-error untyped JavaScript callers still require runtime protection
      role('invalid-role', {})
    }).toThrow('A role must declare a target or semantic rule.')
  })
})
