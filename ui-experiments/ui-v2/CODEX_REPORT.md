# UI v2 Audit Report (ui/v2-minimal)

## What I checked
- Route/slug preservation: `src/app/[...slug]/page.tsx` builds static params from `raw/routes/routes.txt` and excludes `/image-gallery/` + `/video-gallery/`.
- Media routing: `/raw-asset/[...path]` exists (serves `raw/har_bodies` + `raw/assets/live`).
- Gallery rendering: `src/app/image-gallery/page.tsx` prefers `public/gallery` if populated; otherwise renders available local `/raw-asset/...` images discovered by the scraper.
- Raw text collapsing: `src/lib/raw-content.ts` collapses word-per-line text into real paragraphs; CMS importer (`cms/src/scripts/import_raw.ts`) uses similar paragraphization before generating Lexical JSON.

## Decisions
- Keep the original route/slug map driven by the crawl output (`raw/routes/routes.txt`) rather than inventing new slugs.
- Keep media local and addressable via `/raw-asset/*` for maximum fidelity to scraped content.

## Hurdles / gotchas
- Zsh bracket globs require quoting when opening `[...slug]` paths.
- Site re-crawl with Scrapy currently returns a JS challenge 403, so refreshes may require a browser-based crawler.
- Video gallery only lists `public/videos` files; no videos were present in raw assets during this snapshot.

## Suggested follow-ups
- If you want gallery completeness, download remaining image URLs (or curate + copy into `public/gallery`).
- Consider adding an optional “embedded video” mode (YouTube/Vimeo) if the scraped pages primarily reference hosted video rather than local mp4/webm.

