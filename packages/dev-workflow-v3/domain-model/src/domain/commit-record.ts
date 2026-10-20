import { z } from 'zod'

const SHA_SCHEMA = z
  .string()
  .trim()
  .regex(/^[0-9a-f]{7,40}$/, 'A commit sha is 7 to 40 lower case hex characters.')
const MESSAGE_SCHEMA = z.string().trim().min(1)

/** @riviere-role value-object */
export class CommitRecord {
  declare private readonly brand: 'CommitRecord'

  private constructor(
    private readonly commitSha: string,
    private readonly commitMessage: string,
  ) {}

  static parse(input: { readonly sha: string; readonly message: string }): CommitRecord {
    return new CommitRecord(SHA_SCHEMA.parse(input.sha), MESSAGE_SCHEMA.parse(input.message))
  }

  sha(): string {
    return this.commitSha
  }

  message(): string {
    return this.commitMessage
  }
}
