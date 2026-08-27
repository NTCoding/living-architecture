import { RoleEnforcementExecutionError } from './role-enforcement-execution-error'

interface PackageManifestRequirement {
  readonly packagePattern: string
  readonly requiredNonEmptyStringProperties: readonly string[]
}

interface WorkspacePackage {
  readonly manifest: unknown
  readonly path: string
}

/** @riviere-role value-object */
export class PackageManifestRequirements {
  declare private readonly brand: 'PackageManifestRequirements'

  private constructor(private readonly requirements: readonly PackageManifestRequirement[]) {}

  static parse(requirements: readonly PackageManifestRequirement[]): PackageManifestRequirements {
    return new PackageManifestRequirements(requirements)
  }

  validate(workspacePackage: WorkspacePackage): void {
    const matchingRequirements = this.requirements.filter((requirement) =>
      packagePatternMatches(requirement.packagePattern, workspacePackage.path),
    )
    for (const requirement of matchingRequirements) {
      this.validateRequiredStrings(requirement, workspacePackage)
    }
  }

  private validateRequiredStrings(
    requirement: PackageManifestRequirement,
    workspacePackage: WorkspacePackage,
  ): void {
    for (const property of requirement.requiredNonEmptyStringProperties) {
      const propertyValue = isRecord(workspacePackage.manifest)
        ? workspacePackage.manifest[property]
        : undefined
      if (!isNonEmptyString(propertyValue)) {
        throw new RoleEnforcementExecutionError(
          `Workspace package '${workspacePackage.path}' must define a non-empty string '${property}' in package.json.`,
        )
      }
    }
  }
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

function isRecord(value: unknown): value is Readonly<Record<string, unknown>> {
  return typeof value === 'object' && value !== null && !Array.isArray(value)
}

function isNonEmptyString(value: unknown): value is string {
  return typeof value === 'string' && value.trim().length > 0
}
