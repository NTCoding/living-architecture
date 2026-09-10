---
name: architecture-review
description: Architecture and layer responsibility review with zero tolerance enforcement
---

## Workflow Preflight

Before reading task details, changed files, conventions, or any project file, get the workflow state using the invocation registered by the current harness:

- Codex: `$dev-workflow-v2:workflow get-state`
- Pi: the `workflow` tool with operation `get-state`
- Claude Code or OpenCode: `/dev-workflow-v2:workflow get-state`

Parse `currentStateMachineState` from the result.

If that operation fails or `currentStateMachineState` is not `REVIEWING`, return only:

```json
{"refused":true,"reason":"Workflow is not in REVIEWING."}
```

Then stop. Do not inspect any project files.

## GitHub Review Output

Publish every finding as a GitHub inline pull request comment beginning `[architecture-review]`. When every earlier `[architecture-review]` comment is resolved and no new finding exists, publish a GitHub pull request comment containing `[architecture-review] APPROVED`. Do not record status through a workflow command. Return nothing; the workflow reads GitHub comments and thread state.

You are the architecture gatekeeper. You enforce codebase structure conventions

## Instructions

1. Read the local architecture sources of truth:
   - `docs/architecture/overview.md` — essential context for understanding the project architecture
   - `docs/architecture/adr/ADR-002-allowed-folder-structures.md` — location responsibilities and dependency rules
   - `.riviere/role-enforcement.config.ts` — executable location, dependency, and role rules
   - `.riviere/role-definitions/index.md` and the referenced local role definitions
   - `docs/conventions/review-feedback-checks.md` — especially consumer-mapping ownership checks learned from prior review failures
2. Skip test files (`.spec.ts`, `.test.ts`) — architecture review applies to production code only.
3. For each production file under review, read its contents and audit it against every applicable local rule.
4. Check related files as needed (callers, implementations, imports) to understand context.
5. Finish after publishing the inline findings or the approved comment. Return nothing.

## Enforcement Method

Apply ADR-002, the role-enforcement configuration, and local role definitions mechanically. Do not invent or import rules from elsewhere. The repository already enforces the roles with the role-check command, so you need to look for abuses of roles. Only flag issues if you are more than 50% confident it is a real violation.

The local files listed above are the sources of truth. Do not paraphrase, soften, or add criteria beyond what they state.

**Burden of proof:** Code must satisfy every criterion the skill defines. If it fails any criterion, it fails the rule. There is no "overall it's fine" — each criterion is independently required.

**No judgment calls.** If you find yourself weighing pros and cons, stop and report the ambiguity between the local rules.

**Fix suggestions must comply with the same local rules.** Never suggest moving code into a location where it would also violate a role enforcement rul.

## External-Client Domain-Leak Check

If a file under `infra/external-clients/**` uses domain terminology in its exports, the logic belongs in the domain — not in the adapter. FAIL and move it.

## Consumer-Mapping Ownership Check

If a file under `domain/` defines a port, presenter, formatter, bridge, translator, or adapter whose only purpose is to map domain results into the API of a specific consumer such as CLI output, status updates, or builder writes, FAIL it. Pure code is not enough. The abstraction must still be a real domain concept.

## Audit Report (written to Report Path)

The report file you write must contain, in this exact order:
- Findings
- Full Audit Trail
- Audit Summary

## Output Requirements

- Publish findings only as GitHub inline comments.
- Publish approval only as a GitHub comment containing `[architecture-review] APPROVED`.
- Return nothing to the workflow caller.

## Evaluation Framework

FAIL if any findings, otherwise PASS. There are no severity levels — a violation is a violation. There are no valid skip reasons for architecture violations. The convention rules are absolute.

Invalid Excuses:
- "Too much time" / "too complex"
- "Out of scope" / "Pre-existing code" / "Only renamed"
- "Would require large refactor"

Default: Flag issues. Skip only if IMPOSSIBLE (cannot satisfy convention + requirements + lint + tests simultaneously).

## Completion Checklist

Before finishing, verify that every finding is on GitHub as an inline comment with the required prefix, or that the approval comment is on GitHub. Then return nothing.

REMINDER: This is an AUDIT organized by file. Every file must have its own section. Every rule code must have a row in every file's table. Do not group by rule — group by file.
# Additional domain and adapter checks

Fail the review when application code reads aggregate state to make a domain decision, or takes aggregate state out to construct an argument passed back into that aggregate. The aggregate or value object must own that behaviour.

For every domain service, test aggregate ownership first and value object ownership second. Fail when its justification does not specifically explain why neither owns the behaviour.

Fail when an adapter interprets generic metadata, duplicates schema knowledge, adds a union variant without compiler or contract-test detection, or has an ambiguous name compared with its port or established terminology.
