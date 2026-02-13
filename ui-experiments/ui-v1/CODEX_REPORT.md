# UI v1 Audit Report (ui/v1-aurora)

## What I checked
- Route/slug preservation: `src/app/[...slug]/page.tsx` uses `raw/routes/routes.txt` for `generateStaticParams`, and explicitly excludes `/image-gallery/` + `/video-gallery/` so the dedicated routes win.
- Media routing: `/raw-asset/[...path]` route exists and serves from `raw/har_bodies` + `raw/assets/live`.
- Gallery rendering: `src/app/image-gallery/page.tsx` maps scraped URLs → local `/raw-asset/...` paths and shows a fallback message if some assets are missing locally.
- “1 word per paragraph” symptom: `src/lib/raw-content.ts` now collapses token-like line runs into real sentences/paragraphs before `linesToBlocks()`.

## Decisions
- Prefer `/raw-asset/*` for scraped media so routes stay faithful to the original site structure without needing to copy everything into `public/`.
- Keep `/image-gallery/` + `/video-gallery/` as explicit routes and reserve them out of catch-all static params.

## Hurdles / gotchas
- Zsh globbing: paths like `src/app/[...slug]/page.tsx` need quoting in shell commands.
- Full-page screenshots don’t scroll; lazy-loaded images below the fold may not render unless you scroll (the current screenshots use a wait, but no scroll).
- Only ~36/49 image-gallery URLs are present locally in this repo snapshot; remaining items will show as missing until downloaded.

## Suggested follow-ups
- If you want “complete” gallery parity, download the missing image-gallery URLs into `raw/assets/live` (or copy a curated set into `public/gallery`).
- If re-crawling is required, the origin site currently serves a JS challenge (Scrapy gets 403), so a Playwright-based crawler may be needed.

