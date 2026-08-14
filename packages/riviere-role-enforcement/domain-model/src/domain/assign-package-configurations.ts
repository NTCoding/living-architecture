import type { LocationConfiguration } from './location-configuration'

interface LocationSet<R extends string> {
  readonly locations: LocationConfiguration<R>
}

interface PackageTypeLocationSet<R extends string> extends LocationSet<R> {
  readonly packageType: string
}

type PackageConfigurationAssignments<R extends string> = readonly (readonly [
  string,
  LocationSet<R>,
])[]

/** @riviere-role domain-service */
export function assignPackageConfigurations<R extends string>(
  configurations: Readonly<Record<string, LocationSet<R> | PackageTypeLocationSet<R>[]>>,
): PackageConfigurationAssignments<R> {
  return Object.entries(configurations).flatMap(([packagePattern, configuration]) =>
    Array.isArray(configuration)
      ? configuration.map(
          (packageConfiguration) =>
            [
              `${packagePattern.replace(/\/$/, '')}/${packageConfiguration.packageType.replace(
                /^\//,
                '',
              )}`,
              packageConfiguration,
            ] as const,
        )
      : [[directPackagePattern(packagePattern), configuration] as const],
  )
}

function directPackagePattern(packagePattern: string): string {
  return packagePattern.endsWith('/')
    ? `${packagePattern.replace(/\/$/, '')}/{package}`
    : packagePattern
}
