# Pull request architecture diff prototypes

## Rivière graph equivalence and performance benchmark

Run:

```bash
pnpm exec tsc -p docs/project/PRD/pull-request-diffs/prototypes/tsconfig.json
docs/project/PRD/pull-request-diffs/prototypes/run-pr-478-architecture-diff-benchmark.sh
```

The benchmark uses pull request #478:

- base: `3ec31c16fbfd02f91122a8d81f3b26010461cc47`
- head: `aeb7a001d060556ca5ec5fa6c8830e00a1458c29`
- published architecture diff: [comment 5454459810](https://github.com/NTCoding/living-architecture/pull/478#issuecomment-5454459810)

It compares the current narrow architecture snapshots with valid `fine-grained-role-graph` fixtures containing the same architecture review facts. It fails unless:

1. the graph path produces byte identical Markdown to the current snapshot path;
2. the graph derived facts rendered in the original PR #478 format match the published comment, apart from trailing blank lines;
3. output remains equivalent at 1×, 2×, 5×, and 10× the PR #478 fact set.

Generated results are written under `results/`. The runner also measures the snapshot and graph paths in isolated processes with `/usr/bin/time -l`, so their peak memory can be compared without one approach retaining the other's allocations.

## What this proves

- A `fine-grained-role-graph` can represent enough information to reproduce the working architecture diff.
- The diff does not need every dependency in the repository. The prototype graph contains role elements plus only aggregate ownership and supporting element relationships used by the current diff.
- The `fine-grained-role-graph` is materially larger and slower to parse than the narrow snapshot representation, despite containing only the required semantic links.
- The existing `high-level graph` can remain selective and focused on flows and key concepts.

## What this does not prove

- The repository's `high-level graph` contains all role annotated declarations required by the architecture diff.
- A graph with every role annotated class and method is acceptably fast to extract directly.
- A Rivière workflow can generate the required `fine-grained-role-graph` facts efficiently without using the disposable architecture snapshot as an intermediate.
- Code diff guided extraction can preserve complete ownership and relationship changes.

The current role enforcement command cannot yet act as the architecture diff source. Its public result contains duration, exit code, standard output, and standard error, but no role inventory or relationship model. Its internal analysis may still be reusable in a future design.

Direct workflow generation is deliberately deferred to the first delivery ticket. That ticket must reproduce pull request #478 exactly and measure elapsed time, peak memory, and generated graph size before later delivery work relies on the extraction path.
