# Components

Component specifications for Éclair UI elements.

## Buttons

### Primary Button

| Property | Stream | Voltage | Circuit |
|----------|--------|---------|---------|
| Height | 40px | 36px | 32px |
| Padding | 10px 20px | 8px 16px | 5px 16px |
| Border Radius | 10px | 6px | 6px |
| Font | Rubik 500 14px | Space Grotesk 500 13px | Inter 500 14px |

**Stream:**
```css
.btn-primary {
  background: linear-gradient(90deg, #0D9488, #06B6D4);
  color: white;
  border: none;
  border-radius: 10px;
  padding: 10px 20px;
  font: 500 14px 'Rubik';
  box-shadow: 0 4px 12px rgba(13, 148, 136, 0.3);
  cursor: pointer;
  transition: all 0.3s ease;
}
.btn-primary:hover {
  transform: translateY(-2px);
  box-shadow: 0 6px 16px rgba(13, 148, 136, 0.4);
}
.btn-primary:focus-visible {
  outline: 2px solid #0D9488;
  outline-offset: 2px;
}
```

**Voltage:**
```css
.btn-primary {
  background: linear-gradient(135deg, #00D4FF, #0066FF);
  color: white;
  border: 1px solid rgba(0, 212, 255, 0.3);
  border-radius: 6px;
  padding: 8px 16px;
  font: 500 13px 'Space Grotesk';
  box-shadow: 0 0 8px rgba(0, 212, 255, 0.3);
  cursor: pointer;
  transition: all 0.2s;
}
.btn-primary:hover {
  box-shadow: 0 0 16px rgba(0, 212, 255, 0.5);
  border-color: #00D4FF;
}
```

**Circuit:**
```css
.btn-primary {
  background: #0969DA;
  color: white;
  border: 1px solid #0969DA;
  border-radius: 6px;
  padding: 5px 16px;
  font: 500 14px 'Inter';
  box-shadow: 0 1px 0 rgba(27, 31, 36, 0.04);
  cursor: pointer;
  transition: all 0.15s;
}
.btn-primary:hover {
  background: #0860CA;
}
```

### Secondary Button

| Property | Stream | Voltage | Circuit |
|----------|--------|---------|---------|
| Background | white | #1A1A24 | white |
| Border | 2px #E2E8F0 | 1px rgba(0,212,255,0.2) | 1px #D0D7DE |
| Color | #0D9488 | #A0A0B0 | #24292F |

---

## Cards

### Content Card

| Property | Stream | Voltage | Circuit |
|----------|--------|---------|---------|
| Padding | 24px | 20px | 16px |
| Border Radius | 16px | 8px | 6px |
| Border | 2px #E2E8F0 | 1px rgba(0,212,255,0.2) | 1px #D0D7DE |

**Stream:**
```css
.card {
  background: white;
  border: 2px solid #E2E8F0;
  border-radius: 16px;
  padding: 24px;
  position: relative;
  overflow: hidden;
  transition: all 0.3s ease;
}
.card::before {
  content: '';
  position: absolute;
  left: 0;
  top: 0;
  bottom: 0;
  width: 0;
  background: linear-gradient(90deg, #0D9488, #06B6D4);
  transition: width 0.3s ease;
}
.card:hover {
  border-color: #0D9488;
  transform: translateY(-2px);
  box-shadow: 0 8px 24px rgba(13, 148, 136, 0.15);
}
.card:hover::before {
  width: 4px;
}
```

---

## Stat Boxes

| Property | Stream | Voltage | Circuit |
|----------|--------|---------|---------|
| Min Width | 110px | 100px | 90px |
| Padding | 16px 20px | 14px 18px | 12px 16px |
| Border Radius | 16px | 8px | 6px |
| Value Size | 28px | 24px | 24px |

**Stream:**
```css
.stat-box {
  background: white;
  border: 2px solid #E2E8F0;
  border-radius: 16px;
  padding: 16px 20px;
  min-width: 110px;
}
.stat-label {
  font: 600 12px 'Rubik';
  color: #334155;
  text-transform: uppercase;
  letter-spacing: 0.5px;
  margin-bottom: 6px;
}
.stat-value {
  font: 700 28px 'Rubik';
  background: linear-gradient(90deg, #0D9488, #06B6D4);
  -webkit-background-clip: text;
  -webkit-text-fill-color: transparent;
}
```

---

## Method Badges

HTTP verb indicators.

| Property | Stream | Voltage | Circuit |
|----------|--------|---------|---------|
| Font Size | 11px | 10px | 11px |
| Padding | 4px 9px | 3px 7px | 2px 6px |
| Border Radius | 6px | 4px | 3px |

**Verb Colors (Stream):**
```css
.method-verb.get {
  background: linear-gradient(135deg, rgba(13, 148, 136, 0.2), rgba(6, 182, 212, 0.2));
  color: #0D9488;
}
.method-verb.post {
  background: rgba(6, 182, 212, 0.15);
  color: #06B6D4;
}
.method-verb.put {
  background: rgba(245, 158, 11, 0.15);
  color: #F59E0B;
}
.method-verb.delete {
  background: rgba(255, 107, 107, 0.15);
  color: #FF6B6B;
}
.method-verb.patch {
  background: rgba(139, 92, 246, 0.15);
  color: #8B5CF6;
}
```

---

## Tooltips

| Property | Stream | Voltage | Circuit |
|----------|--------|---------|---------|
| Padding | 16px 18px | 14px 16px | 12px |
| Border Radius | 12px | 8px | 6px |
| Max Width | 300px | 300px | 280px |

**Stream:**
```css
.tooltip {
  position: absolute;
  padding: 16px 18px;
  background: rgba(255, 255, 255, 0.98);
  color: #1E293B;
  border-radius: 12px;
  border: 2px solid #E2E8F0;
  box-shadow: 0 8px 24px rgba(0, 0, 0, 0.12);
  max-width: 300px;
  font: 400 12px 'Lato';
  line-height: 1.6;
  pointer-events: none;
  z-index: 1000;
}
.tooltip-title {
  font: 700 14px 'Rubik';
  background: linear-gradient(90deg, #0D9488, #06B6D4);
  -webkit-background-clip: text;
  -webkit-text-fill-color: transparent;
  margin-bottom: 8px;
}
```

---

## Dropdowns

| Property | Stream | Voltage | Circuit |
|----------|--------|---------|---------|
| Height | 40px | 36px | 32px |
| Padding | 10px 20px | 8px 16px | 5px 16px |
| Border Radius | 10px | 6px | 6px |
| Min Width | 180px | 150px | 180px |

---

## Icon Wrappers

Colored container for icons in card headers.

| Property | Stream | Voltage | Circuit |
|----------|--------|---------|---------|
| Size | 48×48px | 44×44px | 36×36px |
| Border Radius | 12px | 8px | 6px |

**Variants:**
- **Accent:** Primary color gradient
- **Success:** Secondary/positive color
- **Warning:** Alert color
- **Danger:** Error color

---

## Responsive Breakpoints

```css
@media (max-width: 768px) {
  .card-grid {
    grid-template-columns: 1fr;
  }
  .stats-row {
    flex-wrap: wrap;
  }
  .page-header {
    flex-direction: column;
    gap: 20px;
  }
}

@media (min-width: 769px) and (max-width: 1024px) {
  .card-grid {
    grid-template-columns: repeat(auto-fill, minmax(350px, 1fr));
  }
}
```
