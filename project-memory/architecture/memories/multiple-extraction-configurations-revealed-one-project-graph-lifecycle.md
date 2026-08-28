---
status: approved
dateAdded: 2026-08-28
systemAreas:
  - riviere-builder
  - riviere-extract-ts
  - riviere-cli
architectureConcepts:
  - boundary-placement
  - component-responsibility
  - riviere-role-understanding
  - trade-off-reasoning
  - value-object
  - domain-modeling
source: conversation: Issue 407 domain model evolution
---

# Multiple extraction configurations revealed one project graph lifecycle

## Memory

### The requirement led to the model

Issue 407 requires one workflow to run multiple extraction configurations in order and accumulate their contributions in one Rivière graph. Later stages must work with the accumulated state. Failed runs must leave the previous completed graph unchanged.

The implemented `RiviereProject` was reconstructed around one `ExtractionConfiguration`. That left no clear owner for the combined state created by several configurations during one workflow run.

The modelling therefore started with the state problem:

```text
several extraction configurations
              │
              │ contribute in order
              ▼
one accumulated graph
              │
              │ must remain coherent for the complete run
              ▼
which concept owns each part of the state?
```

That investigation eventually reached aggregate boundaries. The aggregates were not the starting assumption.

### The use cases did not require two aggregates

The existing Builder commands covered direct graph construction:

```text
InitGraph                  DefineCustomType
AddSource                  DefineRelationshipType
AddDomain                  EnrichComponent
AddComponent               LinkComponents
LinkExternal               LinkHttp
```

Construction checks cover the same project graph:

```text
CheckConsistency           FinalizeGraph
ValidateGraph
```

These use cases can load `RiviereProject`, invoke project graph behaviour, and save the project. They do not need a separate Builder aggregate lifecycle. Simple graph building and workflow graph building are close enough to operate on the same project-owned Builder.

Read only graph use cases remain on the query side:

```text
DetectOrphans              ListComponents
ListDomains                ListEntryPoints
SearchComponents           TraceFlow
ComponentChecklist         ComponentSummary
```

### Approved ownership

```text
RiviereProject aggregate
├── project state
├── Workflow entities
│   └── each owns its workflow identity, state, stages,
│       progression, failures, events and run warnings
└── one RiviereBuilder mutable value object
    └── graph construction state, indexes, rules and invariants
```

`RiviereProject` is the only aggregate. It owns project state. Each `Workflow` entity owns its own workflow state inside the project boundary. The Project does not duplicate the graph, component, link, or index state owned by its Builder.

### Builder identity is unnecessary

`RiviereBuilder` is defined by its graph construction values. Equivalent graph values reconstruct equivalent Builder behaviour. No consumer needs a stable Builder identity that survives reconstruction, and the Builder has no lifecycle independent of the project graph being constructed.

The repository therefore loads persisted graph values and lets the aggregate reconstruct its private state:

```ts
const graph = readAndValidateGraph(path)
return RiviereProject.rehydrate(graph)
```

```ts
static rehydrate(graph: RiviereGraph): RiviereProject {
  return new RiviereProject(undefined, [], [], RiviereBuilder.fromGraph(graph))
}
```

No repository or use case passes a Builder into `RiviereProject`. Only an aggregate has a repository, so `RiviereBuilderRepository` is retired when Builder ceases to be an aggregate.

### Mutability is an explicit value object exception

Builder mutation preserves its indexed graph construction design and the measured 80,000 component and 80,000 link paths. Replacing the maps and indexes with immutable copies would discard that performance characteristic.

Mutability does not create identity. `RiviereBuilder` is therefore an explicit mutable value object: it remains defined by its current graph construction values, has no independent lifecycle, and has no repository.

The entity and value object distinction is blurry when an object can be modelled immutably or mutably without an identity that consumers observe. Builder `Component` values may contain rich behaviour, but that does not by itself require entity identity. They are also approved mutable value objects where mutation is necessary.

### Published language is the subdomain API

`RiviereBuilder` and the values needed to use it move to the builder published language.

