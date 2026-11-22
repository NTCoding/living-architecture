import { z } from 'zod'

const NOTES_SCHEMA = z.string().nullable()

type PlanApprovalInput = {
  readonly approved: boolean
  readonly notes: string | null
}

/** @riviere-role value-object */
export class PlanApproval {
  declare private readonly brand: 'PlanApproval'

  private constructor(
    private readonly approval: boolean,
    private readonly approvalNotes: string | null,
  ) {}

  static from(input: PlanApprovalInput): PlanApproval {
    return new PlanApproval(z.boolean().parse(input.approved), NOTES_SCHEMA.parse(input.notes))
  }

  isApproved(): boolean {
    return this.approval
  }

  notes(): string | null {
    return this.approvalNotes
  }
}
