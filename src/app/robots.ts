import type { MetadataRoute } from "next";
import { siteUrl } from "@/lib/firebase/config";

/**
 * The public site is meant to be found. The committee portal is not — indexing
 * an administration login serves nobody and only widens the attack surface.
 */
// Required by `output: export` — these are emitted as files at build time.
export const dynamic = "force-static";

export default function robots(): MetadataRoute.Robots {
  return {
    rules: [{ userAgent: "*", allow: "/", disallow: ["/admin", "/admin/"] }],
    sitemap: `${siteUrl()}/sitemap.xml`,
  };
}
