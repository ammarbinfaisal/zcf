from __future__ import annotations

import json
import sys
from collections import Counter, defaultdict
from dataclasses import dataclass
from pathlib import Path
from urllib.parse import urlsplit


def load_jsonl(path: Path):
    out = []
    for line in path.read_text(encoding="utf-8", errors="replace").splitlines():
        line = line.strip()
        if not line:
            continue
        out.append(json.loads(line))
    return out


def main() -> int:
    if len(sys.argv) < 3:
        print("Usage: analyze.py <pages.jsonl> <report.json>")
        return 2

    in_path = Path(sys.argv[1])
    out_path = Path(sys.argv[2])
    rows = load_jsonl(in_path)

    kind_counts = Counter(r.get("kind") for r in rows)
    path_prefix = Counter()
    by_kind_examples: dict[str, list[str]] = defaultdict(list)

    for r in rows:
        path = (r.get("path") or "/").strip("/")
        prefix = path.split("/", 1)[0] if path else "/"
        path_prefix[prefix] += 1
        k = r.get("kind") or "unknown"
        if len(by_kind_examples[k]) < 5:
            by_kind_examples[k].append(r.get("url"))

    # crude blog detection
    posts = [r for r in rows if r.get("kind") == "post"]
    pages = [r for r in rows if r.get("kind") in {"page", "home"}]

    report = {
        "pages_total": len(rows),
        "kinds": dict(kind_counts),
        "path_prefixes": dict(path_prefix.most_common(25)),
        "examples": dict(by_kind_examples),
        "posts_total": len(posts),
        "pages_total_including_home": len(pages),
        "notes": [
            "This site appears to be WordPress (Elementor + AIOSEO JSON-LD).",
            "Most primary media is embedded in JSON-LD ImageObject rather than og:image meta tags.",
            "Blog posts are standard WP single-post pages; category/author/archive listings are separate routes.",
        ],
        "cms_mapping": {
            "pages": {
                "collection": "pages",
                "key": "slug",
                "fields": ["title", "slug", "heroMedia", "contentRichText", "seo"],
            },
            "posts": {
                "collection": "posts",
                "key": "slug",
                "fields": [
                    "title",
                    "slug",
                    "featuredImage",
                    "publishedAt",
                    "excerpt",
                    "contentRichText",
                    "seo",
                ],
            },
            "media": {
                "collection": "media",
                "fields": ["file", "alt", "caption", "credit"],
            },
        },
    }

    out_path.parent.mkdir(parents=True, exist_ok=True)
    out_path.write_text(json.dumps(report, indent=2), encoding="utf-8")
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
