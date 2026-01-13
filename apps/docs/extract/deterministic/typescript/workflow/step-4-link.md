# Step 4: Link Components

Trace connections between components to show how data flows through your system.

::: tip Future Enhancement
This step currently uses AI-assisted linking. Deterministic tooling for automatic link detection is planned for a future release.
:::

## Instructions

Follow the AI-assisted workflow for this step:

**[Step 4: Link →](/extract/steps/step-4-link)**

## What Gets Linked

- **Internal calls**: UseCase → DomainOp, API → UseCase
- **HTTP calls**: Service → external API
- **Event flows**: EventHandler → Event subscriptions
- **UI navigation**: Page → API calls

## Output

Updates `.riviere/graph.json` with links between components.

Creates `.riviere/step-4-checklist.md` tracking linking progress.

## Next Step

After linking components, proceed to:

**[Step 5: Enrich →](/extract/deterministic/typescript/workflow/step-5-enrich)**
