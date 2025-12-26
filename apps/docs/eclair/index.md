# Éclair

Éclair is a web-based viewer for exploring software architecture extracted with Rivière.

[Screenshot: Éclair main interface showing a graph visualization with sidebar navigation]

## When to Use Éclair

Use Éclair when you need to:

- **Explore architecture visually** — See how components connect and communicate
- **Trace flows** — Follow data and control flow through your system
- **Understand domains** — See how bounded contexts relate to each other
- **Compare versions** — Identify what changed between architecture extractions
- **Find components** — Search for specific APIs, entities, or events

## Key Capabilities

| Capability | Description |
|------------|-------------|
| Full Graph | Force-directed visualization of all components |
| Domain Map | High-level view of domain relationships |
| Flow Tracing | Click entry points to see execution paths |
| Entity Browser | Explore domain entities and their invariants |
| Event Browser | See published events and their handlers |
| Version Comparison | Diff two architecture versions side-by-side |

## Getting Your Architecture into Éclair

Éclair reads Rivière graph files (JSON). You can create these using:

- **[AI Extraction](/guide/ai-extraction)** — Use Claude to extract architecture from code
- **[CLI](/cli/)** — Run `riviere build` to generate a graph
- **[Library](/guide/quick-start)** — Use RiviereBuilder programmatically

## Next Steps

- [Getting Started](./getting-started) — Load your first graph
- [Navigation](./navigation) — Learn common controls
- [Views](./views/overview) — Explore what each view offers
