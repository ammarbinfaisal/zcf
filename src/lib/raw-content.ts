import { cache } from "react";
import fs from "node:fs/promises";
import path from "node:path";

type LivePageManifestRecord = {
  url: string;
  html_file: string;
  text_file: string;
  text_chars: number;
};

export type PageContent = {
  pathname: string;
  title: string;
  description: string;
  blocks: Array<
    | { type: "h2"; text: string }
    | { type: "p"; text: string }
    | { type: "ul"; items: string[] }
  >;
  source: "live" | "fallback";
};

const RAW_ROOT = path.join(process.cwd(), "raw");

function normalizePathname(input: string) {
  if (!input) return "/";
  let p = input.trim();
  if (!p.startsWith("/")) p = `/${p}`;
  if (p !== "/" && !p.endsWith("/")) p = `${p}/`;
  p = p.replace(/\/+/g, "/");
  return p;
}

function pathnameFromUrl(url: string) {
  try {
    const u = new URL(url);
    return normalizePathname(u.pathname);
  } catch {
    return normalizePathname(url);
  }
}

const readJson = cache(async <T,>(filePath: string): Promise<T> => {
  const raw = await fs.readFile(filePath, "utf8");
  return JSON.parse(raw) as T;
});

export const getAllRoutePaths = cache(async () => {
  const txtPath = path.join(RAW_ROOT, "routes", "routes.txt");
  const txt = await fs.readFile(txtPath, "utf8");
  const routes = txt
    .split(/\r?\n/g)
    .map((l) => l.trim())
    .filter(Boolean)
    .map(normalizePathname);
  return Array.from(new Set(routes));
});

const getLivePagesByPath = cache(async () => {
  const manifestPath = path.join(RAW_ROOT, "manifests", "live_pages.json");
  const records = await readJson<LivePageManifestRecord[]>(manifestPath);
  const map = new Map<string, LivePageManifestRecord>();
  for (const r of records) map.set(pathnameFromUrl(r.url), r);
  return map;
});

const NAV_JUNK = new Set(
  [
    "Menu",
    "Home",
    "About Us",
    "About",
    "BBA",
    "Zakat",
    "What is Zakat & Nisab",
    "Zakat Calculator",
    "Gallery",
    "Image Gallery",
    "Video Gallery",
    "Our Projects",
    "Blogs",
    "News",
    "Contact",
    "donate",
    "Careers",
    "Contact Us",
    "Privacy Policy",
    "Terms and Conditions",
    "Become Volunteer",
  ].map((s) => s.toLowerCase()),
);

function isLikelyHeading(line: string) {
  const t = line.trim();
  if (t.length < 4) return false;
  if (/^\d+$/.test(t)) return false;
  const hasLetters = /[A-Za-z]/.test(t);
  const isAllCaps = t === t.toUpperCase();
  return hasLetters && isAllCaps;
}

function cleanLines(lines: string[]) {
  const out: string[] = [];
  let last = "";
  for (const raw of lines) {
    const t = raw.trim();
    if (!t) continue;
    if (t.toLowerCase().includes("© copyright")) break;
    if (t.toLowerCase() === last.toLowerCase()) continue;
    last = t;
    if (NAV_JUNK.has(t.toLowerCase())) continue;
    if (t === "Facebook-f" || t === "Twitter" || t === "Instagram" || t === "Youtube") continue;
    if (/^\d+$/.test(t)) continue;
    if (t === "View More>>") continue;
    out.push(t);
  }

  const footerCut = out.findIndex((l) => l.toLowerCase() === "quick links");
  if (footerCut >= 0) return out.slice(0, footerCut);
  return out;
}

function guessTitleFromFirstLine(firstLine: string, pathname: string) {
  const t = firstLine.trim();
  const titlePart = t.includes(" - ") ? t.split(" - ")[0].trim() : t;
  if (titlePart && titlePart.length <= 90) return titlePart;

  if (pathname === "/") return "Home";
  const slug = pathname.replace(/^\//, "").replace(/\/$/, "");
  return slug
    .split("/")
    .filter(Boolean)
    .pop()!
    .split("-")
    .map((w) => (w ? `${w[0].toUpperCase()}${w.slice(1)}` : ""))
    .join(" ");
}

function buildDescriptionFromLines(lines: string[]) {
  const chunks: string[] = [];
  for (const l of lines) {
    if (isLikelyHeading(l)) continue;
    if (l.length < 12) continue;
    chunks.push(l);
    if (chunks.join(" ").length > 220) break;
  }
  const text = chunks.join(" ").replace(/\s+/g, " ").trim();
  if (!text) return "";
  if (text.length <= 160) return text;
  return `${text.slice(0, 157).replace(/\s+\S*$/, "")}...`;
}

function linesToBlocks(lines: string[]) {
  const blocks: PageContent["blocks"] = [];
  let pendingList: string[] = [];

  const flushList = () => {
    if (pendingList.length >= 2) blocks.push({ type: "ul", items: pendingList });
    else if (pendingList.length === 1) blocks.push({ type: "p", text: pendingList[0] });
    pendingList = [];
  };

  for (const l of lines) {
    if (isLikelyHeading(l)) {
      flushList();
      blocks.push({ type: "h2", text: l });
      continue;
    }

    const looksLikeBullet =
      l.startsWith("-") ||
      l.startsWith("•") ||
      /^(\d+)\.$/.test(l) ||
      /^(Support|Provide|Spread|Conserve|Develop)\b/.test(l);

    if (looksLikeBullet && l.length <= 120) {
      pendingList.push(l.replace(/^[-•]\s*/, ""));
      continue;
    }

    flushList();
    blocks.push({ type: "p", text: l });
  }

  flushList();
  return blocks;
}

export async function getPageContentByPathname(pathname: string): Promise<PageContent> {
  const normalized = normalizePathname(pathname);
  const live = await getLivePagesByPath();
  const rec = live.get(normalized);

  if (rec) {
    const absText = path.join(process.cwd(), rec.text_file);
    const txt = await fs.readFile(absText, "utf8");
    const rawLines = txt.split(/\r?\n/g);
    const cleaned = cleanLines(rawLines);

    const title = guessTitleFromFirstLine(rawLines[0] ?? "", normalized);
    const description = buildDescriptionFromLines(cleaned);
    return {
      pathname: normalized,
      title,
      description,
      blocks: linesToBlocks(cleaned.slice(0, 120)),
      source: "live",
    };
  }

  const title = guessTitleFromFirstLine("", normalized);
  const description =
    "Official information from Zakat & Charitable Foundation. Learn about our programs, Zakat guidance, and ways to support communities.";
  return {
    pathname: normalized,
    title,
    description,
    blocks: [
      {
        type: "p",
        text: "This page exists in the original site structure, but the content was not captured in the current crawl snapshot.",
      },
      { type: "p", text: "If you are looking for details, please visit our main sections or contact us." },
    ],
    source: "fallback",
  };
}

export function slugParamToPathname(slug?: string[]) {
  if (!slug || slug.length === 0) return "/";
  return normalizePathname(`/${slug.join("/")}`);
}
