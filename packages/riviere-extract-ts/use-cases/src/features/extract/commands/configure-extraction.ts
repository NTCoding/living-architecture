import { executeEventCatalogImportStage } from '@living-architecture/riviere-extract-ts-domain-model/domain/event-catalog/execute-event-catalog-import-stage'
import { executeAsyncApiImportStage } from '@living-architecture/riviere-extract-ts-domain-model/domain/asyncapi/execute-asyncapi-import-stage'
import { detectEventPublisherConnections } from '@living-architecture/riviere-extract-ts-domain-model/domain/connection-detection/async-detection/detect-event-publisher-connections'
import { detectSubscribeConnections } from '@living-architecture/riviere-extract-ts-domain-model/domain/connection-detection/async-detection/detect-subscribe-connections'
import { detectConnectionsFromCalls } from '@living-architecture/riviere-extract-ts-domain-model/domain/connection-detection/call-graph/detect-connections-from-calls'
import {
  resolveHttpLinks,
  stripResolvedCustomTypes,
} from '@living-architecture/riviere-extract-ts-domain-model/domain/connection-detection/resolve-http-links'
import { applyCodeExtractionToBuilder } from '@living-architecture/riviere-extract-ts-domain-model/domain/code-extraction/apply-code-extraction-to-builder'
import { detectCodeExtractionConnections } from '@living-architecture/riviere-extract-ts-domain-model/domain/code-extraction/detect-code-extraction-connections'
import { extractCodeExtraction } from '@living-architecture/riviere-extract-ts-domain-model/domain/code-extraction/extract-code-extraction'
import {
  extractComponents,
  resolveModuleName,
} from '@living-architecture/riviere-extract-ts-domain-model/domain/component-extraction/extractor'
import {
  evaluateFromClassDecoratorArgRule,
  evaluateFromClassNameRule,
  evaluateFromDecoratorArgRule,
  evaluateFromDecoratorNameRule,
  evaluateFromFilePathRule,
  evaluateFromMethodNameRule,
} from '@living-architecture/riviere-extract-ts-domain-model/domain/value-extraction/evaluate-extraction-rule'
import { evaluateFromGenericArgRule } from '@living-architecture/riviere-extract-ts-domain-model/domain/value-extraction/evaluate-extraction-rule-generic'
import { evaluateFromParameterTypeRule } from '@living-architecture/riviere-extract-ts-domain-model/domain/value-extraction/evaluate-extraction-rule-method'
import { evaluateFromPropertyRule } from '@living-architecture/riviere-extract-ts-domain-model/domain/value-extraction/evaluate-property-extraction-rule'
import type { RiviereProjectExtractionBehaviour } from '@living-architecture/riviere-extract-ts-domain-model/domain/ports/riviere-project-extraction-behaviour'
import type { RiviereModuleExtractionRules } from '@living-architecture/riviere-extract-ts-domain-model/domain/ports/riviere-module-extraction-rules'

/** @riviere-role command-use-case-input */
export type ConfigureExtractionInput = Readonly<Record<string, never>>

/** @riviere-role command-use-case-result */
export interface ConfigureExtractionResult {
  extractionBehaviour(): RiviereProjectExtractionBehaviour
  moduleExtractionRules(): RiviereModuleExtractionRules
}

/** @riviere-role command-use-case */
export function configureExtraction(input: ConfigureExtractionInput): ConfigureExtractionResult {
  void input
  return {
    extractionBehaviour: extractionBehaviour,
    moduleExtractionRules: moduleExtractionRules,
  }
}

function extractionBehaviour(): RiviereProjectExtractionBehaviour {
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

function moduleExtractionRules(): RiviereModuleExtractionRules {
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
