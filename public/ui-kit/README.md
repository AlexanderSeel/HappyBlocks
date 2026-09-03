# HappyBlocks UI / Item Kit

Open `/ui-kit/` while the Vite app is running for the visual overview.

## Design rule

Every item in this kit is intentionally standalone. There is no sprite sheet and no image that must be cropped before use. Copy the element markup and its class, or use `manifest.json` to consume the kit programmatically.

## Files

- `index.html` — visual overview and examples.
- `components.css` — self-contained kit styles.
- `manifest.json` — machine-readable component inventory with copy/paste examples.

## Component groups

- Primary, editor and destructive action buttons.
- Objective/status panels.
- Level cards.
- Standard, Heavy and Pulse projectile chips.
- HUD statistic blocks.
- Aim reticle.
- Power meter.
- Move, rotate, scale, undo and redo tools.

## Usage

```html
<link rel="stylesheet" href="/ui-kit/components.css">
<button class="hb-button primary">PLAY</button>
```

```html
<span class="hb-chip heavy">HEAVY ×2</span>
```

```html
<div class="hb-stat">
  <small>SCORE</small>
  <strong>12,840</strong>
</div>
```

The main HappyBlocks UI imports the same design language from `src/ui-kit.css`, so the kit is a reference surface for production components rather than a disconnected mockup.
