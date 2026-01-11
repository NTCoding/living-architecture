export class TestAssertionError extends Error {
  constructor(message: string) {
    super(message)
    this.name = 'TestAssertionError'
  }
}

export function assertDefined<T>(
  value: T | undefined | null,
  message = 'Expected value to be defined',
): T {
  if (value === undefined || value === null) {
    throw new TestAssertionError(message)
  }
  return value
}

export function assertHTMLInputElement(
  element: Element | null,
  message = 'Expected HTMLInputElement',
): HTMLInputElement {
  if (!(element instanceof HTMLInputElement)) {
    throw new TypeError(message)
  }
  return element
}
