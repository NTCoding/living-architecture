# REVIEWING State

Run `/dev-workflow-v2:workflow get-review-inputs`.

Read `tools/dev-workflow-v2/commands/review-pull-request.md` completely and follow its canonical procedure. Use only the operation's validated pull request, review cycle, range, included reviewer, excluded reviewer, linked issue, review thread, and decision history values. Review only the supplied diff range. Run only included reviewers; excluded reviewers must not be run again.

After every included reviewer has finished, wait for CodeRabbit and close the cycle:

```text
/dev-workflow-v2:workflow wait-for-coderabbit-and-close-review-cycle
```

The workflow waits for CodeRabbit, records outcomes, handles the review cycle cap and its notice, then transitions to `ADDRESSING_FEEDBACK` or `HUMAN_REVIEWING`.

## Constraints

- Do not use ACP to run reviewers.
- Do not read or mutate workflow state while executing the review procedure.
- Do not record reviewer status yourself.
- If blocked, transition to BLOCKED: `/dev-workflow-v2:workflow transition BLOCKED`.
