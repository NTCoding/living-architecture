# Extraction

Extract architecture from your codebase into a Rivière graph.

## Why Extract?

Your codebase contains architectural knowledge—APIs, use cases, domain operations, events. Extraction makes this explicit by producing a graph you can visualize, query, and validate.

## Choose Your Workflow

### AI-Assisted Extraction

For any language or codebase. AI analyzes your code and builds the graph.

**Best for:**
- Any programming language
- Codebases without architectural conventions
- Initial extraction to understand existing systems

**[Start AI-Assisted Workflow →](/extract/steps/)**

---

### TypeScript Extraction

For TypeScript codebases. Config-driven detection via decorators, JSDoc, or naming conventions.

**Best for:**
- TypeScript projects
- Codebases with architectural conventions
- CI integration and repeatable extraction

**[Start TypeScript Workflow →](/extract/deterministic/typescript/workflow/)**

---

## Extraction and Enforcement

Extraction and enforcement form a reinforcing cycle:

<div style="text-align: center; margin: 2rem 0;">
  <img src="/extraction-enforcement-cycle.svg" alt="Extraction-Enforcement Cycle: Architecture Definitions guide Codebase, Codebase parsed by Extraction, Extraction validates Enforcement, Enforcement ensures Definitions" style="max-width: 500px;">
</div>

1. **Define** — Establish component conventions (what's an API, UseCase, etc.)
2. **Build** — Write code following those conventions
3. **Extract** — Identify components from code
4. **Enforce** — Ensure new code follows conventions

Enforcement makes extraction reliable. Extraction validates enforcement works.

[Learn about Enforcement →](/extract/deterministic/typescript/enforcement)

---

## Reference

- [CLI Commands](/reference/cli/cli-reference) — All extraction commands
- [Config Schema](/reference/extraction-config/schema) — Extraction config DSL
- [Decorators](/reference/extraction-config/decorators) — TypeScript decorator reference
