import fs from "node:fs/promises";
import path from "node:path";

function contentTypeFromExt(ext: string) {
  switch (ext.toLowerCase()) {
    case ".jpg":
    case ".jpeg":
      return "image/jpeg";
    case ".png":
      return "image/png";
    case ".webp":
      return "image/webp";
    case ".gif":
      return "image/gif";
    case ".svg":
      return "image/svg+xml";
    case ".ico":
      return "image/x-icon";
    case ".css":
      return "text/css; charset=utf-8";
    case ".js":
    case ".mjs":
      return "text/javascript; charset=utf-8";
    case ".json":
      return "application/json; charset=utf-8";
    case ".html":
      return "text/html; charset=utf-8";
    case ".woff2":
      return "font/woff2";
    case ".woff":
      return "font/woff";
    case ".ttf":
      return "font/ttf";
    case ".mp4":
      return "video/mp4";
    default:
      return "application/octet-stream";
  }
}

function baseDirForBucket(bucket: string) {
  const root = process.cwd();
  if (bucket === "har") return path.join(root, "raw", "har_bodies");
  if (bucket === "live") return path.join(root, "raw", "assets", "live");
  return null;
}

export async function GET(
  _req: Request,
  { params }: { params: Promise<{ path?: string[] }> },
) {
  const { path: parts } = await params;
  if (!parts || parts.length < 2) return new Response("Not found", { status: 404 });

  const [bucket, ...rest] = parts;
  const base = baseDirForBucket(bucket);
  if (!base) return new Response("Not found", { status: 404 });

  const requested = path.join(base, ...rest);
  const resolved = path.resolve(requested);
  const resolvedBase = path.resolve(base);
  if (!resolved.startsWith(resolvedBase + path.sep) && resolved !== resolvedBase) {
    return new Response("Bad request", { status: 400 });
  }

  try {
    const data = await fs.readFile(resolved);
    const ext = path.extname(resolved);
    return new Response(data, {
      status: 200,
      headers: {
        "Content-Type": contentTypeFromExt(ext),
        "Cache-Control": "public, max-age=31536000, immutable",
      },
    });
  } catch {
    return new Response("Not found", { status: 404 });
  }
}
