import { describe, expect, it } from 'vitest'
import { location, locationConfiguration } from './location-configuration'
import {
  roleEnforcementConfiguration,
  type RoleEnforcementConfiguration,
} from './role-enforcement-builder'

describe('location configuration', () => {
  it('keeps location import rules and disabled role enforcement', () => {
    const result = roleEnforcementConfiguration({
      configurations: {
        'packages/app': {
          locations: locationConfiguration(
            location('/published-language', [], {
              'eslint-plugin': { roleEnforcement: false },
              importRules: { allow: { sibling: ['infra'] } },
            }),
          ),
        },
      },
      ignorePatterns: [],
      roleDefinitionsDir: '.riviere/role-definitions',
      roles: [],
    })

    expect(result.locationHierarchy).toStrictEqual(
      expect.arrayContaining([
        expect.objectContaining({
          importRules: { allow: { sibling: ['infra'] } },
          name: '/published-language',
        }),
        expect.objectContaining({ name: '/eslint-plugin', roleEnforcement: false }),
      ]),
    )
  })

  it('rejects explicit children inside an unrestricted location', () => {
    expect(() =>
      location('/domain', [], {
        allowAnySubLocations: true,
        child: [],
      }),
    ).toThrow("Location '/domain' cannot define both allowAnySubLocations and subLocations")
  })

  it('rejects a nested unrestricted location with a separately declared descendant', () => {
    expect(() =>
      location('/features', {
        domain: { allowAnySubLocations: true },
        'domain/connection-detection': [],
      }),
    ).toThrow("Location 'domain' cannot define both allowAnySubLocations and subLocations")
  })

  it('rejects a sub-location without roles, rules or children', () => {
    expect(() =>
      location('/features', {
        // @ts-expect-error runtime validation protects JavaScript configuration files
        domain: 'invalid',
      }),
    ).toThrow("Sub-location 'domain' must define roles or sub-locations.")
  })

  it('accepts roles inside a sub-location object', () => {
    const result = location<'aggregate'>('/features', {
      domain: { roles: ['aggregate'] },
    })

    expect(result.subLocations[0]?.allowedRoles).toStrictEqual(['aggregate'])
  })

  it('exposes roles and import rules from a location definition', () => {
    const result = location('/domain', ['aggregate'], {
      importRules: { allow: { root: ['utilities'] } },
    })

    expect(result.allowedRoles).toStrictEqual(['aggregate'])
    expect(result.importRules).toStrictEqual({ allow: { root: ['utilities'] } })
  })

  it('ignores empty path segments when checking nested unrestricted locations', () => {
    expect(() =>
      location('/features', {
        '/domain/': { allowAnySubLocations: true },
        '/domain//connection-detection': [],
      }),
    ).toThrow("Location '/domain/' cannot define both allowAnySubLocations and subLocations")
  })

  it('rejects a child import rule already allowed by its parent', () => {
    expect(() =>
      roleEnforcementConfiguration({
        configurations: {
          'packages/app': {
            locations: locationConfiguration(
              location('/areas/{area}', {
                actions: {
                  importRules: { allow: { root: ['utilities'] } },
                },
                importRules: { allow: { root: ['utilities'] } },
              }),
            ),
          },
        },
        ignorePatterns: [],
        roleDefinitionsDir: '.riviere/role-definitions',
        roles: [],
      }),
    ).toThrow("Location '/actions' repeats inherited root import 'utilities'.")
  })
})

describe('RoleEnforcementConfiguration.validateWorkspacePackages', () => {
  function configuredWorkspace(
    configurations: Readonly<
      Record<string, { locations: ReturnType<typeof locationConfiguration> }>
    >,
    unassignedPackages: readonly string[] = [],
  ): RoleEnforcementConfiguration {
    return roleEnforcementConfiguration({
      configurations,
      ignorePatterns: [],
      roleDefinitionsDir: '.riviere/role-definitions',
      roles: [],
      unassignedPackages,
    })
  }

  it('accepts assigned and explicitly unassigned packages', () => {
    const config = configuredWorkspace(
      {
        'packages/{package}': {
          locations: locationConfiguration(location('/domain', [])),
        },
      },
      ['apps/eclair'],
    )

    expect(() =>
      config.validateWorkspacePackages(['packages/builder', 'apps/eclair']),
    ).not.toThrow()
  })

  it('rejects an unassigned workspace package', () => {
    const config = configuredWorkspace({
      'packages/{package}': {
        locations: locationConfiguration(location('/domain', [])),
      },
    })

    expect(() => config.validateWorkspacePackages(['apps/cli'])).toThrow(
      "Workspace package 'apps/cli' has no role-enforcement configuration",
    )
  })

  it('rejects a package outside the explicitly configured package folders', () => {
    const config = configuredWorkspace({
      'modules/{group}/consumer': {
        locations: locationConfiguration(location('/actions', [])),
      },
      'modules/{group}/provider': {
        locations: locationConfiguration(location('/api', [])),
      },
    })

    expect(() => config.validateWorkspacePackages(['modules/payments/random'])).toThrow(
      "Workspace package 'modules/payments/random' has no role-enforcement configuration",
    )
  })

  it('rejects a workspace package assigned more than once', () => {
    const locations = locationConfiguration(location('/domain', []))
    const config = configuredWorkspace({
      'packages/{package}': { locations },
      'packages/builder': { locations },
    })

    expect(() => config.validateWorkspacePackages(['packages/builder'])).toThrow(
      "Workspace package 'packages/builder' is assigned to more than one role-enforcement configuration.",
    )
  })
})
