import type { LocationConfiguration } from './location-configuration'
import { PackageManifestRequirements } from './package-manifest-requirements'

interface PackageConfiguration<R extends string> {
  readonly locations: LocationConfiguration<R>
  readonly packageManifest?: {
    readonly requiredNonEmptyStringProperties: readonly string[]
  }
}

interface AssignedPackageConfiguration<R extends string> {
  readonly configuration: PackageConfiguration<R>
  readonly packagePattern: string
}

/** @riviere-role value-object */
export class PackageConfigurationAssignments<R extends string> {
  declare private readonly brand: 'PackageConfigurationAssignments'

  private constructor(
    readonly values: readonly AssignedPackageConfiguration<R>[],
  ) {}

  static parse<R extends string>(
    configurations: Readonly<Record<string, PackageConfiguration<R>>>,
  ): PackageConfigurationAssignments<R> {
    return new PackageConfigurationAssignments(
      Object.entries(configurations).map(([packagePattern, configuration]) => ({
        configuration,
        packagePattern: directPackagePattern(packagePattern),
      })),
    )
  }

  assignedPackages(): readonly string[] {
    return this.values.map(({ packagePattern }) => packagePattern)
  }

  sourceFilePatterns(): readonly string[] {
    return this.values.flatMap(({ packagePattern }) => [
      `${toGlobPattern(packagePattern)}/src/**/*.ts`,
      `${toGlobPattern(packagePattern)}/src/**/*.tsx`,
    ])
  }

  packageManifestRequirements(): PackageManifestRequirements {
    return PackageManifestRequirements.parse(
      this.values.flatMap(({ packagePattern, configuration }) =>
        configuration.packageManifest === undefined
          ? []
          : [{ packagePattern, ...configuration.packageManifest }],
      ),
    )
  }
}

function directPackagePattern(packagePattern: string): string {
  return packagePattern.endsWith('/')
    ? `${packagePattern.replace(/\/$/, '')}/{package}`
    : packagePattern
}

function toGlobPattern(packagePattern: string): string {
  return packagePattern
    .split('/')
    .map((segment) => (segment.startsWith('{') && segment.endsWith('}') ? '*' : segment))
    .join('/')
}
