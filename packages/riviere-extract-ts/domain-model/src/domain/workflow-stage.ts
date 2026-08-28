import type { ExtractionConfiguration } from './extraction-configuration'

type ExtractWorkflowStage = Readonly<{
  kind: 'extract'
  name: string
  configuration: ExtractionConfiguration
}>

type LinkWorkflowStage = Readonly<{
  kind: 'link'
  name: string
  configuration: ExtractionConfiguration
}>

type ValidateWorkflowStage = Readonly<{
  kind: 'validate'
  name: string
}>

type WorkflowStageValue = ExtractWorkflowStage | LinkWorkflowStage | ValidateWorkflowStage

/** @riviere-role value-object */
export class WorkflowStage {
  declare private readonly brand: 'WorkflowStage'

  static fromExtraction(name: string, configuration: ExtractionConfiguration): WorkflowStage {
    return new WorkflowStage({ kind: 'extract', name, configuration })
  }

  static fromLink(name: string, configuration: ExtractionConfiguration): WorkflowStage {
    return new WorkflowStage({ kind: 'link', name, configuration })
  }

  static fromValidation(name: string): WorkflowStage {
    return new WorkflowStage({ kind: 'validate', name })
  }

  private constructor(readonly value: WorkflowStageValue) {}
}

export type { WorkflowStageValue }
