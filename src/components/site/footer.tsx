import Link from "next/link";

import { primaryNav, site } from "@/lib/site";

import { Separator } from "@/components/ui/separator";

export function SiteFooter() {
  return (
    <footer className="border-t bg-background">
      <div className="mx-auto max-w-6xl px-4 py-12">
        <div className="grid gap-10 md:grid-cols-3">
          <div className="space-y-3">
            <div className="text-sm font-semibold text-foreground">{site.name}</div>
            <p className="text-sm text-muted-foreground">{site.tagline}</p>
          </div>

          <div className="space-y-3">
            <div className="text-sm font-semibold text-foreground">Quick Links</div>
            <div className="flex flex-wrap gap-x-4 gap-y-2">
              {primaryNav.map((item) => (
                <Link
                  key={item.href}
                  href={item.href}
                  className="text-sm text-muted-foreground hover:text-foreground"
                >
                  {item.label}
                </Link>
              ))}
              <Link
                href="/privacy-policy/"
                className="text-sm text-muted-foreground hover:text-foreground"
              >
                Privacy
              </Link>
              <Link
                href="/terms-and-conditions/"
                className="text-sm text-muted-foreground hover:text-foreground"
              >
                Terms
              </Link>
            </div>
          </div>

          <div className="space-y-3">
            <div className="text-sm font-semibold text-foreground">Contact</div>
            <div className="text-sm text-muted-foreground">zakatcharitablefoundation@gmail.com</div>
            <div className="text-sm text-muted-foreground">+91 85287 78878</div>
          </div>
        </div>

        <Separator className="my-10" />

        <div className="flex flex-col gap-2 text-xs text-muted-foreground sm:flex-row sm:items-center sm:justify-between">
          <div>© {new Date().getFullYear()} {site.name}</div>
          <div>Built for speed, accessibility, and search</div>
        </div>
      </div>
    </footer>
  );
}
