import fs from "node:fs/promises";
import path from "node:path";

import { ImageResponse } from "next/og";
import type { NextRequest } from "next/server";

import { getPageContentByPathname } from "@/lib/raw-content";
import { site } from "@/lib/site";

export const runtime = "nodejs";

const OG_SIZE = { width: 1200, height: 630 };

function normalizePathname(input: string) {
  if (!input) return "/";
  let p = input.trim();
  if (!p.startsWith("/")) p = `/${p}`;
  if (p !== "/" && !p.endsWith("/")) p = `${p}/`;
  p = p.replace(/\/+/g, "/");
  return p;
}

async function getLogo() {
  const abs = path.join(process.cwd(), "public", "media", "logo.png");
  return fs.readFile(abs);
}

export async function GET(req: NextRequest) {
  const requested = req.nextUrl.searchParams.get("path") || "/";
  const pathname = normalizePathname(requested);

  const page = await getPageContentByPathname(pathname);
  const title = (page.title || site.name).slice(0, 90);
  const description = (page.description || site.tagline).slice(0, 160);
  const logo = await getLogo();

  return new ImageResponse(
    (
      <div
        style={{
          width: "100%",
          height: "100%",
          display: "flex",
          alignItems: "center",
          gap: 48,
          padding: 72,
          background: "linear-gradient(135deg, #fbf6ea 0%, #ffffff 70%)",
        }}
      >
        <div style={{ width: 260, display: "flex", alignItems: "center", justifyContent: "flex-start" }}>
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img
            src={logo as unknown as any}
            width={260}
            height={260}
            alt=""
            style={{ objectFit: "contain" }}
          />
        </div>

        <div style={{ display: "flex", flexDirection: "column", gap: 18, flex: 1 }}>
          <div style={{ fontSize: 62, fontWeight: 800, lineHeight: 1.05, color: "#556b2f" }}>
            {title}
          </div>
          <div style={{ fontSize: 30, lineHeight: 1.25, color: "rgba(31, 27, 22, 0.78)" }}>
            {description}
          </div>
          <div style={{ fontSize: 22, lineHeight: 1.2, color: "rgba(31, 27, 22, 0.55)" }}>
            {site.domain}
          </div>
        </div>
      </div>
    ),
    OG_SIZE,
  );
}
