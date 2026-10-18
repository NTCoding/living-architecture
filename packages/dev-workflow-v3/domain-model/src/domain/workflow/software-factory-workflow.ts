import { WorkflowPlan } from './workflow-plan'

/** @riviere-role value-object */
export class SoftwareFactoryWorkflow {
  declare private readonly brand: 'SoftwareFactoryWorkflow'

  private constructor(
    private readonly implementation: WorkflowPlan,
    private readonly review: WorkflowPlan,
  ) {}

  static singleton(): SoftwareFactoryWorkflow {
    return new SoftwareFactoryWorkflow(
      WorkflowPlan.parse({
        id: 'start-implementation',
        steps: [
          { id: 'load-issue', looped: false },
          { id: 'prepare-branch', looped: false },
          { id: 'install-dependencies', looped: false },
          { id: 'read-guidance', looped: false },
          { id: 'draft-plan', looped: false },
          { id: 'publish-plan', looped: false },
          { id: 'request-plan-approval', looped: false },
          { id: 'implement', looped: false },
          { id: 'verify', looped: false },
          { id: 'commit-work', looped: false },
          { id: 'push-branch', looped: false },
          { id: 'draft-pull-request', looped: false },
          { id: 'open-pull-request', looped: false },
          { id: 'open-review-cycle', looped: false },
          { id: 'review-cycle', looped: true },
          { id: 'mark-ready-for-human', looped: false },
        ],
      }),
      WorkflowPlan.parse({
        id: 'review-cycle',
        steps: [
          { id: 'architecture-review', looped: false },
          { id: 'code-review', looped: false },
          { id: 'bug-scanner', looped: false },
          { id: 'collect-verdicts', looped: false },
          { id: 'publish-review-findings', looped: false },
          { id: 'wait-for-coderabbit', looped: false },
          { id: 'address-feedback', looped: false },
          { id: 'verify-and-commit', looped: false },
        ],
      }),
    )
  }

  startImplementation(): WorkflowPlan {
    return this.implementation
  }

  reviewCycle(): WorkflowPlan {
    return this.review
  }
}
