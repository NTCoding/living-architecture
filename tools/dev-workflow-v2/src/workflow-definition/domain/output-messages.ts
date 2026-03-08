/** @riviere-role workflow-domain-helper */
export function getOperationBody(op: string): string {
  return op.replaceAll('-', ' ').replace(/^\w/, (c) => c.toUpperCase())
}

/** @riviere-role workflow-domain-helper */
export function getTransitionTitle(to: string): string {
  return to
}
