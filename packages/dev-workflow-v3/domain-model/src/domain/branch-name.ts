import { z } from 'zod'

const NON_ALPHANUMERIC = /[^a-z0-9]+/

const BRANCH_SUFFIX_SCHEMA = z.string().trim().min(1)

function toSlug(title: string): string {
  const slug = title
    .toLowerCase()
    .split(NON_ALPHANUMERIC)
    .filter((word) => word.length > 0)
    .join('-')
    .slice(0, 60)
  return slug.endsWith('-') ? slug.slice(0, -1) : slug
}

/** @riviere-role value-object */
export class BranchName {
  declare private readonly brand: 'BranchName'

  private constructor(private readonly branchName: string) {}

  static fromIssueNumberAndTitle(issueNumber: number, title: string): BranchName {
    const number = z.number().int().positive().parse(issueNumber)
    return new BranchName(`issue-${number}-${toSlug(title)}`)
  }

  static parse(value: string): BranchName {
    return new BranchName(BRANCH_SUFFIX_SCHEMA.parse(value))
  }

  value(): string {
    return this.branchName
  }
}
