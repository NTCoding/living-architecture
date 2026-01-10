All UI and UX styling MUST conform to brand guidelines in `/docs/brand`. 100% adherence to brand guidelines is mandatory.

## VitePress Routing Gotcha

VitePress intercepts link clicks for client-side navigation. If you need links to bypass VitePress routing (e.g., links to the eclair app):

1. VitePress calls `event.preventDefault()` in the **capture phase** before your handlers run
2. Checking `event.defaultPrevented` will always be `true` - don't use it
3. Use `event.stopImmediatePropagation()` to prevent VitePress from handling the click
4. Register your handler with capture phase: `addEventListener('click', handler, true)`

See `eclairLinkHandler.ts` for the implementation.
