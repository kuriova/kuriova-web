# kuriova-web

kuriova.com: one fast static page that sends viewers to Kuriova's channels and gives partners a front door.
Astro (static output), strict TypeScript, plain CSS, two font packages. No server, no database, no cookies.

```sh
npm install
npm run dev       # http://localhost:4321
npm run build     # writes dist/
npm run preview   # serves dist/
```

## Add or launch a channel

Each channel or venture is one file in `src/content/units/`. The file drives the home card, the footer column,
the `/links` section and, once `"status": "live"`, the page at `/<slug>`.

```json
{
  "slug": "history",
  "name": "Kuriova History",
  "status": "soon",
  "order": 2,
  "accent": "#F59E0B",
  "tagline": "One sentence, shown on the card and as the page description."
}
```

To launch it, set `"status": "live"` and add `youtubeChannelId` (the `UC…` id) and `links`
(`youtube`, `instagram`, `tiktok`, `facebook`, `x`, all optional except `youtube`). Optional fields: `title` (the
page title), `pillars`. The build fails with a clear message if a file breaks the schema in
`src/content.config.ts`, for example a live unit with no YouTube link or a slug that clashes with a page.

Put a 1200×630 `public/brand/og-<slug>.png` in place and the unit page uses it as its social image; until then it
falls back to `og-kuriova.png`.

## Latest videos

Read at build time from YouTube's public feeds, so there is no API key or quota. The site uses the channel's
long-form uploads playlist (`UULF…`) so Shorts stay out of the 16:9 row, and falls back to the full channel feed.
With no uploads yet, the row shows "First documentary coming soon".

On Vercel, a feed error fails the build on purpose, so the last good deployment stays live. Locally it only warns.

The site rebuilds through a Vercel Deploy Hook: the server calls it nightly and, from Phase 1, after each publish.

```sh
curl -fsS -X POST "$WEB_DEPLOY_HOOK"
```

## Brand

- Tokens live in `src/styles/tokens.css`. The Brand bible tab of the Build Blueprint decides any style question.
- `src/components/Mark.astro` inlines the brand pack v1.1 master paths; the masters themselves are in
  `public/brand/mark/`. Favicons and app icons in `public/brand/` and `public/favicon.ico` come from the pack's
  `web/` folder. The two `og-*.png` social images are rendered from the master mark.
- `/brand/*` is served with a one-year `immutable` cache, so a changed brand file needs a **new filename**.
  Overwriting a file keeps returning visitors on the old one.

## Settings

`src/site.ts` holds the site title, description and contact email, plus:

- `analyticsToken`: the Cloudflare Web Analytics site token. It is public, so it is safe to commit. Leave it
  empty to load no analytics.
- `sameAs`: profiles that belong to Kuriova itself, such as the umbrella `@kuriova` accounts, for the JSON-LD.

Security headers, the CSP and caching live in `vercel.json`. The CSP allows no inline scripts. Astro is configured
never to inline scripts or fonts (`assetsInlineLimit: 0`), so keep it that way.
