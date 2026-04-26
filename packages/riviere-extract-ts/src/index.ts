export { extractComponents } from './features/extraction/domain/component-extraction/extractor'
export { DraftComponent } from './features/extraction/domain/component-extraction/draft-component'
export { evaluatePredicate } from './features/extraction/domain/predicate-evaluation/evaluate-predicate'
export { resolveConfig } from './features/extraction/domain/config-resolution/resolve-config'
export { MissingComponentRuleError } from './features/extraction/domain/config-resolution/config-resolution-errors'
export {
  applyTransforms,
  ExtractionError,
  type ExtractionContext,
  type ExtractionResult,
  type ParameterInfo,
  type MethodSignature,
} from './features/extraction/domain/value-extraction'
export {
  detectConnections,
  detectPerModuleConnections,
  detectCrossModuleConnections,
  deduplicateCrossStrategy,
} from './features/extraction/domain/connection-detection/detect-connections'
export {
  ConnectionDetectionOptions,
  ConnectionDetectionResult,
  ConnectionTimings,
  PerModuleConnectionOptions,
  PerModuleDetectionResult,
  PerModuleTimings,
  CrossModuleConnectionOptions,
  CrossModuleDetectionResult,
  CrossModuleTimings,
} from './features/extraction/domain/connection-detection/connection-detection-values'
export { ExtractedLink } from './features/extraction/domain/connection-detection/extracted-link'
export { ComponentIndex } from './features/extraction/domain/connection-detection/component-index'
export { ConnectionDetectionError } from './features/extraction/domain/connection-detection/connection-detection-error'
export { stripResolvedCustomTypes } from './features/extraction/domain/connection-detection/resolve-http-links'
export { enrichComponents } from './features/extraction/domain/value-extraction/enrich-components'
export {
  EnrichedComponent,
  EnrichmentFailure,
  EnrichmentResult,
} from './features/extraction/domain/value-extraction/enriched-component'
