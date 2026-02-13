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
    images: [{ url: "/media/logo.png", width: 512, height: 512, alt: `${site.name} logo` }],
  },
  twitter: {
    card: "summary",
    title: site.name,
    description: site.tagline,
    images: ["/media/logo.png"],
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
