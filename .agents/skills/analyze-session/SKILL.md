---
name: analyze-session
description: Analyse and optimise a dev-workflow-v3 factory session (implementer step). Use for /analyze-session <runId>, or when asked why a factory run was slow, where the implementer's time went, or how to make the factory agent more efficient.
---

# Analyse a factory session

Analyse one factory run out of `.factory/mastra.db` and turn the numbers into
concrete efficiency improvements for the implementer step. Do not change any
factory code and do not commit as part of this skill; the deliverable is the
written analysis.

## Produce the stats

Run the stats script from the repository root:

```bash
node scripts/analyze-session.mjs <runId>
```

An optional second argument is the path to a `mastra.db` in another working
copy's `.factory` directory. When you use it, run every evidence query below
against that same database path, from that working copy.

The script writes the stats report to `.factory/analysis/<runId>.md` and
prints the same content. The file already has its final shape: a summary table,
the time table, the checks table, command tables, the rework table, stuck
signals and data gaps, all with named evidence and bold labels. Do not rewrite
or reformat it. Your job is to add the two analysis sections to it.

The numbers are inferred from observability spans and the stored transcript, so
treat them as estimates, not measurements. Running the script again refreshes
the stats tables and keeps the analysis sections that were already appended.

## Investigate the causes

Before writing anything, look at the evidence behind the biggest numbers. The
transcript lives in `mastra_messages` (plain JSON, one row per stored message
with `parts` for text, reasoning and tool invocations) and spans live in
`mastra_ai_spans` (readable columns, truncated binary payloads — do not try to
decode `input`/`output`/`attributes`).

Useful queries:

```bash
# What the implementer said and did in a time slice.
# The thread is named after the issue, not the run: run `issue-501-9`
# belongs to thread `issue-501-implementer`. Use <database> as above.
sqlite3 <database> "SELECT role, createdAt, content FROM mastra_messages
WHERE thread_id='<issueNumber>-implementer' AND createdAt BETWEEN '<start>' AND '<end>'
ORDER BY createdAt"

# Span timeline for one activity type
sqlite3 <database> "SELECT name, startedAt, endedAt FROM mastra_ai_spans
WHERE threadId='<issueNumber>-implementer' AND startedAt BETWEEN '<start>' AND '<end>'
AND spanType IN ('tool_call','model_inference') ORDER BY startedAt"
```

Also check `.factory/logs/runs.log` for the run's outcome and any
`*-failed-request.json` files for provider rejections. Note that the stored
transcript is incomplete: trimmed history and aborted turns lose tool results,
and the script says how many command executions have no recorded result.

For each headline number, name the concrete behaviour that produced it, with
timestamps or command text as evidence. Do not speculate where the data does
not reach; say what is unknown.

## Write the analysis

The script has already created `.factory/analysis/<runId>.md` with the
stats. Add two sections to that file: update a section in place when it is
already there from an earlier run, and append it only when it is absent. Do not
touch the generated stats.

### `## What caused the numbers`

One subsection per big number. The heading names the number and the cause, for
example `### Stuck: 28% of the step. Two requests that never came back`. Under
it: a few short sentences, then bullets that name the evidence. Name the exact
command, file or timestamp. "A file was edited 9 times" is useless; name the
file.

### `## Improvement suggestions`

Up to 20 subsections, numbered, ordered by expected time saved. Only suggest a
change when this session's numbers back it; if fewer than 10 opportunities are
evidenced, write fewer. Each one has
three bullets with bold labels:

- **What to do:** the change.
- **Why:** the evidence from this session.
- **What it saves:** the expected effect.

Prefer changes to prompts, tool wiring, budgets and harness behaviour over
vague advice.

### Writing rules

- Short simple sentences. One idea per sentence.
- Every number sits next to the thing it counts.
- Label-value facts go in tables with bold labels. The script already does
  this; match it in the sections you write.
- Use more words rather than fewer.

Then tell the user where the file is and give the headline numbers in the chat.
Suggest follow-up work; do not start implementing changes to the factory unless
the user asks for that separately.
