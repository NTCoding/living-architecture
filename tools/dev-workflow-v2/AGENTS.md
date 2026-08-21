# Dev Workflow Plugin

Codex installs this plugin without `node_modules`. The source can import `packages/dev-workflow-v2` while the repository builds it, but every installed hook and workflow runner must use the bundled files in `com.openai.codex/dist`.

Keep Codex transcript adapters in their valid external client location under `packages/dev-workflow-v2`. Run `pnpm run build:codex-runtime` and commit the bundle whenever a bundled source file changes.
