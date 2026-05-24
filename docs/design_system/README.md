# PassTo Design System Assets

Drop-in brand assets for designers and web developers. Every asset is provided as a transparent SVG master where applicable, plus PNG raster exports at common display sizes.

This folder is the canonical location for PassTo brand, logo, app icon, favicon, and wallet pass image assets.

## Current folder layout

```text
/docs/design_system/
├── README.md
├── logos/          Logos, app icons, favicons, and related brand marks
└── screenshots/    Wallet pass images and pass-card screenshots
```

## Asset groups

### `/docs/design_system/logos/`

Contains:

- Primary logo lockups
- Secondary logo lockups
- Wordmarks
- Monograms / submarks
- App icons
- Favicons
- Platform icon variants

Use these assets for:

- Marketing pages
- App shell branding
- Favicons
- App icons
- Sales collateral
- Product documentation
- Brand references

### `/docs/design_system/screenshots/`

Contains:

- Wallet pass images
- Pass-card screenshots
- Pass state examples
- Share-flow visual references where applicable

Use these assets for:

- Product screenshots
- Marketing references
- QA comparison
- Pass-card visual implementation guidance
- Decks and external-facing product materials

## Color & font reference

Quick reference:

| Token | Hex | Use |
|---|---:|---|
| Ink-900 | `#0B1220` | Card body, primary text |
| Verified-400 | `#2FB069` | The bar, live pulse, accent |
| Verified-600 | `#14753F` | "To" on light, primary action |
| Paper-050 | `#FAF8F4` | Default page background |
| Amber-500 | `#C8830C` | Expiring state |
| Red-600 | `#B42318` | Revoked / expired |

Fonts:

- **Inter** — display
- **Public Sans** — body
- **IBM Plex Mono** — credential

## Usage rules

### Favicons

Use the favicon assets from:

```text
/docs/design_system/logos/
```

Recommended HTML pattern, adjusted to the final deployed asset paths:

```html
<link rel="icon" type="image/svg+xml" href="/path-to-favicon.svg">
<link rel="icon" type="image/png" sizes="32x32" href="/path-to-favicon-32.png">
<link rel="apple-touch-icon" sizes="180x180" href="/path-to-apple-touch-icon.png">
<link rel="mask-icon" href="/path-to-favicon-mask.svg" color="#0B1220">
```

### iOS app icons

The 1024 SVG/PNG is the master. Apple masks the squircle at OS level — never bake the corner radius into the PNG.

### Android adaptive icons

Use the foreground, background, and monochrome icon assets where provided. The monochrome SVG should drive Android 13+ themed icons.

### Clearspace

Keep half the cap height of the wordmark, or half the chip side, of empty space around any lockup. Never crop into the monogram.

### Minimum sizes

- 16×16 for favicon SVG
- 14px wordmark height
- 180×180 apple-touch

Below those sizes, use the outline monogram instead of the chip variant because the bar can collapse visually at very small sizes.

### Pass cards

Wallet pass images and pass-card screenshots live in:

```text
/docs/design_system/screenshots/
```

The SVG/PNG exports are flat, exportable references. For in-product display, build the live component rather than embedding screenshots as UI.

## Implementation guidance

Frontend, user-facing, brand, marketing, notification, and customer-facing tasks must reference this folder before execution.

Codex should identify relevant design sources in task specs:

```text
Design System Impact:
Design Source:
```

Claude should document any deviation from these assets or standards in implementation notes.

## Provenance

Assets are generated from the design-system tokens where applicable, not hand-traced. Prefer SVG masters for scaling and use PNG exports only where raster assets are required.
