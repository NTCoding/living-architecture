# Step 2: Define Component Extraction Rules

Define how to identify each component type in your codebase.

::: tip Future Enhancement
This step currently uses AI-assisted rule generation. Deterministic tooling for automatic rule inference is planned for a future release.
:::

## Instructions

Follow the AI-assisted workflow for this step:

**[Step 2: Define →](/extract/steps/step-2-define-components)**

## Output

Creates `.riviere/config/component-definitions.md` containing:
- Extraction rules for each component type (API, UseCase, DomainOp, Event, EventHandler, UI)
- Custom type proposals
- Code patterns and examples

Also creates `.riviere/config/linking-rules.md` containing:
- HTTP client mappings
- Cross-domain linking patterns
- Validation rules

## Next Step

After defining extraction rules, proceed to:

**[Step 3: Extract →](/extract/deterministic/typescript/workflow/step-3-extract)**
