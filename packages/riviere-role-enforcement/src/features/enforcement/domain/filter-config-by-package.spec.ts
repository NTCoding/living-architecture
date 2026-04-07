import {
  filterConfigByPackage, PackageFilterError 
} from './filter-config-by-package'
import type { RoleEnforcementResult } from './role-enforcement-builder'
import { role } from './role-enforcement-builder'

const testRoles = [
  role('cli-entrypoint', { targets: ['function'] }),
  role('aggregate', { targets: ['class'] }),
] as const

function createMultiPackageConfig(): RoleEnforcementResult {
  return {
    ignorePatterns: ['**/*.spec.ts'],
    include: ['packages/riviere-cli/src/**/*.ts', 'packages/riviere-extract-ts/src/**/*.ts'],
    layers: {
      'packages/riviere-cli/src/features/entrypoint': {
        allowedRoles: ['cli-entrypoint'],
        paths: ['packages/riviere-cli/src/features/entrypoint'],
      },
      'packages/riviere-cli/src/features/domain': {
        allowedRoles: ['aggregate'],
        paths: ['packages/riviere-cli/src/features/domain'],
      },
      'packages/riviere-extract-ts/src/features/entrypoint': {
        allowedRoles: ['cli-entrypoint'],
        paths: ['packages/riviere-extract-ts/src/features/entrypoint'],
      },
    },
    roleDefinitionsDir: '.riviere/role-definitions',
    roles: testRoles,
  }
}

describe('filterConfigByPackage', () => {
  it('filters include patterns to the specified package', () => {
    const config = createMultiPackageConfig()

    const result = filterConfigByPackage(config, 'packages/riviere-cli')

    expect(result.include).toStrictEqual(['packages/riviere-cli/src/**/*.ts'])
  })

  it('filters layers to the specified package', () => {
    const config = createMultiPackageConfig()

    const result = filterConfigByPackage(config, 'packages/riviere-cli')

    expect(Object.keys(result.layers)).toStrictEqual([
      'packages/riviere-cli/src/features/entrypoint',
      'packages/riviere-cli/src/features/domain',
    ])
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

    expect(result.include).toStrictEqual(['packages/riviere-cli/src/**/*.ts'])
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

    expect(result.include).toStrictEqual(['packages/riviere-extract-ts/src/**/*.ts'])
    expect(Object.keys(result.layers)).toStrictEqual([
      'packages/riviere-extract-ts/src/features/entrypoint',
    ])
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

  it('preserves layer properties including forbiddenImports', () => {
    const entrypointLayer = {
      allowedRoles: ['cli-entrypoint'],
      forbiddenImports: ['**/infra/persistence/**'],
      paths: ['packages/riviere-cli/src/features/entrypoint'],
    }
    const config: RoleEnforcementResult = {
      ...createMultiPackageConfig(),
      layers: { 'packages/riviere-cli/src/features/entrypoint': entrypointLayer },
    }

    const result = filterConfigByPackage(config, 'packages/riviere-cli')

    expect(result.layers['packages/riviere-cli/src/features/entrypoint']).toStrictEqual(
      entrypointLayer,
    )
  })
})
