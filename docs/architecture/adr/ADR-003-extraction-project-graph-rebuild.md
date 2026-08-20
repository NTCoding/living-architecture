# ADR-003: Extraction Project Graph Rebuild

**Status:** Accepted

## Context

An extraction workflow rebuilds one Rivière graph through ordered extract, link, and validate stages. The extraction process must be usable outside the CLI, for example by a cloud application.

`RiviereProject` owns the extraction stages and their state. It must therefore own the stage loop. However, `RiviereBuilder` is a separate domain model. ADR-002 prohibits one domain model package from importing another.

The earlier workflow architecture showed `RiviereProject` creating `RiviereBuilder` directly. That breaks ADR-002. Moving the stage loop into the CLI use case would avoid that import, but would make the extraction process CLI specific and force another caller to recreate the process.

## Decision

`RiviereProject` owns the ordered extract, link, and validate loop. It returns a typed result for expected extraction failures. The adapter mirrors existing Riviere builder behaviour: it does not catch or translate builder exceptions.

The extraction domain defines a `GraphBuilder` port. The port exposes only the graph operations that the extraction process needs:

```typescript
/** @riviere-role domain-port */
export interface GraphBuilder {
  addComponents(repository: string, components: readonly EnrichedComponent[]): void
  addLinks(links: readonly ExtractedLink[], externalLinks: readonly ExternalLink[]): void
  validate(): void
  build(): RiviereGraph
}
```

`addComponents` and `addLinks` transfer already graph-ready extraction output into the graph being built. They do not perform extraction, stage ordering, retries, or policy decisions.

The CLI shell supplies `RiviereBuilderRepository` to the extraction adapter. After `RunWorkflow` loads the aggregate, the adapter creates a fresh `GraphBuilder` from the loaded graph sources and domains:

```typescript
const builderRepository = new RiviereBuilderRepository()
const runWorkflow = new RunWorkflow(
  riviereProjectRepository,
  createRiviereBuilderGraph(builderRepository),
)
```

The adapter is in the extraction use-case package. It depends on the extraction domain port and a structural builder-operation dependency supplied by the shell. It creates the actual `GraphBuilder` that `RunWorkflow` passes to `RiviereProject.rebuildGraph()`. It does not import the Riviere builder domain model, own the stage loop, or add policy to make the two models fit.

The resulting flow is:

```text
CLI entrypoint
  -> RunWorkflow
  -> RiviereProjectRepository.load(...)
  -> RiviereProject.rebuildGraph(graphBuilder)
       -> extract stages
       -> graphBuilder.addComponents(...)
       -> link stages
       -> graphBuilder.addLinks(...)
       -> graphBuilder.validate()
       -> graphBuilder.build()
```

## Consequences

- The extraction process is reusable by a CLI, cloud application, or another caller without recreating the stage loop.
- The extraction domain depends only on its own port, not on `RiviereBuilder` or any other domain model.
- The CLI remains application glue. It wires dependencies and presents the result. It does not decide extraction stage order or graph construction policy.
- `RiviereProject` owns the loaded graph-output path and run-log directory. `RunWorkflow` returns those values with the rebuilt graph; the CLI performs the writes.
- A different graph implementation can satisfy the port if it supports the same graph build operations.
- The adapter remains small and low risk because it maps inputs directly to builder operations.

## Superseded Architecture Text

This decision supersedes the parts of `docs/project/PRD/riviere-extraction-workflows-v1/ARCH.md` that show `RiviereProject` directly constructing `RiviereBuilder`, or that place the graph application mapping in a workflow domain service. The product and workflow-file design remain valid.

The change was found during implementation design. The original ownership model was challenged because it violated the existing domain-model boundary. Implementation discovery must be allowed to correct an approved design when a deeper model reveals an invalid dependency.
