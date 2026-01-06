# Create Tasks

Generate well-formed tasks from PRD deliverables and add them to GitHub.

## Overview

This skill guides creating well-structured engineering tasks with sufficient context for independent implementation. The core principle: **slice work first, then document thoroughly**.

## Essential Requirements

Every task must include 8 sections:
1. **Deliverable** — What the user/stakeholder will see
2. **Context** — Why it matters, with explicit file paths or URLs for referenced documents
3. **Key Decisions and Principles** — Implementation constraints with rationale
4. **Delivers** — Specific outcome in user-facing terms
5. **Acceptance Criteria** — Given-When-Then formatted scenarios
6. **Dependencies** — Prerequisites that must exist first
7. **Related Code** — File paths showing patterns to follow
8. **Verification** — Commands/tests proving completion

**Critical:** You MUST provide the specific file path or URL for any referenced files like a PRD or bug report — don't assume the engineer knows where things are stored.

---

## Pre-Task Validation: Example Mapping

Transform requirements into executable specifications using four card types:

**Story Card:** Single-sentence deliverable statement

**Rules Card:** 3-4 business constraints maximum per task

**Examples Card:** For each rule—happy path, edge cases, error scenarios in Given-When-Then format

**Questions Card:** Surface unknowns; resolve or spike before proceeding

### Systematic Edge Case Review

Examine three dimensions for each rule:

- **Input variations:** null values, boundary conditions, special characters, encoding, length limits
- **State concerns:** concurrent modifications, race conditions, sequence violations, existence checks
- **Error scenarios:** connectivity problems, timeouts, partial failures, authorization issues, rate limits

---

## Task Size Indicators (When to Split)

Stop and restructure if the task exhibits these traits:

- Cannot be titled with a specific action verb
- Exceeds one day's effort
- Requires conjunctions ("and") or enumerates multiple items
- Contains disparate acceptance criterion clusters
- Follows horizontal architecture layers instead of vertical flow
- Uses language like "full implementation" or "complete system"

---

## SPIDR Splitting Framework

Apply when tasks are oversized:

| Category | Division Method | Sample Application |
|----------|-----------------|---------------------|
| **Paths** | User journey branches | Different payment methods |
| **Interfaces** | Platform/UI variations | Web versus mobile implementations |
| **Data** | Content type differences | Image versus document handling |
| **Rules** | Business logic tiers | Basic versus advanced validation |
| **Spikes** | Research-first items | Investigation before development |

---

## Quality Naming Convention

Format: `[M<milestone>-D<deliverable>] [Verb] [Target] [Result/Constraint]`

**Acceptable examples:**
- `[M2-D2.1] Add date range filter to transaction search`
- `[M3-D3.2] Implement detection predicates for TypeScript extraction`
- `[M4-D4.1] Add riviere extract command to CLI`

**Anti-patterns to avoid:**
- Vague phrases like "Build X system"
- Combined work: "X and Y"
- Passive language: "Setup" or "Implement" without specificity

---

## INVEST Evaluation Checklist

Confirm all criteria before task creation:

| Factor | Assessment | Failure Action |
|--------|-----------|----------------|
| **Independence** | Delivers standalone value? | Restructure dependencies |
| **Negotiability** | Scope adjustable with stakeholders? | Define rigid boundaries |
| **Value** | User-facing or stakeholder benefit? | Reframe or spike separately |
| **Estimability** | Confident sizing possible? | Reduce scope |
| **Smallness** | Completable within one day? | Decompose further |
| **Testability** | Concrete acceptance criteria exist? | Write verification examples |

---

## Standard Task Document Format

```markdown
## Deliverable: [User-visible outcome]

### Context
**PRD:** `docs/project/PRD/active/[PRD-filename].md` — [Section reference, e.g., M2 D2.1]

[Origin, relevance, why this matters]

### Key Decisions and Principles
- [Decision/Principle] — [Rationale]

### Delivers
[User-centric result description]

### Acceptance Criteria
- Given [Precondition] When [Action] Then [Result]

### Dependencies
Depends on #X #Y

### Related Code
- `path/to/file` — [Pattern/Implementation reference]

### Verification
[Specific test commands or demonstration steps]
```

---

## Implementation Workflow

1. Read the active PRD from `docs/project/PRD/active/`
2. Map requirements using Example Mapping framework
3. Generate acceptance criteria: happy path plus all edge cases
4. Apply specific, action-oriented naming with `[M#-D#.#]` prefix
5. Validate against INVEST criteria
6. Gather supporting documentation with concrete file references
7. Identify implementation principles from PRD
8. Locate related codebase patterns
9. Define reproducible verification steps
10. Complete using provided template format
11. Perform final checkpoint review

---

## Pre-Finalization Validation

Confirm before task completion:

- **Sizing:** One day maximum effort threshold
- **Naming:** `[M#-D#.#]` + specific verb + target + outcome
- **Architecture:** Vertical slice through all necessary layers
- **Standards:** Passes all six INVEST criteria
- **Documentation:** Engineer can implement without clarification
- **PRD Reference:** Explicit file path included in Context section

---

## Creating Tasks

For each task, run:

```bash
./scripts/create-task.sh "<milestone>" "[M<milestone>-D<deliverable>] <title>" "<body>"
```

- **Milestone** = PRD filename without `PRD-` prefix and `.md` extension
- **Title format:** `[M<milestone>-D<deliverable>] <action-oriented title>`
- **Body:** Full task content following the Standard Task Document Format above

If a task depends on another, include `Depends on #X` in the Dependencies section.

---

**Critical constraint:** If source material references "full implementation," task decomposition is mandatory rather than optional.
