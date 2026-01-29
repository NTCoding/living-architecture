import type {
  ExtractionConfig,
  ResolvedExtractionConfig,
  Module,
  ModuleConfig,
  ComponentRule,
} from '@living-architecture/riviere-extract-config'
import {
  ConfigLoaderRequiredError, MissingComponentRuleError 
} from './config-resolution-errors'

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
    ...(moduleConfig.customTypes !== undefined && { customTypes: moduleConfig.customTypes }),
  }
}

function resolveModuleWithExtends(
  moduleConfig: ModuleConfig,
  extendsSource: string,
  loader?: ConfigLoader,
): Module {
  if (loader === undefined) {
    throw new ConfigLoaderRequiredError(moduleConfig.name)
  }

  const baseModule = loader(extendsSource)
  const mergedCustomTypes = mergeCustomTypes(baseModule.customTypes, moduleConfig.customTypes)
  return {
    name: moduleConfig.name,
    path: moduleConfig.path,
    api: moduleConfig.api ?? baseModule.api,
    useCase: moduleConfig.useCase ?? baseModule.useCase,
    domainOp: moduleConfig.domainOp ?? baseModule.domainOp,
    event: moduleConfig.event ?? baseModule.event,
    eventHandler: moduleConfig.eventHandler ?? baseModule.eventHandler,
    ui: moduleConfig.ui ?? baseModule.ui,
    ...(mergedCustomTypes !== undefined && { customTypes: mergedCustomTypes }),
  }
}

function mergeCustomTypes(
  base: Module['customTypes'],
  local: ModuleConfig['customTypes'],
): Module['customTypes'] {
  if (base === undefined && local === undefined) {
    return undefined
  }
  return {
    ...base,
    ...local,
  }
}

function requireRule(
  rule: ComponentRule | undefined,
  ruleName: string,
  moduleName: string,
): ComponentRule {
  if (rule === undefined) {
    throw new MissingComponentRuleError(moduleName, ruleName)
  }
  return rule
}
