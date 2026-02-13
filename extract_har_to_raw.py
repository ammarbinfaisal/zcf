#!/usr/bin/env python3
from __future__ import annotations

import base64
import json
import mimetypes
import re
import sys
from collections import Counter, deque
from dataclasses import dataclass
from datetime import datetime, timezone
from hashlib import sha1
from html.parser import HTMLParser
from pathlib import Path
from typing import Iterable
from urllib.parse import urljoin, urlsplit, urlunsplit
from urllib.request import Request, urlopen


HAR_GLOB = "*.har"
RAW_DIR = Path("raw")
MAX_CRAWL_PAGES = 60
HTTP_TIMEOUT = 25

SKIP_ROUTE_EXTENSIONS = {
    ".jpg",
    ".jpeg",
    ".png",
    ".gif",
    ".webp",
    ".svg",
    ".ico",
    ".css",
    ".js",
    ".mjs",
    ".woff",
    ".woff2",
    ".ttf",
    ".eot",
    ".otf",
    ".pdf",
    ".mp4",
    ".mp3",
    ".webm",
    ".zip",
    ".gz",
    ".rar",
    ".7z",
    ".xml",
    ".json",
    ".txt",
}


def ensure_dir(path: Path) -> None:
    path.mkdir(parents=True, exist_ok=True)


def safe_segment(value: str) -> str:
    value = value.strip()
    if not value:
        return "_"
    value = re.sub(r"[^A-Za-z0-9._-]+", "_", value)
    return value[:180] or "_"


def split_url(url: str):
    return urlsplit(url)


def normalize_base_url(url: str) -> str:
    parsed = split_url(url)
    scheme = "https"
    netloc = parsed.netloc.lower()
    path = parsed.path or "/"
    if "." not in Path(path).name and not path.endswith("/"):
        path += "/"
    return urlunsplit((scheme, netloc, path, "", ""))


def canonical_route_path(url: str) -> str:
    parsed = split_url(url)
    path = parsed.path or "/"
    if "." not in Path(path).name and not path.endswith("/"):
        path += "/"
    return path


def url_to_rel_path(url: str, default_ext: str | None = None) -> Path:
    parsed = split_url(url)
    host = safe_segment(parsed.netloc.lower() or "unknown_host")
    path = parsed.path or "/"
    if path.endswith("/"):
        path = f"{path}index"
    p = Path(path.lstrip("/"))
    if not p.name:
        p = Path("index")
    suffix = p.suffix
    if not suffix and default_ext:
        p = p.with_suffix(default_ext)
    if parsed.query:
        q_hash = sha1(parsed.query.encode("utf-8")).hexdigest()[:8]
        p = p.with_name(f"{safe_segment(p.stem)}__q_{q_hash}{p.suffix}")
    return Path(host) / p


def guess_ext_from_mime(mime: str) -> str | None:
    if not mime:
        return None
    mime = mime.split(";")[0].strip().lower()
    if mime == "application/x-javascript":
        return ".js"
    if mime == "text/javascript":
        return ".js"
    if mime == "text/html":
        return ".html"
    if mime == "image/webp":
        return ".webp"
    if mime == "application/json+protobuf":
        return ".pb.json"
    ext = mimetypes.guess_extension(mime)
    if ext == ".jpe":
        ext = ".jpg"
    return ext


def decode_har_body(content: dict) -> bytes | None:
    text = content.get("text")
    if text is None:
        return None
    encoding = content.get("encoding")
    if encoding == "base64":
        try:
            return base64.b64decode(text, validate=False)
        except Exception:
            return None
    return text.encode("utf-8", errors="replace")


def is_html_mime(mime: str) -> bool:
    return (mime or "").split(";")[0].strip().lower() == "text/html"


