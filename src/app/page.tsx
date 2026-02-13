import Image from "next/image";
import Link from "next/link";
import type { Metadata } from "next";

import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Timeline } from "@/components/ui/timeline";
import { getPageContentByPathname } from "@/lib/raw-content";
import { site } from "@/lib/site";
import { Reveal } from "@/components/motion/reveal";

import {
  BriefcaseBusiness,
  GraduationCap,
  HandHeart,
  Laptop,
  Leaf,
  ShieldCheck,
  Soup,
  Users,
} from "lucide-react";

import heroImage from "../../public/media/home-hero.jpg";

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

  const timeline = [
    {
      title: "Calculate",
      content: (
        <div className="space-y-3">
          <p className="text-sm leading-6 text-muted-foreground">
            Use the calculator to estimate your Zakat and understand Nisab.
          </p>
          <div className="flex flex-wrap gap-3 text-sm">
            <Link href="/zakat-calculator/" className="underline underline-offset-4">
              Zakat calculator
            </Link>
            <Link href="/zakat-nisab/" className="underline underline-offset-4">
              Zakat &amp; Nisab
            </Link>
          </div>
        </div>
      ),
    },
    {
      title: "Give",
      content: (
        <div className="space-y-3">
          <p className="text-sm leading-6 text-muted-foreground">
            Donate to support programs focused on dignity-first relief, education, and livelihoods.
          </p>
          <Button asChild size="lg">
            <Link href="/donation/">Donate</Link>
          </Button>
        </div>
      ),
    },
    {
      title: "See impact",
      content: (
        <div className="space-y-3">
          <p className="text-sm leading-6 text-muted-foreground">
            Follow updates and learn about ongoing projects and outcomes.
          </p>
          <div className="flex flex-wrap gap-3 text-sm">
            <Link href="/news/" className="underline underline-offset-4">
              News
            </Link>
            <Link href="/our-projects/" className="underline underline-offset-4">
              Projects
            </Link>
          </div>
        </div>
      ),
    },
  ];

  return (
    <main id="main-content" className="mx-auto w-full max-w-6xl px-4 py-10 sm:py-14">
      <section className="grid gap-10 lg:grid-cols-12 lg:items-center">
        <div className="space-y-6 lg:col-span-7">
          <Reveal>
            <p className="text-sm font-medium text-foreground/70">Official site</p>
          </Reveal>
          <Reveal delayMs={80}>
            <h1 className="text-pretty text-3xl font-semibold tracking-tight sm:text-5xl">
              Give with clarity. Support with dignity.
            </h1>
          </Reveal>
          <Reveal delayMs={140}>
            <p className="max-w-xl text-pretty text-base leading-7 text-muted-foreground sm:text-lg">
              {page.description || site.tagline}
            </p>
          </Reveal>

          <Reveal delayMs={200}>
            <div className="flex flex-col gap-3 sm:flex-row sm:items-center">
              <Button asChild size="lg">
                <Link href="/donation/">Donate</Link>
              </Button>
              <Button asChild size="lg" variant="secondary">
                <Link href="/become-a-volunteer/">Volunteer</Link>
              </Button>
            </div>
          </Reveal>

          <Reveal delayMs={260}>
            <Card>
              <CardContent className="p-5">
                <div className="text-sm font-semibold">Why people trust us</div>
                <ul className="mt-3 space-y-2 text-sm text-muted-foreground">
                  <li>Transparent communication and accountability.</li>
                  <li>Dignity-first programs for relief, education, and livelihoods.</li>
                  <li>Clear paths to learn, donate, and follow updates.</li>
                </ul>
              </CardContent>
            </Card>
          </Reveal>

          <Reveal delayMs={320}>
            <div className="flex flex-wrap gap-x-5 gap-y-2 text-sm">
              <Link href="/our-projects/" className="underline underline-offset-4">
                Projects
              </Link>
              <Link href="/news/" className="underline underline-offset-4">
                News
              </Link>
              <Link href="/image-gallery/" className="underline underline-offset-4">
                Gallery
              </Link>
              <Link href="/contact/" className="underline underline-offset-4">
                Contact
              </Link>
            </div>
          </Reveal>
        </div>

        <div className="lg:col-span-5">
          <Reveal delayMs={120}>
            <Card className="overflow-hidden">
              <div className="relative aspect-[4/3] w-full">
                <Image
                  src={heroImage}
                  alt="ZCF community work"
                  fill
                  priority
                  placeholder="blur"
                  sizes="(max-width: 1024px) 100vw, 420px"
                  className="object-cover"
                />
                <div className="pointer-events-none absolute inset-0 bg-gradient-to-t from-background/40 via-transparent to-transparent" />
              </div>
              <CardContent className="space-y-2 p-6">
                <div className="text-sm font-medium">Quick actions</div>
                <div className="flex flex-wrap gap-3 text-sm">
                  <Link href="/donation/" className="underline underline-offset-4">
                    Donate
                  </Link>
                  <Link href="/zakat-calculator/" className="underline underline-offset-4">
                    Calculator
                  </Link>
                  <Link href="/about/" className="underline underline-offset-4">
                    About
                  </Link>
                </div>
              </CardContent>
            </Card>
          </Reveal>
        </div>
      </section>

      <section className="mt-16">
        <Timeline data={timeline} />
      </section>

      <section className="mt-16">
        <Reveal>
          <Card>
            <CardContent className="p-6 sm:p-8">
              <div className="grid gap-8 lg:grid-cols-12 lg:items-center">
                <div className="lg:col-span-7">
                  <h2 className="text-pretty text-xl font-semibold tracking-tight sm:text-2xl">Need help?</h2>
                  <p className="mt-2 max-w-2xl text-sm leading-6 text-muted-foreground">
                    Talk to us if you have questions about giving, volunteering, or our programs.
                  </p>
                </div>
                <div className="flex flex-col gap-3 lg:col-span-5">
                  <Button asChild size="lg">
                    <Link href="/contact/">Contact</Link>
                  </Button>
                  <Button asChild size="lg" variant="secondary">
                    <Link href="/about/">Learn more</Link>
                  </Button>
                </div>
              </div>
            </CardContent>
          </Card>
        </Reveal>
      </section>
    </main>
  );
}
