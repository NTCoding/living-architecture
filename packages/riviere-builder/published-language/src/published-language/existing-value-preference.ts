/** @riviere-role value-object */
export class ExistingValuePreference {
  declare private readonly brand: 'ExistingValuePreference'

  private static readonly preserveExisting = new ExistingValuePreference(true)
  private static readonly acceptIncoming = new ExistingValuePreference(false)

  private constructor(private readonly preservesExisting: boolean) {}

  static parse(noOverwrite: boolean | undefined): ExistingValuePreference {
    return noOverwrite
      ? ExistingValuePreference.preserveExisting
      : ExistingValuePreference.acceptIncoming
  }

  valueAfterUpdate<T>(existing: T, incoming: T): T
  valueAfterUpdate<T>(existing: T | undefined, incoming: T | null | undefined): T | undefined
  valueAfterUpdate<T>(existing: T | undefined, incoming: T | null | undefined): T | undefined {
    if (incoming === undefined || incoming === null) return existing
    if (this.preservesExisting && existing !== undefined) return existing
    return incoming
  }
}
