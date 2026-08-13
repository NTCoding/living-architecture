/** @riviere-role value-object */
export class SubscribedEvents {
  declare private readonly brand: 'SubscribedEvents'

  private constructor(readonly values: readonly string[]) {}

  static parse(value: string | undefined) {
    const values =
      value
        ?.split(',')
        .map((event) => event.trim())
        .filter(Boolean) ?? []
    return values.length === 0
      ? {
          success: false as const,
          message: '--subscribed-events is required for EventHandler component',
        }
      : { success: true as const, data: new SubscribedEvents(values) }
  }
}
