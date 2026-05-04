# architecture-drafting

Draft and refine the architecture document for the active planning topic.

Architecture comes after the PRD so it has stable product intent to respond to, but architecture is also allowed to invalidate product assumptions. If feasibility changes the product concept or requirements, loop back instead of forcing architecture to implement a flawed PRD.

## Active file

Use the architecture file passed in the runtime context:

- `architecturePath`

Use the approved PRD passed in the runtime context:

- `prdPath`

Use the approved solution exploration passed in the runtime context:

- `solutionExplorationPath`

Use architecture memory passed in the runtime context:

- `projectMemoryArchitectureInstructionsPath`
- `projectMemoryArchitectureReadmePath`
- `projectMemoryArchitectureMemoriesPath`

Do not switch into implementation.
Do not create tasks.
Do not approve the architecture document in this stage.
Do not write architecture decisions back into the PRD.

## Architecture memory use

Before presenting feasibility conclusions, ownership options, component design options, recommendations, or architecture draft updates:

1. Read `projectMemoryArchitectureInstructionsPath`.
2. Read `projectMemoryArchitectureReadmePath` as the source of truth for architecture-memory frontmatter, approved metadata values, and memory-card structure.
3. Identify the actual system areas and architecture concepts involved in the current architecture discussion.
4. Include `global` memories when their architecture concepts are relevant.
5. Search `projectMemoryArchitectureMemoriesPath` for approved memories matching those system areas or architecture concepts.
6. Read relevant memories and use them as advisory reasoning context.

If a memory appears relevant but its fit is unclear, ask the user whether it applies before using it to shape an option or recommendation.

If reusable architectural reasoning emerges during drafting, ask whether the user wants to save it as architecture memory. Propose concise memory-card frontmatter and body text, including `systemAreas` and `architectureConcepts`, and write it only after the user explicitly approves the content.

Do not treat architecture memory as automatic enforcement. Do not use it to override approved PRD content, ADRs, role definitions, repository conventions, or current user decisions.

## Required starting condition

The PRD must contain:

```text
**Status:** Approved
```

The solution exploration must contain:

```text
**Status:** Approved
```

If either condition is missing, the current planning command must produce:

```text
BLOCK
- PRD is not approved
- Solution exploration is not approved
```

Only include the blocking item that applies.

## Architecture file creation

If `ARCH.md` does not exist, create it with:

```markdown
# Architecture: <title>

**Status:** Draft

---

## 1. Product feasibility check

**Decision status:** Pending

## 2. Ownership and boundaries

**Decision status:** Pending

## 3. Component design

**Decision status:** Pending

## 4. Feasibility confirmations

**Decision status:** Pending

## 5. Product impact notes

No product-impact changes identified.

## 6. Task generation consequences

**Decision status:** Pending
```

## Product-impact loop-back rule

While drafting architecture, explicitly check whether technical feasibility changes the product direction.

If architecture reveals that the selected product concept should change, the current planning command must produce:

```text
RETURN: solution-exploration
```

If architecture confirms the concept but reveals that PRD requirements, non-goals, success criteria, or architecture questions need revision, the current planning command must produce:

```text
RETURN: prd-drafting
```

If architecture changes no product assumptions, record that in `## 5. Product impact notes`.

Do not treat a loop-back as failure. It is the planning process protecting feasibility.

## Step 0: Confirm product feasibility at architecture depth

Before deciding component ownership, read the approved PRD and approved solution exploration. Check whether the feasibility assumptions captured in solution exploration still look valid at architecture depth.

Ask the user to approve one of these conclusions:

- feasibility is still plausible and architecture drafting can continue
- the product concept needs more solution exploration
- the PRD needs revision, but the product concept remains valid

Stop after this discussion if a loop-back is needed.

## Step 1: Decide top-level architecture ownership

Research the PRD, existing architecture, and relevant architecture memories, then propose ownership options.
The user owns the decision.
A recommendation is not approval.

Do not write component internals yet.
Do not mark an ownership decision approved until the user explicitly approves, rejects, or combines the options.

### Research inputs

Read:

