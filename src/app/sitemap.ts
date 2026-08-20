import { MetadataRoute } from "next";

/**
 * Next.js dynamic sitemap generator.
 * Maps the home URL and primary SEO target URL.
 */
export default function sitemap(): MetadataRoute.Sitemap {
  const baseUrl = "https://snakecomputergame.com";

  return [
    {
      url: baseUrl,
      lastModified: new Date(),
      changeFrequency: "daily",
      priority: 1.0,
    },
    {
      url: `${baseUrl}/snake-game`,
      lastModified: new Date(),
      changeFrequency: "weekly",
      priority: 0.8,
    },
  ];
}
