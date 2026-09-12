# address-pull-request-feedback

Address pull request feedback without reading or changing `dev-workflow-v2` workflow state.

## Arguments

The user provides a GitHub pull request number — use `123`, not `#123`.

## Before planning

1. Resolve the current repository owner and name, the authenticated GitHub user, and the pull request head branch:

   ```bash
   gh repo view --json owner,name
   gh api user
   gh api repos/<owner>/<repo>/pulls/<pull-request-number>
   ```

2. Verify that the current worktree branch is the pull request head branch. Stop and explain the mismatch if it is not. Do not switch branches or modify another worktree.

3. Fetch every review thread through GitHub GraphQL. Paginate review threads and every thread's comments until `pageInfo.hasNextPage` is false. The thread comment selection must include `databaseId`. Read each unresolved, non outdated thread chronologically, including its id, path, line, body, URL, author, and the REST database ID of its root comment.

4. Treat a comment as human direction only when both conditions hold:
   - it is authored by the authenticated GitHub user; and
   - it does not begin with an agent prefix such as `[architecture-review]`, `[code-review]`, `[bug-scanner]`, `[task-check]`, or `[main-agent]`.

   CodeRabbit feedback is identified by its GitHub author, not by an agent prefix.

5. Recover persisted `[main-agent]` decisions from the thread history. These comments are not new human direction, but they are binding records of decisions already made with the user:
   - `[main-agent] Confirmed with user:` records an approved implementation decision. Follow it without presenting the same plan for approval again.
   - `[main-agent] ❌ **Rejected**:` records an approved rejection. Do not implement the rejected feedback.
   - `[main-agent] Done as planned:` records completed work. Do not repeat the completed work.

## Feedback plan

Before changing code, replying, resolving a thread, committing, or pushing, present a feedback plan to the human user with these sections for feedback without a persisted `[main-agent]` decision:

1. **Clear fixes** — bugs, clear rule violations, or poor code that can be fixed without a design decision. For each item, name the thread, the problem, the intended fix, and the expected reply.
2. **Discussion needed** — feedback that may change the domain model, domain boundaries, or another design decision. Explain the decision needed and include any technical concern with human direction.
3. **Human direction** — the relevant human comments and how the plan follows them.

Wait for explicit approval of the complete plan. Do not start addressing feedback while discussion is ongoing. For a thread with a persisted `[main-agent] Confirmed with user:` decision, continue from that decision instead of presenting a duplicate plan or waiting for duplicate approval.

## Address approved feedback

After the user has confirmed the plan, respond to each approved GitHub review
thread with the agreed follow up action before changing any code. This records
the approved plan on the thread, so another agent can recover what was agreed
and carry out the work without seeing this conversation.

For an approved fix with a persisted `[main-agent] Confirmed with user:` decision, recover the recorded files, tests, constraints, and verification, then start at step 2. Do not post a duplicate planning reply.

For each approved fix without a persisted decision:

1. Reply to the thread with a self contained implementation note. The reply
   must start by explaining why the feedback is valid, then state what outcome
   or follow up action has been agreed with the user, and only then describe how
   and where the change will be made, including relevant files, tests,
   constraints, and verification. It must be detailed enough for another agent
   to carry out the agreed work without seeing this conversation.

   Use this format:

   ```text
   [main-agent] Confirmed with user: <why the feedback is valid>. Agreed to
   <what outcome or follow up action is required>. This will be done by
   <how and where the change will be made>, including <tests, constraints, and
   verification>.
   ```

   For example:

   ```text
   [main-agent] Confirmed with user: the feedback is valid because the current
   tests violate the testing principle requiring the behaviour to be
   demonstrated directly. Agreed to address this by adding the missing
   assertion and refactoring the affected test in <file>. The change will
   preserve the existing test intent, cover the reported behaviour directly,
   and be verified with <command>.
   ```

   Do not change code until this planning reply has been posted successfully.
   Post the reply to the review thread using the GitHub REST API. Use the root review comment's REST database ID. This endpoint publishes the reply immediately; do not use a GitHub GraphQL review-reply mutation because it creates a pending review comment.

   ```bash
   gh api \
     --method POST \
     'repos/<OWNER>/<REPO>/pulls/<PR_NUMBER>/comments/<ROOT_COMMENT_DATABASE_ID>/replies' \
     -f body='[main-agent] Confirmed with user: <why the feedback is valid>. Agreed to <what outcome or follow up action is required>. This will be done by <how and where the change will be made>, including <tests, constraints, and verification>.'
   ```

2. Make and verify the agreed change.

3. Reply to the same thread with:

   ```text
   [main-agent] Done as planned: <what changed and how it was verified>
   ```

4. Resolve the thread only after the change has been verified and the
   completion reply has been posted successfully:

   ```bash
   gh api \
     --method POST \
     'repos/<OWNER>/<REPO>/pulls/<PR_NUMBER>/comments/<ROOT_COMMENT_DATABASE_ID>/replies' \
     -f body='[main-agent] Done as planned: <what changed and how it was verified>'
   ```

   Then resolve it with:

   ```bash
   gh api graphql \
     -f query='mutation($threadId: ID!) { resolveReviewThread(input: {threadId: $threadId}) { thread { id } } }' \
     -f threadId='<THREAD_ID>'
   ```

When a technically justified rejection is approved by the human user, do not change code. Reply through the GitHub REST API using the root review comment's REST database ID:

```bash
gh api \
  --method POST \
  'repos/<OWNER>/<REPO>/pulls/<PR_NUMBER>/comments/<ROOT_COMMENT_DATABASE_ID>/replies' \
  -f body='[main-agent] ❌ **Rejected**: <specific technical reason>'
```

Immediately after the reply succeeds, resolve the review thread:

```bash
gh api graphql \
  -f query='mutation($threadId: ID!) { resolveReviewThread(input: {threadId: $threadId}) { thread { id } } }' \
  -f threadId='<THREAD_ID>'
```

Never use “out of scope” or “nitpick” as the reason. Never use `addPullRequestReviewThreadReply`; it creates pending review comments.

When a thread needs a human decision, or when you challenge human direction, do not resolve it. Bring the thread, the decision, and the relevant technical reasoning to the human user.

Commit all approved fixes and push the current pull request branch. Re fetch the pull request feedback after the push. Continue only when every actionable thread is resolved and the pull request has no `CHANGES_REQUESTED` review. When CodeRabbit is processing a new commit after all threads are resolved, wait and periodically re fetch rather than treating it as a blocker. If the pull request cannot reach that state, report the blocker to the human user.

Do not use a workflow command, the `workflow` tool, or `codex-workflow`. Do not record reviewer status or transition workflow state.
