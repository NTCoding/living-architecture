import type { WorkflowRunEvent } from '@living-architecture/riviere-extract-ts-domain-model/domain/workflow-run-event'
import type { WorkflowWarning } from '@living-architecture/riviere-extract-ts-domain-model/domain/workflow'
import type { RiviereGraph } from '@living-architecture/riviere-schema-published-language/schema'

type WorkflowRunResultValue =
  | Readonly<{
      success: true
      graph: RiviereGraph
      outputPath: string
      runLogDirectory: string
      events: readonly WorkflowRunEvent[]
      warnings: readonly WorkflowWarning[]
    }>
  | Readonly<{
      success: false
      errorCode: string
      reason: string
      events: readonly WorkflowRunEvent[]
      warnings: readonly WorkflowWarning[]
    }>

/** @riviere-role command-use-case-result */
export interface RunWorkflowResult {
  readonly result: WorkflowRunResultValue
}
