import type { RiviereBuilder } from '@living-architecture/riviere-builder-published-language'
import type { DraftComponent } from './component-extraction/draft-component'
import type { ExtractionConfiguration } from './extraction-configuration'
import type { ObserveConnectionDetectionPhase } from './ports/observe-connection-detection-phase'
export type { ObserveConnectionDetectionPhase } from './ports/observe-connection-detection-phase'
import type { RiviereProject } from './riviere-project'
import type { Workflow } from './workflow'
export type { WorkflowStageValue } from './workflow-stage'

export type ExtractionProjectStartInput = Readonly<{
  configuration: ExtractionConfiguration
  draftComponents: readonly DraftComponent[]
  graphDefinition?: undefined
}>
export type WorkflowStartInput = Parameters<typeof Workflow.build>[0]
export type GraphOnlyProjectStartInput = Readonly<{
  graphDefinition: Parameters<typeof RiviereBuilder.parse>[0]
  workflowInput?: undefined
  configuration?: undefined
  draftComponents?: undefined
}>
export type GraphWithWorkflowStartInput = Readonly<{
  graphDefinition: Parameters<typeof RiviereBuilder.parse>[0]
  workflowInput: WorkflowStartInput
  configuration?: undefined
  draftComponents?: undefined
}>
export type RiviereProjectStartInput =
  | ExtractionProjectStartInput
  | GraphOnlyProjectStartInput
  | GraphWithWorkflowStartInput
export type RiviereProjectStartSuccess = Readonly<{ success: true; project: RiviereProject }>
export type RiviereProjectStartResult =
  | RiviereProjectStartSuccess
  | Readonly<{ success: false; error: string }>
export type CodeExtractionModule = Readonly<{
  owns(component: Pick<DraftComponent, 'domain' | 'location' | 'module'>): boolean
  typeScriptProject(): import('ts-morph').Project
  sourceFilePaths(): readonly string[]
}>
export type SourceFileSelection =
  | { readonly kind: 'all' }
  | { readonly kind: 'files'; readonly filePaths: readonly string[] }

export function observePhase<T>(
  observer: ObserveConnectionDetectionPhase | undefined,
  phase: 'setup' | 'callGraph' | 'detection' | 'total',
  operation: () => T,
): T {
  observer?.({ phase, status: 'started' })
  try {
    return operation()
  } finally {
    observer?.({ phase, status: 'completed' })
  }
}
