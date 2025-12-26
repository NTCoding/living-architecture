# Flows

The Flows view shows entry points into your system and traces execution paths through components.

[Screenshot: Flows view with entry point list and expanded trace]

## What Are Flows?

A flow traces the path from an entry point (UI route, API endpoint, scheduled job) through all components it invokes. This answers: "What happens when a user clicks this button?" or "What does this API endpoint trigger?"

## Statistics

The top row shows:

| Stat | Description |
|------|-------------|
| Total Flows | Number of entry points traced |
| UI Entries | User interface entry points |
| API Entries | External API endpoints |
| Scheduled Jobs | Cron or timer-triggered flows |

## Entry Point Types

Filter by entry point type:

| Type | Description |
|------|-------------|
| All | Show all entry points |
| UI | User interface routes and actions |
| API | External-facing API endpoints |
| Jobs | Scheduled tasks (Custom components) |

## Flow Cards

Each entry point displays as an expandable card:

[Screenshot: Single flow card collapsed]

**Collapsed view shows:**
- Entry point name
- Type badge (UI, API, Job)
- Domain

**Click to expand and see the trace:**

[Screenshot: Expanded flow card showing trace path]

The trace shows each component invoked, in order:
- Component name and type
- Domain it belongs to
- Events published

## Filtering

- **Type filter** — UI, API, or Jobs
- **Domain filter** — Show flows from specific domains
- **Search** — Find entry points by name

## Understanding Traces

A trace reads top-to-bottom:

```
[Entry Point] → [UseCase] → [DomainOp] → [Entity]
                    ↓
               [Event Published]
                    ↓
               [EventHandler]
```

Branching paths show when one component invokes multiple others.

## Next Steps

- [Full Graph](./full-graph) — See the visualization
- [Events](./events) — Explore event publishers and handlers
