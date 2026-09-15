import type { ExternalLink } from '@living-architecture/riviere-schema-published-language/schema'
import type { ExtractedLink } from '../connection-detection/extracted-link'
import { ExtractionConfiguration } from '../extraction-configuration'
import type { EnrichedComponent } from '../value-extraction/enriched-component'
import { WorkflowDiagnostic } from '../workflow-diagnostic'
import type { CodeExtractionModules } from '../ports/code-extraction-modules'

type CodeExtractionStageResult = Readonly<{
  components: readonly EnrichedComponent[]
  links: readonly ExtractedLink[]
  externalLinks: readonly ExternalLink[]
  diagnostics: readonly WorkflowDiagnostic[]
}>

class CodeExtractionFieldFailure extends Error {
  constructor(fields: readonly string[]) {
    super(`Extraction failed for fields: ${fields.join(', ')}`)
    this.name = 'CodeExtractionFieldFailure'
  }
}

type DetectConnections = (
  extraction: ExtractionConfiguration,
  modules: CodeExtractionModules,
  components: readonly EnrichedComponent[],
  allowIncomplete: boolean,
) => {
  links: readonly ExtractedLink[]
  externalLinks: readonly ExternalLink[]
}

/**
 * @riviere-role domain-service
 * @riviere-role-justification This operation coordinates extraction across multiple module entities and returns a stage result. The Project owns graph mutation and workflow progression; no single module or value object can own cross-module extraction.
 */
export function executeCodeExtractionStage(input: {
  extraction: ExtractionConfiguration
  createModules: (extraction: ExtractionConfiguration) => CodeExtractionModules
  detectConnections: DetectConnections
}): CodeExtractionStageResult {
  const modules = input.createModules(input.extraction)
  modules.forEach((module) => module.extractAllDraftComponents())
  const enrichment = modules
    .filter((module) => module.draftComponents().length > 0)
    .map((module) => module.enrichDraftComponents())
  const components = enrichment.flatMap((result) => result.components)
  const failures = enrichment.flatMap((result) => result.failures)
  const allowIncomplete = input.extraction.allowIncomplete
  if (failures.length > 0 && !allowIncomplete) {
    throw new CodeExtractionFieldFailure(failures.map((failure) => failure.field))
  }
  const detection = input.detectConnections(input.extraction, modules, components, allowIncomplete)
  return {
    components,
    links: detection.links,
    externalLinks: detection.externalLinks,
    diagnostics: components
      .flatMap((component) =>
        (component._missing ?? []).map((field) =>
          WorkflowDiagnostic.fromMissingField(component.name, field),
        ),
      )
      .concat(
        detection.links.flatMap((link) =>
          link._uncertain === undefined
            ? []
            : [
                WorkflowDiagnostic.fromUncertainLink({
                  source: link.source,
                  target: link.target,
                  ...(link.sourceLocation === undefined
                    ? {}
                    : { sourceLocation: link.sourceLocation }),
                }),
              ],
        ),
      ),
  }
}
