# Plan Review Skill

Review a proposed implementation plan and produce an architectural annex that maps proposed new code to roles and locations defined in `.riviere/role-enforcement.config.ts`. Use BEFORE implementation starts, while the plan can still change cheaply.

## Usage

```text
Read this file and follow the workflow with the plan supplied by the user.
Inputs: a plan file path, a GitHub issue number/URL, or an inline plan pasted into the conversation.
```

## When to Use

Use this skill when:

- You have a written implementation plan, PRD section, task body, or GitHub issue that proposes new code.
- The new code is likely to touch packages listed in `packages` in `.riviere/role-enforcement.config.ts`.
- You want a directional architectural map, not a final classification.

Do NOT use this skill for:

- Classifying EXISTING unannotated code — use `role-enforcement.md` (analyze/add workflows).
- Resolving a role enforcement violation in existing code — use `deep-analysis.md`.
- After implementation is complete — oxlint enforces roles automatically at that point.

## Core Principles

1. **Directional, not definitive.** The plan will evolve during TDD. This skill gives the implementer a starting map, not a final answer. Always remind the implementer that things will move and role assignments may change.
2. **Fit existing roles first.** Same principle as `role-enforcement.md`: generic over specific. Only flag a gap when no existing role genuinely fits.
3. **Gap-finding is the main value.** The biggest payoff is surfacing proposed code that doesn't fit existing conventions BEFORE it's written. Call gaps out loudly.
4. **Never silently propose a new role.** New roles require explicit user approval. Flag them as proposals, not decisions.
5. **Aggregates always require user approval.** Per `.riviere/role-selection-guide.md`, every aggregate must be listed in `approvedInstances` in `.riviere/roles.ts` with `userHasApproved: true`. If the plan proposes what looks like an aggregate, flag it for explicit user approval — do not assume.
6. **Respect forbidden-import rules.** If the plan proposes code in a location that would violate `forbiddenImports` in the config, flag it immediately.
7. **Remind, don't dictate.** The output always reminds the implementer to re-consult the enforcement config as code solidifies.

## Step 1: Load Context

Before reviewing the plan, read the full role enforcement context:

1. **`.riviere/role-enforcement.config.ts`** — learn:
   - `packages` — the list of enforced package paths
   - `locations` — each location's allowed roles, sublocations, and `forbiddenImports`
   - `ignorePatterns`
2. **`.riviere/roles.ts`** — the full role catalog with `targets`, `allowedInputs`, `allowedOutputs`, `forbiddenDependencies`, `minPublicMethods`, `maxPublicMethods`, `nameMatches`, and `approvedInstances`.
3. **`.riviere/role-selection-guide.md`** — the classification decision process and the aggregate-approval rule.
4. **`.riviere/role-definitions/index.md`** — project-level architecture resources. Follow links when relevant.
5. **`.riviere/canonical-role-configurations.md`** — canonical patterns the implementer's result must match. Use these to recognize which pattern the plan falls under.
6. **Role definition files** (`.riviere/role-definitions/<role-name>.md`) — read only for roles that look like candidates for elements in the plan. Do not read the entire catalog.

## Step 2: Load the Plan

Accept the plan from the user via one of:

- A path to a plan document (e.g. `docs/project/PRD/active/X.md`, a task body file, a markdown file).
- A GitHub issue number or URL — fetch with `gh issue view <n> --json body -q '.body'`.
- An inline plan pasted into the conversation.

If the user did not supply a plan, ask for one. Do not guess.

## Step 3: Identify Affected Enforced Packages

From the plan, identify every package that will gain new code. Cross-reference each against the `packages` list in the config.

- **If no enforced packages are touched:** say so clearly, note which unenforced packages are affected, and stop. No annex is needed.
- **If one or more enforced packages are touched:** list them and note, for each, the relevant locations and allowed roles from the config.

## Step 4: Extract Proposed New Code Elements

Walk the plan and list every proposed new:

- Class
- Function
- Interface
- Type alias

For each, record the level of abstraction the plan uses. If the plan is vague ("add a post-processing step"), keep that level — do not invent specifics the plan did not commit to.

