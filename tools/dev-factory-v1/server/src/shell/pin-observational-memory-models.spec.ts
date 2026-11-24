import { describe, expect, it } from 'vitest'
import { pinObservationalMemoryModels } from './pin-observational-memory-models'

function pinnedModels(steps: unknown): string[] {
  const models: string[] = []
  pinObservationalMemoryModels(
    steps,
    {
      setObservationalMemoryModel: (model) => {
        models.push(model)
      },
    },
    '548',
  )
  return models
}

describe('pinObservationalMemoryModels', () => {
  it('restores the observer model persisted in a step output', () => {
    const models = pinnedModels({
      'load-issue': [
        {
          output: {
            model: 'agent/model',
            observerModel: 'observer/model',
          },
        },
      ],
    })

    expect(models).toStrictEqual(['agent/model', 'observer/model'])
  })

  it('uses step data and falls back to the agent model for an older run', () => {
    const models = pinnedModels({
      'load-issue': { data: { model: 'agent/model' } },
    })

    expect(models).toStrictEqual(['agent/model'])
  })

  it('uses step data when its output is null', () => {
    const models = pinnedModels({
      'load-issue': { output: null, data: { model: 'agent/model', observerModel: '' } },
    })

    expect(models).toStrictEqual(['agent/model'])
  })

  it('skips steps that do not carry a persisted model', () => {
    const models = pinnedModels({
      ignored: null,
      malformed: { output: 'not an object' },
      unrelated: { output: { issueNumber: 548 } },
      'load-issue': { output: { model: 'agent/model', observerModel: 'observer/model' } },
    })

    expect(models).toStrictEqual(['agent/model', 'observer/model'])
  })

  it('refuses to resume a run whose state has no model', () => {
    expect(() => pinnedModels(undefined)).toThrow(
      'The run for issue 548 carries no model in its state, so observational memory cannot be pinned. Start the run again on the same issue.',
    )
    expect(() => pinnedModels({ 'load-issue': null })).toThrow(
      'The run for issue 548 carries no model in its state, so observational memory cannot be pinned. Start the run again on the same issue.',
    )
  })
})
