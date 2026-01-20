/**
 * Represents a GitHub user who authored a review comment.
 *
 * GitHub API returns null for users who have deleted their accounts.
 * This is expected behavior, not an error condition.
 */
export class Reviewer {
  private static readonly DELETED_USER_PLACEHOLDER = '[deleted]'

  private constructor(private readonly login: string) {}

  /**
   * Creates a Reviewer from a GitHub login.
   *
   * @param login - GitHub username, or null/undefined for deleted users
   * @returns Reviewer instance with placeholder for deleted users
   */
  static create(login: string | null | undefined): Reviewer {
    if (!login) {
      return new Reviewer(Reviewer.DELETED_USER_PLACEHOLDER)
    }
    return new Reviewer(login)
  }

  toString(): string {
    return this.login
  }

  get value(): string {
    return this.login
  }
}
