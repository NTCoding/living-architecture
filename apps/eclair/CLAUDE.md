# Éclair - Rivière viewer

Eclair is a web application for viewing software architecture. Éclair uses Rivière graphs.

Architecture defined in [ADR-007](../../docs/architecture/adr/ADR-007-eclair-architecture.md).

## Brand Identity, theme, design

All UI and UX design must conform to:
- Global brand guidelines: `/docs/brand/` (logo, colors, typography, icons)
- Éclair-specific design system: `/apps/eclair/docs/brand/` (themes, components, graph visualization, accessibility)

## Event Listener Cleanup

When adding document/window event listeners in Vue components, always clean up on unmount to prevent memory leaks.

**Bad:**
```typescript
onMounted(() => {
  document.addEventListener('click', handler)
})
```

**Good:**
```typescript
const cleanup = ref<(() => void) | null>(null)

onMounted(() => {
  const handler = (event: MouseEvent) => { /* ... */ }
  document.addEventListener('click', handler)
  cleanup.value = () => document.removeEventListener('click', handler)
})

onUnmounted(() => cleanup.value?.())
```