## Step 5: Assign Directional Roles and Locations

For each proposed element:

1. **Ask the flow question** from `.riviere/role-selection-guide.md`: at what point in the end-to-end flow is this code used? What is the result used for immediately afterward? Is this code actually interacting with an external system, or only helping another component decide how to?
2. **Filter by target type.** Keep only roles whose `targets` include the element's declaration type.
3. **Check `nameMatches` patterns.** If the element's proposed name matches a role's pattern (e.g. `.*Input$` → `command-use-case-input`), that is a strong signal.
4. **Read the candidate role definition** in `.riviere/role-definitions/<role-name>.md` and check the behavioral contract against what the plan says the element does.
5. **Propose a location** by matching against the `locations` in the config. Use sublocation paths like `src/features/<feature>/commands/` — but use the feature name from the plan, not a guessed one.
6. **Record confidence:**
   - **HIGH** — single clear match; target + flow + name all point to one role.
   - **MEDIUM** — two candidates, one stronger; or clear behavior but ambiguous location.
   - **LOW** — genuinely ambiguous; multiple roles could apply; plan lacks detail.

If an element has no natural fit:

- Do NOT force-fit into the closest-looking role.
- Add it to the Gaps section in Step 7 output.

## Step 6: Detect Structural Concerns

Review the plan for plan-level signals of architectural problems:

- **Mixed responsibilities in a single proposed element.** E.g. "a class that calls an HTTP service and also orchestrates domain logic and persists state." Propose splitting.
- **Missing aggregate-repository concept.** The plan loads state without naming a repository, or loads via a free function directly from a database driver.
- **Unapproved aggregate.** The plan proposes something that sounds like an aggregate (holds state, enforces invariants via state-modifying methods) without an explicit user-approval line. Flag for approval.
- **Wrong-layer code.** The plan proposes code in `entrypoint/` that imports `infra/persistence/`, or code in `domain/` that imports an external library — would violate `forbiddenImports`.
- **Cross-role coupling.** The plan proposes a `command-use-case` that depends on another `command-use-case` — forbidden by the role's `forbiddenDependencies`.
- **Repository calling another repository.** Same pattern — forbidden.
- **`cli-entrypoint` importing `aggregate-repository` directly.** Per `role-selection-guide.md` Section 2, only `command-use-case` should depend on `aggregate-repository`.

## Step 7: Produce the Architectural Annex

Output a markdown block the user can paste into the plan document or issue body. Exact structure:

```markdown
## Architectural Annex (from `/arch-plan`)

> Directional only — the plan will evolve during TDD. Re-consult `.riviere/role-enforcement.config.ts` as the code takes shape. Role enforcement is verified by oxlint at lint time; this annex surfaces architectural decisions upfront so they do not ambush the implementer mid-build.

### Affected Enforced Packages

| Package | Feature(s) | Relevant Sublocations |
|---------|------------|-----------------------|
| `packages/<name>` | `<feature>` | `src/features/<feature>/commands/`, `src/features/<feature>/domain/`, ... |

### Applicable Canonical Configuration

**Pattern:** <name from `.riviere/canonical-role-configurations.md`, or "None — new pattern">

<If "None — new pattern", describe the concern: why no existing canonical configuration fits, and what the implementer will need to validate with the user before implementation.>

### Proposed Roles and Locations

| Proposed Element | Kind | Role | Sublocation | Confidence | Notes |
|------------------|------|------|-------------|------------|-------|
| `FooUseCase` | class | `command-use-case` | `src/features/foo/commands/` | HIGH | Single public method `apply(...)`; input `FooInput` → result `FooResult`. |
| `buildX` | function | `domain-service` | `src/features/foo/domain/` | MEDIUM | Pure transformation; could also be inlined into the use case if only used once. |
| ... | | | | | |

### Gaps — Proposed Code With No Fitting Role

| Element | What It Does | Why No Existing Role Fits | Suggested Action |
|---------|--------------|---------------------------|------------------|
| `<name>` | <brief> | <which role targets were checked and why none match> | Propose new role `<name>` (**requires user approval**) OR refactor to split into <roles>. |

If no gaps: state "No gaps — all proposed elements fit existing roles."

### Structural Concerns

- <concern 1: mixed responsibility / missing aggregate / forbidden import / unapproved aggregate / ...>
- <concern 2>

If none: state "No structural concerns identified."

### Reminders for the Implementer

- This annex is directional. The plan will evolve during TDD — role assignments may change as code takes shape.
- Re-consult `.riviere/role-enforcement.config.ts`, `.riviere/roles.ts`, and `.riviere/canonical-role-configurations.md` as proposed elements materialize.
- Any proposed new role must be approved by the user before being added to `.riviere/roles.ts`. Same for any new aggregate — must be added to `approvedInstances` with `userHasApproved: true`.
- Role enforcement is automatically verified at lint time (`pnpm nx lint <package>` or the project-wide role-check task). Treat the oxlint result as the final arbiter, not this annex.
- If a proposed element turns out to need a role that does not exist, stop and get user approval before inventing one.
```

