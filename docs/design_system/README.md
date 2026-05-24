# PassTo Logo Suite & Pass Cards

Drop-in brand assets for designers and web developers. Every asset is provided
as a transparent SVG (master, infinitely scalable) plus PNG raster exports at
common display sizes. SVGs use the system font stack `'Inter', ui-sans-serif,
system-ui, sans-serif` — pair with the locally-bundled Inter for pixel-perfect
fidelity, or accept the system fallback.

Open `index.html` for a visual preview of every asset with download links.

## Folder layout

```
brand-suite/
├── index.html                    Visual preview (open this first)
├── 01-primary/                   Horizontal lockup (monogram + wordmark)
│   ├── primary-light.svg / .png  for light backgrounds
│   ├── primary-dark.svg  / .png  for dark / ink backgrounds
│   ├── primary-black.svg / .png  1-color (print, fax, embossing)
│   └── primary-white.svg / .png  1-color reverse
├── 02-secondary/                 Vertical stack (mark above wordmark)
│   ├── secondary-light.svg / .png
│   └── secondary-dark.svg  / .png
├── 03-wordmark/                  Text only
│   ├── wordmark-light.svg / .png
│   ├── wordmark-dark.svg  / .png
│   ├── wordmark-black.svg / .png
│   └── wordmark-white.svg / .png
├── 04-submarks/                  The P-chip (monogram)
│   ├── monogram-ink.svg / .png       canonical — ink chip, white P, green bar
│   ├── monogram-paper.svg / .png     paper chip for dark photo backgrounds
│   ├── monogram-inverse.svg / .png   white chip with ink P
│   ├── monogram-mono-black.svg / .png  1-color black
│   ├── monogram-mono-white.svg / .png  1-color white
│   └── monogram-outline.svg / .png   outlined chip for small sizes
├── 05-app-icons/
│   ├── app-icon-ios-1024.svg     iOS master (squircle-masked at OS level)
│   ├── app-icon-ios-1024.png     1024 PNG export
│   ├── app-icon-ios-512.png      512 PNG export
│   ├── app-icon-ios-256.png      256 PNG export
│   ├── app-icon-ios-180.png      apple-touch-icon
│   ├── app-icon-ios-120.png      iPhone touch icon
│   ├── app-icon-ios-light-1024   light-mode iOS variant
│   ├── app-icon-ios-tinted-1024  1-color tinted variant
│   ├── android-adaptive-foreground-432  foreground layer (P + bar, transparent)
│   ├── android-adaptive-background-432  background layer (solid ink)
│   ├── android-monochrome-432    themed-icon silhouette (Android 13+)
│   └── play-store-512            Google Play listing icon
├── 06-favicon/
│   ├── favicon.svg               primary — modern browsers
│   ├── favicon-adaptive.svg      dark-mode aware via prefers-color-scheme
│   ├── favicon-mask.svg          monochrome silhouette for Safari pinned tab
│   ├── favicon-16.png            legacy raster fallbacks
│   ├── favicon-32.png
│   ├── favicon-48.png
│   └── favicon-192.png           also serves as apple-touch fallback
└── 07-pass-cards/
    ├── pass-default.svg / .png   Verified state (Maria L. Reyes, NY)
    ├── pass-blank.svg / .png     Empty template (use for empty state)
    ├── pass-expiring.svg / .png  Amber banner (expires within 60 days)
    ├── pass-revoked.svg / .png   Red banner (license revoked)
    └── pass-share-flow.svg / .png  Full-screen large-QR variant
```

## Color & font reference

Inherits the system tokens from `colors_and_type.css` at the project root.
Quick reference:

| Token         | Hex       | Use                          |
|---------------|-----------|------------------------------|
| Ink-900       | `#0B1220` | Card body, primary text      |
| Verified-400  | `#2FB069` | The bar, live pulse, accent  |
| Verified-600  | `#14753F` | "To" on light, primary action|
| Paper-050     | `#FAF8F4` | Default page bg              |
| Amber-500     | `#C8830C` | Expiring state               |
| Red-600       | `#B42318` | Revoked / expired            |

Fonts: **Inter** (display), **Public Sans** (body), **IBM Plex Mono** (credential).
All bundled locally in `/fonts/` at the project root.

## Usage tips

**Favicons — drop-in HTML:**

```html
<link rel="icon" type="image/svg+xml" href="/brand-suite/06-favicon/favicon-adaptive.svg">
<link rel="icon" type="image/png" sizes="32x32" href="/brand-suite/06-favicon/favicon-32.png">
<link rel="apple-touch-icon" sizes="180x180" href="/brand-suite/06-favicon/favicon-192.png">
<link rel="mask-icon" href="/brand-suite/06-favicon/favicon-mask.svg" color="#0B1220">
```

**iOS app icons:** the 1024 SVG/PNG is the master. Apple masks the squircle at
OS level — never bake the corner radius into your PNG. The light/tinted
variants are the iOS 18+ alternate icon styles.

**Android adaptive icons:** use the FG + BG pair (108×108dp each at any scale).
The monochrome SVG drives Android 13+ themed icons. Place all three in your
mipmap-anydpi-v26 `adaptive-icon.xml`.

**Clearspace:** keep half the cap height of the wordmark (or half the chip's
side) of empty space around any lockup. Never crop into the monogram.

**Minimum sizes:** 16×16 for the favicon SVG, 14px wordmark height,
180×180 apple-touch. Below those sizes, use the outline monogram instead of
the chip variant — the bar collapses at very small sizes.

**Pass cards:** the canonical recipe lives in `/components.css`
(`.pt-pass`, `.pt-pass-head`, etc.). The SVG exports here are flat, exportable
copies — use them in marketing decks, screenshots, and slides. For in-product
display, build the live React component (see `/ui_kits/mobile/PassCard.jsx`).

## Provenance

All assets were generated from the design-system tokens, not hand-traced.
The Inter font is embedded into PNG exports at render-time to ensure
consistent typography across operating systems. Re-renders are reproducible
from the SVG masters using the build script in the project history.
