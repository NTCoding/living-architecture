# Step 4: Link Components

Trace connections between components to show how data flows through your system.

::: tip Future Enhancement
This step currently uses AI-assisted linking. Deterministic tooling for automatic link detection is planned for a future release.
:::

## Instructions

Follow the AI-assisted workflow for this step:

**[Step 4: Link →](/extract/ai-assisted/step-4-link)**

For connection config options and pattern syntax:

[Connection Config Reference →](/reference/extraction-config/connections)

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

## See Also

- [Connection Config Reference](/reference/extraction-config/connections) — Connection pattern options and examples
- [Extraction Config](/reference/extraction-config/schema) — Full connection schema definitions
- [Step 3: Extract](/extract/deterministic/typescript/workflow/step-3-extract) — Component extraction before linking
- [Step 5: Enrich](/extract/deterministic/typescript/workflow/step-5-enrich) — Next workflow step
