import { describe, expect, it } from 'vitest'
import { filterConfigByPackage, PackageFilterError } from './filter-config-by-package'
import type { RoleEnforcementResult } from './role-enforcement-builder'
import { location, locationConfiguration, role, roleEnforcement } from './role-enforcement-builder'

const testRoles = [
  role('cli-entrypoint', { targets: ['function'] }),
  role('aggregate', { targets: ['class'] }),
] as const

function createMultiPackageConfig(): RoleEnforcementResult {
  return roleEnforcement({
    configurations: {
      standard: {
        packages: ['packages/riviere-cli', 'packages/riviere-extract-ts'],
        locations: locationConfiguration(
          location('src/features/{feature}')
            .subLocation('/domain', ['aggregate'])
            .subLocation('/entrypoint', ['cli-entrypoint']),
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

    expect(() => filterConfigByPackage(config, 'packages/nonexistent')).toThrow(PackageFilterError)
  })

  it('includes available packages in error message', () => {
    const config = createMultiPackageConfig()

    expect(() => filterConfigByPackage(config, 'packages/nonexistent')).toThrow(
      /packages\/riviere-cli, packages\/riviere-extract-ts/,
    )
  })

  it('uses full pattern as package name when include pattern has no /src/ segment', () => {
    const config: RoleEnforcementResult = {
      ...createMultiPackageConfig(),
      include: ['custom-path/**/*.ts'],
    }

    expect(() => filterConfigByPackage(config, 'packages/nonexistent')).toThrow(
      /custom-path\/\*\*\/\*\.ts/,
    )
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

  it('preserves workspacePackageSources when present', () => {
    const sources = {'@living-architecture/riviere-builder': 'packages/riviere-builder/src/index.ts',}
    const config: RoleEnforcementResult = {
      ...createMultiPackageConfig(),
      workspacePackageSources: sources,
    }

    const result = filterConfigByPackage(config, 'packages/riviere-cli')

    expect(result.workspacePackageSources).toStrictEqual(sources)
  })
})