- `prdPath`
- `solutionExplorationPath`
- `docs/architecture/overview.md`
- `docs/architecture/adr/*.md`
- `.riviere/role-enforcement.config.ts`
- relevant approved architecture memories from `projectMemoryArchitectureMemoriesPath`

### What to identify

- new apps, packages, libraries, tools, or modules
- existing apps, packages, libraries, tools, or modules that may change
- responsibilities that need an architectural home
- existing boundaries or ADRs that constrain placement
- approved architecture memories that may inform reasoning, trade-offs, or anti-pattern avoidance

### Required discussion output

For each major responsibility, present placement options:

| Option | Bucket placement | What changes there | Trade-off |
| --- | --- | --- | --- |
| A | `<app/package/tool/module>` | `<responsibility>` | `<cost/benefit>` |
| B | `<app/package/tool/module>` | `<responsibility>` | `<cost/benefit>` |

Then add:

```markdown
Recommendation: <one short reason>
Decision status: Waiting for user approval
```

If there is only one valid bucket, still explain why the other obvious buckets are rejected.

Stop after this discussion. Continue only after the user approves, rejects, or combines the options.

## Step 2: Present component design options

Work with the user to design the software components to implement the new capabilities.

## Task

Generate exactly 3 initial component design options by using fresh `component-design-architect` subagent contexts.

Use `@@component-design-architect`, not `@component-design-architect`.

Reason: `@component-design-architect` continues the same named subagent conversation. `@@component-design-architect` starts a fresh subagent context with the message as its first instruction. Each design option must be produced in a fresh context so the subagent focuses on one design only.

Do not ask one subagent to produce multiple designs.
Do not ask the main agent to produce the designs itself.
Do not ask the main agent to aggregate, rewrite, or paraphrase subagent designs.
Do not reuse the full transcript from a previous component-design subagent as context for the next one.
Do not make the main agent the review or synthesis bottleneck for the full option bodies.

The file is the source of truth. Each `component-design-architect` subagent must write its own option directly to `architecturePath` and then report back when done. This is mandatory.

The main agent orchestrates only. It must not load all three full option bodies into context to summarise, compare, validate, or rewrite them.

### Shared design brief

Before invoking subagents, prepare a concise shared design brief from:

- `prdPath`
- `solutionExplorationPath`
- approved product feasibility conclusion
- approved ownership and boundary decision
- relevant architecture memories
- relevant ADRs and architecture constraints
- the actual target package, module, or feature boundary
- hard non-negotiable constraints already approved with the user

The shared design brief must include only facts and approved decisions. Do not invent constraints to steer the subagent toward a preferred design.

### Architecture file option scaffold

Before invoking component-design subagents, ensure `architecturePath` exists and contains this scaffold under `## 3. Component design`:

```markdown
### Design Options: <Feature Name>

<!-- component-design-option-1:start -->
#### Option 1: Pending
<!-- component-design-option-1:end -->

<!-- component-design-option-2:start -->
#### Option 2: Pending
<!-- component-design-option-2:end -->

<!-- component-design-option-3:start -->
#### Option 3: Pending
<!-- component-design-option-3:end -->

#### Approval

Options have been written to this file. Which option should be approved, rejected, or combined?
```

The scaffold is the final review location after option drafts have been reviewed and mechanically merged. Do not fill option content from the main agent.

Each option must first be written by its corresponding fresh `component-design-architect` subagent into a separate sibling draft file:

- `docs/project/PRD/<planningId>/component-design-option-1.md`
- `docs/project/PRD/<planningId>/component-design-option-2.md`
- `docs/project/PRD/<planningId>/component-design-option-3.md`

Each draft file must contain only that option's assigned marker block:

```markdown
<!-- component-design-option-<n>:start -->
#### Option <n>: Pending
<!-- component-design-option-<n>:end -->
```

Each option subagent must replace only its assigned marker block in its assigned draft file.

After each option reaches its review limit, mechanically merge that option's assigned marker block from its draft file into the matching marker block in `architecturePath`. This merge is a file operation only. The main agent must not summarise, rewrite, compare, or improve the option body while merging.

The subagent must not edit other option draft files, `architecturePath`, the approval question, the PRD, or production files.

