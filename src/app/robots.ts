import { MetadataRoute } from "next";

/**
 * Next.js dynamic robots.txt generator.
 */
export default function robots(): MetadataRoute.Robots {
  const baseUrl = "https://snakecomputergame.com";

  return {
    rules: {
      userAgent: "*",
      allow: "/",
      disallow: ["/api/", "/_next/"],
    },
    sitemap: `${baseUrl}/sitemap.xml`,
  };
}