## Step 8: Classify Blockers

Before applying the annex, scan its contents and classify each finding:

**Blocking findings** — require user decision before the annex can be applied:

1. **New role proposed.** Any entry in the Gaps table whose "Suggested Action" is "Propose new role". New roles require explicit user approval per Principle 4.
2. **New aggregate proposed.** Any Proposed Roles row with role `aggregate` whose name is not already in `approvedInstances` in `.riviere/roles.ts` with `userHasApproved: true`. Per Principle 5.
3. **Forbidden-import violation.** Any Structural Concern where the plan would place code in a location whose `forbiddenImports` list would reject an import the plan requires.
4. **Forbidden-dependency violation.** Any Structural Concern where a proposed role's `forbiddenDependencies` would reject a dependency the plan requires (e.g. `command-use-case` → `command-use-case`).
5. **Missing aggregate-repository concept.** Any Structural Concern flagging that the plan loads/persists state without naming a repository.
6. **Changes to existing roles or the enforcement config.** Any finding that would require editing `.riviere/roles.ts`, `.riviere/role-enforcement.config.ts`, or role definition files.

**Non-blocking findings** — directional information that should be auto-applied without user intervention:

- Role + location proposals for each element, regardless of HIGH/MEDIUM/LOW confidence.
- Canonical-configuration identification.
- Reminder block for the implementer.
- "No gaps" / "No structural concerns" results.

## Step 9: Apply or Escalate

**If no blocking findings exist** → auto-apply the annex. Do not ask:

- **GitHub issue input:** fetch the current body with `gh issue view <n> --json body -q '.body' > /tmp/issue-body.md`, append the annex to the file, then `gh issue edit <n> --body-file /tmp/issue-body.md`.
- **File-path input:** append the annex to the file with a single blank line separator.
- **Inline-plan input:** print the annex in the conversation (there is no persistable source). State clearly that there was nowhere to apply it.

Confirm to the user what happened in one line: "Annex appended to issue #272" or "Annex appended to `docs/.../plan.md`" or "Annex printed below (no source to apply to)".

**If one or more blocking findings exist** → do NOT modify any source. Instead:

1. Print the blockers in a numbered list at the top, each tagged with its type (New Role / New Aggregate / Forbidden Import / Forbidden Dependency / Missing Repository / Config Change).
2. For each blocker, state exactly what the user must decide — e.g. "Approve new role `http-client-gateway` (targets: class; used for: outbound HTTP adapters)?" or "Approve aggregate `ExtractionSession`?"
3. Print the rest of the annex below the blockers for context.
4. Stop. Wait for user decisions.
5. After the user resolves blockers, re-run classification (Step 8) and apply (Step 9).

## Non-Goals

- Do not rewrite the plan. The annex is additive — it appends architectural context without changing the plan's proposed behavior.
- Do not assign file paths more specific than the sublocation level. The implementer picks file names as the plan materializes.
- Do not run the oxlint enforcement tool. This skill is pre-implementation.
- Do not create or edit role definition files. If a gap requires a new role, the user approves first, then a separate workflow creates the role definition.
