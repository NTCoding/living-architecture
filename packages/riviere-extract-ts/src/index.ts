export {
  extractComponents,
  type DraftComponent,
  type GlobMatcher,
} from './features/extraction/domain/component-extraction/extractor'
export { evaluatePredicate } from './features/extraction/domain/predicate-evaluation/evaluate-predicate'
export {
  resolveConfig,
  type ConfigLoader,
} from './features/extraction/domain/config-resolution/resolve-config'
export {
  ConfigLoaderRequiredError,
  MissingComponentRuleError,
} from './features/extraction/domain/config-resolution/config-resolution-errors'
export {
  applyTransforms,
  ExtractionError,
  type ExtractionContext,
  type ExtractionResult,
  type ParameterInfo,
  type MethodSignature,
} from './features/extraction/domain/value-extraction'
export { matchesGlob } from './platform/infra/glob-matching/minimatch-glob'
export {
  detectConnections,
  detectPerModuleConnections,
  detectCrossModuleConnections,
  deduplicateCrossStrategy,
  type ConnectionDetectionOptions,
  type ConnectionDetectionResult,
  type ConnectionTimings,
  type PerModuleConnectionOptions,
  type PerModuleDetectionResult,
  type PerModuleTimings,
  type CrossModuleConnectionOptions,
  type CrossModuleDetectionResult,
  type CrossModuleTimings,
} from './features/extraction/domain/connection-detection/detect-connections'
export type { ExtractedLink } from './features/extraction/domain/connection-detection/extracted-link'
export { ComponentIndex } from './features/extraction/domain/connection-detection/component-index'
export { ConnectionDetectionError } from './features/extraction/domain/connection-detection/connection-detection-error'
export {
  enrichComponents,
  type EnrichedComponent,
  type EnrichmentFailure,
  type EnrichmentResult,
} from './features/extraction/domain/value-extraction/enrich-components'
