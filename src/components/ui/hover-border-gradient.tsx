"use client";
import React, { useEffect, useState } from "react";

import { motion } from "motion/react";
import { cn } from "@/lib/utils";

type Direction = "TOP" | "LEFT" | "BOTTOM" | "RIGHT";

export function HoverBorderGradient({
  children,
  containerClassName,
  className,
  as: Tag = "button",
  duration = 1,
  clockwise = true,
  idleAnimate = false,
  ...props
}: React.PropsWithChildren<
  {
    as?: React.ElementType;
    containerClassName?: string;
    className?: string;
    duration?: number;
    clockwise?: boolean;
    idleAnimate?: boolean;
  } & React.HTMLAttributes<HTMLElement>
>) {
  const [hovered, setHovered] = useState<boolean>(false);
  const [direction, setDirection] = useState<Direction>("TOP");

  const movingMap: Record<Direction, string> = {
    TOP: "radial-gradient(26% 55% at 50% 0%, color-mix(in srgb, var(--brand-ochre) 85%, transparent) 0%, transparent 70%)",
    LEFT: "radial-gradient(22% 50% at 0% 50%, color-mix(in srgb, var(--brand-olive) 75%, transparent) 0%, transparent 72%)",
    BOTTOM:
      "radial-gradient(26% 55% at 50% 100%, color-mix(in srgb, var(--brand-ochre) 78%, transparent) 0%, transparent 70%)",
    RIGHT:
      "radial-gradient(22% 50% at 100% 50%, color-mix(in srgb, var(--brand-olive) 70%, transparent) 0%, transparent 72%)",
  };

  const highlight =
    "radial-gradient(80% 190% at 50% 50%, color-mix(in srgb, var(--brand-ochre) 55%, var(--brand-olive)) 0%, transparent 70%)";

  useEffect(() => {
    if (!idleAnimate || hovered) return;
    const interval = setInterval(() => {
      setDirection((prevState) => {
        const directions: Direction[] = ["TOP", "LEFT", "BOTTOM", "RIGHT"];
        const currentIndex = directions.indexOf(prevState);
        const nextIndex = clockwise
          ? (currentIndex - 1 + directions.length) % directions.length
          : (currentIndex + 1) % directions.length;
        return directions[nextIndex]!;
      });
    }, duration * 1000);
    return () => clearInterval(interval);
  }, [clockwise, duration, hovered, idleAnimate]);
  return (
    <Tag
      onMouseEnter={() => setHovered(true)}
      onMouseLeave={() => setHovered(false)}
      className={cn(
        "relative inline-flex items-center justify-center rounded-full p-px shadow-xs outline-none focus-visible:ring-ring/50 focus-visible:ring-[3px]",
        containerClassName,
      )}
      {...props}
    >
      <div
        className={cn(
          "relative z-10 rounded-[inherit] bg-background px-5 py-2.5 text-sm font-medium text-foreground",
          className,
        )}
      >
        {children}
      </div>
      <motion.div
        className={cn(
          "pointer-events-none absolute inset-0 z-0 overflow-hidden rounded-[inherit]",
        )}
        style={{
          filter: "blur(5px)",
        }}
        initial={{ background: movingMap[direction] }}
        animate={{
          background: hovered
            ? [movingMap[direction], highlight]
            : movingMap[direction],
        }}
        transition={{ ease: "linear", duration: duration ?? 1 }}
      />
      <div className="pointer-events-none absolute inset-[1.5px] z-[1] rounded-[inherit] bg-background" />
    </Tag>
  );
}
