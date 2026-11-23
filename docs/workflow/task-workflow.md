# Maintainer Workflow

This workflow is for members of the maintainer team. It covers planning, GitHub issue creation, implementation and review through the software factory.

External contributors use the lightweight public workflow in [`CONTRIBUTING.md`](../../CONTRIBUTING.md) instead.

## Plan an epic

1. Run [`./start-factory-ui`](../../start-factory-ui) from the repo root. It installs the factory's dependencies, builds its UI, and starts the factory server on port 4800 and Mastra Studio on port 4111.
2. Run the [`/factory` skill](../../.claude/skills/factory/SKILL.md) in a Claude Code session, then start planning an idea in the factory UI. The planning session uses `pnpm factory <command>` from the repo root; that script supplies the repo as `FACTORY_TARGET_REPO`.
3. Follow the six planning steps in the skill: problem definition, solution exploration, PRD, architecture, dogfooding and delivery planning. Answer comments and decisions in the UI, then approve each step or send it back for revision.
4. Once delivery planning is approved, create one GitHub issue per story and record them with `pnpm factory stories <epic> --feature M1 901 902`.

## Implement and review

Start a run for each story issue in the factory UI. Follow its implementation and review cycles, answer any question that suspends the run, and inspect the resulting pull request from the run view.
