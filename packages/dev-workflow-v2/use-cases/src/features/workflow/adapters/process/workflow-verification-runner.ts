import type { RunLocalVerification } from '@living-architecture/dev-workflow-v2-domain-model/domain/ports/run-local-verification'
import type { runProcess } from '../../../../infra/external-clients/process/run-process'

/** @riviere-role domain-port-adapter */
export function createWorkflowVerificationRunner(execute: typeof runProcess): RunLocalVerification {
  return () =>
    execute({
      command: 'pnpm',
      arguments: ['verify'],
      environment: { CI: 'true', NX_SKIP_NX_CACHE: 'true' },
    })
}