The published language is intended to become the effective public API of a subdomain. Coupling another subdomain to that deliberate contract is better than coupling it to a private domain model. Domain model imports may become forbidden while published language remains the supported collaboration boundary.

```text
riviere-extract-ts domain model
              │
              │ depends on public contract
              ▼
riviere-builder published language
```

Direct library consumers continue to construct and use `RiviereBuilder` through that published API.

`WorkflowBuilder` is a separate workflow-facing capability. It is not another name for `RiviereBuilder`, and moving `RiviereBuilder` to published language does not by itself remove or replace `WorkflowBuilder`.

### Construction and querying remain separate

```text
RiviereBuilder
├── graph mutation
├── construction diagnostics
├── validation
├── build
└── serialisation

RiviereQuery
├── statistics
├── orphan detection
├── near matches
├── graph lookup
└── flow tracing
```

Warnings are construction diagnostics and remain on Builder. Statistics and near matches are queries and belong on `RiviereQuery`. `validate` is not a query operation.

`GraphDiagnostics` describes diagnostic values. Orphan detection can be calculated while constructing those diagnostics. Operation warnings such as `SCALAR_OVERWRITE` and `DUPLICATE_LINK_SKIPPED` are returned by the mutation that produced them and recorded by a Workflow when they occur during a run.

### Target persistence shape

The historical command shape loads and saves Builder:

```ts
const builder = builderRepository.load(graphPath)
builder.addDomain(input)
builderRepository.save(graphPath, builder)
```

The target command shape loads and saves Project:

```ts
const project = projectRepository.load(graphPath)
project.addDomain(input)
projectRepository.save(graphPath, project)
```

The repository takes only the information needed to locate persisted project state. It reads and validates the graph, calls `RiviereProject.rehydrate(graph)`, and saves the graph returned by the aggregate.

### One Builder serves both paths

```text
direct graph command ─────▶ RiviereProject ─────▶ owned RiviereBuilder

workflow run ─────────────▶ RiviereProject
                                  │
                                  ├── owns Workflow state
                                  └── uses the same owned RiviereBuilder
```

Every workflow rebuild starts with fresh Builder state. Configurations contribute in workflow order. Later work uses the accumulated graph. Only a completed graph is persisted.

## Why this matters

New requirements can expose missing state ownership even when the existing model served its original use cases. Following the requirement prevented historical aggregate classification from deciding the future model.

The approved model keeps one project lifecycle, preserves the specialised mutable implementation, and establishes published language as the subdomain collaboration boundary.

## Consider this when

- Several configurations contribute to one accumulated domain result.
- A mutable object is treated as an aggregate because it historically had a repository.
- Direct library use is mistaken for aggregate identity.
- Another subdomain needs a stable public API without coupling to private domain model code.

## Do not apply automatically when

- A capability has an independent identity or lifecycle.
- Operations genuinely protect different consistency boundaries.
- Equivalent persisted values cannot reconstruct equivalent behaviour.
- Mutability has no approved performance or correctness reason.

## Clarify with the user when

- Builder state appears to need persistence outside a project lifecycle.
- A workflow needs to retain incomplete graph state across runs.
- Another subdomain needs a Builder capability that is not in the published API.
- `WorkflowBuilder` responsibilities or dependencies need to change.

## Related references

- GitHub issue `#407`
- `docs/project/PRD/active/PRD-phase-13-extraction-workflows.md`
- `docs/project/PRD/riviere-extraction-workflows-v1/PRD.md`
- `.riviere/role-definitions/aggregate.md`
- `.riviere/role-definitions/aggregate-entity.md`
- `.riviere/role-definitions/value-object.md`
- `.riviere/role-selection-guide.md`
- `packages/riviere-builder/published-language/src/published-language/riviere-builder.ts`
- `packages/riviere-extract-ts/use-cases/src/features/extract/data-access/riviere-project/riviere-project-repository.ts`
- `packages/riviere-extract-ts/domain-model/src/domain/riviere-project.ts`
