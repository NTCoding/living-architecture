import type { BuilderOptionsInput } from '@living-architecture/riviere-builder-published-language'
import type { DraftComponent } from './component-extraction/draft-component'
import type { ExtractionConfiguration } from './extraction-configuration'
import type { WorkflowStage } from './workflow-stage'
import { InvalidWorkflowDefinitionError } from './riviere-project-errors'

/** @riviere-role value-object */
export class ExtractionProjectStartInput {
  declare private readonly brand: 'ExtractionProjectStartInput'
  private constructor(
    readonly configuration: ExtractionConfiguration,
    readonly draftComponents: readonly DraftComponent[],
  ) {}
  static from(
    configuration: ExtractionConfiguration,
    draftComponents: readonly DraftComponent[],
  ): ExtractionProjectStartInput {
    return new ExtractionProjectStartInput(configuration, [...draftComponents])
  }
}

/** @riviere-role value-object */
export class WorkflowStartInput {
  declare private readonly brand: 'WorkflowStartInput'
  private constructor(
    readonly name: string,
    readonly outputPath: string,
    readonly runLogDirectory: string,
    readonly stages: readonly WorkflowStage[],
  ) {}
  static from(input: {
    readonly name: string
    readonly outputPath: string
    readonly runLogDirectory: string
    readonly stages: readonly WorkflowStage[]
  }): WorkflowStartInput {
    validateWorkflow(input.name, input.stages)
    return new WorkflowStartInput(input.name, input.outputPath, input.runLogDirectory, [
      ...input.stages,
    ])
  }
}

function validateWorkflow(name: string, stages: readonly WorkflowStage[]): void {
  if (!/^[a-z0-9][a-z0-9-]*$/.test(name)) {
    throw new InvalidWorkflowDefinitionError(
      `Workflow name '${name}' must match [a-z0-9][a-z0-9-]*`,
    )
  }
  if (stages.length === 0) {
    throw new InvalidWorkflowDefinitionError('Workflow must define at least one stage')
  }
  const duplicateName = findDuplicateStageName(stages)
  if (duplicateName !== undefined) {
    throw new InvalidWorkflowDefinitionError(`Duplicate workflow stage name '${duplicateName}'`)
  }
}

function findDuplicateStageName(stages: readonly WorkflowStage[]): string | undefined {
  const names = new Set<string>()
  for (const stage of stages) {
    if (names.has(stage.value.name)) return stage.value.name
    names.add(stage.value.name)
  }
  return undefined
}

/** @riviere-role value-object */
export class GraphOnlyProjectStartInput {
  declare private readonly brand: 'GraphOnlyProjectStartInput'
  private constructor(readonly graphDefinition: BuilderOptionsInput) {}
  static from(graphDefinition: BuilderOptionsInput): GraphOnlyProjectStartInput {
    return new GraphOnlyProjectStartInput(graphDefinition)
  }
}

/** @riviere-role value-object */
export class GraphWithWorkflowStartInput {
  declare private readonly brand: 'GraphWithWorkflowStartInput'
  private constructor(
    readonly graphDefinition: BuilderOptionsInput,
    readonly workflowInput: WorkflowStartInput,
  ) {}
  static from(
    graphDefinition: BuilderOptionsInput,
    workflowInput: WorkflowStartInput,
  ): GraphWithWorkflowStartInput {
    return new GraphWithWorkflowStartInput(graphDefinition, workflowInput)
  }
}
