import { cache } from "react";
import fs from "node:fs/promises";
import path from "node:path";

export type ScrapyPageRecord = {
  url: string;
  path: string;
  kind: string;
  title?: string | null;
  meta_description?: string | null;
  published_time?: string | null;
  modified_time?: string | null;
  primary_image?: string | null;
  images?: string[];
  content_html?: string | null;
  content_text?: string | null;
  out_links?: string[];
};

function normalizePathname(input: string) {
  if (!input) return "/";
  let p = input.trim();
  if (!p.startsWith("/")) p = `/${p}`;
  if (p !== "/" && !p.endsWith("/")) p = `${p}/`;
  p = p.replace(/\/+/g, "/");
  return p;
}

const getAllScrapyPages = cache(async () => {
  const abs = path.join(process.cwd(), "raw", "scrapy", "pages.jsonl");
  const raw = await fs.readFile(abs, "utf8");
  return raw
    .split(/\r?\n/g)
    .map((l) => l.trim())
    .filter(Boolean)
    .map((l) => JSON.parse(l) as ScrapyPageRecord);
});

export const getScrapyPageByPathname = cache(async (pathname: string) => {
  const normalized = normalizePathname(pathname);
  const pages = await getAllScrapyPages();
  return pages.find((p) => normalizePathname(p.path) === normalized) ?? null;
});

