import type { LocationConfiguration } from './location-configuration'

interface LocationSet<R extends string> {
  readonly locations: LocationConfiguration<R>
}

type PackageConfigurationAssignments<R extends string> = readonly (readonly [
  string,
  LocationSet<R>,
])[]

/** @riviere-role domain-service */
export function assignPackageConfigurations<R extends string>(
  configurations: Readonly<Record<string, LocationSet<R>>>,
): PackageConfigurationAssignments<R> {
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
