# Raw Site Extraction

Generated: 2026-02-12T11:26:16.115054+00:00

This folder contains a structured extraction of site routes, content, and assets based on local HAR files (`zcfindia.org.har`) plus live route crawling seeded from HAR-discovered pages.

## What was extracted

- HAR files analyzed: 1
- HAR entries: 1536
- HAR body records saved from HAR: 262
- Unique HAR body files written to disk: 243
- HAR entries missing body payload in HAR: 1274
- Live HTML pages crawled: 11
- Total discovered routes (URL form): 26
- Total discovered route paths (deduplicated): 26
- Live asset URLs discovered on primary host: 522
- Live assets skipped: 13

## Directory layout

- `routes/routes.json` and `routes/routes.txt`: canonical route list and tree structure (`routes.txt` is path-only for Next.js scaffolding).
- `content/live_pages/`: fetched HTML pages and extracted plain text (`.txt`) per route.
- `content/har_pages/`: text extracted from any HTML bodies already present in HAR payload.
- `content/all_live_page_text.md`: aggregated text content from crawled pages.
- `assets/live/`: reserved directory for optional later downloads of live asset URLs.
- `har_bodies/`: raw response bodies recovered directly from HAR payloads.
- `manifests/`: detailed machine-readable manifests and coverage reports.

## Notes for Next.js redesign work

- Use `routes/routes.txt` to scaffold route-level page files.
- Use `content/all_live_page_text.md` and `content/live_pages/**/*.txt` to migrate textual content.
- Use `har_bodies/` as the primary local asset source.
- Use `manifests/live_assets.json` as the candidate list if you want to fetch additional live assets.
- Review `manifests/missing_har_bodies.json` to see which HAR requests lacked embedded response bodies.
