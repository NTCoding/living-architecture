import { WorkflowPlan } from './workflow-plan'

const WITH_THE_OTHER_REVIEWS = 'reviews'
const REPLIES_AT_ONCE = 4

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
          { id: 'load-issue' },
          { id: 'prepare-branch' },
          { id: 'install-dependencies' },
          { id: 'draft-plan' },
          { id: 'publish-plan' },
          { id: 'wait-for-plan-clarification' },
          { id: 'implement' },
          { id: 'push-branch' },
          { id: 'draft-pull-request' },
          { id: 'open-pull-request' },
          { id: 'open-review-cycle' },
          { id: 'review-cycle', looped: true },
          { id: 'mark-ready-for-human' },
        ],
      }),
      WorkflowPlan.parse({
        id: 'review-cycle',
        steps: [
          { id: 'architecture-review', group: WITH_THE_OTHER_REVIEWS, chosen: true },
          { id: 'code-review', group: WITH_THE_OTHER_REVIEWS, chosen: true },
          { id: 'bug-scanner', group: WITH_THE_OTHER_REVIEWS, chosen: true },
          { id: 'collect-verdicts' },
          { id: 'publish-review-findings' },
          { id: 'wait-for-coderabbit' },
          { id: 'address-feedback' },
          { id: 'push-branch' },
          { id: 'plan-review-replies' },
          { id: 'reply-to-review-comment', atOnce: REPLIES_AT_ONCE },
          { id: 'close-review-replies' },
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
