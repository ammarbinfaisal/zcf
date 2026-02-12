import Image from "next/image";
import Link from "next/link";

import { primaryCtas, primaryNav, site } from "@/lib/site";

import { Button } from "@/components/ui/button";
import {
  NavigationMenu,
  NavigationMenuItem,
  NavigationMenuLink,
  NavigationMenuList,
} from "@/components/ui/navigation-menu";

export function SiteHeader() {
  return (
    <header className="sticky top-0 z-50 border-b bg-background/70 backdrop-blur supports-[backdrop-filter]:bg-background/50">
      <div className="mx-auto flex max-w-6xl items-center gap-4 px-4 py-3">
        <Link href="/" className="flex items-center gap-3">
          <Image
            src="/media/logo.png"
            alt={`${site.name} logo`}
            width={44}
            height={44}
            priority
            className="h-11 w-11"
          />
          <div className="leading-tight">
            <div className="text-sm font-semibold tracking-tight text-[color:var(--brand-olive)]">
              {site.shortName}
            </div>
            <div className="hidden text-xs text-muted-foreground sm:block">{site.name}</div>
          </div>
        </Link>

        <div className="flex-1" />

        <NavigationMenu className="hidden md:block">
          <NavigationMenuList>
            {primaryNav.map((item) => (
              <NavigationMenuItem key={item.href}>
                <NavigationMenuLink asChild>
                  <Link
                    href={item.href}
                    className="rounded-md px-3 py-2 text-sm font-medium text-foreground/80 hover:text-foreground"
                  >
                    {item.label}
                  </Link>
                </NavigationMenuLink>
              </NavigationMenuItem>
            ))}
          </NavigationMenuList>
        </NavigationMenu>

        <div className="flex items-center gap-2">
          <Button asChild variant="secondary" className="hidden sm:inline-flex">
            <Link href={primaryCtas[1].href}>{primaryCtas[1].label}</Link>
          </Button>
          <Button asChild>
            <Link href={primaryCtas[0].href}>{primaryCtas[0].label}</Link>
          </Button>
        </div>
      </div>
    </header>
  );
}