The main agent may create the final scaffold and the three draft-file scaffolds, but must not write option content inside the marker blocks.

### Fresh subagent parallel run

Invoke three fresh `component-design-architect` subagents in parallel.

Reason: later option agents must not be anchored by earlier designs. The previous sequential process caused later agents to copy or lightly mutate the first design rather than challenge it. The three option agents must start from the same approved brief independently.

For each design agent:

- invoke `@@component-design-architect`
- pass the same shared design brief
- pass the assigned option draft file path as the file to write
- pass the assigned marker
- ask for one component design
- instruct the subagent to write its option directly into its assigned draft file inside the assigned marker block and report back when done
- explicitly instruct the subagent not to read the other option draft files or other option marker blocks in `architecturePath`

Assignments:

1. First design:
   - pass `docs/project/PRD/<planningId>/component-design-option-1.md`
   - assign marker `component-design-option-1`
2. Second design:
   - pass `docs/project/PRD/<planningId>/component-design-option-2.md`
   - assign marker `component-design-option-2`
3. Third design:
   - pass `docs/project/PRD/<planningId>/component-design-option-3.md`
   - assign marker `component-design-option-3`

Do not pass main-agent summaries of previous options.

Do not instruct Option 2 or Option 3 to read previous options for contrast. Do not paste previous option text into their prompts.

The design agents may complete in any order. Review and correction for each option may proceed independently after that option's subagent reports done.

### Subagent completion report

Each `component-design-architect` subagent must return only a concise completion report after writing its option to `architecturePath`:

```text
DONE
- option: <1|2|3>
- marker: component-design-option-<n>
- draft-file: <path written>
- heading: <exact option heading written>
- validation: <pass or open decisions present; Mermaid and runtime outline format checks must pass>
```

The subagent must not return the full option body in chat. The file is the source of truth.

### After subagent results

After each fresh subagent returns, keep the returned task/session id for that option. Correction feedback must resume that same task/session.

Then invoke a fresh `component-design-review` subagent to review only the assigned marker block in that option's draft file. Pass the option draft file path, the assigned marker, the approved PRD path, the approved solution exploration path, and the approved architecture feasibility and ownership context. The review subagent must return JSON with `verdict`, `summary`, and `findings`.

The main agent must not verify the option. It must not run marker checks, Mermaid checks, aggregate-call checks, semantic checks, grep/read validation, or design-quality judgement. All checking belongs to `component-design-review`.

If `component-design-review` returns `FAIL`, resume the same `component-design-architect` task/session that produced that option and send the review JSON findings back to it. Instruct it to correct its design in place by replacing only the same assigned marker block. Then invoke `component-design-review` again. Repeat until the option passes or same-agent correction is unavailable.

Stop after 2 review rounds. Accept the current state of the design after a maximum 2 reviews. We can't allow the process to spin in an infinite loop and 3 rounds of feedback should be more than enough. These designs don't need to be perfect, they need to be solid with no glarring flaws.

If the original `component-design-architect` task/session cannot be resumed after review failure, block and report that same-agent correction is unavailable. Do not replace the failed option with a fresh design agent.

Do not summarise, compare, fix, verify, or rewrite the option body from the main agent. The main agent orchestrates only. The persisted option body in `architecturePath` is reviewed by `component-design-review` only.

After all three options are written, independently reviewed, and mechanically merged into `architecturePath`:

1. Do not load all option bodies into the main-agent context.
2. Do not independently compare or summarise the options.
3. Use the subagent completion reports only to confirm each option was written to its assigned draft file and merged into its assigned final marker block.
4. Tell the user the three options have been written to `architecturePath`.
5. Ask the user whether they want to review the file directly, approve an option, reject an option, or ask for a combination.

If fresh `@@component-design-architect` invocation is unavailable, stop and produce:

```text
BLOCK
- Fresh component-design-architect context is unavailable
```

Options must be as unique as possible.

Example criteria for identifying unique options:

1. number of components => all of the code in 1 monolithic script vs breaking each fine-grained responsibility into its own component
2. size of components
3. touching existing code vs adding new code
4. introducing dependencies
5. coupling vs cohesion
6. DDD vs non-DDD

