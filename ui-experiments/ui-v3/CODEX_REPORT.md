# UI v3 Audit Report (ui/v3-story)

## What I checked
- Route/slug preservation: catch-all route uses `raw/routes/routes.txt` and excludes `/image-gallery/` + `/video-gallery/` so explicit pages handle those routes.
- Media routing: `/raw-asset/[...path]` serves local crawl media from `raw/har_bodies` + `raw/assets/live`.
- Gallery rendering: `src/app/image-gallery/page.tsx` uses scraper URLs (`raw/scrapy/pages.jsonl`) and resolves them to local `/raw-asset/...` paths when the bytes exist locally.
- Word-per-line content: `src/lib/raw-content.ts` collapses token-like line runs before converting to blocks, preventing per-word `<p>` output.

## Decisions
- Keep crawled slug structure as the source of truth.
- Keep media mapping via `/raw-asset/*` instead of copying into `public/` by default.

## Hurdles / gotchas
- Scrapy re-crawl currently hits a JS challenge (403), so “redo scrape” likely needs Playwright.
- Full-page screenshots may miss lazy-loaded images below fold unless you scroll.

## Suggested follow-ups
- Download remaining missing gallery URLs into `raw/assets/live` to increase coverage.
- If you want full-fidelity content (beyond “text blocks”), consider parsing `content_html` into structured blocks instead of `content_text`.

