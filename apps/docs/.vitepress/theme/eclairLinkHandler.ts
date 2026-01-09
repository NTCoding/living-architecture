/**
 * Determines if a path should be handled as an eclair link.
 * Eclair is a separate SPA that needs full page navigation, not VitePress routing.
 */
export function isEclairPath(href: string): boolean {
  const basePath = href.split('#')[0]
  return (
    basePath === '/eclair' || basePath.startsWith('/eclair/') || basePath.startsWith('/eclair?')
  )
}

/**
 * Creates a click handler that intercepts eclair links and forces full page navigation.
 * This bypasses VitePress's client-side router which would otherwise show a 404.
 *
 * @param navigate - Function to perform navigation (defaults to setting window.location.href)
 * @returns Click event handler
 */
export function createEclairClickHandler(
  navigate: (href: string) => void = (href) => {
    window.location.href = href
  },
): (event: MouseEvent) => void {
  return (event: MouseEvent): void => {
    if (event.ctrlKey || event.metaKey || event.shiftKey || event.altKey || event.button !== 0) {
      return
    }

    const target = event.target
    if (!(target instanceof Element)) {
      return
    }

    const link = target.closest('a')
    if (link === null) {
      return
    }

    const href = link.getAttribute('href')
    if (href === null || !isEclairPath(href)) {
      return
    }

    event.preventDefault()
    event.stopImmediatePropagation()
    navigate(href)
  }
}

/**
 * Initializes the eclair link handler on the document.
 * Uses capture phase to intercept clicks before VitePress can handle them.
 *
 * @returns Cleanup function to remove the event listener
 */
export function initEclairLinkHandler(): () => void {
  const handler = createEclairClickHandler()
  document.addEventListener('click', handler, true)
  return () => document.removeEventListener('click', handler, true)
}
