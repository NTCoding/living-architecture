import type {
  ComponentRuleInput,
  CustomTypesInput,
  DraftConfiguration,
  ValidatedModuleInput,
} from './extraction-config-schema'
import { parseExtractionConfigSchema } from './validation'

const NOT_USED = { notUsed: true } as const

/** @riviere-role value-object */
export class ModuleDefaults {
  declare private readonly brand: 'ModuleDefaults'

  static parse(source: unknown): ModuleDefaultsParseResult {
    if (hasModulesArray(source)) {
      const parsed = parseExtractionConfigSchema(source)
      if (!parsed.success) {
        return {
          success: false,
          issues: parsed.errors.map((error) => `${error.path}: ${error.message}`),
        }
      }
      return { success: true, source: { kind: 'configuration', config: parsed.configuration } }
    }
    if (!isRulesSource(source)) {
      return { success: false, issues: ['expected an object with component rules'] }
    }
    return {
      success: true,
      source: {
        kind: 'rules',
        defaults: new ModuleDefaults({
          api: source.api ?? NOT_USED,
          useCase: source.useCase ?? NOT_USED,
          domainOp: source.domainOp ?? NOT_USED,
          event: source.event ?? NOT_USED,
          eventHandler: source.eventHandler ?? NOT_USED,
          ui: source.ui ?? NOT_USED,
          ...(source.customTypes === undefined ? {} : { customTypes: source.customTypes }),
        }),
      },
    }
  }

  static fromResolvedModule(module: ValidatedModuleInput): ModuleDefaults {
    return new ModuleDefaults({
      api: module.api,
      useCase: module.useCase,
      domainOp: module.domainOp,
      event: module.event,
      eventHandler: module.eventHandler,
      ui: module.ui,
      ...(module.customTypes === undefined ? {} : { customTypes: module.customTypes }),
    })
  }

  private constructor(
    private readonly rules: Readonly<{
      api: ComponentRuleInput
      useCase: ComponentRuleInput
      domainOp: ComponentRuleInput
      event: ComponentRuleInput
      eventHandler: ComponentRuleInput
      ui: ComponentRuleInput
      customTypes?: CustomTypesInput
    }>,
  ) {}

  get api(): ComponentRuleInput {
    return this.rules.api
  }

  get useCase(): ComponentRuleInput {
    return this.rules.useCase
  }

  get domainOp(): ComponentRuleInput {
    return this.rules.domainOp
  }

  get event(): ComponentRuleInput {
    return this.rules.event
  }

  get eventHandler(): ComponentRuleInput {
    return this.rules.eventHandler
  }

  get ui(): ComponentRuleInput {
    return this.rules.ui
  }

  get customTypes(): CustomTypesInput | undefined {
    return this.rules.customTypes
  }
}

function hasModulesArray(value: unknown): boolean {
  return typeof value === 'object' && value !== null && !Array.isArray(value) && 'modules' in value
}

function isRulesSource(value: unknown): value is Partial<ValidatedModuleInput> {
  return (
    typeof value === 'object' && value !== null && !Array.isArray(value) && !('modules' in value)
  )
}

/** @riviere-role published-language-schema */
export interface ModuleRulesSource {
  readonly kind: 'rules'
  readonly defaults: ModuleDefaults
}

/** @riviere-role published-language-schema */
export interface ModuleConfigurationSource {
  readonly kind: 'configuration'
  readonly config: DraftConfiguration
}

/** @riviere-role published-language-union */
export type ModuleDefaultsSource = ModuleRulesSource | ModuleConfigurationSource

/** @riviere-role published-language-data-structure */
export interface ModuleDefaultsParseSuccess {
  readonly success: true
  readonly source: ModuleDefaultsSource
}

/** @riviere-role published-language-data-structure */
export interface ModuleDefaultsParseFailure {
  readonly success: false
  readonly issues: readonly string[]
}

/** @riviere-role published-language-union */
export type ModuleDefaultsParseResult = ModuleDefaultsParseSuccess | ModuleDefaultsParseFailure
