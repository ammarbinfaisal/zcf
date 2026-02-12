import Image from "next/image";
import Link from "next/link";
import type { Metadata } from "next";

import MovingGradient from "@/components/animata/background/moving-gradient";
import { ContentBlocks } from "@/components/site/content-blocks";
import { PageShell } from "@/components/site/page-shell";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { getPageContentByPathname } from "@/lib/raw-content";
import { site } from "@/lib/site";

export const dynamic = "force-static";
export const revalidate = false;

export async function generateMetadata(): Promise<Metadata> {
  const page = await getPageContentByPathname("/");
  return {
    title: site.name,
    description: page.description || site.tagline,
    alternates: { canonical: "/" },
    openGraph: {
      title: site.name,
      description: page.description || site.tagline,
      url: "/",
    },
  };
}

export default async function HomePage() {
  const page = await getPageContentByPathname("/");

  return (
    <MovingGradient className="border-b">
      <PageShell title={site.name} description={site.tagline}>
        <div className="grid gap-8 lg:grid-cols-12">
          <div className="space-y-6 lg:col-span-7">
            <div className="space-y-3">
              <p className="text-sm font-medium text-foreground/70">Official site</p>
              <h2 className="text-pretty text-2xl font-semibold tracking-tight sm:text-3xl">
                Establish a collective system of Zakat, support dignified livelihoods, and protect communities.
              </h2>
              <p className="max-w-xl text-pretty text-base leading-7 text-muted-foreground">
                Learn what Zakat is, understand Nisab, explore our programs, and support relief, education, and rehabilitation.
              </p>
            </div>

            <div className="flex flex-col gap-3 sm:flex-row">
              <Button asChild size="lg">
                <Link href="/donation/">Donate now</Link>
              </Button>
              <Button asChild size="lg" variant="secondary">
                <Link href="/zakat-nisab/">Zakat & Nisab</Link>
              </Button>
            </div>

            <div className="pt-4">
              <Card>
                <CardContent className="p-6">
                  <ContentBlocks blocks={page.blocks.slice(0, 14)} />
                </CardContent>
              </Card>
            </div>
          </div>

          <div className="lg:col-span-5">
            <Card className="overflow-hidden">
              <div className="relative aspect-[4/3] w-full">
                <Image
                  src="/media/home-hero.jpg"
                  alt="ZCF community work"
                  fill
                  priority
                  sizes="(max-width: 1024px) 100vw, 420px"
                  className="object-cover"
                />
              </div>
              <CardContent className="space-y-3 p-6">
                <div className="text-sm font-medium">Explore</div>
                <div className="flex flex-wrap gap-2 text-sm">
                  <Link href="/our-projects/" className="underline underline-offset-4">
                    Projects
                  </Link>
                  <Link href="/news/" className="underline underline-offset-4">
                    News
                  </Link>
                  <Link href="/become-a-volunteer/" className="underline underline-offset-4">
                    Volunteer
                  </Link>
                  <Link href="/contact/" className="underline underline-offset-4">
                    Contact
                  </Link>
                </div>
              </CardContent>
            </Card>
          </div>
        </div>
      </PageShell>
    </MovingGradient>
  );
}
