import {
  RiviereBuilder,
  type BuilderOptionsInput,
} from '@living-architecture/riviere-builder-published-language'
import { ValidatedConfiguration } from '@living-architecture/riviere-extract-config-published-language'
import { Project } from 'ts-morph'
import { assert } from 'vitest'
import { ExtractionConfiguration } from '../extraction-configuration'
import type { AsyncApiDocument, LoadAsyncApiDocument } from '../ports/load-asyncapi-document'
import type { LoadCodeExtraction } from '../ports/load-code-extraction'
import type { LoadAiExtractSources } from '../ports/load-ai-extract-sources'
import type {
  EventCatalogSource,
  RiviereProjectCollaborators,
} from '../ports/load-event-catalog-source'
import type { RiviereProjectExtractionBehaviour } from '../ports/riviere-project-extraction-behaviour'
import type { RiviereModuleExtractionRules } from '../ports/riviere-module-extraction-rules'
import { type MetadataValue, EnrichedComponent } from '../value-extraction/enriched-component'
import { WorkflowStartInput } from '../riviere-project-start-inputs'
import type { AiCli } from '../ports/ai-cli'
import type { WorkflowStage } from '../workflow-stage'

interface WorkflowStartInputOverrides {
  readonly name?: string
  readonly outputPath?: string
  readonly runLogDirectory?: string
}

export function workflowStartInput(
  stages: readonly WorkflowStage[],
  overrides: WorkflowStartInputOverrides = {},
): WorkflowStartInput {
  return WorkflowStartInput.from({
    name: 'build-graph',
    outputPath: '/project/.riviere/graph.json',
    runLogDirectory: '/project/.riviere/logs',
    ...overrides,
    stages,
  })
}

export function rehydratingWorkflowStartInput(
  declaredDomains: readonly string[],
  stages: readonly WorkflowStage[],
  overrides: WorkflowStartInputOverrides = {},
): WorkflowStartInput {
  return WorkflowStartInput.fromExistingGraph({
    name: 'build-graph',
    outputPath: '/project/.riviere/graph.json',
    runLogDirectory: '/project/.riviere/logs',
    ...overrides,
    declaredDomains,
    stages,
  })
}
import { detectEventPublisherConnections } from '../connection-detection/async-detection/detect-event-publisher-connections'
import { detectSubscribeConnections } from '../connection-detection/async-detection/detect-subscribe-connections'
import { detectConnectionsFromCalls } from '../connection-detection/call-graph/detect-connections-from-calls'
import {
  resolveHttpLinks,
  stripResolvedCustomTypes,
} from '../connection-detection/resolve-http-links'
import { applyCodeExtractionToBuilder } from '../code-extraction/apply-code-extraction-to-builder'
import { detectCodeExtractionConnections } from '../code-extraction/detect-code-extraction-connections'
import { extractCodeExtraction } from '../code-extraction/extract-code-extraction'
import { executeAsyncApiImportStage } from '../asyncapi/execute-asyncapi-import-stage'
import { executeEventCatalogImportStage } from '../event-catalog/execute-event-catalog-import-stage'
import { executeAiExtractStage } from '../ai-extract/execute-ai-extract-stage'
import { computeAiExtractGaps } from '../ai-extract/compute-ai-extract-gaps'
import { validateAiExtractResponse } from '../ai-extract/validate-ai-extract-response'
import { applyAiExtractResponse } from '../ai-extract/apply-ai-extract-response'
import { buildAiExtractPrompt } from '../ai-extract/build-ai-extract-prompt'
import { selectAiExtractBatches } from '../ai-extract/select-ai-extract-batches'
import { extractComponents, resolveModuleName } from '../component-extraction/extractor'
import {
  evaluateFromClassDecoratorArgRule,
  evaluateFromClassNameRule,
  evaluateFromDecoratorArgRule,
  evaluateFromDecoratorNameRule,
  evaluateFromFilePathRule,
  evaluateFromMethodNameRule,
} from '../value-extraction/evaluate-extraction-rule'
import { evaluateFromGenericArgRule } from '../value-extraction/evaluate-extraction-rule-generic'
import { evaluateFromParameterTypeRule } from '../value-extraction/evaluate-extraction-rule-method'
import { evaluateFromPropertyRule } from '../value-extraction/evaluate-property-extraction-rule'

