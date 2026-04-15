# Create Tasks

Generate well-formed tasks from PRD deliverables and add them to GitHub.

## The one rule that matters

**A task is a standalone brief.** An engineer who has never read the PRD can open the issue, read it, and build the thing. Everything in this document exists to make that true.

A full worked example is embedded at the bottom of this file as the [Golden Example](#golden-example-context-section). Read it before writing a new ticket. When in doubt about tone, density, or structure, match the Golden Example.

---

## Nine principles every task follows

Every ticket is judged against these nine principles. If a ticket fails one, rewrite it.

### 1. Self-contained

An engineer new to the project can implement the ticket without opening the PRD, the glossary, or asking anyone a question. The PRD link stays (for wider context), but the ticket restates its own requirement in plain English.

- ❌ "Implement §3.2 of the PRD for the Workflow Step Interface."
- ✅ "Add a `WorkflowStepHandler<TConfig>` TypeScript interface with these members: `type`, `configSchemaPath`, `requiredServices`, and `execute(context)`. `execute` takes a `StepContext` (shown below) and returns `Promise<void>`. The PRD reference is §3.2 — that's background reading, not a prerequisite."

### 2. Teach the subject before you ask for work

The first section explains **what the thing is** and **why it matters**, in plain English, with real examples. The reader needs to learn the domain from the ticket itself. A thin "why this matters" paragraph is not enough — Context is the teaching section.

The Context section:

- Introduces the domain concept (what is an Upsert? what is a Workflow Step? what is a Canonical ID?).
- Shows what the system does today in real code or YAML, not abstract prose.
- Names the gap — what breaks, what's missing, what silently goes wrong.
- Shows a before/after snapshot with real payloads, real errors, real log lines.
- Is as long as it needs to be. Several paragraphs and multiple code blocks are normal.

A Context section that's four sentences and no code is almost always a rejection.

See the [Golden Example](#golden-example-context-section) at the bottom of this file for the right density.

### 3. Acceptance criteria are measurable and precise

Every AC can be checked at the moment the ticket closes, using only things the ticket produces. No aspirations, no "works well", no "is clean". If you can't point at a file path, a command, or a specific observable behaviour, it's not an AC.

**Banned summarising phrases.** If an AC contains any of these, it is not an AC — it is a category label. Rewrite it to show the actual output, error, or behaviour:

- "surfaces X", "supports Y", "handles Z"
- "with documented errors", "with the documented format", "with the expected output"
- "per the PRD", "as specified", "as defined in §X", "matching the contract"
- "fail-fast validation", "fails with clear errors" (without showing them)

Every one of these phrases means "I know there's a behaviour here but I haven't written it down". Write it down.

- ❌ "The registry is easy to extend."
- ✅ "Calling `registry.resolve('unknown-type')` throws an `Error` with the message `no handler registered for step type 'unknown-type'`. A test under `packages/riviere-workflow/src/features/workflow-runtime/registry.spec.ts` asserts this."

- ❌ "`riviere workflow validate <workflow-file>` exists and surfaces structural validation, step-config validation, compatibility failures, and runtime-prerequisite failures with documented errors."
- ✅ Break it apart: one AC per failure class, each showing the exact stderr. See #348's "What 'done' looks like" for the shape — one AC for each of the four validation levels, each with the literal stderr block a test asserts byte-for-byte.

### 4. Acceptance criteria describe what you see, not how you build it

AC describes the behaviour someone can observe: the output, the error, the file on disk, the command exit code. Implementation approach lives in "Implementation guidelines", not in AC — unless the PRD §9 architecture section pins the approach as a firm constraint.

- ❌ "Step handlers are resolved through a registry abstraction rather than switch logic."
- ✅ "A new Step type can be registered without changing any file under `src/features/workflow-runtime/core/`. A test proves this by registering a test-only handler from the test file itself."

### 5. Acceptance criteria can be checked today, in this PR

If an AC requires other work to exist first, it belongs in a later ticket — not here. "Passes once the CLI is available" isn't an AC, it's a mis-sliced ticket.

- ❌ "Demo app extraction passes once `riviere workflow run` is available."
- ✅ That AC belongs in a later ticket whose Dependencies section says "depends on #&lt;cli-ticket&gt; being **released to npm**".

### 6. No filler — but depth is mandatory

"Strip bloat" means remove boilerplate. "Testing strategy → Performance: not in scope" is filler; delete it. A section that doesn't apply gets omitted. Headings with "n/a" underneath are noise.

Depth is different from length. A Context section with three paragraphs and two YAML blocks isn't bloated — it's doing the teaching job the ticket exists to do. Cut padding, not substance.

- ❌ "Performance: not in scope for this task." (noise — delete the Performance subsection)
- ❌ "Embedded reasoning: Why: to deliver the value. What: the thing described above. How: implement it." (padding — delete)
- ✅ A dense, example-laden Context of any length.

### 7. Capitalised domain terms are defined

Capitalised domain terms (Workflow, Step, Source of Truth, Canonical ID, Mappings File, Component, Link, Domain, Upsert, noOverwrite, etc.) are either:

- linked to the glossary entry inline the first time they appear, **or**
- defined in a "Glossary" section at the bottom of the ticket if the term isn't in the glossary yet.

The glossary lives at `docs/architecture/domain-terminology/contextive/definitions.glossary.yml`. If you define a term inline, also flag that the glossary needs updating in a follow-up.

### 8. Titles describe the result, not the work

The title is a sentence that says what the ticket delivers, in plain English. Milestone codes (`M1-D1.1`) go on **labels**, not in the title. Someone scanning `gh issue list` should understand what each ticket ships from the title alone.

- ❌ `[M1-D1.1] Package foundation for riviere-workflow`
- ✅ `riviere-workflow package exists with boundary rules and an empty step registry`
- ✅ `riviere-builder supports typed upsert methods so multi-source extraction can build one graph together`

Label format: `milestone:M1-D1.1` and `prd:phase-13-extraction-workflows`.

### 9. Inline, don't defer

If the PRD, an ADR, or any other doc defines the **exact shape** of something this ticket produces — a summary block, an error message, a log event, a YAML schema, a CLI output — the ticket reproduces it **inline**. A reference alone fails the self-contained rule.

A ticket reader implementing the work should never need to open the PRD to find the format of what they're building. "See §3.9.3 for the summary block" is a failure. "Here is the summary block, byte-for-byte — see §3.9.3 for the design rationale" is correct.

This applies to:

- Error messages and stderr output (reproduce the literal string).
- Log event shapes (reproduce the JSON, including field order if it matters).
- CLI summary/help output (reproduce the exact multi-line block).
- YAML / JSON schema contracts (reproduce the relevant schema excerpt).
- API signatures and return shapes (reproduce the TypeScript interface).
- File formats the ticket writes (reproduce a real example file).

**Bad — defers to PRD:**

> `workflow run` prints the workflow summary block from PRD §3.9.3 with per-step durations, counters, output path, and log path.

**Good — inlines the exact block, then references PRD for rationale:**

> `workflow run` prints the block below to stdout on success, byte-for-byte (a golden-output test normalises the time tokens and asserts the rest). Design rationale: PRD §3.9.3.
>
> ```text
> Workflow 'ecommerce-architecture' completed in 47.2s
>   extract-orders         2.1s    imported 18 components, 24 links
>   …
>   Output: ./.riviere/architecture.json
>   Log:    ./.riviere/workflow.log.ndjson
> ```

If the ticket can't reproduce the format because the PRD itself doesn't pin it, the PRD is under-specified — stop and escalate (see "When the PRD isn't detailed enough").

---

## Concrete examples are mandatory

Words are not enough. An engineer cannot learn what to build from prose alone. Every ticket that touches config, YAML, code signatures, CLI commands, or data shapes **must** show real examples inline.

### What "real" means

- **YAML blocks** with real field names, real values, real indentation. Not `field: <value>`.
- **TypeScript signatures** with real types, real generics, real parameter names. Not "a function that takes a config".
- **CLI invocations** with the flags and the expected stdout / stderr. Not "the command runs and succeeds".
- **Before / after payloads** for any transformation — JSON in, JSON out, side by side.
- **Expected log lines** for any runtime behaviour — the actual string, not "a log event is emitted".

### The reference for density

The [Golden Example](#golden-example-context-section) at the bottom of this file shows the density expected of a non-trivial ticket: a Context that teaches the domain, shows the existing API, shows what fails today, shows the new behaviour, and shows concrete before/after payloads. If you can't produce examples at that density, you don't understand the ticket well enough to write it. Go back to the PRD and the architecture annex.

### Where examples go

- **Context / What this ticket is about** — a full before/after of what the system does today vs. what it does after this ticket ships. Multiple code blocks are normal.
- **What "done" looks like (AC)** — the exact error message, the exact file path, the exact command output, the exact warning payload shape.
- **Implementation guidelines** — TypeScript signatures, YAML shapes, sample payloads.
- **How to verify** — the exact commands to run and the exact output expected.

### CLI tickets — extra requirements

If the ticket ships a command, subcommand, or flag, it **must** include all of:

1. **The exact invocation.** `riviere workflow run ./path/to/workflow.yaml --skip-ai` — not "running the command".
2. **The exact success output** on stdout, as a fenced code block. Include every line the user will see. If the output is non-trivial (a summary block, a report), golden-output test against a fixture.
3. **The exact failure output** on stderr, one block **per error class** the ticket promises to produce. A single bullet covering "four validation levels" is a failure — split it into four separate blocks, one per level.
4. **The exact exit codes.** `0` for success, `1` for failure; if any other exit code is used (`2` for usage error, `3` for something-specific), name it and the condition.
5. **What's written to disk**, if anything, including the path and whether it's created/overwritten on failure.
6. **Flag matrix**, if the command has flags. For every flag, the behaviour shown concretely. `--skip-ai`: skips AI steps entirely, omits them from the summary, does not require the AI CLI on `PATH`. `--dry-run`: prints the would-be prompt for AI steps to stdout, skips the invocation, shows `would-send` in the summary row. Each must have its own AC bullet with an example block, not a prose description.

A CLI ticket without these is not ready. See #348's "Concrete: what `workflow validate` prints" and "Concrete: what `workflow run` prints" sections for the expected shape.

---

## Required sections

Every task has these sections. Omit a section only when the rules above allow it. Do not add sections that have nothing to say.

1. **Milestone + PRD reference** — one or two lines at the top: PRD filename, milestone code, section numbers.
2. **What this ticket is about (Context)** — full teaching of the subject. Teaches the domain, shows current state, names the gap, shows a concrete before/after. No word-count cap. (Principle 2.)
3. **What "done" looks like (Acceptance criteria)** — bullets. Each one observable, measurable, checkable at close. Inline code for exact strings, file paths, command output. (Principles 3, 4, 5.)
4. **Edge cases** — condition → expected behaviour. Kept separate from the happy-path AC.
5. **Implementation guidelines** — where the code goes, firm vs. flexible decisions (cite PRD §9), public API shape, existing patterns to reuse, role enforcement notes.
6. **Testing strategy** — what to unit-test / integration-test / edge-case-test. Omit a level if it doesn't apply. Don't write "not in scope". (Principle 6.)
7. **Dependencies** — other issues this depends on, each with a one-line reason. If a dependency must be **released** (not just merged), say so explicitly. Omit the whole section if there are no dependencies.
8. **How to verify** — exact commands + expected output. Spot-check steps where useful.
9. **Out of scope** — explicit list. Prevents review drift.
10. **Glossary** — every capitalised domain term with a link to the glossary entry or an inline definition. (Principle 7.)

`Embedded reasoning` (why / what / how) is only included when Context and Implementation guidelines don't already cover it. If they do, omit it — it's padding.

---

## Standard task body format

Match this structure. Tone: plain English. No buzzwords. No padding.

````markdown
**Milestone:** <PRD title> — M<x> (D<x.x>)
**PRD:** `docs/project/PRD/active/<PRD-filename>.md` §<section-refs>

---

## What this ticket is about

<Teach the subject. What the domain concept is. How the system behaves
today (show it with real code/YAML, not prose). The gap this ticket
closes. A concrete before/after with real payloads, real errors, real
log lines. Multiple paragraphs and code blocks are normal.>

<See the Golden Example at the bottom of create-tasks.md for the right
density.>

---

## What "done" looks like

<Every bullet below is checkable at ticket close using only artifacts
this ticket produces.>

### <subsection, e.g. "Typed upsert methods on RiviereBuilder">

- <AC with real signatures / real messages / real file paths>
- <AC>

### <subsection>

- <AC>

- A mergeable PR is ready for user review via `/complete-task`.

---

## Edge cases

- <Condition> → <Expected behaviour>
- <Condition> → <Expected behaviour>

---

## Implementation guidelines

### Where the code lives

<Real package paths, real file names, which existing collaborators to
extend.>

### Public surface

<Exports and their types.>

### Firm constraints (from PRD §9)

- <firm constraint>
- <firm constraint>

### Flexible decisions

- <thing the implementer may iterate on>

### Role enforcement

<If the package is role-enforced, list expected roles for new elements
and point at .riviere/role-enforcement.config.ts.>

---

## Testing strategy

### Unit

- <what to test>

### Integration

- <what to test>

### Edge cases

- <what to test>

<Omit any subsection that doesn't apply. Don't write "not in scope".>

---

## Dependencies

- Depends on #<N>: <one-line reason>
- Depends on #<N> being **released to npm** (not just merged): <reason>

<Omit this section if there are no dependencies.>

---

## How to verify

```bash
<exact commands>
```

<Expected output / pass criteria / spot-check snippet.>

---

## Out of scope

- <thing that's explicitly not in this ticket>
- <thing>

---

## Glossary

- **<Term>** — <link to glossary entry OR inline definition>
- **<Term>** — <link or inline>
````

After the ticket is created, `plan-review` appends an **Architectural Annex** section automatically (see workflow step 14). Do not write the annex by hand.

---

## When the PRD isn't detailed enough

If you cannot fill every required section with concrete detail, **stop**. Don't create the ticket.

Push back with:

```text
Cannot create ticket '<title>' — PRD detail is insufficient.

Missing information for:
- <Section>: <specific questions that need answers>

Please update the PRD to answer these, then retry ticket creation.
```

Reasons the PRD is insufficient:

- Status is "Awaiting Architecture Review" → run `/arc-prd` first.
- No `Architecture: see §9.X` reference for the deliverable → §9 is incomplete for this area.
- No clear behaviour for a boundary condition → requirements under-specified.
- You cannot produce a concrete YAML / code / output example → the behaviour isn't nailed down.
- Testing strategy is hand-wavy → AC are too vague.

---

## Workflow for creating a task

1. **Read the active PRD** in `docs/project/PRD/active/` and any architecture documents it links to.
2. **Read PRD §9 (Architecture).** This section carries the structural decisions that feed "Implementation guidelines". Read the §9.X subsection referenced by the deliverable you're ticketing.
3. **Read the glossary** at `docs/architecture/domain-terminology/contextive/definitions.glossary.yml`. Note which capitalised terms from the deliverable are already defined and which you'll need to define inline.
4. **Read the [Golden Example](#golden-example-context-section).** Match its density.
5. **Example Mapping.** Map the deliverable into Story / Rules / Examples / Questions. Spike or resolve any blocker questions before drafting the ticket.
6. **Check PRD status is Approved.** If status is "Awaiting Architecture Review", stop and run `/arc-prd` first.
7. **Discover edge cases.** Apply the checklists in `docs/conventions/testing.md`.
8. **Pull architectural context into AC and Implementation guidelines.** Firm vs. flexible markers from PRD §9 become firm-constraint bullets. Structural invariants become AC bullets.
9. **Write the Context section as a teaching.** Real code, real YAML, real before/after. No thin prose. This is where most tickets fail — do not skimp.
10. **Write AC.** Each one observable, measurable, checkable today.
11. **Fill Implementation guidelines, Testing strategy, Dependencies, How to verify, Out of scope, Glossary.** Follow the template.
12. **Apply the nine-principles check.** Walk each one top to bottom. Rewrite until the ticket passes.
13. **Validate against INVEST** (see below).
14. **Create the task.** Run `./scripts/create-task.sh` and capture the returned issue number.
15. **Append the architectural annex via `plan-review` (Opus subagent).** Spawn a subagent with model `opus` and the prompt: "Read `packages/riviere-role-enforcement/skills/plan-review.md` and run its full workflow against GitHub issue #&lt;N&gt;. The skill will write directly to the issue body via `gh issue edit`. Return only the one-line summary from the skill." Relay that one-line summary to the user verbatim. Do not fetch, read, paraphrase, or reformat the annex content yourself — `plan-review` writes it directly to the issue.

---

## Example Mapping (pre-ticket validation)

Four cards per task:

- **Story** — one sentence: what the ticket delivers.
- **Rules** — 3–4 business constraints maximum.
- **Examples** — for each rule: happy path, edge cases, error scenarios in Given / When / Then.
- **Questions** — unknowns. Resolve or spike before drafting the ticket.

### Edge-case discovery

Use these heuristics with the checklists in `docs/conventions/testing.md`:

| Heuristic | What to check |
|-----------|---------------|
| **Count** | 0, 1, Many — empty, single, multiple |
| **Boundary** | min / max, just-inside / just-outside, off-by-one |
| **Types** | null, undefined, empty string, whitespace, special chars, Unicode |
| **State** | concurrent modifications, race conditions, sequence violations |

Edge cases go in the "Edge cases" section as `condition → expected behaviour`.

---

## Task size

**Target:** up to one week of work per ticket. Larger tickets are fine when the work is logically a single unit — fewer PR round-trips, less context switching.

**Split when:**
- The work is bigger than a week.
- Two unrelated concerns are bundled together.
- One part blocks another with a hard dependency.
- The AC bullets form clusters with no logical connection between them.
- The ticket slices by horizontal layer (repo-then-service-then-API) instead of a vertical slice of behaviour.

### SPIDR (use when a ticket is oversized)

| Category | How to split | Example |
|----------|--------------|---------|
| **Paths** | User journey branches | Different payment methods |
| **Interfaces** | Platform or UI variants | Web vs. mobile |
| **Data** | Content-type differences | Image vs. document |
| **Rules** | Business-logic tiers | Basic vs. advanced validation |
| **Spikes** | Research-first items | Investigation before development |

---

## INVEST check

Confirm all six before creating the ticket:

| Factor | Check | If it fails |
|--------|-------|-------------|
| **Independent** | Delivers standalone value? | Restructure dependencies |
| **Negotiable** | Scope adjustable with stakeholders? | Define firm boundaries |
| **Valuable** | User- or stakeholder-facing benefit? | Reframe or spike separately |
| **Estimable** | Confident sizing possible? | Reduce scope |
| **Small** | Finishable within one week? | Decompose further |
| **Testable** | AC describes what you see (not how it's built), every AC is checkable at close using only this ticket's artifacts, AND no AC uses summarising phrases ("surfaces", "supports", "per the PRD") instead of the literal output? | Rewrite AC |

---

## Documentation tasks (tasks that change `apps/docs/`)

If the ticket creates or modifies pages in `apps/docs/`, add this context and these AC.

### Detection — any of these

- Deliverable mentions documentation, docs pages, or reference pages
- Implementation touches files in `apps/docs/`
- PRD deliverable references the docs site

### Extra context to embed

Read `apps/docs/CLAUDE.md` and include:

1. **User journey** — which journey does this page serve? Quote the specific journey from the User Journeys table. If no journey fits, flag it — the page may not belong.
2. **Page format** — which page type (reference, workflow step, overview). Reference the canonical example from CLAUDE.md.
3. **Cross-links** — what pages should link to this page, and what pages should it link to.

### Extra AC

- ✓ Page serves a specific user journey (state which one).
- ✓ Format matches the canonical example for its page type.
- ✓ All terms match `docs/architecture/domain-terminology/contextive/definitions.glossary.yml`.
- ✓ "See also" section has 3–5 cross-links using absolute paths.
- ✓ No manually edited auto-generated files.
- ✓ `/documentation-review` passes with no ❌ items.

### Extra verification

```bash
pnpm nx build docs     # pages render without errors
/documentation-review   # all three review dimensions pass
```

---

## Final checks before creating

- **Size** — fits in a week.
- **Title** — describes the result, no milestone code.
- **Slice** — vertical through all necessary layers.
- **INVEST** — all six pass.
- **Self-contained** — a new engineer can build it from the ticket alone.
- **Concrete examples** — real YAML / TypeScript / CLI output / before-after wherever they apply.
- **No summarising verbs** — no AC contains "surfaces", "supports", "handles", "with documented X", "per the PRD", "as specified", or any variant. (Principle 3.)
- **Inlined, not deferred** — every PRD-defined format (summary blocks, log schemas, error strings, CLI output) is reproduced in the ticket, not linked. (Principle 9.)
- **CLI tickets** — every command/flag has: exact invocation, exact success stdout, exact stderr per error class, exact exit codes, on-disk side effects. (CLI addendum.)
- **PRD reference** — explicit filename + section numbers at the top.
- **Edge cases** — covered, not just the happy path.
- **Glossary** — every capitalised domain term linked or defined inline.
- **Role enforcement** — if the package is enforced, the Implementation guidelines name expected roles and point at the config file.

---

## Creating the ticket

```bash
./scripts/create-task.sh "<milestone>" "<result-first title>" "<body>"
```

- **Milestone** = PRD filename without the `PRD-` prefix and `.md` extension. Becomes the milestone label.
- **Title** = the result-first sentence. No milestone code prefix — that's a label.
- **Body** = the full ticket content in the template above.

For dependencies, say "depends on #&lt;N&gt;" with a one-line reason. If the dependency must be **released to npm** (not just merged), say so explicitly.

---

**One last thing:** a ticket can hold the full implementation of a feature when it fits in a week. Decompose only when the ticket exceeds a week or bundles unrelated concerns. The Golden Example below is a full-feature ticket and still fits. Use it as the pattern.

---

## Golden Example: Context section

The section below is an illustrative "What this ticket is about" section for a non-trivial ticket — in this case, adding typed `upsert*` methods to the `riviere-builder` package so multi-source extraction can build a single graph together. It shows the right density for any ticket of comparable scope: real code blocks, real YAML, real before/after payloads, real error messages. Match this depth.

> ## What this ticket is about
>
> Today, `RiviereBuilder` assumes one extractor writes each Component. Phase 13 changes that: a single graph is built from several extractors (TypeScript code, EventCatalog specs, AsyncAPI specs, AI enrichment) that often name the same thing. When two of them try to add the same Component, the builder needs to **merge them**, not throw.
>
> This ticket gives the builder the exact capability it's missing: seven typed `upsert*` methods that either create a Component or merge fields into the existing one, plus a cooperative `noOverwrite` flag for AI callers that must never clobber values set by a trusted source.
>
> ### The builder today
>
> `RiviereBuilder` exposes seven strict `add*` methods — one per Component type — in `packages/riviere-builder/src/features/building/domain/builder-facade.ts`:
>
> ```typescript
> addUI(input: UIInput): UIComponent
> addApi(input: APIInput): APIComponent
> addUseCase(input: UseCaseInput): UseCaseComponent
> addDomainOp(input: DomainOpInput): DomainOpComponent
> addEvent(input: EventInput): EventComponent
> addEventHandler(input: EventHandlerInput): EventHandlerComponent
> addCustom(input: CustomInput): CustomComponent
> ```
>
> Each one throws `DuplicateComponentError` if the Component ID already exists. Phase 12 also added `enrichComponent(id, enrichment)` which merges a narrow set of fields (`entity`, `signature`, `_missing`), but only for components that already exist. There is no "add-or-merge" method, and the merge semantics that do exist only cover two fields.
>
> ### What goes wrong in Phase 13 without this change
>
> A Phase 13 Workflow composes extractors like this:
>
> ```yaml
> steps:
>   - name: extract-code
>     type: code-extraction
>     config: ./riviere-extract.config.yaml
>
>   - name: import-eventcatalog
>     type: eventcatalog-import
>     config: ./eventcatalog-import.yaml
> ```
>
> Both the code extractor and the EventCatalog importer will independently discover the same canonical Event — for example `OrderPlaced` in domain `orders`, module `checkout`. Both try to add it. The second one crashes:
>
> ```text
> DuplicateComponentError: component 'checkout.orders.event.OrderPlaced' already exists
> ```
>
> The run aborts mid-way, part of the graph is written, the rest is not, and the user sees an error that blames the second extractor even though the real answer is "these two agree that this Component exists, merge their fields".
>
> Add AI on top of that. `ai-enrich` is supposed to **only fill in gaps** — if the code extractor already set `description: "Captures order placement"`, the AI must never overwrite that. Today there is no way to express "write this field only if it's unset".
>
> ### What this ticket changes
>
> Three observable changes, all in `riviere-builder`:
>
> 1. **Seven typed `upsert*` methods.** Same input types as the matching `add*` methods, plus an optional `UpsertOptions` argument. Each returns `{ component, created }` so the caller knows whether a new Component was created or an existing one was merged.
> 2. **A `noOverwrite` flag.** When the caller passes `{ noOverwrite: true }`, already-set scalar fields are preserved. This is the additive-only mode AI steps will use.
> 3. **Observability for merges and dedup.** A real scalar overwrite (last-wins) emits a structured `scalar-overwritten` warning. A duplicate `link()` / `linkExternal()` call emits a `duplicate-link-skipped` warning. These warnings are available on the existing `builder.warnings()` read surface for Workflow logging to consume.
>
> Plus two small cleanups the upsert story depends on:
>
> - `addSource()` and `addDomain()` become idempotent no-ops when the source/domain already exists.
> - Same-ID / different-type collisions throw a new `ComponentTypeMismatchError` (never a silent cast).
>
> ### Before / after — concrete state
>
> **Before ticket, two-step Workflow fails:**
>
> Step 1 (`extract-code`) adds:
>
> ```json
> {
>   "id": "checkout.orders.event.OrderPlaced",
>   "type": "event",
>   "domain": "orders",
>   "module": "checkout",
>   "name": "OrderPlaced",
>   "description": "Captured from OrderPlacedEvent class JSDoc",
>   "signature": "OrderPlaced(orderId, customerId, total)"
> }
> ```
>
> Step 2 (`import-eventcatalog`) calls `addEvent(...)` with the same canonical ID and a richer `description`. Throws `DuplicateComponentError`. Run aborts.
>
> **After ticket, same two-step Workflow merges:**
>
> Step 2 calls `upsertEvent({ ...input, description: "Emitted when a customer completes checkout" })`. Return value:
>
> ```typescript
> { component: EventComponent, created: false }
> ```
>
> Resulting Component in the graph:
>
> ```json
> {
>   "id": "checkout.orders.event.OrderPlaced",
>   "type": "event",
>   "domain": "orders",
>   "module": "checkout",
>   "name": "OrderPlaced",
>   "description": "Emitted when a customer completes checkout",
>   "signature": "OrderPlaced(orderId, customerId, total)"
> }
> ```
>
> The `description` was last-wins overwritten (EventCatalog has higher priority). The `signature` came from code; EventCatalog didn't touch it, so it stays. A `scalar-overwritten` warning fires for the description field.
>
> **After ticket, ai-enrich run preserves existing values:**
>
> Step 3 (`ai-enrich`) calls `upsertEvent({ ...same ID..., description: "AI-proposed description" }, { noOverwrite: true })`. Because `description` is already set, the AI value is dropped. Return value is `{ component, created: false }`. No warning is emitted — `noOverwrite` skips are silent by design.

That's the density. Every ticket about non-trivial behaviour deserves this kind of teaching-first Context.
