import { ReactNode } from "react";
import Image from "next/image";

import { cn } from "@/lib/utils";

export function PageShell({
  title,
  description,
  hero,
  children,
  className,
}: {
  title: string;
  description?: string;
  hero?: { src: string; alt?: string };
  children: ReactNode;
  className?: string;
}) {
  return (
    <main className={cn("mx-auto w-full max-w-6xl px-4 py-10 sm:py-14", className)}>
      <header className="space-y-3">
        <h1 className="text-pretty text-3xl font-semibold tracking-tight sm:text-4xl">{title}</h1>
        {description ? (
          <p className="max-w-2xl text-pretty text-base leading-7 text-muted-foreground sm:text-lg">
            {description}
          </p>
        ) : null}
      </header>

      {hero?.src ? (
        <div className="mt-6 overflow-hidden rounded-2xl border bg-card">
          <div className="relative aspect-[16/7] w-full">
            <Image
              src={hero.src}
              alt={hero.alt || ""}
              fill
              sizes="(max-width: 1024px) 100vw, 1024px"
              className="object-cover"
            />
            <div className="pointer-events-none absolute inset-0 bg-gradient-to-t from-background/40 via-transparent to-transparent" />
          </div>
        </div>
      ) : null}
      <section className="mt-10">{children}</section>
    </main>
  );
}
