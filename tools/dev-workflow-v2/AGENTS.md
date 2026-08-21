# Dev Workflow Plugin

Codex installs this plugin in a cache outside the repository workspace. Hooks and workflow commands must resolve the current Git workspace and run the source under `tools/dev-workflow-v2` from that workspace. Do not run pnpm with `--dir "$PLUGIN_ROOT"`; the cache does not contain the workflow's `workspace:*` dependencies.

Codex reviewers are sibling sessions. Pass the active workflow session through `DEV_WORKFLOW_SESSION_ID` for every reviewer workflow operation; do not infer it from the reviewer’s own `CODEX_THREAD_ID` or Codex parent-session metadata.
