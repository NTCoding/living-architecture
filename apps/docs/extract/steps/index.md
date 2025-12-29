# Rivière Graph Extraction - Step by Step

Extract architecture flows from a codebase into a Rivière graph.

## How to Use

**Do not use plan mode.** These steps require direct execution, not planning.

Run each step in a separate Claude session. Load the step file, review output, proceed.

```
# Step 1: Understand the codebase
"Execute /path/to/step-1-understand.md"

# Step 2: Define component patterns
"Execute /path/to/step-2-define-components.md"

# Step 3: Extract components
"Execute /path/to/step-3-extract.md"

# Step 4: Link components
"Execute /path/to/step-4-link.md"

# Step 5: Enrich with business rules
"Execute /path/to/step-5-enrich.md"

# Step 6: Validate and export
"Execute /path/to/step-6-validate.md"
```

CLI: `npx @living-architecture/riviere-cli`

## Output Structure

```
.riviere/
├── config/
│   ├── metadata.md              # Project name, domains, reference files
│   ├── component-definitions.md # Extraction rules for each component type
│   ├── linking-rules.md         # Cross-domain linking patterns
│   └── extraction-scripts.md    # Scripts for complex extraction patterns
├── step-3-summary.md            # Working file (can delete after)
├── step-4-checklist.md          # Working file (can delete after)
├── step-5-checklist.md          # Working file (can delete after)
└── [project-name]-[commit].json # Generated graph
```

Git history tracks changes across runs.

## Feedback and Improvement

If components are missing, reload the step with feedback:

```
"Execute /path/to/step-2-define-components.md

You missed domain operations in src/services/. Update the rules."
```

Then re-run step-3 to re-extract.

Config files improve over time. Each fix makes future extractions more accurate.

## Why Separate Steps?

Each step runs in isolation — Claude cannot plan ahead or make assumptions. You control the pace and can correct mistakes between steps.

Fresh context window per step, or restart mid-step if needed.

## Step Files

| Step | Purpose |
|------|---------|
| [Step 1: Understand](./step-1-understand) | Analyze codebase structure |
| [Step 2: Define](./step-2-define-components) | Create extraction rules |
| [Step 3: Extract](./step-3-extract) | Add components to graph |
| [Step 4: Link](./step-4-link) | Connect components |
| [Step 5: Enrich](./step-5-enrich) | Add state changes and rules |
| [Step 6: Validate](./step-6-validate) | Check consistency |
