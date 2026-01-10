import {
  describe, it, expect, vi, beforeEach, afterEach 
} from 'vitest'
import {
  isEclairPath, createEclairClickHandler, initEclairLinkHandler 
} from './eclairLinkHandler'

describe('isEclairPath', () => {
  it('returns true for /eclair', () => {
    expect(isEclairPath('/eclair')).toBe(true)
  })

  it('returns true for /eclair/', () => {
    expect(isEclairPath('/eclair/')).toBe(true)
  })

  it('returns true for /eclair/?demo=true', () => {
    expect(isEclairPath('/eclair/?demo=true')).toBe(true)
  })

  it('returns true for /eclair?demo=true', () => {
    expect(isEclairPath('/eclair?demo=true')).toBe(true)
  })

  it('returns true for /eclair/some/path', () => {
    expect(isEclairPath('/eclair/some/path')).toBe(true)
  })

  it('returns true for path with hash fragment', () => {
    expect(isEclairPath('/eclair/#section')).toBe(true)
  })

  it('returns false for /', () => {
    expect(isEclairPath('/')).toBe(false)
  })

  it('returns false for /get-started/', () => {
    expect(isEclairPath('/get-started/')).toBe(false)
  })

  it('returns false for /eclair-hero.png', () => {
    expect(isEclairPath('/eclair-hero.png')).toBe(false)
  })

  it('returns false for /reference/eclair', () => {
    expect(isEclairPath('/reference/eclair')).toBe(false)
  })
})

