import { getAllEvidenceSlugs } from "@beaconlabs-io/evidence/content";
import type { MetadataRoute } from "next";
import { locales } from "@/i18n/routing";
import { BASE_URL } from "@/lib/constants";

export default function sitemap(): MetadataRoute.Sitemap {
  const staticRoutes = [
    "",
    "/search",
    "/effects",
    "/strength-of-evidence",
    "/canvas",
    "/hypercerts",
  ];
  const evidenceSlugs = getAllEvidenceSlugs();
  const entries: MetadataRoute.Sitemap = [];

  for (const route of staticRoutes) {
    entries.push({
      url: `${BASE_URL}/en${route}`,
      lastModified: new Date(),
      changeFrequency: route === "" ? "weekly" : "monthly",
      priority: route === "" ? 1.0 : 0.7,
      alternates: {
        languages: Object.fromEntries(locales.map((l) => [l, `${BASE_URL}/${l}${route}`])),
      },
    });
  }

  for (const slug of evidenceSlugs) {
    entries.push({
      url: `${BASE_URL}/en/evidence/${slug}`,
      lastModified: new Date(),
      changeFrequency: "monthly",
      priority: 0.8,
      alternates: {
        languages: Object.fromEntries(locales.map((l) => [l, `${BASE_URL}/${l}/evidence/${slug}`])),
      },
    });
  }

  return entries;
}
