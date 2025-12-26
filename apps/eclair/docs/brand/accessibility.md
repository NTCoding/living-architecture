# Accessibility

WCAG compliance, focus states, and screen reader support.

## Standards

- **Target:** WCAG 2.1 Level AA
- **Keyboard:** Full keyboard navigation
- **Screen readers:** Semantic HTML, ARIA labels
- **Contrast:** Minimum 4.5:1 for text, 3:1 for UI elements

---

## Contrast Ratios

### Stream

| Element | Foreground | Background | Ratio | Pass |
|---------|------------|------------|-------|------|
| Body text | #1E293B | #F8FAFC | 12.8:1 | ✓ AA |
| Teal on white | #0D9488 | #FFFFFF | 3.5:1 | ✓ Large |
| Coral on white | #FF6B6B | #FFFFFF | 3.8:1 | ✓ Large |
| Slate on gray | #334155 | #F1F5F9 | 8.7:1 | ✓ AA |

### Voltage

| Element | Foreground | Background | Ratio | Pass |
|---------|------------|------------|-------|------|
| White text | #FFFFFF | #0A0A0F | 19.6:1 | ✓ AAA |
| Electric blue | #00D4FF | #1A1A24 | 8.2:1 | ✓ AA |
| Gray text | #A0A0B0 | #0A0A0F | 6.4:1 | ✓ AA |
| Lime green | #39FF14 | #1A1A24 | 10.3:1 | ✓ AAA |
| Hot pink | #FF006E | #1A1A24 | 5.1:1 | ✓ AA |

### Circuit

| Element | Foreground | Background | Ratio | Pass |
|---------|------------|------------|-------|------|
| Body text | #24292F | #F6F8FA | 12.4:1 | ✓ AAA |
| Blue on white | #0969DA | #FFFFFF | 5.9:1 | ✓ AA |
| Green on white | #1A7F37 | #FFFFFF | 5.1:1 | ✓ AA |
| Gray-600 | #57606A | #FFFFFF | 5.4:1 | ✓ AA |
| Gray-500 | #6E7781 | #FFFFFF | 4.5:1 | ✓ AA |

---

## Focus States

### Stream

```css
:focus-visible {
  outline: 2px solid #0D9488;
  outline-offset: 2px;
  box-shadow: 0 0 0 3px rgba(13, 148, 136, 0.2);
}
```

### Voltage

```css
:focus-visible {
  outline: 2px solid #00D4FF;
  outline-offset: 2px;
  box-shadow: 0 0 8px rgba(0, 212, 255, 0.4);
}
```

### Circuit

```css
:focus-visible {
  outline: none;
  border-color: #0969DA;
  box-shadow: 0 0 0 3px #DDF4FF;
}
```

---

## Component Accessibility

| Component | Keyboard | Focus Visible | ARIA | Screen Reader |
|-----------|----------|---------------|------|---------------|
| Button | Enter/Space | ✓ | `role="button"` if not `<button>` | Announce label |
| Toggle | Arrow keys | ✓ | `role="tablist"`, `aria-selected` | Announce selected |
| Card | Tab to interactive | ✓ on interactive | `aria-labelledby` | Announce title |
| Dropdown | Enter/Space/Arrow | ✓ | `aria-expanded`, `aria-haspopup` | Announce options |
| Tooltip | N/A (triggered) | N/A | `role="tooltip"`, `aria-describedby` | Read on trigger focus |
| Method Item | Enter | ✓ | `role="button"` or `<a>` | Announce method + path |

---

## Keyboard Navigation

### Tab Order

- Tab through interactive elements in logical order
- Skip non-interactive content
- Respect DOM order (no CSS reordering that breaks logic)

### Arrow Keys

- Toggle groups: Left/Right cycles options
- Dropdowns: Up/Down navigates options
- Graphs: Arrow keys may pan viewport

### Escape

- Close modals, dropdowns, tooltips
- Exit focus traps

---

## Screen Reader Support

### Semantic HTML

```html
<!-- Use proper heading hierarchy -->
<h1>Page Title</h1>
<h2>Section</h2>
<h3>Subsection</h3>

<!-- Use semantic elements -->
<nav aria-label="Main navigation">...</nav>
<main>...</main>
<aside aria-label="Filters">...</aside>
```

### ARIA Labels

```html
<!-- Icon-only buttons -->
<button aria-label="Close dialog">
  <i class="ph ph-x"></i>
</button>

<!-- SVG icons -->
<svg role="img" aria-label="Graph visualization">...</svg>

<!-- Dynamic content -->
<div aria-live="polite" aria-atomic="true">
  <!-- Status updates announced to screen readers -->
</div>
```

### Links

```html
<!-- Descriptive link text -->
<a href="/docs">View documentation</a>

<!-- NOT -->
<a href="/docs">Click here</a>
```

---

## Motion & Animation

### Respect User Preferences

```css
@media (prefers-reduced-motion: reduce) {
  *,
  *::before,
  *::after {
    animation-duration: 0.01ms !important;
    animation-iteration-count: 1 !important;
    transition-duration: 0.01ms !important;
  }
}
```

---

## Touch Targets

Minimum touch target size: 44×44px

```css
.touch-target {
  min-width: 44px;
  min-height: 44px;
  display: flex;
  align-items: center;
  justify-content: center;
}
```

---

## Testing Checklist

- [ ] Navigate entire app with keyboard only
- [ ] Test with screen reader (VoiceOver, NVDA)
- [ ] Verify contrast with browser dev tools
- [ ] Check focus visibility on all interactive elements
- [ ] Test with reduced motion preference
- [ ] Verify touch targets on mobile
- [ ] Check heading hierarchy
- [ ] Verify alt text on images
- [ ] Test form labels and error messages
