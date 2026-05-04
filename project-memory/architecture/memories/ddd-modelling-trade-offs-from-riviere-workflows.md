---
status: approved
dateAdded: 2026-05-05
systemAreas:
  - global
  - riviere-cli
  - riviere-builder
  - riviere-extract-ts
architectureConcepts:
  - boundary-placement
  - component-responsibility
  - project-conventions
  - riviere-role-understanding
  - trade-off-reasoning
source: conversation: Rivière workflow DDD modelling discussion during riviere-extraction-workflows-v1
---

# DDD modelling lessons from the Rivière workflow discussion

## Memory

### 1. Feature names can bias aggregate discovery

A feature name should not be promoted directly into the domain model just because it is the visible product noun.

During the workflow discussion, the feature name “workflows” pushed designs toward a `WorkflowRun` aggregate immediately. That was too naive. It treated the product surface as the domain model before asking what lifecycle or invariant the aggregate would actually protect.

The better question was not “what does a workflow aggregate look like?” but “what is the system really doing?” In this case, the important fact was that Rivière is building one graph. The workflow is an ordered graph-building journey. That may imply a project concept, a graph rebuild concept, or another model — not automatically a workflow aggregate.

Future designs should treat feature nouns as clues, not answers.

### 2. Existing abstractions may be misnamed, too narrow, or no longer right

An existing aggregate should not be reused just because it exists.

`ExtractionProject` looked like the obvious existing abstraction because workflows include extraction steps. But the discussion exposed uncertainty: is `ExtractionProject` truly extraction-only, or was it an early name for a broader Rivière project concept? If extraction in product language means “extract architecture and build the graph”, then the current name may be too narrow. If the class only owns source-code extraction behaviour, then pushing workflow behaviour into it would be wrong.

The modelling lesson is to challenge existing abstractions when new features put pressure on them. Sometimes the right move is to extend the existing concept. Sometimes the right move is to rename it. Sometimes it should be split or replaced.

The existence of a class is not evidence that it is the right domain boundary.

### 3. New concepts must earn their name

Introducing a new noun can make a model worse if it does not clarify responsibility.

Names like `GraphBuildRun` were considered and felt wrong because they added vocabulary without making the domain easier to understand. A new concept should explain something: a lifecycle, an invariant, a responsibility, or a boundary.

If a new component only exists to connect other components, pass data through layers, or avoid deciding where behaviour belongs, it is probably architecture theatre.

A useful test is: “What would be harder to explain if this concept did not exist?” If the answer is unclear, the new concept may not be real.

### 4. External UX and internal domain model do not need to match

A user-friendly workflow file can be simple and inline, while the internal model can be richer.

Users may want this:

```yaml
steps:
  - extract:
      config: .riviere/config/bff.extraction.json
  - link
  - validate
  - save
```

That does not mean the domain model should carry raw config paths through every stage as dumb inputs. The loader/repository boundary can translate the external workflow file into configured project state or executable step definitions.

The key lesson is that UX shape and domain shape are different concerns. The external workflow file optimises for user clarity. The internal model should optimise for correct ownership, lifecycle, and invariants.

### 5. Rebuild means empty-start

A rebuild operation should enforce its own empty-start invariant.

Passing an empty `RiviereBuilder` into a method like this is suspicious:

```ts
project.rebuildGraph(builder)
```

If the operation is truly a rebuild, callers should not be able to pass in a partially built graph. That would change the meaning from “rebuild from empty” to “continue from arbitrary state”.

A better shape is:

```ts
project.rebuildGraph()
```

The project or graph-building domain concept creates the empty builder internally. If the product later needs “continue from existing graph”, that should be a different operation with a different name.

Method signatures should protect domain meaning, not weaken it.

### 6. Do not make the use case join things that naturally belong together

A use case should not create two objects and pass one into the other if that relationship is a natural part of the domain operation.

The earlier shape:

```ts
const builder = builders.createEmpty()
const result = project.rebuildGraph(builder)
```

made the use case responsible for joining the project and builder. But if rebuilding a graph naturally starts from an empty builder, the project should create or own that empty-start process itself.

The use case should express the application action at a high level:

```ts
const project = projects.load(reference)
const result = project.rebuildGraph()
```

When a use case becomes responsible for wiring natural collaborators, it may be compensating for a missing or weak domain model.

### 7. Aggregates must not be nested or smuggled through resource maps

Aggregates should not be hidden inside another aggregate’s state, stage resources, or lookup maps.

The rejected designs repeatedly made `ExtractionProject` appear inside workflow state:

```ts
state.extractionProjects[stage.configPath]
```

or inside stage operation resources. That is not a small implementation detail. It indicates unclear aggregate ownership.

If `ExtractionProject` is an aggregate, it must be loaded through its repository and not treated as a casual resource object inside another aggregate. If the broader project concept needs to own extraction behaviour, then perhaps `ExtractionProject` is not the right aggregate anymore.

