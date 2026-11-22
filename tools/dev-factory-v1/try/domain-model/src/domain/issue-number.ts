import { z } from 'zod'

const ISSUE_NUMBER_SCHEMA = z.number().int().positive()

/** @riviere-role domain-error */
export class InvalidIssueNumber extends Error {
  constructor(value: unknown) {
    super(`An issue number is a positive integer: ${String(value)}`)
    this.name = 'InvalidIssueNumber'
  }
}

/** @riviere-role value-object */
export class IssueNumber {
  declare private readonly brand: 'IssueNumber'

  private constructor(private readonly number: number) {}

  static parse(value: unknown): IssueNumber {
    const result = ISSUE_NUMBER_SCHEMA.safeParse(value)
    if (!result.success) throw new InvalidIssueNumber(value)
    return new IssueNumber(result.data)
  }

  static parseFromText(value: string): IssueNumber {
    const trimmed = value.trim()
    if (!/^\d+$/.test(trimmed)) throw new InvalidIssueNumber(value)
    return IssueNumber.parse(Number(trimmed))
  }

  value(): number {
    return this.number
  }

  runId(): string {
    return `issue-${this.number}`
  }

  toString(): string {
    return String(this.number)
  }
}
