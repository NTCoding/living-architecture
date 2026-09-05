#!/usr/bin/env bash
set -euo pipefail

repository_root="$(git rev-parse --show-toplevel)"
base_commit='3ec31c16fbfd02f91122a8d81f3b26010461cc47'
head_commit='aeb7a001d060556ca5ec5fa6c8830e00a1458c29'
base_workspace="$(mktemp -d)"
head_workspace="$(mktemp -d)"
published_comment="$(mktemp)"
time_output="$(mktemp)"
trap 'rm -rf "${base_workspace}" "${head_workspace}" "${published_comment}" "${time_output}"' EXIT

cd "${repository_root}"
git archive "${base_commit}" | tar -x -C "${base_workspace}"
git archive "${head_commit}" | tar -x -C "${head_workspace}"

pnpm exec tsx \
  docs/project/PRD/pull-request-diffs/prototypes/benchmark-riviere-graph-architecture-diff.ts \
  "${base_workspace}" \
  "${head_workspace}" \
  "${base_commit}" \
  "${head_commit}"

gh api repos/NTCoding/living-architecture/issues/comments/5454459810 \
  --jq .body > "${published_comment}"

diff \
  --ignore-blank-lines \
  "${published_comment}" \
  docs/project/PRD/pull-request-diffs/prototypes/results/pr-478-riviere-architecture-diff-original-format.txt

printf '%s\n' 'Published PR #478 architecture diff: MATCH'

measure_peak_memory() {
  local approach="$1"
  local run
  for run in 1 2 3 4 5; do
    /usr/bin/time -l \
      pnpm exec tsx \
      docs/project/PRD/pull-request-diffs/prototypes/benchmark-architecture-diff-memory-worker.ts \
      "${approach}" \
      "${base_workspace}" \
      "${head_workspace}" \
      "${base_commit}" \
      "${head_commit}" \
      > /dev/null 2> "${time_output}"
    awk '/maximum resident set size/ { print $1 }' "${time_output}"
  done
}

snapshot_peak_measurements="$(measure_peak_memory snapshot)"
graph_peak_measurements="$(measure_peak_memory graph)"
snapshot_peak_median="$(printf '%s\n' "${snapshot_peak_measurements}" | sort -n | sed -n '3p')"
graph_peak_median="$(printf '%s\n' "${graph_peak_measurements}" | sort -n | sed -n '3p')"
snapshot_peak_range="$(printf '%s\n' "${snapshot_peak_measurements}" | sort -n | sed -n '1p;5p' | paste -sd- -)"
graph_peak_range="$(printf '%s\n' "${graph_peak_measurements}" | sort -n | sed -n '1p;5p' | paste -sd- -)"
memory_report="docs/project/PRD/pull-request-diffs/prototypes/results/pr-478-peak-memory.txt"
printf '%s\n\n' '# PR #478 isolated peak memory benchmark' > "${memory_report}"
printf '%s\n\n' 'Median of five isolated process runs. Each range shows the minimum and maximum measured process peak.' >> "${memory_report}"
printf '| Approach | Median maximum resident set size | Five-run range |\n' >> "${memory_report}"
printf '| --- | ---: | ---: |\n' >> "${memory_report}"
printf '| Snapshot extraction and diff | %s bytes | %s bytes |\n' "${snapshot_peak_median}" "${snapshot_peak_range}" >> "${memory_report}"
printf '| Diff graph extraction, creation, parse, and diff | %s bytes | %s bytes |\n' "${graph_peak_median}" "${graph_peak_range}" >> "${memory_report}"
cat "${memory_report}"
