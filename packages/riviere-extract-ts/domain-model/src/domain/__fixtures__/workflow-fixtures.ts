import { RiviereBuilder } from '@living-architecture/riviere-builder-published-language'
import { ValidatedConfiguration } from '@living-architecture/riviere-extract-config-published-language'
import { Project } from 'ts-morph'
import { assert } from 'vitest'
import { ExtractionConfiguration } from '../extraction-configuration'
import type { AsyncApiDocument, LoadAsyncApiDocument } from '../ports/load-asyncapi-document'
import type { LoadCodeExtraction } from '../ports/load-code-extraction'
import type {
  EventCatalogSource,
  RiviereProjectCollaborators,
} from '../ports/load-event-catalog-source'
import type { RiviereProjectExtractionBehaviour } from '../ports/riviere-project-extraction-behaviour'
import type { RiviereModuleExtractionRules } from '../ports/riviere-module-extraction-rules'
import { type MetadataValue, EnrichedComponent } from '../value-extraction/enriched-component'
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

export function collaborators(
  source: EventCatalogSource = { domains: [], services: [], events: [] },
  asyncApiDocument: AsyncApiDocument = { messages: [], operations: [] },
): RiviereProjectCollaborators {
  const loadCodeExtraction: LoadCodeExtraction = () => configuration().moduleContexts
  return {
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

export function configuration(customType?: string, allowIncomplete = false): ExtractionConfiguration {
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
