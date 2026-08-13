import { RoleEnforcementConfiguration } from './role-enforcement-builder'

/** @riviere-role domain-service */
export function filterConfigByPackage(
  config: RoleEnforcementConfiguration,
  packagePath: string,
): RoleEnforcementConfiguration {
  const normalizedPath = stripTrailingSlashes(packagePath)

  const filteredInclude = config.include.filter((pattern) =>
    pattern.startsWith(`${normalizedPath}/`),
  )

  if (filteredInclude.length === 0) {
    throw new PackageFilterError(
      `No include patterns match package '${normalizedPath}'. Available packages: ${config.include.map(extractPackagePath).join(', ')}`,
    )
  }

  return RoleEnforcementConfiguration.parse({
    ...config,
    assignedPackages: [normalizedPath],
    include: filteredInclude,
    locationHierarchy: config.locationHierarchy.filter((location) =>
      location.pathTemplate.startsWith(`${normalizedPath}/`),
    ),
  }).data
}

function extractPackagePath(includePattern: string): string {
  const srcIndex = includePattern.indexOf('/src/')
  if (srcIndex < 0) {
    return includePattern
  }
  return includePattern.slice(0, srcIndex)
}

function stripTrailingSlashes(value: string): string {
  if (!value.endsWith('/')) {
    return value
  }
  const chars = [...value]
  while (chars.length > 0 && chars[chars.length - 1] === '/') {
    chars.pop()
  }
  return chars.join('')
}

/** @riviere-role domain-error */
export class PackageFilterError extends Error {
  constructor(message: string) {
    super(message)
    this.name = 'PackageFilterError'
  }
}
