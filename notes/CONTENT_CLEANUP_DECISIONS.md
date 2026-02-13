# Content cleanup + rich text decisions (2026-02-13)

This file documents decisions made where the source data (HAR + live crawl + Scrapy export) is ambiguous.

## Heading levels

- Page titles are rendered as a single H1 in the UI (`PageShell`), so migrated/derived content uses **H2** for section headings.
- Heuristic headings are detected from short, title-case / ALL-CAPS lines and excluded if they match nav/menu labels.

## Links (`<a>`)

- Source crawls often lose the original anchor `href` (plain text extraction). To avoid incorrect links:
  - Only **standalone URL lines** are converted into link blocks (`a`) in the raw-content renderer.
  - In the CMS importer, standalone URL lines become Lexical link nodes (`linkType: "custom"`).

## Images

- “Images present in the old structure” is interpreted as:
  - Prefer a **hero/primary image** where one can be resolved locally, and
  - Avoid selecting the **site logo/icon assets** as page hero images.
- WordPress thumbnail URLs (e.g. `-300x200.jpg`, `-scaled.jpg`) are mapped to locally available originals when possible.
- In the Payload import script, if a hero/featured image is found it is:
  - Saved to the page/post media field (`heroMedia` / `featuredImage`), and
  - Inserted once at the top of the rich text as an `upload` node so the image is visible even if the template doesn’t render hero media.

## OG images

- Next.js cannot nest special OG files under a catch-all route (`/[...slug]/opengraph-image`), so OG images are generated via a dedicated route:
  - `/og?path=/some/page/`
- The “old/original” logo is used on the **left side** of the OG image (from `public/media/logo.png`, which matches the original `LOGO-ZCF.png` from the crawl).

## Payload rich text conversion

- Heuristic plain-text → rich-text conversion is **not** the target approach for Payload content.
- Import uses `@payloadcms/richtext-lexical` HTML → Lexical conversion (`convertHTMLToLexical`), preserving headings/bold/lists/links from the scraped HTML.
- Images are not ingested during import:
  - `<img>` tags are removed from the HTML before conversion, and
  - ordered image URLs are stored in `imageUrls` (per page/post) for later media ingestion while retaining display order + source page path.
