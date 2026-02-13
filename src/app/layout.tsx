import type { Metadata } from "next";
import "./globals.css";

import { SiteFooter } from "@/components/site/footer";
import { SiteHeader } from "@/components/site/header";
import { StructuredData } from "@/components/site/structured-data";
import { getSiteUrl, site } from "@/lib/site";

export const metadata: Metadata = {
  metadataBase: new URL(getSiteUrl()),
  title: {
    default: site.name,
    template: `%s | ${site.shortName}`,
  },
  description: site.tagline,
  alternates: {
    canonical: "/",
  },
  openGraph: {
    type: "website",
    url: "/",
    siteName: site.name,
    title: site.name,
    description: site.tagline,
    images: [{ url: "/og?path=/", width: 1200, height: 630, alt: site.name }],
  },
  twitter: {
    card: "summary_large_image",
    title: site.name,
    description: site.tagline,
    images: ["/og?path=/"],
  },
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en">
      <body className="antialiased">
        <StructuredData />
        <SiteHeader />
        {children}
        <SiteFooter />
      </body>
    </html>
  );
}
