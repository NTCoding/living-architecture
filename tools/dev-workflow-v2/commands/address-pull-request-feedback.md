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

3. Fetch every review thread through GitHub GraphQL. Paginate review threads and every thread's comments until `pageInfo.hasNextPage` is false. Read each unresolved, non outdated thread chronologically, including its id, path, line, body, URL, and author.

4. Treat a comment as human direction only when both conditions hold:
   - it is authored by the authenticated GitHub user; and
   - it does not begin with an agent prefix such as `[architecture-review]`, `[code-review]`, `[bug-scanner]`, `[task-check]`, or `[main-agent]`.

   CodeRabbit feedback is identified by its GitHub author, not by an agent prefix.

## Feedback plan

Before changing code, replying, resolving a thread, committing, or pushing, present a feedback plan to the human user with these sections:

1. **Clear fixes** — bugs, clear rule violations, or poor code that can be fixed without a design decision. For each item, name the thread, the problem, the intended fix, and the expected reply.
2. **Discussion needed** — feedback that may change the domain model, domain boundaries, or another design decision. Explain the decision needed and include any technical concern with human direction.
3. **Human direction** — the relevant human comments and how the plan follows them.

Wait for explicit approval of the complete plan. Do not start addressing feedback while discussion is ongoing.

## Address approved feedback

For every approved fix:

1. Make and verify the change.
2. Reply to the relevant review thread using GitHub GraphQL:

   ```bash
   gh api graphql \
     -f query='mutation($pullRequestReviewThreadId: ID!, $body: String!) { addPullRequestReviewThreadReply(input: {pullRequestReviewThreadId: $pullRequestReviewThreadId, body: $body}) { comment { id } } }' \
     -f pullRequestReviewThreadId='<THREAD_ID>' \
     -f body='[main-agent] ✅ **Fixed**: <explanation>'
   ```

3. Resolve the thread only after the reply and fix:

   ```bash
   gh api graphql \
     -f query='mutation($threadId: ID!) { resolveReviewThread(input: {threadId: $threadId}) { thread { id } } }' \
     -f threadId='<THREAD_ID>'
   ```

When a technically justified rejection is approved by the human user, reply with `[main-agent] ❌ **Rejected**: <specific technical reason>`. Never use “out of scope” or “nitpick” as the reason.

When a thread needs a human decision, or when you challenge human direction, do not resolve it. Bring the thread, the decision, and the relevant technical reasoning to the human user.

Commit all approved fixes and push the current pull request branch. Re fetch the pull request feedback after the push. Continue only when every actionable thread is resolved and the pull request has no `CHANGES_REQUESTED` review. When CodeRabbit is processing a new commit after all threads are resolved, wait and periodically re fetch rather than treating it as a blocker. If the pull request cannot reach that state, report the blocker to the human user.

Do not use a workflow command, the `workflow` tool, or `codex-workflow`. Do not record reviewer status or transition workflow state.
