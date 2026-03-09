/** @riviere-role domain-service */
export function getOperationBody(op: string): string {
  return op.replaceAll('-', ' ').replace(/^\w/, (c) => c.toUpperCase())
}

/** @riviere-role domain-service */
export function getTransitionTitle(to: string): string {
  return to
}
