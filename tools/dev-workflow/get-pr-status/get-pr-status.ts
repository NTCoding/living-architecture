#!/usr/bin/env tsx
import { z } from 'zod'
import { runWorkflow } from '../workflow-runner/run-workflow'
import { baseContextSchema } from '../workflow-runner/workflow-runner'
import { git } from '../external-clients/git'
import { fetchStatus } from './steps/fetch-status'

export const getPRStatusContextSchema = baseContextSchema.extend({})
export type GetPRStatusContext = z.infer<typeof getPRStatusContextSchema>

runWorkflow<GetPRStatusContext>([fetchStatus], buildGetPRStatusContext)

async function buildGetPRStatusContext(): Promise<GetPRStatusContext> {
  const branch = await git.currentBranch()
  return { branch }
}
