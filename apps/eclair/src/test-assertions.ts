export function assertDefined<T>(
  value: T | undefined | null,
  message = 'Expected value to be defined',
): T {
  if (value === undefined || value === null) {
    throw new Error(message)
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
