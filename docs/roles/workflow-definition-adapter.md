# workflow-definition-adapter

`workflow-definition-adapter` assembles the workflow-v2 engine contract from workflow-domain pieces.

- Keep it in `tools/dev-workflow-v2/src/workflow-definition/infra/`.
- Use it for engine-facing adapters such as rehydration, transition context, and event construction.
- Do not bury workflow-domain state logic here.
