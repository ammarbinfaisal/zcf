import Image from "next/image";
import Link from "next/link";
import type { Metadata } from "next";

import MovingGradient from "@/components/animata/background/moving-gradient";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { BentoGrid, BentoGridItem } from "@/components/ui/bento-grid";
import { HoverBorderGradient } from "@/components/ui/hover-border-gradient";
import { AuroraBackground } from "@/components/ui/aurora-background";
import { Spotlight } from "@/components/ui/spotlight";
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

  return (
    <MovingGradient className="border-b" gradientClassName="opacity-[0.06]">
      <AuroraBackground className="border-b">
        <Spotlight className="-top-24 left-0 md:left-60" fill="var(--brand-olive)" />
        <Spotlight className="-top-32 left-10 md:left-80" fill="var(--brand-ochre)" />

        <main className="mx-auto w-full max-w-6xl px-4 py-10 sm:py-14">
          <section className="grid gap-10 lg:grid-cols-12 lg:items-center">
            <div className="space-y-6 lg:col-span-7">
              <Reveal>
                <p className="text-sm font-medium text-foreground/70">Official site</p>
              </Reveal>
              <Reveal delayMs={80}>
                <h1 className="text-pretty text-3xl font-semibold tracking-tight sm:text-5xl">
                  Establishing a collective system of Zakat to uplift communities with dignity.
                </h1>
              </Reveal>
              <Reveal delayMs={140}>
                <p className="max-w-xl text-pretty text-base leading-7 text-muted-foreground sm:text-lg">
                  Relief and rehabilitation, education and skill-building, and long-term livelihood support—built on transparency.
                </p>
              </Reveal>

              <Reveal delayMs={200}>
                <div className="flex flex-col gap-3 sm:flex-row sm:items-center">
                  <Link href="/donation/" legacyBehavior>
                    <HoverBorderGradient
                      as="a"
                      containerClassName="rounded-full"
                      className="px-6 py-3"
                      duration={1.4}
                      idleAnimate={false}
                    >
                      Donate now
                    </HoverBorderGradient>
                  </Link>
                  <Button asChild size="lg" variant="secondary">
                    <Link href="/become-a-volunteer/">Become a volunteer</Link>
                  </Button>
                </div>
              </Reveal>

              <Reveal delayMs={240}>
                <div className="grid gap-3 sm:grid-cols-3">
                  {[
                    {
                      title: "Transparent",
                      desc: "Clear social and financial accountability.",
                    },
                    {
                      title: "Dignity-first",
                      desc: "Designed to protect and uplift families.",
                    },
                    {
                      title: "Practical programs",
                      desc: "Relief, education, skills, livelihoods.",
                    },
                  ].map((it) => (
                    <Card key={it.title} className="bg-background/70">
                      <CardContent className="p-4">
                        <div className="text-sm font-semibold">{it.title}</div>
                        <div className="mt-1 text-xs leading-5 text-muted-foreground">{it.desc}</div>
                      </CardContent>
                    </Card>
                  ))}
                </div>
              </Reveal>

              <Reveal delayMs={280}>
                <div className="flex flex-wrap gap-x-5 gap-y-2 text-sm">
                  <Link href="/zakat-nisab/" className="underline underline-offset-4">
                    Zakat & Nisab
                  </Link>
                  <Link href="/zakat-calculator/" className="underline underline-offset-4">
                    Zakat calculator
                  </Link>
                  <Link href="/our-projects/" className="underline underline-offset-4">
                    Our projects
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
                  <CardContent className="space-y-3 p-6">
                    <div className="text-sm font-medium">Explore</div>
                    <div className="flex flex-wrap gap-3 text-sm">
                      <Link href="/news/" className="underline underline-offset-4">
                        Latest updates
                      </Link>
                      <Link href="/image-gallery/" className="underline underline-offset-4">
                        Gallery
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

        <section className="mt-14 grid gap-8 lg:grid-cols-12">
          <div className="lg:col-span-5">
            <Reveal>
              <h2 className="text-pretty text-xl font-semibold tracking-tight sm:text-2xl">What we do</h2>
              <p className="mt-2 text-sm leading-6 text-muted-foreground">
                Our work prioritizes dignity-first support and practical programs that can sustain families long after immediate relief.
              </p>
            </Reveal>
          </div>
          <div className="lg:col-span-7">
            <div className="grid gap-4 sm:grid-cols-2">
              {[
                {
                  title: "Passion",
                  description: "We care deeply about the people we serve and the quality of our work.",
                },
                {
                  title: "Dignity",
                  description: "Protecting human dignity guides how we design and deliver every program.",
                },
                {
                  title: "Excellence",
                  description: "We learn continuously and improve with evidence, feedback, and experience.",
                },
                {
                  title: "Transparency",
                  description: "Clear social and financial accountability in everything we do.",
                },
              ].map((v, idx) => (
                <Reveal key={v.title} delayMs={idx * 70}>
                  <Card className="h-full">
                    <CardContent className="p-5">
                      <div className="text-sm font-semibold">{v.title}</div>
                      <div className="mt-1 text-sm leading-6 text-muted-foreground">{v.description}</div>
                    </CardContent>
                  </Card>
                </Reveal>
              ))}
            </div>
          </div>
        </section>

        <section className="mt-14">
          <Reveal>
            <div className="flex items-end justify-between gap-6">
              <div>
                <h2 className="text-pretty text-xl font-semibold tracking-tight sm:text-2xl">Programs and future plans</h2>
                <p className="mt-2 max-w-2xl text-sm leading-6 text-muted-foreground">
                  Practical support across relief, education, and livelihoods.
                </p>
              </div>
              <div className="hidden sm:block">
                <Button asChild variant="secondary">
                  <Link href="/our-projects/">See projects</Link>
                </Button>
              </div>
            </div>
          </Reveal>

          <div className="mt-6">
            <BentoGrid className="max-w-none md:auto-rows-[15rem]">
              {(
                [
                  {
                    title: "Rehabilitation support",
                    description: "Targeted help for families impacted by crises, built around recovery and stability.",
                    icon: <ShieldCheck className="h-4 w-4 text-[color:var(--brand-olive)]" />,
                  },
                  {
                    title: "Dignified livelihoods",
                    description: "Enable self-reliance through tools, guidance, and community-backed pathways.",
                    icon: <BriefcaseBusiness className="h-4 w-4 text-[color:var(--brand-olive)]" />,
                  },
                  {
                    title: "Scholarships for education",
                    description: "Support students with resources that keep learning consistent and future-focused.",
                    icon: <GraduationCap className="h-4 w-4 text-[color:var(--brand-olive)]" />,
                  },
                  {
                    title: "Skill development workshops",
                    description: "Hands-on training designed to increase employability and income stability.",
                    icon: <Users className="h-4 w-4 text-[color:var(--brand-olive)]" />,
                  },
                  {
                    title: "Computer and language classes",
                    description: "Digital literacy and communication skills to widen opportunities.",
                    icon: <Laptop className="h-4 w-4 text-[color:var(--brand-olive)]" />,
                  },
                  {
                    title: "Meals and food packets",
                    description: "Timely food support for people in urgent need.",
                    icon: <Soup className="h-4 w-4 text-[color:var(--brand-olive)]" />,
                  },
                  {
                    title: "Women empowerment",
                    description: "Support women-led initiatives and capacity building.",
                    icon: <HandHeart className="h-4 w-4 text-[color:var(--brand-olive)]" />,
                  },
                  {
                    title: "Protect the environment",
                    description: "Conserve and protect natural resources through responsible community action.",
                    icon: <Leaf className="h-4 w-4 text-[color:var(--brand-olive)]" />,
                  },
                ] as const
              ).map((item, idx) => (
                <Reveal key={item.title} delayMs={idx * 60}>
                  <BentoGridItem
                    title={item.title}
                    description={item.description}
                    icon={item.icon}
                    header={
                      <div className="h-10 w-full rounded-lg border border-border bg-[linear-gradient(90deg,var(--brand-ochre),var(--brand-cream),var(--brand-olive))] opacity-[0.14]" />
                    }
                  />
                </Reveal>
              ))}
            </BentoGrid>
          </div>

          <div className="mt-6 sm:hidden">
            <Button asChild variant="secondary" className="w-full">
              <Link href="/our-projects/">See projects</Link>
            </Button>
          </div>
        </section>

        <section className="mt-14">
          <Reveal>
            <Card>
              <CardContent className="p-6 sm:p-8">
                <div className="grid gap-8 lg:grid-cols-12 lg:items-center">
                  <div className="lg:col-span-7">
                    <h2 className="text-pretty text-xl font-semibold tracking-tight sm:text-2xl">Give with confidence</h2>
                    <p className="mt-2 max-w-2xl text-sm leading-6 text-muted-foreground">
                      {page.description || site.tagline}
                    </p>
                  </div>
                  <div className="flex flex-col gap-3 lg:col-span-5">
                    <Button asChild size="lg">
                      <Link href="/donation/">Donate</Link>
                    </Button>
                    <Button asChild size="lg" variant="secondary">
                      <Link href="/contact/">Talk to us</Link>
                    </Button>
                  </div>
                </div>
              </CardContent>
            </Card>
          </Reveal>
        </section>
      </main>
      </AuroraBackground>
    </MovingGradient>
  );
}
