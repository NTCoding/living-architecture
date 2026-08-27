import type { ComponentRule, CustomTypes, DetectionRule } from './component-rule'
import { BUILT_IN_COMPONENT_TYPES, type ComponentType } from './extraction-config-schema'

type ComponentTypeNameParseResult =
  | { readonly success: true; readonly data: ComponentTypeName }
  | { readonly success: false; readonly errors: readonly string[] }

/** @riviere-role value-object */
export class ComponentTypeName<Value extends string = string> {
  declare private readonly brand: 'ComponentTypeName'

  private constructor(readonly value: Value) {}

  static parse(input: unknown): ComponentTypeNameParseResult {
    return typeof input === 'string' && input.trim().length > 0
      ? { success: true, data: new ComponentTypeName(input) }
      : { success: false, errors: ['Component type name must not be empty'] }
  }

  static from(componentType: ComponentType): ComponentTypeName<ComponentType> {
    return new ComponentTypeName(componentType)
  }
}

/** @riviere-role value-object */
export class ConfiguredComponentDetection {
  declare private readonly brand: 'ConfiguredComponentDetection'

  private constructor(
    readonly componentType: ComponentTypeName,
    readonly rule: DetectionRule,
  ) {}

  static fromComponentTypeAndRule(params: {
    readonly componentType: ComponentTypeName
    readonly rule: DetectionRule
  }): ConfiguredComponentDetection {
    return new ConfiguredComponentDetection(params.componentType, params.rule)
  }

  static parseFromRules(
    builtInRules: Readonly<Record<ComponentType, ComponentRule>>,
    customTypes: CustomTypes | undefined,
  ):
    | { readonly success: true; readonly data: readonly ConfiguredComponentDetection[] }
    | { readonly success: false; readonly errors: readonly string[] } {
    const builtInEntries = BUILT_IN_COMPONENT_TYPES.map(
      (componentType) =>
        [ComponentTypeName.from(componentType), builtInRules[componentType]] as const,
    )
    const customDetections: ConfiguredComponentDetection[] = []
    const customErrors: string[] = []
    for (const [name, rule] of Object.entries(customTypes ?? {})) {
      const componentType = ComponentTypeName.parse(name)
      if (!componentType.success) {
        customErrors.push(...componentType.errors)
        continue
      }
      customDetections.push(
        ConfiguredComponentDetection.fromComponentTypeAndRule({
          componentType: componentType.data,
          rule,
        }),
      )
    }
    if (customErrors.length > 0) return { success: false, errors: customErrors }
    const builtInDetections = builtInEntries.flatMap(([componentType, rule]) => {
      return rule.kind === 'notUsed'
        ? []
        : [ConfiguredComponentDetection.fromComponentTypeAndRule({ componentType, rule })]
    })
    return {
      success: true,
      data: [...builtInDetections, ...customDetections],
    }
  }
}
