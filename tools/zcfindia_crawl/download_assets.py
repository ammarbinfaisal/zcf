from __future__ import annotations

import argparse
import json
import sys
from pathlib import Path
from urllib.parse import urlsplit, urlunsplit

import requests


def sha1_hex8(s: str) -> str:
    import hashlib

    return hashlib.sha1(s.encode("utf-8")).hexdigest()[:8]


def url_to_rel_path(url: str) -> Path:
    u = urlsplit(url)
    host = (u.netloc or "unknown_host").lower()
    path = u.path or "/"
    if path.endswith("/"):
        path = f"{path}index"
    p = Path(path.lstrip("/"))
    if u.query:
        q_hash = sha1_hex8(u.query)
        p = p.with_name(f"{p.stem}__q_{q_hash}{p.suffix}")
    return Path(host) / p


def normalize_url(url: str) -> str:
    u = urlsplit(url)
    return urlunsplit(("https", u.netloc.lower(), u.path or "/", u.query, ""))


def load_jsonl(path: Path):
    for line in path.read_text(encoding="utf-8", errors="replace").splitlines():
        line = line.strip()
        if not line:
            continue
        yield json.loads(line)


def main() -> int:
    ap = argparse.ArgumentParser()
    ap.add_argument("pages_jsonl", type=Path)
    ap.add_argument("--out", type=Path, default=Path("raw/assets/live"))
    ap.add_argument("--only-primary", action="store_true")
    ap.add_argument("--limit", type=int, default=120)
    args = ap.parse_args()

    out_root: Path = args.out
    out_root.mkdir(parents=True, exist_ok=True)

    allowed_host = {"zcfindia.org"}

    urls: list[str] = []
    for row in load_jsonl(args.pages_jsonl):
        if args.only_primary:
            u = row.get("primary_image")
            if isinstance(u, str) and u.startswith("http"):
                urls.append(u)
            continue
        for u in (row.get("images") or [])[:20]:
            if isinstance(u, str) and u.startswith("http"):
                urls.append(u)

    # de-dupe keep order
    seen = set()
    uniq: list[str] = []
    for u in urls:
        nu = normalize_url(u)
        host = urlsplit(nu).netloc.lower()
        if host not in allowed_host:
            continue
        if nu in seen:
            continue
        seen.add(nu)
        uniq.append(nu)
        if len(uniq) >= args.limit:
            break

    sess = requests.Session()
    sess.headers.update(
        {
            "User-Agent": "Mozilla/5.0 (compatible; zcf-asset-downloader/1.0)",
            "Accept": "image/*,*/*;q=0.8",
        }
    )

    downloaded = 0
    skipped_exists = 0
    failed = 0

    for url in uniq:
        rel = url_to_rel_path(url)
        out_file = out_root / rel
        out_file.parent.mkdir(parents=True, exist_ok=True)

        # Skip if already present in either har_bodies or live bucket.
        har_file = Path("raw/har_bodies") / rel
        if har_file.exists() or out_file.exists():
            skipped_exists += 1
            continue

        try:
            r = sess.get(url, timeout=25)
            if r.status_code != 200 or not r.content:
                failed += 1
                continue
            out_file.write_bytes(r.content)
            downloaded += 1
        except Exception:
            failed += 1

    print(
        json.dumps(
            {
                "candidates": len(uniq),
                "downloaded": downloaded,
                "skipped_exists": skipped_exists,
                "failed": failed,
                "out_root": str(out_root),
            },
            indent=2,
        )
    )
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
