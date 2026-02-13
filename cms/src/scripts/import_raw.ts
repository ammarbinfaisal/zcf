import fs from "node:fs/promises";
import path from "node:path";
import { createRequire } from "node:module";

import config from "../../payload.config";

import {
  convertHTMLToLexical,
  convertMarkdownToLexical,
} from "@payloadcms/richtext-lexical";
import { JSDOM } from "jsdom";

// NOTE: Payload's ESM build currently pulls in `loadEnv` which assumes a default export
// from `@next/env`. In Next canary, `@next/env` is `__esModule` without a `default`,
// which crashes when imported as default. Using CJS `require` avoids that path.
// This script is Node-only.
const require = createRequire(import.meta.url);
const { getPayload } = require("payload") as typeof import("payload");

type ScrapyPage = {
  url: string;
  path: string;
  kind: "home" | "page" | "post" | "category" | "author" | "archive_month" | "unknown";
  title?: string | null;
  meta_description?: string | null;
  published_time?: string | null;
  modified_time?: string | null;
  primary_image?: string | null;
  images?: string[];
  content_html?: string | null;
  content_text?: string | null;
};

function normalizePathname(input: string) {
  if (!input) return "/";
  let p = input.trim();
  if (!p.startsWith("/")) p = `/${p}`;
  if (p !== "/" && !p.endsWith("/")) p = `${p}/`;
  p = p.replace(/\/+/g, "/");
  return p;
}

