import {
  describe, it, expect 
} from 'vitest'
import { z } from 'zod'
import {
  taskSchema, taskListOutputSchema 
} from './task-list-output'

describe('taskSchema', () => {
  it('validates a well-formed task', () => {
    const task = {
      number: 166,
      title: '[M2-D2.6] Add CLI flags',
      assignees: [{ login: 'NTCoding' }],
      body: 'PRD Section: M2-D2.6',
      milestone: { title: 'phase-11-metadata-extraction' },
      labels: [{ name: 'prd:phase-11' }],
    }

    expect(taskSchema.parse(task)).toStrictEqual(task)
  })

  it('accepts null body', () => {
    const task = {
      number: 1,
      title: 'Test',
      assignees: [],
      body: null,
      milestone: null,
      labels: [],
    }

    expect(taskSchema.parse(task)).toStrictEqual(task)
  })

  it('rejects missing number', () => {
    const task = {
      title: 'Test',
      assignees: [],
      body: null,
      milestone: null,
      labels: [],
    }

    expect(() => taskSchema.parse(task)).toThrow(z.ZodError)
  })

  it('rejects undefined body', () => {
    const task = {
      number: 1,
      title: 'Test',
      assignees: [],
      body: undefined,
      milestone: null,
      labels: [],
    }

    expect(() => taskSchema.parse(task)).toThrow(z.ZodError)
  })

  it('rejects missing title', () => {
    const task = {
      number: 1,
      assignees: [],
      body: null,
      milestone: null,
      labels: [],
    }

    expect(() => taskSchema.parse(task)).toThrow(z.ZodError)
  })
})

describe('taskListOutputSchema', () => {
  it('validates output with both milestone and non-milestone tasks', () => {
    const output = {
      milestone_tasks: [
        {
          number: 166,
          title: 'Milestone task',
          assignees: [],
          body: 'body',
          milestone: { title: 'phase-11' },
          labels: [],
        },
      ],
      non_milestone_tasks: [
        {
          number: 174,
          title: 'Tech task',
          assignees: [],
          body: 'body',
          milestone: null,
          labels: [{ name: 'tech improvement' }],
        },
      ],
    }

    expect(taskListOutputSchema.parse(output)).toStrictEqual(output)
  })

  it('validates output with empty arrays', () => {
    const output = {
      milestone_tasks: [],
      non_milestone_tasks: [],
    }

    expect(taskListOutputSchema.parse(output)).toStrictEqual(output)
  })

  it('rejects missing non_milestone_tasks', () => {
    const output = { milestone_tasks: [] }

    expect(() => taskListOutputSchema.parse(output)).toThrow(z.ZodError)
  })

  it('rejects missing milestone_tasks', () => {
    const output = { non_milestone_tasks: [] }

    expect(() => taskListOutputSchema.parse(output)).toThrow(z.ZodError)
  })
})
