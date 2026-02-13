# zcfindia.org crawler (Scrapy + BeautifulSoup4)

This crawler produces a structured JSONL dump + a small analysis report.

## Setup (uv)

From repo root:

```bash
uv venv tools/zcfindia_crawl/.venv
source tools/zcfindia_crawl/.venv/bin/activate
uv pip install -r tools/zcfindia_crawl/requirements.txt
```

## Crawl

```bash
python -m scrapy runspider tools/zcfindia_crawl/zcfindia_spider.py -O raw/scrapy/pages.jsonl
python tools/zcfindia_crawl/analyze.py raw/scrapy/pages.jsonl raw/scrapy/report.json
```

Outputs:
- `raw/scrapy/pages.jsonl`
- `raw/scrapy/report.json`
