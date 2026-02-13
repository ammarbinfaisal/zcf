import { notFound } from "next/navigation";
import type { Metadata } from "next";

import { ContentBlocks } from "@/components/site/content-blocks";
import { PageShell } from "@/components/site/page-shell";
import { Card, CardContent } from "@/components/ui/card";
import { getAllRoutePaths, getPageContentByPathname, slugParamToPathname } from "@/lib/raw-content";
import { site } from "@/lib/site";

export const dynamic = "force-static";
export const revalidate = false;
export const dynamicParams = false;

export async function generateStaticParams() {
  const routes = await getAllRoutePaths();
  const reserved = new Set(["/image-gallery/", "/video-gallery/"]);
  return routes
    .filter((p) => p !== "/" && !reserved.has(p))
    .map((p) => p.replace(/^\//, "").replace(/\/$/, ""))
    .map((p) => ({ slug: p.split("/").filter(Boolean) }));
}

export async function generateMetadata({
  params,
}: {
  params: Promise<{ slug?: string[] }>;
}): Promise<Metadata> {
  const { slug } = await params;
  const pathname = slugParamToPathname(slug);
  const page = await getPageContentByPathname(pathname);
  const title = page.title || site.name;
  const description = page.description || site.tagline;

  return {
    title,
    description,
    alternates: { canonical: pathname },
    twitter: {
      card: "summary_large_image",
      title,
      description,
      images: [`/og?path=${encodeURIComponent(pathname)}`],
    },
    openGraph: {
      title,
      description,
      url: pathname,
      images: [{ url: `/og?path=${encodeURIComponent(pathname)}`, width: 1200, height: 630, alt: title }],
    },
  };
}

export default async function SlugPage({
  params,
}: {
  params: Promise<{ slug?: string[] }>;
}) {
  const { slug } = await params;
  const pathname = slugParamToPathname(slug);

  const all = await getAllRoutePaths();
  if (!all.includes(pathname)) notFound();

  const page = await getPageContentByPathname(pathname);
  return (
    <PageShell title={page.title} description={page.description} hero={page.hero}>
      <Card>
        <CardContent className="p-6 sm:p-8">
          <ContentBlocks blocks={page.blocks} />
        </CardContent>
      </Card>
    </PageShell>
  );
}
