import { cache } from "react";
import fs from "node:fs/promises";
import path from "node:path";
import crypto from "node:crypto";

type LivePageManifestRecord = {
  url: string;
  html_file: string;
  text_file: string;
  text_chars: number;
};

type HarBodyManifestRecord = {
  url: string;
  mime: string;
  file: string;
};

export type PageContent = {
  pathname: string;
  title: string;
  description: string;
  hero?: { src: string; alt?: string };
  blocks: Array<
    | { type: "h2"; text: string }
    | { type: "p"; text: string }
    | { type: "a"; href: string; text: string }
    | { type: "ul"; items: string[] }
  >;
  source: "live" | "fallback";
};

const RAW_ROOT = path.join(process.cwd(), "raw");

function normalizeUrl(input: string) {
  try {
    const u = new URL(input);
    u.hash = "";
    if (!u.protocol) u.protocol = "https:";
    return u.toString();
  } catch {
    return input.trim();
  }
}

function sha1Hex8(input: string) {
  return crypto.createHash("sha1").update(input).digest("hex").slice(0, 8);
}

function urlToHarRelPath(url: string) {
  const u = new URL(url);
  const host = u.host.toLowerCase();
  let pathname = u.pathname || "/";
  if (pathname.endsWith("/")) pathname = `${pathname}index`;
  let rel = pathname.replace(/^\//, "");

  // Match `extract_har_to_raw.py` query hashing: `<stem>__q_<hash><suffix>`
  if (u.search && rel) {
    const qHash = sha1Hex8(u.search.replace(/^\?/, ""));
    const parsed = path.posix.parse(rel);
    const stem = parsed.name || "index";
    const suffix = parsed.ext || "";
    rel = path.posix.join(parsed.dir, `${stem}__q_${qHash}${suffix}`);
  }

  return path.posix.join(host, rel);
}

const getHarBodyUrlToFile = cache(async () => {
  const manifestPath = path.join(RAW_ROOT, "manifests", "har_bodies.json");
  try {
    const records = await readJson<HarBodyManifestRecord[]>(manifestPath);
    const map = new Map<string, HarBodyManifestRecord>();
    for (const r of records) {
      if (!r?.url || !r?.file) continue;
      map.set(normalizeUrl(r.url), r);
    }
    return map;
  } catch {
    return new Map<string, HarBodyManifestRecord>();
  }
});

export async function localAssetSrcFromUrl(url: string) {
  const normalized = normalizeUrl(url);

  const variants = (() => {
    const out = [normalized];
    const stripSize = (u: string) => u.replace(/-\d+x\d+(?=\.[a-z0-9]+$)/i, "");
    const stripScaled = (u: string) => u.replace(/-scaled(?=\.[a-z0-9]+$)/i, "");
    const a = stripSize(normalized);
    const b = stripScaled(normalized);
    const c = stripScaled(a);
    for (const v of [a, b, c]) if (v && v !== normalized) out.push(v);
    return Array.from(new Set(out));
  })();

  const map = await getHarBodyUrlToFile();

  for (const candidateUrl of variants) {
    const rec = map.get(candidateUrl);

    // Prefer exact URL match from HAR manifest.
    if (rec?.file) {
      const abs = path.join(process.cwd(), rec.file);
      try {
        await fs.access(abs);
        const rel = path.relative(path.join(process.cwd(), "raw", "har_bodies"), abs);
        const relPosix = rel.split(path.sep).join("/");
        return `/raw-asset/har/${relPosix}`;
      } catch {
        // fall through
      }
    }

    // Fallback: derive expected path.
    try {
      const rel = urlToHarRelPath(candidateUrl);
      const abs = path.join(process.cwd(), "raw", "har_bodies", ...rel.split("/"));
      await fs.access(abs);
      return `/raw-asset/har/${rel}`;
    } catch {
      // fall through
    }

    // Fallback: downloaded live assets bucket.
    try {
      const rel = urlToHarRelPath(candidateUrl);
      const abs = path.join(process.cwd(), "raw", "assets", "live", ...rel.split("/"));
      await fs.access(abs);
      return `/raw-asset/live/${rel}`;
    } catch {
      // fall through
    }
  }

  return null;
}

function firstMetaContent(html: string, matcher: RegExp) {
  const m = html.match(matcher);
  const raw = m?.[1]?.trim();
  return raw || null;
}

function extractHeroCandidates(html: string) {
  const candidates: string[] = [];

  const fromMeta =
    firstMetaContent(html, /<meta[^>]+property=["']og:image["'][^>]+content=["']([^"']+)["'][^>]*>/i) ||
    firstMetaContent(html, /<meta[^>]+name=["']twitter:image["'][^>]+content=["']([^"']+)["'][^>]*>/i);
  if (fromMeta) candidates.push(fromMeta);

  // AIOSEO often embeds the primary image only in JSON-LD.
  const jsonLdMatches = html.matchAll(
    /"@type"\s*:\s*"ImageObject"[^}]*?"url"\s*:\s*"([^"]+)"/gi,
  );
  for (const m of jsonLdMatches) {
    const u = m?.[1]?.trim();
    if (u) candidates.push(u);
  }

  // Also try a plain image URL in JSON-LD objects.
  const imageStringMatches = html.matchAll(/"image"\s*:\s*"([^"]+)"/gi);
  for (const m of imageStringMatches) {
    const u = m?.[1]?.trim();
    if (u && u.startsWith("http")) candidates.push(u);
  }

  // Last resort: first <img src="..."> on the page.
  const fromImg = html.match(/<img[^>]+src=["']([^"']+)["'][^>]*>/i)?.[1]?.trim();
  if (fromImg) candidates.push(fromImg);

  return Array.from(new Set(candidates));
}

function isLikelyContentImageUrl(url: string) {
  const u = url.toLowerCase();
  if (!/\.(jpe?g|png|webp|gif)(\?|$)/i.test(u)) return false;
  if (u.includes("/demo/")) return false;
  if (u.includes("logo")) return false;
  if (u.includes("icon")) return false;
  if (u.includes("elementor")) return false;
  if (u.includes("/wp-content/plugins/")) return false;
  return true;
}

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

function looksLikeHeadingLine(line: string) {
  const t = line.trim();
  if (!t) return false;
  if (t.length < 4 || t.length > 72) return false;
  if (!/[A-Za-z]/.test(t)) return false;
  if (/^\d+$/.test(t)) return false;
  if (t.toLowerCase().includes("© copyright")) return false;
  if (t.endsWith(".") || t.endsWith("!") || t.endsWith(";")) return false;

  const words = t.split(/\s+/g).filter(Boolean);
  if (words.length > 10) return false;
  return /^[A-Z]/.test(t) || t === t.toUpperCase();
}

function isLikelyHeading(line: string) {
  const t = line.trim();
  if (!looksLikeHeadingLine(t)) return false;
  if (NAV_JUNK.has(t.toLowerCase())) return false;
  return true;
}

function cleanLines(lines: string[]) {
  const trimmed = lines.map((l) => l.trim()).filter(Boolean);

  const isAlwaysJunk = (t: string) => {
    if (t.toLowerCase().includes("© copyright")) return true;
    if (t === "Facebook-f" || t === "Twitter" || t === "Instagram" || t === "Youtube") return true;
    if (t === "Let’s Connect" || t === "Let's Connect") return true;
    if (/^\d+$/.test(t)) return true;
    if (t === "View More>>") return true;
    if (t === "Your name" || t === "Your Phone" || t === "Your email") return true;
    if (t === "Your message (optional)" || t === "Subject" || t === "Role" || t === "Other") return true;
    return false;
  };

  // Only treat NAV_JUNK as junk in the initial "menu" portion of the page.
  // Some pages contain legitimate content lines like "Zakat" which would otherwise be incorrectly dropped.
  let contentStart = 1;
  for (let i = 1; i < trimmed.length; i++) {
    const t = trimmed[i]!;
    if (t.toLowerCase().includes("© copyright")) break;
    if (isAlwaysJunk(t)) continue;
    if (NAV_JUNK.has(t.toLowerCase())) continue;
    contentStart = i;
    break;
  }

  const maybeHeading = contentStart > 1 ? trimmed[contentStart - 1] : null;
  const shouldReAddMaybeHeading =
    maybeHeading &&
    NAV_JUNK.has(maybeHeading.toLowerCase()) &&
    looksLikeHeadingLine(maybeHeading) &&
    maybeHeading.toLowerCase() !== (trimmed[0]?.toLowerCase() ?? "");

  const out: string[] = [];
  let last = "";
  for (let i = 0; i < trimmed.length; i++) {
    const t = trimmed[i]!;
    if (t.toLowerCase().includes("© copyright")) break;
    if (isAlwaysJunk(t)) continue;
    if (i < contentStart && NAV_JUNK.has(t.toLowerCase())) continue;
    if (t.toLowerCase() === last.toLowerCase()) continue;
    last = t;
    out.push(t);
  }

  if (shouldReAddMaybeHeading && maybeHeading) {
    // Insert after the title line, if present.
    if (out.length > 0) out.splice(1, 0, maybeHeading);
    else out.push(maybeHeading);
  }

  const footerCut = out.findIndex((l) => l.toLowerCase() === "quick links");
  if (footerCut >= 0) return out.slice(0, footerCut);
  return out;
}

function joinTokenLikeLines(tokens: string[]) {
  const rawTokens = tokens.map((t) => t.trim()).filter(Boolean);

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

  out = out
    .replace(/\s+([,.;:!?])/g, "$1")
    .replace(/\(\s+/g, "(")
    .replace(/\s+\)/g, ")")
    .replace(/\s{2,}/g, " ")
    .trim();
  return out;
}

function collapseWordLikeRuns(lines: string[]) {
  const out: string[] = [];
  let buf: string[] = [];

  const flush = () => {
    const joined = joinTokenLikeLines(buf);
    if (joined) out.push(joined);
    buf = [];
  };

  const isTokenish = (line: string, hasBuf: boolean) => {
    const t = line.trim();
    if (!t) return false;
    if (/^[,.;:!?]/.test(t) && hasBuf) return true;

    const words = t.split(/\s+/g).filter(Boolean);
    if (words.length <= 2 && t.length <= 24) return true;
    if (words.length <= 3 && t.length <= 32) return true;
    if (hasBuf && words.length <= 8 && t.length <= 80) return true;
    return false;
  };

  for (const line of lines) {
    if (isTokenish(line, buf.length > 0)) {
      buf.push(line);
      const currentLen = buf.reduce((sum, t) => sum + t.length + 1, 0);
      const isSentenceEnd = /[.!?]$/.test(line) || line === "." || line === "!" || line === "?";
      if (currentLen > 450 && isSentenceEnd) flush();
      continue;
    }

    flush();
    out.push(line);
  }

  flush();
  return out.filter(Boolean);
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

  const looksLikeUrlLine = (line: string) => /^https?:\/\/\S+$/i.test(line.trim());

  const flushList = () => {
    if (pendingList.length >= 2) blocks.push({ type: "ul", items: pendingList });
    else if (pendingList.length === 1) blocks.push({ type: "p", text: pendingList[0] });
    pendingList = [];
  };

  for (const l of lines) {
    if (looksLikeUrlLine(l)) {
      flushList();
      blocks.push({ type: "a", href: l.trim(), text: l.trim() });
      continue;
    }

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
    const cleaned = collapseWordLikeRuns(cleanLines(rawLines));

    let hero: PageContent["hero"];
    try {
      const absHtml = path.join(process.cwd(), rec.html_file);
      const html = await fs.readFile(absHtml, "utf8");
      for (const candidate of extractHeroCandidates(html)) {
        if (!isLikelyContentImageUrl(candidate)) continue;
        const localSrc = await localAssetSrcFromUrl(candidate);
        if (localSrc) {
          hero = { src: localSrc, alt: "" };
          break;
        }
      }
    } catch {
      // ignore
    }

    const title = guessTitleFromFirstLine(rawLines[0] ?? "", normalized);
    const description = buildDescriptionFromLines(cleaned);
    return {
      pathname: normalized,
      title,
      description,
      hero,
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
