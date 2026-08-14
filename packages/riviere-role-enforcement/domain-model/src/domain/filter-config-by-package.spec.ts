import { describe, expect, it } from 'vitest'
import { filterConfigByPackage, PackageFilterError } from './filter-config-by-package'
import {
  location,
  locationConfiguration,
  role,
  roleEnforcementConfiguration,
  RoleEnforcementConfiguration,
} from './role-enforcement-builder'

const testRoles = [
  role('cli-entrypoint', { targets: ['function'] }),
  role('aggregate', { targets: ['class'] }),
] as const

function expectValidConfiguration(
  result: ReturnType<typeof RoleEnforcementConfiguration.parse>,
): RoleEnforcementConfiguration {
  if (!result.success) throw result.error
  return result.data
}

function createMultiPackageConfig(): RoleEnforcementConfiguration {
  return roleEnforcementConfiguration({
    configurations: {
      'packages/{package}': {
        locations: locationConfiguration(
          location('/features/{feature}', {
            domain: ['aggregate'],
            entrypoint: ['cli-entrypoint'],
          }),
        ),
      },
    },
    ignorePatterns: ['**/*.spec.ts'],
    roleDefinitionsDir: '.riviere/role-definitions',
    roles: testRoles,
  })
}

describe('filterConfigByPackage', () => {
  it('filters include patterns to the specified package', () => {
    const config = createMultiPackageConfig()

    const result = filterConfigByPackage(config, 'packages/riviere-cli')

    expect(result.include).toStrictEqual([
      'packages/riviere-cli/src/**/*.ts',
      'packages/riviere-cli/src/**/*.tsx',
    ])
  })

  it('filters the location hierarchy to the specified package', () => {
    const config = createMultiPackageConfig()

    const result = filterConfigByPackage(config, 'packages/riviere-cli')

    expect(
      result.locationHierarchy.every((location) => location.packagePath === 'packages/riviere-cli'),
    ).toBe(true)
  })

  it('preserves ignorePatterns unchanged', () => {
    const config = createMultiPackageConfig()

    const result = filterConfigByPackage(config, 'packages/riviere-cli')

    expect(result.ignorePatterns).toStrictEqual(['**/*.spec.ts'])
  })

  it('preserves roles unchanged', () => {
    const config = createMultiPackageConfig()

    const result = filterConfigByPackage(config, 'packages/riviere-cli')

    expect(result.roles).toBe(testRoles)
  })

  it('preserves roleDefinitionsDir unchanged', () => {
    const config = createMultiPackageConfig()

    const result = filterConfigByPackage(config, 'packages/riviere-cli')

    expect(result.roleDefinitionsDir).toBe('.riviere/role-definitions')
  })

  it('strips trailing slashes from package path', () => {
    const config = createMultiPackageConfig()

    const result = filterConfigByPackage(config, 'packages/riviere-cli/')

    expect(result.include).toStrictEqual([
      'packages/riviere-cli/src/**/*.ts',
      'packages/riviere-cli/src/**/*.tsx',
    ])
  })

  it('throws PackageFilterError when package matches no include patterns', () => {
    const config = createMultiPackageConfig()

    expect(() => filterConfigByPackage(config, 'apps/nonexistent')).toThrow(PackageFilterError)
  })

  it('includes available packages in error message', () => {
    const config = createMultiPackageConfig()

    expect(() => filterConfigByPackage(config, 'apps/nonexistent')).toThrow(/packages\/\{package\}/)
  })

  it('filters to the other package when specified', () => {
    const config = createMultiPackageConfig()

    const result = filterConfigByPackage(config, 'packages/riviere-extract-ts')

    expect(result.include).toStrictEqual([
      'packages/riviere-extract-ts/src/**/*.ts',
      'packages/riviere-extract-ts/src/**/*.tsx',
    ])
    expect(
      result.locationHierarchy.every(
        (location) => location.packagePath === 'packages/riviere-extract-ts',
      ),
    ).toBe(true)
  })

  it('keeps an include pattern without a source folder unchanged', () => {
    const config = expectValidConfiguration(
      RoleEnforcementConfiguration.parse({
        ...createMultiPackageConfig(),
        include: ['packages/*'],
      }),
    )

    const result = filterConfigByPackage(config, 'packages/riviere-cli')

    expect(result.include).toStrictEqual(['packages/*'])
  })
})