class HTMLCollector(HTMLParser):
    def __init__(self, base_url: str):
        super().__init__(convert_charrefs=True)
        self.base_url = base_url
        self.links: set[str] = set()
        self.assets: set[str] = set()
        self._skip_depth = 0
        self._text_parts: list[str] = []

    def handle_starttag(self, tag: str, attrs: list[tuple[str, str | None]]) -> None:
        attr = dict(attrs)
        if tag in {"script", "style", "noscript", "template"}:
            self._skip_depth += 1

        def _add_url(raw: str | None, out: set[str]) -> None:
            if not raw:
                return
            joined = urljoin(self.base_url, raw.strip())
            parsed = split_url(joined)
            if parsed.scheme not in {"http", "https"}:
                return
            normalized = urlunsplit(
                (parsed.scheme, parsed.netloc, parsed.path or "/", parsed.query, "")
            )
            out.add(normalized)

        if tag == "a":
            _add_url(attr.get("href"), self.links)

        if tag in {"img", "script", "iframe", "source", "video", "audio"}:
            _add_url(attr.get("src"), self.assets)
        if tag == "link":
            _add_url(attr.get("href"), self.assets)

        srcset = attr.get("srcset")
        if srcset:
            for item in srcset.split(","):
                candidate = item.strip().split(" ")[0]
                if candidate:
                    _add_url(candidate, self.assets)

    def handle_endtag(self, tag: str) -> None:
        if tag in {"script", "style", "noscript", "template"} and self._skip_depth > 0:
            self._skip_depth -= 1

    def handle_data(self, data: str) -> None:
        if self._skip_depth > 0:
            return
        txt = re.sub(r"\s+", " ", data).strip()
        if txt:
            self._text_parts.append(txt)

    @property
    def text(self) -> str:
        return "\n".join(self._text_parts)


def route_tree(urls: Iterable[str]) -> dict:
    tree: dict = {}
    for url in sorted(set(urls)):
        parsed = split_url(url)
        path = parsed.path or "/"
        parts = [p for p in path.split("/") if p]
        cursor = tree
        if not parts:
            cursor["/"] = {}
            continue
        for part in parts:
            cursor = cursor.setdefault(part, {})
    return tree


def fetch_url(url: str) -> tuple[bytes | None, str, str | None]:
    request = Request(
        url,
        headers={
            "User-Agent": "Mozilla/5.0 (compatible; zcf-har-extractor/1.0)",
            "Accept": "*/*",
        },
    )
    try:
        with urlopen(request, timeout=HTTP_TIMEOUT) as resp:
            data = resp.read()
            content_type = resp.headers.get("Content-Type", "")
            final_url = resp.geturl()
            return data, content_type, final_url
    except Exception:
        return None, "", None


