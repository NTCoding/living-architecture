export class ConfigLoaderRequiredError extends Error {
  readonly moduleName: string

  constructor(moduleName: string) {
    super(`Module '${moduleName}' uses extends but no config loader was provided.`)
    this.name = 'ConfigLoaderRequiredError'
    this.moduleName = moduleName
  }
}

export class MissingComponentRuleError extends Error {
  readonly moduleName: string
  readonly ruleName: string

  constructor(moduleName: string, ruleName: string) {
    super(
      `Module '${moduleName}' is missing required rule '${ruleName}'. ` +
        `Either provide the rule or use extends to inherit from a base config.`,
    )
    this.name = 'MissingComponentRuleError'
    this.moduleName = moduleName
    this.ruleName = ruleName
  }
}