If two options have the same components with the same responsibilities, they are not unique.

## Component Naming Guidelines

All components must have names that comply with the following guidelines.

### Intention Revealing

A name must describe as clearly and precisely as possible what the thing is and does.

Good examples:

- `async-file-reader`
- `date-selector`
- `tax-calculator`

Bad examples:

- `data-manager`: what kind of data? how does it manage the data? The name tells us almost nothing here.
- `orders-service`: it does something related to orders but we don't know what. It is easy to dump multiple unrelated things into this, like domain logic and external service calls.

### Domain-driven

A name should use established domain terminology wherever possible and should not invent new words and phrases that do not exist in the domain.

### Compound noun phrases

Use this pattern as the default: `[Domain Object][Business Action][Role Noun]`.

Example: `InvoicePaymentCollector`

- `Invoice` = domain object
- `Payment` = business object/action target
- `Collector` = role noun / responsibility noun

### Forbidden terms

The following should be avoided unless truly necessary and reflective of the business domain:

- `util`
- `helper`
- `manager`
- `service`

If one of these words appears, first look for a more precise alternative.

### General guidelines

1. **Maximum file size is 400 lines**, enforced by lint rules. A component must be decomposed into multiple smaller components when it reaches this limit.

## Role option design

Use this section after component design options exist and before choosing the final architecture option.

Purpose: identify possible `.riviere` roles for each proposed new code element, surface tangled responsibilities early, and discuss role choices before implementation starts.

Do not run `plan-review.md` here. `plan-review.md` reviews an already chosen plan and produces an annex. This section is earlier: it supports discussion while component options are still being designed.

### Role context to read

Read `.riviere/role-selection-guide.md` first. Use it as the primary classification guide.

Then read:

- `.riviere/role-enforcement.config.ts`
- `.riviere/roles.ts`
- `.riviere/role-definitions/index.md`
- every role definition file in `.riviere/role-definitions/*.md`
- `.riviere/canonical-role-configurations.md`

### What to classify

For each component design option, list every proposed new or changed:

- class
- function
- interface
- type alias

Include existing components when the option changes their responsibility.

### Role option process

For each proposed code element, start with the flow questions from `.riviere/role-selection-guide.md`:

1. At what point in the end-to-end flow is this code used?
2. What is the result of this code used for immediately afterward?
3. Is this code actually interacting with an external system, or only helping another component decide how to do so?

Use those answers to identify role candidates before reading detailed role definitions.

Then:

1. identify the package and sublocation where the element would live
2. check whether that package is listed in `.riviere/role-enforcement.config.ts`
3. identify which roles are allowed in that sublocation
4. filter candidate roles by declaration kind using `.riviere/roles.ts`
5. read the matching role definitions and compare behavioral contracts
6. use `.riviere/canonical-role-configurations.md` to check whether the option follows an existing role pattern
7. propose multiple candidate roles where more than one role fits
8. mark one preferred role with a short reason
9. identify any element that does not fit existing roles

Do not force-fit unclear code into the closest role.
First check whether the design is missing a concept, especially an aggregate repository.

Any aggregate classification requires explicit user approval.
If uncertain whether something is an aggregate or a query model, ask the user. Do not default to aggregate.

### Tangled responsibility checks

For each component option, flag tangled components when:

- one element mixes entrypoint, orchestration, domain logic, persistence, external-client access, or presentation
- a component would need two unrelated `.riviere` roles
- a domain element exists only to map results into a consumer API such as CLI output, status updates, or builder writes
- a command use case uses a query model or query-model loader to execute write behaviour
- a write operation is modelled through read-side/query components instead of aggregate/repository components
- a use case depends on another use case
- a repository depends on another repository
- an entrypoint directly imports persistence
- domain code imports infrastructure or external libraries

For each tangled component, propose one of:

- split into smaller components
- move behavior to an existing component
- move the component to a different sublocation
- return to top-level ownership discussion if the approved owner no longer fits

### Required role discussion output

Add this section under each component design option that touches a `.riviere` enforced package:

