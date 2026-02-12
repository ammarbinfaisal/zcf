import { getSiteUrl, site } from "@/lib/site";

export function StructuredData() {
  const base = getSiteUrl();
  const org = {
    "@context": "https://schema.org",
    "@type": "Organization",
    name: site.name,
    url: base,
    logo: `${base}/media/logo.png`,
    email: "zakatcharitablefoundation@gmail.com",
    telephone: "+918528778878",
  };

  const webSite = {
    "@context": "https://schema.org",
    "@type": "WebSite",
    name: site.name,
    url: base,
  };

  return (
    <>
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(org) }}
      />
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(webSite) }}
      />
    </>
  );
}
