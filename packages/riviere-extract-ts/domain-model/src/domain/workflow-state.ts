import type { DomainMetadata, SourceInfo } from '@living-architecture/riviere-schema-published-language/schema'
import type { ExtractionStage } from './extraction-stage'
import { InvalidWorkflowStageError } from './extraction-errors'

/** @riviere-role value-object */
export class WorkflowStage {
  declare private readonly brand: 'WorkflowStage'

  private constructor(
    readonly kind: 'extract' | 'link' | 'validate',
    private readonly extractionStage: ExtractionStage | undefined,
  ) {}

  static parse(input: {
    readonly kind: 'extract' | 'link' | 'validate'
    readonly stage?: ExtractionStage
  }): WorkflowStage {
    if (input.kind !== 'validate' && input.stage === undefined) {
      throw new InvalidWorkflowStageError(`Workflow ${input.kind} stage requires extraction state`)
    }
    return new WorkflowStage(input.kind, input.stage)
  }

  get stage(): ExtractionStage {
    if (this.extractionStage === undefined) {
      throw new InvalidWorkflowStageError('Validate stage has no extraction state')
    }
    return this.extractionStage
  }
}

/** @riviere-role value-object */
export class WorkflowState {
  declare private readonly brand: 'WorkflowState'

  private constructor(
    readonly graph: {
      readonly domains: Readonly<Record<string, DomainMetadata>>
      readonly outputPath: string
      readonly sources: readonly SourceInfo[]
    },
    readonly runLogDirectory: string,
    readonly stages: readonly WorkflowStage[],
  ) {}

  static parse(input: {
    readonly graph: {
      readonly domains: Readonly<Record<string, DomainMetadata>>
      readonly outputPath: string
      readonly sources: readonly SourceInfo[]
    }
    readonly runLogDirectory: string
    readonly stages: readonly WorkflowStage[]
  }): WorkflowState {
    return new WorkflowState(input.graph, input.runLogDirectory, input.stages)
  }
}
