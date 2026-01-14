# Create Tasks

Generate well-formed tasks from PRD deliverables and add them to GitHub.

## Overview

This skill guides creating well-structured engineering tasks with sufficient context for independent implementation. The core principle: **slice work first, then document thoroughly with full architectural context**.

## Essential Requirements

Every task must include 10 sections:

1. **Deliverable** — User-visible outcome
2. **Context** — Business/architectural motivation with PRD file path
3. **Traceability** — Links to PRD sections, requirements, success criteria
4. **Acceptance Criteria** — Checkboxes for happy path + key validations
5. **Edge Case Scenarios** — Condition → expected behavior (separate from acceptance criteria)
6. **Implementation Guidelines** — Technical approach, architectural constraints, pattern references
7. **Embedded Reasoning** — Structured why/what/how
8. **Testing Strategy** — Categorized by test type (unit/integration/edge/performance)
9. **Dependencies** — Prerequisites that must exist first
10. **Verification** — Commands/tests proving completion

**Critical:** You MUST provide specific file paths for any referenced documents. The engineer must be able to implement without clarification.

---

## Pre-Task Validation: Example Mapping

Transform requirements into executable specifications using four card types:

**Story Card:** Single-sentence deliverable statement

**Rules Card:** 3-4 business constraints maximum per task

**Examples Card:** For each rule—happy path, edge cases, error scenarios in Given-When-Then format

**Questions Card:** Surface unknowns; resolve or spike before proceeding

### Edge Case Discovery Process

Before finalizing tasks, systematically identify edge case scenarios using the checklists in `docs/conventions/testing.md`.

**Apply Testing Heuristics:**

| Heuristic | What to Check |
|-----------|---------------|
| **Count** | 0, 1, Many — empty collections, single item, multiple items |
| **Boundary** | Min/max values, just before/after limits, off-by-one |
| **Data Types** | null, undefined, empty string, whitespace, special chars, Unicode |
| **State** | Concurrent modifications, race conditions, sequence violations |

**Reference:** See `docs/conventions/testing.md` → "Edge Case Checklists" for comprehensive lists by data type (Numbers, Strings, Collections, Dates, Null/Undefined, Domain-Specific, Violated Domain Constraints).

**Output Format:** Edge Case Scenarios section using condition → expected behavior format.

---

## Task Size Guidelines

**Target size:** Up to one week of effort. Tasks can span multiple deliverables when logically related.

**Why larger tasks?** Claude Code works best with longer autonomous sessions. Larger tasks reduce:
- User interruptions for task transitions
- CodeRabbit review roundtrips (one PR per task vs many small PRs)
- Context switching overhead

**Split when:**
- Scope exceeds one week
- Unrelated concerns are bundled together
- Explicit blocking dependencies exist between parts
- Contains disparate acceptance criterion clusters with no logical connection
- Follows horizontal architecture layers instead of vertical flow

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
| **Smallness** | Completable within one week? | Decompose further |
| **Testability** | Concrete acceptance criteria exist? | Write verification examples |

---

## Standard Task Document Format

```markdown
## Deliverable: [User-visible outcome]

### Context
**PRD:** `docs/project/PRD/active/[PRD-filename].md` — [Section reference, e.g., M2 D2.1]

[Business/architectural motivation - why this task matters]

### Traceability
- **PRD Section:** [e.g., M2-D2-2 "Create default extraction config"]
- **Functional Requirement:** [e.g., FR-003 "Support zero-config extraction"]
- **Success Criteria:** [e.g., SC-002 "Developer can extract without custom config"]

### Acceptance Criteria
- ✓ [Happy path requirement]
- ✓ [Key validation]
- ✓ [Essential behavior]

### Edge Case Scenarios
- [Condition] → [Expected behavior]
- [Condition] → [Expected behavior]
- [Condition] → [Expected behavior]

### Implementation Guidelines
- Use [existing pattern] from `path/to/file`
- Follow [architectural constraint] (see `docs/architecture/[doc].md`)
- Apply [design principle] from `docs/conventions/software-design.md`
- [Technical approach with rationale]

### Embedded Reasoning
**Why:** [Business motivation]
**What:** [Technical solution description]
**How:** [Implementation approach]

### Testing Strategy
- **Unit:** [What to unit test]
- **Integration:** [What to integration test]
- **Edge Cases:** [Specific edge case tests from Edge Case Scenarios]
- **Performance:** [Performance benchmarks if applicable]

### Dependencies
Depends on #X #Y

### Verification
[Specific test commands or demonstration steps]
```

---

## Validation Gate: Push Back When Incomplete

**CRITICAL:** If you cannot complete ALL 10 sections with specific details, STOP.

Do NOT create the task. Instead, push back:

```text
Cannot create task '[task name]' - insufficient detail in PRD.

Missing information for:
- [Section name]: [Specific questions that need answers]

Please update PRD to clarify these points before task creation.
```

**This gate prevents:**
- Half-baked tasks
- Mid-implementation discovery
- Unclear requirements
- Missing edge cases

**Examples of insufficient detail:**
- Cannot fill Implementation Guidelines → Architecture not defined in PRD
- Cannot fill Edge Case Scenarios → Requirements don't clarify behavior for boundary conditions
- Cannot fill Embedded Reasoning → "Why" is unclear
- Cannot fill Testing Strategy → Acceptance criteria too vague

**Action:** Update PRD, then retry task creation.

---

## Implementation Workflow

1. **Read context:** Active PRD from `docs/project/PRD/active/` + architecture docs referenced in PRD
2. **Apply Example Mapping:** Map requirements using Story/Rules/Examples/Questions framework
3. **Validate architecture:** Confirm PRD contains sufficient architectural detail
4. **Discover edge cases:** Apply checklists from `docs/conventions/testing.md`
5. **Embed architectural context:** Extract constraints, patterns, and references from PRD + architecture docs
6. **Structure acceptance criteria:** Happy path as checkboxes (separate from edge cases)
7. **Complete all 10 sections:** Follow Standard Task Document Format
8. **Apply validation gate:** If ANY section incomplete → STOP and push back
9. **Validate against INVEST:** Confirm Independence, Negotiability, Value, Estimability, Smallness, Testability
10. **Create task:** Run `./scripts/create-task.sh` with completed content

---

## Pre-Finalization Validation

Confirm before task completion:

- **Sizing:** One week maximum effort threshold
- **Naming:** `[M#-D#.#]` + specific verb + target + outcome
- **Architecture:** Vertical slice through all necessary layers
- **Standards:** Passes all six INVEST criteria
- **Documentation:** Engineer can implement without clarification
- **PRD Reference:** Explicit file path included in Context section
- **Edge Cases:** Comprehensive scenarios identified (not just happy path)
- **Traceability:** Clear links to PRD sections and requirements

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

**Note:** Tasks can include "full implementation" of a feature if it fits within a one-week scope. Decompose only when scope exceeds one week or contains unrelated concerns.
