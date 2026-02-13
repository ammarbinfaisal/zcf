# UI v4 Audit Report (ui/v4-dark)

## What I checked
- Route/slug preservation: `src/app/[...slug]/page.tsx` uses `raw/routes/routes.txt` for statics, and excludes `/image-gallery/` + `/video-gallery/`.
- Media routing: `/raw-asset/[...path]` route exists and serves bytes from `raw/har_bodies` + `raw/assets/live`.
- Gallery rendering: `src/app/image-gallery/page.tsx` renders `public/gallery` if populated, otherwise renders any locally-available `/raw-asset/...` images found by the scraper.
- Word-per-line content: `src/lib/raw-content.ts` collapses token-like line runs into real sentences before rendering.

## Decisions
- Preserve the scraped structure (routes + media URLs) and avoid renaming routes or media.
- Keep video gallery backed by `public/videos` for now (no reliable local video capture in this snapshot).

## Hurdles / gotchas
- Scrapy re-crawl currently receives a JS challenge (403), so “redo scrape” likely requires a browser crawler (Playwright) or existing crawl snapshots.
- Full-page screenshots can under-report lazy-loaded images unless you scroll.

## Suggested follow-ups
- If you want more gallery images available locally, download remaining image URLs into `raw/assets/live`.
- If you want to show “video gallery” content from the original site, extract and embed video links (YouTube iframes) from `content_html`.

