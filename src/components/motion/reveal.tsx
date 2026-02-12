"use client";

import type { ReactNode } from "react";
import { useEffect, useRef, useState } from "react";

import { cn } from "@/lib/utils";

export function Reveal({
  children,
  className,
  delayMs = 0,
  once = true,
  rootMargin = "0px 0px -12% 0px",
}: {
  children: ReactNode;
  className?: string;
  delayMs?: number;
  once?: boolean;
  rootMargin?: string;
}) {
  const ref = useRef<HTMLDivElement | null>(null);
  const [revealed, setRevealed] = useState(false);

  useEffect(() => {
    const el = ref.current;
    if (!el) return;

    if (typeof IntersectionObserver === "undefined") {
      const t = window.setTimeout(() => setRevealed(true), 0);
      return () => window.clearTimeout(t);
    }

    const observer = new IntersectionObserver(
      ([entry]) => {
        if (!entry) return;
        if (entry.isIntersecting) {
          setRevealed(true);
          if (once) observer.disconnect();
        } else if (!once) {
          setRevealed(false);
        }
      },
      { root: null, threshold: 0.12, rootMargin },
    );

    observer.observe(el);
    return () => observer.disconnect();
  }, [once, rootMargin]);

  return (
    <div
      ref={ref}
      className={cn("reveal", className)}
      data-revealed={revealed}
      style={delayMs ? { transitionDelay: `${delayMs}ms` } : undefined}
    >
      {children}
    </div>
  );
}
