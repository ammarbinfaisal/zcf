"use client";
import { cn } from "@/lib/utils";
import React, { ReactNode } from "react";

interface AuroraBackgroundProps extends React.HTMLProps<HTMLDivElement> {
  children: ReactNode;
  showRadialGradient?: boolean;
}

export const AuroraBackground = ({
  className,
  children,
  showRadialGradient = true,
  ...props
}: AuroraBackgroundProps) => {
  return (
    <div
      className={cn(
        "relative flex flex-col bg-background text-foreground",
        className,
      )}
      {...props}
    >
      <div
        className="absolute inset-0 overflow-hidden"
        style={
          {
            "--aurora": `repeating-linear-gradient(
              100deg,
              color-mix(in srgb, var(--brand-olive) 78%, white) 10%,
              color-mix(in srgb, var(--brand-ochre) 62%, white) 15%,
              color-mix(in srgb, var(--brand-olive) 52%, white) 20%,
              color-mix(in srgb, var(--brand-ochre) 48%, white) 25%,
              color-mix(in srgb, var(--brand-olive) 64%, white) 30%
            )`,
            "--dark-gradient":
              "repeating-linear-gradient(100deg,#000 0%,#000 7%,transparent 10%,transparent 12%,#000 16%)",
            "--white-gradient":
              "repeating-linear-gradient(100deg,#fff 0%,#fff 7%,transparent 10%,transparent 12%,#fff 16%)",
          } as React.CSSProperties
        }
      >
        <div
          className={cn(
            `pointer-events-none absolute -inset-[10px] [background-image:var(--white-gradient),var(--aurora)] [background-size:300%,_200%] [background-position:50%_50%,50%_50%] opacity-45 blur-[10px] invert filter will-change-transform after:absolute after:inset-0 after:[background-image:var(--white-gradient),var(--aurora)] after:[background-size:200%,_100%] after:mix-blend-difference after:content-[""] dark:[background-image:var(--dark-gradient),var(--aurora)] dark:invert-0 after:dark:[background-image:var(--dark-gradient),var(--aurora)]`,
            showRadialGradient &&
              `[mask-image:radial-gradient(ellipse_at_100%_0%,black_10%,transparent_70%)]`,
          )}
        />
      </div>
      {children}
    </div>
  );
};
