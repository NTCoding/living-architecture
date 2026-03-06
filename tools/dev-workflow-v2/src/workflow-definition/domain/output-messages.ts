export function getOperationBody(op: string): string {
  return op.replaceAll('-', ' ').replace(/^\w/, (c) => c.toUpperCase())
}

export function getTransitionTitle(to: string): string {
  return to
}
