import { z } from 'zod'

const persistedStepStateSchema = z.object({
  model: z.string().optional(),
  observerModel: z.string().optional(),
})

/**
 * @riviere-role main
 *
 * A resumed run belongs to a new CLI process, so its observational memory model must be restored
 * from the state persisted by its steps. Runs started before `--observer-model` use their agent
 * model as the observer model.
 */
export function pinObservationalMemoryModels(
  steps: unknown,
  factory: { readonly setObservationalMemoryModel: (model: string) => void },
  issue: string,
): void {
  const model = modelOf(steps)
  if (model === null) throw new MissingObservationalMemoryModel(issue)
  factory.setObservationalMemoryModel(model)
  const observerModel = observerModelOf(steps)
  if (observerModel !== null) factory.setObservationalMemoryModel(observerModel)
}

function modelOf(steps: unknown): string | null {
  return persistedModelOf(steps, 'model')
}

function observerModelOf(steps: unknown): string | null {
  return persistedModelOf(steps, 'observerModel')
}

function persistedModelOf(steps: unknown, name: 'model' | 'observerModel'): string | null {
  if (!isRecord(steps)) return null
  for (const value of Object.values(steps)) {
    const step: unknown = Array.isArray(value) ? value[0] : value
    if (!isRecord(step)) continue
    const state = persistedStepStateSchema.safeParse(step['output'] ?? step['data'])
    const model = state.success ? state.data[name] : undefined
    if (model === undefined) continue
    if (name === 'observerModel' && model === '') continue
    return model
  }
  return null
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null && !Array.isArray(value)
}

/** @riviere-role cli-error */
class MissingObservationalMemoryModel extends Error {
  constructor(issue: string) {
    super(
      `The run for issue ${issue} carries no model in its state, so observational memory cannot be pinned. Start the run again on the same issue.`,
    )
    this.name = 'MissingObservationalMemoryModel'
  }
}
