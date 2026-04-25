# Factory Optimization

Factory optimization converts review feedback into durable guardrails for future generated code. It does not fix product code. It improves the mechanisms that shape, review, test, and enforce product code.

## Command

Use:

```text
/dev-workflow-v2:optimize-factory <pr-number | pr-url | ad-hoc request>
```

The command searches PR feedback marked with `[FACTORY]`, discusses possible factory changes, and creates one approved GitHub issue labeled `factory` and `factory optimization`.

## Memory Model

Factory memory lives in two places:

1. GitHub issues labeled `factory` and `factory optimization`.
2. This directory, which stores stable decision guidance that should influence future optimizations.

Every factory optimization issue should be searchable by:

- labels: `factory`, `factory optimization`
- marker text in the issue body: `factory optimization`
- source PR and comment URLs
- factory surface names such as ESLint, Riviere, CI, CodeRabbit, workflow, agent, convention, or custom capability
- problem pattern names

When a new optimization does not fit the decision matrix below, the implementation issue must require an update to this document.

## Decision Priority

Factory changes should be selected in this order:

1. deterministic automated enforcement
2. tests or fixtures proving enforcement works
3. CI or workflow gate
4. review-agent or convention markdown as the last resort

Accuracy and reliability outrank convenience. A guardrail that produces noisy failures is not a good guardrail. A markdown instruction is acceptable only when deterministic enforcement is not available or would be less accurate than human review.

## Initial Decision Matrix

This matrix is a starting point, not a fixed list. Extend it when a new category does not fit.

| Problem pattern | Preferred factory surface | Verification approach |
| --- | --- | --- |
| Syntax or AST-level smell | ESLint rule, custom ESLint rule, or `no-restricted-syntax` | Violating fixture or representative lint failure |
| Repeated naming smell | Custom ESLint rule or existing naming rule extension | Rule test with rejected and accepted names |
| Folder or layer violation | Riviere role enforcement or architecture rule | Fixture or package check proving invalid placement fails |
| Import direction violation | Riviere role enforcement or dependency rule | Fixture or dependency check proving forbidden import fails |
| Test smell | Vitest ESLint rule or custom test lint rule | Failing test fixture or lint failure against representative test |
| Coverage weakness | Vitest coverage thresholds or coverage include/exclude adjustment | Coverage command proves threshold failure or restored coverage |
| CI escape hatch | CI workflow gate or workflow command state guard | CI-equivalent command proves blocked path fails |
| Code review blind spot | Review agent instruction, convention doc, or deterministic scanner capability | Agent review scenario or documented checklist addition |
| CodeRabbit blind spot | CodeRabbit configuration or knowledge-base guideline | CodeRabbit config review and linked guideline |
| Security or secret risk | gitleaks, semgrep, CodeRabbit tool, or CI gate | Tool command proves detection |
| Workflow misuse | dev-workflow command, hook, state machine guard, or agent instruction | Unit test or workflow command scenario proves misuse is blocked |
| Capability gap | New factory tool, custom checker, command, or agent workflow | Purpose-built test or dry-run scenario proves the new capability works |

## Issue Requirements

One factory optimization command run creates one aggregated GitHub issue. The issue must include:

- source PR and comment URLs
- factory memory used or a statement that no matching memory was found
- approved optimization tasks as a task list
- context required for implementation
- options discussed
- rejected options with rejection reasons
- prescribed solution
- enforcement surface
- verification strategy
- documentation and memory update requirements
- acceptance criteria
- commit guidance using the `factory-optimization` scope

The issue must not use ambiguous implementation language such as “likely files.” It must prescribe exact implementation targets or explicitly name a decision that remains open.

## Thread Resolution Policy

Review threads are resolved only after:

1. the aggregated factory optimization issue is created,
2. the source item receives a response comment with the issue URL and agreed solution,
3. the command can programmatically resolve the thread.

General PR comments cannot be resolved as review threads. The command should comment with the issue URL and tell the user which comments need manual handling.

## Commit Guidance

Factory optimization implementation PRs should use semantic commits with the `factory-optimization` scope:

```text
feat(factory-optimization): add guardrail for <pattern>
```