describe('createEclairClickHandler', () => {
  const originalLocation = window.location

  beforeEach(() => {
    vi.restoreAllMocks()
  })

  afterEach(() => {
    Object.defineProperty(window, 'location', {
      value: originalLocation,
      writable: true,
      configurable: true,
    })
  })

  function createMockEvent(overrides: Partial<MouseEvent> = {}): MouseEvent {
    const mockEvent = new MouseEvent('click', {
      ctrlKey: overrides.ctrlKey ?? false,
      metaKey: overrides.metaKey ?? false,
      shiftKey: overrides.shiftKey ?? false,
      altKey: overrides.altKey ?? false,
      button: overrides.button ?? 0,
    })
    vi.spyOn(mockEvent, 'preventDefault')
    vi.spyOn(mockEvent, 'stopImmediatePropagation')
    if (overrides.target !== undefined) {
      Object.defineProperty(mockEvent, 'target', {
        value: overrides.target,
        writable: false,
      })
    }
    return mockEvent
  }

  function createMockLink(href: string): HTMLAnchorElement {
    const link = document.createElement('a')
    link.setAttribute('href', href)
    return link
  }

  it('navigates to eclair link on click', () => {
    const mockNavigate = vi.fn()
    const handler = createEclairClickHandler(mockNavigate)
    const link = createMockLink('/eclair/?demo=true')
    const event = createMockEvent({ target: link })

    handler(event)

    expect(event.preventDefault).toHaveBeenCalledWith()
    expect(event.stopImmediatePropagation).toHaveBeenCalledWith()
    expect(mockNavigate).toHaveBeenCalledWith('/eclair/?demo=true')
  })

  it('does not navigate when ctrl key is pressed', () => {
    const mockNavigate = vi.fn()
    const handler = createEclairClickHandler(mockNavigate)
    const link = createMockLink('/eclair/')
    const event = createMockEvent({
      target: link,
      ctrlKey: true,
    })

    handler(event)

    expect(mockNavigate).not.toHaveBeenCalled()
  })

  it('does not navigate when meta key is pressed', () => {
    const mockNavigate = vi.fn()
    const handler = createEclairClickHandler(mockNavigate)
    const link = createMockLink('/eclair/')
    const event = createMockEvent({
      target: link,
      metaKey: true,
    })

    handler(event)

    expect(mockNavigate).not.toHaveBeenCalled()
  })

  it('does not navigate when shift key is pressed', () => {
    const mockNavigate = vi.fn()
    const handler = createEclairClickHandler(mockNavigate)
    const link = createMockLink('/eclair/')
    const event = createMockEvent({
      target: link,
      shiftKey: true,
    })

    handler(event)

    expect(mockNavigate).not.toHaveBeenCalled()
  })

  it('does not navigate when alt key is pressed', () => {
    const mockNavigate = vi.fn()
    const handler = createEclairClickHandler(mockNavigate)
    const link = createMockLink('/eclair/')
    const event = createMockEvent({
      target: link,
      altKey: true,
    })

    handler(event)

    expect(mockNavigate).not.toHaveBeenCalled()
  })

  it('does not navigate on middle click', () => {
    const mockNavigate = vi.fn()
    const handler = createEclairClickHandler(mockNavigate)
    const link = createMockLink('/eclair/')
    const event = createMockEvent({
      target: link,
      button: 1,
    })

    handler(event)

    expect(mockNavigate).not.toHaveBeenCalled()
  })

  it('does not navigate when target is not an Element', () => {
    const mockNavigate = vi.fn()
    const handler = createEclairClickHandler(mockNavigate)
    const event = createMockEvent({ target: null })

    handler(event)

    expect(mockNavigate).not.toHaveBeenCalled()
  })

  it('does not navigate when click is not on a link', () => {
    const mockNavigate = vi.fn()
    const handler = createEclairClickHandler(mockNavigate)
    const div = document.createElement('div')
    const event = createMockEvent({ target: div })

    handler(event)

    expect(mockNavigate).not.toHaveBeenCalled()
  })

  it('does not navigate when link has no href', () => {
    const mockNavigate = vi.fn()
    const handler = createEclairClickHandler(mockNavigate)
    const link = document.createElement('a')
    const event = createMockEvent({ target: link })

    handler(event)

    expect(mockNavigate).not.toHaveBeenCalled()
  })

  it('does not navigate for non-eclair links', () => {
    const mockNavigate = vi.fn()
    const handler = createEclairClickHandler(mockNavigate)
    const link = createMockLink('/get-started/')
    const event = createMockEvent({ target: link })

    handler(event)

    expect(mockNavigate).not.toHaveBeenCalled()
  })

  it('navigates when click is on child element inside link', () => {
    const mockNavigate = vi.fn()
    const handler = createEclairClickHandler(mockNavigate)
    const link = createMockLink('/eclair/')
    const span = document.createElement('span')
    link.appendChild(span)
    const event = createMockEvent({ target: span })

    handler(event)

    expect(mockNavigate).toHaveBeenCalledWith('/eclair/')
  })

  it('uses default navigate function that sets window.location.href', () => {
    const capturedHrefs: string[] = []
    const locationMock = {
      set href(value: string) {
        capturedHrefs.push(value)
      },
    }
    Object.defineProperty(window, 'location', {
      value: locationMock,
      writable: true,
      configurable: true,
    })

    const handler = createEclairClickHandler()
    const link = createMockLink('/eclair/?demo=true')
    const event = createMockEvent({ target: link })

    handler(event)

    expect(capturedHrefs).toContain('/eclair/?demo=true')
  })
})

describe('initEclairLinkHandler', () => {
  it('adds click event listener with capture phase', () => {
    const addEventListenerSpy = vi.spyOn(document, 'addEventListener')

    try {
      initEclairLinkHandler()

      expect(addEventListenerSpy).toHaveBeenCalledWith('click', expect.any(Function), true)
    } finally {
      addEventListenerSpy.mockRestore()
    }
  })

  it('returns cleanup function that removes the same handler instance', () => {
    const captured: { handler?: EventListenerOrEventListenerObject | null } = {}
    const addEventListenerSpy = vi
      .spyOn(document, 'addEventListener')
      .mockImplementation((_type, handler) => {
        captured.handler = handler
      })
    const removeEventListenerSpy = vi.spyOn(document, 'removeEventListener')

    try {
      const cleanup = initEclairLinkHandler()

      cleanup()

      expect(captured.handler).toBeDefined()
      expect(removeEventListenerSpy).toHaveBeenCalledWith('click', captured.handler, true)
    } finally {
      addEventListenerSpy.mockRestore()
      removeEventListenerSpy.mockRestore()
    }
  })
})
