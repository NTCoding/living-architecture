---
status: approved
dateAdded: 2026-05-04
systemAreas:
  - global
  - riviere-cli
  - dev-workflow-v2
architectureConcepts:
  - component-responsibility
  - boundary-placement
  - project-conventions
  - riviere-role-understanding
source: docs/project/PRD/riviere-extraction-workflows-v1/ARCH.md and conversation: rejected workflow component design case study
---

# Case study: rejected Rivière workflow architecture options

## What went wrong

During `riviere-extraction-workflows-v1` architecture drafting, the generated component design options violated basic project conventions that were clearly articulated up front and provided as part of the instruction prompt and design review feedback.

This was not a subjective preference or a grey-area architecture judgement. The designs failed to follow explicit project conventions, `.riviere` role rules, and ADR-002 layering responsibilities.

## Example problems

### 1. Business logic dumped into the use case

The command use case was doing business/process work instead of staying as high-level orchestration.

The intended use-case shape was clarified as:

- maximum 4 constructor parameters
- no private methods in use cases
- no loops in use cases

### 2. Dependency-soup constructor in the use case

Rejected example:

```ts
private readonly readJson: typeof readJsonFile,
private readonly createGraph: typeof createRiviereBuilderGraph,
private readonly runExtraction: typeof runRiviereTypeScriptExtraction,
private readonly upsertComponents: typeof upsertRiviereBuilderComponents,
private readonly linkGraph: typeof linkRiviereBuilderGraph,
private readonly validateGraph: typeof validateRiviereBuilderGraph,
private readonly serializeGraph: typeof serializeRiviereBuilderGraph,
private readonly appendLog: typeof appendNdjsonFile,
private readonly writeGraph: typeof writeJsonFile,
) {}
```

Why it was wrong:

The use case directly knew about each low-level workflow step. This made the use case responsible for coordinating the workflow implementation rather than staying at high-level orchestration.

It also pushed all knowledge of how to wire the workflow together into the application shell, because the shell would have to construct the use case with every low-level dependency in the correct order. The workflow assembly knowledge was not owned by a coherent workflow component.

### 3. Three options were structurally the same

Examples of the repeated shape:

```ts
const request = this.requestLoader.load(input)
const result = this.executor.execute(request)
this.resultWriter.save(result)
return result.toCommandResult()
```

```ts
const definition = createWorkflowDefinition(this.readJson(input.workflowPath))
const graphState = this.createGraph(definition.graph)
const result = this.runner.run(definition, graphState)
this.writeGraph(result.finalGraph)
return result
```

```ts
constructor(
  private readonly readJson: typeof readJsonFile,
  private readonly createGraph: typeof createRiviereBuilderGraph,
  private readonly runExtraction: typeof runRiviereTypeScriptExtraction,
  private readonly upsertComponents: typeof upsertRiviereBuilderComponents,
  private readonly linkGraph: typeof linkRiviereBuilderGraph,
  private readonly validateGraph: typeof validateRiviereBuilderGraph,
  private readonly serializeGraph: typeof serializeRiviereBuilderGraph,
  private readonly appendLog: typeof appendNdjsonFile,
  private readonly writeGraph: typeof writeJsonFile,
) {}
```

Why it was wrong:

The options had different names, but they repeated the same architecture shape: a command use case wired to low-level workflow operations, directly or through thin renamed wrappers.

They were not real alternatives because they did not explore different ownership of workflow assembly, progression, stage execution, or graph-state fold behaviour.

### 4. Query-side role used for write behaviour

Rejected example:

```md
| `WorkflowRunRequestLoader` class | `query-model-loader` | `query-model-loader` |
```

Why it was wrong:

`WorkflowRunRequestLoader` was part of running a workflow. Running a workflow is write/process behaviour because it builds graph state and may write the final graph.

A `query-model-loader` is for loading read-side/query state. Using it in the workflow run path mixed query-side roles into command/write behaviour.

### 5. Critical-path components left as `open role decision`

Rejected examples:

```md
| `WorkflowRunResultWriter` class | open role decision | open role decision |
```

```md
| `WorkflowGraphBuildExecutor` class | open role decision | open role decision |
```

Why it was wrong:

These were critical-path components, not minor edge questions.

`WorkflowRunResultWriter` was responsible for saving or recording workflow results.

`WorkflowGraphBuildExecutor` was responsible for the graph-building execution path.

Leaving either as `open role decision` meant the design had not identified where the responsibility belonged. If a critical component has no valid role, the design is incomplete and cannot be implemented confidently.

### 6. Domain result exposing command/use-case conversion

Rejected example:

```ts
const result = this.executor.execute(request)
this.resultWriter.save(result)
return result.toCommandResult()
```

Why it was wrong:

`result` was treated as a domain result, but it exposed `toCommandResult()`, which is a command/use-case result shape.

That made the domain type aware of the application layer. The conversion from domain result to command/use-case result should not live on the domain object.

### 7. Use-case input passed into infrastructure

Rejected example:

```ts
const request = this.requestLoader.load(input)
```

Why it was wrong:

`input` was the command-use-case input object.

Passing it into `requestLoader` meant an infrastructure-side component was being asked to understand the command/use-case input shape.

That couples infrastructure to the application layer contract. The use-case input should be translated before crossing into lower-level or infrastructure components.

### 8. External-client service containing domain logic

Rejected example:

```ts
/** @riviere-role external-client-service */
export function runRiviereWorkflowStageOperation(
  stage: WorkflowStage,
  graphState: RiviereBuilder,
): WorkflowStageResult
```

Why it was wrong:

The function was marked as an `external-client-service`, but its signature used problem-domain concepts:

- `WorkflowStage`
- `graphState`
- `WorkflowStageResult`

That means it was not just wrapping an external technical capability. It was participating in domain behaviour and deciding how state should change.

Domain logic belongs in the domain model. The most important architectural principle is to protect and encapsulate domain logic from technical concerns, and this was a total failure.

## Related references

- `docs/project/PRD/riviere-extraction-workflows-v1/ARCH.md`
- `.riviere/role-selection-guide.md`
- `.riviere/role-definitions/command-use-case.md`
- `.riviere/role-definitions/query-model-loader.md`
- `.riviere/role-definitions/external-client-service.md`
- `docs/architecture/adr/ADR-002-allowed-folder-structures.md`
