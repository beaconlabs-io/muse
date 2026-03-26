import type { Evidence } from "@beaconlabs-io/evidence";
import { BASE_URL } from "@/lib/constants";

export function JsonLd({ data }: { data: Record<string, unknown> }) {
  return (
    <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(data) }} />
  );
}

export function organizationJsonLd() {
  return {
    "@context": "https://schema.org",
    "@type": "Organization",
    name: "Beacon Labs",
    url: "https://beaconlabs.io",
    logo: `${BASE_URL}/beaconlabs.png`,
  };
}

export function websiteJsonLd() {
  return {
    "@context": "https://schema.org",
    "@type": "WebSite",
    name: "MUSE",
    url: BASE_URL,
    publisher: {
      "@type": "Organization",
      name: "Beacon Labs",
    },
  };
}

export function evidenceArticleJsonLd(evidence: Evidence, lang: string) {
  return {
    "@context": "https://schema.org",
    "@type": "ScholarlyArticle",
    headline: evidence.title,
    author: {
      "@type": "Person",
      name: evidence.author,
    },
    datePublished: evidence.date,
    publisher: {
      "@type": "Organization",
      name: "Beacon Labs",
      logo: {
        "@type": "ImageObject",
        url: `${BASE_URL}/beaconlabs.png`,
      },
    },
    url: `${BASE_URL}/${lang}/evidence/${evidence.evidence_id}`,
    inLanguage: lang,
    keywords: evidence.tags?.join(", "),
  };
}

export function breadcrumbJsonLd(items: Array<{ name: string; url: string }>) {
  return {
    "@context": "https://schema.org",
    "@type": "BreadcrumbList",
    itemListElement: items.map((item, index) => ({
      "@type": "ListItem",
      position: index + 1,
      name: item.name,
      item: `${BASE_URL}${item.url}`,
    })),
  };
}
