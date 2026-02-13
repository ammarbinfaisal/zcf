import fs from "node:fs/promises";
import path from "node:path";
import { spawn } from "node:child_process";

type ScrapyPage = {
  url: string;
  path: string;
  kind: string;
  title?: string | null;
  content_html?: string | null;
};

function normalizePathname(input: string) {
  if (!input) return "/";
  let p = input.trim();
  if (!p.startsWith("/")) p = `/${p}`;
  if (p !== "/" && !p.endsWith("/")) p = `${p}/`;
  p = p.replace(/\/+/g, "/");
  return p;
}

async function fileExists(filePath: string) {
  try {
    await fs.access(filePath);
    return true;
  } catch {
    return false;
  }
}

async function runClaude(prompt: string, model?: string) {
  return await new Promise<string>((resolve, reject) => {
    const args = ["-p", "--output-format=text"];
    if (model) args.push("--model", model);
    args.push(prompt);

    const child = spawn("claude", args, { stdio: ["ignore", "pipe", "pipe"] });
    let out = "";
    let err = "";
    child.stdout.on("data", (d) => (out += String(d)));
    child.stderr.on("data", (d) => (err += String(d)));
    child.on("error", (e) => reject(e));
    child.on("close", (code) => {
      if (code === 0) resolve(out.trim());
      else reject(new Error(err.trim() || `claude exited with code ${code}`));
    });
  });
}

function promptForMarkdown({
  url,
  pathname,
  title,
  html,
}: {
  url: string;
  pathname: string;
  title: string;
  html: string;
}) {
  return [
    "You are a content migration tool.",
    "Convert the provided HTML into clean Markdown for importing into Payload CMS rich text.",
    "",
    "Rules:",
    "- Output ONLY Markdown (no explanations, no code fences).",
    "- Do NOT output a '# ' H1 heading. Use '##' and '###' for headings.",
    "- Preserve semantics: headings, paragraphs, bold/italic, lists, and links.",
    "- Remove navigation/menu/footer, social icon labels, repeated \"Quick Links\" blocks, bank account blocks, and form field labels.",
    "- If the content has no meaningful body, output a short paragraph explaining content was not captured.",
    "",
    `Page: ${title}`,
    `Path: ${pathname}`,
    `URL: ${url}`,
    "",
    "HTML:",
    html,
  ].join("\n");
}

async function loadPagesJsonl(filePath: string) {
  const raw = await fs.readFile(filePath, "utf8");
  return raw
    .split(/\r?\n/g)
    .map((l) => l.trim())
    .filter(Boolean)
    .map((l) => JSON.parse(l) as ScrapyPage);
}

type MarkdownRecord = {
  path: string;
  url: string;
  title: string;
  markdown: string;
  model?: string;
  createdAt: string;
};

async function loadExisting(outFile: string) {
  if (!(await fileExists(outFile))) return new Map<string, MarkdownRecord>();
  const raw = await fs.readFile(outFile, "utf8");
  const map = new Map<string, MarkdownRecord>();
  for (const line of raw.split(/\r?\n/g)) {
    const t = line.trim();
    if (!t) continue;
    try {
      const rec = JSON.parse(t) as MarkdownRecord;
      if (rec?.path) map.set(normalizePathname(rec.path), rec);
    } catch {
      // ignore invalid line
    }
  }
  return map;
}

function argValue(flag: string) {
  const idx = process.argv.indexOf(flag);
  if (idx < 0) return null;
  return process.argv[idx + 1] ?? null;
}

async function main() {
  const repoRoot = path.resolve(path.join(__dirname, "..", "..", ".."));
  const inFile =
    argValue("--in") ?? path.join(repoRoot, "raw", "scrapy", "pages.jsonl");
  const outFile =
    argValue("--out") ?? path.join(repoRoot, "raw", "claude", "markdown.jsonl");
  const model = argValue("--model") ?? process.env.CLAUDE_MODEL ?? "sonnet";
  const limitRaw = argValue("--limit") ?? process.env.CLAUDE_LIMIT ?? "";
  const limit = limitRaw ? Number(limitRaw) : Infinity;

  await fs.mkdir(path.dirname(outFile), { recursive: true });
  const existing = await loadExisting(outFile);
  const pages = await loadPagesJsonl(inFile);

  const outLines: string[] = [];
  let processed = 0;

  for (const p of pages) {
    if (processed >= limit) break;
    const pathname = normalizePathname(p.path);
    const title = (p.title || "").trim() || pathname;
    const html = (p.content_html || "").trim();
    if (!html) continue;
    if (existing.has(pathname)) continue;

    const prompt = promptForMarkdown({
      url: p.url,
      pathname,
      title,
      html,
    });

    const markdown = await runClaude(prompt, model);
    const rec: MarkdownRecord = {
      path: pathname,
      url: p.url,
      title,
      markdown,
      model,
      createdAt: new Date().toISOString(),
    };
    outLines.push(JSON.stringify(rec));
    existing.set(pathname, rec);
    processed += 1;
  }

  if (outLines.length) {
    const prefix = (await fileExists(outFile)) ? "\n" : "";
    await fs.appendFile(outFile, prefix + outLines.join("\n"), "utf8");
  }

  // eslint-disable-next-line no-console
  console.log(
    JSON.stringify(
      {
        inFile,
        outFile,
        generated: outLines.length,
        totalKnown: existing.size,
        note:
          "If Claude prints a usage/limit message, wait for your Claude Code quota reset and rerun.",
      },
      null,
      2,
    ),
  );
}

main().catch((err) => {
  // eslint-disable-next-line no-console
  console.error(err);
  process.exit(1);
});

