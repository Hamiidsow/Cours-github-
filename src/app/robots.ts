import type { MetadataRoute } from "next";
import { siteUrl } from "@/lib/format";

export default function robots(): MetadataRoute.Robots {
  return {
    rules: [{ userAgent: "*", allow: "/", disallow: ["/espace", "/admin", "/auth", "/connexion", "/inscription"] }],
    sitemap: `${siteUrl()}/sitemap.xml`,
  };
}
