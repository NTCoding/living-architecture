import type { ExternalLink } from '@living-architecture/riviere-schema-published-language/schema'
import type { ExtractedLink } from '../connection-detection/extracted-link'
import type { ExtractionConfiguration } from '../extraction-configuration'
import type { CodeExtractionModules } from '../ports/code-extraction-modules'
import type { EnrichedComponent } from '../value-extraction/enriched-component'
import { WorkflowDiagnostic } from '../workflow-diagnostic'

type ConnectionDetection = Readonly<{
  links: readonly ExtractedLink[]
  externalLinks: readonly ExternalLink[]
}>

type CodeExtractionCompletion =
  | Readonly<{ kind: 'fieldFailure'; failedFields: readonly string[] }>
  | Readonly<{
      kind: 'full'
      components: readonly EnrichedComponent[]
      failedFields: readonly string[]
      links: readonly ExtractedLink[]
      externalLinks: readonly ExternalLink[]
      diagnostics: readonly WorkflowDiagnostic[]
    }>

/**
 * @riviere-role domain-service
 * @riviere-role-justification Extraction enriches stage-scoped parser modules and shapes the result for the Project. The Project owns the connection-detection collaborators and the graph mutation, so no aggregate or value object owns this cross-module behaviour.
 */
export function extractCodeExtraction(input: {
  extraction: ExtractionConfiguration
  modules: CodeExtractionModules
  allowIncomplete?: boolean
  detectConnections: (input: {
    extraction: ExtractionConfiguration
    modules: CodeExtractionModules
    components: readonly EnrichedComponent[]
    allowIncomplete: boolean
  }) => ConnectionDetection
}): CodeExtractionCompletion {
  const allowIncomplete = input.allowIncomplete === true || input.extraction.allowIncomplete
  const enrichment = input.modules
    .filter((module) => module.draftComponents().length > 0)
    .map((module) => module.enrichDraftComponents())
  const components = enrichment.flatMap((result) => result.components)
  const failedFields = [
    ...new Set(enrichment.flatMap((result) => result.failures.map((failure) => failure.field))),
  ]
  if (failedFields.length > 0 && !allowIncomplete) {
    return { kind: 'fieldFailure', failedFields }
  }
  const detection = input.detectConnections({
    extraction: input.extraction,
    modules: input.modules,
    components,
    allowIncomplete,
  })
  return {
    kind: 'full',
    components,
    failedFields,
    links: detection.links,
    externalLinks: detection.externalLinks,
    diagnostics: codeExtractionDiagnostics(components, detection.links),
  }
}

function codeExtractionDiagnostics(
  components: readonly EnrichedComponent[],
  links: readonly ExtractedLink[],
): readonly WorkflowDiagnostic[] {
  return [
    ...components.flatMap((component) =>
      (component._missing ?? []).map((field) =>
        WorkflowDiagnostic.fromMissingField(component.name, field),
      ),
    ),
    ...links.flatMap((link) =>
      link._uncertain === undefined
        ? []
        : [
            WorkflowDiagnostic.fromUncertainLink({
              source: link.source,
              target: link.target,
              ...(link.sourceLocation === undefined ? {} : { sourceLocation: link.sourceLocation }),
            }),
          ],
    ),
  ]
}
