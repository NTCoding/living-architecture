export class DuplicateDomainError extends Error {
  readonly domainName: string

  constructor(domainName: string) {
    super(`Domain '${domainName}' already exists`)
    this.name = 'DuplicateDomainError'
    this.domainName = domainName
  }
}
