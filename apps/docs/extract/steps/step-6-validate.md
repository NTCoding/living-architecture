# Step 6: Validate

## Objective

Check the graph for orphans and schema compliance.

## Prerequisites

- **Do not use plan mode.** Execute directly.
- Graph with enriched components from Step 5.

## Process

**Do not explore the codebase. Run validation commands and handle output.**

## 1. Check Orphans

```bash
riviere builder check-consistency
```

For JSON output:
```bash
riviere builder check-consistency --format json
```

Review ALL orphan components. Orphans are warnings, not errors - but they often indicate missing links.

**Common causes:**
- **Orphan Events**: DomainOp not publishing, or EventHandler not subscribing
- **Orphan EventHandlers**: Event not being published, or event name mismatch
- **Orphan DomainOps**: UseCase not calling the operation
- **Orphan UseCases**: API not invoking the use case

Pay special attention to orphan UseCases and DomainOps - these are not entry points or exit points so it's unusual for them to be orphans.

**For each orphan:**
1. Analyze: why is it orphaned? Is this correct (e.g., external consumer) or a missing link?
2. If missing link detected: update scanning rules in `.riviere/config/component-definitions.md`
3. Rescan: re-run step 3 (extract) and step 4 (link)
4. Repeat until satisfied

A high orphan count (>20%) usually indicates systematic linking failure in step 4.

## 2. Validate Schema

```bash
riviere builder validate
```

Full JSON Schema validation. Fix any errors before proceeding.

## Completion

Present final stats:
- Total components by type
- Total links (sync vs async)
- Domains covered

**Graph extraction complete.**
