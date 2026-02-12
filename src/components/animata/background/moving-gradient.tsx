import { ComponentPropsWithoutRef } from "react";

import { cn } from "@/lib/utils";

interface MovingGradientProps extends ComponentPropsWithoutRef<"div"> {
  animated?: boolean;
  gradientClassName?: string;
}

export default function MovingGradient({
  children,
  className,
  animated = true,
  gradientClassName,
  ...props
}: MovingGradientProps) {
  const backgroundClassName = "pointer-events-none absolute inset-0";
  return (
    <div {...props} className={cn("relative overflow-hidden bg-background", className)}>
      <div
        className={cn(
          "bg-size bg-gradient-to-r from-[var(--brand-orange)] from-25% via-[var(--brand-purple)] via-55% to-[var(--brand-orange)] to-85% opacity-15",
          {
            [backgroundClassName]: true,
            "animate-bg-position": animated,
          },
          gradientClassName,
        )}
      />
      <div className={cn(backgroundClassName, "blur-lg")} />
      {children}
    </div>
  );
}
