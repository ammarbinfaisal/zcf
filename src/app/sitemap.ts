import type { MetadataRoute } from "next";

import { getAllRoutePaths } from "@/lib/raw-content";
import { getSiteUrl } from "@/lib/site";

export default async function sitemap(): Promise<MetadataRoute.Sitemap> {
  const base = getSiteUrl();
  const routes = await getAllRoutePaths();
  const now = new Date();

  return routes.map((pathname) => ({
    url: `${base}${pathname}`,
    lastModified: now,
    changeFrequency: "weekly",
    priority: pathname === "/" ? 1 : 0.7,
  }));
}
