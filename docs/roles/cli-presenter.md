# cli-presenter

`cli-presenter` decides what CLI output to emit once results already exist.

- Keep it in CLI presentation or feature mapper code.
- Use it for stdout or stderr presentation, final output selection, and presentation-specific branching.
- Do not embed domain orchestration or persistence in this role.
