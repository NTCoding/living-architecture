# Step 6: Validate the Graph

Check for orphan components and validate the complete graph.

::: tip Future Enhancement
This step currently uses AI-assisted validation. Deterministic tooling for graph validation is planned for a future release.
:::

## Instructions

Follow the AI-assisted workflow for this step:

**[Step 6: Validate →](/extract/steps/step-6-validate)**

## Validation Checks

- **Schema compliance**: Graph matches Rivière schema
- **Orphan detection**: Components with no incoming or outgoing links
- **Domain coverage**: Each domain has expected component types
- **Link integrity**: All link targets exist

## Output

Your complete graph at `.riviere/graph.json`.

## Next Steps

After validation:

1. **Visualize**: Open the graph in Éclair
   ```text
   https://living-architecture.dev/eclair/
   ```

2. **Enable enforcement**: Prevent architecture drift

   **[Enforcement Guide →](/extract/deterministic/typescript/enforcement)**

3. **Integrate into CI**: Run extraction on every commit

## Iteration

If validation reveals issues:
- Re-run extraction steps with corrections
- Update config rules in `.riviere/config/`
- Add missing decorators or annotations to code

The workflow is designed for iteration—each cycle improves extraction accuracy.
