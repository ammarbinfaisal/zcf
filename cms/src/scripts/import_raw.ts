import fs from "node:fs/promises";
import path from "node:path";
import { createRequire } from "node:module";

import config from "../../payload.config";

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

const COMMON_SENTENCE_START_WORDS = new Set(
  [
    "A",
    "An",
    "And",
    "At",
    "Because",
    "But",
    "By",
    "For",
    "From",
    "If",
    "In",
    "It",
    "On",
    "Or",
    "The",
    "These",
    "This",
    "Those",
    "To",
    "We",
    "When",
    "Where",
    "Which",
    "While",
    "Who",
    "Why",
    "You",
    "Your",
  ].map((s) => s.toLowerCase()),
);

function joinTokenLikeLines(tokens: string[]) {
  const rawTokens = tokens.map((t) => t.trim()).filter(Boolean);

  // Fix occasional split words like `M` + `edia` or `Z` + `akat`.
  const merged: string[] = [];
  for (let i = 0; i < rawTokens.length; i++) {
    const t = rawTokens[i]!;
    const next = rawTokens[i + 1];
    if (
      t.length === 1 &&
      /^[A-Z]$/.test(t) &&
      next &&
      /^[a-z]/.test(next)
    ) {
      merged.push(`${t}${next}`);
      i += 1;
      continue;
    }
    merged.push(t);
  }

  let out = "";
  for (const t of merged) {
    const last = out.slice(-1);
    const noSpaceBefore =
      !out ||
      /^[,.;:!?)\]}]$/.test(t) ||
      /^[,.;:!?]/.test(t) ||
      t.startsWith("'") ||
      t.startsWith("’") ||
      last === "(" ||
      last === "[" ||
      last === "{" ||
      last === "“" ||
      last === '"' ||
      last === "‘";

    if (noSpaceBefore) out += t;
    else out += ` ${t}`;
  }

  // Clean up common spacing artifacts
  out = out
    .replace(/\s+([,.;:!?])/g, "$1")
    .replace(/\(\s+/g, "(")
    .replace(/\s+\)/g, ")")
    .replace(/\s{2,}/g, " ")
    .trim();
  return out;
}

function looksLikeUrlLine(line: string) {
  return /^https?:\/\/\S+$/i.test(line.trim());
}

function looksLikeHeadingLine(line: string) {
  const t = line.trim();
  if (!t) return false;
  if (looksLikeUrlLine(t)) return false;
  if (t.length < 4 || t.length > 60) return false;
  if (/[.!?]$/.test(t)) return false;

  const words = t.split(/\s+/g).filter(Boolean);
  if (words.length > 6) return false;

  const first = words[0]?.toLowerCase();
  const startsCapital = /^[A-Z]/.test(t);
  if (words.length === 1) {
    if (!startsCapital) return false;
    if (COMMON_SENTENCE_START_WORDS.has(first)) return false;
    return true;
  }

  // Multi-word headings like "Who we are"
  return startsCapital;
}

function paragraphizePlainText(text: string) {
  const rawLines = (text || "").split(/\r?\n/g).map((l) => l.trim());
  const lines = rawLines.filter(Boolean);
  if (!lines.length) return [];

  const paragraphs: string[] = [];
  let buf: string[] = [];

  const flush = () => {
    const joined = joinTokenLikeLines(buf);
    if (joined) paragraphs.push(joined);
    buf = [];
  };

  const isTokenish = (line: string, hasBuf: boolean) => {
    const t = line.trim();
    if (!t) return false;
    if (looksLikeUrlLine(t)) return false;
    if (looksLikeHeadingLine(t)) return false;

    if (/^[,.;:!?]/.test(t) && hasBuf) return true;

    const words = t.split(/\s+/g).filter(Boolean);
    if (words.length <= 2 && t.length <= 24) return true;
    if (words.length <= 3 && t.length <= 32) return true;

    // When we already detected a token-run, keep short fragments together.
    if (hasBuf && words.length <= 8 && t.length <= 80) return true;
    return false;
  };

  for (let i = 0; i < lines.length; i++) {
    const line = lines[i]!;

    if (looksLikeUrlLine(line)) {
      flush();
      paragraphs.push(line);
      continue;
    }

    if (looksLikeHeadingLine(line)) {
      flush();
      paragraphs.push(line);
      continue;
    }

    if (isTokenish(line, buf.length > 0)) {
      buf.push(line);

      const currentLen = buf.reduce((sum, t) => sum + t.length + 1, 0);
      const isSentenceEnd = /[.!?]$/.test(line) || line === "." || line === "!" || line === "?";
      if (currentLen > 450 && isSentenceEnd) flush();
      continue;
    }

    flush();
    paragraphs.push(line);
  }

  flush();
  return paragraphs.filter(Boolean);
}

