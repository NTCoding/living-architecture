export { DraftComponent } from './features/extraction/domain/component-extraction/draft-component'
export { extractComponents } from './features/extraction/domain/component-extraction/extractor'
export { MissingComponentRuleError } from './features/extraction/domain/config-resolution/config-resolution-errors'
export { resolveConfig } from './features/extraction/domain/config-resolution/resolve-config'
export { ComponentIndex } from './features/extraction/domain/connection-detection/component-index'
export { ConnectionDetectionError } from './features/extraction/domain/connection-detection/connection-detection-error'
export {
  ConnectionDetectionOptions,
  ConnectionDetectionResult,
  ConnectionTimings,
  CrossModuleConnectionOptions,
  CrossModuleDetectionResult,
  CrossModuleTimings,
  PerModuleConnectionOptions,
  PerModuleDetectionResult,
  PerModuleTimings,
} from './features/extraction/domain/connection-detection/connection-detection-values'
export {
  deduplicateCrossStrategy,
  detectConnections,
  detectCrossModuleConnections,
  detectPerModuleConnections,
} from './features/extraction/domain/connection-detection/detect-connections'
export { ExtractedLink } from './features/extraction/domain/connection-detection/extracted-link'
export { stripResolvedCustomTypes } from './features/extraction/domain/connection-detection/resolve-http-links'
export { evaluatePredicate } from './features/extraction/domain/predicate-evaluation/evaluate-predicate'
export {
  ExtractionError,
  applyTransforms,
  type ExtractionContext,
  type ExtractionResult,
  type MethodSignature,
  type ParameterInfo,
} from './features/extraction/domain/value-extraction'
export { enrichComponents } from './features/extraction/domain/value-extraction/enrich-components'
export {
  EnrichedComponent,
  EnrichmentFailure,
  EnrichmentResult,
} from './features/extraction/domain/value-extraction/enriched-component'
