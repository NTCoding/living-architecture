# workflow

Run the dev-workflow-v2 state machine CLI.

Pass all arguments directly to the CLI entrypoint:

```bash
export GITHUB_TOKEN=$(gh auth token) && npx tsx $CLAUDE_PLUGIN_ROOT/src/entrypoint/workflow-cli.ts $ARGUMENTS
```

Read and follow the output. If the CLI loads a state instruction file, read it and follow its TODO checklist.
