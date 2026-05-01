import type {
  ExtractionConfig,
  ResolvedExtractionConfig,
  ComponentRule,
  Module,
  ModuleConfig,
} from '@living-architecture/riviere-extract-config'
import { MissingComponentRuleError } from './config-resolution-errors'

/** @riviere-role domain-service */
export function resolveConfig(config: ExtractionConfig): ResolvedExtractionConfig {
  return {
    ...config,
    modules: config.modules.map(resolveModule),
  }
}

function resolveModule(moduleConfig: ModuleConfig): Module {
  return {
    name: moduleConfig.name,
    domain: moduleConfig.domain,
    path: moduleConfig.path,
    glob: moduleConfig.glob,
    ...(moduleConfig.modules !== undefined && { modules: moduleConfig.modules }),
    api: requireRule(moduleConfig.api, 'api', moduleConfig.name),
    useCase: requireRule(moduleConfig.useCase, 'useCase', moduleConfig.name),
    domainOp: requireRule(moduleConfig.domainOp, 'domainOp', moduleConfig.name),
    event: requireRule(moduleConfig.event, 'event', moduleConfig.name),
    eventHandler: requireRule(moduleConfig.eventHandler, 'eventHandler', moduleConfig.name),
    ui: requireRule(moduleConfig.ui, 'ui', moduleConfig.name),
    ...(moduleConfig.customTypes !== undefined && { customTypes: moduleConfig.customTypes }),
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
