import { notFound } from "next/navigation";
import type { Metadata } from "next";

import { PageShell } from "@/components/site/page-shell";
import { Card, CardContent } from "@/components/ui/card";
import { slugParamToPathname } from "@/lib/raw-content";
import { site } from "@/lib/site";

import { createRequire } from "node:module";
import configPromise from "../../../payload.config";
import { RichText } from "@payloadcms/richtext-lexical/react";

const require = createRequire(import.meta.url);
const { getPayload } = require("payload") as typeof import("payload");

export const dynamic = "force-static";
export const revalidate = false;
export const dynamicParams = true;

async function getPageByPath(pathname: string) {
  const payload = await getPayload({ config: configPromise });
  
  // Try pages first
  const pageResult = await payload.find({
    collection: "pages",
    where: { path: { equals: pathname } },
    limit: 1,
  });
  if (pageResult.docs.length > 0) return pageResult.docs[0];

  // Try posts (slug matching)
  const slug = pathname.replace(/^\//, "").replace(/\/$/, "");
  const postResult = await payload.find({
    collection: "posts",
    where: { slug: { equals: slug } },
    limit: 1,
  });
  if (postResult.docs.length > 0) return postResult.docs[0];

  return null;
}

export async function generateStaticParams() {
  const payload = await getPayload({ config: configPromise });
  const pages = await payload.find({
    collection: "pages",
    limit: 100,
  });
  const posts = await payload.find({
    collection: "posts",
    limit: 100,
  });
  
  const pageParams = pages.docs
    .filter((p: any) => p.path !== "/")
    .map((p: any) => ({
      slug: p.path.replace(/^\//, "").replace(/\/$/, "").split("/").filter(Boolean)
    }));

  const postParams = posts.docs
    .map((p: any) => ({
      slug: p.slug.split("/").filter(Boolean)
    }));

  return [...pageParams, ...postParams];
}

export async function generateMetadata({
  params,
}: {
  params: Promise<{ slug?: string[] }>;
}): Promise<Metadata> {
  const { slug } = await params;
  const pathname = slugParamToPathname(slug);
  const page = await getPageByPath(pathname) as any;
  
  if (!page) {
    return { title: "Not Found" };
  }

  const title = page.title || site.name;
  const description = page.seo?.metaDescription || site.tagline;

  return {
    title,
    description,
    alternates: { canonical: pathname },
  };
}

export default async function SlugPage({
  params,
}: {
  params: Promise<{ slug?: string[] }>;
}) {
  const { slug } = await params;
  const pathname = slugParamToPathname(slug);

  const page = await getPageByPath(pathname) as any;
  if (!page) notFound();

  return (
    <PageShell title={page.title} description={page.seo?.metaDescription}>
      <Card>
        <CardContent className="p-6 sm:p-8">
          <RichText data={page.content} />
        </CardContent>
      </Card>
    </PageShell>
  );
}
