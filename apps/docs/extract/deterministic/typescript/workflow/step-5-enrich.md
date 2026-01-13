# Step 5: Enrich Components

Add business rules and state changes to DomainOp components.

::: tip Future Enhancement
This step currently uses AI-assisted enrichment. Deterministic tooling for extracting business rules from code is planned for a future release.
:::

## Instructions

Follow the AI-assisted workflow for this step:

**[Step 5: Enrich →](/extract/steps/step-5-enrich)**

## What Gets Enriched

- **State changes**: What fields change when a DomainOp executes
- **Business rules**: Validation logic, invariants, constraints
- **Pre/post conditions**: What must be true before/after execution

## Output

Updates `.riviere/graph.json` with enriched DomainOp metadata.

Creates `.riviere/step-5-checklist.md` tracking enrichment progress.

## Next Step

After enriching components, proceed to:

**[Step 6: Validate →](/extract/deterministic/typescript/workflow/step-6-validate)**
