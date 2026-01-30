export {
  extractComponents,
  type DraftComponent,
  type GlobMatcher,
} from '../domain/component-extraction/extractor'
export { evaluatePredicate } from '../domain/predicate-evaluation/evaluate-predicate'
export {
  resolveConfig, type ConfigLoader 
} from '../domain/config-resolution/resolve-config'
export {
  ConfigLoaderRequiredError,
  MissingComponentRuleError,
} from '../domain/config-resolution/config-resolution-errors'
export {
  evaluateLiteralRule,
  evaluateFromClassNameRule,
  evaluateFromMethodNameRule,
  evaluateFromFilePathRule,
  evaluateFromPropertyRule,
  evaluateFromDecoratorArgRule,
  evaluateFromDecoratorNameRule,
  evaluateFromGenericArgRule,
  evaluateFromMethodSignatureRule,
  evaluateFromConstructorParamsRule,
  evaluateFromParameterTypeRule,
  applyTransforms,
  ExtractionError,
  type ExtractionContext,
  type ExtractionResult,
  type ParameterInfo,
  type MethodSignature,
} from '../domain/value-extraction'
export { matchesGlob } from '../platform/infra/glob-matching/minimatch-glob'
export {
  enrichComponents,
  type EnrichedComponent,
  type EnrichmentFailure,
  type EnrichmentResult,
} from '../domain/value-extraction/enrich-components'
