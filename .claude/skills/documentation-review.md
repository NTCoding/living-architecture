# Documentation Review

Validate documentation changes in `apps/docs/` before submitting.

## When to Run

Before submitting any PR that modifies files in `apps/docs/`.

## How It Works

1. Read `apps/docs/CLAUDE.md` to load the current documentation rules
2. Identify changed docs files: `git diff main --name-only -- apps/docs/`
3. Spawn subagents (one per changed file or group) to independently review against the rules in CLAUDE.md

Each subagent receives:
- The full contents of `apps/docs/CLAUDE.md`
- The file(s) to review
- Instructions to check compliance with every rule in CLAUDE.md and report violations

The subagents determine what to check based on what CLAUDE.md says. This skill does NOT hardcode the rules — CLAUDE.md is the single source of truth.

## Subagent Prompt Template

For each changed `.md` file, spawn a review subagent with this prompt:

```text
You are reviewing documentation changes for compliance.

Read apps/docs/CLAUDE.md — it contains ALL the rules. Check the file below against
every rule in CLAUDE.md. Report violations as a checklist.

File to review: [path]

Also read the glossary at docs/architecture/domain-terminology/contextive/definitions.glossary.yml
and flag any terms not in it.

If the file is in reference/, read apps/docs/reference/extraction-config/predicates.md
as the canonical format example and compare.

Report format:
✅ [rule] — compliant
❌ [rule] — [specific violation and how to fix]
```

For sidebar changes, spawn a separate subagent to check `.vitepress/config.ts` against the sidebar rules in CLAUDE.md.

## Output

Aggregate all subagent reports into a single checklist. Fix all ❌ items before submitting.
