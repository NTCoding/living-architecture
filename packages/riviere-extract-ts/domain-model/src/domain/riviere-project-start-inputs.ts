import type { RiviereBuilder } from '@living-architecture/riviere-builder-published-language'
import type { DraftComponent } from './component-extraction/draft-component'
import type { ExtractionConfiguration } from './extraction-configuration'
import type { RiviereProject } from './riviere-project'
import type { WorkflowStage } from './workflow-stage'

/**
 * @riviere-role domain-port
 * @riviere-role-justification The Project aggregate accepts this construction contract. It is caller-supplied input that builds the aggregate, not previously created aggregate state that the repository should load.
 */
export type ExtractionProjectStartInput = Readonly<{
  configuration: ExtractionConfiguration
  draftComponents: readonly DraftComponent[]
  graphDefinition?: undefined
}>

/**
 * @riviere-role domain-port
 * @riviere-role-justification The Project aggregate accepts this construction contract. It is caller-supplied input that builds the aggregate, not previously created aggregate state that the repository should load.
 */
export type WorkflowStartInput = Readonly<{
  name: string
  outputPath: string
  runLogDirectory: string
  stages: readonly WorkflowStage[]
}>

/**
 * @riviere-role domain-port
 * @riviere-role-justification The Project aggregate accepts this construction contract. It is caller-supplied input that builds the aggregate, not previously created aggregate state that the repository should load.
 */
export type GraphOnlyProjectStartInput = Readonly<{
  graphDefinition: Parameters<typeof RiviereBuilder.parse>[0]
  workflowInput?: undefined
  configuration?: undefined
  draftComponents?: undefined
}>

/**
 * @riviere-role domain-port
 * @riviere-role-justification The Project aggregate accepts this construction contract. It is caller-supplied input that builds the aggregate, not previously created aggregate state that the repository should load.
 */
export type GraphWithWorkflowStartInput = Readonly<{
  graphDefinition: Parameters<typeof RiviereBuilder.parse>[0]
  workflowInput: WorkflowStartInput
  configuration?: undefined
  draftComponents?: undefined
}>

/**
 * @riviere-role domain-port
 * @riviere-role-justification The Project aggregate accepts this construction contract. It is caller-supplied input that builds the aggregate, not previously created aggregate state that the repository should load.
 */
export type RiviereProjectStartInput =
  | ExtractionProjectStartInput
  | GraphOnlyProjectStartInput
  | GraphWithWorkflowStartInput

/**
 * @riviere-role domain-port
 * @riviere-role-justification The Project aggregate returns this construction result contract. It is the outcome of building the aggregate, not previously created aggregate state that the repository should load.
 */
export type RiviereProjectStartSuccess = Readonly<{ success: true; project: RiviereProject }>

/**
 * @riviere-role domain-port
 * @riviere-role-justification The Project aggregate returns this construction result contract. It is the outcome of building the aggregate, not previously created aggregate state that the repository should load.
 */
export type RiviereProjectStartResult =
  | RiviereProjectStartSuccess
  | Readonly<{ success: false; error: string }>
