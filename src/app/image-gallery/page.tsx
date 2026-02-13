import fs from "node:fs/promises";
import path from "node:path";

import { PageShell } from "@/components/site/page-shell";
import { Card, CardContent } from "@/components/ui/card";
import { Carousel_001 } from "@/components/ui/skiper-ui/skiper47";
import { getPageContentByPathname, localAssetSrcFromUrl } from "@/lib/raw-content";
import { getScrapyPageByPathname } from "@/lib/scrapy";

export const dynamic = "force-static";
export const revalidate = false;

async function listPublicGalleryImages() {
  const dir = path.join(process.cwd(), "public", "gallery");
  try {
    const names = await fs.readdir(dir);
    return names
      .filter((n) => /\.(jpe?g|png|webp|gif)(\?|$)/i.test(n))
      .sort((a, b) => a.localeCompare(b));
  } catch {
    return [];
  }
}

function isLikelyGalleryImage(url: string) {
  const u = url.toLowerCase();
  if (u.includes("/demo/")) return false;
  if (u.includes("logo")) return false;
  if (u.includes("icon")) return false;
  if (u.includes("elementor")) return false;
  return /\.(jpe?g|png|webp|gif)(\?|$)/i.test(url);
}

export default async function ImageGalleryPage() {
  const page = await getPageContentByPathname("/image-gallery/");
  const publicImages = await listPublicGalleryImages();
  const rec = await getScrapyPageByPathname("/image-gallery/");

  const candidates = (rec?.images || []).filter(isLikelyGalleryImage);
  const mapped = await Promise.all(
    candidates.map(async (url) => ({
      url,
      src: await localAssetSrcFromUrl(url),
    })),
  );

  const local = mapped.filter((m): m is { url: string; src: string } => Boolean(m.src));
  const missingCount = mapped.length - local.length;

  const carouselImages = (publicImages.length
    ? publicImages.map((name) => ({ src: `/gallery/${encodeURIComponent(name)}`, alt: "" }))
    : local.map((img) => ({ src: img.src, alt: "" }))
  ).slice(0, 12);

  return (
    <PageShell title={page.title || "Image Gallery"} description={page.description} hero={page.hero}>
      <Card>
        <CardContent className="p-6 sm:p-8">
          {carouselImages.length ? (
            <div className="mb-8 sm:hidden">
              <Carousel_001
                images={carouselImages}
                className="mx-auto max-w-md"
                showPagination
                loop
                spaceBetween={18}
              />
            </div>
          ) : null}

          {publicImages.length ? (
            <div className="hidden grid-cols-1 gap-4 sm:grid sm:grid-cols-2 lg:grid-cols-3">
              {publicImages.map((name) => (
                <div key={name} className="overflow-hidden rounded-xl border bg-card">
                  <div className="relative aspect-[4/3] w-full">
                    <img
                      src={`/gallery/${encodeURIComponent(name)}`}
                      alt=""
                      loading="lazy"
                      decoding="async"
                      className="h-full w-full object-cover"
                    />
                  </div>
                </div>
              ))}
            </div>
          ) : local.length ? (
            <div className="hidden grid-cols-1 gap-4 sm:grid sm:grid-cols-2 lg:grid-cols-3">
              {local.map((img) => (
                <div
                  key={img.url}
                  className="overflow-hidden rounded-xl border bg-card"
                >
                  <div className="relative aspect-[4/3] w-full">
                    <img
                      src={img.src}
                      alt=""
                      loading="lazy"
                      decoding="async"
                      className="h-full w-full object-cover"
                    />
                  </div>
                </div>
              ))}
            </div>
          ) : (
            <div className="space-y-2 text-sm text-muted-foreground sm:text-base">
              <p>No local gallery images were found.</p>
              <p>
                Add images to <code>public/gallery</code>, or re-run the scraper and download assets into{" "}
                <code>raw/assets/live</code> so this page can pick them up via <code>/raw-asset/live/...</code>.
              </p>
            </div>
          )}

          {!publicImages.length && missingCount ? (
            <p className="mt-6 text-xs text-muted-foreground">
              {missingCount} image URL(s) were discovered by the scraper but are not available locally yet.
            </p>
          ) : null}
        </CardContent>
      </Card>
    </PageShell>
  );
}
