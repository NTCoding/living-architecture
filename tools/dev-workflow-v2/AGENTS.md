# Dev Workflow Plugin

Codex installs this plugin in a cache outside the repository workspace. Hooks and workflow commands must resolve the current Git workspace and run the source under `tools/dev-workflow-v2` from that workspace. Do not run pnpm with `--dir "$PLUGIN_ROOT"`; the cache does not contain the workflow's `workspace:*` dependencies.
