# Solution Exploration: Phase 13 Extraction Workflows

**Status:** Approved

---

## 1. Problem anchor

Users with multiple architecture sources need one reproducible operation that composes deterministic extraction, specification imports, bounded AI assistance, validation, diagnostics, and final output without manually coordinating five or more steps.

## 2. Research scope and sources

Research concentrated on the existing Riviere implementation and its real customer-like demo because Phase 13 extends shipped domain behaviour rather than selecting a generic third-party workflow engine.

| Source                               | Type                | Why included                                                          | Accepted finding                                                                                        |
| ------------------------------------ | ------------------- | --------------------------------------------------------------------- | ------------------------------------------------------------------------------------------------------- |
| `packages/riviere-extract-ts/`       | internal            | Existing Project, Workflow, extraction, and repository implementation | `RiviereProject` already owns Workflow entities and is the correct aggregate boundary                   |
| `packages/riviere-builder/`          | internal            | Existing graph construction and merge language                        | One private Builder can accumulate typed stage contributions without an intermediate graph format       |
| `apps/cli/`                          | internal            | Existing CLI composition and command conventions                      | The shell constructs dependencies; entrypoints translate and present; use cases invoke domain behaviour |
| `ecommerce-demo-app`                 | internal dogfooding | Current first-customer extraction path                                | The demo can prove a believable multi-source workflow while preserving direct extraction                |
| EventCatalog SDK and AsyncAPI parser | open-source         | Required source adapters                                              | Narrow supported imports can be isolated behind domain ports and generic clients                        |

## 3. Existing solution research

The implementation already contains a Project aggregate, a private Builder, fixed extraction Workflow stages, strict published schemas, role enforcement, and CLI composition. Replacing these with a generic workflow engine would duplicate ownership and lose exhaustive type safety. The accepted direction extends the existing model with a closed six-stage language and keeps external SDK/process concerns outside domain code.

## 4. Candidate approaches

### Option A: Project-owned typed Workflow

- Concept: extend the existing Workflow entity with six built-in typed stages executed against the Project's private Builder.
- User change: users run one file-addressed `riviere workflow run` command and receive one graph plus structured diagnostics.
- Relevant research: existing `RiviereProject`, Workflow, Builder, repository, and role-enforced package boundaries.
- Trade-off: built-in stages require published-language and exhaustive-match updates.
- Risk: repository loading and direct extraction must be migrated without breaking shipped commands.

### Option B: Generic workflow runtime

- Concept: introduce a separate engine, handler registry, intermediate stage outputs, and graph merge layer.
- User change: users still receive one command but configuration becomes extension-oriented.
- Relevant research: generic engines support broader orchestration, but Phase 13 needs only six known sequential stages.
- Trade-off: speculative flexibility at the cost of a second runtime owner and duplicate graph semantics.
- Risk: unchecked stage names, split ownership, and divergence from Builder invariants.

### Option C: Shell script orchestration

- Concept: document a sequence of existing and new commands without a domain Workflow lifecycle.
- User change: users own ordering, partial-output handling, and diagnostics composition.
- Relevant research: this is the current failure mode formalised rather than solved.
- Trade-off: smallest implementation but no dependable product boundary.
- Risk: partial graphs and non-reproducible CI remain possible.

## 5. Selected product concept

**Concept approval:** Approved

Use the Project-owned typed Workflow. A workflow file declares graph-wide inputs and ordered references to strict stage configs. `RiviereProject` remains the sole aggregate, its Workflow entity owns progression and failure state, and its private Builder accumulates all stage contributions. External source and AI capabilities are explicit ports. The public result includes the final graph, structured events, diagnostics, and complete immutable state snapshots at the initial boundary and after every completed stage.

## 6. Product paths

### Happy path

The user creates or authors `riviere-workflow.yaml`, validates it, runs it non-interactively, watches stage summaries, and receives one atomically replaced valid graph plus an NDJSON log. The same file and inputs produce byte-identical deterministic output when AI stages are skipped.

### Unhappy paths

- Invalid workflow or stage config -> fail before execution with file and validation context.
- Missing active AI executable -> validation or normal run fails with the stage and command named.
- `--skip-ai` or `--dry-run` -> valid AI configs still load, but no executable availability check occurs because no process will run.
- Stage failure -> stop immediately, retain the previous output graph, and return completed-stage events, diagnostics, and snapshots.
- Existing extraction config during workflow initialization -> create no files and return detected paths, migration guidance, and a ready-to-copy assistant prompt.

## 7. No-gos and exclusions

- No generic workflow engine, user plugin registry, arbitrary shell stage, branching, parallel stages, retries, or workflow composition.
- No second aggregate, workflow runtime package, graph-write port, Builder adapter, or intermediate graph merge format.
- No change to deterministic extraction semantics.
- No AI SDK, provider credentials, model controls, retry policy, token accounting, or claim of AI-inclusive idempotency.
- No automated migration of existing extraction configurations.
- No cross-repository orchestration or cross-repository linking.

## 8. Risk review

| Risk               | Confidence | Evidence / reason                                                                | Open concern                                                     | Mitigation / next step                                                          |
| ------------------ | ---------- | -------------------------------------------------------------------------------- | ---------------------------------------------------------------- | ------------------------------------------------------------------------------- |
| Value              | High       | Demo requires code, EventCatalog, AsyncAPI, and deliberate AI gaps               | Workflow YAML could become difficult to author                   | Keep stage behaviour in referenced configs and dogfood the complete journey     |
| Usability          | High       | One file-addressed validate/run path replaces five or more coordinated steps     | Failure context may be too coarse                                | Return stage-specific diagnostics, summaries, logs, and transition state        |
| Feasibility        | High       | Existing Project, Workflow, Builder, schemas, and CLI provide the required seams | Existing loading methods conflate access patterns and operations | Migrate every current loading path explicitly before canonical workflow loading |
| Business viability | High       | Multi-source composition is the next step after direct extraction                | Demo and product repositories must remain coordinated            | Pin an immutable demo revision and automate the cross-repository gate           |

## 9. Risky assumptions

- EventCatalog SDK exposes the relationships required by the narrow Phase 13 mapping; a capability spike must fail the delivery if it does not.
- AsyncAPI v3 publish/subscribe is sufficient for the demo; request/reply remains explicitly rejected.
- Bounded AI CLI JSON output can be validated and applied additively without provider-specific APIs.
- Full transition snapshots have acceptable production memory cost for Phase 13 and are required for an honest supported observation API.

## 10. Rejected options

- Generic workflow runtime: rejected because it duplicates Project and Workflow ownership and weakens exhaustive type safety.
- Shell orchestration: rejected because it preserves partial-output and diagnostics problems.
- Test-only transition observer: rejected because dogfooding needs supported production state rather than privileged test access.
- Split AI availability and execution ports: rejected in favour of one cohesive `AiCli` capability implemented by one adapter.

## 11. Open discovery questions

No open discovery questions.
