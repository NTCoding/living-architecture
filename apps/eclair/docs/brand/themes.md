# Themes

Theme specifications for Stream, Voltage, and Circuit.

## Theme Switching

### Implementation

Use CSS custom properties with theme class on `<body>`:

```html
<body class="theme-stream">
  <!-- Application content -->
</body>
```

### JavaScript

```javascript
function setTheme(theme) {
  document.body.className = `theme-${theme}`;
  localStorage.setItem('eclair-theme', theme);
}

// Load saved theme
const savedTheme = localStorage.getItem('eclair-theme') || 'stream';
setTheme(savedTheme);
```

### Persistence

| Key | Values | Default |
|-----|--------|---------|
| `eclair-theme` | `stream`, `voltage`, `circuit` | `stream` |

---

## Stream Theme

**Philosophy:** Modern, flowing, professional with futuristic tech vibe
**Mode:** Light
**Use Case:** Default theme, marketing, primary presentation

### CSS Variables

```css
.theme-stream {
  --primary: #0D9488;
  --primary-dark: #06B6D4;
  --background: #F8FAFC;
  --surface: #FFFFFF;
  --surface-secondary: #F1F5F9;
  --border: #E2E8F0;
  --border-hover: #0D9488;
  --text: #1E293B;
  --text-secondary: #334155;
  --text-muted: #64748B;

  --border-radius-sm: 10px;
  --border-radius-md: 12px;
  --border-radius-lg: 16px;

  --transition: 0.3s ease;

  --shadow-sm: 0 4px 12px rgba(13, 148, 136, 0.3);
  --shadow-lg: 0 8px 24px rgba(13, 148, 136, 0.15);
}
```

### Spacing Scale

| Size | Value |
|------|-------|
| XS | 14px |
| S | 24px |
| M | 28px / 36px |
| L | 44px |
| XL | 56px |

---

## Voltage Theme

**Philosophy:** Cyberpunk, neon, electric, high-energy
**Mode:** Dark
**Use Case:** Dark mode, technical/developer focus

### CSS Variables

```css
.theme-voltage {
  --primary: #00D4FF;
  --primary-dark: #0066FF;
  --background: #0A0A0F;
  --surface: #1A1A24;
  --surface-secondary: #252535;
  --border: rgba(0, 212, 255, 0.2);
  --border-hover: #00D4FF;
  --text: #FFFFFF;
  --text-secondary: #A0A0B0;
  --text-muted: #606070;

  --border-radius-sm: 6px;
  --border-radius-md: 8px;
  --border-radius-lg: 8px;

  --transition: 0.2s;

  --glow-primary: 0 0 8px rgba(0, 212, 255, 0.3), 0 0 16px rgba(0, 212, 255, 0.2);
}
```

### Spacing Scale

| Size | Value |
|------|-------|
| XS | 12px |
| S | 20px |
| M | 24px / 32px |
| L | 40px |
| XL | 48px |

---

## Circuit Theme

**Philosophy:** Technical, minimal, GitHub-inspired, developer-first
**Mode:** Light
**Use Case:** Documentation, technical contexts, accessibility focus

### CSS Variables

```css
.theme-circuit {
  --primary: #0969DA;
  --background: #F6F8FA;
  --surface: #FFFFFF;
  --surface-secondary: #F6F8FA;
  --border: #D0D7DE;
  --border-hover: #0969DA;
  --text: #24292F;
  --text-secondary: #57606A;
  --text-muted: #6E7781;

  --border-radius-sm: 6px;
  --border-radius-md: 6px;
  --border-radius-lg: 6px;

  --transition: 0.15s;

  --shadow-sm: 0 1px 0 rgba(27, 31, 36, 0.04);
  --shadow-md: 0 3px 6px rgba(140, 149, 159, 0.15);
}
```

### Spacing Scale

| Size | Value |
|------|-------|
| XS | 10px |
| S | 16px |
| M | 20px / 24px |
| L | 32px |
| XL | 40px |

---

## Theme Toggle Component

### HTML

```html
<div class="theme-toggle" role="tablist" aria-label="Theme selection">
  <button class="theme-toggle-btn active" role="tab" aria-selected="true" data-theme="stream">
    <i class="ph ph-sun"></i>
    Stream
  </button>
  <button class="theme-toggle-btn" role="tab" aria-selected="false" data-theme="voltage">
    <i class="ph ph-moon"></i>
    Voltage
  </button>
  <button class="theme-toggle-btn" role="tab" aria-selected="false" data-theme="circuit">
    <i class="ph ph-minus"></i>
    Circuit
  </button>
</div>
```

### JavaScript

```javascript
const themeToggle = document.querySelector('.theme-toggle');
const themeBtns = themeToggle.querySelectorAll('.theme-toggle-btn');

function setTheme(theme) {
  document.body.className = `theme-${theme}`;
  localStorage.setItem('eclair-theme', theme);

  themeBtns.forEach(btn => {
    const isActive = btn.dataset.theme === theme;
    btn.classList.toggle('active', isActive);
    btn.setAttribute('aria-selected', isActive);
  });
}

themeBtns.forEach(btn => {
  btn.addEventListener('click', () => setTheme(btn.dataset.theme));
});

// Arrow key navigation
document.addEventListener('keydown', (e) => {
  if (!themeToggle.contains(document.activeElement)) return;
  const currentIndex = [...themeBtns].findIndex(btn => btn === document.activeElement);

  if (e.key === 'ArrowRight' || e.key === 'ArrowDown') {
    e.preventDefault();
    const nextIndex = (currentIndex + 1) % themeBtns.length;
    themeBtns[nextIndex].focus();
  } else if (e.key === 'ArrowLeft' || e.key === 'ArrowUp') {
    e.preventDefault();
    const prevIndex = (currentIndex - 1 + themeBtns.length) % themeBtns.length;
    themeBtns[prevIndex].focus();
  }
});

// Load saved theme
const savedTheme = localStorage.getItem('eclair-theme') || 'stream';
setTheme(savedTheme);
```

### Accessibility

- `role="tablist"` on container, `role="tab"` on buttons
- `aria-selected="true/false"` indicates active state
- Arrow key navigation cycles through options
- Minimum 44×44px touch target on mobile
