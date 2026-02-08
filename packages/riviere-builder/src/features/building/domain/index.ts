export * from './builder-facade'
export {
  ComponentId, type ComponentIdParts 
} from '@living-architecture/riviere-schema'
export {
  DuplicateDomainError,
  DomainNotFoundError,
  CustomTypeNotFoundError,
  DuplicateComponentError,
  ComponentNotFoundError,
  CustomTypeAlreadyDefinedError,
  MissingRequiredPropertiesError,
  InvalidGraphError,
  MissingSourcesError,
  MissingDomainsError,
  BuildValidationError,
} from './construction/construction-errors'
export { InvalidEnrichmentTargetError } from './enrichment/enrichment-errors'
export { findNearMatches } from './error-recovery/component-suggestion'
