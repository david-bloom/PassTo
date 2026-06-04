# Lovable Prompt: Migrate OG/Twitter Image to PassTo-Controlled Domain

**Task:** QA-008 remediation — Replace Lovable CDN OG/Twitter image with PassTo-controlled asset

**Priority:** P2 (social media / brand risk)

**Date:** 2026-06-04

---

## Background

The PassTo App's `index.html` social media metadata currently references OG and Twitter images hosted on Lovable's CDN (`pub-bb2e103a32db4e198524a2e9ed8f35b4.r2.dev/…lovable.app…png`). These images are not under PassTo's control and could change or disappear without notice.

**Current state:**
- `og:image`: `https://pub-bb2e103a32db4e198524a2e9ed8f35b4.r2.dev/…lovable.app…png` ❌
- `twitter:image`: `https://pub-bb2e103a32db4e198524a2e9ed8f35b4.r2.dev/…lovable.app…png` ❌
- All other metadata (title, description, card type) correctly set ✅

**Required fix:** Replace with PassTo-branded image on PassTo-controlled domain.

---

## What to Do

### 1. Create OG/Social Media Image

**Specifications:**
- **Dimensions:** 1200 × 630 pixels (standard OG image size)
- **Format:** PNG or JPEG
- **Brand:** PassTo branding (logo, colors from design system)
- **Content:** 
  - Headline: "PassTo — Digital Nursing Credentials"
  - Subtitle or tagline (optional): "Verified, Instant, Secure"
  - PassTo logo (top-left or center)
  - Clean, professional design
  - No Lovable branding

**Design guidance:**
- Use PassTo design system colors
- Consistent with App UI/branding
- Professional/polished (suitable for LinkedIn, Twitter, email shares)
- Readable at thumbnail size

### 2. Host on PassTo-Controlled Domain

**Options:**
- **Option A (Recommended):** Upload to your CDN or asset server (if you have one)
  - Path: `https://app.passtodigital.com/og-image.png` (or similar)
  - Requires: Asset hosting in your infrastructure
  - Benefit: Full control, no external dependencies

- **Option B:** Host on a static file service (if no CDN available yet)
  - GitHub Pages, Vercel, Netlify (PassTo-owned account)
  - Path: `https://assets.passtodigital.com/og-image.png` (or similar domain)
  - Benefit: Free/low-cost, reliable

- **Option C:** Include in Lovable App assets with explicit control
  - Path: `https://app.passtodigital.com/assets/og-image-[hash].png`
  - Add to public assets folder in Lovable
  - Update `index.html` to reference the public asset path

### 3. Update `index.html` Meta Tags

In `public/index.html` (or wherever meta tags are defined), update:

**Before:**
```html
<meta property="og:image" content="https://pub-bb2e103a32db4e198524a2e9ed8f35b4.r2.dev/...lovable.app...png">
<meta name="twitter:image" content="https://pub-bb2e103a32db4e198524a2e9ed8f35b4.r2.dev/...lovable.app...png">
```

**After (choose one hosting option above):**
```html
<meta property="og:image" content="https://app.passtodigital.com/og-image.png">
<meta property="og:image:width" content="1200">
<meta property="og:image:height" content="630">
<meta property="og:image:type" content="image/png">
<meta name="twitter:image" content="https://app.passtodigital.com/og-image.png">
```

### 4. Verify Image Loads

- Browser: Open DevTools → Network tab → filter by image → verify PNG loads 200 OK
- Social preview: Use Facebook Sharing Debugger or Twitter Card Validator to confirm image appears
- Alternative: Share a test link on Twitter/LinkedIn and verify preview shows correctly

---

## Acceptance Criteria

✅ **OG image created** (1200×630, PassTo-branded, no Lovable references)
✅ **Image hosted on PassTo-controlled domain** (not Lovable CDN)
✅ **Meta tags updated** in `index.html` with new URL
✅ **Image loads successfully** (HTTP 200, correct dimensions)
✅ **Social preview verified** (Facebook or Twitter Card Validator shows image)
✅ **TypeScript compiles** cleanly if any code changes made
✅ **No broken imports or references** to old Lovable image URL

---

## Test Plan (Claude will execute after deployment)

Once deployed, QA will verify:

1. View source on `https://app.passtodigital.com/` → confirm `og:image` and `twitter:image` point to PassTo domain
2. Network tab → confirm image loads from new URL (not Lovable CDN)
3. Facebook Sharing Debugger or equivalent → confirm preview displays correctly
4. No console errors related to image loading

---

## Timeline

- **Asset creation:** Design OG image (1-2 hours)
- **Hosting:** Upload to asset server (5-10 minutes)
- **Code update:** Modify `index.html` meta tags (2-5 minutes)
- **Verification:** Test social preview (5 minutes)
- **Deployment:** Deploy updated App (standard deployment pipeline)
- **QA verification:** After deployment (immediate)

---

## Related Context

- **Design system:** `/docs/design_system/` for brand colors, logo assets
- **OG standards:** [Open Graph Protocol](https://ogp.me/) (1200×630 recommended)
- **Twitter cards:** [Twitter Card documentation](https://developer.twitter.com/en/docs/twitter-for-websites/cards/overview/summary-large-image-card)
- **Testing tools:** 
  - Facebook: https://developers.facebook.com/tools/debug/
  - Twitter: https://cards-dev.twitter.com/validator

---

## Questions?

If you need design assets or have questions about hosting options, let me know before you start.

Once deployed and verified, QA-008 can move to `applied` status.

Co-Authored-By: Claude Haiku 4.5 <noreply@anthropic.com>
