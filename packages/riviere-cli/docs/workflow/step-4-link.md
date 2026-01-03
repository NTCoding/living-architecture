# Step 4: Link Components

## Objective

Trace operational connections between components to create the flow graph.

## Prerequisites

- **Do not use plan mode.** Execute directly.
- Graph with extracted components from Step 3.
- Read `.riviere/config/linking-rules.md` for cross-domain patterns.

## Generate Checklist

```bash
npx riviere builder component-checklist --output=".riviere/step-4-checklist.md"
```

## Link Types

| Type | Meaning | When to Use |
|------|---------|-------------|
| `sync` | Direct call, waits for response | API→UseCase, UseCase→DomainOp |
| `async` | Fire-and-forget, event-based | UseCase→Event, Event→EventHandler |

## Two Types of Links

When tracing code, you'll encounter two types of calls:

| Call Type | Command | How Source is Specified | Example |
|-----------|---------|-------------------------|---------|
| **Code call** (function/method) | `link` | You provide source ID via `--from` | API → UseCase, UseCase → DomainOp |
| **HTTP call** (network) | `link-http` | Command finds source API by `--path` | Link FROM an API to its UseCase |

**Use `link`** when you see direct function calls within the same codebase. You must know the source component ID.

**Use `link-http`** when you want to link FROM an API endpoint and you know its HTTP path but not its component ID. This command:
- Finds the source API by matching `--path` and optionally `--method`
- Links FROM that API TO the target component you specify
- Handles path parameter variations automatically (`{id}`, `:id`, etc.)

## Process

**Prefix every message with:** `[Working through step-4 checklist and marking items as done]`

**The checklist is the only source of work. Do not generate your own list from the graph.**

1. Read `.riviere/step-4-checklist.md`
2. Find unchecked items `- [ ]`
3. Read source files at locations shown
4. Trace call chains — follow through helpers/services until you reach another component
5. Create links via CLI
6. **Mark items as `- [x]` in the checklist file**
7. Continue until all items are checked

**Multiple targets:** One component often links to multiple others.

**Trace through non-components:** You may follow the code through intermediate files, but only link between components:
```text
API → helper → service → UseCase
```
The link is **API → UseCase**.

## Rules

- **Checklist is the only source.** Work only from checklist items. Do not inspect the graph to generate your own work list.
- **Mark items done.** Update the checklist as you complete items.
- **Self-correction is allowed.** If a link fails, you may inspect the graph to find correct component names.
- **Parallel is OK.** Subagents can process different component types in parallel. Each must work from the checklist and mark items done.
- **Apply linking-rules.md.** Use patterns and validation rules from the config file.

## CLI Commands

**Fetch the CLI reference for full command syntax and examples:**
```text
https://raw.githubusercontent.com/NTCoding/living-architecture/main/packages/riviere-cli/docs/generated/cli-reference.md
```

| Command | When to Use |
|---------|-------------|
| `link` | Code calls (function/method invocations) |
| `link-http` | Find API by HTTP path and link to target |
| `link-external` | Links to systems not in this graph |

## Update Checklist

Mark items done as you go:
```markdown
- [x] orders:api:postorders (src/api/orders.ts:10)
- [ ] orders:usecase:place-order (src/usecases/PlaceOrder.ts:5)
```

## Output

Updated `.riviere/step-4-checklist.md` with all items checked.

## Feedback

If user reports problems or missing elements, identify the root cause, update the relevant config files, and re-run the affected step.

## Validate

After linking, check the validation rules in `.riviere/config/linking-rules.md`. List any components that violate the rules so user can review.

## Completion

Present link summary showing total links created (sync vs async).

**Step 4 complete.** Wait for user feedback before proceeding.
