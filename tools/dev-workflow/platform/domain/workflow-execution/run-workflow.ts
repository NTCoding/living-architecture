import { writeFileSync } from 'node:fs'
import {
  workflow,
  type Step,
  type BaseContext,
  type WorkflowResult,
  type StepTiming,
} from './workflow-runner'
import { handleWorkflowError } from './error-handler'

export function runWorkflow<T extends BaseContext>(
  steps: Step<T>[],
  buildContext: () => Promise<T>,
  formatResult?: (result: WorkflowResult, ctx: T) => unknown,
  options?: { resolveTimingsFilePath?: (ctx: T) => string },
): void {
  executeWorkflow(steps, buildContext, formatResult, options).catch(handleWorkflowError)
}

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

async function executeWorkflow<T extends BaseContext>(
  steps: Step<T>[],
  buildContext: () => Promise<T>,
  formatResult?: (result: WorkflowResult, ctx: T) => unknown,
  options?: { resolveTimingsFilePath?: (ctx: T) => string },
): Promise<void> {
  const context = await buildContext()
  const runner = workflow(steps)
  const result = await runner(context)

  if (options?.resolveTimingsFilePath) {
    const timingsPath = options.resolveTimingsFilePath(context)
    const markdown = formatTimingsMarkdown(result.stepTimings, result.totalDurationMs)
    writeFileSync(timingsPath, markdown, 'utf-8')
  }

  const formatted = formatResult ? formatResult(result, context) : undefined
  const output = formatted ?? result.output ?? result

  console.log(JSON.stringify(output, null, 2))

  process.exit(result.success ? 0 : 1)
}
