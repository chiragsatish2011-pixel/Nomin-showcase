# Nomin Code — landing page

Static marketing site for [Nomin Code](https://nomin-ai-nine.vercel.app/).
No build step, no framework, no dependencies.

```bash
python -m http.server 4173
```

Then open <http://localhost:4173>.

## Deploy

Vercel, as a static site. No build command and no output directory — point a
project at this repo and it serves the root. `vercel.json` sets `cleanUrls`,
long-lived caching for `assets/`, must-revalidate for HTML/CSS/JS, and a few
baseline security headers.

**When you change CSS or JS, bump the `?v=` query in `index.html`.** The files
are versioned by query string rather than hashed filenames, and a fix shipped
under an unchanged version will be served from cache and look like it never
landed.

## Files

```
index.html     the page
styles.css     tokens, components, responsive rules
motion.js      scroll reveal, tabs, copy-to-clipboard, disclosures, composer demo
globe.js       the interactive globe
assets/        logo mark (full size for structured data, 256px for the page)
robots.txt     allows all crawlers, points to the sitemap
sitemap.xml    public pages for search engines — bump <lastmod> when content changes
vercel.json    hosting config
DESIGN.md      the Raycast style reference this started from
```

## The globe

`globe.js` is a vanilla port of Originkit's "Globe Study". The original is
React/TSX; this site has no build step, so the React scaffolding was replaced
with a plain IIFE that mounts into `.globe` and reads config from `data-*`
attributes. The projection maths, land bitmap and interaction model are
unchanged.

Its continents are written in one sentence:
*describe the outcome, Nomin plans it, builds it, verifies it.*

Differences from the original, deliberately:

- **No wheel handler.** The original zooms on scroll, which hijacks the page
  on a landing page.
- **Sized to fit its container.** Drag to spin, click to drop a pin.
- An explicit circumference is stroked each frame; relying on the dot field to
  imply the limb left the sphere looking like a smudge.

## Performance

This page had a reported lag problem. These were the causes and all are gone:

| Removed | Why it was slow |
|---|---|
| SVG `feGaussianBlur` over ~2000x2000px | SVG filters rasterise on the CPU |
| `will-change` on a huge element | pinned a large layer permanently |
| infinite **scale** animation on a filtered element | forced the filter to re-raster every frame |
| `mix-blend-mode` across the hero | extra full-section blend pass |
| `mask-image` on the hero band | extra masking pass every paint |
| `background-attachment: fixed` | repaints the whole background on every scroll frame |
| `backdrop-filter: blur(48px)` | recomputed every scroll frame; now 12px |
| A full-screen WebGL cursor-ring field | an entire GL renderer running behind the page |

All atmosphere is now plain CSS gradients on a fixed `body::before` layer,
which rasterises once. Animations touch transform/opacity only.

### Low-end mode

An inline script runs before first paint. If the machine reports
`deviceMemory <= 4` or `hardwareConcurrency <= 4`, `html` gets `.perf-lite`,
which drops the nav's backdrop-filter, the decorative loops and the globe
canvas. Force it on:

```js
localStorage.setItem('nomin.lite', '1')
```

## Content

The **"The standard"** section is not invented copy. It is the quality bar
Nomin ships inside its own starter briefs — real copy everywhere, one type
scale and one accent, responsive from 360px, 4.5:1 contrast and visible focus
rings, motion under 400ms, and "a button that does nothing is a bug, not a
placeholder".

## Known issues in the live app (not this site)

Observed while testing <https://nomin-ai-nine.vercel.app/>:

1. All five starter chips (Landing page, Web app, Dashboard, Mini game,
   Personal site) load the **same** brief — the Severin Halbe pianist one.
2. Submitting a brief does not start a run; the rail stays `Status: Idle`.
   The deployed app is a front end without a live backend.

Marketing copy here was kept to claims that could be verified.