function slugFromPathname(p: string) {
  const normalized = normalizePathname(p);
  if (normalized === "/") return "home";
  return normalized.replace(/^\//, "").replace(/\/$/, "");
}

function normalizeUrl(url: string, baseUrl: string) {
  const t = (url || "").trim();
  if (!t) return null;
  if (t.startsWith("data:")) return null;
  if (t.startsWith("http://") || t.startsWith("https://")) return t;
  if (t.startsWith("//")) return `https:${t}`;
  try {
    return new URL(t, baseUrl).toString();
  } catch {
    return null;
  }
}

function pickBestFromSrcset(srcset: string) {
  const parts = (srcset || "")
    .split(",")
    .map((p) => p.trim())
    .filter(Boolean);
  if (!parts.length) return null;

  let best: { url: string; score: number } | null = null;
  for (const part of parts) {
    const [u, size] = part.split(/\s+/g);
    if (!u) continue;
    let score = 0;
    const s = (size || "").trim();
    if (/^\d+w$/.test(s)) score = Number(s.replace("w", "")) || 0;
    else if (/^\d+(\.\d+)?x$/.test(s)) score = Math.round((Number(s.replace("x", "")) || 0) * 1000);
    if (!best || score >= best.score) best = { url: u, score };
  }
  return best?.url ?? parts[parts.length - 1]?.split(/\s+/g)?.[0] ?? null;
}

function parseHtmlFragment(html: string) {
  const wrapped = `<!doctype html><html><body>${html || ""}</body></html>`;
  const dom = new JSDOM(wrapped);
  return dom.window.document;
}

function pickMainContainer(doc: Document) {
  return (
    doc.querySelector("article") ||
    doc.querySelector("main") ||
    doc.querySelector("#content") ||
    doc.querySelector(".site-content") ||
    doc.querySelector(".content-area") ||
    doc.querySelector("#primary") ||
    doc.body
  );
}

function extractOrderedImageUrls(container: Element, baseUrl: string) {
  const out: string[] = [];
  const seen = new Set<string>();

  const imgs = Array.from(container.querySelectorAll("img"));
  for (const img of imgs) {
    const candidates: string[] = [];
    const srcset = img.getAttribute("srcset") || img.getAttribute("data-srcset") || "";
    const srcsetBest = pickBestFromSrcset(srcset);
    if (srcsetBest) candidates.push(srcsetBest);

    for (const attr of ["data-src", "data-lazy-src", "data-original", "src"]) {
      const v = img.getAttribute(attr);
      if (v) candidates.push(v);
    }

    for (const c of candidates) {
      const normalized = normalizeUrl(c, baseUrl);
      if (!normalized) continue;
      if (seen.has(normalized)) continue;
      seen.add(normalized);
      out.push(normalized);
      break;
    }
  }

  return out;
}

function removeJunkAndImages(container: Element, baseUrl: string) {
  for (const el of container.querySelectorAll(
    "script,style,noscript,nav,header,footer,iframe,svg,form,input,textarea,button,select,option",
  )) {
    el.remove();
  }

  for (const a of Array.from(container.querySelectorAll("a"))) {
    const hrefRaw = (a.getAttribute("href") || "").trim();
    if (!hrefRaw || hrefRaw === "#" || hrefRaw.startsWith("javascript:") || hrefRaw.startsWith("#")) {
      a.replaceWith(...Array.from(a.childNodes));
      continue;
    }

    const normalized = normalizeUrl(hrefRaw, baseUrl);
    if (!normalized) {
      a.replaceWith(...Array.from(a.childNodes));
      continue;
    }

    a.setAttribute("href", normalized);
  }

  for (const img of Array.from(container.querySelectorAll("img"))) img.remove();

  // Remove empty wrapper nodes after stripping
  for (const el of Array.from(container.querySelectorAll("figure,p,div,section"))) {
    const text = (el.textContent || "").trim();
    if (!text && el.querySelectorAll("a,strong,em,ul,ol,li,h1,h2,h3,h4,h5,h6").length === 0) {
      el.remove();
    }
  }
}

async function lexicalFromHtml({
  html,
  pageUrl,
  editorConfig,
}: {
  html: string | null | undefined;
  pageUrl: string;
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  editorConfig: any;
}) {
  const raw = (html || "").trim();
  if (!raw) {
    return convertMarkdownToLexical({
      editorConfig,
      markdown: "Content was not captured in the current crawl snapshot.",
    });
  }

  const doc = parseHtmlFragment(raw);
  const container = pickMainContainer(doc);

  removeJunkAndImages(container, pageUrl);
  const cleaned = container.innerHTML.trim();

  if (!cleaned) {
    return convertMarkdownToLexical({
      editorConfig,
      markdown: "Content was not captured in the current crawl snapshot.",
    });
  }

  return convertHTMLToLexical({
    editorConfig,
    html: cleaned,
    JSDOM,
  });
}

function extractImageUrlsFromHtml(html: string | null | undefined, pageUrl: string) {
  const raw = (html || "").trim();
  if (!raw) return [];
  const doc = parseHtmlFragment(raw);
  const container = pickMainContainer(doc);
  return extractOrderedImageUrls(container, pageUrl);
}

let payload: Awaited<ReturnType<typeof getPayload>>;
// eslint-disable-next-line @typescript-eslint/no-explicit-any
let lexicalEditorConfig: any;

async function upsertPage(rec: ScrapyPage) {
  const pagePath = normalizePathname(rec.path);
  const title = (rec.title || "").replace(/\s+-\s+Zakat\s*&\s*Charitable\s*Foundation\s*$/i, "").trim() || "Page";

  const imageUrls = extractImageUrlsFromHtml(rec.content_html, rec.url);
  const content = await lexicalFromHtml({
    html: rec.content_html,
    pageUrl: rec.url,
    editorConfig: lexicalEditorConfig,
  });

  const existing = await payload.find({
    collection: "pages",
    where: { path: { equals: pagePath } },
    limit: 1,
  });
  const doc = existing?.docs?.[0] as { id: string } | undefined;

  const data = {
    title,
    path: pagePath,
    imageUrls: imageUrls.map((url) => ({ url })),
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    content: content as any,
    seo: {
      metaTitle: title,
      metaDescription: rec.meta_description || undefined,
    },
  };

  if (doc?.id) {
    await payload.update({ collection: "pages", id: doc.id, data });
  } else {
    await payload.create({ collection: "pages", data });
  }
}

async function upsertPost(rec: ScrapyPage) {
  const slug = slugFromPathname(rec.path);
  const title = (rec.title || "").replace(/\s+-\s+Zakat\s*&\s*Charitable\s*Foundation\s*$/i, "").trim() || slug;

  const imageUrls = extractImageUrlsFromHtml(rec.content_html, rec.url);
  const content = await lexicalFromHtml({
    html: rec.content_html,
    pageUrl: rec.url,
    editorConfig: lexicalEditorConfig,
  });

  const existing = await payload.find({
    collection: "posts",
    where: { slug: { equals: slug } },
    limit: 1,
  });
  const doc = existing?.docs?.[0] as { id: string } | undefined;

  const data = {
    title,
    slug,
    publishedAt: rec.published_time || undefined,
    excerpt: rec.meta_description || undefined,
    imageUrls: imageUrls.map((url) => ({ url })),
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    content: content as any,
    seo: {
      metaTitle: title,
      metaDescription: rec.meta_description || undefined,
    },
  };

  if (doc?.id) {
    await payload.update({ collection: "posts", id: doc.id, data });
  } else {
    await payload.create({ collection: "posts", data });
  }
}

async function main() {
  const repoRoot = path.resolve(path.join(__dirname, "..", "..", ".."));
  const pagesJsonl = path.join(repoRoot, "raw", "scrapy", "pages.jsonl");
  const raw = await fs.readFile(pagesJsonl, "utf8");
  const rows: ScrapyPage[] = raw
    .split(/\r?\n/g)
    .map((l) => l.trim())
    .filter(Boolean)
    .map((l) => JSON.parse(l) as ScrapyPage);

  payload = await getPayload({ config });

  // Use the exact editor config from Payload so conversion matches validation.
  lexicalEditorConfig = (payload.config.editor as any)?.editorConfig;
  if (!lexicalEditorConfig) throw new Error("Missing Payload lexical editor config");

  // Import only canonical content pages + posts.
  const importable = rows.filter((r) => r.kind === "home" || r.kind === "page" || r.kind === "post");

  for (const rec of importable) {
    try {
      if (rec.kind === "post") await upsertPost(rec);
      else await upsertPage(rec);
    } catch (err) {
      // eslint-disable-next-line no-console
      console.error(
        JSON.stringify(
          {
            message: (err as Error)?.message,
            kind: rec.kind,
            path: rec.path,
            url: rec.url,
            title: rec.title,
            data: (err as any)?.data,
          },
          null,
          2,
        ),
      );
      throw err;
    }
  }

  payload.logger.info(`Imported/updated ${importable.length} docs from raw/scrapy/pages.jsonl`);
  process.exit(0);
}

main().catch((err) => {
  // eslint-disable-next-line no-console
  console.error(err);
  process.exit(1);
});
