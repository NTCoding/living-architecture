import type { LocationConfiguration } from './location-configuration'

interface LocationSet<R extends string> {
  readonly locations: LocationConfiguration<R>
}

type PackageConfigurationAssignments<T> = readonly (readonly [string, T])[]

/** @riviere-role domain-service */
export function assignPackageConfigurations<R extends string, T extends LocationSet<R>>(
  configurations: Readonly<Record<string, T>>,
): PackageConfigurationAssignments<T> {
  return Object.entries(configurations).map(
    ([packagePattern, configuration]) =>
      [directPackagePattern(packagePattern), configuration] as const,
  )
}

function directPackagePattern(packagePattern: string): string {
  return packagePattern.endsWith('/')
    ? `${packagePattern.replace(/\/$/, '')}/{package}`
    : packagePattern
}
