# Compare

The Compare view shows differences between two architecture versions.

[Screenshot: Compare view with before/after file upload]

## When to Use Compare

Use Compare to understand what changed between:

- Two points in time (before/after a refactor)
- Two branches (main vs feature branch)
- Two systems (migration planning)

## Loading Graphs

Compare requires two Rivière graph files:

1. **Upload "Before"** — Click the first upload area, select your baseline graph
2. **Upload "After"** — Click the second upload area, select your comparison graph

[Screenshot: Both upload areas with validation checkmarks]

Éclair validates each file before comparison. Invalid files show error details.

## Change Summary

After loading both graphs, a summary shows:

[Screenshot: Change summary with counts]

| Change Type | Description |
|-------------|-------------|
| Added | Components in "After" that don't exist in "Before" |
| Removed | Components in "Before" that don't exist in "After" |
| Modified | Components that exist in both but have changed fields |

Each type is color-coded for quick scanning.

## View Modes

Toggle between two view modes:

### Graph View

[Screenshot: Graph view showing cross-domain connection changes]

Shows domain-to-domain connection changes:

- New connections (added edges)
- Removed connections
- Modified relationships

Useful for understanding architectural impact.

### List View

[Screenshot: List view with detailed component changes]

Shows detailed changes per component:

- Full component name and type
- Domain
- For modified components: which fields changed

**List view filters:**
- **Change type** — Show only Added, Removed, or Modified
- **Domain** — Filter by domain
- **Node type** — Filter by component type

## Understanding Changes

### Added Components

New functionality introduced. Check:
- Are they connected properly?
- Do they follow existing patterns?

### Removed Components

Functionality deleted. Verify:
- Was this intentional?
- Are there orphaned references?

### Modified Components

Existing components changed. Review:
- What fields changed?
- Does the change affect behavior?

## Next Steps

- [Full Graph](./full-graph) — Explore the current architecture
- [Domain Map](./domain-map) — See how domains relate
