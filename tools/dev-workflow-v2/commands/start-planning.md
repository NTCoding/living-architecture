# start-planning

Start or resume local planning for one product discovery topic.

## Arguments

The user provides one planning topic, either:

- free text such as `Phase 13 Extraction Workflows`
- or an existing planning id such as `phase-13-extraction-workflows`

## Step 1: Resolve the planning id

If the argument already matches an existing planning marker, use it.

Otherwise:

- lowercase the text
- replace spaces and punctuation with hyphens
- collapse duplicate hyphens
- trim leading and trailing hyphens

Example:

- `Phase 13 Extraction Workflows` -> `phase-13-extraction-workflows`

## Step 2: Resolve paths by convention

From `<planning-id>`, derive:

- planning folder: `docs/project/PRD/<planning-id>/`
- marker: `docs/project/PRD/<planning-id>/marker.yml`
- problem definition: `docs/project/PRD/<planning-id>/problem-definition.md`
- solution exploration: `docs/project/PRD/<planning-id>/solution-exploration.md`
- PRD: `docs/project/PRD/<planning-id>/PRD.md`
- architecture: `docs/project/PRD/<planning-id>/ARCH.md`
- dogfooding: `docs/project/PRD/<planning-id>/dogfooding.md`
- delivery plan: `docs/project/PRD/<planning-id>/delivery.md`

Do not store artefact paths in the marker file. The workflow derives them by convention.

## Step 3: Reuse or create the planning marker

If the marker exists:

- read it
- report the current planning stage
- do not create a duplicate planning session

If the marker does not exist, create:

```yaml
planningId: <planning-id>
stage: problem-definition
githubMilestone: <planning-id>
githubIssuesCreated: false
githubIssueNumbers: []
```

## Step 4: Ensure the problem definition file exists

If the problem definition file does not exist, create it with this exact high-level structure:

```markdown
# Problem Definition: <title>

**Status:** Draft

---

## Approved inputs

**Section approval:** Pending

## Problem statement

**Section approval:** Pending

```

Do not create `solution-exploration.md`, `PRD.md`, `ARCH.md`, `dogfooding.md`, or `delivery.md` at this step.

The PRD is intentionally not created at planning start. A PRD records the product decision after discovery; it is not the place where product discovery happens.

## Step 5: Print the planning session

Always print:

```text
Planning ID: <planning-id>
Stage: <stage>
Problem definition: <problem-definition-path>
Solution exploration: <solution-exploration-path>
PRD: <prd-path>
Architecture: <architecture-path>
Dogfooding: <dogfooding-path>
Delivery: <delivery-path>
Marker: <marker-path>
Next command: /dev-workflow-v2:continue-planning
```
