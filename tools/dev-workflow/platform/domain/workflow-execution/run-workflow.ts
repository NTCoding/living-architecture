import { writeFileSync } from 'node:fs'
import {
  workflow,
  type Step,
  type BaseContext,
  type WorkflowResult,
  type StepTiming,
} from './workflow-runner'
import { handleWorkflowError } from './error-handler'

type ContextBuilder<T extends BaseContext> = () => Promise<T>
type ResultFormatter<T extends BaseContext> = (result: WorkflowResult, ctx: T) => unknown

interface WorkflowOptions<T extends BaseContext> {resolveTimingsFilePath?: (ctx: T) => string}

export function runWorkflow<T extends BaseContext>(
  steps: Step<T>[],
  buildContext: ContextBuilder<T>,
  formatResult?: ResultFormatter<T>,
  options?: WorkflowOptions<T>,
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
  buildContext: ContextBuilder<T>,
  formatResult?: ResultFormatter<T>,
  options?: WorkflowOptions<T>,
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
