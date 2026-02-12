import Link from "next/link";

import { PageShell } from "@/components/site/page-shell";
import { Button } from "@/components/ui/button";

export default function NotFound() {
  return (
    <PageShell title="Page not found" description="This route is not part of the captured site structure.">
      <div className="flex flex-col gap-4">
        <p className="text-sm text-muted-foreground">
          Try the main sections, or go back to the home page.
        </p>
        <div className="flex gap-3">
          <Button asChild>
            <Link href="/">Home</Link>
          </Button>
          <Button asChild variant="secondary">
            <Link href="/contact/">Contact</Link>
          </Button>
        </div>
      </div>
    </PageShell>
  );
}
