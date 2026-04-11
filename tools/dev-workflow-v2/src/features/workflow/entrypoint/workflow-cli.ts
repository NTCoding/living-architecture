import {
  defineRoutes, arg 
} from '@ntcoding/agentic-workflow-builder/cli'
import type { Workflow } from '../domain/workflow'
import type { WorkflowState } from '../domain/workflow-types'
import { STATE_NAME_SCHEMA } from '../domain/workflow-types'
import { BASH_FORBIDDEN } from '../domain/registry'
import { isWriteAllowed } from '../domain/workflow-predicates'

export const ROUTES = defineRoutes<Workflow, WorkflowState>({
  init: { type: 'session-start' },
  transition: {
    type: 'transition',
    args: [arg.state('STATE', STATE_NAME_SCHEMA)],
  },

  'record-issue': {
    type: 'transaction',
    args: [arg.number('number')],
    handler: (w, n) => w.executeRecording('record-issue', n),
  },
  'record-branch': {
    type: 'transaction',
    args: [arg.string('branch')],
    handler: (w, b) => w.executeRecording('record-branch', b),
  },
  'record-architecture-review-passed': {
    type: 'transaction',
    args: [],
    handler: (w) => w.executeRecording('record-architecture-review-passed'),
  },
  'record-architecture-review-failed': {
    type: 'transaction',
    args: [],
    handler: (w) => w.executeRecording('record-architecture-review-failed'),
  },
  'record-code-review-passed': {
    type: 'transaction',
    args: [],
    handler: (w) => w.executeRecording('record-code-review-passed'),
  },
  'record-code-review-failed': {
    type: 'transaction',
    args: [],
    handler: (w) => w.executeRecording('record-code-review-failed'),
  },
  'record-bug-scanner-passed': {
    type: 'transaction',
    args: [],
    handler: (w) => w.executeRecording('record-bug-scanner-passed'),
  },
  'record-bug-scanner-failed': {
    type: 'transaction',
    args: [],
    handler: (w) => w.executeRecording('record-bug-scanner-failed'),
  },
  'record-task-check-passed': {
    type: 'transaction',
    args: [],
    handler: (w) => w.executeRecording('record-task-check-passed'),
  },
  'record-pr': {
    type: 'transaction',
    args: [arg.number('number'), arg.string('url').optional()],
    handler: (w, n, url) => w.executeRecording('record-pr', n, url),
  },
  'record-ci-passed': {
    type: 'transaction',
    args: [],
    handler: (w) => w.executeRecording('record-ci-passed'),
  },
  'record-ci-failed': {
    type: 'transaction',
    args: [arg.string('output')],
    handler: (w, o) => w.executeRecording('record-ci-failed', o),
  },
  'record-feedback-clean': {
    type: 'transaction',
    args: [],
    handler: (w) => w.executeRecording('record-feedback-clean'),
  },
  'record-feedback-exists': {
    type: 'transaction',
    args: [arg.number('count')],
    handler: (w, c) => w.executeRecording('record-feedback-exists', c),
  },
  'record-feedback-addressed': {
    type: 'transaction',
    args: [arg.number('count')],
    handler: (w, c) => w.executeRecording('record-feedback-addressed', c),
  },
  'record-reflection': {
    type: 'transaction',
    args: [arg.string('path')],
    handler: (w, p) => w.executeRecording('record-reflection', p),
  },
})

/** @riviere-role cli-entrypoint */
export const PRE_TOOL_USE_POLICY = {
  bashForbidden: BASH_FORBIDDEN,
  isWriteAllowed,
} as const
