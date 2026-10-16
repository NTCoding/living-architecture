import type { extractComponents, resolveModuleName } from '../component-extraction/extractor'
import type {
  evaluateFromClassDecoratorArgRule,
  evaluateFromClassNameRule,
  evaluateFromDecoratorArgRule,
  evaluateFromDecoratorNameRule,
  evaluateFromFilePathRule,
  evaluateFromMethodNameRule,
} from '../value-extraction/evaluate-extraction-rule'
import type { evaluateFromGenericArgRule } from '../value-extraction/evaluate-extraction-rule-generic'
import type { evaluateFromParameterTypeRule } from '../value-extraction/evaluate-extraction-rule-method'
import type { evaluateFromPropertyRule } from '../value-extraction/evaluate-property-extraction-rule'

type RiviereModuleExtractionRules = Readonly<{
  readonly extractComponents: typeof extractComponents
  readonly resolveModuleName: typeof resolveModuleName
  readonly evaluateFromFilePathRule: typeof evaluateFromFilePathRule
  readonly evaluateFromMethodNameRule: typeof evaluateFromMethodNameRule
  readonly evaluateFromDecoratorArgRule: typeof evaluateFromDecoratorArgRule
  readonly evaluateFromClassDecoratorArgRule: typeof evaluateFromClassDecoratorArgRule
  readonly evaluateFromDecoratorNameRule: typeof evaluateFromDecoratorNameRule
  readonly evaluateFromClassNameRule: typeof evaluateFromClassNameRule
  readonly evaluateFromParameterTypeRule: typeof evaluateFromParameterTypeRule
  readonly evaluateFromGenericArgRule: typeof evaluateFromGenericArgRule
  readonly evaluateFromPropertyRule: typeof evaluateFromPropertyRule
}>

export type { RiviereModuleExtractionRules }
