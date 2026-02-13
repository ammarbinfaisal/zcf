import fs from "node:fs/promises";
import path from "node:path";

import { PageShell } from "@/components/site/page-shell";
import { Card, CardContent } from "@/components/ui/card";
import { getPageContentByPathname } from "@/lib/raw-content";

export const dynamic = "force-static";
export const revalidate = false;

async function listPublicVideos() {
  const dir = path.join(process.cwd(), "public", "videos");
  try {
    const names = await fs.readdir(dir);
    return names
      .filter((n) => /\.(mp4|webm|mov)(\?|$)/i.test(n))
      .sort((a, b) => a.localeCompare(b));
  } catch {
    return [];
  }
}

export default async function VideoGalleryPage() {
  const page = await getPageContentByPathname("/video-gallery/");
  const videos = await listPublicVideos();

  return (
    <PageShell title={page.title || "Video Gallery"} description={page.description} hero={page.hero}>
      <Card>
        <CardContent className="p-6 sm:p-8">
          {videos.length ? (
            <div className="grid grid-cols-1 gap-6 lg:grid-cols-2">
              {videos.map((name) => (
                <div key={name} className="space-y-2">
                  <video
                    className="w-full overflow-hidden rounded-xl border bg-black"
                    controls
                    preload="metadata"
                    src={`/videos/${encodeURIComponent(name)}`}
                  />
                  <p className="text-xs text-muted-foreground">{name}</p>
                </div>
              ))}
            </div>
          ) : (
            <div className="space-y-2 text-sm text-muted-foreground sm:text-base">
              <p>No local videos were found.</p>
              <p>
                Add files to <code>public/videos</code> (for example <code>.mp4</code>), and they will appear here.
              </p>
            </div>
          )}
        </CardContent>
      </Card>
    </PageShell>
  );
}

