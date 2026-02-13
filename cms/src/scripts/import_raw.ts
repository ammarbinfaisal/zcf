import fs from "node:fs/promises";
import path from "node:path";
import crypto from "node:crypto";
import { createRequire } from "node:module";

import config from "../../payload.config";

import {
  convertHTMLToLexical,
  convertMarkdownToLexical,
  defaultEditorConfig,
  sanitizeServerEditorConfig,
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

type ClaudeMarkdownRecord = {
  path: string;
  markdown: string;
};

function uploadNode(relationTo: "media", value: string) {
  return {
    type: "upload",
    version: 3,
    format: "",
    id: crypto.randomUUID(),
    relationTo,
    value,
    fields: {},
  };
}

function stripScriptsAndStyles(html: string) {
  return html
    .replace(/<script\b[^>]*>[\s\S]*?<\/script>/gi, "")
    .replace(/<style\b[^>]*>[\s\S]*?<\/style>/gi, "")
    .replace(/<noscript\b[^>]*>[\s\S]*?<\/noscript>/gi, "");
}

function normalizeImageUrl(src: string, baseUrl: string) {
  const t = (src || "").trim();
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

function walkEditorNodes(node: unknown, visit: (n: any) => void) {
  if (!node || typeof node !== "object") return;
  const n = node as any;
  visit(n);
  const children = n.children;
  if (Array.isArray(children)) {
    for (const c of children) walkEditorNodes(c, visit);
  }
}

async function hydrateUploadNodesFromHtml({
  editorState,
  pageUrl,
  alt,
  repoRoot,
}: {
  editorState: any;
  pageUrl: string;
  alt: string;
  repoRoot: string;
}) {
  const tasks: Array<Promise<void>> = [];

  walkEditorNodes(editorState?.root, (n) => {
    if (n?.type !== "upload") return;
    if (!n?.pending?.src) return;

    const src = normalizeImageUrl(String(n.pending.src), pageUrl);
    if (!src) return;

    tasks.push(
      (async () => {
        const mediaId = await ensureMediaFromUrl({ sourceUrl: src, alt, repoRoot });
        if (!mediaId) return;
        delete n.pending;
        n.relationTo = "media";
        n.value = mediaId;
        n.fields = n.fields || {};
        n.version = 3;
        n.format = n.format ?? "";
        n.id = n.id || crypto.randomUUID();
      })(),
    );
  });

  await Promise.all(tasks);
}

function ensureLeadingUploads(editorState: any, mediaIds: string[]) {
  const root = editorState?.root;
  if (!root) return;
  if (!Array.isArray(root.children)) root.children = [];

  const wanted = Array.from(new Set(mediaIds.filter(Boolean)));
  if (!wanted.length) return;

  const already = new Set<string>();
  for (const c of root.children.slice(0, 8)) {
    if (c?.type === "upload" && typeof c.value === "string") already.add(c.value);
  }

  const inserts = wanted.filter((id) => !already.has(id)).map((id) => uploadNode("media", id));
  if (inserts.length) root.children.unshift(...inserts);
}

async function loadClaudeMarkdownByPath(repoRoot: string) {
  const filePath = path.join(repoRoot, "raw", "claude", "markdown.jsonl");
  try {
    const raw = await fs.readFile(filePath, "utf8");
    const map = new Map<string, string>();
    for (const line of raw.split(/\r?\n/g)) {
      const t = line.trim();
      if (!t) continue;
      try {
        const rec = JSON.parse(t) as ClaudeMarkdownRecord;
        if (!rec?.path || !rec?.markdown) continue;
        map.set(normalizePathname(rec.path), String(rec.markdown));
      } catch {
        // ignore bad line
      }
    }
    return map;
  } catch {
    return new Map<string, string>();
  }
}

async function lexicalFromRecord({
  rec,
  title,
  repoRoot,
  heroMediaId,
  extraMediaIds,
  markdownByPath,
  editorConfig,
}: {
  rec: ScrapyPage;
  title: string;
  repoRoot: string;
  heroMediaId: string | null;
  extraMediaIds: string[];
  markdownByPath: Map<string, string>;
  editorConfig: any;
}) {
  const pathname = normalizePathname(rec.path);
  const md = markdownByPath.get(pathname);
  if (md) {
    const editorState = convertMarkdownToLexical({ editorConfig, markdown: md });
    ensureLeadingUploads(editorState, [heroMediaId, ...extraMediaIds].filter(Boolean) as string[]);
    return editorState;
  }

  const html = (rec.content_html || "").trim();
  if (!html) {
    return convertMarkdownToLexical({
      editorConfig,
      markdown: "Content was not captured in the current crawl snapshot.",
    });
  }

  const editorState = convertHTMLToLexical({
    editorConfig,
    html: stripScriptsAndStyles(html),
    JSDOM,
  });

  await hydrateUploadNodesFromHtml({
    editorState,
    pageUrl: rec.url,
    alt: title,
    repoRoot,
  });

  ensureLeadingUploads(editorState, [heroMediaId, ...extraMediaIds].filter(Boolean) as string[]);
  return editorState;
}

function sha1Hex8(input: string) {
  // Match extract_har_to_raw.py query hashing behavior.
  // Avoid bringing crypto types into the CMS TS build; use dynamic import.
  // eslint-disable-next-line @typescript-eslint/no-var-requires
  const c = require("node:crypto") as typeof import("node:crypto");
  return c.createHash("sha1").update(input).digest("hex").slice(0, 8);
}

function urlToHarRelPath(url: string) {
  const u = new URL(url);
  const host = u.host.toLowerCase();
  let pathname = u.pathname || "/";
  if (pathname.endsWith("/")) pathname = `${pathname}index`;
  let rel = pathname.replace(/^\//, "");
  if (u.search && rel) {
    const qHash = sha1Hex8(u.search.replace(/^\?/, ""));
    const parsed = path.posix.parse(rel);
    const stem = parsed.name || "index";
    const suffix = parsed.ext || "";
    rel = path.posix.join(parsed.dir, `${stem}__q_${qHash}${suffix}`);
  }
  return path.posix.join(host, rel);
}

async function fileExists(filePath: string) {
  try {
    await fs.access(filePath);
    return true;
  } catch {
    return false;
  }
}

async function resolveLocalAsset(url: string, repoRoot: string) {
  const stripSize = (u: string) => u.replace(/-\d+x\d+(?=\.[a-z0-9]+$)/i, "");
  const stripScaled = (u: string) => u.replace(/-scaled(?=\.[a-z0-9]+$)/i, "");

  const variants = (() => {
    const out = [url];
    const a = stripSize(url);
    const b = stripScaled(url);
    const c = stripScaled(a);
    for (const v of [a, b, c]) if (v && v !== url) out.push(v);
    return Array.from(new Set(out));
  })();

  for (const candidateUrl of variants) {
    const rel = urlToHarRelPath(candidateUrl);
    const har = path.join(repoRoot, "raw", "har_bodies", ...rel.split("/"));
    if (await fileExists(har)) return { absPath: har, sourceUrl: candidateUrl };

    const live = path.join(repoRoot, "raw", "assets", "live", ...rel.split("/"));
    if (await fileExists(live)) return { absPath: live, sourceUrl: candidateUrl };
  }

  return null;
}

function mimeFromExt(filePath: string) {
  const ext = path.extname(filePath).toLowerCase();
  if (ext === ".jpg" || ext === ".jpeg") return "image/jpeg";
  if (ext === ".png") return "image/png";
  if (ext === ".webp") return "image/webp";
  if (ext === ".gif") return "image/gif";
  if (ext === ".svg") return "image/svg+xml";
  if (ext === ".mp4") return "video/mp4";
  if (ext === ".pdf") return "application/pdf";
  return "application/octet-stream";
}

function isLikelyContentImageUrl(url: string) {
  const u = (url || "").toLowerCase();
  if (!/\.(jpe?g|png|webp|gif|svg)(\?|$)/i.test(u)) return false;
  if (u.includes("/demo/")) return false;
  if (u.includes("logo")) return false;
  if (u.includes("icon")) return false;
  if (u.includes("elementor")) return false;
  if (u.includes("/wp-content/plugins/")) return false;
  return true;
}

let payload: Awaited<ReturnType<typeof getPayload>>;
let lexicalEditorConfig: any;
let claudeMarkdownByPath = new Map<string, string>();
const mediaCache = new Map<string, string | null>();

async function collectInlineMediaIds({
  rec,
  title,
  repoRoot,
  heroMediaId,
  limit = 3,
}: {
  rec: ScrapyPage;
  title: string;
  repoRoot: string;
  heroMediaId: string | null;
  limit?: number;
}) {
  const ids: string[] = [];
  const seen = new Set<string>();
  if (heroMediaId) seen.add(heroMediaId);

  for (const u of rec.images || []) {
    if (ids.length >= limit) break;
    if (typeof u !== "string") continue;
    const t = u.trim();
    if (!t.startsWith("http")) continue;
    if (!isLikelyContentImageUrl(t)) continue;
    const id = await ensureMediaFromUrl({ sourceUrl: t, alt: title, repoRoot });
    if (!id) continue;
    if (seen.has(id)) continue;
    seen.add(id);
    ids.push(id);
  }

  return ids;
}

async function ensureMediaFromUrl({
  sourceUrl,
  alt,
  repoRoot,
}: {
  sourceUrl: string;
  alt: string;
  repoRoot: string;
}): Promise<string | null> {
  const local = await resolveLocalAsset(sourceUrl, repoRoot);
  const canonicalSourceUrl = local?.sourceUrl || sourceUrl;

  const cached = mediaCache.get(canonicalSourceUrl);
  if (cached !== undefined) return cached;
  if (!local) {
    mediaCache.set(canonicalSourceUrl, null);
    return null;
  }

  const existing = await payload.find({
    collection: "media",
    where: { sourceUrl: { equals: canonicalSourceUrl } },
    limit: 1,
  });
  const existingDoc = existing?.docs?.[0] as { id: string } | undefined;
  if (existingDoc?.id) {
    mediaCache.set(canonicalSourceUrl, existingDoc.id);
    return existingDoc.id;
  }

  try {
    const created = (await payload.create({
      collection: "media",
      data: {
        alt,
        sourceUrl: canonicalSourceUrl,
      },
      filePath: local.absPath,
    })) as unknown as { id: string };
    mediaCache.set(canonicalSourceUrl, created.id);
    return created.id;
  } catch {
    mediaCache.set(canonicalSourceUrl, null);
    return null;
  }
}

async function ensureMediaLibraryFromRecord({
  urls,
  alt,
  repoRoot,
  limit = 80,
}: {
  urls: string[];
  alt: string;
  repoRoot: string;
  limit?: number;
}) {
  const uniq: string[] = [];
  const seen = new Set<string>();
  for (const u of urls || []) {
    if (typeof u !== "string") continue;
    const t = u.trim();
    if (!t.startsWith("http")) continue;
    if (!isLikelyContentImageUrl(t)) continue;
    if (seen.has(t)) continue;
    seen.add(t);
    uniq.push(t);
    if (uniq.length >= limit) break;
  }

  for (const u of uniq) {
    await ensureMediaFromUrl({ sourceUrl: u, alt, repoRoot });
  }
}

async function upsertPage(rec: ScrapyPage, repoRoot: string) {
  const pagePath = normalizePathname(rec.path);
  const title = (rec.title || "").replace(/\s+-\s+Zakat\s*&\s*Charitable\s*Foundation\s*$/i, "").trim() || "Page";

  const heroUrl =
    [rec.primary_image, ...(rec.images || [])]
      .filter((u): u is string => typeof u === "string" && u.startsWith("http"))
      .find(isLikelyContentImageUrl) ?? null;
  const heroMedia = heroUrl
    ? await ensureMediaFromUrl({ sourceUrl: heroUrl, alt: title, repoRoot })
    : null;

  const extraMediaIds = await collectInlineMediaIds({ rec, title, repoRoot, heroMediaId: heroMedia });
  const content = await lexicalFromRecord({
    rec,
    title,
    repoRoot,
    heroMediaId: heroMedia,
    extraMediaIds,
    markdownByPath: claudeMarkdownByPath,
    editorConfig: lexicalEditorConfig,
  });

  // Retain all scraped media URLs (that exist locally) in the Media library.
  await ensureMediaLibraryFromRecord({ urls: rec.images || [], alt: title, repoRoot });

  const existing = await payload.find({
    collection: "pages",
    where: { path: { equals: pagePath } },
    limit: 1,
  });
  const doc = existing?.docs?.[0] as { id: string } | undefined;

  const data = {
    title,
    path: pagePath,
    heroMedia: heroMedia || undefined,
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

async function upsertPost(rec: ScrapyPage, repoRoot: string) {
  const slug = slugFromPathname(rec.path);
  const title = (rec.title || "").replace(/\s+-\s+Zakat\s*&\s*Charitable\s*Foundation\s*$/i, "").trim() || slug;

  const featuredUrl =
    [rec.primary_image, ...(rec.images || [])]
      .filter((u): u is string => typeof u === "string" && u.startsWith("http"))
      .find(isLikelyContentImageUrl) ?? null;
  const featuredImage = featuredUrl
    ? await ensureMediaFromUrl({ sourceUrl: featuredUrl, alt: title, repoRoot })
    : null;

  const extraMediaIds = await collectInlineMediaIds({ rec, title, repoRoot, heroMediaId: featuredImage });
  const content = await lexicalFromRecord({
    rec,
    title,
    repoRoot,
    heroMediaId: featuredImage,
    extraMediaIds,
    markdownByPath: claudeMarkdownByPath,
    editorConfig: lexicalEditorConfig,
  });

  // Retain all scraped media URLs (that exist locally) in the Media library.
  await ensureMediaLibraryFromRecord({ urls: rec.images || [], alt: title, repoRoot });

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
    featuredImage: featuredImage || undefined,
    excerpt: rec.meta_description || undefined,
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
  claudeMarkdownByPath = await loadClaudeMarkdownByPath(repoRoot);
  // Use Payload's sanitized config so markdown/html transformers match the CMS editor features.
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  lexicalEditorConfig = await sanitizeServerEditorConfig(defaultEditorConfig as any, payload.config as any);

  // Import only canonical content pages + posts.
  const importable = rows.filter((r) => r.kind === "home" || r.kind === "page" || r.kind === "post");

  for (const rec of importable) {
    if (rec.kind === "post") await upsertPost(rec, repoRoot);
    else await upsertPage(rec, repoRoot);
  }

  payload.logger.info(`Imported/updated ${importable.length} docs from raw/scrapy/pages.jsonl`);
  process.exit(0);
}

main().catch((err) => {
  // eslint-disable-next-line no-console
  console.error(err);
  process.exit(1);
});
