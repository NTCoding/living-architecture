# Documentation Site

## Mission

Public-facing documentation at [living-architecture.dev](https://living-architecture.dev). Helps users extract architecture from code, build Rivière schema graphs, and visualize them with Éclair.

**Audience:** Developers adopting Rivière for their TypeScript and non-TypeScript projects.

All UI and UX styling MUST conform to brand guidelines in `/docs/brand`.

## Site Layout

```text
get-started/          → Onboarding: install, quick starts, choosing CLI vs library
extract/              → Choosing an extraction approach (AI vs deterministic)
  ai-assisted/        → AI + CLI workflow: 6 steps to extract architecture with an AI assistant (no config needed)
  deterministic/      → Deterministic: user writes config, extractor runs in CI
    typescript/       → TypeScript-specific: getting started, 6-step workflow, enforcement
visualize/            → Éclair viewer: getting started, views
reference/            → Lookup destinations (not tutorials)
  schema/             → Rivière graph structure
  cli/                → CLI commands
  api/                → Library API (partially auto-generated)
  extraction-config/  → Config DSL: schema, predicates, extraction rules, decorators, examples
```

## User Journeys

Every page serves one of these journeys. New content MUST fit an existing journey. If a page requires a new journey, clarify with the user first and update this table.

| Journey | Entry Point | Pages |
|---------|-------------|-------|
| **"I'm new. What is Rivière? What does it do? How do I install it and get my first result?"** | `/get-started/` | Introduction, installation, quick starts, CLI vs library |
| **"I want an AI to scan my codebase and extract my architecture automatically"** | `/extract/ai-assisted/` | 6-step AI-assisted workflow where the AI reads code and calls CLI commands |
| **"I want repeatable, config-driven extraction that runs in CI without AI"** | `/extract/deterministic/typescript/` | Getting started, 6-step deterministic workflow, enforcement, extraction config |
| **"I know what I need — show me the exact API, config field, CLI flag, or schema structure"** | `/reference/` | Schema, CLI commands, API docs, extraction config DSL |
| **"I have a Rivière graph and want to explore my architecture in a browser"** | `/visualize/` | Éclair getting started, views (full graph, domain map, flows, entities, events) |

**Test for new pages:** Can you answer "Which journey is the user on, and what step?" If no, the page doesn't belong as a standalone page.

## Auto-Generated vs Manual

| Content | Source | Command | Location |
|---------|--------|---------|----------|
| CLI reference | riviere-cli command definitions | `pnpm nx generate-docs riviere-cli` | `packages/riviere-cli/docs/generated/cli-reference.md` → copied to `reference/cli/cli-reference.md` |
| API docs (RiviereBuilder, RiviereQuery) | TypeDoc from source | `pnpm nx typedoc riviere-builder` / `riviere-query` | `reference/api/generated/` |
| Rivière JSON Schema | Schema package | Built with docs | `public/schema/riviere.schema.json` |

**Rules:**

- NEVER manually edit files in `reference/api/generated/` — they are overwritten on build
- NEVER manually edit `reference/cli/cli-reference.md` — regenerate with `pnpm nx generate-docs riviere-cli`
- After changing CLI commands or library APIs, regenerate docs before submitting

**Everything else is manual.** All pages outside the generated paths above are hand-written.

## Page Formats

### Reference Pages (match `predicates.md`)

```markdown
---
pageClass: reference
---

# Page Title

## Overview

| Item | Description |
|------|-------------|
| `itemA` | One-line description |
| `itemB` | One-line description |

---

### `itemA`

One-line description

**Parameters:**

| Field | Type | Required | Description |
|-------|------|----------|-------------|
| `name` | `string` | **Yes** | What this field does |
| `from` | `string` | No | Optional field |

---

### `itemB`

...

---

## See Also

- [Related Page](/path) — Brief context
```

**Rules:**

- `pageClass: reference` frontmatter required
- Overview table at top listing ALL items
- Each item as `###` with parameters table
- `---` separator between items
- No YAML/TypeScript tutorial examples (those go on `examples.md`)
- No edge case narratives
- Required fields use **Yes** bold

### Workflow Step Pages (match `step-1-understand.md`)

```markdown
# Step N: Title

Brief description.

::: info Optional Context
Important context if needed.
:::

## Prerequisites

- List of requirements

## N.1 First Sub-step

Instructions...

## N.2 Second Sub-step

Instructions...

## Output

What this step produces.

## Next Step

**[Step N+1: Title →](/path/to/next-step)**
```

### Overview/Index Pages (match `extract/index.md`)

```markdown
# Section Title

One-sentence description.

## Why [Topic]?

Value proposition.

## Choose Your Path

### Option A: Name

Description.

**[Start Option A →](/path)**

### Option B: Name

Description.

**[Start Option B →](/path)**

## Reference

- [Relevant Reference](/path)
```

## Cross-Linking

**Every page has a See Also section** at the bottom (3-5 links):

```markdown
## See Also

- [Page Title](/absolute/path) — Brief context
- [Another Page](/another/path)
```

**Link formats:**

- Forward navigation (workflow steps): `**[Step 4: Link →](/path)**`
- Reference lookups (from tutorials): `[See all predicates →](/reference/extraction-config/predicates)`
- External: `[View demo app →](https://github.com/...)`
- Plain cross-reference: `[Page Title](/path)`

**Rules:**

- Use absolute paths (`/reference/...` not `./...`)
- Arrow `→` means "go forward" or "go deeper"
- Bold for primary CTAs
- Link first mention of a term, not every mention

## Modifying Existing Pages

- **NEVER delete existing content** unless explicitly told to
- Add companion sections alongside existing ones
- Before modifying, read the ENTIRE page to understand its structure
- schema.md is the structural reference — add pages alongside it, don't gut it

## Terminology

- Use terms from `docs/architecture/domain-terminology/contextive/definitions.glossary.yml` ONLY
- Never invent terms. If you need a term not in the glossary, ask the user first.
- Never use synonyms for glossary terms

## Code Blocks

- Always specify language: `yaml`, `typescript`, `bash`, `text`
- Config (YAML) before code (TypeScript) when showing both
- CLI output uses `text` not `bash`
- Inline `backticks` for field names, command names, short values

## VitePress Callouts

Use sparingly:

- `::: info Title` — Important context affecting the whole page
- `::: warning Title` — Common mistakes or breaking changes
- `::: tip Title` — Optional best practices

## Quality Gate

**Run `/documentation-review` before interrupting the user.** This validates all documentation changes against the rules in this file.

## VitePress Routing Gotcha

VitePress intercepts link clicks for client-side navigation. If you need links to bypass VitePress routing (e.g., links to the eclair app):

1. VitePress calls `event.preventDefault()` in the **capture phase** before your handlers run
2. Checking `event.defaultPrevented` will always be `true` - don't use it
3. Use `event.stopImmediatePropagation()` to prevent VitePress from handling the click
4. Register your handler with capture phase: `addEventListener('click', handler, true)`

See `eclairLinkHandler.ts` for the implementation.

## Maintaining This File

- When new page formats are established, add verbatim examples above
- When new user journeys are added, update the journey table
- When new auto-generated content is added, update the generation table
