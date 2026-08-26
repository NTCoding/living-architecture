import { RoleEnforcementConfiguration } from './role-enforcement-builder'

/**
 * @riviere-role domain-service
 * @riviere-role-justification TODO: Added before justification rule introduced.
 */
export function filterConfigByPackage(
  config: RoleEnforcementConfiguration,
  packagePath: string,
): RoleEnforcementConfiguration {
  const normalizedPath = stripTrailingSlashes(packagePath)
  const packagePattern = config.assignedPackages.find((pattern) =>
    packagePatternMatches(pattern, normalizedPath),
  )

  if (packagePattern === undefined) {
    throw new PackageFilterError(
      `No include patterns match package '${normalizedPath}'. Available packages: ${config.assignedPackages.join(', ')}`,
    )
  }

  const replacements = placeholderReplacements(packagePattern, normalizedPath)
  const filteredInclude = config.include
    .filter((pattern) => extractPackagePath(pattern) === toGlobPattern(packagePattern))
    .map((pattern) => replacePackageGlob(pattern, normalizedPath))
  const matchingLocations = config.locationHierarchy.filter(
    (location) => location.packagePath === packagePattern,
  )

  return RoleEnforcementConfiguration.parseFromState({
    ...config,
    assignedPackages: [normalizedPath],
    include: filteredInclude,
    locationHierarchy: matchingLocations.map((location) => ({
      ...location,
      id: replacePlaceholders(location.id, replacements),
      packagePath: normalizedPath,
      ...(location.parentId === undefined
        ? {}
        : { parentId: replacePlaceholders(location.parentId, replacements) }),
      pathTemplate: replacePlaceholders(location.pathTemplate, replacements),
    })),
  })
}

function packagePatternMatches(packagePattern: string, packagePath: string): boolean {
  const patternSegments = packagePattern.split('/')
  const pathSegments = packagePath.split('/')
  return (
    patternSegments.length === pathSegments.length &&
    patternSegments.every(
      (segment, index) =>
        (segment.startsWith('{') && segment.endsWith('}')) || segment === pathSegments[index],
    )
  )
}

function placeholderReplacements(
  packagePattern: string,
  packagePath: string,
): ReadonlyMap<string, string> {
  const pathSegments = packagePath.split('/')
  return new Map(
    packagePattern.split('/').flatMap((segment, index) => {
      const replacement = pathSegments[index]
      return replacement !== undefined && segment.startsWith('{') && segment.endsWith('}')
        ? [[segment, replacement]]
        : []
    }),
  )
}

function replacePlaceholders(value: string, replacements: ReadonlyMap<string, string>): string {
  return [...replacements].reduce(
    (result, [placeholder, replacement]) => result.replaceAll(placeholder, replacement),
    value,
  )
}

function replacePackageGlob(includePattern: string, packagePath: string): string {
  const srcIndex = includePattern.indexOf('/src/')
  return srcIndex < 0 ? includePattern : `${packagePath}${includePattern.slice(srcIndex)}`
}

function toGlobPattern(packagePattern: string): string {
  return packagePattern
    .split('/')
    .map((segment) => (segment.startsWith('{') && segment.endsWith('}') ? '*' : segment))
    .join('/')
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
