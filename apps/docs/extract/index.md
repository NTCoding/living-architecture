# Rivière Extraction

Extract architecture from your codebase into a Rivière graph showing how operations flow through your system.

## What You Get

A Rivière graph (`.riviere/graph.json`) containing:
- **Components**: APIs, UseCases, DomainOps, Events, EventHandlers
- **Links**: Sync and async connections showing operational flow
- **Metadata**: Domains, state machines, business rules

## Extraction Methods

Two approaches to extract architecture from code:

**AI-Assisted** — AI analyzes code (any language) and calls CLI commands. Works for any codebase without setup. Best for initial extraction or dynamic codebases.

**Deterministic** — Same code always produces the same graph. Language-specific extractor parses code via AST. Faster, CI-ready. Best for codebases following architectural conventions.

[Learn about Deterministic Extraction →](/extract/deterministic/)

## How AI-Assisted Extraction Works

AI analyzes your code and calls CLI commands to build the graph. The CLI handles ID generation, validation, and error recovery. When AI makes mistakes, the CLI suggests corrections.

**[Start the AI Extraction Workflow →](./steps/)**

## Extraction and Enforcement

Reliable extraction works best with clear architectural conventions:

1. **Define Components** — Establish what constitutes an API, UseCase, DomainOp, Event, EventHandler, UI
2. **Build Codebase** — Implement features using those patterns
3. **Extract Architecture** — Identify components from code
4. **Enforce Conventions** — Ensure code follows definitions

Enforcement makes extraction reliable. Extraction validates enforcement is working.

[Learn about Enforcement →](/extract/deterministic/enforcement)

## See Also

- [CLI Reference](/reference/cli/cli-reference) — All commands with examples
- [Graph Structure](/reference/schema/graph-structure) — Components and links explained
