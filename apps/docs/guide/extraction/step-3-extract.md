# Step 3: Extract Components

## Objective

Find all component instances using patterns from Step 2 and add them to the graph via CLI.

## Prerequisites

- **Do not use plan mode.** Execute directly.
- Read `.riviere/config/metadata.md` for domains and conventions
- Read `.riviere/config/component-definitions.md` for extraction rules
- CLI available (user will provide path)

## Initialize Graph

Get current commit:
```bash
git rev-parse --short=6 HEAD
```

Create graph:
```bash
riviere builder new-graph --name "[project-name]-[commit]"
```

Register sources:
```bash
riviere builder add-source --repository "[repo-name]" --commit "[commit]"
```

Register domains (from Step 1):
```bash
riviere builder add-domain --name "[name]" --type "[domain|bff|ui|other]" --description "[desc]"
```

## Extract Components

**No planning or counting. Extract directly using patterns from Step 2.**

### 1. Find All Instances

For each component type, grep for its code signature:

```bash
# Examples - actual patterns come from Step 2
grep -rn "@Controller" src/
grep -rn "extends BaseUseCase" src/
grep -rn "@EventHandler" src/
```

This gives file paths and line numbers for ALL occurrences.

### 2. Process Each Match

For each grep result:
1. Read the file at that location
2. Extract component details (name, domain, HTTP method, etc.)
3. Add via CLI

```bash
riviere builder add-component \
  --type "[API|UseCase|DomainOp|Event|EventHandler|UI|Custom]" \
  --domain "[domain]" \
  --module "[module]" \
  --name "[name]" \
  --repository "[repo]" \
  --source-file "[path]" \
  --source-line "[line]"
```

Type-specific options:
- API: `--http-method`, `--path`
- DomainOp: `--entity`, `--operation-name`
- Event: `--event-name`
- EventHandler: `--subscribed-events`
- UI: `--route`

### 3. Complete Each Type

Finish ALL matches for one component type before starting the next:

```
APIs (@Controller): 12 matches → 18 endpoints extracted
UseCases (extends BaseUseCase): 8 matches → 8 use cases extracted
```

**If grep pattern doesn't work** (e.g., complex dynamic patterns), note it and ask user if a script is needed.

## Verify Extraction

Generate summary:
```bash
riviere builder component-summary --output ".riviere/step-3-summary.md"
```

Check for:
- Domains with zero components
- Component types with zero instances
- Unexpected counts suggesting missed patterns

Offer to run a sub-agent to scan for components that may have been missed.

## Feedback

If user reports missing components, update `.riviere/config/component-definitions.md` with corrected patterns and re-extract.

## Output

Graph: `.riviere/[project-name]-[commit].json`

## Completion

Present extraction summary showing component counts by domain and type.

**Step 3 complete.** Wait for user feedback before proceeding.
