from __future__ import annotations

import json
import re
from dataclasses import asdict, dataclass
from typing import Iterable
from urllib.parse import urljoin, urlsplit, urlunsplit

import scrapy
from bs4 import BeautifulSoup


SKIP_EXTENSIONS = {
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


def normalize_url(url: str) -> str:
    u = urlsplit(url)
    scheme = "https"
    netloc = (u.netloc or "").lower()
    path = u.path or "/"
    # normalize trailing slash for route-like URLs
    if "." not in path.split("/")[-1] and not path.endswith("/"):
        path += "/"
    return urlunsplit((scheme, netloc, path, u.query, ""))


def is_internal(url: str, allowed: set[str]) -> bool:
    try:
        u = urlsplit(url)
    except Exception:
        return False
    return (u.netloc or "").lower() in allowed


def should_skip_link(url: str) -> bool:
    u = urlsplit(url)
    ext = (u.path or "").lower()
    dot = ext.rsplit(".", 1)
    if len(dot) == 2:
        if f".{dot[1]}" in SKIP_EXTENSIONS:
            return True
    if "/wp-admin" in (u.path or ""):
        return True
    return False


def pick_main_container(soup: BeautifulSoup):
    # WordPress patterns (Astra/Elementor/etc)
    for selector in [
        "article",
        "main",
        "div#content",
        "div.site-content",
        "div.content-area",
        "div#primary",
    ]:
        el = soup.select_one(selector)
        if el:
            return el
    return soup.body


def extract_json_ld(soup: BeautifulSoup) -> list[object]:
    out: list[object] = []
    for s in soup.select('script[type="application/ld+json"]'):
        raw = (s.string or "").strip()
        if not raw:
            continue
        try:
            out.append(json.loads(raw))
        except Exception:
            # sometimes multiple JSON objects are concatenated
            try:
                raw2 = raw.strip().lstrip("\ufeff")
                out.append(json.loads(raw2))
            except Exception:
                continue
    return out


def find_first_image_url(json_ld: list[object]) -> str | None:
    def walk(o: object) -> Iterable[object]:
        if isinstance(o, dict):
            yield o
            for v in o.values():
                yield from walk(v)
        elif isinstance(o, list):
            for it in o:
                yield from walk(it)

    for node in walk(json_ld):
        if not isinstance(node, dict):
            continue
        if node.get("@type") in {"ImageObject", "imageObject"}:
            url = node.get("url")
            if isinstance(url, str) and url.startswith("http"):
                return url
        img = node.get("image")
        if isinstance(img, str) and img.startswith("http"):
            return img
        if isinstance(img, dict):
            u = img.get("url")
            if isinstance(u, str) and u.startswith("http"):
                return u
    return None


def page_kind(path: str, body_class: str) -> str:
    p = path.strip("/")
    if not p:
        return "home"
    if p.startswith("category/"):
        return "category"
    if p.startswith("author/"):
        return "author"
    if re.match(r"^\d{4}/\d{2}/?$", p):
        return "archive_month"
    if "single-post" in body_class:
        return "post"
    if "page" in body_class:
        return "page"
    return "unknown"


@dataclass
class PageRecord:
    url: str
    path: str
    kind: str
    title: str | None
    meta_description: str | None
    published_time: str | None
    modified_time: str | None
    primary_image: str | None
    images: list[str]
    content_html: str | None
    content_text: str | None
    out_links: list[str]


class ZCFIndiaSpider(scrapy.Spider):
    name = "zcfindia"
    allowed_domains = ["zcfindia.org"]
    start_urls = ["https://zcfindia.org/"]

    custom_settings = {
        "ROBOTSTXT_OBEY": True,
        "USER_AGENT": "Mozilla/5.0 (compatible; zcf-scrapy-crawler/1.0)",
        "DOWNLOAD_DELAY": 0.2,
        "CONCURRENT_REQUESTS": 8,
        "AUTOTHROTTLE_ENABLED": True,
        "AUTOTHROTTLE_TARGET_CONCURRENCY": 2.0,
        "AUTOTHROTTLE_START_DELAY": 0.25,
        "AUTOTHROTTLE_MAX_DELAY": 4.0,
        "LOG_LEVEL": "INFO",
    }

    def parse(self, response: scrapy.http.Response):
        allowed = {d.lower() for d in self.allowed_domains}
        base = response.url

        soup = BeautifulSoup(response.text, "lxml")
        title = soup.title.get_text(" ", strip=True) if soup.title else None
        meta_desc = None
        md = soup.find("meta", attrs={"name": "description"})
        if md and md.get("content"):
            meta_desc = str(md.get("content")).strip() or None

        pub = None
        mod = None
        m1 = soup.find("meta", attrs={"property": "article:published_time"})
        m2 = soup.find("meta", attrs={"property": "article:modified_time"})
        if m1 and m1.get("content"):
            pub = str(m1.get("content")).strip() or None
        if m2 and m2.get("content"):
            mod = str(m2.get("content")).strip() or None

        json_ld = extract_json_ld(soup)
        primary_img = find_first_image_url(json_ld)

        container = pick_main_container(soup)
        content_html = None
        content_text = None
        if container is not None:
            content_html = str(container)
            content_text = container.get_text("\n", strip=True) or None

        images: list[str] = []
        for img in soup.select("img"):
            src = img.get("src")
            if not src:
                continue
            abs_url = urljoin(base, src)
            if abs_url.startswith("http"):
                images.append(abs_url)
        if primary_img:
            images.insert(0, primary_img)
        # de-dupe keep order
        seen = set()
        images2 = []
        for u in images:
            nu = normalize_url(u)
            if nu in seen:
                continue
            seen.add(nu)
            images2.append(nu)

        body_class = ""
        b = soup.body
        if b and b.get("class"):
            body_class = " ".join([str(c) for c in b.get("class") if c])

        path = urlsplit(base).path or "/"
        kind = page_kind(path, body_class)

        out_links: list[str] = []
        for a in soup.select("a[href]"):
            href = a.get("href")
            if not href:
                continue
            abs_url = urljoin(base, href)
            if not abs_url.startswith("http"):
                continue
            if should_skip_link(abs_url):
                continue
            if not is_internal(abs_url, allowed):
                continue
            out_links.append(normalize_url(abs_url))

        rec = PageRecord(
            url=normalize_url(base),
            path=(urlsplit(base).path or "/"),
            kind=kind,
            title=title,
            meta_description=meta_desc,
            published_time=pub,
            modified_time=mod,
            primary_image=normalize_url(primary_img) if primary_img else None,
            images=images2[:50],
            content_html=content_html,
            content_text=(
                "\n".join(content_text.splitlines()[:400]) if content_text else None
            ),
            out_links=out_links,
        )
        yield asdict(rec)

        for link in out_links:
            yield response.follow(link, callback=self.parse)
