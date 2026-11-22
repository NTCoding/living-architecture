import { z } from 'zod'

const PATH_SCHEMA = z.string().trim().min(1)
const BRANCH_SCHEMA = z
  .string()
  .trim()
  .min(1)
  .refine((value) => !/\s/.test(value), 'A branch name cannot contain whitespace.')

type WorktreeReferenceInput = {
  readonly path: string
  readonly branch: string
}

/** @riviere-role value-object */
export class WorktreeReference {
  declare private readonly brand: 'WorktreeReference'

  private constructor(
    private readonly worktreePath: string,
    private readonly worktreeBranch: string,
  ) {}

  static from(input: WorktreeReferenceInput): WorktreeReference {
    return new WorktreeReference(PATH_SCHEMA.parse(input.path), BRANCH_SCHEMA.parse(input.branch))
  }

  path(): string {
    return this.worktreePath
  }

  branch(): string {
    return this.worktreeBranch
  }
}
