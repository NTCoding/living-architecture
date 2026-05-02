# start-planning

Start a new planning topic.

## Arguments

The user provides a planning topic name.

## Workflow

1. Create the planning marker at `docs/project/planning/<slug>.yml`.
2. Create the PRD file for the topic at the derived path from `planningId`.
3. Initialize the marker with `stage: prd-drafting`.
4. Print the planning ID, marker path, PRD path, and next command.

## Result

The command leaves planning ready for `/dev-workflow-v2:continue-planning`.
