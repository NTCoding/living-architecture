Find the next available task and start it using TDD.

## Steps

1. Run `task-master next` to find the next available task
2. Run `task-master show <id>` to review task details
3. Run `task-master set-status --id=<id> --status=in-progress

## TDD Process

Use the `/development-skills:tdd-process` skill for this task. Plans should be test specifications, not implementation designs.

## Reminders

- Remember: we have 100% test coverage enforcement. If you get lazy and stop following TDD, the process will catch you and force you to write the tests. Overall it's quicker and better to just follow TDD.

- Avoid all anti-patterns defined in @/docs/conventions/anti-patterns.md