export function extractionBehaviour(): RiviereProjectExtractionBehaviour {
  return {
    applyCodeExtractionToBuilder,
    detectCodeExtractionConnections,
    detectConnectionsFromCalls,
    detectEventPublisherConnections,
    detectSubscribeConnections,
    executeAiExtractStage,
    computeAiExtractGaps,
    validateAiExtractResponse,
    applyAiExtractResponse,
    buildAiExtractPrompt,
    selectAiExtractBatches,
    executeAsyncApiImportStage,
    executeEventCatalogImportStage,
    extractCodeExtraction,
    resolveHttpLinks,
    stripResolvedCustomTypes,
  }
}

export function moduleExtractionRules(): RiviereModuleExtractionRules {
  return {
    evaluateFromClassDecoratorArgRule,
    evaluateFromClassNameRule,
    evaluateFromDecoratorArgRule,
    evaluateFromDecoratorNameRule,
    evaluateFromFilePathRule,
    evaluateFromGenericArgRule,
    evaluateFromMethodNameRule,
    evaluateFromParameterTypeRule,
    evaluateFromPropertyRule,
    extractComponents,
    resolveModuleName,
  }
}

export function aiCli(
  overrides: Readonly<{ readonly checkAvailability?: AiCli['checkAvailability'] }> = {},
): AiCli {
  return {
    checkAvailability:
      overrides.checkAvailability ?? ((command) => Promise.resolve({ kind: 'available', command })),
    run: () =>
      Promise.resolve({
        kind: 'failed',
        reason: 'The workflow fixture does not invoke AI CLI execution',
      }),
  }
}

export function collaborators(
  source: EventCatalogSource = { domains: [], services: [], events: [] },
  asyncApiDocument: AsyncApiDocument = { messages: [], operations: [] },
): RiviereProjectCollaborators {
  const loadCodeExtraction: LoadCodeExtraction = () => configuration().moduleContexts
  const loadAiExtractSources: LoadAiExtractSources = () =>
    Promise.resolve({ files: [], missingPaths: [] })
  return {
    aiCli: aiCli(),
    loadAiExtractSources,
    loadEventCatalogSource: () => Promise.resolve(source),
    loadAsyncApiDocument: () => Promise.resolve(asyncApiDocument),
    loadCodeExtraction,
    repositoryName: 'shop',
    extractionBehaviour: extractionBehaviour(),
    moduleExtractionRules: moduleExtractionRules(),
  }
}

export function asyncApiCollaborators(document: AsyncApiDocument): RiviereProjectCollaborators {
  return collaborators({ domains: [], services: [], events: [] }, document)
}

export type { LoadAsyncApiDocument }

export function graphDefinition(): BuilderOptionsInput {
  return {
    name: 'Shop',
    description: 'Shop graph',
    sources: [{ repository: 'shop' }],
    domains: { orders: { description: 'Orders', systemType: 'domain' } as const },
  }
}

export function configuration(
  customType?: string,
  allowIncomplete = false,
): ExtractionConfiguration {
  const parsed = ValidatedConfiguration.parse({
    modules: [
      {
        api: { notUsed: true },
        domain: 'orders',
        domainOp: { notUsed: true },
        event: { notUsed: true },
        eventHandler: { notUsed: true },
        glob: '**/*.ts',
        name: 'orders',
        path: '.',
        ui: { notUsed: true },
        useCase: { notUsed: true },
        ...(customType === undefined
          ? {}
          : {
              customTypes: {
                [customType]: {
                  find: 'classes' as const,
                  where: { hasJSDoc: { tag: 'scheduledJob' } },
                },
              },
            }),
      },
    ],
    ...(allowIncomplete ? { allowIncomplete: true } : {}),
  })
  assert(parsed.success)
  const module = parsed.data.modules[0]
  assert(module)
  return ExtractionConfiguration.parse({
    name: 'orders',
    configPath: 'orders.yml',
    useTsConfig: false,
    repositoryName: 'shop',
    resolvedConfig: parsed.data,
    moduleContexts: [{ module, project: new Project(), files: [] }],
  })
}

export function builder(): RiviereBuilder {
  return RiviereBuilder.parse({
    name: 'Shop',
    description: 'Shop graph',
    sources: [{ repository: 'shop' }],
    domains: { orders: { description: 'Orders', systemType: 'domain' } },
  })
}

export function component(
  type: string,
  name: string,
  metadata: Record<string, MetadataValue> = {},
): EnrichedComponent {
  return EnrichedComponent.parse({
    type,
    name,
    domain: 'orders',
    module: 'orders',
    location: { file: 'orders.ts', line: 1 },
    metadata,
    _missing: undefined,
  })
}
