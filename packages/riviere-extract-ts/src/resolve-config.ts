import type {
  ExtractionConfig,
  ResolvedExtractionConfig,
  Module,
  ModuleConfig,
  ComponentRule,
} from '@living-architecture/riviere-extract-config'

export type ConfigLoader = (source: string) => Module

export function resolveConfig(
  config: ExtractionConfig,
  loader?: ConfigLoader,
): ResolvedExtractionConfig {
  return {
    ...config,
    modules: config.modules.map((m) => resolveModule(m, loader)),
  }
}

function resolveModule(moduleConfig: ModuleConfig, loader?: ConfigLoader): Module {
  const extendsSource = moduleConfig.extends
  if (extendsSource !== undefined) {
    return resolveModuleWithExtends(moduleConfig, extendsSource, loader)
  }

  return {
    name: moduleConfig.name,
    path: moduleConfig.path,
    api: requireRule(moduleConfig.api, 'api', moduleConfig.name),
    useCase: requireRule(moduleConfig.useCase, 'useCase', moduleConfig.name),
    domainOp: requireRule(moduleConfig.domainOp, 'domainOp', moduleConfig.name),
    event: requireRule(moduleConfig.event, 'event', moduleConfig.name),
    eventHandler: requireRule(moduleConfig.eventHandler, 'eventHandler', moduleConfig.name),
    ui: requireRule(moduleConfig.ui, 'ui', moduleConfig.name),
  }
}

function resolveModuleWithExtends(
  moduleConfig: ModuleConfig,
  extendsSource: string,
  loader?: ConfigLoader,
): Module {
  if (loader === undefined) {
    throw new Error(`Module '${moduleConfig.name}' uses extends but no config loader was provided.`)
  }

  const baseModule = loader(extendsSource)
  return {
    name: moduleConfig.name,
    path: moduleConfig.path,
    api: moduleConfig.api ?? baseModule.api,
    useCase: moduleConfig.useCase ?? baseModule.useCase,
    domainOp: moduleConfig.domainOp ?? baseModule.domainOp,
    event: moduleConfig.event ?? baseModule.event,
    eventHandler: moduleConfig.eventHandler ?? baseModule.eventHandler,
    ui: moduleConfig.ui ?? baseModule.ui,
  }
}

function requireRule(
  rule: ComponentRule | undefined,
  ruleName: string,
  moduleName: string,
): ComponentRule {
  if (rule === undefined) {
    throw new Error(
      `Module '${moduleName}' is missing required rule '${ruleName}'. ` +
        `Either provide the rule or use extends to inherit from a base config.`,
    )
  }
  return rule
}
