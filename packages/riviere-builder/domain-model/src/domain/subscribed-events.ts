/** @riviere-role value-object */
export class SubscribedEvents {
  declare private readonly brand: 'SubscribedEvents'

  private constructor(readonly values: readonly string[]) {}

  static parse(value: string | undefined) {
    const values = [
      ...new Set(
        value
          ?.split(',')
          .map((event) => event.trim())
          .filter(Boolean) ?? [],
      ),
    ]
    return values.length === 0
      ? {
          success: false as const,
          message: '--subscribed-events is required for EventHandler component',
        }
      : { success: true as const, data: new SubscribedEvents(values) }
  }

  static parseValues(values: readonly string[] | undefined): SubscribedEvents {
    return new SubscribedEvents([...new Set(values ?? [])])
  }

  including(incoming: readonly string[] | undefined): SubscribedEvents {
    if (incoming === undefined || incoming.length === 0) return this
    const combined = [...new Set([...this.values, ...incoming])]
    return combined.length === this.values.length ? this : new SubscribedEvents(combined)
  }
}
