export const site = {
  name: "Zakat & Charitable Foundation",
  shortName: "ZCF",
  domain: "zcfindia.org",
  defaultUrl: "https://zcfindia.org",
  tagline: "Establishing a collective system of Zakat to uplift communities with dignity.",
};

export const primaryNav = [
  { href: "/about/", label: "About" },
  { href: "/our-projects/", label: "Projects" },
  { href: "/news/", label: "News" },
  { href: "/image-gallery/", label: "Gallery" },
  { href: "/contact/", label: "Contact" },
];

export const primaryCtas = [
  { href: "/donation/", label: "Donate" },
  { href: "/become-a-volunteer/", label: "Volunteer" },
];

export function getSiteUrl() {
  const envUrl = process.env.NEXT_PUBLIC_SITE_URL?.trim();
  if (envUrl) return envUrl.replace(/\/$/, "");
  return site.defaultUrl;
}
