import type { StepTiming } from '../../domain/workflow-execution/workflow-runner'

function formatDuration(ms: number): string {
  return ms >= 1000 ? `${(ms / 1000).toFixed(1)}s` : `${Math.round(ms)}ms`
}

export function formatTimingsMarkdown(stepTimings: StepTiming[], totalDurationMs: number): string {
  const lines = [
    '# Workflow Timing',
    '',
    '| Step | Duration |',
    '|------|----------|',
    ...stepTimings.map((t) => `| ${t.name} | ${formatDuration(t.durationMs)} |`),
    '',
    `**Total: ${formatDuration(totalDurationMs)}**`,
    '',
  ]
  return lines.join('\n')
}
