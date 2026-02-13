import { Fragment } from "react";

import { PageContent } from "@/lib/raw-content";

export function ContentBlocks({ blocks }: { blocks: PageContent["blocks"] }) {
  return (
    <div className="space-y-6">
      {blocks.map((b, idx) => {
        if (b.type === "h2") {
          return (
            <h2
              key={idx}
              className="text-pretty text-lg font-semibold tracking-tight sm:text-xl"
            >
              {b.text}
            </h2>
          );
        }

        if (b.type === "a") {
          return (
            <p key={idx} className="text-pretty text-sm leading-6 text-foreground/90 sm:text-base sm:leading-7">
              <a href={b.href} className="underline underline-offset-4" rel="noreferrer" target="_blank">
                {b.text}
              </a>
            </p>
          );
        }

        if (b.type === "ul") {
          return (
            <ul key={idx} className="list-disc space-y-2 pl-5 text-sm leading-6 sm:text-base">
              {b.items.map((it) => (
                <li key={it}>{it}</li>
              ))}
            </ul>
          );
        }

        return (
          <Fragment key={idx}>
            <p className="text-pretty text-sm leading-6 text-foreground/90 sm:text-base sm:leading-7">
              {b.text}
            </p>
          </Fragment>
        );
      })}
    </div>
  );
}
