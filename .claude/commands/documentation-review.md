# Documentation Review

Validate documentation changes in `apps/docs/` before submitting.

## When to Run

Before submitting any PR that modifies files in `apps/docs/`.

## How It Works

1. Read `apps/docs/CLAUDE.md` — this is the single source of truth for all rules
2. Identify changed docs files: `git diff main --name-only -- apps/docs/`
3. Spawn **parallel subagents by review dimension** (not per-file — each subagent reviews ALL changed files through its lens)

## Subagents

Spawn these subagents in parallel. Each receives the list of ALL changed files, the full description of the current tasks, and reads `apps/docs/CLAUDE.md` for the rules.

### 1. User Journey Review

Checks whether changed pages fit coherently into user journeys.

```text
Read apps/docs/CLAUDE.md for the user journey definitions.
Read apps/docs/.vitepress/config.ts for the sidebar structure.

For ALL changed docs files: [list paths]

Check:
- Which journey does each page serve? If you can't answer "what step is the
  user on and what do they need next?" the page doesn't belong.
- Do new pages have cross-links FROM the workflow page that sends users there
  AND back via See Also?
- Does the sidebar make sense as a navigation path for each journey?
- Are there orphan pages that no journey leads to?
- Do forward links (→) actually move the user forward in their journey?

Report each finding with the specific page and journey affected.
```

### 2. Format Consistency Review

Checks whether pages match the established format for their type.

```text
Read apps/docs/CLAUDE.md for the page format rules.

For ALL changed docs files: [list paths]

For each file, determine its type (reference, workflow step, overview/index)
and compare against the canonical format in CLAUDE.md:
- Reference pages: compare against apps/docs/reference/extraction-config/predicates.md
- Workflow pages: compare against apps/docs/extract/deterministic/typescript/workflow/step-1-understand.md
- Overview pages: compare against apps/docs/extract/index.md

Check: frontmatter, heading structure, table formats, separator usage,
See Also section, code block language tags, callout usage.

Report each deviation with the specific file, line, and what the format should be.
```

### 3. Terminology and Accuracy Review

Checks for invented terms, broken links, and factual errors.

```text
Read apps/docs/CLAUDE.md for terminology rules.
Read docs/architecture/domain-terminology/contextive/definitions.glossary.yml for valid terms.

For ALL changed docs files: [list paths]

Check:
- Flag any terms not in the glossary
- Verify all internal links point to files that exist
- Verify code examples use correct names (e.g., transform names match the
  actual schema: stripSuffix not removeSuffix, pascalToKebab not toKebabCase)
- Check that auto-generated files (apps/docs/reference/api/generated/, apps/docs/reference/cli/cli-reference.md)
  were NOT manually edited

Report each finding with the specific file, term/link, and correction needed.
```

## Output

Aggregate all subagent reports into a single checklist grouped by dimension. Fix all ❌ items before submitting.