```markdown
### .riviere role options

| Element | Kind | Sublocation | Candidate roles | Preferred role | Reason | Open decision |
| --- | --- | --- | --- | --- | --- | --- |
| `<name>` | class/function/interface/type alias | `<path>` | `<role A>`, `<role B>` | `<role>` | `<short reason>` | `<decision or none>` |

### Canonical role pattern

Pattern: `<name from .riviere/canonical-role-configurations.md>`

If no pattern fits, write:

Pattern: `None — new or non-canonical pattern`
Reason: `<why existing patterns do not fit>`

### Tangled responsibility findings

- `<finding and proposed split/move>`

If none, write:

No tangled responsibilities identified.
```

If a component option touches no `.riviere` enforced package, write:

```text
No .riviere-enforced package is touched by this option.
```

### Blocking role decisions

Stop and discuss with the user if any of these appear:

- a new role may be required
- a new aggregate may be required
- no canonical role configuration fits
- a component has tangled responsibilities that change the component design
- a preferred role would violate sublocation or forbidden dependency rules

Do not continue to architecture approval until these decisions are resolved.

## Output Format

Use the `component-design-architect` output format for each option.

Do not rewrite or expand subagent designs into a different structure.
Do not remove the subagent's code stress test section.
Do not merge the three designs into one option.
Do not reconstruct the options from subagent chat responses.

The persisted content in `architecturePath` is the authoritative output.
The main agent must never paste, summarise, paraphrase, rewrite, or otherwise transform option bodies anywhere. The option bodies are reviewed in `architecturePath` only.

The component design section in `architecturePath` must use this shape:

```markdown
### Design Options: <Feature Name>

<!-- component-design-option-1:start -->
#### Option 1: <name written by first subagent>

<first subagent design written directly by first subagent>
<!-- component-design-option-1:end -->

<!-- component-design-option-2:start -->
#### Option 2: <name written by second subagent>

<second subagent design written directly by second subagent>
<!-- component-design-option-2:end -->

<!-- component-design-option-3:start -->
#### Option 3: <name written by third subagent>

<third subagent design written directly by third subagent>
<!-- component-design-option-3:end -->

#### Approval

Options have been written to this file. Which option should be approved, rejected, or combined?
```

Before invoking each subagent, include the Component Naming Guidelines, ADR-002 layering constraints, `.riviere` role constraints, and the approved ownership boundary in that subagent's prompt.

The subagent that writes an option is responsible for applying those constraints before writing.

The main agent must not perform a full semantic review of all written option bodies. If deeper review is needed, invoke a fresh specialist review subagent against `architecturePath` and the relevant marker block rather than loading all option bodies into the main-agent context.

## Draft approval and completion

After the user approves, rejects, or combines the architecture options into one architecture direction, update `ARCH.md` with:

```markdown
# Architecture: <title>

**Status:** Awaiting Architecture Approval

---

## 1. Product feasibility check

<approved feasibility conclusion, including whether the PRD remains valid>

## 2. Ownership and boundaries

<approved ownership and boundary decisions>

## 3. Component design

<approved component design, diagrams, role options, and rejected alternatives>

## 4. Feasibility confirmations

<technical feasibility confirmations and unresolved technical risks, if any>

## 5. Product impact notes

<"No product-impact changes identified." or explicit note that caused a RETURN outcome>

## 6. Task generation consequences

<explicit consequences that delivery planning and task creation must carry forward>
```

Then ask whether the architecture draft is ready for approval review.

If the user approves the draft for approval review, the current planning command must produce:

```text
ADVANCE: architecture-approval
```

## Completion rule

This stage is complete only when all of these are true:

1. `ARCH.md` exists
2. it contains `**Status:** Awaiting Architecture Approval`
3. product feasibility has been checked at architecture depth
4. ownership and boundary decisions are approved
5. component design decisions are approved
6. rejected options are explicitly identified
7. `.riviere` role decisions are resolved where relevant
8. product-impact notes are explicit
9. task generation consequences are explicit
10. no `[NEEDS CLARIFICATION]` markers remain

If complete, produce:

```text
ADVANCE: architecture-approval
```

Otherwise produce a conversational architecture decision question, loop-back recommendation, or draft approval request and internally treat the stage as blocked.