function lexicalFromPlainText(text: string) {
  const paragraphs = paragraphizePlainText(text);

  const children = paragraphs.map((p) => ({
    type: "paragraph",
    version: 1,
    format: "",
    indent: 0,
    direction: "ltr",
    children: [
      {
        type: "text",
        version: 1,
        text: p,
        format: 0,
        detail: 0,
        mode: "normal",
        style: "",
      },
    ],
  }));

  return {
    root: {
      type: "root",
      version: 1,
      format: "",
      indent: 0,
      direction: "ltr",
      children: children.length
        ? children
        : [
            {
              type: "paragraph",
              version: 1,
              format: "",
              indent: 0,
              direction: "ltr",
              children: [
                {
                  type: "text",
                  version: 1,
                  text: "",
                  format: 0,
                  detail: 0,
                  mode: "normal",
                  style: "",
                },
              ],
            },
          ],
    },
  };
}

function sha1Hex8(input: string) {
  // Match extract_har_to_raw.py query hashing behavior.
  // Avoid bringing crypto types into the CMS TS build; use dynamic import.
  // eslint-disable-next-line @typescript-eslint/no-var-requires
  const crypto = require("node:crypto") as typeof import("node:crypto");
  return crypto.createHash("sha1").update(input).digest("hex").slice(0, 8);
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
  const rel = urlToHarRelPath(url);
  const har = path.join(repoRoot, "raw", "har_bodies", ...rel.split("/"));
  if (await fileExists(har)) return { absPath: har, sourceUrl: url };

  const live = path.join(repoRoot, "raw", "assets", "live", ...rel.split("/"));
  if (await fileExists(live)) return { absPath: live, sourceUrl: url };

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

let payload: Awaited<ReturnType<typeof getPayload>>;
const mediaCache = new Map<string, string | null>();

async function ensureMediaFromUrl({
  sourceUrl,
  alt,
  repoRoot,
}: {
  sourceUrl: string;
  alt: string;
  repoRoot: string;
}): Promise<string | null> {
  const cached = mediaCache.get(sourceUrl);
  if (cached !== undefined) return cached;

  const local = await resolveLocalAsset(sourceUrl, repoRoot);
  if (!local) {
    mediaCache.set(sourceUrl, null);
    return null;
  }

  const existing = await payload.find({
    collection: "media",
    where: { sourceUrl: { equals: sourceUrl } },
    limit: 1,
  });
  const existingDoc = existing?.docs?.[0] as { id: string } | undefined;
  if (existingDoc?.id) {
    mediaCache.set(sourceUrl, existingDoc.id);
    return existingDoc.id;
  }

  try {
    const created = (await payload.create({
      collection: "media",
      data: {
        alt,
        sourceUrl,
      },
      filePath: local.absPath,
    })) as unknown as { id: string };
    mediaCache.set(sourceUrl, created.id);
    return created.id;
  } catch {
    mediaCache.set(sourceUrl, null);
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
  const content = lexicalFromPlainText(rec.content_text || "");

  const heroUrl = rec.primary_image || (rec.images?.[0] ?? null);
  const heroMedia = heroUrl
    ? await ensureMediaFromUrl({ sourceUrl: heroUrl, alt: title, repoRoot })
    : null;

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
  const content = lexicalFromPlainText(rec.content_text || "");

  const featuredUrl = rec.primary_image || (rec.images?.[0] ?? null);
  const featuredImage = featuredUrl
    ? await ensureMediaFromUrl({ sourceUrl: featuredUrl, alt: title, repoRoot })
    : null;

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
