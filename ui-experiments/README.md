# UI Experiments

This repo keeps the crawled routes/slug structure and page content under `raw/`.

We iterate on the *presentation* in separate branches. Each UI branch should:
- Preserve route structure from `raw/routes/routes.txt`
- Keep content sourcing from the existing loaders (`src/lib/raw-content.ts`, `raw/scrapy/pages.jsonl`)
- Use a distinct 60/30/10 color palette (dominant/secondary/accent)
- Write decisions + hurdles to `ui-experiments/<branch>/NOTES.md`

Folders:
- `ui-experiments/ui-v1/` – notes + screenshots for branch `ui/v1-*`
- `ui-experiments/ui-v2/` – notes + screenshots for branch `ui/v2-*`
- `ui-experiments/ui-v3/` – notes + screenshots for branch `ui/v3-*`
- `ui-experiments/ui-v4/` – notes + screenshots for branch `ui/v4-*`

