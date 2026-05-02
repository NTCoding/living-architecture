# start-planning

Start a new planning topic.

## Arguments

The user provides a planning topic name.

## Workflow

1. Reject empty or whitespace-only planning topics.
2. Find the active planning marker in `docs/project/planning/*.yml`, where active means the marker file parses and its `stage` is one of `prd-drafting`, `prd-approval`, `architecture-drafting`, `architecture-approval`, or `task-creation`.
3. Stop if more than one active marker exists and list them all.
4. Stop if exactly one active marker exists and tell the user to use `planning-status` or `continue-planning`.
5. Derive `<slug>` by lowercasing the topic, replacing non-alphanumeric characters with hyphens, collapsing repeated hyphens, and trimming leading and trailing hyphens.
6. Stop if slug derivation produces an empty string.
7. Stop if `docs/project/planning/<slug>.yml` already exists.
8. Create the planning marker at `docs/project/planning/<slug>.yml`.
9. Initialize the marker with:
    - `planningId`
    - `stage: prd-drafting`
    - `githubMilestone: null`
    - `githubIssuesCreated: false`
    - `githubIssueNumbers: []`
10. Create the PRD file for the topic at the derived path from `planningId`.
11. If the PRD write fails after the marker exists, delete the marker and stop with an error.
12. Print the planning ID, marker path, PRD path, and next command.

## Result

The command leaves planning ready for `/dev-workflow-v2:continue-planning`.
