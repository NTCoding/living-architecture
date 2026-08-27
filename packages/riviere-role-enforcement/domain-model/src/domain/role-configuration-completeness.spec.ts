import { describe, expect, it } from 'vitest'
import {
  location,
  locationConfiguration,
  role,
  RoleEnforcementConfiguration,
} from './role-enforcement-builder'

describe('role configuration completeness', () => {
  it('rejects duplicate role definitions', () => {
    expect(() =>
      RoleEnforcementConfiguration.parse({
        configurations: {
          'packages/app': {
            locations: locationConfiguration(location('/domain', ['aggregate'])),
          },
        },
        ignorePatterns: [],
        roleDefinitionsDir: '.riviere/role-definitions',
        roles: [
          role('aggregate', { targets: ['class'] }),
          role('aggregate', { targets: ['interface'] }),
        ],
      }),
    ).toThrow("Role 'aggregate' is defined more than once.")
  })

  it('rejects a location role that has no definition', () => {
    expect(() =>
      RoleEnforcementConfiguration.parse({
        configurations: {
          'packages/app': {
            locations: locationConfiguration(location('/domain', ['missing-role'])),
          },
        },
        ignorePatterns: [],
        roleDefinitionsDir: '.riviere/role-definitions',
        roles: [role('known-role', { targets: ['class'] })],
      }),
    ).toThrow("Location '/domain' allows unknown role 'missing-role'.")
  })

  it('rejects a role rule that references an unknown role', () => {
    expect(() =>
      RoleEnforcementConfiguration.parse({
        configurations: {
          'packages/app': {
            locations: locationConfiguration(location('/domain', ['known-role'])),
          },
        },
        ignorePatterns: [],
        roleDefinitionsDir: '.riviere/role-definitions',
        roles: [
          role('known-role', {
            targets: ['class'],
            forbiddenDependencies: ['missing-role'],
          }),
        ],
      }),
    ).toThrow("Role 'known-role' references unknown role 'missing-role'.")
  })

  it('rejects an unknown role referenced by an indexed access type rule', () => {
    expect(() =>
      RoleEnforcementConfiguration.parse({
        configurations: {
          'packages/app': {
            locations: locationConfiguration(location('/domain', ['known-role'])),
          },
        },
        ignorePatterns: [],
        roleDefinitionsDir: '.riviere/role-definitions',
        roles: [
          role('known-role', {
            targets: ['type-alias'],
            requiresIndexedAccessTypeFromRole: 'missing-role',
          }),
        ],
      }),
    ).toThrow("Role 'known-role' references unknown role 'missing-role'.")
  })

  it('rejects an unknown role in a role-filtered location import', () => {
    expect(() =>
      RoleEnforcementConfiguration.parse({
        configurations: {
          'packages/app': {
            locations: locationConfiguration(
              location('/actions', ['known-role'], {
                importRules: { allow: { sibling: [{ records: ['missing-role'] }] } },
              }),
            ),
          },
        },
        ignorePatterns: [],
        roleDefinitionsDir: '.riviere/role-definitions',
        roles: [role('known-role', { targets: ['class'] })],
      }),
    ).toThrow("Location '/actions' allows unknown role 'missing-role'.")
  })

  it('accepts a parser failure branch without a role-constrained result', () => {
    expect(() =>
      RoleEnforcementConfiguration.parse({
        configurations: {
          'packages/app': {
            locations: locationConfiguration(location('/api', ['parser', 'schema'])),
          },
        },
        ignorePatterns: [],
        roleDefinitionsDir: '.riviere/role-definitions',
        roles: [
          role('parser', {
            returns: [
              { success: true, '*': 'schema' },
              { success: false, '*': '*' },
            ],
          }),
          role('schema', { mustBeDataStructure: true }),
        ],
      }),
    ).not.toThrow()
  })
})
