# Destroy PRD

Maximum-detection critique of a PRD to find every issue before AI implementation.

## Usage

```bash
/destroy-prd [path-to-prd]
```

If no path provided, prompt user to select from `docs/project/PRD/`.

## Instructions

Read the target PRD file, then perform the analysis below. Find EVERY flaw that could cause AI implementation to fail or require human intervention.

Do not hold back. Do not prioritize. Find everything.

---

## Analysis Checklist

Work through EVERY section below. Report ALL findings.

### 1. INCOSE Ambiguity Scan

Scan the ENTIRE document and flag EVERY instance of:

**Vague Quantifiers:**
- some, several, many, few, about, approximately, around, nearly

**Subjective Terms:**
- flexible, efficient, adequate, reasonable, appropriate, suitable, proper

**Weasel Adverbs:**
- usually, typically, generally, normally, sufficiently, mostly, often

**Unmeasurable Performance:**
- fast, slow, high, low, optimal, minimal, maximum, quick, responsive

**Escape Clauses (always CRITICAL):**
- "as appropriate", "if necessary", "where possible", "to the extent practical"
- "if practicable", "as needed", "when required", "if applicable"

**Unmeasurable Quality:**
- user-friendly, easy to use, intuitive, robust, scalable, maintainable
- clean, simple, elegant, modern, best practice

**Dangerous Grammar:**
- Passive voice hiding actor: "will be validated", "should be implemented"
- Pronouns without clear antecedent: it, this, that, they, them
- Negation (AI needs positive instructions): "not", "don't", "avoid", "never"
- Universal qualifiers (imprecise): all, any, every, always, never

**Temporal Ambiguity:**
- before, after, eventually, soon, later, once, when, until

For each instance found, report:
- Exact quote
- Line/section location
- Why it's problematic for AI
- Suggested concrete rewrite

### 2. Architectural Integration

**External Dependencies:**
- How does this PRD connect to its listed dependencies? Is the interface/handoff specified?
- What does this PRD receive as input from prior phases? What format?
- What does this PRD produce for dependent phases? What format?
- Are there pipeline architecture questions (one pass vs two? Enrich vs re-extract?)?

**Feature Combinations:**
- Do any features need to work together in ways not explicitly specified?
- Example: If feature A extracts from classes and feature B extracts from methods, how do they combine?
- Are there domain-specific integration patterns the PRD assumes but doesn't explain?

### 3. Logical Consistency

For each milestone and deliverable:
- Are preconditions satisfied by prior deliverables?
- Are there circular dependencies?
- Are there hidden dependencies not listed?
- Does the ordering make sense?

### 4. Implicit Assumptions

Find every statement that assumes knowledge not in the document:
- Domain concepts used but never defined
- Technical decisions referenced but not explained
- Architecture assumed but not specified
- External systems assumed to exist
- File paths or patterns assumed but not stated

### 5. Edge Cases & Error Handling

For each feature/deliverable:
- What happens with empty input?
- What happens with invalid input?
- What happens at boundaries (0, 1, max)?
- What happens when dependencies fail?
- What happens with concurrent access?
- Are error messages specified?
- Are error codes/exit codes specified?

### 6. Success Criteria Validation

For EACH acceptance criterion:
- Can it be verified by running a command? (If not, flag it)
- Could two people disagree on whether it's met? (If yes, flag it)
- Is "reviewed" or "approved" the only verification? (CRITICAL - flag it)
- Is there a specific test or command listed?

### 7. AI Implementation Feasibility

**Context Window Issues:**
- Any task requiring changes to >30 files?
- Phrases like "full implementation" or "complete system"?
- Can each deliverable be completed in isolation?

**Missing Concrete Details:**
For each deliverable, check for:
- [ ] Specific file paths (not just "in the project")
- [ ] Example inputs with expected outputs
- [ ] Verification commands (not just "verify it works")
- [ ] Exact error message text (if errors mentioned)
- [ ] Specific function/class/method names

**Decision Points:**
- Where would AI need to choose between approaches?
- Are design decisions made or left open?
- Are there multiple valid interpretations?

### 8. Completeness Gaps

- What questions would an implementer need to ask?
- What's in "What We're NOT Building" that actually IS needed?
- Are all terms in the glossary or defined inline?
- Are all referenced documents/files actually available?

---

## Output Format

Report ALL findings. Group by checklist section.

For each issue, classify severity:
- 🔴 **Critical** — Blocks implementation entirely or guarantees wrong output
- 🟡 **Medium** — Will cause rework or inconsistent results
- 🟢 **Minor** — Polish issue, unlikely to block

For each issue:

### [Section] Issue: [Brief title] [🔴/🟡/🟢]

**Location:** [Section/line/deliverable reference]

**Problematic text:** "[exact quote]"

**Problem:** [What's wrong]

**AI failure mode:** [How this causes AI to fail: guess wrong / ask question / inconsistent output / blocked]

**Suggested fix:** [Concrete rewrite or addition]

---

## Final Summary

After all sections, provide:

1. **Total issues by section** (counts)
2. **Sections with zero issues** (list them - confirms coverage)
3. **Top 5 most severe issues** (your judgment on what blocks implementation most)
4. **Questions AI would need to ask** — List 5-10 specific questions that should be pre-answered in the PRD. Frame as "Before implementing, I would need to know: ..."
5. **Cross-cutting recommendations** — Suggest 3-5 structural improvements to the PRD (e.g., "Add an X section", "Create a Y diagram", "Consolidate Z terminology")

Do NOT filter issues to seem more manageable. Report everything. The human will prioritize.