The modelling lesson is: when aggregates start appearing in maps or optional resource bags, stop and reconsider the aggregate boundaries.

### 8. Stage loops need a real owner

Ordered stage execution is domain behaviour when it protects business rules such as sequencing, fail-fast, and all-or-nothing output.

The loop should not automatically live in the use case, repository, or shell:

- Shell startup must not decide workflow semantics.
- A repository should not become a workflow engine.
- A command use case should not contain complex branching and stage progression.
- A generic operation set should not hide unresolved ownership.

The right owner depends on the model. It might be a project aggregate, a process concept, or a carefully defined execution component. But the owner must be chosen because it owns the lifecycle and invariants, not because it was the easiest place to put a loop.

### 9. Repositories load and save; they do not execute the process

A repository should not become a workflow runner.

One rejected design put `rebuildAndWrite()` inside a repository. That made infrastructure/persistence own the stage lifecycle. It blurred loading, execution, and saving into one component.

A repository may resolve files, parse persisted state, assemble an aggregate, and save outputs. It should not own the business process of extract → link → validate → save unless the aggregate boundary genuinely says that persistence is the process, which is rarely true.

When repository methods start sounding like commands — `run`, `execute`, `rebuildAndWrite`, `processStages` — check whether behaviour has leaked into persistence.

### 10. CLI output policy belongs at the CLI boundary

If the CLI can write to console or file according to parameters, that choice should remain at the CLI boundary.

The application/domain layer can return:

- the completed graph artefact
- run events
- success/failure details

The CLI then decides whether to print, write, or format those outputs.

This keeps output policy from leaking into the project/domain model. It also makes the same application result usable by future callers without inheriting CLI-specific file-output assumptions.

### 11. Names are design tests

A name is not decoration. If a component’s name and behaviour do not match, the model is unclear.

The clearest example was a `WriteGraphStageOperation` that did not write the graph. It only prepared a candidate. That mismatch was not a minor naming issue; it exposed uncertainty about where the final graph commit actually happened.

Good names should make responsibility inspectable. If a component prepares graph output, name it that. If it writes, it should write. If a method rebuilds, it should enforce rebuild semantics.

Bad names hide design gaps.

### 12. Domain vs infrastructure is not decided by technology alone

Extraction reads code and config, but extraction is still core Rivière domain logic.

The fact that a component uses ts-morph, source files, or configuration does not automatically make the whole concern “infrastructure”. Technical loading and file access are infrastructure. But extraction rules, detection, enrichment, connection detection, and graph-building meaning are domain behaviour.

This distinction matters because treating extraction as infrastructure would push important product logic to the edge of the model. Rivière’s purpose is to extract architecture and build a graph, so extraction behaviour must remain central to the domain design.

## Why this matters

These lessons help prevent mechanically domain-sounding architecture. A design can include aggregates, repositories, domain services, and workflow vocabulary while still failing to model the real domain. The Rivière workflow discussion showed that the strongest design work happened when existing and proposed names were challenged against lifecycle, invariant, responsibility, and result.

This matters especially when a feature looks like orchestration. Orchestration pressure often reveals weak boundaries: a missing domain concept, an overgrown aggregate, an existing abstraction with a misleading name, or a role model that lacks the right execution concept.

## Consider this when

- A feature name, command name, or user-facing noun starts driving the architecture directly.
- A new aggregate is proposed because a noun exists in the PRD.
- An existing aggregate is being stretched to support a new lifecycle.
- A design introduces `Manager`, `Executor`, `OperationSet`, `CapabilitySet`, `Orchestrator`, or resource-map concepts.
- A repository method starts sounding like a command.
- A use case contains loops, branching, or business process sequencing.
- A method name implies a stronger invariant than its signature enforces.
- The external workflow/config UX is being copied directly into the internal domain model.

## Do not apply automatically when

- A feature noun genuinely owns a real consistency boundary, lifecycle, and invariant.
- A repository is only assembling persisted state and not executing business process.
- A use case contains trivial sequencing that does not encode domain process rules.
- A tactical bridge has been explicitly accepted with known architecture debt.

## Clarify with the user when

- A generated design promotes a feature name directly into an aggregate.
- A model preserves an existing aggregate only because it already exists.
- A new noun is introduced but does not clarify responsibility.
- A component name and behaviour do not match.
- A rebuild operation accepts existing mutable graph state.
- An aggregate appears inside another aggregate, resource map, stage object, or optional resource bag.
- Extraction is described as infrastructure merely because it reads code/config or uses technical parsing tools.

## Related references

- `docs/project/PRD/riviere-extraction-workflows-v1/ARCH.md`
- `.riviere/role-selection-guide.md`
- `.riviere/role-definitions/aggregate.md`
- `.riviere/role-definitions/aggregate-repository.md`
- `.riviere/role-definitions/command-use-case.md`
- `docs/architecture/adr/ADR-002-allowed-folder-structures.md`
