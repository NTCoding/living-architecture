/**
 * @riviere-role domain-service
 * @riviere-role-justification Temporary verification declaration for the design trade-off flagging; removed before merge.
 * @riviere-design-trade-off Scratch verification: mutates the passed-in accumulator instead of returning a new value.
 */
export function scratchDesignTradeOffDemo(accumulator: { count: number }): void {
  accumulator.count += 1
}
