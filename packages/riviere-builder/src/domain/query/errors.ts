/** @riviere-role domain-error */
export class ComponentNotFoundError extends Error {
  readonly componentId: string
  readonly suggestions: string[]

  constructor(componentId: string, suggestions: string[] = []) {
    super(`Component '${componentId}' not found`)
    this.name = 'ComponentNotFoundError'
    this.componentId = componentId
    this.suggestions = suggestions
  }
}

/** @riviere-role domain-error */
export class InvalidRiviereGraphError extends Error {
  readonly issues: readonly string[]

  constructor(issues: readonly string[]) {
    super(`Invalid RiviereGraph:\n${issues.join('\n')}`)
    this.name = 'InvalidRiviereGraphError'
    this.issues = issues
  }
}
