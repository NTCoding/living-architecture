# workflow-facade

`workflow-facade` owns the public class API for the dev workflow state machine.

- Keep it in `tools/dev-workflow-v2/src/workflow-definition/domain/`.
- Limit public methods to reading state, appending events, starting sessions, and executing recording operations.
- Keep lower-level helper logic in dedicated workflow domain helper functions.
