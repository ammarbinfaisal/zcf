import fs from "node:fs/promises";
import path from "node:path";

import config from "@payload-config";
import { getPayload } from "payload";

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

function lexicalFromPlainText(text: string) {
  const lines = (text || "")
    .split(/\r?\n/g)
    .map((l) => l.trim())
    .filter(Boolean);

  const children = lines.map((line) => ({
    type: "paragraph",
    version: 1,
    format: "",
    indent: 0,
    direction: "ltr",
    children: [
      {
        type: "text",
        version: 1,
        text: line,
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
      children: children.length ? children : [
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
  if (!local) return null;

  const existing = await payload.find({
    collection: "media",
    where: { sourceUrl: { equals: sourceUrl } },
    limit: 1,
  });
  const existingDoc = existing?.docs?.[0] as { id: string } | undefined;
  if (existingDoc?.id) return existingDoc.id;

  try {
    const created = (await payload.create({
      collection: "media",
      data: {
        alt,
        sourceUrl,
      },
      filePath: local.absPath,
    })) as unknown as { id: string };
    return created.id;
  } catch {
    return null;
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
