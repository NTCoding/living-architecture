---
status: approved
dateAdded: 2026-09-15
systemAreas:
  - global
  - riviere-extract-ts
architectureConcepts:
  - value-object
  - riviere-role-understanding
  - component-responsibility
  - domain-modeling
source: conversation: remediating domain-port role-check failures on RiviereProject start input contracts
---

# Aggregate factory inputs are value objects

## Memory

### What the role check reported

A new rule requires every `domain-port` to be implemented by a
`domain-port-adapter`. It flagged seven declarations in
`packages/riviere-extract-ts/domain-model/src/domain/riviere-project-start-inputs.ts`.
Each carried a `domain-port` annotation like this:

```ts
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
```

The file also held `ExtractionProjectStartInput`,
`GraphOnlyProjectStartInput`, `GraphWithWorkflowStartInput`,
`RiviereProjectStartInput` (a union of the previous three), and two results.

### The mistake

The first attempt tried to re-role the declarations or invent a new role. It
did not test them as value objects.

`WorkflowStartInput` holds a name, an output path, a log directory and a list
of stages. It has no identity, no lifecycle, no repository and no side effects.
Every field is a value object (`WorkflowStage`) or a primitive. That is a value
object.

`Input` in the name describes the argument the factory takes. It does not mean
`command-use-case-input`, because this type is in the domain model, not the use
case layer. It does not mean `domain-port`, because there is no external
capability and no adapter.

### After: the inputs are value objects

```ts
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
    name: string
    outputPath: string
    runLogDirectory: string
    stages: readonly WorkflowStage[]
  }): WorkflowStartInput {
    const failure = validateWorkflow(input.name, input.stages)
    if (failure !== undefined) throw new InvalidWorkflowDefinitionError(failure.message)
    return new WorkflowStartInput(input.name, input.outputPath, input.runLogDirectory, [
      ...input.stages,
    ])
  }
}
```

```ts
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
```

```ts
/** @riviere-role value-object */
export class GraphOnlyProjectStartInput {
  declare private readonly brand: 'GraphOnlyProjectStartInput'

  private constructor(readonly graphDefinition: Parameters<typeof RiviereBuilder.parse>[0]) {}

  static from(
    graphDefinition: Parameters<typeof RiviereBuilder.parse>[0],
  ): GraphOnlyProjectStartInput {
    return new GraphOnlyProjectStartInput(graphDefinition)
  }
}
```

```ts
/** @riviere-role value-object */
export class GraphWithWorkflowStartInput {
  declare private readonly brand: 'GraphWithWorkflowStartInput'

  private constructor(
    readonly graphDefinition: Parameters<typeof RiviereBuilder.parse>[0],
    readonly workflowInput: WorkflowStartInput,
  ) {}

  static from(
    graphDefinition: Parameters<typeof RiviereBuilder.parse>[0],
    workflowInput: WorkflowStartInput,
  ): GraphWithWorkflowStartInput {
    return new GraphWithWorkflowStartInput(graphDefinition, workflowInput)
  }
}
```

The `?: undefined` fields from the old records are gone. They existed only to
discriminate the union, and distinct classes do not need them.

### The union is not a constraint

`RiviereProjectStartInput` was a union type alias:

```ts
export type RiviereProjectStartInput =
  | ExtractionProjectStartInput
  | GraphOnlyProjectStartInput
  | GraphWithWorkflowStartInput
```

The old reasoning was "`value-object` targets classes, so a union cannot be a
value object". The union is the current shape, not a boundary, and it has two
replacements.

Option A — delete the alias and use the value objects directly:

```ts
static start(
  input: GraphOnlyProjectStartInput,
  collaborators: RiviereProjectCollaborators,
): RiviereProject
static start(
  input: GraphWithWorkflowStartInput,
  collaborators: RiviereProjectCollaborators,
): RiviereProject
static start(
  input: ExtractionProjectStartInput,
  collaborators: RiviereProjectCollaborators,
): RiviereProject
static start(
  input:
    | GraphOnlyProjectStartInput
    | GraphWithWorkflowStartInput
    | ExtractionProjectStartInput,
  collaborators: RiviereProjectCollaborators,
): RiviereProject
```

Option B — one value object holds the discriminated start value, the way
`WorkflowStage` holds `WorkflowStageValue`:

```ts
type RiviereProjectStartValue =
  | Readonly<{ kind: 'graph'; graphDefinition: Parameters<typeof RiviereBuilder.parse>[0] }>
  | Readonly<{
      kind: 'graph-with-workflow'
      graphDefinition: Parameters<typeof RiviereBuilder.parse>[0]
      workflow: WorkflowStartInput
    }>
  | Readonly<{
      kind: 'configuration'
      configuration: ExtractionConfiguration
      draftComponents: readonly DraftComponent[]
    }>

/** @riviere-role value-object */
export class RiviereProjectStartInput {
  declare private readonly brand: 'RiviereProjectStartInput'

  private constructor(readonly value: RiviereProjectStartValue) {}

  static from(value: RiviereProjectStartValue): RiviereProjectStartInput {
    return new RiviereProjectStartInput(value)
  }
}
```

### The results are the genuine constraint

`RiviereProjectStartSuccess` could not be a value object, and not because of
its shape:

```ts
export type RiviereProjectStartSuccess = Readonly<{ success: true; project: RiviereProject }>
```

Its only field is the `RiviereProject` aggregate. `value-object` has
`forbiddenDependencies: ['aggregate', 'domain-service']`, and `RiviereProject`
is an aggregate.

The other roles do not fit either:

```ts
/** @riviere-role domain-event */
export type RiviereProjectStartSuccess = Readonly<{ success: true; project: RiviereProject }>
// no: an event is a record of something that happened, not a live aggregate
```

```ts
/** @riviere-role domain-port */
export type RiviereProjectStartSuccess = Readonly<{ success: true; project: RiviereProject }>
// no: a port is a capability and needs an adapter
```

### After: the factory returns the aggregate

The factory returns the aggregate and throws a domain error when it cannot
build one. The two result types are deleted, and validation moves into the
input value objects. And that last point is crucial here: move validation into the value objects so the validation can happen upstream and is moved out of aggregates and repositories. This is a clear design and it reduces the file size of aggregates and repositories that are likely to hit file limits.

```ts
// before
static start(
  input: GraphWithWorkflowStartInput,
  collaborators: RiviereProjectCollaborators,
): RiviereProjectStartResult
```

```ts
// after
static start(
  input: GraphWithWorkflowStartInput,
  collaborators: RiviereProjectCollaborators,
): RiviereProject
```

The only production caller already unwrapped the result and threw:

```ts
// before
const started = RiviereProject.start(input, collaborators)
if (!started.success) throw new ExtractionConfigError('VALIDATION_ERROR', started.error)
return started.project
```

```ts
// after
return RiviereProject.start(input, collaborators)
```

Overload 1 already returned the project directly for the infallible graph-only
case, so this brought the other start modes into line.