def main() -> int:
    cwd = Path(".")
    har_files = sorted(cwd.glob(HAR_GLOB))
    if not har_files:
        print("No .har files found in current directory.", file=sys.stderr)
        return 1

    ensure_dir(RAW_DIR)
    ensure_dir(RAW_DIR / "har_bodies")
    ensure_dir(RAW_DIR / "manifests")
    ensure_dir(RAW_DIR / "routes")
    ensure_dir(RAW_DIR / "content")
    ensure_dir(RAW_DIR / "content" / "live_pages")
    ensure_dir(RAW_DIR / "content" / "har_pages")
    ensure_dir(RAW_DIR / "assets" / "live")

    har_manifest = []
    har_body_records = []
    har_body_files: set[str] = set()
    missing_body_records = []
    har_page_text_records = []
    page_seed_urls: set[str] = set()
    html_seed_urls: set[str] = set()
    primary_hosts: set[str] = set()
    all_har_urls: set[str] = set()
    mime_counter: Counter[str] = Counter()
    status_counter: Counter[int] = Counter()

    for har_path in har_files:
        with har_path.open("r", encoding="utf-8", errors="replace") as f:
            data = json.load(f)
        log = data.get("log", {})
        entries = log.get("entries", [])
        pages = log.get("pages", [])

        page_urls = []
        for p in pages:
            title = p.get("title", "")
            if isinstance(title, str) and title.startswith(("http://", "https://")):
                page_urls.append(title)
                page_seed_urls.add(normalize_base_url(title))
                primary_hosts.add(split_url(title).netloc.lower())

        for entry in entries:
            request = entry.get("request", {})
            response = entry.get("response", {})
            content = response.get("content", {}) if isinstance(response, dict) else {}
            url = request.get("url")
            if not isinstance(url, str) or not url.startswith(("http://", "https://")):
                continue
            all_har_urls.add(url)

            status = int(response.get("status", 0) or 0)
            mime = (content.get("mimeType") or "").split(";")[0].strip()
            mime_counter[mime or "unknown"] += 1
            status_counter[status] += 1

            host = split_url(url).netloc.lower()
            if host in primary_hosts and is_html_mime(mime):
                html_seed_urls.add(normalize_base_url(url))

            payload = decode_har_body(content)
            if payload is None:
                missing_body_records.append(
                    {
                        "har_file": har_path.name,
                        "url": url,
                        "status": status,
                        "mime": mime,
                    }
                )
                continue

            ext = guess_ext_from_mime(mime)
            rel_path = url_to_rel_path(url, default_ext=ext)
            out_file = RAW_DIR / "har_bodies" / rel_path
            ensure_dir(out_file.parent)
            out_file.write_bytes(payload)
            har_body_files.add(str(out_file.as_posix()))

            har_body_records.append(
                {
                    "har_file": har_path.name,
                    "url": url,
                    "status": status,
                    "mime": mime,
                    "size_bytes": len(payload),
                    "file": str(out_file.as_posix()),
                }
            )

            if host in primary_hosts and is_html_mime(mime):
                html = payload.decode("utf-8", errors="replace")
                collector = HTMLCollector(url)
                collector.feed(html)
                txt_path = (
                    RAW_DIR
                    / "content"
                    / "har_pages"
                    / url_to_rel_path(url, default_ext=".txt")
                )
                ensure_dir(txt_path.parent)
                txt_path.write_text(collector.text, encoding="utf-8")
                har_page_text_records.append(
                    {
                        "url": url,
                        "text_file": str(txt_path.as_posix()),
                        "text_chars": len(collector.text),
                    }
                )

        har_manifest.append(
            {
                "har_file": har_path.name,
                "entries": len(entries),
                "pages": len(pages),
                "page_urls": sorted(page_urls),
            }
        )

    seed_routes = sorted(page_seed_urls | html_seed_urls)
    if not primary_hosts and seed_routes:
        primary_hosts = {split_url(seed_routes[0]).netloc.lower()}

    crawl_queue = deque(seed_routes[:MAX_CRAWL_PAGES])
    visited_routes: set[str] = set()
    crawled_pages = []
    crawl_failures = []
    discovered_asset_urls: set[str] = set()
    discovered_route_urls: set[str] = set(seed_routes)

    while crawl_queue and len(visited_routes) < MAX_CRAWL_PAGES:
        current = crawl_queue.popleft()
        if current in visited_routes:
            continue
        visited_routes.add(current)

        data, content_type, final_url = fetch_url(current)
        if data is None:
            crawl_failures.append({"url": current, "reason": "fetch_failed"})
            continue
        final = normalize_base_url(final_url or current)

        mime = content_type.split(";")[0].strip().lower()
        if mime != "text/html":
            continue

        html = data.decode("utf-8", errors="replace")
        collector = HTMLCollector(final)
        collector.feed(html)

        rel_html = url_to_rel_path(final, default_ext=".html")
        html_out = RAW_DIR / "content" / "live_pages" / rel_html
        txt_out = RAW_DIR / "content" / "live_pages" / rel_html.with_suffix(".txt")
        ensure_dir(html_out.parent)
        html_out.write_text(html, encoding="utf-8")
        txt_out.write_text(collector.text, encoding="utf-8")

        crawled_pages.append(
            {
                "url": final,
                "html_file": str(html_out.as_posix()),
                "text_file": str(txt_out.as_posix()),
                "text_chars": len(collector.text),
            }
        )

        for link in collector.links:
            parsed = split_url(link)
            host = parsed.netloc.lower()
            if host not in primary_hosts:
                continue
            path = parsed.path or "/"
            ext = Path(path).suffix.lower()
            if ext in SKIP_ROUTE_EXTENSIONS:
                continue
            normalized = normalize_base_url(link)
            discovered_route_urls.add(normalized)
            if (
                normalized not in visited_routes
                and len(visited_routes) + len(crawl_queue) < MAX_CRAWL_PAGES
            ):
                crawl_queue.append(normalized)

        for asset in collector.assets:
            parsed = split_url(asset)
            if parsed.scheme in {"http", "https"}:
                discovered_asset_urls.add(
                    urlunsplit(
                        (
                            parsed.scheme,
                            parsed.netloc,
                            parsed.path or "/",
                            parsed.query,
                            "",
                        )
                    )
                )

    same_host_assets = []
    skipped_assets = []
    for asset_url in sorted(discovered_asset_urls):
        parsed = split_url(asset_url)
        host = parsed.netloc.lower()
        if host not in primary_hosts:
            skipped_assets.append({"url": asset_url, "reason": "external_host"})
            continue
        same_host_assets.append({"url": asset_url})

    all_routes = sorted(discovered_route_urls | set(seed_routes))
    all_route_paths = sorted({canonical_route_path(u) for u in all_routes})
    routes_json = {
        "primary_hosts": sorted(primary_hosts),
        "seed_routes": seed_routes,
        "all_routes": all_routes,
        "all_route_paths": all_route_paths,
        "route_tree": route_tree(all_route_paths),
    }
    (RAW_DIR / "routes" / "routes.json").write_text(
        json.dumps(routes_json, indent=2), encoding="utf-8"
    )
    (RAW_DIR / "routes" / "routes.txt").write_text(
        "\n".join(all_route_paths) + "\n", encoding="utf-8"
    )

    combined_text_parts = []
    for item in sorted(crawled_pages, key=lambda x: x["url"]):
        text_file = Path(item["text_file"])
        text = text_file.read_text(encoding="utf-8", errors="replace")
        combined_text_parts.append(f"# {item['url']}\n\n{text}\n")
    (RAW_DIR / "content" / "all_live_page_text.md").write_text(
        "\n".join(combined_text_parts), encoding="utf-8"
    )

    (RAW_DIR / "manifests" / "har_summary.json").write_text(
        json.dumps(har_manifest, indent=2), encoding="utf-8"
    )
    (RAW_DIR / "manifests" / "har_bodies.json").write_text(
        json.dumps(har_body_records, indent=2), encoding="utf-8"
    )
    (RAW_DIR / "manifests" / "missing_har_bodies.json").write_text(
        json.dumps(missing_body_records, indent=2), encoding="utf-8"
    )
    (RAW_DIR / "manifests" / "har_page_text.json").write_text(
        json.dumps(har_page_text_records, indent=2), encoding="utf-8"
    )
    (RAW_DIR / "manifests" / "live_pages.json").write_text(
        json.dumps(crawled_pages, indent=2), encoding="utf-8"
    )
    (RAW_DIR / "manifests" / "live_assets.json").write_text(
        json.dumps(same_host_assets, indent=2), encoding="utf-8"
    )
    (RAW_DIR / "manifests" / "live_asset_skips.json").write_text(
        json.dumps(skipped_assets, indent=2), encoding="utf-8"
    )
    (RAW_DIR / "manifests" / "crawl_failures.json").write_text(
        json.dumps(crawl_failures, indent=2), encoding="utf-8"
    )

    report = {
        "generated_at_utc": datetime.now(timezone.utc).isoformat(),
        "har_files": [p.name for p in har_files],
        "har_entries_total": sum(item["entries"] for item in har_manifest),
        "har_pages_total": sum(item["pages"] for item in har_manifest),
        "primary_hosts": sorted(primary_hosts),
        "har_urls_total": len(all_har_urls),
        "har_saved_body_records": len(har_body_records),
        "har_saved_body_files_unique": len(har_body_files),
        "har_missing_bodies": len(missing_body_records),
        "live_pages_crawled": len(crawled_pages),
        "live_routes_found": len(all_routes),
        "live_route_paths_found": len(all_route_paths),
        "live_assets_discovered_same_host": len(same_host_assets),
        "live_assets_skipped": len(skipped_assets),
        "crawl_failures": len(crawl_failures),
        "mime_counts": dict(mime_counter),
        "status_counts": {str(k): v for k, v in status_counter.items()},
    }
    (RAW_DIR / "manifests" / "report.json").write_text(
        json.dumps(report, indent=2), encoding="utf-8"
    )

    readme = f"""# Raw Site Extraction

Generated: {report["generated_at_utc"]}

This folder contains a structured extraction of site routes, content, and assets based on local HAR files (`{", ".join(report["har_files"])}`) plus live route crawling seeded from HAR-discovered pages.

## What was extracted

- HAR files analyzed: {len(har_files)}
- HAR entries: {report["har_entries_total"]}
- HAR body records saved from HAR: {report["har_saved_body_records"]}
- Unique HAR body files written to disk: {report["har_saved_body_files_unique"]}
- HAR entries missing body payload in HAR: {report["har_missing_bodies"]}
- Live HTML pages crawled: {report["live_pages_crawled"]}
- Total discovered routes (URL form): {report["live_routes_found"]}
- Total discovered route paths (deduplicated): {report["live_route_paths_found"]}
- Live asset URLs discovered on primary host: {report["live_assets_discovered_same_host"]}
- Live assets skipped: {report["live_assets_skipped"]}

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
"""
    (RAW_DIR / "README.md").write_text(readme, encoding="utf-8")

    print(json.dumps(report, indent=2))
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
